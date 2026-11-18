-- Alimentos personalizados: criados pelo próprio cliente e visíveis só no prontuário dele.
alter table public.care_food_catalog
  add column if not exists owner_patient_id uuid references public.care_patients(id) on delete cascade;
create index if not exists care_food_catalog_owner_patient_idx on public.care_food_catalog(owner_patient_id) where owner_patient_id is not null;

drop policy if exists care_food_catalog_read on public.care_food_catalog;
create policy care_food_catalog_read on public.care_food_catalog for select to authenticated using (
  owner_patient_id is null or exists (
    select 1 from public.care_patients p where p.id = care_food_catalog.owner_patient_id and (
      p.owner_id = (select auth.uid()) or exists (select 1 from public.care_patient_access a where a.patient_id = p.id and a.user_id = (select auth.uid())))));

create or replace function public.care_create_custom_food(
  p_patient_id uuid, p_name text, p_group text, p_kcal numeric, p_protein numeric, p_carbs numeric, p_fat numeric, p_fiber numeric default 0
) returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id text;
begin
  if v_uid is null or not exists (select 1 from care_patients p where p.id = p_patient_id and (p.owner_id = v_uid
     or exists (select 1 from care_patient_access a where a.patient_id = p.id and a.user_id = v_uid))) then
    raise exception 'Sem permissão para este cadastro';
  end if;
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 80 then raise exception 'Informe um nome entre 2 e 80 caracteres'; end if;
  if p_group not in ('frutas','cereais','proteinas','legumes','bebidas') then raise exception 'Grupo inválido'; end if;
  if p_kcal is null or p_kcal < 0 or p_kcal > 900 then raise exception 'Calorias por 100 g devem ficar entre 0 e 900'; end if;
  if p_protein is null or p_carbs is null or p_fat is null or p_protein < 0 or p_carbs < 0 or p_fat < 0 or coalesce(p_fiber,0) < 0
     or p_protein + p_carbs + p_fat + coalesce(p_fiber,0) > 100 then
    raise exception 'Macronutrientes por 100 g inválidos (a soma não pode passar de 100 g)';
  end if;
  if (select count(*) from care_food_catalog where owner_patient_id = p_patient_id) >= 200 then raise exception 'Limite de 200 alimentos personalizados'; end if;
  v_id := 'u_' || replace(gen_random_uuid()::text, '-', '');
  insert into care_food_catalog (id, name, food_group, kcal, protein_g, carbs_g, fat_g, fiber_g, provenance, note, flags, owner_patient_id)
  values (v_id, trim(p_name), p_group, p_kcal, p_protein, p_carbs, p_fat, coalesce(p_fiber,0), 'Informado pelo usuário (rótulo ou receita própria)', '', '{}', p_patient_id);
  return v_id;
end $$;

create or replace function public.care_delete_custom_food(p_food_id text) returns void language plpgsql security definer set search_path = public as $$
declare v_patient uuid; v_uid uuid := auth.uid();
begin
  select owner_patient_id into v_patient from care_food_catalog where id = p_food_id;
  if v_patient is null then raise exception 'Alimento personalizado não encontrado'; end if;
  if not exists (select 1 from care_patients p where p.id = v_patient and (p.owner_id = v_uid
     or exists (select 1 from care_patient_access a where a.patient_id = p.id and a.user_id = v_uid))) then
    raise exception 'Sem permissão';
  end if;
  if exists (select 1 from care_food_consumptions where food_id = p_food_id) then
    -- Já usado em registros: só arquiva, para não apagar o histórico.
    update care_food_catalog set flags = array_append(flags, 'arquivado') where id = p_food_id and not ('arquivado' = any(flags));
  else
    delete from care_food_catalog where id = p_food_id;
  end if;
end $$;

-- Impede registrar alimento personalizado de outro prontuário.
create or replace function public.care_log_food_portion(p_patient_id uuid, p_food_id text, p_grams numeric, p_request_id uuid)
 returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp' as $function$
declare
 v_uid uuid:=auth.uid();v_owner uuid;v_food public.care_food_catalog%rowtype;
 v_entry public.care_food_consumptions%rowtype;v_now timestamptz:=clock_timestamp();
begin
 if v_uid is null or p_patient_id is null or p_request_id is null then
  raise exception 'Sessão, paciente ou identificador inválido';
 end if;
 if p_grams is null or p_grams<1 or p_grams>2000 then
  raise exception 'Porção deve estar entre 1 e 2.000 g';
 end if;
 select p.owner_id into v_owner from public.care_patients p where p.id=p_patient_id
 and (p.owner_id=v_uid or exists(
  select 1 from public.care_patient_access a
  where a.patient_id=p.id and a.owner_id=p.owner_id and a.user_id=v_uid));
 if not found then raise exception 'Prontuário indisponível';end if;
 select * into v_food from public.care_food_catalog where id=p_food_id;
 if not found or v_food.protein_g is null or v_food.carbs_g is null
   or v_food.fat_g is null or v_food.kcal is null then
    raise exception 'Alimento sem dados completos: consulte o rótulo';
 end if;
 if v_food.owner_patient_id is not null and v_food.owner_patient_id<>p_patient_id then
    raise exception 'Alimento personalizado de outro prontuário';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,37));
 select * into v_entry from public.care_food_consumptions
 where patient_id=p_patient_id and request_id=p_request_id;
 if found then
  return jsonb_build_object('id',v_entry.id,'recorded_at',v_entry.recorded_at,
     'already_recorded',true);
 end if;
 insert into public.care_food_consumptions
 (patient_id,owner_id,food_id,grams,kcal,protein_g,carbs_g,fat_g,fiber_g,request_id,actor_id,recorded_at)
 values(p_patient_id,v_owner,v_food.id,p_grams,
 round(v_food.kcal*p_grams/100,2),round(v_food.protein_g*p_grams/100,2),
 round(v_food.carbs_g*p_grams/100,2),round(v_food.fat_g*p_grams/100,2),
 round(coalesce(v_food.fiber_g,0)*p_grams/100,2),p_request_id,v_uid,v_now)
 returning * into v_entry;
 insert into public.care_activity_log
 (owner_id,patient_id,task_id,category,event_type,scheduled_at,happened_at,recorded_at,actor_id,source,details)
 values(v_owner,p_patient_id,null,'refeicao','logged',null,v_now,v_now,v_uid,'client_nutrition_library',
 jsonb_build_object('title','Consumo alimentar registrado','food_id',v_food.id,
   'food_name',v_food.name,'grams',v_entry.grams,
   'kcal',v_entry.kcal,'protein_g',v_entry.protein_g,
   'carbs_g',v_entry.carbs_g,'fat_g',v_entry.fat_g,
   'request_id',p_request_id::text,'time_source','server','unscheduled',true));
 return jsonb_build_object('id',v_entry.id,'recorded_at',v_entry.recorded_at,
   'grams',v_entry.grams,'protein_g',v_entry.protein_g,'carbs_g',v_entry.carbs_g,
   'fat_g',v_entry.fat_g,'kcal',v_entry.kcal,'already_recorded',false);
end $function$;

revoke all on function public.care_create_custom_food(uuid,text,text,numeric,numeric,numeric,numeric,numeric) from public, anon;
grant execute on function public.care_create_custom_food(uuid,text,text,numeric,numeric,numeric,numeric,numeric) to authenticated;
revoke all on function public.care_delete_custom_food(text) from public, anon;
grant execute on function public.care_delete_custom_food(text) to authenticated;
