-- Monitoramento do sono: um registro por noite, com dados opcionais de frequência cardíaca do sensor.
create table if not exists public.care_sleep_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.care_patients(id) on delete cascade,
  owner_id uuid not null,
  recorded_by uuid not null default auth.uid(),
  sleep_date date not null,
  bed_at timestamptz not null,
  wake_at timestamptz not null,
  quality smallint not null check (quality between 1 and 5),
  awakenings smallint not null default 0 check (awakenings between 0 and 30),
  avg_hr smallint check (avg_hr is null or avg_hr between 25 and 220),
  min_hr smallint check (min_hr is null or min_hr between 25 and 220),
  source text not null default 'manual' check (source in ('manual','sensor')),
  notes text check (notes is null or char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  check (wake_at > bed_at and wake_at - bed_at <= interval '20 hours'),
  unique (patient_id, sleep_date)
);
create index if not exists care_sleep_logs_patient_date_idx on public.care_sleep_logs(patient_id, sleep_date desc);
alter table public.care_sleep_logs enable row level security;
drop policy if exists sleep_logs_all on public.care_sleep_logs;
create policy sleep_logs_all on public.care_sleep_logs for all to authenticated
  using (public.care_can_access_patient(patient_id, owner_id))
  with check (public.care_can_access_patient(patient_id, owner_id));
