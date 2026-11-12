-- Licenças de acesso por cliente, geridas pelo administrador (dono do prontuário).
alter table public.care_patients add column if not exists license_plan text not null default 'basico';
alter table public.care_patients add column if not exists license_status text not null default 'ativa';
alter table public.care_patients add column if not exists license_expires_on date;
alter table public.care_patients add column if not exists phone text;
do $$ begin
  alter table public.care_patients add constraint care_patients_license_plan_chk check (license_plan in ('basico','premium','profissional'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.care_patients add constraint care_patients_license_status_chk check (license_status in ('ativa','suspensa','expirada','teste'));
exception when duplicate_object then null; end $$;
