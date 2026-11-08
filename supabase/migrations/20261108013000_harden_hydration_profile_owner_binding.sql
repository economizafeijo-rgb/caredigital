-- Bind hydration profile writes to the actual patient owner.
-- The former p.owner_id = p.owner_id predicate was tautological and
-- did not verify that the profile's owner_id matched the patient's owner_id.

DROP POLICY IF EXISTS "water profile add authorized" ON public.care_hydration_profiles;
CREATE POLICY "water profile add authorized"
ON public.care_hydration_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  (
    owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.care_patient_access a
      WHERE a.patient_id = care_hydration_profiles.patient_id
        AND a.user_id = (SELECT auth.uid())
    )
  )
  AND EXISTS (
    SELECT 1 FROM public.care_patients p
    WHERE p.id = care_hydration_profiles.patient_id
      AND p.owner_id = care_hydration_profiles.owner_id
  )
);

DROP POLICY IF EXISTS "water profile update authorized" ON public.care_hydration_profiles;
CREATE POLICY "water profile update authorized"
ON public.care_hydration_profiles
FOR UPDATE
TO authenticated
USING (
  owner_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.care_patient_access a
    WHERE a.patient_id = care_hydration_profiles.patient_id
      AND a.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  (
    owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.care_patient_access a
      WHERE a.patient_id = care_hydration_profiles.patient_id
        AND a.user_id = (SELECT auth.uid())
    )
  )
  AND EXISTS (
    SELECT 1 FROM public.care_patients p
    WHERE p.id = care_hydration_profiles.patient_id
      AND p.owner_id = care_hydration_profiles.owner_id
  )
);
