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
      -- Use the normal water recalculation path so both remaining volume and
      -- future suggested portions are refreshed after a deletion.
      PERFORM public.care_recalculate_after_consumption(OLD.patient_id,'agua',NULL);
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
      PERFORM public.care_recalculate_after_consumption(NEW.patient_id,'agua',NEW.amount_ml);
    ELSE
      PERFORM public.care_recompute_hydration_day(NEW.patient_id,v_new_day);
      IF v_old_day=v_today THEN
        PERFORM public.care_replan_overdue_hydration(OLD.patient_id,'correcao_agua',NULL);
        PERFORM public.care_recalculate_after_consumption(OLD.patient_id,'agua',NULL);
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
NOTIFY pgrst, 'reload schema';
