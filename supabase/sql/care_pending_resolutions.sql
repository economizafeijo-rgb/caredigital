-- CareDigital: complete, auditable patient actions on overdue scheduled care.
-- Applied to DIGITALCARE (Supabase), validated with a rolled-back patient transaction.
-- "Cancelado" is a PATIENT-REPORTED event, never a change to medication prescription.
-- "Remarcado" is limited to water and meal times in the same Acre calendar day.
-- This file is idempotent and preserves existing appointments and history.

CREATE TABLE IF NOT EXISTS public.care_task_resolutions (
 task_id uuid PRIMARY KEY REFERENCES public.care_daily_checklist(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL,
 patient_id uuid NOT NULL,
 status text NOT NULL CHECK (status IN ('nao_cumprido','cancelado')),
 reason text NOT NULL DEFAULT '',
 scheduled_at timestamptz NOT NULL,
 resolved_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 actor_id uuid NOT NULL
);
CREATE INDEX IF NOT EXISTS care_task_resolutions_patient_idx
 ON public.care_task_resolutions(patient_id,resolved_at DESC);

ALTER TABLE public.care_task_resolutions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.care_task_resolutions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.care_task_resolutions TO authenticated;
DROP POLICY IF EXISTS "patient and owner can view task resolutions" ON public.care_task_resolutions;
CREATE POLICY "patient and owner can view task resolutions"
 ON public.care_task_resolutions FOR SELECT TO authenticated
 USING(owner_id=(SELECT auth.uid()) OR EXISTS(
  SELECT 1 FROM public.care_patient_access a
  WHERE a.patient_id=care_task_resolutions.patient_id
   AND a.owner_id=care_task_resolutions.owner_id
   AND a.user_id=(SELECT auth.uid())
 ));

CREATE OR REPLACE FUNCTION public.care_confirm_task(p_task_id uuid, p_water_ml integer DEFAULT NULL::integer)
 RETURNS timestamp with time zone
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
 -- No expiry for meals or hydration. Record ACTUAL server confirmation time.
 -- Medicine schedules are not adjusted.
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
 IF EXISTS(SELECT 1 FROM public.care_task_resolutions d WHERE d.task_id=v_task.id)
 THEN RAISE EXCEPTION 'Task has a final patient response; undo it before updating water'; END IF;
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

CREATE OR REPLACE FUNCTION public.care_reschedule_pending_task(p_task_id uuid, p_new_scheduled_at timestamp with time zone, p_reason text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_uid uuid:=auth.uid();
 v_task public.care_daily_checklist%ROWTYPE;
 v_now timestamptz:=clock_timestamp();
 v_reason text:=trim(coalesce(p_reason,''));
 v_end timestamptz;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO v_task FROM public.care_daily_checklist t
 WHERE t.id=p_task_id AND t.category IN ('refeicao','hidratacao')
   AND (t.owner_id=v_uid OR EXISTS(
    SELECT 1 FROM public.care_patient_access a WHERE a.patient_id=t.patient_id
      AND a.owner_id=t.owner_id AND a.user_id=v_uid))
 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Only authorized meal or water tasks can be rescheduled'; END IF;
 IF v_task.completed_at IS NOT NULL THEN RAISE EXCEPTION 'Task already confirmed'; END IF;
 IF p_new_scheduled_at IS NULL OR p_new_scheduled_at<v_now+interval '1 minute'
 THEN RAISE EXCEPTION 'Choose a new future time'; END IF;
 IF (p_new_scheduled_at AT TIME ZONE 'America/Rio_Branco')::date <>
    (v_task.scheduled_at AT TIME ZONE 'America/Rio_Branco')::date
 THEN RAISE EXCEPTION 'Choose a time on the same local calendar day'; END IF;
 v_end:=(((v_task.scheduled_at AT TIME ZONE 'America/Rio_Branco')::date)::timestamp+
        (CASE WHEN v_task.category='hidratacao' THEN interval '23 hours'
              ELSE interval '23 hours 50 minutes' END)) AT TIME ZONE 'America/Rio_Branco';
 IF p_new_scheduled_at>v_end THEN RAISE EXCEPTION 'New time exceeds the care-day limit'; END IF;
 IF length(v_reason)>500 THEN RAISE EXCEPTION 'Reason is too long'; END IF;
 IF EXISTS(SELECT 1 FROM public.care_task_resolutions WHERE task_id=v_task.id)
 THEN RAISE EXCEPTION 'Undo the previous resolution first'; END IF;
 IF v_task.category='hidratacao' AND EXISTS(
  SELECT 1 FROM public.care_hydration_responses
  WHERE task_id=v_task.id AND response='not_drunk')
 THEN RAISE EXCEPTION 'Water already answered; correct the response first'; END IF;
 UPDATE public.care_daily_checklist SET scheduled_at=p_new_scheduled_at
 WHERE id=v_task.id AND completed_at IS NULL;
 INSERT INTO public.care_activity_log(owner_id,patient_id,task_id,category,
  event_type,scheduled_at,happened_at,recorded_at,actor_id,source,details)
 VALUES(v_task.owner_id,v_task.patient_id,v_task.id,v_task.category,
  'rescheduled',v_task.scheduled_at,NULL,v_now,v_uid,'client_manual',
  jsonb_build_object('title',v_task.title,'previous_scheduled_at',v_task.scheduled_at,
    'next_scheduled_at',p_new_scheduled_at,'reason',v_reason,'user_requested',true));
 RETURN jsonb_build_object('task_id',v_task.id,'status','remarcado',
  'previous_scheduled_at',v_task.scheduled_at,
  'scheduled_at',p_new_scheduled_at,'recorded_at',v_now);
END;
$function$;

CREATE OR REPLACE FUNCTION public.care_resolve_pending_task(p_task_id uuid, p_status text, p_reason text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_uid uuid:=auth.uid();
 v_task public.care_daily_checklist%ROWTYPE;
 v_existing public.care_task_resolutions%ROWTYPE;
 v_now timestamptz:=clock_timestamp();
 v_reason text:=trim(coalesce(p_reason,''));
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('nao_cumprido','cancelado') THEN
  RAISE EXCEPTION 'Invalid resolution: choose nao_cumprido or cancelado';
 END IF;
 IF length(v_reason)>500 THEN RAISE EXCEPTION 'Reason must be at most 500 characters'; END IF;
 SELECT t.* INTO v_task FROM public.care_daily_checklist t
 WHERE t.id=p_task_id AND t.category IN ('medicacao','hidratacao','refeicao','outro')
 AND (t.owner_id=v_uid OR EXISTS (
   SELECT 1 FROM public.care_patient_access a
   WHERE a.patient_id=t.patient_id AND a.owner_id=t.owner_id AND a.user_id=v_uid))
 FOR UPDATE OF t;
 IF NOT FOUND THEN RAISE EXCEPTION 'Care task unavailable'; END IF;
 IF v_task.completed_at IS NOT NULL THEN RAISE EXCEPTION 'Task already confirmed'; END IF;
 IF v_task.scheduled_at>v_now THEN RAISE EXCEPTION 'Cannot resolve a future scheduled task'; END IF;
 IF v_task.category='hidratacao' AND EXISTS (
   SELECT 1 FROM public.care_hydration_responses h
   WHERE h.task_id=v_task.id AND h.response='not_drunk') THEN
  RAISE EXCEPTION 'Water already answered as not drunk; use the water correction option';
 END IF;
 SELECT * INTO v_existing FROM public.care_task_resolutions
 WHERE task_id=p_task_id FOR UPDATE;
 IF FOUND THEN
   IF v_existing.status=p_status THEN
     RETURN jsonb_build_object('task_id',v_task.id,'status',v_existing.status,
       'resolved_at',v_existing.resolved_at,'already_recorded',true);
   END IF;
   RAISE EXCEPTION 'Task already resolved. Undo the previous decision first';
 END IF;
 INSERT INTO public.care_task_resolutions(task_id,owner_id,patient_id,status,reason,
       scheduled_at,resolved_at,actor_id)
 VALUES (v_task.id,v_task.owner_id,v_task.patient_id,p_status,v_reason,
       v_task.scheduled_at,v_now,v_uid);
 INSERT INTO public.care_activity_log
   (owner_id,patient_id,task_id,category,event_type,scheduled_at,
    happened_at,recorded_at,actor_id,source,details)
 VALUES(v_task.owner_id,v_task.patient_id,v_task.id,v_task.category,
   CASE WHEN p_status='cancelado' THEN 'care_cancelled' ELSE 'care_not_completed' END,
   v_task.scheduled_at,NULL,v_now,v_uid,'client_care_resolution',
   jsonb_build_object('title',v_task.title,'resolution',p_status,
     'reason',v_reason,'patient_reported',true,
     'prescription_unchanged',v_task.category='medicacao'));
 RETURN jsonb_build_object('task_id',v_task.id,'status',p_status,
   'resolved_at',v_now,'already_recorded',false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.care_undo_task_resolution(p_task_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_uid uuid:=auth.uid();
 v_task public.care_daily_checklist%ROWTYPE;
 v_existing public.care_task_resolutions%ROWTYPE;
 v_now timestamptz:=clock_timestamp();
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO v_task FROM public.care_daily_checklist t
 WHERE t.id=p_task_id AND (t.owner_id=v_uid OR EXISTS(
  SELECT 1 FROM public.care_patient_access a WHERE a.patient_id=t.patient_id
   AND a.owner_id=t.owner_id AND a.user_id=v_uid))
 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Care task unavailable'; END IF;
 IF v_task.completed_at IS NOT NULL THEN RAISE EXCEPTION 'Already confirmed'; END IF;
 SELECT * INTO v_existing FROM public.care_task_resolutions
 WHERE task_id=p_task_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'There is no decision to undo'; END IF;
 DELETE FROM public.care_task_resolutions WHERE task_id=p_task_id;
 INSERT INTO public.care_activity_log(owner_id,patient_id,task_id,category,
  event_type,scheduled_at,happened_at,recorded_at,actor_id,source,details)
 VALUES(v_task.owner_id,v_task.patient_id,v_task.id,v_task.category,
  'care_resolution_reset',v_task.scheduled_at,NULL,v_now,v_uid,
  'client_care_resolution',
  jsonb_build_object('title',v_task.title,'previous_resolution',v_existing.status,
    'previous_resolved_at',v_existing.resolved_at,
    'reason','Resposta desfeita para permitir correção'));
 RETURN jsonb_build_object('task_id',v_task.id,'status','pendente',
   'undone_at',v_now);
END;
$function$;

REVOKE ALL ON FUNCTION public.care_resolve_pending_task(uuid,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.care_undo_task_resolution(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.care_reschedule_pending_task(uuid,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.care_resolve_pending_task(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.care_undo_task_resolution(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.care_reschedule_pending_task(uuid,timestamptz,text) TO authenticated;
