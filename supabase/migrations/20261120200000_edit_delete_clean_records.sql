-- Editar e excluir registros do consumo sem deixar rastro duplicado:
-- 1) editar altera o registro no lugar (não aparece como "nova refeição / alteração" no histórico);
-- 2) excluir apaga de forma definitiva e desvincula o que estiver associado (agenda, porções, refeição montada na Alimentação);
-- 3) as linhas de auditoria antigas de edição/exclusão também saem.
CREATE OR REPLACE FUNCTION public.care_skip_intake_audit_rows()
 RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.event_type IN ('intake_edited','intake_deleted') AND NEW.source='client_intake_maintenance')
     OR (NEW.event_type IN ('food_portion_edited','food_portion_deleted','meal_deleted') AND NEW.source='client_nutrition_library') THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS care_skip_intake_audit_rows ON public.care_activity_log;
CREATE TRIGGER care_skip_intake_audit_rows BEFORE INSERT ON public.care_activity_log
  FOR EACH ROW EXECUTE FUNCTION public.care_skip_intake_audit_rows();

DELETE FROM public.care_activity_log WHERE (event_type IN ('intake_edited','intake_deleted') AND source='client_intake_maintenance')
   OR (event_type IN ('food_portion_edited','food_portion_deleted','meal_deleted') AND source='client_nutrition_library');

CREATE OR REPLACE FUNCTION public.care_delete_intake_entry(p_patient_id uuid, p_entry_type text, p_entry_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE
  v_uid uuid:=auth.uid(); v_owner uuid; v_now timestamptz:=clock_timestamp(); v_day date;
  v_water public.care_hydration%rowtype; v_beverage public.care_client_beverages%rowtype;
  v_meal public.care_activity_log%rowtype; v_task_id uuid; v_snapshot jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão expirada. Entre novamente.'; END IF;
  SELECT p.owner_id INTO v_owner FROM public.care_patients p
  WHERE p.id=p_patient_id AND (p.owner_id=v_uid OR EXISTS(SELECT 1 FROM public.care_patient_access a WHERE a.patient_id=p.id AND a.user_id=v_uid));
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Cadastro indisponível'; END IF;
  IF p_entry_id IS NULL OR p_entry_type NOT IN ('water','beverage','meal') THEN RAISE EXCEPTION 'Registro inválido'; END IF;

  IF p_entry_type='water' THEN
    SELECT * INTO v_water FROM public.care_hydration h WHERE h.id=p_entry_id AND h.patient_id=p_patient_id AND h.owner_id=v_owner FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Registro de água não encontrado (talvez já tenha sido excluído)'; END IF;
    IF v_water.task_id IS NOT NULL THEN
      UPDATE public.care_daily_checklist SET completed_at=NULL WHERE id=v_water.task_id AND patient_id=p_patient_id AND completed_at IS NOT NULL;
      DELETE FROM public.care_hydration_responses WHERE task_id=v_water.task_id AND patient_id=p_patient_id;
    END IF;
    v_snapshot:=jsonb_build_object('amount_ml',v_water.amount_ml,'recorded_at',v_water.recorded_at);
    DELETE FROM public.care_hydration WHERE id=v_water.id;
    DELETE FROM public.care_activity_log WHERE patient_id=p_patient_id AND details->>'entry_id'=p_entry_id::text;
  ELSIF p_entry_type='beverage' THEN
    SELECT * INTO v_beverage FROM public.care_client_beverages b WHERE b.id=p_entry_id AND b.patient_id=p_patient_id AND b.owner_id=v_owner FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Registro de bebida não encontrado (talvez já tenha sido excluído)'; END IF;
    v_snapshot:=jsonb_build_object('name',v_beverage.name,'amount_ml',v_beverage.amount_ml,'consumed_at',v_beverage.consumed_at);
    DELETE FROM public.care_client_beverages WHERE id=v_beverage.id;
    DELETE FROM public.care_activity_log WHERE patient_id=p_patient_id AND details->>'entry_id'=p_entry_id::text;
  ELSE
    SELECT * INTO v_meal FROM public.care_activity_log l
    WHERE l.id=p_entry_id AND l.patient_id=p_patient_id AND l.owner_id=v_owner AND l.category='refeicao' AND l.event_type='logged'
      AND l.source IN ('client_unscheduled_intake','client_nutrition_library')
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Refeição não encontrada (talvez já tenha sido excluída)'; END IF;
    v_day:=(v_meal.happened_at AT TIME ZONE 'America/Rio_Branco')::date;
    v_task_id:=nullif(v_meal.details->>'linked_task_id','')::uuid;
    v_snapshot:=jsonb_build_object('title',v_meal.details->>'title','description',v_meal.details->>'description','happened_at',v_meal.happened_at);
    IF v_task_id IS NOT NULL THEN
      PERFORM set_config('care.meal_reclassification','enabled',true);
      UPDATE public.care_daily_checklist SET completed_at=NULL WHERE id=v_task_id AND patient_id=p_patient_id AND completed_at=v_meal.happened_at;
      PERFORM set_config('care.meal_reclassification','disabled',true);
      DELETE FROM public.care_meal_details WHERE task_id=v_task_id AND patient_id=p_patient_id AND recorded_at=v_meal.happened_at;
    END IF;
    -- Porções da biblioteca ligadas ao mesmo registro também saem.
    IF v_meal.details ? 'request_id' THEN
      DELETE FROM public.care_food_consumptions WHERE patient_id=p_patient_id AND request_id::text=v_meal.details->>'request_id';
    END IF;
    -- A refeição montada na área de Alimentação com o mesmo pedido também sai (some de todas as áreas).
    IF v_meal.details ? 'request_id' THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='care_nutrition_meal_logs' AND column_name='request_id') THEN
        EXECUTE 'DELETE FROM public.care_nutrition_meal_logs WHERE patient_id=$1 AND request_id::text=$2' USING p_patient_id, v_meal.details->>'request_id';
      END IF;
    END IF;
    DELETE FROM public.care_activity_log WHERE id=v_meal.id;
    DELETE FROM public.care_activity_log WHERE patient_id=p_patient_id AND details->>'entry_id'=p_entry_id::text;
    IF v_day=(v_now AT TIME ZONE 'America/Rio_Branco')::date THEN
      PERFORM public.care_recalculate_after_consumption(p_patient_id,'refeicao',NULL);
    END IF;
  END IF;
  RETURN jsonb_build_object('success',true,'entry_type',p_entry_type,'entry_id',p_entry_id,'deleted_at',v_now,'time_zone','America/Rio_Branco');
END;
$function$;


REVOKE ALL ON FUNCTION public.care_delete_intake_entry(uuid,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.care_delete_intake_entry(uuid,text,uuid) TO authenticated;
