-- Cupons e promoções da loja (desenho: docs/superpowers/specs/2026-11-21-cupons-promocoes-design.md)
-- O total do pedido passa a ser calculado no servidor. Cupom e promoção são validados aqui.

-- 1) Tabelas ---------------------------------------------------------------

create table if not exists public.care_store_coupons (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.care_store_vendors(id) on delete cascade,
  code text not null check (code = upper(code) and code ~ '^[A-Z0-9]{3,20}$'),
  occasion text not null default 'personalizada',
  kind text not null check (kind in ('percent', 'fixed')),
  value integer not null check (value > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  min_order_cents integer not null default 0 check (min_order_cents >= 0),
  max_uses integer check (max_uses is null or max_uses > 0),
  uses_count integer not null default 0 check (uses_count >= 0),
  per_customer_limit integer not null default 1 check (per_customer_limit > 0),
  scope text not null default 'loja' check (scope in ('loja', 'produtos')),
  product_ids uuid[] not null default '{}',
  status text not null default 'ativo' check (status in ('ativo', 'pausado', 'encerrado')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (kind <> 'percent' or value between 1 and 90),
  check (scope <> 'produtos' or cardinality(product_ids) > 0),
  unique (vendor_id, code)
);

create table if not exists public.care_store_promotions (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.care_store_vendors(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 3 and 80),
  occasion text not null default 'personalizada',
  percent integer not null check (percent between 1 and 90),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  product_ids uuid[] not null check (cardinality(product_ids) > 0),
  status text not null default 'ativo' check (status in ('ativo', 'pausado', 'encerrado')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.care_store_coupon_uses (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.care_store_coupons(id) on delete cascade,
  user_id uuid not null,
  order_id uuid references public.care_store_orders(id) on delete set null,
  discount_cents integer not null check (discount_cents >= 0),
  created_at timestamptz not null default now()
);
create index if not exists care_store_coupon_uses_coupon_user_idx on public.care_store_coupon_uses(coupon_id, user_id);
create index if not exists care_store_promotions_vendor_idx on public.care_store_promotions(vendor_id);

alter table public.care_store_orders
  add column if not exists subtotal_cents integer,
  add column if not exists discount_cents integer not null default 0,
  add column if not exists coupon_code text;

alter table public.care_store_coupons enable row level security;
alter table public.care_store_promotions enable row level security;
alter table public.care_store_coupon_uses enable row level security;

-- Leitura: dono vê os próprios cupons e promoções; qualquer pessoa vê promoções ativas no período.
drop policy if exists store_coupons_owner_read on public.care_store_coupons;
create policy store_coupons_owner_read on public.care_store_coupons for select to authenticated
  using (exists (select 1 from public.care_store_vendors v where v.id = vendor_id and v.owner_id = auth.uid()));

drop policy if exists store_promotions_owner_read on public.care_store_promotions;
create policy store_promotions_owner_read on public.care_store_promotions for select to authenticated
  using (exists (select 1 from public.care_store_vendors v where v.id = vendor_id and v.owner_id = auth.uid()));

drop policy if exists store_promotions_public_read on public.care_store_promotions;
create policy store_promotions_public_read on public.care_store_promotions for select to anon, authenticated
  using (status = 'ativo' and now() between starts_at and ends_at);

drop policy if exists store_coupon_uses_owner_read on public.care_store_coupon_uses;
create policy store_coupon_uses_owner_read on public.care_store_coupon_uses for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.care_store_coupons c
        join public.care_store_vendors v on v.id = c.vendor_id
       where c.id = coupon_id and v.owner_id = auth.uid()
    )
  );

-- Escrita só por funções (security definer). Nada de insert/update direto.
revoke all on public.care_store_coupons, public.care_store_promotions, public.care_store_coupon_uses from anon, authenticated;
grant select on public.care_store_coupons to authenticated;
grant select on public.care_store_promotions to anon, authenticated;
grant select on public.care_store_coupon_uses to authenticated;

-- 2) Cálculo do carrinho (uso interno) -------------------------------------
-- Regras:
--  * Preço do item = menor entre o preço atual e o preço com a promoção ativa (maior % entre promoções do produto).
--  * Cupom vale sobre o preço promocional; só um cupom por pedido.
--  * Escopo 'loja' = subtotal após promoções; 'produtos' = só itens elegíveis.
--  * Frete grátis compara com o valor dos produtos já com desconto.
--  * Comissão incide sobre os produtos já com desconto.

create or replace function public.care_store_cart_pricing(
  p_vendor_id uuid, p_items jsonb, p_fulfillment text, p_coupon text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_vendor public.care_store_vendors%rowtype;
  v_item jsonb;
  v_prod public.care_store_products%rowtype;
  v_qty integer;
  v_pct integer;
  v_unit integer;
  v_list integer := 0;
  v_after_promo integer := 0;
  v_lines jsonb := '[]'::jsonb;
  v_code text := nullif(upper(btrim(coalesce(p_coupon, ''))), '');
  v_coupon public.care_store_coupons%rowtype;
  v_coupon_id uuid := null;
  v_base integer := 0;
  v_discount integer := 0;
  v_goods integer;
  v_fee integer := 0;
  v_used integer;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'Cart invalid';
  end if;
  if p_fulfillment not in ('entrega', 'retirada') then raise exception 'Order fields invalid'; end if;

  select * into v_vendor from public.care_store_vendors where id = p_vendor_id and status = 'ativo';
  if not found then raise exception 'Vendor unavailable'; end if;
  if p_fulfillment = 'entrega' and not v_vendor.offers_delivery then raise exception 'Delivery not offered'; end if;
  if p_fulfillment = 'retirada' and not v_vendor.offers_pickup then raise exception 'Pickup not offered'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'qty')::integer;
    if v_qty is null or v_qty not between 1 and 20 then raise exception 'Quantity invalid'; end if;
    select * into v_prod from public.care_store_products
      where id = (v_item ->> 'product_id')::uuid and vendor_id = p_vendor_id and active for update;
    if not found then raise exception 'Product unavailable'; end if;
    if v_prod.availability <> 'auto' then raise exception 'Product unavailable'; end if;
    if v_prod.display_limit is not null and v_qty > v_prod.display_limit then raise exception 'Quantity invalid'; end if;
    if v_prod.stock < v_qty then raise exception 'Out of stock: %', v_prod.name; end if;

    select coalesce(max(pr.percent), 0) into v_pct
      from public.care_store_promotions pr
     where pr.vendor_id = p_vendor_id and pr.status = 'ativo'
       and now() between pr.starts_at and pr.ends_at
       and v_prod.id = any(pr.product_ids);

    v_unit := least(v_prod.price_cents, round(v_prod.price_cents * (100 - v_pct) / 100.0)::integer);
    v_list := v_list + v_prod.price_cents * v_qty;
    v_after_promo := v_after_promo + v_unit * v_qty;
    v_lines := v_lines || jsonb_build_object(
      'id', v_prod.id, 'name', v_prod.name, 'qty', v_qty,
      'price_cents', v_unit, 'list_price_cents', v_prod.price_cents, 'image_url', v_prod.image_url);
  end loop;

  if v_code is not null then
    select * into v_coupon from public.care_store_coupons
     where vendor_id = p_vendor_id and code = v_code for update;
    if not found then raise exception 'Coupon: not_found'; end if;
    if v_coupon.status <> 'ativo' then raise exception 'Coupon: inactive'; end if;
    if now() < v_coupon.starts_at then raise exception 'Coupon: not_started'; end if;
    if now() > v_coupon.ends_at then raise exception 'Coupon: expired'; end if;
    if v_coupon.max_uses is not null and v_coupon.uses_count >= v_coupon.max_uses then
      raise exception 'Coupon: exhausted';
    end if;
    select count(*) into v_used from public.care_store_coupon_uses
     where coupon_id = v_coupon.id and user_id = v_uid;
    if v_used >= v_coupon.per_customer_limit then raise exception 'Coupon: customer_limit'; end if;
    if v_after_promo < v_coupon.min_order_cents then raise exception 'Coupon: min_order'; end if;

    if v_coupon.scope = 'produtos' then
      select coalesce(sum((l ->> 'price_cents')::integer * (l ->> 'qty')::integer), 0) into v_base
        from jsonb_array_elements(v_lines) l
       where (l ->> 'id')::uuid = any(v_coupon.product_ids);
    else
      v_base := v_after_promo;
    end if;
    if v_base <= 0 then raise exception 'Coupon: not_eligible'; end if;

    v_discount := case when v_coupon.kind = 'percent'
                       then round(v_base * v_coupon.value / 100.0)::integer
                       else least(v_coupon.value, v_base) end;
    v_coupon_id := v_coupon.id;
  end if;

  v_goods := v_after_promo - v_discount;
  if p_fulfillment = 'entrega' then
    v_fee := case when v_vendor.free_delivery_from_cents is not null and v_goods >= v_vendor.free_delivery_from_cents
                  then 0 else v_vendor.delivery_fee_cents end;
  end if;

  return jsonb_build_object(
    'lines', v_lines,
    'list_cents', v_list,
    'promo_cents', v_list - v_after_promo,
    'subtotal_cents', v_after_promo,
    'discount_cents', v_discount,
    'coupon_id', v_coupon_id,
    'coupon_code', case when v_coupon_id is null then null else v_coupon.code end,
    'goods_cents', v_goods,
    'fee_cents', v_fee,
    'commission_cents', round(v_goods * v_vendor.commission_bps / 10000.0)::integer,
    'total_cents', v_goods + v_fee
  );
end;
$$;
revoke all on function public.care_store_cart_pricing(uuid, jsonb, text, text) from public, anon, authenticated;

-- 3) Cotação para o carrinho (sem gravar nada) -----------------------------

