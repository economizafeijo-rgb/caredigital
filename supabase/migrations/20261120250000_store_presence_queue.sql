-- Disponibilidade do atendimento, presença dos atendentes e fila de espera.
-- Todas as escritas passam por funções do servidor (security definer); o navegador só lê.

-- Quem pode atender: dono da loja ou funcionário ativo.
create or replace function public.care_store_can_attend(p_vendor uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (select 1 from public.care_store_vendors v where v.id = p_vendor and v.owner_id = auth.uid())
      or public.care_store_is_staff(p_vendor)
$$;
revoke all on function public.care_store_can_attend(uuid) from public, anon;
grant execute on function public.care_store_can_attend(uuid) to authenticated;

-- Presença por atendente. "online" é a intenção do atendente; last_seen é o sinal periódico.
create table if not exists public.care_store_presence (
  vendor_id uuid not null references public.care_store_vendors(id) on delete cascade,
  user_id uuid not null,
  online boolean not null default false,
  last_seen timestamptz not null default now(),
  primary key (vendor_id, user_id)
);
alter table public.care_store_presence enable row level security;
revoke all on public.care_store_presence from authenticated, anon;
grant select on public.care_store_presence to authenticated;
drop policy if exists presence_select on public.care_store_presence;
create policy presence_select on public.care_store_presence for select to authenticated
  using (public.care_store_can_attend(vendor_id));

-- Fila e atendimentos. Uma entrada ativa ou em espera por cliente e loja.
create table if not exists public.care_store_queue (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.care_store_vendors(id) on delete cascade,
  customer_id uuid not null,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'closed')),
  agent_id uuid,
  entered_at timestamptz not null default clock_timestamp(),
  assigned_at timestamptz,
  closed_at timestamptz,
  close_reason text check (close_reason is null or close_reason in
    ('atendido', 'saiu_fila', 'inatividade', 'encerrado_atendente', 'sem_atendente', 'desconectado')),
  last_seen timestamptz not null default now()
);
create unique index if not exists care_store_queue_open_idx
  on public.care_store_queue(vendor_id, customer_id) where status in ('waiting', 'active');
create index if not exists care_store_queue_order_idx on public.care_store_queue(vendor_id, status, entered_at);
alter table public.care_store_queue enable row level security;
revoke all on public.care_store_queue from authenticated, anon;
grant select on public.care_store_queue to authenticated;
drop policy if exists queue_select_own on public.care_store_queue;
create policy queue_select_own on public.care_store_queue for select to authenticated
  using (customer_id = auth.uid() or public.care_store_can_attend(vendor_id));

