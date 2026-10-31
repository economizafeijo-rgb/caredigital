-- CareDigital: estrutura inicial multiusuário com isolamento por proprietário.
-- Execute no SQL Editor do projeto Supabase correto, depois de revisar.
create extension if not exists pgcrypto;

create table if not exists public.care_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '',
 created_at timestamptz not null default now()
);
create table if not exists public.care_patients (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 full_name text not null,
 birth_date date,
 condition_notes text,
 status text not null default 'estavel' check (status in ('estavel','atencao','critico')),
 created_at timestamptz not null default now(),
 unique(id,owner_id)
);
create table if not exists public.care_medications (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null,
 dose text,
 route text,
 kind text not null default 'medicamento' check(kind in ('medicamento','natural','suplemento')),
 stock numeric(12,2) check(stock is null or stock >= 0),
 notes text,
 created_at timestamptz not null default now(),
 unique(id,owner_id)
);
create table if not exists public.care_doses (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 patient_id uuid not null,
 medication_id uuid not null,
 scheduled_at timestamptz not null,
 status text not null default 'pendente' check(status in ('pendente','confirmada','adiada','ignorada')),
 completed_at timestamptz,
 notes text,
 created_at timestamptz not null default now(),
 foreign key (patient_id,owner_id) references public.care_patients(id,owner_id) on delete cascade,
 foreign key (medication_id,owner_id) references public.care_medications(id,owner_id) on delete cascade
);
create table if not exists public.care_protocols (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null,
 category text not null default 'tratamento',
 description text,
 steps jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now(),
 unique(id,owner_id)
);
create table if not exists public.care_patient_protocols (
 owner_id uuid not null references auth.users(id) on delete cascade,
 patient_id uuid not null,
 protocol_id uuid not null,
 started_at date not null default current_date,
 primary key(patient_id,protocol_id),
 foreign key (patient_id,owner_id) references public.care_patients(id,owner_id) on delete cascade,
 foreign key (protocol_id,owner_id) references public.care_protocols(id,owner_id) on delete cascade
);
create table if not exists public.care_diets (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null,
 goal text,
 daily_kcal integer check(daily_kcal is null or daily_kcal >= 0),
 water_target_ml integer check(water_target_ml is null or water_target_ml >= 0),
 created_at timestamptz not null default now(),
 unique(id,owner_id)
);
create table if not exists public.care_meals (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 diet_id uuid not null,
 meal_time time not null,
 name text not null,
 items text,
 kcal integer check(kcal is null or kcal >= 0),
 foreign key (diet_id,owner_id) references public.care_diets(id,owner_id) on delete cascade
);
create table if not exists public.care_patient_diets (
 owner_id uuid not null references auth.users(id) on delete cascade,
 patient_id uuid not null,
 diet_id uuid not null,
 primary key(patient_id,diet_id),
 foreign key(patient_id,owner_id) references public.care_patients(id,owner_id) on delete cascade,
 foreign key(diet_id,owner_id) references public.care_diets(id,owner_id) on delete cascade
);
create table if not exists public.care_team (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null,
 email text,
 role text not null check(role in ('administrador','enfermeiro','cuidador','medico','nutricionista','familiar')),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.care_hydration (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 patient_id uuid not null,
 amount_ml integer not null check(amount_ml > 0),
 recorded_at timestamptz not null default now(),
 foreign key(patient_id,owner_id) references public.care_patients(id,owner_id) on delete cascade
);
create index if not exists care_doses_owner_schedule_idx on public.care_doses(owner_id,scheduled_at);
create index if not exists care_hydration_owner_time_idx on public.care_hydration(owner_id,recorded_at);

-- Restrição de leitura/escrita ao dono autenticado; equipe cadastrada NÃO recebe acesso automático.
alter table public.care_profiles enable row level security;
drop policy if exists care_profiles_owner on public.care_profiles;
create policy care_profiles_owner on public.care_profiles for all to authenticated
 using (id = (select auth.uid())) with check(id = (select auth.uid()));

do $$
declare tbl text;
begin
 foreach tbl in array array['care_patients','care_medications','care_doses','care_protocols','care_patient_protocols','care_diets','care_meals','care_patient_diets','care_team','care_hydration']
 loop
  execute format('alter table public.%I enable row level security', tbl);
  execute format('drop policy if exists owner_only on public.%I', tbl);
  execute format('create policy owner_only on public.%I for all to authenticated using (owner_id = (select auth.uid())) with check(owner_id = (select auth.uid()))', tbl);
 end loop;
end $$;

revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select,insert,update,delete on public.care_profiles,public.care_patients,public.care_medications,public.care_doses,public.care_protocols,public.care_patient_protocols,public.care_diets,public.care_meals,public.care_patient_diets,public.care_team,public.care_hydration to authenticated;
