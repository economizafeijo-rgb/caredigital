create table if not exists public.professional_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  email text not null,
  role text not null default 'professional' check (role in (
    'platform_admin', 'professional', 'physician', 'dietitian', 'fitness_trainer', 'nurse', 'caregiver'
  )),
  specialty text,
  is_active boolean not null default true,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.care_clients (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(display_name) between 1 and 120),
  client_type text not null default 'patient' check (client_type in ('patient', 'fitness')),
  age_years smallint check (age_years between 0 and 130),
  sex_for_reference text not null default 'unspecified' check (sex_for_reference in ('female', 'male', 'intersex', 'unspecified')),
  height_cm numeric(5,1) check (height_cm between 80 and 250),
  weight_kg numeric(5,1) check (weight_kg between 20 and 400),
  goal text not null default 'maintenance' check (goal in ('maintenance', 'hypertrophy', 'weight_loss', 'weight_gain', 'digestive_support')),
  condition_summary text not null default '' check (char_length(condition_summary) <= 1000),
  hydration_target_ml integer check (hydration_target_ml between 250 and 6000),
  assigned_professional_id uuid not null references public.professional_profiles(user_id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists care_clients_assigned_professional_idx on public.care_clients (assigned_professional_id, updated_at desc);
create index if not exists care_clients_type_goal_idx on public.care_clients (client_type, goal);

create or replace function public.has_platform_admin_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.professional_profiles
    where user_id = (select auth.uid()) and role = 'platform_admin' and is_active
  );
$$;

revoke all on function public.has_platform_admin_role() from public;
grant execute on function public.has_platform_admin_role() to authenticated;

create or replace function public.has_active_professional_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.professional_profiles
    where user_id = (select auth.uid()) and is_active
  );
$$;

revoke all on function public.has_active_professional_role() from public;
grant execute on function public.has_active_professional_role() to authenticated;

create or replace function public.create_professional_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.professional_profiles (user_id, display_name, email, role)
  values (
    new.id,
    coalesce(nullif(left(new.raw_user_meta_data ->> 'display_name', 120), ''), split_part(coalesce(new.email, ''), '@', 1), 'Profissional'),
    coalesce(new.email, ''),
    'professional'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_professional_profile on auth.users;
create trigger on_auth_user_created_professional_profile
  after insert on auth.users
  for each row execute function public.create_professional_profile_for_auth_user();

insert into public.professional_profiles (user_id, display_name, email, role)
select
  u.id,
  coalesce(nullif(left(u.raw_user_meta_data ->> 'display_name', 120), ''), split_part(coalesce(u.email, ''), '@', 1), 'Profissional'),
  coalesce(u.email, ''),
  'professional'
from auth.users u
on conflict (user_id) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists professional_profiles_set_updated_at on public.professional_profiles;
create trigger professional_profiles_set_updated_at before update on public.professional_profiles
for each row execute function public.set_updated_at();
drop trigger if exists care_clients_set_updated_at on public.care_clients;
create trigger care_clients_set_updated_at before update on public.care_clients
for each row execute function public.set_updated_at();

alter table public.professional_profiles enable row level security;
alter table public.care_clients enable row level security;

drop policy if exists "Users can read their own professional profile" on public.professional_profiles;
create policy "Users can read their own professional profile"
  on public.professional_profiles for select to authenticated
  using (user_id = (select auth.uid()) or public.has_platform_admin_role());

drop policy if exists "Platform admins manage professional profiles" on public.professional_profiles;
create policy "Platform admins manage professional profiles"
  on public.professional_profiles for update to authenticated
  using (public.has_platform_admin_role())
  with check (public.has_platform_admin_role());

drop policy if exists "Professionals read assigned clients" on public.care_clients;
create policy "Professionals read assigned clients"
  on public.care_clients for select to authenticated
  using ((assigned_professional_id = (select auth.uid()) and public.has_active_professional_role()) or public.has_platform_admin_role());

drop policy if exists "Professionals create assigned clients" on public.care_clients;
create policy "Professionals create assigned clients"
  on public.care_clients for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.has_active_professional_role()
    and (
      assigned_professional_id = (select auth.uid())
      or public.has_platform_admin_role()
    )
    and exists (
      select 1 from public.professional_profiles p
      where p.user_id = assigned_professional_id and p.is_active
    )
  );

drop policy if exists "Professionals update assigned clients" on public.care_clients;
create policy "Professionals update assigned clients"
  on public.care_clients for update to authenticated
  using ((assigned_professional_id = (select auth.uid()) and public.has_active_professional_role()) or public.has_platform_admin_role())
  with check (
    (((assigned_professional_id = (select auth.uid()) and public.has_active_professional_role()) and created_by = (select auth.uid())) or public.has_platform_admin_role())
    and exists (
      select 1 from public.professional_profiles p
      where p.user_id = assigned_professional_id and p.is_active
    )
  );

drop policy if exists "Professionals delete assigned clients" on public.care_clients;
create policy "Professionals delete assigned clients"
  on public.care_clients for delete to authenticated
  using ((assigned_professional_id = (select auth.uid()) and public.has_active_professional_role()) or public.has_platform_admin_role());

grant select, update on public.professional_profiles to authenticated;
grant select, insert, update, delete on public.care_clients to authenticated;

