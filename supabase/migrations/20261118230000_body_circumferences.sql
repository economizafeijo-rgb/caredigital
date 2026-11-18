-- Medidas do corpo (circunferências em cm e dobra opcional de % de gordura), uma linha por dia.
create table if not exists public.care_body_circumferences (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.care_patients(id) on delete cascade,
  owner_id uuid not null,
  measured_on date not null,
  neck numeric(5,1) check (neck is null or neck between 20 and 80),
  shoulders numeric(5,1) check (shoulders is null or shoulders between 60 and 200),
  chest numeric(5,1) check (chest is null or chest between 50 and 200),
  waist numeric(5,1) check (waist is null or waist between 40 and 200),
  abdomen numeric(5,1) check (abdomen is null or abdomen between 40 and 220),
  hip numeric(5,1) check (hip is null or hip between 50 and 220),
  arm_r numeric(5,1) check (arm_r is null or arm_r between 15 and 70),
  arm_l numeric(5,1) check (arm_l is null or arm_l between 15 and 70),
  forearm numeric(5,1) check (forearm is null or forearm between 15 and 50),
  thigh_r numeric(5,1) check (thigh_r is null or thigh_r between 30 and 110),
  thigh_l numeric(5,1) check (thigh_l is null or thigh_l between 30 and 110),
  calf numeric(5,1) check (calf is null or calf between 20 and 70),
  body_fat_pct numeric(4,1) check (body_fat_pct is null or body_fat_pct between 3 and 70),
  goal_label text check (goal_label is null or char_length(goal_label) <= 60),
  notes text check (notes is null or char_length(notes) <= 280),
  recorded_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patient_id, measured_on)
);
create index if not exists care_body_circ_patient_idx on public.care_body_circumferences (patient_id, measured_on desc);
alter table public.care_body_circumferences enable row level security;
drop policy if exists body_circ_select on public.care_body_circumferences;
drop policy if exists body_circ_insert on public.care_body_circumferences;
drop policy if exists body_circ_update on public.care_body_circumferences;
drop policy if exists body_circ_delete on public.care_body_circumferences;
create policy body_circ_select on public.care_body_circumferences for select to authenticated using (public.care_can_access_patient(patient_id, owner_id));
create policy body_circ_insert on public.care_body_circumferences for insert to authenticated with check (recorded_by = auth.uid() and public.care_can_access_patient(patient_id, owner_id));
create policy body_circ_update on public.care_body_circumferences for update to authenticated using (public.care_can_access_patient(patient_id, owner_id)) with check (public.care_can_access_patient(patient_id, owner_id));
create policy body_circ_delete on public.care_body_circumferences for delete to authenticated using (public.care_can_access_patient(patient_id, owner_id));
grant select, insert, update, delete on public.care_body_circumferences to authenticated;
