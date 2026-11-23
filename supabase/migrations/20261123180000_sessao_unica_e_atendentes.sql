-- 1) Sessão única garantida no servidor -------------------------------------------------------
-- Cada conta (exceto o dono de loja, que pode usar até 3 dispositivos) tem uma única sessão válida.
-- O login registra a sessão nova; os outros aparelhos conferem e são desconectados.
create table if not exists public.care_active_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_id text not null,
  updated_at timestamptz not null default now()
);
alter table public.care_active_sessions enable row level security;
revoke all on public.care_active_sessions from anon, authenticated;

create or replace function public.care_is_store_owner()
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select exists (select 1 from public.care_store_vendors v where v.owner_id = auth.uid()) $$;

-- Registra esta sessão como a única válida da conta. Dono de loja: não se aplica ('owner').
create or replace function public.care_session_claim()
returns text language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_sid text := auth.jwt() ->> 'session_id';
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if public.care_is_store_owner() then return 'owner'; end if;
  if v_sid is null then return 'ok'; end if;
  insert into public.care_active_sessions(user_id, session_id, updated_at)
  values (v_uid, v_sid, now())
  on conflict (user_id) do update set session_id = excluded.session_id, updated_at = now();
  return 'ok';
end;
$$;

-- 'ok' (esta é a sessão válida), 'replaced' (a conta entrou em outro aparelho) ou 'owner'.
create or replace function public.care_session_check()
returns text language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_sid text := auth.jwt() ->> 'session_id'; v_saved text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if public.care_is_store_owner() then return 'owner'; end if;
  select session_id into v_saved from public.care_active_sessions where user_id = v_uid;
  if v_saved is null or v_sid is null or v_saved = v_sid then return 'ok'; end if;
  return 'replaced';
end;
$$;

revoke all on function public.care_is_store_owner() from public, anon;
revoke all on function public.care_session_claim() from public, anon;
revoke all on function public.care_session_check() from public, anon;
grant execute on function public.care_is_store_owner() to authenticated;
grant execute on function public.care_session_claim() to authenticated;
grant execute on function public.care_session_check() to authenticated;

-- 2) Dispositivos: só o dono usa até 3. Funcionários e atendentes seguem a sessão única ('staff').
create or replace function public.care_store_device_check(p_device uuid)
returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_device is null then raise exception 'Device required'; end if;

  if not exists (select 1 from public.care_store_vendors v where v.owner_id = v_uid) then
    if exists (select 1 from public.care_store_staff s where s.user_id = v_uid and s.active) then
      return 'staff';
    end if;
    return 'not_store';
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

-- 3) Papel 'atendente': até 2 por loja, cada uma com as próprias conversas ---------------------
alter table public.care_store_staff drop constraint if exists care_store_staff_role_check;
alter table public.care_store_staff
  add constraint care_store_staff_role_check check (role in ('operador', 'visualizador', 'atendente'));

create or replace function public.care_store_staff_limit()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if new.role = 'atendente'
     and (select count(*) from public.care_store_staff s
           where s.vendor_id = new.vendor_id and s.role = 'atendente' and s.id <> new.id) >= 2 then
    raise exception 'Attendant limit reached';
  end if;
  return new;
end;
$$;
drop trigger if exists care_store_staff_limit_trg on public.care_store_staff;
create trigger care_store_staff_limit_trg before insert or update of role on public.care_store_staff
  for each row execute function public.care_store_staff_limit();

-- Atendente atende e avança pedidos como o operador.
create or replace function public.care_store_is_operator(p_vendor uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.care_store_staff s
     where s.vendor_id = p_vendor and s.user_id = auth.uid() and s.active and s.role in ('operador', 'atendente')
  )
$$;

