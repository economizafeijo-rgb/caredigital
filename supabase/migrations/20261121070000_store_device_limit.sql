-- Conta de loja (dono ou funcionário): até 3 dispositivos conectados ao mesmo tempo e
-- acesso só no expediente (06h às 22h, horário do Acre). Um dispositivo sem uso por 24h
-- libera a vaga automaticamente.
create table if not exists public.care_store_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  device_id uuid not null,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, device_id)
);
create index if not exists care_store_devices_user_idx on public.care_store_devices(user_id, last_seen);
alter table public.care_store_devices enable row level security;
revoke all on public.care_store_devices from authenticated, anon;

-- Chamada a cada login e periodicamente. Devolve:
-- 'ok' (dispositivo registrado), 'limit' (3 já conectados), 'expediente' (fora do horário),
-- 'not_store' (conta sem loja: não se aplica).
create or replace function public.care_store_device_check(p_device uuid)
returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_time time := (now() at time zone 'America/Rio_Branco')::time;
  v_count integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_device is null then raise exception 'Device required'; end if;

  if not exists (select 1 from public.care_store_vendors v where v.owner_id = v_uid)
     and not exists (select 1 from public.care_store_staff s where s.user_id = v_uid and s.active) then
    return 'not_store';
  end if;

  if v_time >= time '22:00' or v_time < time '06:00' then
    return 'expediente';
  end if;

  delete from public.care_store_devices where user_id = v_uid and last_seen < now() - interval '24 hours';

  if exists (select 1 from public.care_store_devices where user_id = v_uid and device_id = p_device) then
    update public.care_store_devices set last_seen = now() where user_id = v_uid and device_id = p_device;
    return 'ok';
  end if;

  select count(*) into v_count from public.care_store_devices where user_id = v_uid;
  if v_count >= 3 then return 'limit'; end if;

  insert into public.care_store_devices(user_id, device_id) values (v_uid, p_device);
  return 'ok';
end;
$$;

-- Libera a vaga deste dispositivo (saída manual ou expediente encerrado). Não falha para outras contas.
create or replace function public.care_store_device_release(p_device uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or p_device is null then return; end if;
  delete from public.care_store_devices where user_id = auth.uid() and device_id = p_device;
end;
$$;

revoke all on function public.care_store_device_check(uuid) from public, anon;
revoke all on function public.care_store_device_release(uuid) from public, anon;
grant execute on function public.care_store_device_check(uuid) to authenticated;
grant execute on function public.care_store_device_release(uuid) to authenticated;