-- Atendente marca-se online/offline. Offline para de receber novos clientes na hora.
create or replace function public.care_store_set_online(p_vendor uuid, p_online boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.care_store_can_attend(p_vendor) then raise exception 'Not allowed'; end if;
  insert into public.care_store_presence(vendor_id, user_id, online, last_seen)
  values (p_vendor, auth.uid(), p_online, now())
  on conflict (vendor_id, user_id) do update set online = excluded.online, last_seen = now();
  if p_online then perform public.care_store_assign_next(p_vendor); end if;
  return public.care_store_store_status(p_vendor);
end;
$$;

-- Sinal periódico do atendente (ex.: a cada 20 s). Sem ele, o atendente deixa de contar como presente.
create or replace function public.care_store_heartbeat(p_vendor uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.care_store_can_attend(p_vendor) then raise exception 'Not allowed'; end if;
  update public.care_store_presence set last_seen = now()
   where vendor_id = p_vendor and user_id = auth.uid() and online;
  return public.care_store_store_status(p_vendor);
end;
$$;

-- Atendentes presentes: online com sinal nos últimos 60 s.
create or replace function public.care_store_store_status(p_vendor uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_cap integer; v_present integer; v_free integer; v_active integer; v_waiting integer;
begin
  select chat_capacity into v_cap from public.care_store_vendors where id = p_vendor and status = 'ativo';
  if v_cap is null then raise exception 'Vendor unavailable'; end if;
  select count(*) into v_present from public.care_store_presence
   where vendor_id = p_vendor and online and last_seen > now() - interval '60 seconds';
  select count(*) into v_active from public.care_store_queue where vendor_id = p_vendor and status = 'active';
  select count(*) into v_waiting from public.care_store_queue where vendor_id = p_vendor and status = 'waiting';
  -- Capacidade livre: cada atendente presente atende até chat_capacity clientes ao mesmo tempo.
  v_free := greatest(v_present * v_cap - v_active, 0);
  return jsonb_build_object(
    'open', v_present > 0,
    'agents_online', v_present,
    'capacity_per_agent', v_cap,
    'active', v_active,
    'waiting', v_waiting,
    'free_slots', v_free,
    'now', now());
end;
$$;

-- Atribui clientes em espera a atendentes livres, na ordem de entrada, sem repetir nenhum cliente.
create or replace function public.care_store_assign_next(p_vendor uuid)
returns integer language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_cap integer; v_agent uuid; v_load integer; v_row uuid; v_done integer := 0;
begin
  select chat_capacity into v_cap from public.care_store_vendors where id = p_vendor and status = 'ativo';
  if v_cap is null then return 0; end if;
  loop
    -- Escolhe o atendente presente com menos atendimentos e espaço livre.
    select p.user_id, (select count(*) from public.care_store_queue q
                        where q.vendor_id = p_vendor and q.status = 'active' and q.agent_id = p.user_id) as load
      into v_agent, v_load
      from public.care_store_presence p
     where p.vendor_id = p_vendor and p.online and p.last_seen > now() - interval '60 seconds'
       and (select count(*) from public.care_store_queue q
             where q.vendor_id = p_vendor and q.status = 'active' and q.agent_id = p.user_id) < v_cap
     order by load, p.last_seen desc
     limit 1;
    exit when v_agent is null;
    -- Trava a próxima entrada em espera; SKIP LOCKED impede que dois atendentes peguem o mesmo cliente.
    select id into v_row from public.care_store_queue
     where vendor_id = p_vendor and status = 'waiting'
     order by entered_at, id
     limit 1
     for update skip locked;
    exit when v_row is null;
    update public.care_store_queue
       set status = 'active', agent_id = v_agent, assigned_at = now()
     where id = v_row;
    v_done := v_done + 1;
  end loop;
  return v_done;
end;
$$;

-- Cliente entra na fila (idempotente: não duplica, não perde a posição ao recarregar).
create or replace function public.care_store_queue_join(p_vendor uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_status jsonb; v_row record;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  v_status := public.care_store_store_status(p_vendor);
  if (v_status->>'open')::boolean is not true then
    raise exception 'Store offline' using errcode = 'P0001';
  end if;
  insert into public.care_store_queue(vendor_id, customer_id, status, last_seen)
  values (p_vendor, v_uid, 'waiting', now())
  on conflict (vendor_id, customer_id) where status in ('waiting', 'active')
  do update set last_seen = now();
  perform public.care_store_assign_next(p_vendor);
  return public.care_store_queue_position(p_vendor);
end;
$$;

-- Posição do próprio cliente: quantos estão à frente e se já está sendo atendido.
create or replace function public.care_store_queue_position(p_vendor uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_row record; v_ahead integer := 0;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_row from public.care_store_queue
   where vendor_id = p_vendor and customer_id = v_uid and status in ('waiting', 'active') limit 1;
  if not found then return jsonb_build_object('state', 'none'); end if;
  if v_row.status = 'active' then
    return jsonb_build_object('state', 'atendimento', 'since', v_row.assigned_at);
  end if;
  select count(*) into v_ahead from public.care_store_queue
   where vendor_id = p_vendor and status = 'waiting' and (entered_at, id) < (v_row.entered_at, v_row.id);
  return jsonb_build_object('state', 'espera', 'position', v_ahead + 1, 'ahead', v_ahead,
    'since', v_row.entered_at, 'now', now());
end;
$$;

-- Cliente sai voluntariamente da fila de espera.
create or replace function public.care_store_queue_leave(p_vendor uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.care_store_queue set status = 'closed', closed_at = now(), close_reason = 'saiu_fila'
   where vendor_id = p_vendor and customer_id = auth.uid() and status = 'waiting';
  return jsonb_build_object('state', 'none');
end;
$$;

-- Encerra um atendimento (pelo atendente ou pela inatividade) e avança a fila. Idempotente.
create or replace function public.care_store_close_chat(p_vendor uuid, p_customer uuid, p_reason text)
returns integer language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_closed integer;
begin
  if p_reason not in ('atendido', 'inatividade', 'encerrado_atendente', 'sem_atendente', 'desconectado') then
    raise exception 'Invalid reason';
  end if;
  if not public.care_store_can_attend(p_vendor) then raise exception 'Not allowed'; end if;
  update public.care_store_queue set status = 'closed', closed_at = now(), close_reason = p_reason
   where vendor_id = p_vendor and customer_id = p_customer and status = 'active';
  get diagnostics v_closed = row_count;
  perform public.care_store_assign_next(p_vendor);
  return v_closed;
end;
$$;

revoke all on function public.care_store_set_online(uuid, boolean) from public, anon;
revoke all on function public.care_store_heartbeat(uuid) from public, anon;
revoke all on function public.care_store_store_status(uuid) from public, anon;
revoke all on function public.care_store_assign_next(uuid) from public, anon;
revoke all on function public.care_store_queue_join(uuid) from public, anon;
revoke all on function public.care_store_queue_position(uuid) from public, anon;
revoke all on function public.care_store_queue_leave(uuid) from public, anon;
revoke all on function public.care_store_close_chat(uuid, uuid, text) from public, anon;
grant execute on function public.care_store_set_online(uuid, boolean) to authenticated;
grant execute on function public.care_store_heartbeat(uuid) to authenticated;
grant execute on function public.care_store_store_status(uuid) to authenticated;
grant execute on function public.care_store_queue_join(uuid) to authenticated;
grant execute on function public.care_store_queue_position(uuid) to authenticated;
grant execute on function public.care_store_queue_leave(uuid) to authenticated;
grant execute on function public.care_store_close_chat(uuid, uuid, text) to authenticated;
-- care_store_assign_next é chamada só por dentro das funções acima.
