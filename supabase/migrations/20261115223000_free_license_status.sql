alter table public.care_patients drop constraint if exists care_patients_license_status_chk;
alter table public.care_patients add constraint care_patients_license_status_chk check (license_status in ('ativa','gratuita','suspensa','expirada','teste'));
