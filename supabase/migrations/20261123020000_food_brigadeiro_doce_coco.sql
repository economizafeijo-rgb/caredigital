-- Novos alimentos: brigadeiro e doce de coco (valores por 100 g).
-- Fontes: IBGE (POF 2008-2009) para o brigadeiro e TACO (UNICAMP, 4ª ed.) para a cocada branca.
-- As tabelas não informam fibra para estes doces: o valor de fibra é estimativa editorial.
insert into public.care_food_catalog (id,name,food_group,kcal,protein_g,carbs_g,fat_g,fiber_g,provenance,note,flags)
values
($q$brigadeiro$q$,$q$Brigadeiro$q$,$q$proteinas$q$,334,7.5,54.9,10.1,1.2,$q$IBGE$q$,$q$IBGE (POF), brigadeiro de leite condensado, chocolate e manteiga. Doce com muito açúcar adicionado. Fibra estimada. 1 unidade de festa ≈ 20 g (cerca de 67 kcal).$q$,array[$q$laticinio$q$]::text[]),
($q$doce_coco$q$,$q$Doce de coco (cocada branca)$q$,$q$frutas$q$,449,1.1,81.4,13.6,3,$q$TACO/UNICAMP 4ª ed. (2011)$q$,$q$TACO (UNICAMP), cocada branca: coco ralado cozido com açúcar. Muito açúcar e gordura do coco. Fibra estimada. 1 pedaço ≈ 40 g (cerca de 180 kcal).$q$,array[$q$gorduroso$q$]::text[])
on conflict (id) do update set name=excluded.name, food_group=excluded.food_group, kcal=excluded.kcal, protein_g=excluded.protein_g, carbs_g=excluded.carbs_g, fat_g=excluded.fat_g, fiber_g=excluded.fiber_g, provenance=excluded.provenance, note=excluded.note, flags=excluded.flags;
