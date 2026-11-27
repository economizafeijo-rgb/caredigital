-- Guarda a temperatura (°C) da hora de cada micção, para o app procurar relação entre frio e idas ao banheiro.
alter table public.care_urination_logs
  add column if not exists temp_c numeric(4,1) check (temp_c is null or (temp_c between -10 and 60));
