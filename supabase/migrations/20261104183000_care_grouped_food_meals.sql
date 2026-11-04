-- Atomic, auditable grouping of food portions into named meals.
create table if not exists public.care_food_meal_groups(
 id uuid primary key default gen_random_uuid(),
 patient_id uuid not null references public.care_patients(id) on delete cascade,
 owner_id uuid not null,
 name text not null check(length(name) between 1 and 100),
 request_id uuid not null,
 actor_id uuid not null,
 recorded_at timestamptz not null default clock_timestamp(),
 unique(patient_id,request_id)
);
alter table public.care_food_meal_groups enable row level security;
create policy care_food_meal_groups_read on public.care_food_meal_groups for select to authenticated
 using(exists(select 1 from public.care_patients p where p.id=patient_id and p.owner_id=care_food_meal_groups.owner_id
 and (p.owner_id=(select auth.uid()) or exists(select 1 from public.care_patient_access a where a.patient_id=p.id and a.owner_id=p.owner_id and a.user_id=(select auth.uid())))));
revoke all on public.care_food_meal_groups from anon,authenticated;
grant select on public.care_food_meal_groups to authenticated;
alter table public.care_food_consumptions add column if not exists meal_group_id uuid references public.care_food_meal_groups(id) on delete set null;
create index if not exists care_food_consumptions_group_idx on public.care_food_consumptions(meal_group_id);

create or replace function public.care_save_food_meal(p_patient_id uuid,p_name text,p_items jsonb,p_request_id uuid,p_replace_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid();v_owner uuid;v_group public.care_food_meal_groups%rowtype;v_item jsonb;v_food public.care_food_catalog%rowtype;v_grams numeric;v_count integer:=0;v_existing uuid;
begin
 if v_uid is null or p_request_id is null or p_patient_id is null then raise exception 'Sessão inválida';end if;
 if trim(coalesce(p_name,''))='' or length(p_name)>100 then raise exception 'Nome de refeição inválido';end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Informe de 1 a 30 alimentos';end if;
 select p.owner_id into v_owner from public.care_patients p where p.id=p_patient_id and
 (p.owner_id=v_uid or exists(select 1 from public.care_patient_access a where a.patient_id=p.id and a.owner_id=p.owner_id and a.user_id=v_uid));
 if not found then raise exception 'Acesso negado';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_patient_id::text||p_request_id::text,41));
 select id into v_existing from public.care_food_meal_groups where patient_id=p_patient_id and request_id=p_request_id;
 if v_existing is not null then return jsonb_build_object('id',v_existing,'already_recorded',true);end if;
 if p_replace_id is not null then
  select * into v_group from public.care_food_meal_groups where id=p_replace_id and patient_id=p_patient_id and owner_id=v_owner for update;
  if not found then raise exception 'Refeição não encontrada';end if;
  delete from public.care_food_consumptions where meal_group_id=p_replace_id;
  update public.care_food_meal_groups set name=trim(p_name),request_id=p_request_id,recorded_at=clock_timestamp(),actor_id=v_uid where id=p_replace_id returning * into v_group;
 else
  insert into public.care_food_meal_groups(patient_id,owner_id,name,request_id,actor_id)
  values(p_patient_id,v_owner,trim(p_name),p_request_id,v_uid) returning * into v_group;
 end if;
 for v_item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(v_item) is distinct from 'object' then raise exception 'Alimento inválido';end if;
  select * into v_food from public.care_food_catalog where id=v_item->>'id';
  if not found or v_food.protein_g is null or v_food.carbs_g is null or v_food.fat_g is null or v_food.kcal is null then raise exception 'Alimento sem valores nutricionais';end if;
  v_grams:=(v_item->>'grams')::numeric;
  if v_grams is null or v_grams<1 or v_grams>2000 then raise exception 'Porção inválida';end if;
  insert into public.care_food_consumptions(patient_id,owner_id,food_id,grams,kcal,protein_g,carbs_g,fat_g,fiber_g,request_id,actor_id,recorded_at,meal_group_id)
  values(p_patient_id,v_owner,v_food.id,v_grams,round(v_food.kcal*v_grams/100,2),round(v_food.protein_g*v_grams/100,2),round(v_food.carbs_g*v_grams/100,2),round(v_food.fat_g*v_grams/100,2),round(coalesce(v_food.fiber_g,0)*v_grams/100,2),gen_random_uuid(),v_uid,v_group.recorded_at,v_group.id);
  v_count:=v_count+1;
 end loop;
 insert into public.care_activity_log(owner_id,patient_id,task_id,category,event_type,scheduled_at,happened_at,recorded_at,actor_id,source,details)
 values(v_owner,p_patient_id,null,'refeicao',case when p_replace_id is null then 'logged' else 'meal_updated' end,null,v_group.recorded_at,clock_timestamp(),v_uid,'client_nutrition_library',jsonb_build_object('meal_group_id',v_group.id,'meal_name',v_group.name,'food_count',v_count));
 return jsonb_build_object('id',v_group.id,'food_count',v_count,'already_recorded',false);
end $$;
revoke all on function public.care_save_food_meal(uuid,text,jsonb,uuid,uuid) from public,anon;
grant execute on function public.care_save_food_meal(uuid,text,jsonb,uuid,uuid) to authenticated;

create or replace function public.care_delete_food_meal(p_group_id uuid,p_verified boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid();v_group public.care_food_meal_groups%rowtype;
begin
 if v_uid is null or p_verified is distinct from true then raise exception 'Confirmação necessária';end if;
 select g.* into v_group from public.care_food_meal_groups g join public.care_patients p on p.id=g.patient_id and p.owner_id=g.owner_id
 where g.id=p_group_id and (p.owner_id=v_uid or exists(select 1 from public.care_patient_access a where a.patient_id=p.id and a.owner_id=p.owner_id and a.user_id=v_uid)) for update of g;
 if not found then raise exception 'Refeição não encontrada';end if;
 delete from public.care_food_consumptions where meal_group_id=p_group_id;
 delete from public.care_food_meal_groups where id=p_group_id;
 insert into public.care_activity_log(owner_id,patient_id,task_id,category,event_type,scheduled_at,happened_at,recorded_at,actor_id,source,details)
 values(v_group.owner_id,v_group.patient_id,null,'refeicao','meal_deleted',null,null,clock_timestamp(),v_uid,'client_nutrition_library',jsonb_build_object('meal_group_id',p_group_id,'meal_name',v_group.name));
 return jsonb_build_object('deleted_id',p_group_id);
end $$;
revoke all on function public.care_delete_food_meal(uuid,boolean) from public,anon;
grant execute on function public.care_delete_food_meal(uuid,boolean) to authenticated;