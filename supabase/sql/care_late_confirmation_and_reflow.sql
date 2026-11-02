-- CareDigital - server-side late confirmation and schedule recalculation.
-- Executed in Supabase production on 2026-11-02; kept here for deployment parity.
-- Only future, same-day pending slots of the same type may be shifted; medicines stay intact.

CREATE OR REPLACE FUNCTION public.care_reflow_pending_schedule(p_patient_id uuid, p_category text, p_previous_time timestamp with time zone, p_confirmed_time timestamp with time zone)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_day_end timestamptz;
 v_last timestamptz;
 v_shift interval;
 v_item record;
 v_count integer := 0;
BEGIN
 IF p_category NOT IN ('refeicao','hidratacao') OR p_confirmed_time <= p_previous_time
    OR (p_previous_time AT TIME ZONE 'America/Rio_Branco')::date <>
       (p_confirmed_time AT TIME ZONE 'America/Rio_Branco')::date
 THEN RETURN 0; END IF;
 v_day_end := ((((p_confirmed_time AT TIME ZONE 'America/Rio_Branco')::date + 1)::timestamp
                  AT TIME ZONE 'America/Rio_Branco') - interval '10 minutes');
 SELECT max(t.scheduled_at) INTO v_last
 FROM public.care_daily_checklist t
 WHERE t.patient_id=p_patient_id AND t.category=p_category
   AND t.completed_at IS NULL
   AND t.scheduled_at > p_confirmed_time
   AND (t.scheduled_at AT TIME ZONE 'America/Rio_Branco')::date =
       (p_confirmed_time AT TIME ZONE 'America/Rio_Branco')::date
   AND NOT EXISTS (SELECT 1 FROM public.care_hydration_responses h
                   WHERE h.task_id=t.id AND h.response='not_drunk');
 IF v_last IS NULL OR v_last >= v_day_end THEN RETURN 0; END IF;
 v_shift := LEAST(p_confirmed_time - p_previous_time, v_day_end - v_last);
 IF v_shift <= interval '0' THEN RETURN 0; END IF;
 FOR v_item IN
   SELECT t.id, t.owner_id, t.title, t.scheduled_at
   FROM public.care_daily_checklist t
   WHERE t.patient_id=p_patient_id AND t.category=p_category AND t.completed_at IS NULL
     AND t.scheduled_at > p_confirmed_time
     AND (t.scheduled_at AT TIME ZONE 'America/Rio_Branco')::date =
         (p_confirmed_time AT TIME ZONE 'America/Rio_Branco')::date
     AND NOT EXISTS (SELECT 1 FROM public.care_hydration_responses h
                     WHERE h.task_id=t.id AND h.response='not_drunk')
   ORDER BY t.scheduled_at, t.id
   FOR UPDATE OF t
 LOOP
   UPDATE public.care_daily_checklist
      SET scheduled_at = v_item.scheduled_at + v_shift
      WHERE id=v_item.id AND completed_at IS NULL;
   INSERT INTO public.care_activity_log
     (owner_id,patient_id,task_id,category,event_type,scheduled_at,happened_at,
      recorded_at,actor_id,source,details)
   VALUES (v_item.owner_id,p_patient_id,v_item.id,p_category,'rescheduled',
           v_item.scheduled_at,NULL,p_confirmed_time,auth.uid(),'automatic_reflow',
           jsonb_build_object('title',v_item.title,'previous_scheduled_at',
             v_item.scheduled_at,'next_scheduled_at',v_item.scheduled_at+v_shift,
             'reason','late_confirmation','shift_seconds',extract(epoch FROM v_shift)));
   v_count := v_count+1;
 END LOOP;
 RETURN v_count;
END;
$function$


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
   INSERT INTO public.care_hydration(owner_id,patient_id,amount_ml,recorded_at)
   VALUES (v_task.owner_id,v_task.patient_id,p_water_ml,v_now);
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
$function$


