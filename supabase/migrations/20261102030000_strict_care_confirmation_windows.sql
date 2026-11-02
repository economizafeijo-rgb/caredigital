-- A confirmação de cuidados programados é restrita à janela [horário, horário + 15 minutos).
-- Após a janela, o cuidado não concluído permanece sem completed_at (Não confirmado).
-- O relógio de referência é sempre o servidor, não o do navegador.
create or replace function public.care_confirm_task(p_task_id uuid, p_water_ml integer default null)
returns timestamptz
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_task public.care_daily_checklist%rowtype;
  v_uid uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_completed timestamptz;
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
  if v_task.category not in ('medicacao','refeicao','hidratacao') then
    raise exception 'Unsupported task category';
  end if;
  if v_task.completed_at is not null then raise exception 'Task already completed'; end if;
  if v_now < v_task.scheduled_at then raise exception 'Care window not started'; end if;
  if v_now >= v_task.scheduled_at + interval '15 minutes' then
    raise exception 'Care window expired';
  end if;
  if v_task.category = 'hidratacao' then
    if p_water_ml is null or p_water_ml not between 10 and 1500 then
      raise exception 'Water volume invalid';
    end if;
    if exists (select 1 from public.care_hydration_responses
      where task_id = v_task.id and response = 'not_drunk') then
      raise exception 'Water was already marked as not drunk';
    end if;
    insert into public.care_hydration(owner_id,patient_id,amount_ml,recorded_at)
      values(v_task.owner_id,v_task.patient_id,p_water_ml,v_now);
  elsif p_water_ml is not null then
    raise exception 'Water volume only for hydration';
  end if;
  update public.care_daily_checklist set completed_at = v_now
    where id = v_task.id returning completed_at into v_completed;
  if v_task.category = 'refeicao' then
    insert into public.care_activity_log
      (owner_id,patient_id,task_id,category,event_type,scheduled_at,
       happened_at,recorded_at,actor_id,source,details)
    values(v_task.owner_id,v_task.patient_id,v_task.id,'refeicao','confirmed',
      v_task.scheduled_at,v_completed,v_completed,v_uid,'client_dashboard',
      jsonb_build_object('title',v_task.title,'early',false));
  end if;
  return v_completed;
end;
$$;
revoke all on function public.care_confirm_task(uuid,integer) from public, anon;
grant execute on function public.care_confirm_task(uuid,integer) to authenticated;

-- A função antiga de antecipação não pode mais contornar o horário.
create or replace function public.care_confirm_meal_early(p_task_id uuid, p_verified boolean)
returns timestamptz
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  raise exception 'Early meal confirmation disabled: scheduled care window required';
end;
$$;
revoke all on function public.care_confirm_meal_early(uuid,boolean) from public, anon, authenticated;

create or replace function public.care_mark_water_not_drunk(p_task_id uuid)
returns timestamptz
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_task public.care_daily_checklist%rowtype;
  v_uid uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_recorded timestamptz;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select t.* into v_task from public.care_daily_checklist t
    where t.id = p_task_id and t.category = 'hidratacao'
    and (t.owner_id = v_uid or exists (
      select 1 from public.care_patient_access a
        where a.patient_id = t.patient_id and a.user_id = v_uid
    )) for update of t;
  if not found then raise exception 'Hydration task unavailable'; end if;
  if v_task.completed_at is not null then raise exception 'Already confirmed as drunk'; end if;
  if v_now < v_task.scheduled_at then raise exception 'Care window not started'; end if;
  if v_now >= v_task.scheduled_at + interval '15 minutes' then
    raise exception 'Care window expired';
  end if;
  insert into public.care_hydration_responses(task_id,patient_id,owner_id,response,recorded_at)
    values(v_task.id,v_task.patient_id,v_task.owner_id,'not_drunk',v_now)
    on conflict (task_id) do nothing returning recorded_at into v_recorded;
  if v_recorded is null then raise exception 'Water response already recorded'; end if;
  return v_recorded;
end;
$$;
revoke all on function public.care_mark_water_not_drunk(uuid) from public, anon;
grant execute on function public.care_mark_water_not_drunk(uuid) to authenticated;

-- Evita backdating e bypass por UPDATE direto na API de dados.
create or replace function public.care_enforce_task_confirmation_window()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare v_now timestamptz := clock_timestamp();
begin
  if tg_op = 'INSERT' then
    if new.completed_at is not null then
      raise exception 'Task confirmation must use the server-controlled confirmation flow';
    end if;
    return new;
  end if;
  if old.completed_at is not null and
    (new.completed_at is distinct from old.completed_at or
     new.scheduled_at is distinct from old.scheduled_at) then
    raise exception 'Confirmed care records cannot be backdated or altered';
  end if;
  if new.completed_at is distinct from old.completed_at then
    if new.completed_at is null then
      raise exception 'Cannot clear a care confirmation';
    end if;
    if v_now < old.scheduled_at then raise exception 'Care window not started'; end if;
    if v_now >= old.scheduled_at + interval '15 minutes' then
      raise exception 'Care window expired';
    end if;
    new.completed_at := v_now;
  end if;
  return new;
end;
$$;
drop trigger if exists care_task_confirmation_window_guard on public.care_daily_checklist;
create trigger care_task_confirmation_window_guard
before insert or update on public.care_daily_checklist
for each row execute function public.care_enforce_task_confirmation_window();

-- Consumo e resposta de hidratação só podem ser criados pelas RPCs controladas.
revoke insert, update, delete on public.care_hydration from authenticated;
revoke insert, update, delete on public.care_hydration_responses from authenticated;
