-- Taxa de entrega mínima de R$ 10 (exceto quando a entrega é grátis pelo valor do pedido).
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
                  else greatest(1000, v_vendor.delivery_fee_cents + ceil(v_km)::integer * v_vendor.delivery_per_km_cents) end;
  end if;
  return v_p || jsonb_build_object(
    'fee_cents', v_fee, 'total_cents', v_goods + v_fee, 'km', v_km,
    'min_card_cents', v_vendor.min_card_order_cents,
    'min_delivery_cents', v_vendor.min_delivery_order_cents,
    'max_km', v_vendor.delivery_max_km);
end $$;
revoke all on function public.care_store_checkout_pricing(uuid, jsonb, text, text, text, double precision, double precision) from public, anon, authenticated;

