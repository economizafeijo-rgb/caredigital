-- Painel do administrador: visão das lojas ativas e dashboard somente leitura de cada loja.
-- Tudo por funções security definer que exigem a conta do administrador da plataforma.

create or replace function public.care_admin_store_overview()
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(t) order by t.sales_30d_cents desc, t.name) from (
      select v.id, v.name, v.slug, v.city, v.logo_url, v.plan, v.is_open, v.verified,
        coalesce((select sum(o.total_cents) from public.care_store_orders o
                   where o.vendor_id = v.id and o.created_at > now() - interval '30 days'
                     and o.status <> 'aguardando_pagamento'), 0)::bigint as sales_30d_cents,
        (select count(*) from public.care_store_orders o
          where o.vendor_id = v.id and o.created_at > now() - interval '30 days')::int as orders_30d,
        (select count(*) from public.care_store_orders o
          where o.vendor_id = v.id and o.status in ('pago','separando')) ::int as open_orders,
        (select max(o.created_at) from public.care_store_orders o where o.vendor_id = v.id) as last_order_at
      from public.care_store_vendors v
      where v.status = 'ativo'
    ) t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.care_admin_store_dashboard(p_vendor uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, auth, pg_temp
as $$
declare
  v_today date := (now() at time zone 'America/Rio_Branco')::date;
  v_vendor jsonb;
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  select to_jsonb(v) - 'owner_id' into v_vendor from public.care_store_vendors v where v.id = p_vendor;
  if v_vendor is null then raise exception 'Loja não encontrada'; end if;

  return jsonb_build_object(
    'vendor', v_vendor,
    'owner_email', (select lower(u.email) from auth.users u
                     where u.id = (select owner_id from public.care_store_vendors where id = p_vendor)),
    'kpis', (select jsonb_build_object(
        'sales_today_cents', coalesce(sum(o.total_cents) filter (
            where (o.created_at at time zone 'America/Rio_Branco')::date = v_today
              and o.status <> 'aguardando_pagamento'), 0),
        'sales_30d_cents', coalesce(sum(o.total_cents) filter (
            where o.created_at > now() - interval '30 days' and o.status <> 'aguardando_pagamento'), 0),
        'orders_30d', count(*) filter (where o.created_at > now() - interval '30 days'),
        'avg_ticket_30d_cents', coalesce(round(avg(o.total_cents) filter (
            where o.created_at > now() - interval '30 days' and o.status <> 'aguardando_pagamento')), 0),
        'delivered_30d', count(*) filter (where o.status = 'entregue' and o.created_at > now() - interval '30 days'),
        'open_orders', count(*) filter (where o.status in ('pago','separando'))
      ) from public.care_store_orders o where o.vendor_id = p_vendor),
    'orders_by_status', coalesce((
        select jsonb_object_agg(s.status, s.n) from (
          select status, count(*) n from public.care_store_orders
           where vendor_id = p_vendor and created_at > now() - interval '30 days' group by status) s), '{}'::jsonb),
    'recent_orders', coalesce((
        select jsonb_agg(row_to_json(r)) from (
          select o.id, o.order_number, o.customer_name, o.total_cents, o.status, o.fulfillment, o.created_at
            from public.care_store_orders o where o.vendor_id = p_vendor
           order by o.created_at desc limit 20) r), '[]'::jsonb),
    'low_stock', coalesce((
        select jsonb_agg(row_to_json(r)) from (
          select p.id, p.name, p.code, p.stock, p.min_stock, p.unit
            from public.care_store_products p
           where p.vendor_id = p_vendor and p.active and p.stock <= coalesce(p.min_stock, 3)
           order by p.stock, p.name limit 30) r), '[]'::jsonb),
    'products', (select jsonb_build_object(
        'active', count(*) filter (where active),
        'inactive', count(*) filter (where not active),
        'out_of_stock', count(*) filter (where active and stock <= 0))
        from public.care_store_products where vendor_id = p_vendor),
    'staff', coalesce((
        select jsonb_agg(jsonb_build_object('name', s.name, 'email', s.email, 'role', s.role, 'active', s.active))
          from public.care_store_staff s
         where s.vendor_id = p_vendor), '[]'::jsonb),
    'cash_closings', coalesce((
        select jsonb_agg(row_to_json(c) order by c.day desc) from (
          select day, entradas_cents, saidas_cents, expected_cents, counted_cents, diff_cents
            from public.care_store_cash_closings where vendor_id = p_vendor order by day desc limit 7) c), '[]'::jsonb),
    'open_disputes', (select count(*) from public.care_store_disputes d
                       where d.vendor_id = p_vendor and d.status = 'aberta')
  );
end;
$$;

revoke all on function public.care_admin_store_overview() from public, anon;
revoke all on function public.care_admin_store_dashboard(uuid) from public, anon;
grant execute on function public.care_admin_store_overview() to authenticated;
grant execute on function public.care_admin_store_dashboard(uuid) to authenticated;
