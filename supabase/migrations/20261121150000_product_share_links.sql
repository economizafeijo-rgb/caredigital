-- Link curto de produto: nextvita.life/p/<share_code>
-- Código aleatório de 6 caracteres (sem letras ambíguas), único, gerado pelo servidor e imutável.

alter table public.care_store_products add column if not exists share_code text;

create or replace function public.care_store_random_share_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  c text;
  i int;
begin
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.care_store_products where share_code = c);
  end loop;
  return c;
end $$;

-- Backfill dos produtos já existentes.
update public.care_store_products
  set share_code = public.care_store_random_share_code()
  where share_code is null;

alter table public.care_store_products alter column share_code set not null;
create unique index if not exists care_store_products_share_code_key on public.care_store_products(share_code);

-- Insert: o servidor sempre gera o código, ignorando o valor enviado pelo navegador.
create or replace function public.care_store_assign_share_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.share_code := public.care_store_random_share_code();
  return new;
end $$;

drop trigger if exists care_store_products_assign_share_code on public.care_store_products;
create trigger care_store_products_assign_share_code
  before insert on public.care_store_products
  for each row execute function public.care_store_assign_share_code();

-- Update: o código de compartilhamento não pode ser trocado (links já enviados continuam válidos).
create or replace function public.care_store_lock_share_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.share_code is distinct from old.share_code then
    raise exception 'O link do produto não pode ser alterado.' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists care_store_products_lock_share_code on public.care_store_products;
create trigger care_store_products_lock_share_code
  before update on public.care_store_products
  for each row execute function public.care_store_lock_share_code();
