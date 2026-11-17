-- Marketplace NextVita: lojistas, produtos, pedidos por loja, avaliações e cobrança (mensalidade + comissão).
-- Quem administra preços, comissão, plano e status é só o administrador da plataforma.

create or replace function public.is_nextvita_platform_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) = 'francdenisbr@gmail.com'; $$;
revoke all on function public.is_nextvita_platform_admin() from public, anon;
grant execute on function public.is_nextvita_platform_admin() to authenticated;

-- 1) Lojistas ---------------------------------------------------------------
create table if not exists public.care_store_vendors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 60),
  segment text not null check (segment in ('roupas','suplementos','farmacia','naturais','autonomo','outros')),
  description text check (description is null or char_length(description) <= 500),
  logo_url text check (logo_url is null or logo_url ~ '^https://'),
  phone text not null check (char_length(regexp_replace(phone, '\D', '', 'g')) between 10 and 13),
  city text not null default 'Feijó' check (char_length(btrim(city)) between 2 and 80),
  address text check (address is null or char_length(address) <= 200),
  offers_delivery boolean not null default false,
  offers_pickup boolean not null default true,
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents between 0 and 100000),
  free_delivery_from_cents integer check (free_delivery_from_cents is null or free_delivery_from_cents >= 0),
  delivery_area text check (delivery_area is null or char_length(delivery_area) <= 200),
  status text not null default 'pendente' check (status in ('pendente','ativo','suspenso')),
  plan text not null default 'basico' check (plan in ('basico','vitrine','destaque')),
  monthly_fee_cents integer not null default 0 check (monthly_fee_cents >= 0),
  commission_bps integer not null default 1000 check (commission_bps between 0 and 5000),
  verified boolean not null default false,
  featured_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint care_store_vendor_fulfillment check (offers_delivery or offers_pickup)
);
create index if not exists care_store_vendors_status_idx on public.care_store_vendors(status, plan);
create index if not exists care_store_vendors_owner_idx on public.care_store_vendors(owner_id);
alter table public.care_store_vendors enable row level security;

-- Quem se cadastra só informa dados da própria loja; plano, taxas, status e selo ficam com o administrador.
revoke insert, update on public.care_store_vendors from authenticated;
grant insert (owner_id, name, slug, segment, description, logo_url, phone, city, address, offers_delivery, offers_pickup, delivery_fee_cents, free_delivery_from_cents, delivery_area)
  on public.care_store_vendors to authenticated;
grant update (name, description, logo_url, phone, city, address, offers_delivery, offers_pickup, delivery_fee_cents, free_delivery_from_cents, delivery_area, updated_at)
  on public.care_store_vendors to authenticated;
grant select on public.care_store_vendors to anon, authenticated;

-- Visitantes (sem login) veem só lojas ativas; logados também veem a própria loja, e o administrador vê todas.
drop policy if exists vendors_select on public.care_store_vendors;
drop policy if exists vendors_select_public on public.care_store_vendors;
create policy vendors_select_public on public.care_store_vendors for select to anon
  using (status = 'ativo');
drop policy if exists vendors_select_auth on public.care_store_vendors;
create policy vendors_select_auth on public.care_store_vendors for select to authenticated
  using (status = 'ativo' or owner_id = auth.uid() or public.is_nextvita_platform_admin());
drop policy if exists vendors_insert_own on public.care_store_vendors;
create policy vendors_insert_own on public.care_store_vendors for insert to authenticated
  with check (owner_id = auth.uid());
