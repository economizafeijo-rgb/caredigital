-- Loja virtual NextVita: pedidos. O cliente cria e vê os próprios pedidos; o administrador vê e atualiza todos.
create table if not exists public.care_store_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  customer_name text not null,
  customer_email text,
  customer_phone text not null,
  address text,
  items jsonb not null,
  total_cents integer not null check (total_cents >= 0),
  payment_method text not null check (payment_method in ('pix','cartao','boleto')),
  status text not null default 'aguardando_pagamento' check (status in ('aguardando_pagamento','pago','enviado','entregue','cancelado')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists care_store_orders_user_idx on public.care_store_orders(user_id, created_at desc);
create index if not exists care_store_orders_status_idx on public.care_store_orders(status, created_at desc);
alter table public.care_store_orders enable row level security;

drop policy if exists store_orders_insert_own on public.care_store_orders;
create policy store_orders_insert_own on public.care_store_orders for insert to authenticated
  with check (user_id = auth.uid() and status = 'aguardando_pagamento');
drop policy if exists store_orders_select on public.care_store_orders;
create policy store_orders_select on public.care_store_orders for select to authenticated
  using (user_id = auth.uid() or public.is_nextvita_platform_admin());
drop policy if exists store_orders_admin_update on public.care_store_orders;
create policy store_orders_admin_update on public.care_store_orders for update to authenticated
  using (public.is_nextvita_platform_admin()) with check (public.is_nextvita_platform_admin());
