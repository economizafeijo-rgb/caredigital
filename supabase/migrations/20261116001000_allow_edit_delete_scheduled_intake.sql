-- Allow users to delete confirmed scheduled intake entries with audit logging.
CREATE OR REPLACE FUNCTION public.care_delete_intake_entry(
  p_patient_id uuid,
  p_entry_type text,
  p_entry_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid:=auth.uid();
  v_owner uuid;
  v_now timestamptz:=clock_timestamp();
  v_day date;
  v_water public.care_hydration%rowtype;
  v_beverage public.care_client_beverages%rowtype;
  v_meal public.care_activity_log%rowtype;
  v_task_id uuid;
  v_snapshot jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT p.owner_id INTO v_owner FROM public.care_patients p
  WHERE p.id=p_patient_id AND
    (p.owner_id=v_uid OR EXISTS(SELECT 1 FROM public.care_patient_access a
      WHERE a.patient_id=p.id AND a.user_id=v_uid));
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Patient unavailable'; END IF;
  IF p_entry_id IS NULL OR p_entry_type NOT IN ('water','beverage','meal') THEN
    RAISE EXCEPTION 'Invalid intake entry';
  END IF;

  IF p_entry_type='water' THEN
    SELECT * INTO v_water FROM public.care_hydration h
    WHERE h.id=p_entry_id AND h.patient_id=p_patient_id AND h.owner_id=v_owner FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Water record unavailable'; END IF;
    IF v_water.task_id IS NOT NULL THEN
      -- Deleting a confirmed scheduled intake reopens the checklist item so
      -- the history remains truthful and the user can record it again later.
      UPDATE public.care_daily_checklist
      SET completed_at=NULL
      WHERE id=v_water.task_id AND patient_id=p_patient_id
        AND completed_at IS NOT NULL;
      DELETE FROM public.care_hydration_responses
      WHERE task_id=v_water.task_id AND patient_id=p_patient_id;
    END IF;
    v_day:=(v_water.recorded_at AT TIME ZONE 'America/Rio_Branco')::date;
    v_snapshot:=jsonb_build_object('amount_ml',v_water.amount_ml,'recorded_at',v_water.recorded_at);
    DELETE FROM public.care_hydration WHERE id=v_water.id;
    INSERT INTO public.care_activity_log(owner_id,patient_id,category,event_type,
      scheduled_at,happened_at,recorded_at,actor_id,source,details)
    VALUES(v_owner,p_patient_id,'hidratacao','intake_deleted',NULL,v_water.recorded_at,
      v_now,v_uid,'client_intake_maintenance',
      jsonb_build_object('entry_type','water','entry_id',p_entry_id,'deleted',v_snapshot));
  ELSIF p_entry_type='beverage' THEN
    SELECT * INTO v_beverage FROM public.care_client_beverages b
    WHERE b.id=p_entry_id AND b.patient_id=p_patient_id AND b.owner_id=v_owner FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Beverage record unavailable'; END IF;
    v_day:=(v_beverage.consumed_at AT TIME ZONE 'America/Rio_Branco')::date;
    v_snapshot:=jsonb_build_object('name',v_beverage.name,'amount_ml',v_beverage.amount_ml,'consumed_at',v_beverage.consumed_at);
    DELETE FROM public.care_client_beverages WHERE id=v_beverage.id;
    INSERT INTO public.care_activity_log(owner_id,patient_id,category,event_type,
      scheduled_at,happened_at,recorded_at,actor_id,source,details)
    VALUES(v_owner,p_patient_id,'hidratacao','intake_deleted',NULL,v_beverage.consumed_at,
      v_now,v_uid,'client_intake_maintenance',
      jsonb_build_object('entry_type','beverage','entry_id',p_entry_id,'deleted',v_snapshot));
  ELSE
    SELECT * INTO v_meal FROM public.care_activity_log l
    WHERE l.id=p_entry_id AND l.patient_id=p_patient_id AND l.owner_id=v_owner
      AND l.category='refeicao' AND l.event_type='logged'
      AND l.source='client_unscheduled_intake'
      AND coalesce((l.details->>'superseded')::boolean,false)=false
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Meal record unavailable'; END IF;
    v_day:=(v_meal.happened_at AT TIME ZONE 'America/Rio_Branco')::date;
    v_task_id:=nullif(v_meal.details->>'linked_task_id','')::uuid;
    v_snapshot:=jsonb_build_object('title',v_meal.details->>'title',
      'description',v_meal.details->>'description','happened_at',v_meal.happened_at);
    IF v_task_id IS NOT NULL THEN
      PERFORM set_config('care.meal_reclassification','enabled',true);
      UPDATE public.care_daily_checklist SET completed_at=NULL
      WHERE id=v_task_id AND patient_id=p_patient_id AND completed_at=v_meal.happened_at;
      PERFORM set_config('care.meal_reclassification','disabled',true);
      DELETE FROM public.care_meal_details
      WHERE task_id=v_task_id AND patient_id=p_patient_id AND recorded_at=v_meal.happened_at;
    END IF;
    UPDATE public.care_activity_log
    SET details=details||jsonb_build_object('superseded',true,'deleted_at',v_now,'deleted_by',v_uid)
    WHERE id=v_meal.id;
    INSERT INTO public.care_activity_log(owner_id,patient_id,task_id,category,event_type,
      scheduled_at,happened_at,recorded_at,actor_id,source,details)
    VALUES(v_owner,p_patient_id,v_task_id,'refeicao','intake_deleted',NULL,v_meal.happened_at,
      v_now,v_uid,'client_intake_maintenance',
      jsonb_build_object('entry_type','meal','entry_id',p_entry_id,'deleted',v_snapshot));
    IF v_day=(v_now AT TIME ZONE 'America/Rio_Branco')::date THEN
      PERFORM public.care_recalculate_after_consumption(p_patient_id,'refeicao',NULL);
    END IF;
  END IF;
  RETURN jsonb_build_object('success',true,'entry_type',p_entry_type,'entry_id',p_entry_id,
    'deleted_at',v_now,'time_zone','America/Rio_Branco');
END;
$function$;


REVOKE ALL ON FUNCTION public.care_delete_intake_entry(uuid,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.care_delete_intake_entry(uuid,text,uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
