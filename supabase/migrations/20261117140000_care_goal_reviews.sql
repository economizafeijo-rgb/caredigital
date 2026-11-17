-- Resultado de cada meta do dia (atingida ou não) e a observação registrada pelo sistema.
-- Uma linha por paciente, dia e meta; o fechamento do dia é às 22h (horário do Acre).
create table if not exists public.care_goal_reviews (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.care_patients(id) on delete cascade,
  owner_id uuid not null,
  day date not null,
  metric text not null check (metric in ('hidratacao','calorias','proteina','suplementos','medicacao','sono')),
  status text not null check (status in ('atingida','nao_atingida')),
  target numeric(10,2) not null check (target >= 0),
  actual numeric(10,2) not null check (actual >= 0),
  unit text not null check (char_length(unit) between 1 and 12),
  observation text not null check (char_length(observation) between 5 and 400),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patient_id, day, metric)
);
create index if not exists care_goal_reviews_patient_day_idx on public.care_goal_reviews(patient_id, day desc);
alter table public.care_goal_reviews enable row level security;

drop policy if exists goal_reviews_select on public.care_goal_reviews;
create policy goal_reviews_select on public.care_goal_reviews for select to authenticated
  using (public.care_can_access_patient(patient_id, owner_id));

drop policy if exists goal_reviews_insert on public.care_goal_reviews;
create policy goal_reviews_insert on public.care_goal_reviews for insert to authenticated
  with check (created_by = auth.uid() and public.care_can_access_patient(patient_id, owner_id));

-- Atualizar permite refinar o resultado do dia quando um registro tardio chega (ex.: dose confirmada depois).
drop policy if exists goal_reviews_update on public.care_goal_reviews;
create policy goal_reviews_update on public.care_goal_reviews for update to authenticated
  using (public.care_can_access_patient(patient_id, owner_id))
  with check (public.care_can_access_patient(patient_id, owner_id));