CREATE OR REPLACE FUNCTION public.care_confirm_meal(p_task_id uuid, p_description text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_task public.care_daily_checklist%rowtype;
 v_when timestamptz;
 v_description text:=trim(coalesce(p_description,''));
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF length(v_description) NOT BETWEEN 3 AND 1000 THEN
   RAISE EXCEPTION 'Meal description must have 3 to 1000 characters';
 END IF;
 SELECT t.* INTO v_task
 FROM public.care_daily_checklist t
 WHERE t.id=p_task_id AND t.category='refeicao'
   AND (t.owner_id=auth.uid() OR EXISTS(
     SELECT 1 FROM public.care_patient_access a
     WHERE a.patient_id=t.patient_id AND a.user_id=auth.uid()))
 FOR UPDATE OF t;
 IF NOT FOUND THEN RAISE EXCEPTION 'Meal unavailable'; END IF;
 v_when:=public.care_confirm_task(p_task_id,NULL);
 INSERT INTO public.care_meal_details(task_id,owner_id,patient_id,description,recorded_at)
 VALUES(v_task.id,v_task.owner_id,v_task.patient_id,v_description,v_when)
 ON CONFLICT(task_id) DO UPDATE SET description=EXCLUDED.description,
                                    recorded_at=EXCLUDED.recorded_at;
 RETURN v_when;
END;
$function$


CREATE OR REPLACE FUNCTION public.care_mark_water_not_drunk(p_task_id uuid)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_task public.care_daily_checklist%rowtype;
 v_uid uuid:=auth.uid();
 v_now timestamptz:=clock_timestamp();
 v_recorded timestamptz;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT t.* INTO v_task FROM public.care_daily_checklist t
 WHERE t.id=p_task_id AND t.category='hidratacao'
 AND (t.owner_id=v_uid OR EXISTS(SELECT 1 FROM public.care_patient_access a
                                WHERE a.patient_id=t.patient_id AND a.user_id=v_uid))
 FOR UPDATE OF t;
 IF NOT FOUND THEN RAISE EXCEPTION 'Hydration task unavailable'; END IF;
 IF v_task.completed_at IS NOT NULL THEN RAISE EXCEPTION 'Already confirmed as drunk'; END IF;
 IF v_now < v_task.scheduled_at THEN RAISE EXCEPTION 'Care window not started'; END IF;
 INSERT INTO public.care_hydration_responses(task_id,patient_id,owner_id,response,recorded_at)
 VALUES(v_task.id,v_task.patient_id,v_task.owner_id,'not_drunk',v_now)
 ON CONFLICT(task_id) DO NOTHING RETURNING recorded_at INTO v_recorded;
 IF v_recorded IS NULL THEN RAISE EXCEPTION 'Water response already recorded'; END IF;
 RETURN v_recorded;
END;
$function$


REVOKE ALL ON FUNCTION public.care_reflow_pending_schedule(uuid,text,timestamptz,timestamptz) FROM PUBLIC, anon, authenticated;

-- Crucial trigger fix: previously blocked late confirmations even after RPC changes.
-- Existing trigger care_task_confirmation_window_guard invokes this function.
CREATE OR REPLACE FUNCTION public.care_enforce_task_confirmation_window()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_now timestamptz := clock_timestamp();
BEGIN
 IF TG_OP='INSERT' THEN
   IF NEW.completed_at IS NOT NULL THEN
     RAISE EXCEPTION 'Task confirmation must use the server-controlled confirmation flow';
   END IF;
   RETURN NEW;
 END IF;
 IF OLD.completed_at IS NOT NULL AND (
   NEW.completed_at IS DISTINCT FROM OLD.completed_at
   OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
 ) THEN
   RAISE EXCEPTION 'Confirmed care records cannot be backdated or altered';
 END IF;
 IF NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
   IF NEW.completed_at IS NULL THEN RAISE EXCEPTION 'Cannot clear a care confirmation'; END IF;
   IF v_now < OLD.scheduled_at THEN RAISE EXCEPTION 'Care window not started'; END IF;
   -- Late meal and hydration confirmations are allowed; record the actual server time.
   -- Medication constraints are retained in their dedicated trigger.
   NEW.completed_at := v_now;
 END IF;
 RETURN NEW;
END;
$function$

