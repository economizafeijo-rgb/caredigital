-- Administração das lojas: registro de ações (log), criação, ativação, suspensão e exclusão
-- de lojas pelo administrador, e solicitações de cadastro de novos lojistas.
--
-- A partir daqui, lojista não cria loja sozinho: ele envia uma solicitação, o administrador
-- avalia, cria a loja com o e-mail e a senha de acesso e coloca no ar.

-- 1. Registro das ações do administrador ------------------------------------------------
create table if not exists public.care_store_admin_audit (
  id bigint generated always as identity primary key,
  vendor_id uuid,
  vendor_name text,
  actor_email text,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists care_store_admin_audit_vendor_idx
  on public.care_store_admin_audit (vendor_id, created_at desc);
alter table public.care_store_admin_audit enable row level security;
revoke all on public.care_store_admin_audit from anon, authenticated;

create or replace function public.care_store_audit(p_vendor uuid, p_action text, p_details jsonb default '{}'::jsonb)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into public.care_store_admin_audit (vendor_id, vendor_name, actor_email, action, details)
  values (p_vendor, (select name from public.care_store_vendors where id = p_vendor),
          lower(coalesce(auth.jwt() ->> 'email', 'sistema')), p_action, coalesce(p_details, '{}'::jsonb));
end $$;
revoke all on function public.care_store_audit(uuid, text, jsonb) from public, anon, authenticated;

-- Registro feito pela tela do administrador (ex.: identidade, logo, senha do dono).
create or replace function public.care_store_admin_log(p_vendor uuid, p_action text, p_details jsonb default '{}'::jsonb)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  if char_length(coalesce(p_action, '')) not between 2 and 80 then raise exception 'Invalid action'; end if;
  perform public.care_store_audit(p_vendor, p_action, p_details);
end $$;
revoke all on function public.care_store_admin_log(uuid, text, jsonb) from public, anon;
grant execute on function public.care_store_admin_log(uuid, text, jsonb) to authenticated;

-- Linha do tempo da loja: ações do administrador + pedidos, estoque, caixa e conversas.
create or replace function public.care_store_admin_timeline(p_vendor uuid, p_limit integer default 200)
returns table (at timestamptz, kind text, title text, detail text, actor text)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  return query
  select * from (
    select a.created_at, 'admin'::text, a.action, nullif(a.details::text, '{}'), a.actor_email
      from public.care_store_admin_audit a where a.vendor_id = p_vendor
    union all
    select o.created_at, 'pedido', 'Pedido #' || o.order_number || ' · ' || o.status,
           o.customer_name || ' · R$ ' || to_char(o.total_cents / 100.0, 'FM999G990D00'), null
      from public.care_store_orders o where o.vendor_id = p_vendor
    union all
    select m.created_at, 'estoque',
           case when m.delta >= 0 then 'Entrada de estoque' else 'Saída de estoque' end,
           coalesce(p.name, 'Produto') || ' · ' || case when m.delta > 0 then '+' else '' end || m.delta
             || ' (fica ' || m.stock_after || ') · ' || coalesce(m.reason, ''), null
      from public.care_store_stock_moves m left join public.care_store_products p on p.id = m.product_id
     where m.vendor_id = p_vendor
    union all
    select c.occurred_at, 'caixa', case when c.kind = 'entrada' then 'Entrada no caixa' else 'Saída do caixa' end,
           coalesce(c.description, c.category, '') || ' · R$ ' || to_char(c.amount_cents / 100.0, 'FM999G990D00'), null
      from public.care_store_cash_entries c where c.vendor_id = p_vendor
    union all
    select h.closed_at, 'conversa', 'Conversa encerrada',
           coalesce(h.customer_name, 'Cliente') || ' · ' || h.message_count || ' mensagens', null
      from public.care_store_chat_archive h where h.vendor_id = p_vendor
  ) t (at, kind, title, detail, actor)
  order by at desc
  limit least(greatest(coalesce(p_limit, 200), 1), 1000);
end $$;
revoke all on function public.care_store_admin_timeline(uuid, integer) from public, anon;
grant execute on function public.care_store_admin_timeline(uuid, integer) to authenticated;

-- 2. Lojista não cria loja sozinho --------------------------------------------------------
drop policy if exists vendors_insert_own on public.care_store_vendors;

-- 3. Criar, ativar, suspender e apagar lojas -------------------------------------------------
create or replace function public.care_store_admin_create_vendor(
  p_name text, p_slug text, p_segment text, p_city text, p_address text, p_phone text,
  p_plan text default 'basico', p_status text default 'ativo',
  p_owner_email text default null, p_owner_password text default null, p_owner_name text default null,
  p_request uuid default null
) returns jsonb
language plpgsql security definer set search_path = public, auth, pg_temp
as $$
declare v_id uuid; v_email text := lower(btrim(coalesce(p_owner_email, ''))); v_user uuid; v_linked boolean := false;
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  if exists (select 1 from public.care_store_vendors where slug = p_slug) then raise exception 'Slug taken'; end if;
  insert into public.care_store_vendors
    (owner_id, name, slug, segment, city, address, phone, plan, status,
     monthly_fee_cents, commission_bps)
  values
    (auth.uid(), btrim(p_name), p_slug, p_segment, btrim(p_city), nullif(btrim(coalesce(p_address, '')), ''),
     p_phone, p_plan, p_status,
     case p_plan when 'destaque' then 9900 when 'vitrine' then 4900 else 0 end,
     case p_plan when 'destaque' then 500 when 'vitrine' then 700 else 1000 end)
  returning id into v_id;

  if v_email <> '' then
    select id into v_user from auth.users where lower(email) = v_email;
    if v_user is not null then
      update public.care_store_vendors set owner_id = v_user where id = v_id;
      v_linked := true;
    else
      perform public.care_store_admin_create_owner(v_id, v_email, p_owner_password, p_owner_name);
    end if;
  end if;

  if p_request is not null then
    update public.care_store_seller_requests
       set status = 'aprovada', vendor_id = v_id, reviewed_at = now()
     where id = p_request;
  end if;

  perform public.care_store_audit(v_id, 'Loja criada', jsonb_build_object(
    'status', p_status, 'plano', p_plan, 'login', nullif(v_email, ''), 'conta_existente', v_linked));
  return jsonb_build_object('id', v_id, 'linked_existing', v_linked);
end $$;
revoke all on function public.care_store_admin_create_vendor(text, text, text, text, text, text, text, text, text, text, text, uuid) from public, anon;
grant execute on function public.care_store_admin_create_vendor(text, text, text, text, text, text, text, text, text, text, text, uuid) to authenticated;

create or replace function public.care_store_admin_set_status(p_vendor uuid, p_status text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_old text;
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  if p_status not in ('pendente', 'ativo', 'suspenso') then raise exception 'Invalid status'; end if;
  select status into v_old from public.care_store_vendors where id = p_vendor;
  if v_old is null then raise exception 'Vendor not found'; end if;
  update public.care_store_vendors
     set status = p_status, is_open = case when p_status = 'ativo' then is_open else false end, updated_at = now()
   where id = p_vendor;
  perform public.care_store_audit(p_vendor,
    case p_status when 'ativo' then 'Loja ativada' when 'suspenso' then 'Loja suspensa' else 'Loja voltou para pendente' end,
    jsonb_build_object('de', v_old, 'para', p_status));
end $$;
revoke all on function public.care_store_admin_set_status(uuid, text) from public, anon;
grant execute on function public.care_store_admin_set_status(uuid, text) to authenticated;

-- Exclusão definitiva: exige digitar o nome exato da loja. Pedidos ficam guardados sem a loja.
create or replace function public.care_store_admin_delete_vendor(p_vendor uuid, p_confirm_name text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_name text;
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  select name into v_name from public.care_store_vendors where id = p_vendor;
  if v_name is null then raise exception 'Vendor not found'; end if;
  if btrim(coalesce(p_confirm_name, '')) <> btrim(v_name) then raise exception 'Name mismatch'; end if;
  perform public.care_store_audit(p_vendor, 'Loja apagada definitivamente', jsonb_build_object('nome', v_name));
  delete from public.care_store_vendors where id = p_vendor;
end $$;
revoke all on function public.care_store_admin_delete_vendor(uuid, text) from public, anon;
grant execute on function public.care_store_admin_delete_vendor(uuid, text) to authenticated;

-- 4. Solicitações de cadastro de lojistas -------------------------------------------------------
create table if not exists public.care_store_seller_requests (
  id uuid primary key default gen_random_uuid(),
  business_name text not null check (char_length(btrim(business_name)) between 2 and 80),
  owner_name text not null check (char_length(btrim(owner_name)) between 2 and 80),
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  phone text not null check (char_length(regexp_replace(phone, '\D', '', 'g')) between 10 and 13),
  segment text not null default 'outros',
  city text not null default 'Feijó' check (char_length(btrim(city)) between 2 and 80),
  address text check (address is null or char_length(address) <= 200),
  message text check (message is null or char_length(message) <= 1000),
  status text not null default 'nova' check (status in ('nova', 'em_analise', 'aprovada', 'recusada')),
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 1000),
  vendor_id uuid references public.care_store_vendors(id) on delete set null,
  user_id uuid,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists care_store_seller_requests_status_idx
  on public.care_store_seller_requests (status, created_at desc);
alter table public.care_store_seller_requests enable row level security;
revoke all on public.care_store_seller_requests from anon, authenticated;

-- Qualquer pessoa pode enviar (sem login). Limite: 3 solicitações por e-mail por dia.
create or replace function public.care_store_submit_seller_request(
  p_business_name text, p_owner_name text, p_email text, p_phone text,
  p_segment text, p_city text, p_address text, p_message text
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_id uuid; v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if (select count(*) from public.care_store_seller_requests
       where email = v_email and created_at > now() - interval '1 day') >= 3 then
    raise exception 'Too many requests';
  end if;
  insert into public.care_store_seller_requests
    (business_name, owner_name, email, phone, segment, city, address, message, user_id)
  values
    (btrim(p_business_name), btrim(p_owner_name), v_email, btrim(p_phone),
     case when p_segment in ('roupas','suplementos','farmacia','naturais','autonomo','outros') then p_segment else 'outros' end,
     coalesce(nullif(btrim(coalesce(p_city, '')), ''), 'Feijó'),
     nullif(btrim(coalesce(p_address, '')), ''), nullif(btrim(coalesce(p_message, '')), ''), auth.uid())
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.care_store_submit_seller_request(text, text, text, text, text, text, text, text) from public;
grant execute on function public.care_store_submit_seller_request(text, text, text, text, text, text, text, text) to anon, authenticated;

create or replace function public.care_store_admin_seller_requests(p_status text default null)
returns setof public.care_store_seller_requests
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  return query select * from public.care_store_seller_requests
    where p_status is null or status = p_status
    order by (status in ('nova', 'em_analise')) desc, created_at desc
    limit 500;
end $$;
revoke all on function public.care_store_admin_seller_requests(text) from public, anon;
grant execute on function public.care_store_admin_seller_requests(text) to authenticated;

create or replace function public.care_store_admin_update_request(p_id uuid, p_status text, p_notes text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  if p_status not in ('nova', 'em_analise', 'aprovada', 'recusada') then raise exception 'Invalid status'; end if;
  update public.care_store_seller_requests
     set status = p_status, admin_notes = nullif(btrim(coalesce(p_notes, '')), ''), reviewed_at = now()
   where id = p_id;
end $$;
revoke all on function public.care_store_admin_update_request(uuid, text, text) from public, anon;
grant execute on function public.care_store_admin_update_request(uuid, text, text) to authenticated;
