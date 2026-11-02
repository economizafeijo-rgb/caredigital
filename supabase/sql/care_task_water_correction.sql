-- CareDigital: detalhes clicáveis e correção auditável do volume hídrico.
-- Banco DIGITALCARE: SQL de referência correspondente à implantação de produção.
-- Registros anteriores são relacionados por intervalo máximo de 2 segundos,
-- sem alterar o consumo, a data de registro ou a hora da confirmação.

ALTER TABLE public.care_hydration
 ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.care_daily_checklist(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS care_hydration_unique_task_id
 ON public.care_hydration (task_id) WHERE task_id IS NOT NULL;

WITH candidates AS (
 SELECT t.id task_id,h.id water_id,
 row_number() OVER (PARTITION BY t.id ORDER BY abs(extract(epoch FROM (h.recorded_at-t.completed_at))),h.id) AS task_rank,
 row_number() OVER (PARTITION BY h.id ORDER BY abs(extract(epoch FROM (h.recorded_at-t.completed_at))),t.id) AS water_rank
 FROM public.care_daily_checklist t
 JOIN public.care_hydration h ON h.patient_id=t.patient_id AND h.owner_id=t.owner_id
 WHERE t.category='hidratacao' AND t.completed_at IS NOT NULL
  AND h.task_id IS NULL
  AND abs(extract(epoch FROM (h.recorded_at-t.completed_at))) <= 2
)
UPDATE public.care_hydration h SET task_id=c.task_id
FROM candidates c
WHERE c.water_id=h.id AND c.task_rank=1 AND c.water_rank=1
 AND h.task_id IS NULL AND NOT EXISTS(
  SELECT 1 FROM public.care_hydration x WHERE x.task_id=c.task_id
 );

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

CREATE OR REPLACE FUNCTION public.care_get_task_record(p_task_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_task public.care_daily_checklist%rowtype;
 v_description text;
 v_water_id uuid;
 v_water_ml integer;
 v_last_correction timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT t.* INTO v_task
 FROM public.care_daily_checklist t
 WHERE t.id=p_task_id AND
   (t.owner_id=auth.uid() OR EXISTS(
     SELECT 1 FROM public.care_patient_access a
     WHERE a.patient_id=t.patient_id AND a.user_id=auth.uid()
   ));
 IF NOT FOUND THEN RAISE EXCEPTION 'Record unavailable'; END IF;
 IF v_task.category='refeicao' THEN
   SELECT d.description INTO v_description FROM public.care_meal_details d
   WHERE d.task_id=v_task.id AND d.patient_id=v_task.patient_id;
 ELSIF v_task.category='hidratacao' AND v_task.completed_at IS NOT NULL THEN
   SELECT h.id,h.amount_ml INTO v_water_id,v_water_ml
   FROM public.care_hydration h
   WHERE h.task_id=v_task.id AND h.patient_id=v_task.patient_id;
   SELECT max(l.recorded_at) INTO v_last_correction
   FROM public.care_activity_log l
   WHERE l.task_id=v_task.id AND l.event_type='water_volume_corrected'
     AND l.patient_id=v_task.patient_id;
 END IF;
 RETURN jsonb_build_object(
   'task_id',v_task.id,'title',v_task.title,'category',v_task.category,
   'scheduled_at',v_task.scheduled_at,'completed_at',v_task.completed_at,
   'description',v_description,'water_entry_id',v_water_id,'amount_ml',v_water_ml,
   'last_corrected_at',v_last_correction,
   'can_edit_water',v_task.category='hidratacao' AND v_task.completed_at IS NOT NULL AND v_water_id IS NOT NULL
 );
END;
$function$;

CREATE OR REPLACE FUNCTION public.care_correct_water_quantity(p_task_id uuid, p_new_amount_ml integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_task public.care_daily_checklist%rowtype;
 v_water public.care_hydration%rowtype;
 v_now timestamptz:=clock_timestamp();
 v_day_total bigint;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_new_amount_ml IS NULL OR p_new_amount_ml NOT BETWEEN 10 AND 1500 THEN
   RAISE EXCEPTION 'Quantidade deve estar entre 10 e 1500 ml';
 END IF;
 SELECT t.* INTO v_task FROM public.care_daily_checklist t
 WHERE t.id=p_task_id AND t.category='hidratacao' AND t.completed_at IS NOT NULL
  AND (t.owner_id=auth.uid() OR EXISTS(
    SELECT 1 FROM public.care_patient_access a
    WHERE a.patient_id=t.patient_id AND a.user_id=auth.uid()
  )) FOR UPDATE OF t;
 IF NOT FOUND THEN RAISE EXCEPTION 'Registro de hidratação confirmado não encontrado'; END IF;
 SELECT h.* INTO v_water FROM public.care_hydration h
 WHERE h.task_id=v_task.id AND h.patient_id=v_task.patient_id
   AND h.owner_id=v_task.owner_id FOR UPDATE OF h;
 IF NOT FOUND THEN RAISE EXCEPTION 'Volume original não localizado; nenhuma alteração efetuada'; END IF;

 IF v_water.amount_ml IS DISTINCT FROM p_new_amount_ml THEN
   UPDATE public.care_hydration
   SET amount_ml=p_new_amount_ml
   WHERE id=v_water.id AND task_id=v_task.id;

   INSERT INTO public.care_activity_log
    (owner_id,patient_id,task_id,category,event_type,scheduled_at,happened_at,
     recorded_at,actor_id,source,details)
   VALUES(v_task.owner_id,v_task.patient_id,v_task.id,'hidratacao','water_volume_corrected',
     v_task.scheduled_at,v_water.recorded_at,v_now,auth.uid(),'client_correction',
     jsonb_build_object('water_id',v_water.id,'previous_ml',v_water.amount_ml,
       'corrected_ml',p_new_amount_ml,'original_recorded_at',v_water.recorded_at,
       'original_confirmation_at',v_task.completed_at));
 END IF;

 SELECT coalesce(sum(h.amount_ml),0) INTO v_day_total
 FROM public.care_hydration h WHERE h.patient_id=v_task.patient_id
   AND (h.recorded_at AT TIME ZONE 'America/Rio_Branco')::date =
       (v_water.recorded_at AT TIME ZONE 'America/Rio_Branco')::date;

 RETURN jsonb_build_object(
  'task_id',v_task.id,'amount_ml',p_new_amount_ml,
  'previous_ml',v_water.amount_ml,'original_recorded_at',v_water.recorded_at,
  'original_confirmation_at',v_task.completed_at,'corrected_at',v_now,
  'daily_total_ml',v_day_total);
END;
$function$;

-- Somente clientes autenticados com vínculo válido podem chamar as funções.
REVOKE ALL ON FUNCTION public.care_get_task_record(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.care_correct_water_quantity(uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.care_get_task_record(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.care_correct_water_quantity(uuid,integer) TO authenticated;
