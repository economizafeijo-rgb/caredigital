-- Improve hydration reminder recalculation after intake, correction and deletion.
-- Also provide audited, permission-checked editing/deletion for unscheduled intake rows.

CREATE OR REPLACE FUNCTION public.care_replan_overdue_hydration(
  p_patient_id uuid,
  p_kind text DEFAULT 'agua',
  p_amount_ml integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_day date := (clock_timestamp() AT TIME ZONE 'America/Rio_Branco')::date;
  v_start timestamptz := (v_day::timestamp AT TIME ZONE 'America/Rio_Branco');
  v_cutoff timestamptz := ((v_day::timestamp + interval '22 hours 50 minutes') AT TIME ZONE 'America/Rio_Branco');
  v_goal integer;
  v_total integer := 0;
  v_remaining integer := 0;
  v_restrict boolean := false;
  v_gap integer := 45;
  v_previous timestamptz;
  v_candidate timestamptz;
  v_task record;
  v_changed integer := 0;
BEGIN
  IF p_patient_id IS NULL THEN RAISE EXCEPTION 'Patient is required'; END IF;
  IF p_kind = 'bebida' THEN v_gap := 30;
  ELSIF p_kind = 'agua' AND coalesce(p_amount_ml,0) >= 750 THEN v_gap := 90;
  ELSIF p_kind = 'agua' AND coalesce(p_amount_ml,0) >= 500 THEN v_gap := 75;
  ELSIF p_kind = 'agua' AND coalesce(p_amount_ml,0) >= 300 THEN v_gap := 60;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_patient_id::text || v_day::text, 82));
  SELECT coalesce(h.fluid_restriction,false) INTO v_restrict
  FROM public.care_hydration_profiles h WHERE h.patient_id=p_patient_id;
  IF NOT coalesce(v_restrict,false) THEN
    SELECT gt.target_ml INTO v_goal
    FROM public.care_hydration_goal_targets gt
    WHERE gt.patient_id=p_patient_id AND gt.effective_date<=v_day
    ORDER BY gt.effective_date DESC LIMIT 1;
    IF v_goal IS NULL THEN
      SELECT h.target_ml INTO v_goal FROM public.care_hydration_profiles h
      WHERE h.patient_id=p_patient_id;
    END IF;
  END IF;
  IF v_goal NOT BETWEEN 100 AND 10000 THEN v_goal:=NULL; END IF;
  SELECT coalesce(sum(h.amount_ml),0)::integer INTO v_total
  FROM public.care_hydration h
  WHERE h.patient_id=p_patient_id
    AND (h.recorded_at AT TIME ZONE 'America/Rio_Branco')::date=v_day
    AND h.recorded_at < v_cutoff;
  v_remaining:=greatest(0,coalesce(v_goal,0)-v_total);

  -- Only open reminders from today that have already passed are moved.
  -- Completed and explicitly resolved tasks are never changed.
  IF v_now < v_cutoff AND NOT v_restrict AND (v_goal IS NULL OR v_remaining>0) THEN
    v_previous:=v_now;
    FOR v_task IN
      SELECT t.id,t.owner_id,t.title,t.scheduled_at
      FROM public.care_daily_checklist t
      WHERE t.patient_id=p_patient_id AND t.category='hidratacao'
        AND t.completed_at IS NULL
        AND t.scheduled_at>=v_start AND t.scheduled_at<=v_now
        AND t.scheduled_at<v_cutoff
        AND NOT EXISTS(SELECT 1 FROM public.care_hydration_responses h
          WHERE h.task_id=t.id AND h.response='not_drunk')
        AND NOT EXISTS(SELECT 1 FROM public.care_task_resolutions r WHERE r.task_id=t.id)
      ORDER BY t.scheduled_at,t.id
      FOR UPDATE OF t
    LOOP
      v_candidate:=v_previous+make_interval(mins=>v_gap);
      IF v_candidate<=v_cutoff THEN
        UPDATE public.care_daily_checklist SET scheduled_at=v_candidate WHERE id=v_task.id;
        INSERT INTO public.care_activity_log
          (owner_id,patient_id,task_id,category,event_type,scheduled_at,happened_at,
           recorded_at,actor_id,source,details)
        VALUES
          (v_task.owner_id,p_patient_id,v_task.id,'hidratacao','rescheduled',
           v_task.scheduled_at,NULL,v_now,auth.uid(),'adaptive_consumption_replan',
           jsonb_build_object('title',v_task.title,'previous_scheduled_at',v_task.scheduled_at,
             'next_scheduled_at',v_candidate,'kind',p_kind,'amount_ml',p_amount_ml,
             'reason','overdue_reminder_replanned_after_intake','gap_minutes',v_gap));
        v_changed:=v_changed+1;
        v_previous:=v_candidate;
      END IF;
    END LOOP;
  END IF;
  RETURN v_changed;
