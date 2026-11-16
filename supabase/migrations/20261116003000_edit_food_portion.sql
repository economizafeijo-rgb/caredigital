-- Allow a patient to correct the grams of a food portion while preserving an audit trail.
CREATE OR REPLACE FUNCTION public.care_update_food_portion(p_entry_id uuid, p_grams numeric, p_verified boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid:=auth.uid();
  v_entry public.care_food_consumptions%rowtype;
  v_food public.care_food_catalog%rowtype;
  v_now timestamptz:=clock_timestamp();
BEGIN
  IF v_uid IS NULL OR p_verified IS DISTINCT FROM true THEN RAISE EXCEPTION 'Confirmação necessária'; END IF;
  IF p_grams IS NULL OR p_grams < 1 OR p_grams > 2000 THEN RAISE EXCEPTION 'Porção deve estar entre 1 e 2.000 g'; END IF;
  SELECT f.* INTO v_entry FROM public.care_food_consumptions f
  JOIN public.care_patients p ON p.id=f.patient_id AND p.owner_id=f.owner_id
  WHERE f.id=p_entry_id AND (p.owner_id=v_uid OR EXISTS(
    SELECT 1 FROM public.care_patient_access a WHERE a.patient_id=p.id AND a.owner_id=p.owner_id AND a.user_id=v_uid
  )) FOR UPDATE OF f;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consumo não encontrado'; END IF;
  SELECT * INTO v_food FROM public.care_food_catalog WHERE id=v_entry.food_id;
  IF NOT FOUND OR v_food.kcal IS NULL OR v_food.protein_g IS NULL OR v_food.carbs_g IS NULL OR v_food.fat_g IS NULL THEN RAISE EXCEPTION 'Alimento sem dados completos'; END IF;
  UPDATE public.care_food_consumptions SET grams=p_grams,
    kcal=round(v_food.kcal*p_grams/100,2), protein_g=round(v_food.protein_g*p_grams/100,2),
    carbs_g=round(v_food.carbs_g*p_grams/100,2), fat_g=round(v_food.fat_g*p_grams/100,2),
    fiber_g=round(coalesce(v_food.fiber_g,0)*p_grams/100,2)
  WHERE id=v_entry.id;
  INSERT INTO public.care_activity_log(owner_id,patient_id,category,event_type,recorded_at,actor_id,source,details)
  VALUES(v_entry.owner_id,v_entry.patient_id,'refeicao','food_portion_edited',v_now,v_uid,'client_nutrition_library',
    jsonb_build_object('entry_id',v_entry.id,'food_id',v_entry.food_id,'previous_grams',v_entry.grams,'grams',p_grams));
  RETURN jsonb_build_object('updated_id',v_entry.id,'grams',p_grams);
END;
$function$;
REVOKE ALL ON FUNCTION public.care_update_food_portion(uuid,numeric,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.care_update_food_portion(uuid,numeric,boolean) TO authenticated;
NOTIFY pgrst, 'reload schema';
