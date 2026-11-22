-- Fluxo de compra: entrega por distância, valores mínimos (entrega e cartão), CPF e dados do cliente salvos.
alter table public.care_store_vendors
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists delivery_per_km_cents integer not null default 150 check (delivery_per_km_cents >= 0),
  add column if not exists delivery_max_km numeric(5,1) not null default 8 check (delivery_max_km > 0),
  add column if not exists min_delivery_order_cents integer not null default 3000 check (min_delivery_order_cents >= 0),
  add column if not exists min_card_order_cents integer not null default 5000 check (min_card_order_cents >= 0);

alter table public.care_store_orders
  add column if not exists customer_cpf text,
  add column if not exists address_city text,
  add column if not exists delivery_km numeric(5,1);

-- Dados do cliente para preencher o checkout sozinho nas próximas compras.
create table if not exists public.care_customer_checkout (
  user_id uuid primary key default auth.uid(),
  full_name text, cpf text, phone text, city text, address text,
  updated_at timestamptz not null default now()
);
alter table public.care_customer_checkout enable row level security;
drop policy if exists customer_checkout_own on public.care_customer_checkout;
create policy customer_checkout_own on public.care_customer_checkout for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.care_customer_checkout from anon;
grant select, insert, update on public.care_customer_checkout to authenticated;

create or replace function public.care_valid_cpf(p text) returns boolean
language plpgsql immutable as $$
declare d text := regexp_replace(coalesce(p, ''), '\D', '', 'g'); s int; r int; i int;
begin
  if char_length(d) <> 11 or d ~ '^(\d)\1{10}$' then return false; end if;
  for k in 9..10 loop
    s := 0;
    for i in 1..k loop s := s + substr(d, i, 1)::int * (k + 2 - i); end loop;
    r := (s * 10) % 11; if r = 10 then r := 0; end if;
    if r <> substr(d, k + 1, 1)::int then return false; end if;
  end loop;
  return true;
end $$;

