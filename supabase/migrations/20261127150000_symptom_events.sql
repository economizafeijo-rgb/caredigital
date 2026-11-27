-- Sintomas e condições físicas (educativo, não é diagnóstico). O app cruza cada sintoma com o que foi
-- registrado antes (alimentos, bebidas, remédios, suplementos) para apontar pistas a investigar.
create table if not exists public.care_symptom_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid not null,
  at timestamptz not null default now(),
  symptoms text[] not null default '{}' check (cardinality(symptoms) <= 12),
  severity smallint not null default 2 check (severity between 1 and 5),
  sys smallint check (sys is null or sys between 40 and 300),
  dia smallint check (dia is null or dia between 20 and 200),
  temp_c numeric(3,1) check (temp_c is null or temp_c between 30 and 45),
  notes text not null default '' check (char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  foreign key (patient_id, owner_id) references public.care_patients(id, owner_id) on delete cascade
);
create index if not exists care_symptom_events_patient_time_idx on public.care_symptom_events(patient_id, at desc);

alter table public.care_symptom_events enable row level security;
drop policy if exists care_symptom_events_read on public.care_symptom_events;
create policy care_symptom_events_read on public.care_symptom_events for select to authenticated using (
  owner_id = (select auth.uid()) or exists (
    select 1 from public.care_patient_access a
    where a.patient_id = care_symptom_events.patient_id and a.user_id = (select auth.uid())));
drop policy if exists care_symptom_events_insert on public.care_symptom_events;
create policy care_symptom_events_insert on public.care_symptom_events for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists care_symptom_events_update on public.care_symptom_events;
create policy care_symptom_events_update on public.care_symptom_events for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists care_symptom_events_delete on public.care_symptom_events;
create policy care_symptom_events_delete on public.care_symptom_events for delete to authenticated using (owner_id = (select auth.uid()));
revoke all on public.care_symptom_events from anon;
grant select, insert, update, delete on public.care_symptom_events to authenticated;