drop policy if exists vendors_update_own on public.care_store_vendors;
create policy vendors_update_own on public.care_store_vendors for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- 2) Produtos ---------------------------------------------------------------
create table if not exists public.care_store_products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.care_store_vendors(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  category text not null check (category in ('suplementos','vitaminas','nutricao','roupas-masculinas','roupas-femininas','acessorios','naturais','farmacia','outros')),
  description text check (description is null or char_length(description) <= 600),
  price_cents integer not null check (price_cents > 0 and price_cents <= 10000000),
  old_price_cents integer check (old_price_cents is null or old_price_cents > price_cents),
  image_url text check (image_url is null or image_url ~ '^https://'),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists care_store_products_vendor_idx on public.care_store_products(vendor_id, active);
alter table public.care_store_products enable row level security;
grant select on public.care_store_products to anon, authenticated;
grant insert, update, delete on public.care_store_products to authenticated;

drop policy if exists products_select on public.care_store_products;
drop policy if exists products_select_public on public.care_store_products;
create policy products_select_public on public.care_store_products for select to anon
  using (active and exists (select 1 from public.care_store_vendors v where v.id = vendor_id and v.status = 'ativo'));
drop policy if exists products_select_auth on public.care_store_products;
create policy products_select_auth on public.care_store_products for select to authenticated
  using (
    (active and exists (select 1 from public.care_store_vendors v where v.id = vendor_id and v.status = 'ativo'))
    or exists (select 1 from public.care_store_vendors v where v.id = vendor_id and v.owner_id = auth.uid())
    or public.is_nextvita_platform_admin());
drop policy if exists products_write_own on public.care_store_products;
create policy products_write_own on public.care_store_products for all to authenticated
  using (exists (select 1 from public.care_store_vendors v where v.id = vendor_id and v.owner_id = auth.uid()))
  with check (exists (select 1 from public.care_store_vendors v where v.id = vendor_id and v.owner_id = auth.uid()));
drop policy if exists products_admin_all on public.care_store_products;
create policy products_admin_all on public.care_store_products for all to authenticated
  using (public.is_nextvita_platform_admin()) with check (public.is_nextvita_platform_admin());

-- 3) Pedidos por loja -------------------------------------------------------
alter table public.care_store_orders add column if not exists vendor_id uuid references public.care_store_vendors(id) on delete set null;
alter table public.care_store_orders add column if not exists fulfillment text not null default 'retirada' check (fulfillment in ('entrega','retirada'));
alter table public.care_store_orders add column if not exists delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0);
alter table public.care_store_orders add column if not exists commission_cents integer not null default 0 check (commission_cents >= 0);
alter table public.care_store_orders add column if not exists vendor_net_cents integer not null default 0;
create index if not exists care_store_orders_vendor_idx on public.care_store_orders(vendor_id, created_at desc);

drop policy if exists store_orders_vendor_select on public.care_store_orders;
create policy store_orders_vendor_select on public.care_store_orders for select to authenticated
  using (exists (select 1 from public.care_store_vendors v where v.id = vendor_id and v.owner_id = auth.uid()));
drop policy if exists store_orders_vendor_update on public.care_store_orders;
create policy store_orders_vendor_update on public.care_store_orders for update to authenticated
  using (exists (select 1 from public.care_store_vendors v where v.id = vendor_id and v.owner_id = auth.uid()))
  with check (exists (select 1 from public.care_store_vendors v where v.id = vendor_id and v.owner_id = auth.uid()));
-- Lojista e administrador só mudam o andamento do pedido, nunca valores nem comissão.
revoke update on public.care_store_orders from authenticated;
grant update (status, updated_at) on public.care_store_orders to authenticated;

