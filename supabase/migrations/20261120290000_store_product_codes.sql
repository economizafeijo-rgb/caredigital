-- Código de produto PRD-000123: único na plataforma, gerado pelo servidor e estável.
-- O código não muda depois de criado. Variações (cores) usam o código do produto + a cor.

create sequence if not exists public.care_store_product_code_seq;

alter table public.care_store_products add column if not exists code text;

-- Backfill: numera os produtos já existentes na ordem de criação.
do $$
declare r record;
begin
  for r in select id from public.care_store_products where code is null order by created_at, id loop
    update public.care_store_products
      set code = 'PRD-' || lpad(nextval('public.care_store_product_code_seq')::text, 6, '0')
      where id = r.id;
  end loop;
end $$;

alter table public.care_store_products alter column code set not null;
create unique index if not exists care_store_products_code_key on public.care_store_products(code);

-- Insert: o servidor sempre gera o código, ignorando o valor enviado pelo navegador.
create or replace function public.care_store_assign_product_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.code := 'PRD-' || lpad(nextval('public.care_store_product_code_seq')::text, 6, '0');
  return new;
end $$;

drop trigger if exists care_store_products_assign_code on public.care_store_products;
create trigger care_store_products_assign_code
  before insert on public.care_store_products
  for each row execute function public.care_store_assign_product_code();

-- Update: o código não pode ser trocado.
create or replace function public.care_store_lock_product_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.code is distinct from old.code then
    raise exception 'O código do produto não pode ser alterado.' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists care_store_products_lock_code on public.care_store_products;
create trigger care_store_products_lock_code
  before update on public.care_store_products
  for each row execute function public.care_store_lock_product_code();

-- Consulta de produto: só a equipe da própria loja. Busca por código exato ou parte do nome.
create or replace function public.care_store_product_lookup(p_vendor uuid, p_query text)
returns table(
  id uuid,
  code text,
  name text,
  price_cents integer,
  stock integer,
  active boolean,
  colors jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_q text := btrim(coalesce(p_query, ''));
begin
  if not public.care_store_is_staff(p_vendor) then
    raise exception 'Sem permissão para consultar os produtos desta loja.' using errcode = '42501';
  end if;
  if length(v_q) < 2 then
    return;
  end if;
  return query
    select p.id, p.code, p.name, p.price_cents, p.stock, p.active, p.colors
    from public.care_store_products p
    where p.vendor_id = p_vendor
      and (upper(p.code) = upper(v_q) or position(lower(v_q) in lower(p.name)) > 0)
    order by (upper(p.code) = upper(v_q)) desc, p.name
    limit 10;
end $$;

revoke all on function public.care_store_product_lookup(uuid, text) from public, anon;
grant execute on function public.care_store_product_lookup(uuid, text) to authenticated;
