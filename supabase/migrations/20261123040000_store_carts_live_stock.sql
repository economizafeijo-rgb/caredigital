-- Carrinho salvo na conta do cliente (por loja) e estoque em tempo real na vitrine.
create table if not exists public.care_store_carts (
  user_id uuid not null default auth.uid(),
  vendor_id uuid not null references public.care_store_vendors(id) on delete cascade,
  lines jsonb not null default '[]'::jsonb check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) <= 60),
  updated_at timestamptz not null default now(),
  primary key (user_id, vendor_id)
);
alter table public.care_store_carts enable row level security;
drop policy if exists carts_own on public.care_store_carts;
create policy carts_own on public.care_store_carts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.care_store_carts to authenticated;

-- A vitrine recebe mudanças de estoque, preço e disponibilidade na hora.
do $do$
begin
  if not exists (select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'care_store_products') then
    alter publication supabase_realtime add table public.care_store_products;
  end if;
end $do$;
