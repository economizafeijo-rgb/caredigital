-- Endereço completo no cadastro inicial: bairro, número e CEP (com verificação no servidor).
alter table public.care_patients
  add column if not exists neighborhood text,
  add column if not exists address_number text,
  add column if not exists postal_code text check (postal_code is null or postal_code ~ '^[0-9]{8}$');
drop function if exists public.care_save_onboarding(uuid,date,text,numeric,numeric,text,text,numeric,text[],text,text,text,text);
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
  p_address text default null,
  p_neighborhood text default null,
  p_address_number text default null,
  p_postal_code text default null
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
  if p_postal_code is not null and trim(p_postal_code) <> '' and regexp_replace(p_postal_code, '\D', '', 'g') !~ '^[0-9]{8}$' then raise exception 'CEP inválido'; end if;
  if p_phone is not null and trim(p_phone) <> '' and regexp_replace(p_phone, '\D', '', 'g') !~ '^[1-9][0-9](9[0-9]{8}|[2-5][0-9]{7})$' then raise exception 'Telefone inválido'; end if;
  v_age := extract(year from age(current_date, p_birth_date))::int;

  update care_patients set
    birth_date = p_birth_date, sex = p_sex, height_cm = p_height_cm, weight_kg = p_weight_kg,
    activity_level = p_activity_level, care_goal = p_objective,
    health_conditions = coalesce(p_health_conditions, '{}'),
    city = nullif(trim(p_city), ''), state = nullif(trim(p_state), ''), address = nullif(trim(p_address), ''),
    neighborhood = nullif(trim(p_neighborhood), ''), address_number = nullif(trim(p_address_number), ''),
    postal_code = nullif(regexp_replace(coalesce(p_postal_code, ''), '\D', '', 'g'), ''),
    phone = coalesce(nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), ''), phone),
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

  -- O peso informado entra também na evolução de peso do dia.
  insert into care_body_measurements (patient_id, owner_id, recorded_by, recorded_on, weight_kg, height_cm)
  values (p_patient_id, v_owner, v_uid, (now() at time zone 'America/Rio_Branco')::date, p_weight_kg, p_height_cm)
  on conflict (patient_id, recorded_on) do update set weight_kg = excluded.weight_kg, height_cm = excluded.height_cm;
end $$;

revoke all on function public.care_save_onboarding(uuid,date,text,numeric,numeric,text,text,numeric,text[],text,text,text,text,text,text,text) from public, anon;
grant execute on function public.care_save_onboarding(uuid,date,text,numeric,numeric,text,text,numeric,text[],text,text,text,text,text,text,text) to authenticated;
