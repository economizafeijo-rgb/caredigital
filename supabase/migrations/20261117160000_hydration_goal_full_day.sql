-- Meta de água: a janela de registro passa a ser de 24 horas (00:00 a 24:00, horário do Acre).
-- Todo registro do dia conta para a meta, em qualquer horário; o dia fecha à meia-noite.
-- O horário ideal para concluir a água (padrão 20h, 3 h antes de dormir) é só uma orientação no aplicativo.
-- Depois de aplicar, a próxima sincronização recalcula os últimos dias com a nova janela.
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
 v_cutoff:=(p_day::timestamp + interval '1 day') AT TIME ZONE 'America/Rio_Branco';
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
 -- O dia fecha à meia-noite (janela de 24 h): a meta vale para o dia corrente.
 v_effective:=v_today;
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
     'cutoff_local','24:00','time_zone','America/Rio_Branco');
 END IF;
 RETURN jsonb_build_object(
   'goal_date',v_today,'status',v_row.status,'target_ml',v_row.target_ml,
   'consumed_ml',v_row.consumed_ml,
   'remaining_ml',greatest(0,v_row.target_ml-v_row.consumed_ml),
   'closed_at',v_row.closed_at,'cutoff_local','24:00','time_zone','America/Rio_Branco'
 );
END;
$function$;