-- Registro de pedido com preços, frete e comissão calculados no servidor.
create or replace function public.care_store_place_order(
  p_vendor_id uuid, p_items jsonb, p_fulfillment text, p_name text, p_phone text,
  p_address text, p_payment text, p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_vendor public.care_store_vendors%rowtype;
  v_item jsonb;
  v_prod public.care_store_products%rowtype;
  v_qty integer;
  v_subtotal integer := 0;
  v_fee integer := 0;
  v_commission integer;
  v_lines jsonb := '[]'::jsonb;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'Cart invalid';
  end if;
  if p_fulfillment not in ('entrega','retirada') or p_payment not in ('pix','cartao','boleto')
     or char_length(btrim(coalesce(p_name,''))) < 3
     or char_length(regexp_replace(coalesce(p_phone,''), '\D', '', 'g')) < 10 then
    raise exception 'Order fields invalid';
  end if;
  select * into v_vendor from public.care_store_vendors where id = p_vendor_id and status = 'ativo';
  if not found then raise exception 'Vendor unavailable'; end if;
  if p_fulfillment = 'entrega' and not v_vendor.offers_delivery then raise exception 'Delivery not offered'; end if;
  if p_fulfillment = 'retirada' and not v_vendor.offers_pickup then raise exception 'Pickup not offered'; end if;
  if p_fulfillment = 'entrega' and char_length(btrim(coalesce(p_address,''))) < 8 then raise exception 'Address required'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'qty')::integer;
    if v_qty is null or v_qty not between 1 and 20 then raise exception 'Quantity invalid'; end if;
    select * into v_prod from public.care_store_products
      where id = (v_item ->> 'product_id')::uuid and vendor_id = p_vendor_id and active for update;
    if not found then raise exception 'Product unavailable'; end if;
    if v_prod.stock < v_qty then raise exception 'Out of stock: %', v_prod.name; end if;
    update public.care_store_products set stock = stock - v_qty, updated_at = now() where id = v_prod.id;
    v_subtotal := v_subtotal + v_prod.price_cents * v_qty;
    v_lines := v_lines || jsonb_build_object('id', v_prod.id, 'name', v_prod.name, 'qty', v_qty, 'price_cents', v_prod.price_cents);
  end loop;

  if p_fulfillment = 'entrega' then
    v_fee := case when v_vendor.free_delivery_from_cents is not null and v_subtotal >= v_vendor.free_delivery_from_cents
                  then 0 else v_vendor.delivery_fee_cents end;
  end if;
  v_commission := round(v_subtotal * v_vendor.commission_bps / 10000.0)::integer;

  insert into public.care_store_orders(user_id, customer_name, customer_email, customer_phone, address, items, total_cents,
      payment_method, status, notes, vendor_id, fulfillment, delivery_fee_cents, commission_cents, vendor_net_cents)
  values (v_uid, btrim(p_name), nullif(lower(coalesce(auth.jwt() ->> 'email', '')), ''), btrim(p_phone),
      case when p_fulfillment = 'entrega' then btrim(p_address) else null end, v_lines, v_subtotal + v_fee,
      p_payment, 'aguardando_pagamento', nullif(btrim(coalesce(p_notes,'')), ''), v_vendor.id, p_fulfillment, v_fee,
      v_commission, v_subtotal + v_fee - v_commission)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.care_store_place_order(uuid,jsonb,text,text,text,text,text,text) from public, anon;
grant execute on function public.care_store_place_order(uuid,jsonb,text,text,text,text,text,text) to authenticated;

-- 4) Avaliações -------------------------------------------------------------
create table if not exists public.care_store_reviews (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.care_store_vendors(id) on delete cascade,
  order_id uuid not null unique references public.care_store_orders(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  author text,
  rating integer not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists care_store_reviews_vendor_idx on public.care_store_reviews(vendor_id, created_at desc);
alter table public.care_store_reviews enable row level security;
revoke insert, update, delete on public.care_store_reviews from authenticated;
grant insert (vendor_id, order_id, user_id, author, rating, comment) on public.care_store_reviews to authenticated;
grant select on public.care_store_reviews to anon, authenticated;
drop policy if exists reviews_select on public.care_store_reviews;
create policy reviews_select on public.care_store_reviews for select to anon, authenticated using (true);
drop policy if exists reviews_insert on public.care_store_reviews;
create policy reviews_insert on public.care_store_reviews for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.care_store_orders o
    where o.id = order_id and o.user_id = auth.uid() and o.vendor_id = care_store_reviews.vendor_id and o.status = 'entregue'));

create or replace view public.care_store_vendor_ratings as
  select vendor_id, round(avg(rating)::numeric, 1) as rating_avg, count(*)::integer as rating_count
  from public.care_store_reviews group by vendor_id;
grant select on public.care_store_vendor_ratings to anon, authenticated;

