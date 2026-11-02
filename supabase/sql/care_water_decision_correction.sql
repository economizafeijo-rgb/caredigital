-- CareDigital — decisions on scheduled water entries.
-- Past due tasks may be marked "Bebi", "Não bebi", or an erroneous "Não bebi"
-- may be corrected. Actual server time is recorded. Future tasks remain blocked.

CREATE OR REPLACE FUNCTION public.care_record_water_decision(p_task_id uuid, p_decision text, p_amount_ml integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_user uuid:=auth.uid();
 v_task public.care_daily_checklist%ROWTYPE;
 v_old_response text;
 v_now timestamptz:=clock_timestamp();
 v_shift integer:=0;
 v_affected integer:=0;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_decision NOT IN ('drank','not_drunk','reset_not_drunk') OR p_decision IS NULL THEN
   RAISE EXCEPTION 'Invalid hydration decision';
 END IF;
 SELECT t.* INTO v_task FROM public.care_daily_checklist t
 WHERE t.id=p_task_id AND t.category='hidratacao'
 AND (t.owner_id=v_user OR EXISTS(
   SELECT 1 FROM public.care_patient_access a
   WHERE a.patient_id=t.patient_id AND a.user_id=v_user
 ))
 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Hydration task unavailable'; END IF;
 IF v_task.completed_at IS NOT NULL THEN
   RAISE EXCEPTION 'Already confirmed as drank. Review or correct the saved water record.';
 END IF;
 IF v_now<v_task.scheduled_at THEN
   RAISE EXCEPTION 'Care window not started. Log unscheduled water separately instead.';
 END IF;
 SELECT r.response INTO v_old_response FROM public.care_hydration_responses r
 WHERE r.task_id=p_task_id FOR UPDATE;
 IF p_decision='not_drunk' THEN
   IF v_old_response='not_drunk' THEN
     RETURN jsonb_build_object('decision','not_drunk','recorded_at',
       (SELECT recorded_at FROM public.care_hydration_responses WHERE task_id=p_task_id),
       'already_recorded',true);
   END IF;
   INSERT INTO public.care_hydration_responses
     (task_id,patient_id,owner_id,response,recorded_at)
   VALUES(p_task_id,v_task.patient_id,v_task.owner_id,'not_drunk',v_now);
 ELSIF p_decision='reset_not_drunk' THEN
   IF v_old_response IS DISTINCT FROM 'not_drunk' THEN
     RAISE EXCEPTION 'There is no missed-water response to revert';
   END IF;
   DELETE FROM public.care_hydration_responses WHERE task_id=p_task_id;
 ELSIF p_decision='drank' THEN
   IF p_amount_ml IS NULL OR p_amount_ml NOT BETWEEN 10 AND 1500 THEN
     RAISE EXCEPTION 'Water volume must be between 10 and 1500 ml';
   END IF;
   IF v_old_response='not_drunk' THEN
     DELETE FROM public.care_hydration_responses WHERE task_id=p_task_id;
   END IF;
   INSERT INTO public.care_hydration
     (owner_id,patient_id,task_id,amount_ml,recorded_at)
   VALUES(v_task.owner_id,v_task.patient_id,v_task.id,p_amount_ml,v_now);
   UPDATE public.care_daily_checklist
   SET completed_at=v_now WHERE id=p_task_id AND completed_at IS NULL;
   v_shift:=public.care_reflow_pending_schedule(
     v_task.patient_id,'hidratacao',v_task.scheduled_at,v_now);
   INSERT INTO public.care_activity_log(
     owner_id,patient_id,task_id,category,event_type,scheduled_at,happened_at,
     recorded_at,actor_id,source,details
   ) VALUES(
     v_task.owner_id,v_task.patient_id,p_task_id,'hidratacao','confirmed',
     v_task.scheduled_at,v_now,v_now,v_user,'client_hydration_decision',
     jsonb_build_object(
       'title',v_task.title,'water_ml',p_amount_ml,
       'late',v_now>v_task.scheduled_at+interval '15 minutes',
       'response_changed',v_old_response='not_drunk',
       'original_response',v_old_response,'replanned_slots',v_shift
     )
   );
 END IF;
 IF p_decision<>'drank' OR v_old_response='not_drunk' THEN
  INSERT INTO public.care_activity_log(
    owner_id,patient_id,task_id,category,event_type,scheduled_at,happened_at,
    recorded_at,actor_id,source,details
  ) VALUES(
    v_task.owner_id,v_task.patient_id,p_task_id,'hidratacao',
    'water_decision_changed',v_task.scheduled_at,
    CASE WHEN p_decision='drank' THEN v_now ELSE NULL END,
    v_now,v_user,'client_hydration_decision',
    jsonb_build_object(
      'title',v_task.title,'previous_decision',
      CASE WHEN v_old_response='not_drunk' THEN 'not_drunk' ELSE 'unanswered' END,
      'new_decision',p_decision,'amount_ml',
      CASE WHEN p_decision='drank' THEN p_amount_ml ELSE NULL END
    )
  );
 END IF;
 RETURN jsonb_build_object('decision',p_decision,'recorded_at',v_now,
   'amount_ml',CASE WHEN p_decision='drank' THEN p_amount_ml ELSE NULL END,
   'previous_decision',v_old_response,'replanned_slots',v_shift);
END;
$function$;

REVOKE ALL ON FUNCTION public.care_record_water_decision(uuid,text,integer)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.care_record_water_decision(uuid,text,integer)
 TO authenticated;
