-- Área administrativa: propagandas (banners) e configuração do sistema de pagamento.
create table if not exists public.care_ads (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 80),
  subtitle text check (subtitle is null or char_length(subtitle) <= 160),
  cta_label text check (cta_label is null or char_length(cta_label) <= 30),
  link_url text check (link_url is null or link_url ~* '^(https?://|/)'),
  image_url text check (image_url is null or image_url ~* '^(https?://|/)'),
  placement text not null default 'loja' check (placement in ('inicio','loja','cliente','lojista')),
  vendor_id uuid references public.care_store_vendors(id) on delete set null,
  starts_on date,
  ends_on date,
  priority integer not null default 0 check (priority between 0 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
alter table public.care_ads enable row level security;
drop policy if exists ads_public_read on public.care_ads;
drop policy if exists ads_admin_all on public.care_ads;
create policy ads_public_read on public.care_ads for select to anon, authenticated
  using (active and (starts_on is null or starts_on <= (now() at time zone 'America/Rio_Branco')::date)
              and (ends_on is null or ends_on >= (now() at time zone 'America/Rio_Branco')::date));
create policy ads_admin_all on public.care_ads for all to authenticated
  using (public.is_nextvita_platform_admin()) with check (public.is_nextvita_platform_admin());
grant select on public.care_ads to anon, authenticated;
grant insert, update, delete on public.care_ads to authenticated;

-- Configuração única de cobrança da plataforma. Chaves secretas de gateway NÃO ficam aqui (vão em segredos do servidor).
create table if not exists public.care_platform_settings (
  id boolean primary key default true check (id),
  pix_key text check (pix_key is null or char_length(pix_key) between 3 and 120),
  pix_holder text check (pix_holder is null or char_length(pix_holder) <= 80),
  pix_city text check (pix_city is null or char_length(pix_city) <= 60),
  accept_pix boolean not null default true,
  accept_card boolean not null default false,
  accept_boleto boolean not null default false,
  accept_cash boolean not null default true,
  default_commission_bps integer not null default 1000 check (default_commission_bps between 0 and 5000),
  fee_basico_cents integer not null default 0 check (fee_basico_cents >= 0),
  fee_vitrine_cents integer not null default 2990 check (fee_vitrine_cents >= 0),
  fee_destaque_cents integer not null default 5990 check (fee_destaque_cents >= 0),
  due_day integer not null default 10 check (due_day between 1 and 28),
  updated_at timestamptz not null default now()
);
insert into public.care_platform_settings (id) values (true) on conflict do nothing;
alter table public.care_platform_settings enable row level security;
drop policy if exists settings_admin_all on public.care_platform_settings;
create policy settings_admin_all on public.care_platform_settings for all to authenticated
  using (public.is_nextvita_platform_admin()) with check (public.is_nextvita_platform_admin());
grant select, update on public.care_platform_settings to authenticated;