END;
$function$;

REVOKE ALL ON FUNCTION public.care_replan_overdue_hydration(uuid,text,integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.care_auto_replan_on_hydration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_today date := (clock_timestamp() AT TIME ZONE 'America/Rio_Branco')::date;
  v_old_day date;
  v_new_day date;
BEGIN
  IF TG_OP='DELETE' THEN
    v_old_day := (OLD.recorded_at AT TIME ZONE 'America/Rio_Branco')::date;
    PERFORM public.care_recompute_hydration_day(OLD.patient_id,v_old_day);
    IF v_old_day=v_today THEN
      PERFORM public.care_replan_overdue_hydration(OLD.patient_id,'correcao_agua',NULL);
      PERFORM public.care_recalculate_after_consumption(OLD.patient_id,'correcao_agua',NULL);
    END IF;
    RETURN OLD;
  ELSIF TG_OP='UPDATE' THEN
    v_old_day := (OLD.recorded_at AT TIME ZONE 'America/Rio_Branco')::date;
    v_new_day := (NEW.recorded_at AT TIME ZONE 'America/Rio_Branco')::date;
    IF v_old_day IS DISTINCT FROM v_new_day THEN
      PERFORM public.care_recompute_hydration_day(OLD.patient_id,v_old_day);
    END IF;
    IF v_new_day=v_today THEN
      PERFORM public.care_replan_overdue_hydration(NEW.patient_id,'correcao_agua',NEW.amount_ml);
      PERFORM public.care_recalculate_after_consumption(NEW.patient_id,'correcao_agua',NEW.amount_ml);
    ELSE
      PERFORM public.care_recompute_hydration_day(NEW.patient_id,v_new_day);
      IF v_old_day=v_today THEN
        PERFORM public.care_replan_overdue_hydration(OLD.patient_id,'correcao_agua',NULL);
        PERFORM public.care_recalculate_after_consumption(OLD.patient_id,'correcao_agua',NULL);
      END IF;
    END IF;
    RETURN NEW;
  ELSE
    v_new_day := (NEW.recorded_at AT TIME ZONE 'America/Rio_Branco')::date;
    IF v_new_day=v_today THEN
      PERFORM public.care_replan_overdue_hydration(NEW.patient_id,'agua',NEW.amount_ml);
      PERFORM public.care_recalculate_after_consumption(NEW.patient_id,'agua',NEW.amount_ml);
    ELSE
      PERFORM public.care_recompute_hydration_day(NEW.patient_id,v_new_day);
    END IF;
    RETURN NEW;
  END IF;
END;
$function$;

DROP TRIGGER IF EXISTS care_auto_replan_hydration_insert ON public.care_hydration;
DROP TRIGGER IF EXISTS care_auto_replan_hydration_update ON public.care_hydration;
DROP TRIGGER IF EXISTS care_auto_replan_hydration_delete ON public.care_hydration;
CREATE TRIGGER care_auto_replan_hydration_insert
AFTER INSERT ON public.care_hydration
FOR EACH ROW EXECUTE FUNCTION public.care_auto_replan_on_hydration();
CREATE TRIGGER care_auto_replan_hydration_update
AFTER UPDATE OF amount_ml,recorded_at ON public.care_hydration
FOR EACH ROW WHEN (OLD.amount_ml IS DISTINCT FROM NEW.amount_ml OR OLD.recorded_at IS DISTINCT FROM NEW.recorded_at)
EXECUTE FUNCTION public.care_auto_replan_on_hydration();
CREATE TRIGGER care_auto_replan_hydration_delete
AFTER DELETE ON public.care_hydration
FOR EACH ROW EXECUTE FUNCTION public.care_auto_replan_on_hydration();

CREATE OR REPLACE FUNCTION public.care_auto_replan_on_beverage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_today date := (clock_timestamp() AT TIME ZONE 'America/Rio_Branco')::date;
  v_day date;
  v_patient uuid;
  v_amount integer;
BEGIN
  IF TG_OP='DELETE' THEN
    v_day:=(OLD.consumed_at AT TIME ZONE 'America/Rio_Branco')::date;
    v_patient:=OLD.patient_id; v_amount:=OLD.amount_ml;
  ELSE
    v_day:=(NEW.consumed_at AT TIME ZONE 'America/Rio_Branco')::date;
    v_patient:=NEW.patient_id; v_amount:=NEW.amount_ml;
  END IF;
  IF v_day=v_today THEN
    PERFORM public.care_replan_overdue_hydration(v_patient,'bebida',v_amount);
    PERFORM public.care_recalculate_after_consumption(v_patient,'bebida',v_amount);
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS care_auto_replan_beverage_update ON public.care_client_beverages;
DROP TRIGGER IF EXISTS care_auto_replan_beverage_delete ON public.care_client_beverages;
CREATE TRIGGER care_auto_replan_beverage_update
AFTER UPDATE OF amount_ml,consumed_at,name ON public.care_client_beverages
FOR EACH ROW WHEN (OLD.amount_ml IS DISTINCT FROM NEW.amount_ml OR OLD.consumed_at IS DISTINCT FROM NEW.consumed_at OR OLD.name IS DISTINCT FROM NEW.name)
EXECUTE FUNCTION public.care_auto_replan_on_beverage();
CREATE TRIGGER care_auto_replan_beverage_delete
AFTER DELETE ON public.care_client_beverages
FOR EACH ROW EXECUTE FUNCTION public.care_auto_replan_on_beverage();

CREATE OR REPLACE FUNCTION public.care_update_intake_entry(
  p_patient_id uuid,
  p_entry_type text,
  p_entry_id uuid,
  p_description text,
  p_amount_ml integer,
  p_consumed_at timestamptz
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
  v_when timestamptz:=p_consumed_at;
  v_water public.care_hydration%rowtype;
  v_beverage public.care_client_beverages%rowtype;
  v_meal public.care_activity_log%rowtype;
  v_task_id uuid;
  v_old jsonb;
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
  IF v_when IS NULL OR v_when>v_now+interval '2 minutes' THEN
    RAISE EXCEPTION 'Invalid consumption time (Acre time)';
  END IF;
  IF v_when>v_now THEN v_when:=v_now; END IF;

  IF p_entry_type='water' THEN
    IF p_amount_ml IS NULL OR p_amount_ml NOT BETWEEN 10 AND 1500 THEN
      RAISE EXCEPTION 'Water volume must be 10 to 1500 ml';
    END IF;
    SELECT * INTO v_water FROM public.care_hydration h
    WHERE h.id=p_entry_id AND h.patient_id=p_patient_id AND h.owner_id=v_owner
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Water record unavailable'; END IF;
    v_old:=jsonb_build_object('amount_ml',v_water.amount_ml,'recorded_at',v_water.recorded_at);
    UPDATE public.care_hydration SET amount_ml=p_amount_ml,recorded_at=v_when WHERE id=v_water.id;
    INSERT INTO public.care_activity_log(owner_id,patient_id,task_id,category,event_type,
      scheduled_at,happened_at,recorded_at,actor_id,source,details)
    VALUES(v_owner,p_patient_id,v_water.task_id,'hidratacao','intake_edited',NULL,v_when,
      v_now,v_uid,'client_intake_maintenance',
      jsonb_build_object('entry_type','water','entry_id',p_entry_id,'before',v_old,
        'after',jsonb_build_object('amount_ml',p_amount_ml,'recorded_at',v_when)));
    RETURN jsonb_build_object('success',true,'entry_type',p_entry_type,'entry_id',p_entry_id,
      'amount_ml',p_amount_ml,'consumed_at',v_when);
  ELSIF p_entry_type='beverage' THEN
    IF p_amount_ml IS NULL OR p_amount_ml NOT BETWEEN 10 AND 1500
      OR char_length(btrim(coalesce(p_description,''))) NOT BETWEEN 2 AND 100 THEN
      RAISE EXCEPTION 'Enter a beverage name and a volume from 10 to 1500 ml';
    END IF;
    SELECT * INTO v_beverage FROM public.care_client_beverages b
    WHERE b.id=p_entry_id AND b.patient_id=p_patient_id AND b.owner_id=v_owner
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Beverage record unavailable'; END IF;
    v_old:=jsonb_build_object('name',v_beverage.name,'amount_ml',v_beverage.amount_ml,'consumed_at',v_beverage.consumed_at);
    UPDATE public.care_client_beverages SET name=btrim(p_description),amount_ml=p_amount_ml,consumed_at=v_when
    WHERE id=v_beverage.id;
    INSERT INTO public.care_activity_log(owner_id,patient_id,category,event_type,
      scheduled_at,happened_at,recorded_at,actor_id,source,details)
    VALUES(v_owner,p_patient_id,'hidratacao','intake_edited',NULL,v_when,
      v_now,v_uid,'client_intake_maintenance',
      jsonb_build_object('entry_type','beverage','entry_id',p_entry_id,'before',v_old,
        'after',jsonb_build_object('name',btrim(p_description),'amount_ml',p_amount_ml,'consumed_at',v_when)));
    RETURN jsonb_build_object('success',true,'entry_type',p_entry_type,'entry_id',p_entry_id,
      'name',btrim(p_description),'amount_ml',p_amount_ml,'consumed_at',v_when);
  ELSE
    IF char_length(btrim(coalesce(p_description,''))) NOT BETWEEN 3 AND 1000 OR p_amount_ml IS NOT NULL THEN
      RAISE EXCEPTION 'Meal description must have 3 to 1000 characters';
    END IF;
    SELECT * INTO v_meal FROM public.care_activity_log l
    WHERE l.id=p_entry_id AND l.patient_id=p_patient_id AND l.owner_id=v_owner
      AND l.category='refeicao' AND l.event_type='logged'
      AND l.source='client_unscheduled_intake'
      AND coalesce((l.details->>'superseded')::boolean,false)=false
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Meal record unavailable'; END IF;
    v_task_id:=nullif(v_meal.details->>'linked_task_id','')::uuid;
    IF v_task_id IS NOT NULL THEN
      IF NOT EXISTS(SELECT 1 FROM public.care_daily_checklist t WHERE t.id=v_task_id
        AND t.patient_id=p_patient_id
        AND (t.scheduled_at AT TIME ZONE 'America/Rio_Branco')::date=
            (v_when AT TIME ZONE 'America/Rio_Branco')::date) THEN
        RAISE EXCEPTION 'A linked meal must remain on its scheduled Acre date';
      END IF;
      PERFORM set_config('care.meal_reclassification','enabled',true);
      UPDATE public.care_daily_checklist SET completed_at=v_when WHERE id=v_task_id;
      PERFORM set_config('care.meal_reclassification','disabled',true);
      UPDATE public.care_meal_details SET description=btrim(p_description),recorded_at=v_when
      WHERE task_id=v_task_id;
    END IF;
    v_old:=jsonb_build_object('description',v_meal.details->>'description','happened_at',v_meal.happened_at);
    UPDATE public.care_activity_log
    SET happened_at=v_when,recorded_at=v_when,
        details=details||jsonb_build_object('description',btrim(p_description))
    WHERE id=v_meal.id;
    INSERT INTO public.care_activity_log(owner_id,patient_id,task_id,category,event_type,
      scheduled_at,happened_at,recorded_at,actor_id,source,details)
    VALUES(v_owner,p_patient_id,v_task_id,'refeicao','intake_edited',NULL,v_when,
      v_now,v_uid,'client_intake_maintenance',
      jsonb_build_object('entry_type','meal','entry_id',p_entry_id,'before',v_old,
        'after',jsonb_build_object('description',btrim(p_description),'happened_at',v_when)));
    IF (v_when AT TIME ZONE 'America/Rio_Branco')::date=
       (v_now AT TIME ZONE 'America/Rio_Branco')::date THEN
      PERFORM public.care_recalculate_after_consumption(p_patient_id,'refeicao',NULL);
    END IF;
    RETURN jsonb_build_object('success',true,'entry_type',p_entry_type,'entry_id',p_entry_id,
      'description',btrim(p_description),'consumed_at',v_when);
  END IF;
END;
$function$;

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
      RAISE EXCEPTION 'Water linked to a scheduled care cannot be deleted here; edit its quantity or resolve the scheduled care';
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

REVOKE ALL ON FUNCTION public.care_update_intake_entry(uuid,text,uuid,text,integer,timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.care_delete_intake_entry(uuid,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.care_update_intake_entry(uuid,text,uuid,text,integer,timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.care_delete_intake_entry(uuid,text,uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
