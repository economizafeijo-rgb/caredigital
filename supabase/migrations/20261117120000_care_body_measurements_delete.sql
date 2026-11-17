-- Permite excluir um registro de peso, com a mesma regra de posse das demais políticas:
-- o dono do prontuário ou um usuário com acesso delegado ao paciente.
drop policy if exists body_measurements_delete on public.care_body_measurements;
create policy body_measurements_delete
on public.care_body_measurements
for delete to authenticated
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
