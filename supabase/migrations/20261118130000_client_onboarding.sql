-- Cadastro inicial do cliente: dados essenciais que montam o acompanhamento.
alter table public.care_patients
  add column if not exists sex text check (sex in ('feminino','masculino')),
  add column if not exists activity_level text check (activity_level in ('sedentario','leve','moderado','ativo','muito_ativo')),
  add column if not exists health_conditions text[] not null default '{}',
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists address text,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_snoozed_until timestamptz;

-- Minutos diários estimados por nível de atividade (usados nas metas de hidratação e energia).
create or replace function public.care_activity_minutes(p_level text)
returns integer language sql immutable as $$
  select case p_level when 'sedentario' then 10 when 'leve' then 30 when 'moderado' then 50 when 'ativo' then 75 when 'muito_ativo' then 110 else 20 end
$$;

create or replace function public.care_save_onboarding(
  p_patient_id uuid,
  p_birth_date date,
  p_sex text,
  p_height_cm numeric,
  p_weight_kg numeric,
  p_activity_level text,
  p_objective text,
  p_target_weight_kg numeric default null,
  p_health_conditions text[] default '{}',
  p_phone text default null,
  p_city text default null,
  p_state text default null,
  p_address text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_uid uuid := auth.uid();
  v_age int;
begin
  select owner_id into v_owner from care_patients where id = p_patient_id;
  if v_owner is null then raise exception 'Cadastro não encontrado'; end if;
  if v_uid is null or not (v_owner = v_uid or exists (select 1 from care_patient_access a where a.patient_id = p_patient_id and a.user_id = v_uid)) then
    raise exception 'Sem permissão para este cadastro';
  end if;
  if p_birth_date is null or p_birth_date > current_date - interval '18 years' or p_birth_date < current_date - interval '110 years' then
    raise exception 'Informe uma data de nascimento válida (18 anos ou mais)';
  end if;
  if p_sex not in ('feminino','masculino') then raise exception 'Informe o sexo biológico'; end if;
  if p_height_cm is null or p_height_cm < 100 or p_height_cm > 230 then raise exception 'Altura deve ficar entre 100 e 230 cm'; end if;
  if p_weight_kg is null or p_weight_kg < 30 or p_weight_kg > 250 then raise exception 'Peso deve ficar entre 30 e 250 kg'; end if;
  if p_target_weight_kg is not null and (p_target_weight_kg < 30 or p_target_weight_kg > 250) then raise exception 'Peso desejado deve ficar entre 30 e 250 kg'; end if;
  if p_activity_level not in ('sedentario','leve','moderado','ativo','muito_ativo') then raise exception 'Escolha o nível de atividade'; end if;
  if p_objective not in ('equilibrio','emagrecimento','ganho_peso','hipertrofia') then raise exception 'Escolha um objetivo'; end if;
  v_age := extract(year from age(current_date, p_birth_date))::int;

  update care_patients set
    birth_date = p_birth_date, sex = p_sex, height_cm = p_height_cm, weight_kg = p_weight_kg,
    activity_level = p_activity_level, care_goal = p_objective,
    health_conditions = coalesce(p_health_conditions, '{}'),
    phone = coalesce(nullif(trim(p_phone), ''), phone),
    city = nullif(trim(p_city), ''), state = nullif(trim(p_state), ''), address = nullif(trim(p_address), ''),
    onboarding_completed_at = now(), onboarding_snoozed_until = null
  where id = p_patient_id;

  insert into care_nutrition_preferences (patient_id, owner_id, objective, weight_kg, target_weight_kg, updated_by, updated_at, avoided_ingredients, gastritis_sensitive)
  values (p_patient_id, v_owner, p_objective, p_weight_kg, p_target_weight_kg, v_uid, now(), '{}', 'gastrite' = any(coalesce(p_health_conditions, '{}')))
  on conflict (patient_id) do update set objective = excluded.objective, weight_kg = excluded.weight_kg,
    target_weight_kg = coalesce(excluded.target_weight_kg, care_nutrition_preferences.target_weight_kg),
    gastritis_sensitive = care_nutrition_preferences.gastritis_sensitive or excluded.gastritis_sensitive,
    updated_by = v_uid, updated_at = now();

  insert into care_hydration_profiles (patient_id, owner_id, sex, age, weight_kg, activity_minutes, updated_at)
  values (p_patient_id, v_owner, case p_sex when 'feminino' then 'female' else 'male' end, v_age, p_weight_kg, care_activity_minutes(p_activity_level), now())
  on conflict (patient_id) do update set sex = excluded.sex, age = excluded.age, weight_kg = excluded.weight_kg,
    activity_minutes = excluded.activity_minutes, updated_at = now();
end $$;

create or replace function public.care_snooze_onboarding(p_patient_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from care_patients p where p.id = p_patient_id and (p.owner_id = auth.uid()
    or exists (select 1 from care_patient_access a where a.patient_id = p.id and a.user_id = auth.uid()))) then
    raise exception 'Sem permissão para este cadastro';
  end if;
  update care_patients set onboarding_snoozed_until = now() + interval '1 day' where id = p_patient_id;
end $$;

revoke all on function public.care_save_onboarding(uuid,date,text,numeric,numeric,text,text,numeric,text[],text,text,text,text) from public, anon;
grant execute on function public.care_save_onboarding(uuid,date,text,numeric,numeric,text,text,numeric,text[],text,text,text,text) to authenticated;
revoke all on function public.care_snooze_onboarding(uuid) from public, anon;
grant execute on function public.care_snooze_onboarding(uuid) to authenticated;