create or replace function public.care_store_quote_order(
  p_vendor_id uuid, p_items jsonb, p_fulfillment text default 'retirada', p_coupon text default null
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  return public.care_store_cart_pricing(p_vendor_id, p_items, p_fulfillment, p_coupon);
end;
$$;
revoke all on function public.care_store_quote_order(uuid, jsonb, text, text) from public, anon;
grant execute on function public.care_store_quote_order(uuid, jsonb, text, text) to authenticated;

-- 4) Pedido: total vem do servidor, uso do cupom gravado na mesma transação --

drop function if exists public.care_store_place_order(uuid, jsonb, text, text, text, text, text, text);

create or replace function public.care_store_place_order(
  p_vendor_id uuid, p_items jsonb, p_fulfillment text, p_name text, p_phone text,
  p_address text, p_payment text, p_notes text default null, p_coupon text default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_p jsonb;
  v_line jsonb;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_fulfillment not in ('entrega', 'retirada') or p_payment not in ('pix', 'cartao', 'boleto', 'dinheiro')
     or char_length(btrim(coalesce(p_name, ''))) < 3
     or char_length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 10 then
    raise exception 'Order fields invalid';
  end if;
  if p_fulfillment = 'entrega' and char_length(btrim(coalesce(p_address, ''))) < 8 then
    raise exception 'Address required';
  end if;

  v_p := public.care_store_cart_pricing(p_vendor_id, p_items, p_fulfillment, p_coupon);

  perform set_config('nv.stock_reason', 'venda', true);
  for v_line in select * from jsonb_array_elements(v_p -> 'lines') loop
    update public.care_store_products
       set stock = stock - (v_line ->> 'qty')::integer, updated_at = now()
     where id = (v_line ->> 'id')::uuid;
  end loop;
  perform set_config('nv.stock_reason', '', true);

  insert into public.care_store_orders(user_id, customer_name, customer_email, customer_phone, address, items,
      subtotal_cents, discount_cents, coupon_code, total_cents,
      payment_method, status, notes, vendor_id, fulfillment, delivery_fee_cents, commission_cents, vendor_net_cents)
  values (v_uid, btrim(p_name), nullif(lower(coalesce(auth.jwt() ->> 'email', '')), ''), btrim(p_phone),
      case when p_fulfillment = 'entrega' then btrim(p_address) else null end,
      v_p -> 'lines',
      (v_p ->> 'subtotal_cents')::integer, (v_p ->> 'discount_cents')::integer, v_p ->> 'coupon_code',
      (v_p ->> 'total_cents')::integer,
      case when p_payment = 'dinheiro' then 'pix' else p_payment end, 'aguardando_pagamento',
      nullif(btrim(concat_ws(' · ',
        case when p_payment = 'dinheiro' then 'Pagar em dinheiro na retirada' end,
        nullif(btrim(coalesce(p_notes, '')), ''))), ''),
      p_vendor_id, p_fulfillment, (v_p ->> 'fee_cents')::integer, (v_p ->> 'commission_cents')::integer,
      (v_p ->> 'total_cents')::integer - (v_p ->> 'commission_cents')::integer)
  returning id into v_id;

  if v_p ->> 'coupon_id' is not null then
    insert into public.care_store_coupon_uses(coupon_id, user_id, order_id, discount_cents)
    values ((v_p ->> 'coupon_id')::uuid, v_uid, v_id, (v_p ->> 'discount_cents')::integer);
    update public.care_store_coupons set uses_count = uses_count + 1 where id = (v_p ->> 'coupon_id')::uuid;
  end if;

  return v_id;
end;
$$;
revoke all on function public.care_store_place_order(uuid, jsonb, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.care_store_place_order(uuid, jsonb, text, text, text, text, text, text, text) to authenticated;

-- 5) Gestão (somente dono) -------------------------------------------------

create or replace function public.care_store_coupon_save(
  p_vendor_id uuid, p_id uuid, p_code text, p_occasion text, p_kind text, p_value integer,
  p_starts_at timestamptz, p_ends_at timestamptz, p_min_order_cents integer,
  p_max_uses integer, p_per_customer_limit integer, p_scope text, p_product_ids uuid[]
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_ids uuid[] := coalesce(p_product_ids, '{}');
begin
  if not exists (select 1 from public.care_store_vendors where id = p_vendor_id and owner_id = auth.uid()) then
    raise exception 'Not allowed';
  end if;
  if p_scope = 'produtos' and (cardinality(v_ids) = 0 or exists (
       select 1 from unnest(v_ids) pid
        where not exists (select 1 from public.care_store_products p where p.id = pid and p.vendor_id = p_vendor_id))) then
    raise exception 'Products invalid';
  end if;
  if p_scope <> 'produtos' then v_ids := '{}'; end if;

  if p_id is null then
    insert into public.care_store_coupons(vendor_id, code, occasion, kind, value, starts_at, ends_at,
        min_order_cents, max_uses, per_customer_limit, scope, product_ids)
    values (p_vendor_id, upper(btrim(p_code)), coalesce(p_occasion, 'personalizada'), p_kind, p_value,
        p_starts_at, p_ends_at, coalesce(p_min_order_cents, 0), p_max_uses, coalesce(p_per_customer_limit, 1),
        p_scope, v_ids)
    returning id into v_id;
  else
    update public.care_store_coupons
       set code = upper(btrim(p_code)), occasion = coalesce(p_occasion, occasion), kind = p_kind, value = p_value,
           starts_at = p_starts_at, ends_at = p_ends_at, min_order_cents = coalesce(p_min_order_cents, 0),
           max_uses = p_max_uses, per_customer_limit = coalesce(p_per_customer_limit, 1),
           scope = p_scope, product_ids = v_ids
     where id = p_id and vendor_id = p_vendor_id
    returning id into v_id;
    if v_id is null then raise exception 'Coupon not found'; end if;
  end if;
  return v_id;
end;
$$;
revoke all on function public.care_store_coupon_save(uuid, uuid, text, text, text, integer, timestamptz, timestamptz, integer, integer, integer, text, uuid[]) from public, anon;
grant execute on function public.care_store_coupon_save(uuid, uuid, text, text, text, integer, timestamptz, timestamptz, integer, integer, integer, text, uuid[]) to authenticated;

create or replace function public.care_store_coupon_set_status(p_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if p_status not in ('ativo', 'pausado', 'encerrado') then raise exception 'Status invalid'; end if;
  update public.care_store_coupons c set status = p_status
   where c.id = p_id
     and exists (select 1 from public.care_store_vendors v where v.id = c.vendor_id and v.owner_id = auth.uid());
  if not found then raise exception 'Coupon not found'; end if;
end;
$$;
revoke all on function public.care_store_coupon_set_status(uuid, text) from public, anon;
grant execute on function public.care_store_coupon_set_status(uuid, text) to authenticated;

create or replace function public.care_store_promotion_save(
  p_vendor_id uuid, p_id uuid, p_name text, p_occasion text, p_percent integer,
  p_starts_at timestamptz, p_ends_at timestamptz, p_product_ids uuid[]
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_ids uuid[] := coalesce(p_product_ids, '{}');
begin
  if not exists (select 1 from public.care_store_vendors where id = p_vendor_id and owner_id = auth.uid()) then
    raise exception 'Not allowed';
  end if;
  if cardinality(v_ids) = 0 or exists (
       select 1 from unnest(v_ids) pid
        where not exists (select 1 from public.care_store_products p where p.id = pid and p.vendor_id = p_vendor_id)) then
    raise exception 'Products invalid';
  end if;

  if p_id is null then
    insert into public.care_store_promotions(vendor_id, name, occasion, percent, starts_at, ends_at, product_ids)
    values (p_vendor_id, btrim(p_name), coalesce(p_occasion, 'personalizada'), p_percent, p_starts_at, p_ends_at, v_ids)
    returning id into v_id;
  else
    update public.care_store_promotions
       set name = btrim(p_name), occasion = coalesce(p_occasion, occasion), percent = p_percent,
           starts_at = p_starts_at, ends_at = p_ends_at, product_ids = v_ids
     where id = p_id and vendor_id = p_vendor_id
    returning id into v_id;
    if v_id is null then raise exception 'Promotion not found'; end if;
  end if;
  return v_id;
end;
$$;
revoke all on function public.care_store_promotion_save(uuid, uuid, text, text, integer, timestamptz, timestamptz, uuid[]) from public, anon;
grant execute on function public.care_store_promotion_save(uuid, uuid, text, text, integer, timestamptz, timestamptz, uuid[]) to authenticated;

create or replace function public.care_store_promotion_set_status(p_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if p_status not in ('ativo', 'pausado', 'encerrado') then raise exception 'Status invalid'; end if;
  update public.care_store_promotions p set status = p_status
   where p.id = p_id
     and exists (select 1 from public.care_store_vendors v where v.id = p.vendor_id and v.owner_id = auth.uid());
  if not found then raise exception 'Promotion not found'; end if;
end;
$$;
revoke all on function public.care_store_promotion_set_status(uuid, text) from public, anon;
grant execute on function public.care_store_promotion_set_status(uuid, text) to authenticated;
