-- Peixe frito com e sem farinha (TACO: pescada, filé), ao lado da estimativa genérica já existente.
insert into public.care_food_catalog (id,name,food_group,kcal,protein_g,carbs_g,fat_g,fiber_g,provenance,note,flags) values
('peixe_frito_empanado','Peixe frito empanado (filé de pescada com farinha)','proteinas',283,21.4,5,19.1,0.2,'TACO/UNICAMP 4ª ed. (2011)','',array['frito','gorduroso']::text[]),
('peixe_frito_simples','Peixe frito sem farinha (filé de pescada)','proteinas',154,28.6,0,3.6,0,'TACO/UNICAMP 4ª ed. (2011)','Frito sem empanar absorve bem menos óleo.',array['frito']::text[])
on conflict (id) do nothing;
