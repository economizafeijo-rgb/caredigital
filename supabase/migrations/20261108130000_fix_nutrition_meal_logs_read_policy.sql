-- Remove a tautological self-comparison from the meal-log read policy.
-- The actual authorization remains: record's patient belongs to the current owner,
-- or the current user has an explicit patient-access grant from that owner.
drop policy if exists care_nutrition_meal_logs_read on public.care_nutrition_meal_logs;
create policy care_nutrition_meal_logs_read
on public.care_nutrition_meal_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.care_patients p
    where p.id = care_nutrition_meal_logs.patient_id
      and (
        p.owner_id = (select auth.uid())
        or exists (
          select 1
          from public.care_patient_access a
          where a.patient_id = p.id
            and a.owner_id = p.owner_id
            and a.user_id = (select auth.uid())
        )
      )
  )
);