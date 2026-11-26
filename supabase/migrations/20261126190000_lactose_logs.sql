-- Sintomas após laticínios (educativo, não é diagnóstico). A lactose de cada ingestão é calculada
-- a partir das bebidas, refeições e porções já registradas; aqui só ficam os sintomas informados.
create table if not exists public.care_lactose_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid not null,
  at timestamptz not null default now(),
  severity smallint not null default 1 check (severity between 0 and 3),
  symptoms text not null default '' check (char_length(symptoms) <= 200),
  notes text not null default '' check (char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  foreign key (patient_id, owner_id) references public.care_patients(id, owner_id) on delete cascade
);
create index if not exists care_lactose_logs_patient_time_idx on public.care_lactose_logs(patient_id, at desc);

alter table public.care_lactose_logs enable row level security;
drop policy if exists care_lactose_logs_read on public.care_lactose_logs;
create policy care_lactose_logs_read on public.care_lactose_logs for select to authenticated using (
  owner_id = (select auth.uid()) or exists (
    select 1 from public.care_patient_access a
    where a.patient_id = care_lactose_logs.patient_id and a.user_id = (select auth.uid())));
drop policy if exists care_lactose_logs_insert on public.care_lactose_logs;
create policy care_lactose_logs_insert on public.care_lactose_logs for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists care_lactose_logs_delete on public.care_lactose_logs;
create policy care_lactose_logs_delete on public.care_lactose_logs for delete to authenticated using (owner_id = (select auth.uid()));
revoke all on public.care_lactose_logs from anon;
grant select, insert, delete on public.care_lactose_logs to authenticated;
