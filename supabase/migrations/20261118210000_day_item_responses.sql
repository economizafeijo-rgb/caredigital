-- Respostas do cliente a itens do "Meu dia" que não foram cumpridos (pulou, não conseguiu, dispensou).
create table if not exists public.care_day_item_responses (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.care_patients(id) on delete cascade,
  owner_id uuid not null,
  day date not null,
  item_key text not null check (char_length(item_key) between 1 and 200),
  kind text not null check (kind in ('med','supl','agua','refeicao','atividade','sono','cuidado')),
  reason text not null check (reason in ('nao_consegui','esqueci','sem_produto','orientacao','mal_estar','dispensado','outro')),
  note text check (note is null or char_length(note) <= 280),
  recorded_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (patient_id, day, item_key)
);
create index if not exists care_day_item_responses_patient_day on public.care_day_item_responses (patient_id, day);
alter table public.care_day_item_responses enable row level security;
drop policy if exists day_item_responses_select on public.care_day_item_responses;
drop policy if exists day_item_responses_insert on public.care_day_item_responses;
drop policy if exists day_item_responses_delete on public.care_day_item_responses;
create policy day_item_responses_select on public.care_day_item_responses for select to authenticated
  using (public.care_can_access_patient(patient_id, owner_id));
create policy day_item_responses_insert on public.care_day_item_responses for insert to authenticated
  with check (recorded_by = auth.uid() and public.care_can_access_patient(patient_id, owner_id));
create policy day_item_responses_delete on public.care_day_item_responses for delete to authenticated
  using (public.care_can_access_patient(patient_id, owner_id));
grant select, insert, delete on public.care_day_item_responses to authenticated;
