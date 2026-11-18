insert into public.care_food_catalog (id,name,food_group,kcal,protein_g,carbs_g,fat_g,fiber_g,provenance,note,flags) values
('cafe_leite_gado','Café com leite de gado (leite fresco)','bebidas',35,1.7,2.4,2,0,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','Café coado meio a meio com leite integral fresco (~4% de gordura), sem açúcar.','{cafeina,laticinio}'),
('cafe_leite_po','Café com leite em pó','bebidas',62,3,4.8,3.2,0,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','2 colheres de sopa (24 g) de leite em pó integral em 200 ml de café, sem açúcar.','{cafeina,laticinio,industrializado}')
on conflict (id) do nothing;
