-- CareDigital: confirmação de refeições após o horário programado, no próprio dia (Acre).
-- Sincronizado com a função aplicada no Supabase em 2026-11-02.
-- Esta é uma referência versionada: não é executada automaticamente pelo Lovable.
-- IMPORTANTE: não altera as regras de medicamentos ou de hidratação.
CREATE OR REPLACE FUNCTION public.care_confirm_meal(p_task_id uuid, p_description text)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_task public.care_daily_checklist%rowtype;
  v_uid uuid := auth.uid();
  v_when timestamptz := clock_timestamp();
  v_description text := trim(coalesce(p_description, ''));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF length(v_description) NOT BETWEEN 3 AND 1000 THEN
    RAISE EXCEPTION 'Meal description must have 3 to 1000 characters';
  END IF;

  SELECT t.* INTO v_task
  FROM public.care_daily_checklist AS t
  WHERE t.id = p_task_id
    AND t.category = 'refeicao'
    AND (t.owner_id = v_uid OR EXISTS (
      SELECT 1 FROM public.care_patient_access AS a
      WHERE a.patient_id = t.patient_id AND a.user_id = v_uid
    ))
  FOR UPDATE OF t;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meal unavailable';
  END IF;
  IF v_task.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Task already completed';
  END IF;
  IF v_when < v_task.scheduled_at THEN
    RAISE EXCEPTION 'Care window not started';
  END IF;
  IF (v_task.scheduled_at AT TIME ZONE 'America/Rio_Branco')::date <>
     (v_when AT TIME ZONE 'America/Rio_Branco')::date THEN
    RAISE EXCEPTION 'Meal confirmation must occur on the scheduled Acre date';
  END IF;

  -- Registre o instante real da confirmação, não o horário informado do consumo.
  UPDATE public.care_daily_checklist
  SET completed_at = v_when
  WHERE id = v_task.id AND completed_at IS NULL;

  INSERT INTO public.care_meal_details
    (task_id, owner_id, patient_id, description, recorded_at)
  VALUES
    (v_task.id, v_task.owner_id, v_task.patient_id, v_description, v_when)
  ON CONFLICT (task_id) DO UPDATE
  SET description = EXCLUDED.description,
      recorded_at = EXCLUDED.recorded_at;

  INSERT INTO public.care_activity_log
    (owner_id, patient_id, task_id, category, event_type, scheduled_at,
     happened_at, recorded_at, actor_id, source, details)
  VALUES
    (v_task.owner_id, v_task.patient_id, v_task.id, 'refeicao', 'confirmed',
     v_task.scheduled_at, v_when, v_when, v_uid, 'client_dashboard',
     jsonb_build_object(
       'title', v_task.title,
       'late', v_when >= v_task.scheduled_at + interval '15 minutes',
       'delay_minutes', GREATEST(
         0, floor(extract(epoch FROM (v_when - v_task.scheduled_at)) / 60)::int
       ),
       'reported_description', v_description
     ));

  RETURN v_when;
END;
$function$;
