-- Keep date-only defaults on the Acre calendar while retaining UTC timestamptz storage.
-- Supabase sessions remain UTC; only these date values are derived in America/Rio_Branco.
ALTER TABLE public.care_body_measurements
  ALTER COLUMN recorded_on
  SET DEFAULT ((now() AT TIME ZONE 'America/Rio_Branco')::date);

ALTER TABLE public.care_patient_protocols
  ALTER COLUMN started_at
  SET DEFAULT ((now() AT TIME ZONE 'America/Rio_Branco')::date);
