-- Consulta de produto no chat da loja: dono e atendentes, com imagem e ficha completa.
-- Antes a função só aceitava atendentes (care_store_is_staff), então o dono recebia erro.

alter table public.care_store_products
  add column if not exists supplier_id uuid references public.care_store_contacts(id) on delete set null;

create index if not exists care_store_products_supplier_idx
  on public.care_store_products(supplier_id) where supplier_id is not null;

drop function if exists public.care_store_product_lookup(uuid, text);

create function public.care_store_product_lookup(p_vendor uuid, p_query text)
returns table(
  id uuid,
  code text,
  share_code text,
  name text,
  category text,
  description text,
  image_url text,
  price_cents integer,
  old_price_cents integer,
  cost_cents integer,
  stock integer,
  min_stock integer,
  unit text,
  sku text,
  ref text,
  active boolean,
  availability text,
  display_limit integer,
  featured boolean,
  colors jsonb,
  supplier_name text,
  supplier_phone text,
  supplier_email text,
  sold_30d integer,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_q text := btrim(coalesce(p_query, ''));
  v_digits text := regexp_replace(v_q, '\D', '', 'g');
  v_owner boolean;
begin
  if not public.care_store_can_attend(p_vendor) then
    raise exception 'Sem permissão para consultar os produtos desta loja.' using errcode = '42501';
  end if;
  if length(v_q) < 2 then
    return;
  end if;
  v_owner := public.care_store_is_owner(p_vendor);

  return query
    select p.id, p.code, p.share_code, p.name, p.category, p.description, p.image_url,
           p.price_cents, p.old_price_cents,
           case when v_owner then p.cost_cents end,
           p.stock, p.min_stock, p.unit, p.sku, p.ref, p.active,
           p.availability::text, p.display_limit, coalesce(p.featured, false), p.colors,
           s.name, s.phone, s.email,
           coalesce((
             select sum(coalesce((it->>'qty')::int, (it->>'quantity')::int, 0))::int
             from public.care_store_orders o,
                  jsonb_array_elements(case when jsonb_typeof(o.items) = 'array' then o.items else '[]'::jsonb end) it
             where o.vendor_id = p_vendor
               and o.created_at > now() - interval '30 days'
               and coalesce(o.status, '') not in ('cancelado', 'cancelled', 'canceled')
               and coalesce(it->>'product_id', it->>'id') = p.id::text
           ), 0),
           p.updated_at
    from public.care_store_products p
    left join public.care_store_contacts s on s.id = p.supplier_id and s.vendor_id = p.vendor_id
    where p.vendor_id = p_vendor
      and (
        upper(p.code) = upper(v_q)
        or lower(coalesce(p.share_code, '')) = lower(v_q)
        or upper(coalesce(p.sku, '')) = upper(v_q)
        or (length(v_digits) between 1 and 6
            and length(v_q) - length(v_digits) <= 4
            and ltrim(regexp_replace(p.code, '\D', '', 'g'), '0') = ltrim(v_digits, '0'))
        or position(lower(v_q) in lower(p.name)) > 0
        or position(lower(v_q) in lower(coalesce(p.ref, ''))) > 0
      )
    order by (upper(p.code) = upper(v_q)
              or ltrim(regexp_replace(p.code, '\D', '', 'g'), '0') = ltrim(v_digits, '0')) desc,
             p.active desc, p.name
    limit 10;
end $$;

revoke all on function public.care_store_product_lookup(uuid, text) from public, anon;
grant execute on function public.care_store_product_lookup(uuid, text) to authenticated;
