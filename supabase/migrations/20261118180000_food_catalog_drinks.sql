insert into public.care_food_catalog (id,name,food_group,kcal,protein_g,carbs_g,fat_g,fiber_g,provenance,note,flags) values
('agua_coco','Água de coco','bebidas',22,0,5.3,0,0.1,'TACO/UNICAMP 4ª ed. (2011)','','{}'),
('refrigerante','Refrigerante tipo cola','bebidas',41,0,10.4,0,0,'TACO/UNICAMP 4ª ed. (2011)','','{industrializado,cafeina}')
on conflict (id) do nothing;
