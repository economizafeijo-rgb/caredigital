-- Horários de medicamentos, confirmação/exclusão auditável de refeições e registro de bebidas.
-- Os carimbos de data/hora são gerados no servidor; não são recebidos do navegador.
create table if not exists public.care_client_beverages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid not null,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  kind text not null check (kind in ('cha','agua','suco','cafe','outra')),
  name text not null check (char_length(btrim(name)) between 2 and 100),
  amount_ml integer not null check (amount_ml between 10 and 1500),
  notes text not null default '' check (char_length(notes) <= 300),
  consumed_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default clock_timestamp(),
  foreign key (patient_id, owner_id) references public.care_patients(id, owner_id) on delete cascade
);
create index if not exists care_client_beverages_patient_time_idx
  on public.care_client_beverages(patient_id, consumed_at desc);
alter table public.care_client_beverages enable row level security;
drop policy if exists care_client_beverages_authorized_read on public.care_client_beverages;
create policy care_client_beverages_authorized_read on public.care_client_beverages
  for select to authenticated using (
    owner_id = (select auth.uid()) or exists (
      select 1 from public.care_patient_access a
      where a.patient_id = care_client_beverages.patient_id
        and a.user_id = (select auth.uid())
    )
  );
revoke all on public.care_client_beverages from anon, authenticated;
grant select on public.care_client_beverages to authenticated;

-- Função padrão: o horário de medicação nunca pode ser antecipado.
-- Refeições antecipadas somente pelo fluxo adicional com verificação explícita.
create or replace function public.care_confirm_task(p_task_id uuid, p_water_ml integer default null)
returns timestamptz
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_task public.care_daily_checklist%rowtype;
  v_completed timestamptz;
  v_uid uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select t.* into v_task from public.care_daily_checklist t
  where t.id = p_task_id and (
    t.owner_id = v_uid or exists (
      select 1 from public.care_patient_access a
      where a.patient_id = t.patient_id and a.user_id = v_uid
    )
  ) for update of t;
  if not found then raise exception 'Task unavailable'; end if;
  if v_task.completed_at is not null then raise exception 'Task already completed'; end if;
  if v_task.category = 'medicacao' then
    if (v_task.scheduled_at at time zone 'America/Rio_Branco')::date
      <> (v_now at time zone 'America/Rio_Branco')::date then
      raise exception 'Medication confirmation is available only on its scheduled date';
    end if;
    if v_now < v_task.scheduled_at then
      raise exception 'Medication scheduled time not reached';
    end if;
  end if;
  if v_task.category = 'refeicao' and v_now < v_task.scheduled_at then
    raise exception 'Meal early confirmation requires verification';
  end if;
  if v_task.category = 'hidratacao' then
    if p_water_ml is null or p_water_ml < 10 or p_water_ml > 1500 then
      raise exception 'Water volume invalid';
    end if;
    insert into public.care_hydration(owner_id,patient_id,amount_ml,recorded_at)
      values(v_task.owner_id,v_task.patient_id,p_water_ml,v_now);
  elsif p_water_ml is not null then
    raise exception 'Water volume only for hydration';
  end if;
  update public.care_daily_checklist
  set completed_at = v_now where id = v_task.id returning completed_at into v_completed;
  if v_completed is null then raise exception 'Unable to complete'; end if;
  if v_task.category = 'refeicao' then
    insert into public.care_activity_log
      (owner_id, patient_id, task_id, category, event_type, scheduled_at,
       happened_at, recorded_at, actor_id, source, details)
    values (v_task.owner_id, v_task.patient_id, v_task.id, 'refeicao', 'confirmed',
      v_task.scheduled_at, v_completed, v_completed, v_uid, 'client_dashboard',
      jsonb_build_object('title',v_task.title,'early',false));
  end if;
  return v_completed;
end;
$$;
revoke all on function public.care_confirm_task(uuid,integer) from public, anon;
grant execute on function public.care_confirm_task(uuid,integer) to authenticated;

