-- 1) Confirmação atrasada de medicação: o diálogo do paciente oferece "confirmo que tomei agora"
--    mesmo com atraso, mas o servidor recusava após 15 min. Passa a aceitar e registrar o atraso.
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


-- 2) Regularização de doses esquecidas: confirma, com o horário programado, as doses de
--    medicação já vencidas que não têm confirmação nem resposta final. Cada registro fica
--    marcado como retroativo no histórico auditável (não se confunde com confirmação em tempo real).
CREATE OR REPLACE FUNCTION public.care_confirm_missed_medication(p_patient_id uuid, p_since date DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_uid uuid:=auth.uid();
 v_now timestamptz:=clock_timestamp();
 v_count integer:=0;
 v_task record;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.care_patients p WHERE p.id=p_patient_id AND
    (p.owner_id=v_uid OR EXISTS(SELECT 1 FROM public.care_patient_access a WHERE a.patient_id=p.id AND a.user_id=v_uid)))
 THEN RAISE EXCEPTION 'Patient unavailable'; END IF;
 FOR v_task IN
   SELECT t.* FROM public.care_daily_checklist t
   WHERE t.patient_id=p_patient_id AND t.category='medicacao' AND t.completed_at IS NULL
     AND t.scheduled_at < v_now
     AND (p_since IS NULL OR t.scheduled_at >= (p_since::timestamp AT TIME ZONE 'America/Rio_Branco'))
     AND NOT EXISTS(SELECT 1 FROM public.care_task_resolutions d WHERE d.task_id=t.id)
   ORDER BY t.scheduled_at
   FOR UPDATE OF t
 LOOP
   UPDATE public.care_daily_checklist SET completed_at=v_task.scheduled_at WHERE id=v_task.id;
   INSERT INTO public.care_activity_log
    (owner_id,patient_id,task_id,category,event_type,scheduled_at,happened_at,recorded_at,actor_id,source,details)
   VALUES(v_task.owner_id,v_task.patient_id,v_task.id,'medicacao','confirmed',v_task.scheduled_at,v_task.scheduled_at,
     v_now,v_uid,'retroactive_patient_report',
     jsonb_build_object('title',v_task.title,'retroactive',true,'late',false,'delay_minutes',0,
       'note','Dose confirmada posteriormente pelo paciente no horário programado.'));
   v_count:=v_count+1;
 END LOOP;
 RETURN v_count;
END;
$function$;
REVOKE ALL ON FUNCTION public.care_confirm_missed_medication(uuid, date) FROM public;
GRANT EXECUTE ON FUNCTION public.care_confirm_missed_medication(uuid, date) TO authenticated;
