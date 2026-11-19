-- Sessões de frequência cardíaca medidas por relógio ou cinta Bluetooth (padrão Heart Rate 0x180D).
create table if not exists public.care_heart_rate_sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.care_patients(id) on delete cascade,
  owner_id uuid not null,
  device_name text check (device_name is null or char_length(device_name) <= 80),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  avg_bpm smallint not null check (avg_bpm between 25 and 250),
  min_bpm smallint not null check (min_bpm between 25 and 250),
  max_bpm smallint not null check (max_bpm between 25 and 250),
  samples jsonb not null default '[]'::jsonb check (jsonb_typeof(samples) = 'array' and jsonb_array_length(samples) <= 7200),
  zones jsonb not null default '{}'::jsonb,
  recorded_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  check (ended_at >= started_at)
);
create index if not exists care_hr_sessions_patient_idx on public.care_heart_rate_sessions (patient_id, started_at desc);
alter table public.care_heart_rate_sessions enable row level security;
drop policy if exists hr_select on public.care_heart_rate_sessions;
drop policy if exists hr_insert on public.care_heart_rate_sessions;
drop policy if exists hr_delete on public.care_heart_rate_sessions;
create policy hr_select on public.care_heart_rate_sessions for select to authenticated using (public.care_can_access_patient(patient_id, owner_id));
create policy hr_insert on public.care_heart_rate_sessions for insert to authenticated with check (recorded_by = auth.uid() and public.care_can_access_patient(patient_id, owner_id));
create policy hr_delete on public.care_heart_rate_sessions for delete to authenticated using (public.care_can_access_patient(patient_id, owner_id));
grant select, insert, delete on public.care_heart_rate_sessions to authenticated;