-- Quem vê a conversa de um cliente: dono, operador e visualizador veem todas;
-- a atendente vê só os clientes que ela assumiu.
create or replace function public.care_store_sees_customer(p_vendor uuid, p_customer uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (select 1 from public.care_store_vendors v where v.id = p_vendor and v.owner_id = auth.uid())
      or exists (select 1 from public.care_store_staff s
                  where s.vendor_id = p_vendor and s.user_id = auth.uid() and s.active
                    and s.role in ('operador', 'visualizador'))
      or (exists (select 1 from public.care_store_staff s
                   where s.vendor_id = p_vendor and s.user_id = auth.uid() and s.active and s.role = 'atendente')
          and exists (select 1 from public.care_store_queue q
                       where q.vendor_id = p_vendor and q.customer_id = p_customer and q.agent_id = auth.uid()))
$$;
revoke all on function public.care_store_sees_customer(uuid, uuid) from public, anon;
grant execute on function public.care_store_sees_customer(uuid, uuid) to authenticated;

-- As políticas antigas de funcionário liberavam todas as conversas: substituídas.
drop policy if exists messages_staff_select on public.care_store_messages;
drop policy if exists messages_staff_insert on public.care_store_messages;
drop policy if exists messages_staff_read on public.care_store_messages;

drop policy if exists messages_select on public.care_store_messages;
create policy messages_select on public.care_store_messages for select to authenticated
  using (
    customer_id = auth.uid()
    or public.is_nextvita_platform_admin()
    or public.care_store_sees_customer(vendor_id, customer_id)
  );

drop policy if exists messages_insert on public.care_store_messages;
create policy messages_insert on public.care_store_messages for insert to authenticated
  with check (
    (not from_vendor and customer_id = auth.uid()
       and exists (select 1 from public.care_store_vendors v where v.id = vendor_id and v.status = 'ativo')
       and coalesce((public.care_store_store_status(vendor_id)->>'open')::boolean, false))
    or (from_vendor and public.care_store_can_attend(vendor_id)
        and public.care_store_sees_customer(vendor_id, customer_id))
  );

drop policy if exists messages_mark_read on public.care_store_messages;
create policy messages_mark_read on public.care_store_messages for update to authenticated
  using (customer_id = auth.uid()
         or (public.care_store_can_attend(vendor_id) and public.care_store_sees_customer(vendor_id, customer_id)))
  with check (customer_id = auth.uid()
         or (public.care_store_can_attend(vendor_id) and public.care_store_sees_customer(vendor_id, customer_id)));

-- Clientes aguardando atendente: a atendente vê o nome e a última mensagem e assume com um toque.
create or replace function public.care_store_unassigned(p_vendor uuid)
returns table (customer_id uuid, customer_name text, last_body text, last_at timestamptz, waiting integer)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  if not public.care_store_can_attend(p_vendor) then raise exception 'Not allowed'; end if;
  return query
  with last_msg as (
    select distinct on (m.customer_id) m.customer_id, m.customer_name, m.body, m.created_at, m.from_vendor
      from public.care_store_messages m
     where m.vendor_id = p_vendor and m.deleted_at is null and not m.is_system
       and m.created_at > now() - interval '48 hours'
     order by m.customer_id, m.created_at desc
  )
  select l.customer_id, l.customer_name, left(l.body, 140), l.created_at,
         (select count(*)::integer from public.care_store_messages x
           where x.vendor_id = p_vendor and x.customer_id = l.customer_id and not x.from_vendor
             and x.read_at is null and x.deleted_at is null)
    from last_msg l
   where not l.from_vendor
     and not exists (select 1 from public.care_store_queue q
                      where q.vendor_id = p_vendor and q.customer_id = l.customer_id
                        and q.status = 'active' and q.agent_id is not null)
   order by l.created_at;
end;
$$;

-- Assume um cliente. Falha (false) se outra pessoa já está atendendo.
create or replace function public.care_store_take_customer(p_vendor uuid, p_customer uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if not public.care_store_can_attend(p_vendor) then raise exception 'Not allowed'; end if;
  if exists (select 1 from public.care_store_queue q
              where q.vendor_id = p_vendor and q.customer_id = p_customer
                and q.status = 'active' and q.agent_id is not null and q.agent_id <> v_uid) then
    return false;
  end if;
  update public.care_store_queue
     set status = 'active', agent_id = v_uid, assigned_at = coalesce(assigned_at, now()), last_seen = now()
   where vendor_id = p_vendor and customer_id = p_customer and status in ('waiting', 'active');
  if not found then
    insert into public.care_store_queue(vendor_id, customer_id, status, agent_id, assigned_at)
    values (p_vendor, p_customer, 'active', v_uid, now());
  end if;
  return true;
end;
$$;

revoke all on function public.care_store_unassigned(uuid) from public, anon;
revoke all on function public.care_store_take_customer(uuid, uuid) from public, anon;
grant execute on function public.care_store_unassigned(uuid) to authenticated;
grant execute on function public.care_store_take_customer(uuid, uuid) to authenticated;

-- Nome de exibição do funcionário (a atendente se apresenta com o nome definido pelo lojista).
create or replace function public.care_store_my_staff(p_vendor uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp
as $$
  select jsonb_build_object('name', s.name, 'role', s.role)
    from public.care_store_staff s
   where s.vendor_id = p_vendor and s.user_id = auth.uid() and s.active
$$;
revoke all on function public.care_store_my_staff(uuid) from public, anon;
grant execute on function public.care_store_my_staff(uuid) to authenticated;