-- Preço com entrega por distância (km em linha reta x 1,3 ≈ rota de moto).
create or replace function public.care_store_checkout_pricing(
  p_vendor_id uuid, p_items jsonb, p_fulfillment text, p_coupon text,
  p_city text, p_lat double precision, p_lng double precision
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_vendor public.care_store_vendors%rowtype;
  v_p jsonb;
  v_goods integer;
  v_km numeric := null;
  v_fee integer := 0;
  v_vlat double precision;
  v_vlng double precision;
begin
  v_p := public.care_store_cart_pricing(p_vendor_id, p_items, p_fulfillment, p_coupon);
  select * into v_vendor from public.care_store_vendors where id = p_vendor_id;
  v_goods := (v_p ->> 'goods_cents')::integer;
  if p_fulfillment = 'entrega' then
    if v_goods < v_vendor.min_delivery_order_cents then raise exception 'Delivery minimum'; end if;
    if lower(btrim(coalesce(p_city, ''))) <> lower(btrim(v_vendor.city)) then raise exception 'Delivery out of range'; end if;
    v_vlat := coalesce(v_vendor.lat, -8.1647);
    v_vlng := coalesce(v_vendor.lng, -70.3508);
    if p_lat is not null and p_lng is not null then
      v_km := round((6371 * 1.3 * 2 * asin(sqrt(
          power(sin(radians(p_lat - v_vlat) / 2), 2)
          + cos(radians(v_vlat)) * cos(radians(p_lat)) * power(sin(radians(p_lng - v_vlng) / 2), 2)
        )))::numeric, 1);
    else
      v_km := 2;
    end if;
    if v_km > v_vendor.delivery_max_km then raise exception 'Delivery out of range'; end if;
    v_fee := case when v_vendor.free_delivery_from_cents is not null and v_goods >= v_vendor.free_delivery_from_cents
                  then 0
                  else v_vendor.delivery_fee_cents + ceil(v_km)::integer * v_vendor.delivery_per_km_cents end;
  end if;
  return v_p || jsonb_build_object(
    'fee_cents', v_fee, 'total_cents', v_goods + v_fee, 'km', v_km,
    'min_card_cents', v_vendor.min_card_order_cents,
    'min_delivery_cents', v_vendor.min_delivery_order_cents,
    'max_km', v_vendor.delivery_max_km);
end $$;
revoke all on function public.care_store_checkout_pricing(uuid, jsonb, text, text, text, double precision, double precision) from public, anon, authenticated;

create or replace function public.care_store_quote_checkout(
  p_vendor_id uuid, p_items jsonb, p_fulfillment text, p_coupon text,
  p_city text default null, p_lat double precision default null, p_lng double precision default null
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  return public.care_store_checkout_pricing(p_vendor_id, p_items, p_fulfillment, p_coupon, p_city, p_lat, p_lng);
end $$;
revoke all on function public.care_store_quote_checkout(uuid, jsonb, text, text, text, double precision, double precision) from public, anon;
grant execute on function public.care_store_quote_checkout(uuid, jsonb, text, text, text, double precision, double precision) to authenticated;

create or replace function public.care_store_place_checkout(
  p_vendor_id uuid, p_items jsonb, p_fulfillment text, p_name text, p_phone text, p_cpf text,
  p_city text, p_address text, p_payment text, p_notes text default null, p_coupon text default null,
  p_lat double precision default null, p_lng double precision default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_p jsonb;
  v_line jsonb;
  v_id uuid;
  v_min_card integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_fulfillment not in ('entrega', 'retirada') or p_payment not in ('pix', 'cartao', 'dinheiro')
     or char_length(btrim(coalesce(p_name, ''))) < 3
     or char_length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 10 then
    raise exception 'Order fields invalid';
  end if;
  if not public.care_valid_cpf(p_cpf) then raise exception 'CPF invalid'; end if;
  if p_fulfillment = 'entrega' and char_length(btrim(coalesce(p_address, ''))) < 8 then
    raise exception 'Address required';
  end if;

  v_p := public.care_store_checkout_pricing(p_vendor_id, p_items, p_fulfillment, p_coupon, p_city, p_lat, p_lng);
  v_min_card := (v_p ->> 'min_card_cents')::integer;
  if p_payment = 'cartao' and (v_p ->> 'total_cents')::integer < v_min_card then raise exception 'Card minimum'; end if;

  perform set_config('nv.stock_reason', 'venda', true);
  for v_line in select * from jsonb_array_elements(v_p -> 'lines') loop
    update public.care_store_products
       set stock = stock - (v_line ->> 'qty')::integer, updated_at = now()
     where id = (v_line ->> 'id')::uuid;
  end loop;
  perform set_config('nv.stock_reason', '', true);

  insert into public.care_store_orders(user_id, customer_name, customer_email, customer_phone, customer_cpf, address, address_city,
      delivery_km, items, subtotal_cents, discount_cents, coupon_code, total_cents,
      payment_method, status, notes, vendor_id, fulfillment, delivery_fee_cents, commission_cents, vendor_net_cents)
  values (v_uid, btrim(p_name), nullif(lower(coalesce(auth.jwt() ->> 'email', '')), ''), btrim(p_phone),
      regexp_replace(p_cpf, '\D', '', 'g'),
      case when p_fulfillment = 'entrega' then btrim(p_address) else null end,
      nullif(btrim(coalesce(p_city, '')), ''), (v_p ->> 'km')::numeric,
      v_p -> 'lines',
      (v_p ->> 'subtotal_cents')::integer, (v_p ->> 'discount_cents')::integer, v_p ->> 'coupon_code',
      (v_p ->> 'total_cents')::integer,
      case when p_payment = 'dinheiro' then 'pix' else p_payment end, 'aguardando_pagamento',
      nullif(btrim(concat_ws(' · ',
        case when p_payment = 'dinheiro' then 'Pagar em dinheiro na retirada' end,
        nullif(btrim(coalesce(p_notes, '')), ''))), ''),
      p_vendor_id, p_fulfillment, (v_p ->> 'fee_cents')::integer, (v_p ->> 'commission_cents')::integer,
      -- O lojista recebe o líquido dos produtos; a entrega é repassada integralmente (moto da loja).
      (v_p ->> 'total_cents')::integer - (v_p ->> 'commission_cents')::integer)
  returning id into v_id;

  if v_p ->> 'coupon_id' is not null then
    insert into public.care_store_coupon_uses(coupon_id, user_id, order_id, discount_cents)
    values ((v_p ->> 'coupon_id')::uuid, v_uid, v_id, (v_p ->> 'discount_cents')::integer);
    update public.care_store_coupons set uses_count = uses_count + 1 where id = (v_p ->> 'coupon_id')::uuid;
  end if;

  insert into public.care_customer_checkout(user_id, full_name, cpf, phone, city, address, updated_at)
  values (v_uid, btrim(p_name), regexp_replace(p_cpf, '\D', '', 'g'), btrim(p_phone),
          nullif(btrim(coalesce(p_city, '')), ''), nullif(btrim(coalesce(p_address, '')), ''), now())
  on conflict (user_id) do update set full_name = excluded.full_name, cpf = excluded.cpf, phone = excluded.phone,
    city = excluded.city, address = coalesce(excluded.address, public.care_customer_checkout.address), updated_at = now();

  return v_id;
end $$;
revoke all on function public.care_store_place_checkout(uuid, jsonb, text, text, text, text, text, text, text, text, text, double precision, double precision) from public, anon;
grant execute on function public.care_store_place_checkout(uuid, jsonb, text, text, text, text, text, text, text, text, text, double precision, double precision) to authenticated;

-- As versões antigas ignoravam os mínimos: só o fluxo novo pode criar pedidos.
revoke execute on function public.care_store_place_order(uuid, jsonb, text, text, text, text, text, text, text) from authenticated;
revoke execute on function public.care_store_quote_order(uuid, jsonb, text, text) from authenticated;
