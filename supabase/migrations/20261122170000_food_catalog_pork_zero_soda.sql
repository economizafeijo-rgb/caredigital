-- Carne de porco assada (TACO) e refrigerante zero açúcar (rótulo), valores por 100 g.
insert into public.care_food_catalog (id,name,food_group,kcal,protein_g,carbs_g,fat_g,fiber_g,provenance,note,flags) values
('pernil_assado','Carne de porco assada (pernil)','proteinas',262,32.1,0,13.9,0,'TACO/UNICAMP 4ª ed. (2011)','',array['gorduroso']::text[]),
('lombo_assado','Lombo de porco assado','proteinas',210,35.7,0,6.4,0,'TACO/UNICAMP 4ª ed. (2011)','',array[]::text[]),
('refrigerante_zero','Refrigerante zero açúcar','bebidas',1,0,0,0,0,'Rótulo médio de refrigerantes zero açúcar','Praticamente sem calorias; usa adoçantes. Versões de cola têm cafeína. Confira o rótulo.',array['industrializado','cafeina']::text[])
on conflict (id) do nothing;
