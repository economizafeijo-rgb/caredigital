-- Central de suplementação: plano pessoal e registro de doses tomadas.
create table if not exists public.care_supplement_plans (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.care_patients(id) on delete cascade,
  owner_id uuid not null,
  created_by uuid not null default auth.uid(),
  name text not null check (char_length(name) between 2 and 80),
  kind text not null default 'outro',
  dose numeric(8,2) not null check (dose > 0 and dose <= 100000),
  unit text not null default 'g' check (unit in ('g','mg','mcg','UI','cápsula','comprimido','ml','scoop')),
  times text[] not null default '{}' check (cardinality(times) between 1 and 6),
  with_food boolean not null default false,
  notes text check (notes is null or char_length(notes) <= 300),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.care_supplement_intakes (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.care_supplement_plans(id) on delete cascade,
  patient_id uuid not null references public.care_patients(id) on delete cascade,
  owner_id uuid not null,
  recorded_by uuid not null default auth.uid(),
  taken_on date not null,
  slot text not null,
  taken_at timestamptz not null default now(),
  unique (plan_id, taken_on, slot)
);
create index if not exists care_supplement_plans_patient_idx on public.care_supplement_plans(patient_id);
create index if not exists care_supplement_intakes_patient_day_idx on public.care_supplement_intakes(patient_id, taken_on);

create or replace function public.care_can_access_patient(p_patient uuid, p_owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.care_patients p
    where p.id = p_patient and p.owner_id = p_owner
      and (p.owner_id = auth.uid() or exists (
        select 1 from public.care_patient_access a
        where a.patient_id = p.id and a.owner_id = p.owner_id and a.user_id = auth.uid())));
$$;
revoke all on function public.care_can_access_patient(uuid, uuid) from public;
grant execute on function public.care_can_access_patient(uuid, uuid) to authenticated;

alter table public.care_supplement_plans enable row level security;
alter table public.care_supplement_intakes enable row level security;

drop policy if exists supplement_plans_select on public.care_supplement_plans;
drop policy if exists supplement_plans_insert on public.care_supplement_plans;
drop policy if exists supplement_plans_update on public.care_supplement_plans;
drop policy if exists supplement_plans_delete on public.care_supplement_plans;
drop policy if exists supplement_intakes_select on public.care_supplement_intakes;
drop policy if exists supplement_intakes_insert on public.care_supplement_intakes;
drop policy if exists supplement_intakes_delete on public.care_supplement_intakes;

create policy supplement_plans_select on public.care_supplement_plans for select to authenticated
  using (public.care_can_access_patient(patient_id, owner_id));
create policy supplement_plans_insert on public.care_supplement_plans for insert to authenticated
  with check (created_by = auth.uid() and public.care_can_access_patient(patient_id, owner_id));
create policy supplement_plans_update on public.care_supplement_plans for update to authenticated
  using (public.care_can_access_patient(patient_id, owner_id))
  with check (public.care_can_access_patient(patient_id, owner_id));
create policy supplement_plans_delete on public.care_supplement_plans for delete to authenticated
  using (public.care_can_access_patient(patient_id, owner_id));

create policy supplement_intakes_select on public.care_supplement_intakes for select to authenticated
  using (public.care_can_access_patient(patient_id, owner_id));
create policy supplement_intakes_insert on public.care_supplement_intakes for insert to authenticated
  with check (recorded_by = auth.uid() and public.care_can_access_patient(patient_id, owner_id)
    and exists (select 1 from public.care_supplement_plans s where s.id = plan_id and s.patient_id = care_supplement_intakes.patient_id));
create policy supplement_intakes_delete on public.care_supplement_intakes for delete to authenticated
  using (public.care_can_access_patient(patient_id, owner_id));
