-- Histórico de temperatura por hora (Feijó/AC) guardado por paciente, para cruzar clima com água, cafeína, lactose e micção.
create table if not exists public.care_weather_hours (
  patient_id uuid not null,
  owner_id uuid not null,
  hour text not null,
  temp_c numeric(4,1) not null,
  primary key (patient_id, hour)
);
alter table public.care_weather_hours enable row level security;
drop policy if exists care_weather_hours_select on public.care_weather_hours;
drop policy if exists care_weather_hours_insert on public.care_weather_hours;
drop policy if exists care_weather_hours_update on public.care_weather_hours;
create policy care_weather_hours_select on public.care_weather_hours for select to authenticated
  using (owner_id = (select auth.uid()));
create policy care_weather_hours_insert on public.care_weather_hours for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy care_weather_hours_update on public.care_weather_hours for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
