-- Medicamentos cadastrados pelo próprio cliente, com horários e registro de doses.
create table if not exists public.care_client_medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.care_patients(id) on delete cascade,
  owner_id uuid not null,
  created_by uuid not null default auth.uid(),
  name text not null check (char_length(name) between 2 and 80),
  category text not null default 'outros',
  dose text not null check (char_length(dose) between 1 and 60),
  times text[] not null check (cardinality(times) between 1 and 8),
  instructions text check (instructions is null or char_length(instructions) <= 300),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.care_client_medication_intakes (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.care_client_medications(id) on delete cascade,
  patient_id uuid not null references public.care_patients(id) on delete cascade,
  owner_id uuid not null,
  recorded_by uuid not null default auth.uid(),
  taken_on date not null,
  slot text not null,
  taken_at timestamptz not null default now(),
  unique (medication_id, taken_on, slot)
);
create index if not exists care_client_medications_patient_idx on public.care_client_medications(patient_id);
create index if not exists care_client_medication_intakes_day_idx on public.care_client_medication_intakes(patient_id, taken_on);
alter table public.care_client_medications enable row level security;
alter table public.care_client_medication_intakes enable row level security;
drop policy if exists client_medications_all on public.care_client_medications;
create policy client_medications_all on public.care_client_medications for all to authenticated
  using (public.care_can_access_patient(patient_id, owner_id))
  with check (public.care_can_access_patient(patient_id, owner_id));
drop policy if exists client_medication_intakes_all on public.care_client_medication_intakes;
create policy client_medication_intakes_all on public.care_client_medication_intakes for all to authenticated
  using (public.care_can_access_patient(patient_id, owner_id))
  with check (public.care_can_access_patient(patient_id, owner_id));
