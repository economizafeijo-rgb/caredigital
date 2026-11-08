-- Bind every body-measurement row to the owner of its referenced patient.
-- This replaces tautological p.owner_id = p.owner_id predicates with a real
-- child-row/parent-row ownership check. Existing owner and delegated access remain.
drop policy if exists body_measurements_read on public.care_body_measurements;
create policy body_measurements_read
on public.care_body_measurements
for select to authenticated
using (
  exists (
    select 1 from public.care_patients p
    where p.id = care_body_measurements.patient_id
      and p.owner_id = care_body_measurements.owner_id
      and (
        p.owner_id = (select auth.uid())
        or exists (
          select 1 from public.care_patient_access a
          where a.patient_id = p.id
            and a.owner_id = p.owner_id
            and a.user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists body_measurements_insert on public.care_body_measurements;
create policy body_measurements_insert
on public.care_body_measurements
for insert to authenticated
with check (
  recorded_by = (select auth.uid())
  and exists (
    select 1 from public.care_patients p
    where p.id = care_body_measurements.patient_id
      and p.owner_id = care_body_measurements.owner_id
      and (
        p.owner_id = (select auth.uid())
        or exists (
          select 1 from public.care_patient_access a
          where a.patient_id = p.id
            and a.owner_id = p.owner_id
            and a.user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists body_measurements_update on public.care_body_measurements;
create policy body_measurements_update
on public.care_body_measurements
for update to authenticated
using (
  exists (
    select 1 from public.care_patients p
    where p.id = care_body_measurements.patient_id
      and p.owner_id = care_body_measurements.owner_id
      and (
        p.owner_id = (select auth.uid())
        or exists (
          select 1 from public.care_patient_access a
          where a.patient_id = p.id
            and a.owner_id = p.owner_id
            and a.user_id = (select auth.uid())
        )
      )
  )
)
with check (
  recorded_by = (select auth.uid())
  and exists (
    select 1 from public.care_patients p
    where p.id = care_body_measurements.patient_id
      and p.owner_id = care_body_measurements.owner_id
      and (
        p.owner_id = (select auth.uid())
        or exists (
          select 1 from public.care_patient_access a
          where a.patient_id = p.id
            and a.owner_id = p.owner_id
            and a.user_id = (select auth.uid())
        )
      )
  )
);