create or replace function public.care_confirm_meal_early(p_task_id uuid, p_verified boolean)
returns timestamptz
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_task public.care_daily_checklist%rowtype;
  v_uid uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_verified is distinct from true then raise exception 'Meal confirmation verification required'; end if;
  select t.* into v_task from public.care_daily_checklist t
  where t.id = p_task_id and (t.owner_id = v_uid or exists (
    select 1 from public.care_patient_access a
    where a.patient_id=t.patient_id and a.user_id=v_uid
  )) for update of t;
  if not found then raise exception 'Task unavailable'; end if;
  if v_task.category <> 'refeicao' then raise exception 'Only meals may use early verification'; end if;
  if v_task.completed_at is not null then raise exception 'Task already completed'; end if;
  -- Registra o horário verdadeiro mesmo quando a refeição é anterior ao agendado.
  update public.care_daily_checklist set completed_at = v_now where id=v_task.id;
  insert into public.care_activity_log
    (owner_id,patient_id,task_id,category,event_type,scheduled_at,
     happened_at,recorded_at,actor_id,source,details)
  values (v_task.owner_id,v_task.patient_id,v_task.id,'refeicao','confirmed',
    v_task.scheduled_at,v_now,v_now,v_uid,'client_dashboard',
    jsonb_build_object('title',v_task.title,'early',v_now<v_task.scheduled_at,
     'verified',true));
  return v_now;
end;
$$;
revoke all on function public.care_confirm_meal_early(uuid,boolean) from public, anon;
grant execute on function public.care_confirm_meal_early(uuid,boolean) to authenticated;

create or replace function public.care_delete_meal(p_task_id uuid, p_verified boolean)
returns timestamptz
language plpgsql security definer set search_path=public, pg_temp
as $$
declare
  v_task public.care_daily_checklist%rowtype;
  v_uid uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_verified is distinct from true then raise exception 'Meal deletion verification required'; end if;
  select t.* into v_task from public.care_daily_checklist t
  where t.id=p_task_id and (t.owner_id=v_uid or exists (
    select 1 from public.care_patient_access a
    where a.patient_id=t.patient_id and a.user_id=v_uid
  )) for update of t;
  if not found then raise exception 'Task unavailable'; end if;
  if v_task.category <> 'refeicao' then raise exception 'Only meals may be deleted'; end if;
  insert into public.care_activity_log
    (owner_id,patient_id,task_id,category,event_type,scheduled_at,
     happened_at,recorded_at,actor_id,source,details)
  values (v_task.owner_id,v_task.patient_id,v_task.id,'refeicao','deleted',
    v_task.scheduled_at,v_now,v_now,v_uid,'client_dashboard',
    jsonb_build_object('title',v_task.title,'previous_completed_at',v_task.completed_at,
      'verified',true));
  delete from public.care_daily_checklist where id=v_task.id;
  return v_now;
end;
$$;
revoke all on function public.care_delete_meal(uuid,boolean) from public, anon;
grant execute on function public.care_delete_meal(uuid,boolean) to authenticated;

create or replace function public.care_log_client_beverage(
 p_patient_id uuid, p_kind text, p_name text, p_amount_ml integer, p_notes text default ''
) returns timestamptz
language plpgsql security definer set search_path=public, pg_temp
as $$
declare
  v_owner uuid;
  v_uid uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select p.owner_id into v_owner from public.care_patients p
  where p.id = p_patient_id and (
    p.owner_id = v_uid or exists (
      select 1 from public.care_patient_access a
      where a.patient_id=p.id and a.user_id=v_uid
    )
  );
  if not found then raise exception 'Patient unavailable'; end if;
  if p_kind is null or p_kind not in ('cha','agua','suco','cafe','outra')
    or p_name is null or char_length(btrim(p_name)) not between 2 and 100
    or p_amount_ml is null or p_amount_ml not between 10 and 1500
    or char_length(coalesce(p_notes,'')) > 300 then
    raise exception 'Beverage fields invalid';
  end if;
  insert into public.care_client_beverages
    (owner_id, patient_id, recorded_by, kind, name, amount_ml, notes, consumed_at, created_at)
  values (v_owner, p_patient_id, v_uid, p_kind, btrim(p_name), p_amount_ml,
    coalesce(p_notes,''), v_now, v_now);
  return v_now;
end;
$$;
revoke all on function public.care_log_client_beverage(uuid,text,text,integer,text) from public, anon;
grant execute on function public.care_log_client_beverage(uuid,text,text,integer,text) to authenticated;
