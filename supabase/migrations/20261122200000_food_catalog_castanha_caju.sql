-- Castanha-de-caju (Tabela do IBGE, POF 2008-2009).
insert into public.care_food_catalog (id,name,food_group,kcal,protein_g,carbs_g,fat_g,fiber_g,provenance,note,flags) values
($q$castanha_caju$q$,$q$Castanha-de-caju$q$,$q$proteinas$q$,574,15.31,32.69,46.35,3,$q$IBGE — Tabelas de Composição Nutricional dos Alimentos Consumidos no Brasil (POF 2008-2009)$q$,$q$Tabela do IBGE (POF). Calórica: 1 punhado ≈ 30 g.$q$,array[$q$gorduroso$q$]::text[])
on conflict (id) do update set name=excluded.name,food_group=excluded.food_group,kcal=excluded.kcal,protein_g=excluded.protein_g,carbs_g=excluded.carbs_g,fat_g=excluded.fat_g,fiber_g=excluded.fiber_g,provenance=excluded.provenance,note=excluded.note,flags=excluded.flags;
