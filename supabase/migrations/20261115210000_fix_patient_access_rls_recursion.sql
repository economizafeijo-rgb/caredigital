create or replace function public.care_signup_patient_owned(p_patient uuid, p_owner uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.care_patients where id = p_patient and owner_id = p_owner); $$;
revoke all on function public.care_signup_patient_owned(uuid, uuid) from public, anon, authenticated;
grant execute on function public.care_signup_patient_owned(uuid, uuid) to authenticated;
drop policy if exists "owner creates grants" on public.care_patient_access;
create policy "owner creates grants" on public.care_patient_access for insert to authenticated
with check (owner_id = (select auth.uid()) and public.care_signup_patient_owned(patient_id, (select auth.uid())));
drop policy if exists "owner updates grants" on public.care_patient_access;
create policy "owner updates grants" on public.care_patient_access for update to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and public.care_signup_patient_owned(patient_id, (select auth.uid())));
