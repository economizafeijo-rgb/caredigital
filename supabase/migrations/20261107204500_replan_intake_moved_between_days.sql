-- Replan after moving an intake from or into the current Acre day.
CREATE OR REPLACE FUNCTION public.care_auto_replan_on_beverage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_today date := (clock_timestamp() AT TIME ZONE 'America/Rio_Branco')::date;
  v_old_day date;
  v_new_day date;
  v_patient uuid;
  v_amount integer;
BEGIN
  IF TG_OP='DELETE' THEN
    v_old_day:=(OLD.consumed_at AT TIME ZONE 'America/Rio_Branco')::date;
    v_patient:=OLD.patient_id; v_amount:=OLD.amount_ml;
  ELSIF TG_OP='UPDATE' THEN
    v_old_day:=(OLD.consumed_at AT TIME ZONE 'America/Rio_Branco')::date;
    v_new_day:=(NEW.consumed_at AT TIME ZONE 'America/Rio_Branco')::date;
    v_patient:=NEW.patient_id; v_amount:=NEW.amount_ml;
  ELSE
    v_new_day:=(NEW.consumed_at AT TIME ZONE 'America/Rio_Branco')::date;
    v_patient:=NEW.patient_id; v_amount:=NEW.amount_ml;
  END IF;
  IF (TG_OP='DELETE' AND v_old_day=v_today)
     OR (TG_OP='UPDATE' AND (v_old_day=v_today OR v_new_day=v_today))
     OR (TG_OP='INSERT' AND v_new_day=v_today) THEN
    PERFORM public.care_replan_overdue_hydration(v_patient,'bebida',v_amount);
    PERFORM public.care_recalculate_after_consumption(v_patient,'bebida',v_amount);
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

DO $patch$
DECLARE
  v_definition text;
BEGIN
  v_definition:=pg_get_functiondef('public.care_update_intake_entry(uuid,text,uuid,text,integer,timestamptz)'::regprocedure);
  v_definition:=replace(v_definition,'  v_task_id uuid;','  v_task_id uuid; v_old_day date;');
  v_definition:=replace(v_definition,
    '    v_task_id:=nullif(v_meal.details->>''linked_task_id'','''')::uuid;',
    '    v_old_day:=(v_meal.happened_at AT TIME ZONE ''America/Rio_Branco'')::date; v_task_id:=nullif(v_meal.details->>''linked_task_id'','''')::uuid;');
  v_definition:=replace(v_definition,
    '      PERFORM set_config(''care.meal_reclassification'',''enabled'',true);',
    '      IF v_when < v_now-interval ''7 days'' THEN RAISE EXCEPTION ''Linked meal can only be adjusted within 7 days''; END IF; PERFORM set_config(''care.meal_reclassification'',''enabled'',true);');
  v_definition:=replace(v_definition,
    '    IF (v_when AT TIME ZONE ''America/Rio_Branco'')::date=',
    '    IF v_old_day=(v_now AT TIME ZONE ''America/Rio_Branco'')::date OR (v_when AT TIME ZONE ''America/Rio_Branco'')::date=');
  IF position('v_old_day date' in v_definition)=0
     OR position('Linked meal can only be adjusted within 7 days' in v_definition)=0
     OR position('v_old_day=(v_now AT TIME ZONE' in v_definition)=0 THEN
    RAISE EXCEPTION 'Could not safely patch care_update_intake_entry';
  END IF;
  EXECUTE v_definition;
END;
$patch$;
NOTIFY pgrst, 'reload schema';
