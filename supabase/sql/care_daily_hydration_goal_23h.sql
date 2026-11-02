-- CareDigital — daily hydration goal close at 23:00 America/Rio_Branco
-- Production PostgreSQL/Supabase reference; idempotent per patient + date.
-- Actual consumption is the sum of water entries recorded BEFORE 23:00 local;
-- records after 23:00 remain in the individual log but not the closed goal.
CREATE TABLE IF NOT EXISTS public.care_hydration_goal_targets (
 patient_id uuid NOT NULL REFERENCES public.care_patients(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL,effective_date date NOT NULL,
 target_ml integer,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(patient_id,effective_date),
 CONSTRAINT hydration_target_positive CHECK(target_ml IS NULL OR target_ml BETWEEN 100 AND 10000)
);
CREATE TABLE IF NOT EXISTS public.care_hydration_daily_goals (
 patient_id uuid NOT NULL REFERENCES public.care_patients(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL,goal_date date NOT NULL,
 target_ml integer NOT NULL CHECK(target_ml BETWEEN 100 AND 10000),
 consumed_ml integer NOT NULL DEFAULT 0 CHECK(consumed_ml>=0),
 status text NOT NULL DEFAULT 'em_andamento'
   CHECK(status IN ('em_andamento','atingida','nao_atingida')),
 closed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(patient_id,goal_date)
);
CREATE INDEX IF NOT EXISTS care_hydration_daily_goals_owner_date_idx
 ON public.care_hydration_daily_goals(owner_id,goal_date DESC);
ALTER TABLE public.care_hydration_goal_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_hydration_daily_goals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.care_hydration_goal_targets FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.care_hydration_daily_goals FROM PUBLIC,anon;
GRANT SELECT ON public.care_hydration_daily_goals TO authenticated;
DROP POLICY IF EXISTS "read authorized daily hydration goals" ON public.care_hydration_daily_goals;
CREATE POLICY "read authorized daily hydration goals"
 ON public.care_hydration_daily_goals FOR SELECT TO authenticated
 USING (owner_id=(SELECT auth.uid()) OR EXISTS
 (SELECT 1 FROM public.care_patient_access a
  WHERE a.patient_id=care_hydration_daily_goals.patient_id
  AND a.user_id=(SELECT auth.uid())));

CREATE OR REPLACE FUNCTION public.care_recompute_hydration_day(p_patient_id uuid, p_day date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_owner uuid;
 v_target integer;
 v_total bigint;
 v_start timestamptz;
 v_cutoff timestamptz;
 v_closed boolean;
BEGIN
 SELECT p.owner_id INTO v_owner FROM public.care_patients p WHERE p.id=p_patient_id;
 IF v_owner IS NULL THEN RETURN; END IF;
 SELECT gt.target_ml INTO v_target
 FROM public.care_hydration_goal_targets gt
 WHERE gt.patient_id=p_patient_id AND gt.effective_date<=p_day
 ORDER BY gt.effective_date DESC LIMIT 1;
 IF v_target IS NULL THEN
   DELETE FROM public.care_hydration_daily_goals d
    WHERE d.patient_id=p_patient_id AND d.goal_date=p_day;
   RETURN;
 END IF;
 v_start:=p_day::timestamp AT TIME ZONE 'America/Rio_Branco';
 v_cutoff:=(p_day::timestamp + interval '23 hours') AT TIME ZONE 'America/Rio_Branco';
 SELECT coalesce(sum(h.amount_ml),0) INTO v_total
 FROM public.care_hydration h
 WHERE h.patient_id=p_patient_id AND h.recorded_at>=v_start AND h.recorded_at<v_cutoff;
 v_closed:=clock_timestamp()>=v_cutoff;
 INSERT INTO public.care_hydration_daily_goals
   (patient_id,owner_id,goal_date,target_ml,consumed_ml,status,closed_at,updated_at)
 VALUES(p_patient_id,v_owner,p_day,v_target,v_total,
   CASE WHEN v_total>=v_target THEN 'atingida'
        WHEN v_closed THEN 'nao_atingida'
        ELSE 'em_andamento' END,
   CASE WHEN v_closed THEN v_cutoff ELSE NULL END, clock_timestamp())
 ON CONFLICT(patient_id,goal_date) DO UPDATE SET
   owner_id=EXCLUDED.owner_id,
   target_ml=EXCLUDED.target_ml,
   consumed_ml=EXCLUDED.consumed_ml,
   status=EXCLUDED.status,
   closed_at=EXCLUDED.closed_at,
   updated_at=CASE
     WHEN care_hydration_daily_goals.target_ml IS DISTINCT FROM EXCLUDED.target_ml
       OR care_hydration_daily_goals.consumed_ml IS DISTINCT FROM EXCLUDED.consumed_ml
       OR care_hydration_daily_goals.status IS DISTINCT FROM EXCLUDED.status
     THEN EXCLUDED.updated_at ELSE care_hydration_daily_goals.updated_at END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.care_sync_hydration_goal(p_patient_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_uid uuid:=auth.uid();
 v_owner uuid;
 v_target integer;
 v_today date:=(clock_timestamp() AT TIME ZONE 'America/Rio_Branco')::date;
 v_effective date;
 v_start date;
 v_day date;
 v_row public.care_hydration_daily_goals%ROWTYPE;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT p.owner_id INTO v_owner FROM public.care_patients p
 WHERE p.id=p_patient_id AND
   (p.owner_id=v_uid OR EXISTS(
    SELECT 1 FROM public.care_patient_access a
     WHERE a.patient_id=p.id AND a.user_id=v_uid));
 IF v_owner IS NULL THEN RAISE EXCEPTION 'Patient unavailable'; END IF;
 SELECT CASE WHEN h.target_ml BETWEEN 100 AND 10000 AND NOT h.fluid_restriction
              THEN h.target_ml ELSE NULL END INTO v_target
 FROM public.care_hydration_profiles h WHERE h.patient_id=p_patient_id;
 -- After 23:00 never create/change today's target retroactively.
 v_effective:=v_today + CASE WHEN
   (clock_timestamp() AT TIME ZONE 'America/Rio_Branco')::time>=time '23:00'
   THEN 1 ELSE 0 END;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_patient_id::text,17));
 INSERT INTO public.care_hydration_goal_targets(patient_id,owner_id,effective_date,target_ml)
 VALUES(p_patient_id,v_owner,v_effective,v_target)
 ON CONFLICT(patient_id,effective_date) DO UPDATE SET
   target_ml=EXCLUDED.target_ml,owner_id=EXCLUDED.owner_id
 WHERE care_hydration_goal_targets.target_ml IS DISTINCT FROM EXCLUDED.target_ml
    OR care_hydration_goal_targets.owner_id IS DISTINCT FROM EXCLUDED.owner_id;
 SELECT greatest(min(gt.effective_date),v_today-90) INTO v_start
 FROM public.care_hydration_goal_targets gt
 WHERE gt.patient_id=p_patient_id AND gt.effective_date<=v_today;
 IF v_start IS NOT NULL THEN
   FOR v_day IN SELECT generate_series(v_start,v_today,'1 day'::interval)::date LOOP
      PERFORM public.care_recompute_hydration_day(p_patient_id,v_day);
   END LOOP;
 END IF;
 SELECT * INTO v_row FROM public.care_hydration_daily_goals d
 WHERE d.patient_id=p_patient_id AND d.goal_date=v_today;
 IF NOT FOUND THEN
   RETURN jsonb_build_object('goal_date',v_today,'status','sem_meta',
     'cutoff_local','23:00','time_zone','America/Rio_Branco');
 END IF;
 RETURN jsonb_build_object(
   'goal_date',v_today,'status',v_row.status,'target_ml',v_row.target_ml,
   'consumed_ml',v_row.consumed_ml,
   'remaining_ml',greatest(0,v_row.target_ml-v_row.consumed_ml),
   'closed_at',v_row.closed_at,'cutoff_local','23:00','time_zone','America/Rio_Branco'
 );
END;
$function$;

CREATE OR REPLACE FUNCTION public.care_rollup_hydration_goals()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_patient uuid;
 v_begin date;
 v_day date;
 v_today date:=(clock_timestamp() AT TIME ZONE 'America/Rio_Branco')::date;
 v_count integer:=0;
BEGIN
 FOR v_patient IN SELECT DISTINCT gt.patient_id FROM public.care_hydration_goal_targets gt LOOP
   SELECT greatest(min(gt.effective_date),v_today-90) INTO v_begin
   FROM public.care_hydration_goal_targets gt WHERE gt.patient_id=v_patient;
   FOR v_day IN SELECT generate_series(v_begin,v_today,'1 day'::interval)::date LOOP
     PERFORM public.care_recompute_hydration_day(v_patient,v_day);
     v_count:=v_count+1;
   END LOOP;
 END LOOP;
 RETURN v_count;
END;
$function$;


REVOKE ALL ON FUNCTION public.care_recompute_hydration_day(uuid,date)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.care_rollup_hydration_goals()
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.care_sync_hydration_goal(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.care_sync_hydration_goal(uuid) TO authenticated;

-- pg_cron uses UTC/GMT. 04:05 UTC = 23:05 Acre (UTC-5).
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
SELECT cron.schedule('caredigital-hydration-day-close-2300-acre',
 '5 4 * * *', $$ SELECT public.care_rollup_hydration_goals(); $$);