-- 5) Cobrança do lojista: mensalidade + comissão ---------------------------
create table if not exists public.care_store_vendor_invoices (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.care_store_vendors(id) on delete cascade,
  period text not null check (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  monthly_fee_cents integer not null default 0,
  gross_sales_cents integer not null default 0,
  commission_cents integer not null default 0,
  orders_count integer not null default 0,
  total_due_cents integer not null default 0,
  status text not null default 'pendente' check (status in ('pendente','pago','cancelado')),
  due_date date not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (vendor_id, period)
);
alter table public.care_store_vendor_invoices enable row level security;
revoke insert, update, delete on public.care_store_vendor_invoices from authenticated;
grant select on public.care_store_vendor_invoices to authenticated;
drop policy if exists invoices_select on public.care_store_vendor_invoices;
create policy invoices_select on public.care_store_vendor_invoices for select to authenticated
  using (public.is_nextvita_platform_admin()
    or exists (select 1 from public.care_store_vendors v where v.id = vendor_id and v.owner_id = auth.uid()));

-- 6) Ações do administrador -------------------------------------------------
create or replace function public.care_store_admin_update_vendor(
  p_vendor uuid, p_status text, p_plan text, p_monthly_fee_cents integer, p_commission_bps integer,
  p_verified boolean, p_featured_until date
) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  if p_status not in ('pendente','ativo','suspenso') or p_plan not in ('basico','vitrine','destaque')
     or p_monthly_fee_cents is null or p_monthly_fee_cents < 0
     or p_commission_bps is null or p_commission_bps not between 0 and 5000 then
    raise exception 'Vendor fields invalid';
  end if;
  update public.care_store_vendors
     set status = p_status, plan = p_plan, monthly_fee_cents = p_monthly_fee_cents,
         commission_bps = p_commission_bps, verified = coalesce(p_verified, false),
         featured_until = p_featured_until, updated_at = now()
   where id = p_vendor;
  if not found then raise exception 'Vendor not found'; end if;
end;
$$;
revoke all on function public.care_store_admin_update_vendor(uuid,text,text,integer,integer,boolean,date) from public, anon;
grant execute on function public.care_store_admin_update_vendor(uuid,text,text,integer,integer,boolean,date) to authenticated;

-- Gera as cobranças do mês (idempotente): mensalidade + comissão dos pedidos pagos, enviados ou entregues.
create or replace function public.care_store_generate_invoices(p_period text)
returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
  v_count integer;
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  if p_period !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'Period invalid'; end if;
  v_start := (p_period || '-01')::date::timestamp at time zone 'America/Rio_Branco';
  v_end := ((p_period || '-01')::date + interval '1 month')::timestamp at time zone 'America/Rio_Branco';
  with sales as (
    select vendor.id as vendor_id, vendor.monthly_fee_cents,
           coalesce(sum(o.total_cents - o.delivery_fee_cents), 0)::integer as gross,
           coalesce(sum(o.commission_cents), 0)::integer as commission,
           count(o.id)::integer as orders
      from public.care_store_vendors vendor
      left join public.care_store_orders o
        on o.vendor_id = vendor.id and o.status in ('pago','enviado','entregue')
       and o.created_at >= v_start and o.created_at < v_end
     where vendor.status = 'ativo'
     group by vendor.id, vendor.monthly_fee_cents
  ), ins as (
    insert into public.care_store_vendor_invoices(vendor_id, period, monthly_fee_cents, gross_sales_cents, commission_cents, orders_count, total_due_cents, due_date)
    select s.vendor_id, p_period, s.monthly_fee_cents, s.gross, s.commission, s.orders, s.monthly_fee_cents + s.commission,
           ((p_period || '-01')::date + interval '1 month' + interval '9 days')::date
      from sales s
     where s.monthly_fee_cents + s.commission > 0
    on conflict (vendor_id, period) do nothing
    returning 1)
  select count(*) into v_count from ins;
  return v_count;
end;
$$;
revoke all on function public.care_store_generate_invoices(text) from public, anon;
grant execute on function public.care_store_generate_invoices(text) to authenticated;

create or replace function public.care_store_admin_set_invoice_status(p_invoice uuid, p_status text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  if p_status not in ('pendente','pago','cancelado') then raise exception 'Status invalid'; end if;
  update public.care_store_vendor_invoices
     set status = p_status, paid_at = case when p_status = 'pago' then now() else null end
   where id = p_invoice;
  if not found then raise exception 'Invoice not found'; end if;
end;
$$;
revoke all on function public.care_store_admin_set_invoice_status(uuid,text) from public, anon;
grant execute on function public.care_store_admin_set_invoice_status(uuid,text) to authenticated;
