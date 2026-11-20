-- Novo alimento regional: feijoada de jabá (valores por 100 g, estimativa editorial).
insert into public.care_food_catalog (id,name,food_group,kcal,protein_g,carbs_g,fat_g,fiber_g,provenance,note,flags)
values
($q$feijoada_jaba$q$,$q$Feijoada de jabá (feijão com carne-seca)$q$,$q$proteinas$q$,135,9.5,11.5,6.2,4.6,$q$Estimativa editorial baseada em tabelas brasileiras; confirmar preparo$q$,$q$Feijão cozido com jabá dessalgado, toucinho e linguiça, com caldo. 1 prato fundo ≈ 300 g. Muito sódio.$q$,array[$q$gorduroso$q$,$q$fermentavel$q$]::text[])
on conflict (id) do update set name=excluded.name, kcal=excluded.kcal, protein_g=excluded.protein_g, carbs_g=excluded.carbs_g, fat_g=excluded.fat_g, fiber_g=excluded.fiber_g, note=excluded.note, flags=excluded.flags;
