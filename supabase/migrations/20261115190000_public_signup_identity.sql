-- NextVita public signup identity data. CPF and phone are private owner data.
create table if not exists public.care_identity_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cpf text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint care_identity_profiles_cpf_format check (cpf ~ '^[0-9]{11}$'),
  constraint care_identity_profiles_phone_format check (phone ~ '^[0-9]{10,11}$')
);

create unique index if not exists care_identity_profiles_cpf_uidx on public.care_identity_profiles(cpf);

alter table public.care_identity_profiles enable row level security;
revoke all on public.care_identity_profiles from anon;
grant select, insert, update on public.care_identity_profiles to authenticated;

drop policy if exists care_identity_profiles_owner on public.care_identity_profiles;
create policy care_identity_profiles_owner on public.care_identity_profiles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.set_care_identity_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists care_identity_profiles_updated_at on public.care_identity_profiles;
create trigger care_identity_profiles_updated_at
before update on public.care_identity_profiles
for each row execute function public.set_care_identity_profiles_updated_at();

-- Public users must not be classified as professionals by the legacy auth trigger.
create or replace function public.create_professional_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'account_type', 'professional') <> 'professional' then
    return new;
  end if;
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
