-- Historical body measurements; intentionally not a substitute for a medical assessment.
create table if not exists public.care_body_measurements (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.care_patients(id) on delete cascade,
  owner_id uuid not null,
  recorded_by uuid not null default auth.uid(),
  recorded_on date not null default current_date,
  weight_kg numeric(6,2) not null check (weight_kg between 20 and 350),
  height_cm numeric(5,1) not null check (height_cm between 100 and 230),
  created_at timestamptz not null default now(),
  unique(patient_id,recorded_on)
);
create index if not exists care_body_measurements_patient_date_idx on public.care_body_measurements(patient_id,recorded_on desc);
alter table public.care_body_measurements enable row level security;
create policy "body_measurements_read" on public.care_body_measurements
for select to authenticated using (
  exists(select 1 from public.care_patients p where p.id=patient_id and p.owner_id=owner_id
    and (p.owner_id=(select auth.uid()) or exists(select 1 from public.care_patient_access a
      where a.patient_id=p.id and a.owner_id=p.owner_id and a.user_id=(select auth.uid()))))
);
create policy "body_measurements_insert" on public.care_body_measurements
for insert to authenticated with check (
  recorded_by=(select auth.uid()) and
  exists(select 1 from public.care_patients p where p.id=patient_id and p.owner_id=owner_id
    and (p.owner_id=(select auth.uid()) or exists(select 1 from public.care_patient_access a
      where a.patient_id=p.id and a.owner_id=p.owner_id and a.user_id=(select auth.uid()))))
);
create policy "body_measurements_update" on public.care_body_measurements
for update to authenticated using (
  exists(select 1 from public.care_patients p where p.id=patient_id and p.owner_id=owner_id
    and (p.owner_id=(select auth.uid()) or exists(select 1 from public.care_patient_access a
      where a.patient_id=p.id and a.owner_id=p.owner_id and a.user_id=(select auth.uid()))))
) with check (
  recorded_by=(select auth.uid()) and
  exists(select 1 from public.care_patients p where p.id=patient_id and p.owner_id=owner_id
    and (p.owner_id=(select auth.uid()) or exists(select 1 from public.care_patient_access a
      where a.patient_id=p.id and a.owner_id=p.owner_id and a.user_id=(select auth.uid()))))
);
