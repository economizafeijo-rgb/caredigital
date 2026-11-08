CREATE OR REPLACE FUNCTION public.care_confirm_task(p_task_id uuid, p_water_ml integer DEFAULT NULL::integer)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_task public.care_daily_checklist%rowtype;
 v_uid uuid:=auth.uid();
 v_now timestamptz:=clock_timestamp();
 v_completed timestamptz;
 v_late boolean;
 v_shifted integer:=0;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT t.* INTO v_task
 FROM public.care_daily_checklist t
 WHERE t.id=p_task_id AND
   (t.owner_id=v_uid OR EXISTS(SELECT 1 FROM public.care_patient_access a
                               WHERE a.patient_id=t.patient_id AND a.user_id=v_uid))
 FOR UPDATE OF t;
 IF NOT FOUND THEN RAISE EXCEPTION 'Task unavailable'; END IF;
 IF v_task.category NOT IN ('medicacao','refeicao','hidratacao') THEN
   RAISE EXCEPTION 'Unsupported task category';
 END IF;
 IF v_task.completed_at IS NOT NULL THEN RAISE EXCEPTION 'Task already completed'; END IF;
 IF EXISTS(SELECT 1 FROM public.care_task_resolutions d WHERE d.task_id=v_task.id)
 THEN RAISE EXCEPTION 'Task has a final patient response; undo it before confirming'; END IF;
 IF v_now < v_task.scheduled_at THEN RAISE EXCEPTION 'Care window not started'; END IF;

 -- Medication confirmations must follow the same 15-minute window as the client UI.
 -- Meals and hydration remain confirmable later; no medication schedule is shifted.
 IF v_task.category='medicacao'
    AND v_now >= v_task.scheduled_at + interval '15 minutes' THEN
   RAISE EXCEPTION 'Medication confirmation window expired; record as not confirmed';
 END IF;

 v_late := v_now >= v_task.scheduled_at + interval '15 minutes';
 IF v_task.category='hidratacao' THEN
   IF p_water_ml IS NULL OR p_water_ml NOT BETWEEN 10 AND 1500 THEN
      RAISE EXCEPTION 'Water volume invalid';
   END IF;
   IF EXISTS(SELECT 1 FROM public.care_hydration_responses h
             WHERE h.task_id=v_task.id AND h.response='not_drunk') THEN
      RAISE EXCEPTION 'Water was already marked as not drunk';
   END IF;
   INSERT INTO public.care_hydration(owner_id,patient_id,amount_ml,recorded_at,task_id)
   VALUES (v_task.owner_id,v_task.patient_id,p_water_ml,v_now,v_task.id);
 ELSIF p_water_ml IS NOT NULL THEN
   RAISE EXCEPTION 'Water volume only for hydration';
 END IF;
 UPDATE public.care_daily_checklist SET completed_at=v_now WHERE id=v_task.id
 RETURNING completed_at INTO v_completed;
 IF v_task.category IN ('refeicao','hidratacao') THEN
   v_shifted:=public.care_reflow_pending_schedule(
      v_task.patient_id,v_task.category,v_task.scheduled_at,v_completed);
 END IF;
 INSERT INTO public.care_activity_log
  (owner_id,patient_id,task_id,category,event_type,scheduled_at,happened_at,
   recorded_at,actor_id,source,details)
 VALUES(v_task.owner_id,v_task.patient_id,v_task.id,v_task.category,'confirmed',
   v_task.scheduled_at,v_completed,v_completed,v_uid,'client_dashboard',
   jsonb_build_object('title',v_task.title,'late',v_late,
     'delay_minutes',GREATEST(0,floor(extract(epoch FROM
                         (v_completed-v_task.scheduled_at))/60)::int),
     'reported_taken_now',v_task.category='medicacao',
     'water_ml',CASE WHEN v_task.category='hidratacao' THEN p_water_ml ELSE NULL END,
     'replanned_slots',v_shifted));
 RETURN v_completed;
END;
$function$;
