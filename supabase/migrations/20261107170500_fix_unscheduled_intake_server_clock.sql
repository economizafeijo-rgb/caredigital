-- Use the database clock for current-time intake records.
-- Explicitly selected historical times remain validated and are interpreted as absolute instants.
CREATE OR REPLACE FUNCTION public.care_log_unscheduled_intake(
  p_patient_id uuid,
  p_kind text,
  p_description text,
  p_amount_ml integer,
  p_request_id uuid,
  p_consumed_at timestamp with time zone
)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_now timestamptz := clock_timestamp();
  v_consumed timestamptz := coalesce(p_consumed_at, v_now);
  v_existing timestamptz;
  v_description text := btrim(coalesce(p_description,''));
  v_label text;
  v_category text;
  v_shifted_slots integer := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  IF p_consumed_at IS NOT NULL THEN
    IF v_consumed > v_now + interval '2 minutes' THEN
      RAISE EXCEPTION 'Consumption time cannot be in the future (Acre time)';
    ELSIF v_consumed < v_now - interval '7 days' THEN
      RAISE EXCEPTION 'Consumption time must be within the last 7 days (Acre time)';
    ELSIF v_consumed > v_now THEN
      -- Absorb small client/server clock skew without recording a future event.
      v_consumed := v_now;
    END IF;
  END IF;

  IF p_patient_id IS NULL OR p_request_id IS NULL THEN
    RAISE EXCEPTION 'Patient and request identifier are required';
  END IF;

  SELECT p.owner_id INTO v_owner
  FROM public.care_patients p
  WHERE p.id=p_patient_id AND (
    p.owner_id=v_uid OR EXISTS(
      SELECT 1 FROM public.care_patient_access a
      WHERE a.patient_id=p.id AND a.user_id=v_uid
    )
  );
  IF NOT FOUND THEN RAISE EXCEPTION 'Patient unavailable'; END IF;

  IF p_kind IS NULL OR p_kind NOT IN
     ('refeicao','lanche','fruta','cafe_manha','almoco','jantar','ceia','sobremesa','salada','sopa','agua','cha','suco','cafe','energetico','suplemento','shake','isotonico','vitamina','leite','agua_coco','refrigerante','outra') THEN
    RAISE EXCEPTION 'Unsupported intake type';
  END IF;

  IF p_kind IN ('refeicao','lanche','fruta','cafe_manha','almoco','jantar','ceia','sobremesa','salada','sopa') THEN
    IF char_length(v_description) NOT BETWEEN 3 AND 1000 OR p_amount_ml IS NOT NULL THEN
      RAISE EXCEPTION 'Meal description must have 3 to 1000 characters and no water volume';
    END IF;
    v_label := CASE p_kind
      WHEN 'lanche' THEN 'Lanche extra'
      WHEN 'fruta' THEN 'Frutas'
      WHEN 'cafe_manha' THEN 'Café da manhã'
      WHEN 'almoco' THEN 'Almoço'
      WHEN 'jantar' THEN 'Jantar'
      WHEN 'ceia' THEN 'Ceia'
      WHEN 'sobremesa' THEN 'Sobremesa'
      WHEN 'salada' THEN 'Salada e legumes'
      WHEN 'sopa' THEN 'Sopa e caldo'
      ELSE 'Refeição extra' END;
    v_category := 'refeicao';
  ELSE
    IF p_amount_ml IS NULL OR p_amount_ml NOT BETWEEN 10 AND 1500 THEN
      RAISE EXCEPTION 'Water or beverage volume must be 10 to 1500 ml';
    END IF;
    IF p_kind='agua' THEN
      v_description := 'Água';
    ELSIF char_length(v_description) NOT BETWEEN 2 AND 100 THEN
      RAISE EXCEPTION 'Beverage name must have 2 to 100 characters';
    END IF;
    v_label := CASE p_kind
       WHEN 'agua' THEN 'Água extra'
       WHEN 'cha' THEN 'Chá extra'
       WHEN 'suco' THEN 'Suco extra'
       WHEN 'cafe' THEN 'Café extra'
       WHEN 'energetico' THEN 'Energético'
       WHEN 'suplemento' THEN 'Suplemento líquido'
       WHEN 'shake' THEN 'Shake'
       WHEN 'isotonico' THEN 'Isotônico'
       WHEN 'vitamina' THEN 'Vitamina ou smoothie'
       WHEN 'leite' THEN 'Leite ou derivado'
       WHEN 'agua_coco' THEN 'Água de coco'
       WHEN 'refrigerante' THEN 'Refrigerante'
       ELSE 'Bebida extra' END;
    v_category := 'hidratacao';
  END IF;

  -- Serialize retries after network failures or double clicks.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  SELECT l.recorded_at INTO v_existing
  FROM public.care_activity_log l
  WHERE l.patient_id=p_patient_id
    AND l.source='client_unscheduled_intake'
    AND l.event_type='logged'
    AND l.details->>'request_id'=p_request_id::text
  LIMIT 1;
  IF FOUND THEN RETURN v_existing; END IF;

  IF p_kind='agua' THEN
    INSERT INTO public.care_hydration(owner_id,patient_id,amount_ml,recorded_at)
    VALUES(v_owner,p_patient_id,p_amount_ml,v_consumed);
    v_shifted_slots:=public.care_reflow_after_extra_water(p_patient_id,v_now,45);
  ELSIF p_kind NOT IN ('refeicao','lanche','fruta','cafe_manha','almoco','jantar','ceia','sobremesa','salada','sopa') THEN
    INSERT INTO public.care_client_beverages
      (owner_id,patient_id,recorded_by,kind,name,amount_ml,notes,consumed_at,created_at)
    VALUES
      (v_owner,p_patient_id,v_uid,p_kind,v_description,p_amount_ml,'Registro avulso',
       v_consumed,v_now);
    v_shifted_slots:=public.care_reflow_after_extra_water(p_patient_id,v_now,45);
  END IF;

  INSERT INTO public.care_activity_log
    (owner_id,patient_id,task_id,category,event_type,scheduled_at,
     happened_at,recorded_at,actor_id,source,details)
  VALUES
    (v_owner,p_patient_id,NULL,v_category,'logged',NULL,
     v_consumed,v_consumed,v_uid,'client_unscheduled_intake',
     jsonb_build_object(
       'request_id',p_request_id::text,'kind',p_kind,'title',v_label,
       'description',v_description,'amount_ml',p_amount_ml,
       'unscheduled',true,
       'time_source',CASE WHEN p_consumed_at IS NULL THEN 'server_acre' ELSE 'client_manual_acre' END,
       'submitted_at',v_now,'replanned_slots',v_shifted_slots
     ));
  RETURN v_now;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.care_log_unscheduled_intake(uuid,text,text,integer,uuid,timestamp with time zone) TO authenticated;
REVOKE ALL ON FUNCTION public.care_log_unscheduled_intake(uuid,text,text,integer,uuid,timestamp with time zone) FROM PUBLIC, anon;

NOTIFY pgrst, 'reload schema';
