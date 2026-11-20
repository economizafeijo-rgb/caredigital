-- Novo alimento: frango ao molho (valores por 100 g, estimativa editorial).
insert into public.care_food_catalog (id,name,food_group,kcal,protein_g,carbs_g,fat_g,fiber_g,provenance,note,flags)
values
($q$frango_molho$q$,$q$Frango ao molho (cozido em molho de tomate)$q$,$q$proteinas$q$,150,17,3.5,7.5,0.5,$q$Estimativa editorial baseada em tabelas brasileiras; confirmar preparo$q$,$q$Pedaços de frango com pele cozidos em molho de tomate com cebola e óleo. 1 porção ≈ 150 g.$q$,array[$q$gorduroso$q$]::text[])
on conflict (id) do update set name=excluded.name, kcal=excluded.kcal, protein_g=excluded.protein_g, carbs_g=excluded.carbs_g, fat_g=excluded.fat_g, fiber_g=excluded.fiber_g, note=excluded.note, flags=excluded.flags;
