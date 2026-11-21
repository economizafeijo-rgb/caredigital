-- Níveis de acesso dos funcionários: 'operador' atende e avança pedidos;
-- 'visualizador' só lê o painel. O dono continua com acesso total.
alter table public.care_store_staff add column if not exists role text not null default 'operador';
do $$
begin
  alter table public.care_store_staff
    add constraint care_store_staff_role_check check (role in ('operador', 'visualizador'));
exception when duplicate_object then null;
end $$;
grant update (role) on public.care_store_staff to authenticated;

create or replace function public.care_store_is_operator(p_vendor uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.care_store_staff s
     where s.vendor_id = p_vendor and s.user_id = auth.uid() and s.active and s.role = 'operador'
  )
$$;
revoke all on function public.care_store_is_operator(uuid) from public, anon;
grant execute on function public.care_store_is_operator(uuid) to authenticated;

-- Quem pode operar a loja: dono ou funcionário com papel de operador.
create or replace function public.care_store_can_attend(p_vendor uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (select 1 from public.care_store_vendors v where v.id = p_vendor and v.owner_id = auth.uid())
      or public.care_store_is_operator(p_vendor)
$$;

-- Visualizador não avança pedidos nem envia mensagens.
drop policy if exists store_orders_staff_update on public.care_store_orders;
create policy store_orders_staff_update on public.care_store_orders for update to authenticated
  using (vendor_id is not null and public.care_store_is_operator(vendor_id))
  with check (vendor_id is not null and public.care_store_is_operator(vendor_id));

drop policy if exists messages_staff_insert on public.care_store_messages;
create policy messages_staff_insert on public.care_store_messages for insert to authenticated
  with check (from_vendor and public.care_store_is_operator(vendor_id));

-- Papel do usuário atual nesta loja (usado pelo painel para mostrar o modo de leitura).
create or replace function public.care_store_my_role(p_vendor uuid)
returns text language sql stable security definer set search_path = public, pg_temp
as $$
  select case
    when exists (select 1 from public.care_store_vendors v where v.id = p_vendor and v.owner_id = auth.uid()) then 'dono'
    else (select s.role from public.care_store_staff s where s.vendor_id = p_vendor and s.user_id = auth.uid() and s.active)
  end
$$;
revoke all on function public.care_store_my_role(uuid) from public, anon;
grant execute on function public.care_store_my_role(uuid) to authenticated;
