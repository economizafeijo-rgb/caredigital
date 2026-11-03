-- CareDigital: independent private nutritional preferences per authorized patient.
-- Applied on Supabase as migration 20261103010039_care_client_nutrition_preferences.
create table if not exists public.care_nutrition_preferences (
  patient_id uuid primary key references public.care_patients(id) on delete cascade,
  owner_id uuid not null,
  objective text not null default 'equilibrio'
    check(objective in ('equilibrio','emagrecimento','ganho_peso','hipertrofia')),
  gastritis_sensitive boolean not null default false,
  avoided_ingredients text[] not null default '{}',
  weight_kg numeric(5,1) check(weight_kg between 30 and 300),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  constraint care_nutrition_avoid_limit check(coalesce(cardinality(avoided_ingredients),0)<=60)
);
create index if not exists care_nutrition_owner_idx on public.care_nutrition_preferences(owner_id);
alter table public.care_nutrition_preferences enable row level security;
drop policy if exists nutrition_preferences_access_read on public.care_nutrition_preferences;
create policy nutrition_preferences_access_read on public.care_nutrition_preferences for select to authenticated
 using(exists(select 1 from public.care_patients p where p.id=patient_id
 and p.owner_id=care_nutrition_preferences.owner_id
 and (p.owner_id=(select auth.uid()) or exists(
    select 1 from public.care_patient_access a where a.patient_id=p.id
     and a.owner_id=p.owner_id and a.user_id=(select auth.uid())
 ))));
drop policy if exists nutrition_preferences_access_insert on public.care_nutrition_preferences;
create policy nutrition_preferences_access_insert on public.care_nutrition_preferences for insert to authenticated
 with check(updated_by=(select auth.uid()) and exists(
 select 1 from public.care_patients p where p.id=patient_id
 and p.owner_id=care_nutrition_preferences.owner_id
 and (p.owner_id=(select auth.uid()) or exists(
    select 1 from public.care_patient_access a where a.patient_id=p.id
     and a.owner_id=p.owner_id and a.user_id=(select auth.uid())
 ))));
drop policy if exists nutrition_preferences_access_update on public.care_nutrition_preferences;
create policy nutrition_preferences_access_update on public.care_nutrition_preferences for update to authenticated
 using(exists(select 1 from public.care_patients p where p.id=patient_id
 and p.owner_id=care_nutrition_preferences.owner_id
 and (p.owner_id=(select auth.uid()) or exists(
    select 1 from public.care_patient_access a where a.patient_id=p.id
     and a.owner_id=p.owner_id and a.user_id=(select auth.uid())
 ))))
 with check(updated_by=(select auth.uid()) and exists(
 select 1 from public.care_patients p where p.id=patient_id
 and p.owner_id=care_nutrition_preferences.owner_id
 and (p.owner_id=(select auth.uid()) or exists(
    select 1 from public.care_patient_access a where a.patient_id=p.id
     and a.owner_id=p.owner_id and a.user_id=(select auth.uid())
 ))));
revoke all on public.care_nutrition_preferences from anon;
grant select,insert,update on public.care_nutrition_preferences to authenticated;
