-- Evaluate auth.uid() once per statement instead of once per candidate row.
-- Authorization semantics are unchanged for owners and explicitly assigned patients.
drop policy if exists "care log owner and assigned client read" on public.care_activity_log;
create policy "care log owner and assigned client read"
on public.care_activity_log
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1
    from public.care_patient_access a
    where a.patient_id = care_activity_log.patient_id
      and a.user_id = (select auth.uid())
  )
);