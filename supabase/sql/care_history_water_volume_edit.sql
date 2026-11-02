-- CareDigital / Histórico e prontuário: edição auditada de água, inclusive lançamentos avulsos.
-- A hora original do consumo é imutável; só a quantidade é corrigida.
-- Esta função foi implantada e verificada na base DIGITALCARE.

CREATE OR REPLACE FUNCTION public.care_correct_water_entry(p_water_id uuid, p_new_amount_ml integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_uid uuid:=auth.uid();
 v_water public.care_hydration%rowtype;
 v_time timestamptz:=clock_timestamp();
 v_day date;
 v_total bigint;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_new_amount_ml IS NULL OR p_new_amount_ml NOT BETWEEN 10 AND 1500 THEN
   RAISE EXCEPTION 'A quantidade deve estar entre 10 e 1500 ml';
 END IF;
 SELECT h.* INTO v_water FROM public.care_hydration h
 WHERE h.id=p_water_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Water record unavailable'; END IF;
 IF NOT EXISTS(
   SELECT 1 FROM public.care_patients p
   WHERE p.id=v_water.patient_id AND p.owner_id=v_water.owner_id
   AND (p.owner_id=v_uid OR EXISTS(
     SELECT 1 FROM public.care_patient_access a
     WHERE a.patient_id=p.id AND a.owner_id=p.owner_id AND a.user_id=v_uid
   ))
 ) THEN
   RAISE EXCEPTION 'Water record unavailable';
 END IF;
 IF v_water.amount_ml IS DISTINCT FROM p_new_amount_ml THEN
   UPDATE public.care_hydration
   SET amount_ml=p_new_amount_ml WHERE id=v_water.id;
   INSERT INTO public.care_activity_log
     (owner_id,patient_id,task_id,category,event_type,scheduled_at,happened_at,
      recorded_at,actor_id,source,details)
   VALUES(
     v_water.owner_id,v_water.patient_id,v_water.task_id,'hidratacao',
     'water_volume_corrected',NULL,v_water.recorded_at,
     v_time,v_uid,'client_history_correction',
     jsonb_build_object('water_id',v_water.id,'previous_ml',v_water.amount_ml,
       'corrected_ml',p_new_amount_ml,
       'original_recorded_at',v_water.recorded_at,
       'unscheduled',v_water.task_id IS NULL)
   );
   v_day:=(v_water.recorded_at AT TIME ZONE 'America/Rio_Branco')::date;
   PERFORM public.care_recompute_hydration_day(v_water.patient_id,v_day);
 END IF;
 SELECT coalesce(sum(h.amount_ml),0) INTO v_total
 FROM public.care_hydration h WHERE h.patient_id=v_water.patient_id
   AND (h.recorded_at AT TIME ZONE 'America/Rio_Branco')::date =
       (v_water.recorded_at AT TIME ZONE 'America/Rio_Branco')::date;
 RETURN jsonb_build_object(
   'water_id',v_water.id,'amount_ml',p_new_amount_ml,
   'previous_ml',v_water.amount_ml,'original_recorded_at',v_water.recorded_at,
   'corrected_at',CASE WHEN v_water.amount_ml IS DISTINCT FROM p_new_amount_ml
                      THEN v_time ELSE NULL END,
   'daily_total_ml',v_total
 );
END;
$function$;

REVOKE ALL ON FUNCTION public.care_correct_water_entry(uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.care_correct_water_entry(uuid,integer) TO authenticated;
