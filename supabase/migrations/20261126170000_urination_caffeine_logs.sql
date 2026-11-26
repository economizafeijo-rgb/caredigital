-- Registro de micção e de cafeína (educativo, não é diagnóstico).
create table if not exists public.care_urination_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid not null,
  at timestamptz not null default now(),
  volume text not null default 'moderado' check (volume in ('pouco','moderado','muito')),
  ml integer check (ml is null or ml between 10 and 1500),
  notes text not null default '' check (char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  foreign key (patient_id, owner_id) references public.care_patients(id, owner_id) on delete cascade
);
create index if not exists care_urination_logs_patient_time_idx on public.care_urination_logs(patient_id, at desc);

create table if not exists public.care_caffeine_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid not null,
  at timestamptz not null default now(),
  source text not null check (char_length(btrim(source)) between 2 and 60),
  ml integer check (ml is null or ml between 5 and 1500),
  mg integer not null check (mg between 1 and 1000),
  created_at timestamptz not null default now(),
  foreign key (patient_id, owner_id) references public.care_patients(id, owner_id) on delete cascade
);
create index if not exists care_caffeine_logs_patient_time_idx on public.care_caffeine_logs(patient_id, at desc);

do $$
declare t text;
begin
  foreach t in array array['care_urination_logs','care_caffeine_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format($p$create policy %I on public.%I for select to authenticated using (
      owner_id = (select auth.uid()) or exists (
        select 1 from public.care_patient_access a
        where a.patient_id = %I.patient_id and a.user_id = (select auth.uid())))$p$, t || '_read', t, t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format($p$create policy %I on public.%I for insert to authenticated with check (owner_id = (select auth.uid()))$p$, t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format($p$create policy %I on public.%I for delete to authenticated using (owner_id = (select auth.uid()))$p$, t || '_delete', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, delete on public.%I to authenticated', t);
  end loop;
end $$;
