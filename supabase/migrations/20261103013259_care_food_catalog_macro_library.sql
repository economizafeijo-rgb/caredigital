-- Fonte: TACO/UNICAMP e estimativas identificadas por preparação; migration version 20261103013259.
create table if not exists public.care_food_catalog (
 id text primary key,
 name text not null,
 food_group text not null check(food_group in ('frutas','cereais','proteinas','legumes','bebidas')),
 kcal numeric(8,2),protein_g numeric(8,2),carbs_g numeric(8,2),fat_g numeric(8,2),fiber_g numeric(8,2),
 provenance text not null,note text not null default '',flags text[] not null default '{}',
 updated_at timestamptz not null default now(),
 constraint care_food_nonnegative check(
 (kcal is null or kcal>=0) and (protein_g is null or protein_g>=0)
 and (carbs_g is null or carbs_g>=0) and (fat_g is null or fat_g>=0)
 and (fiber_g is null or fiber_g>=0))
);
alter table public.care_food_catalog enable row level security;
drop policy if exists care_food_catalog_read on public.care_food_catalog;
create policy care_food_catalog_read on public.care_food_catalog for select to authenticated using(true);
revoke all on public.care_food_catalog from anon,authenticated;
grant select on public.care_food_catalog to authenticated;
insert into public.care_food_catalog
 (id,name,food_group,kcal,protein_g,carbs_g,fat_g,fiber_g,provenance,note,flags)
values
('abacate','Abacate cru','frutas',96.00,1.20,6.00,8.40,6.30,'TACO/UNICAMP 4ª ed. (2011)','',ARRAY['gorduroso']::text[]),
('abacaxi','Abacaxi','frutas',48.00,0.90,12.30,0.10,1.00,'TACO/UNICAMP 4ª ed. (2011)','',ARRAY['acido']::text[]),
('abobora','Abóbora cozida','legumes',48.00,0.70,10.00,0.20,2.00,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('abobrinha','Abobrinha cozida','legumes',22.00,1.10,4.00,0.20,1.00,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('acai','Açaí, polpa sem adição de açúcar','frutas',58.00,0.80,6.20,3.90,2.60,'TACO/UNICAMP 4ª ed. (2011)','Açaí adoçado, xarope e complementos alteram muito a composição.',ARRAY['gorduroso']::text[]),
('acerola','Acerola crua','frutas',33.00,0.90,8.00,0.20,1.50,'TACO/UNICAMP 4ª ed. (2011)','','{}'::text[]),
('alface','Alface crua','legumes',15.00,1.30,2.90,0.10,1.30,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('amendoim','Amendoim torrado sem sal','proteinas',588.00,26.00,20.00,49.00,9.00,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','',ARRAY['gorduroso']::text[]),
('arroz','Arroz branco cozido','cereais',128.00,2.50,28.10,0.20,1.60,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('arroz_integral','Arroz integral cozido','cereais',124.00,2.60,25.80,1.00,2.70,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('aveia','Aveia em flocos seca','cereais',394.00,16.90,66.60,6.90,9.10,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('azeite','Azeite de oliva','cereais',884.00,0.00,0.00,100.00,0.00,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','',ARRAY['gorduroso']::text[]),
('banana_comprida','Banana-comprida (banana-da-terra) cozida','frutas',116.00,1.30,30.00,0.20,1.50,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','Cozida, não frita.','{}'::text[]),
('banana_maca','Banana-maçã crua','frutas',87.00,1.80,22.30,0.10,2.60,'TACO/UNICAMP 4ª ed. (2011)','','{}'::text[]),
('banana_nanica','Banana-nanica crua','frutas',92.00,1.40,23.80,0.10,1.90,'TACO/UNICAMP 4ª ed. (2011)','','{}'::text[]),
('banana_pacova','Banana-pacovã crua','frutas',78.00,1.20,20.30,0.10,2.00,'TACO/UNICAMP 4ª ed. (2011)','','{}'::text[]),
('banana_prata','Banana-prata crua','frutas',98.00,1.30,26.00,0.10,2.00,'TACO/UNICAMP 4ª ed. (2011)','','{}'::text[]),
('batata','Batata inglesa cozida','cereais',52.00,1.80,11.90,0.00,1.30,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('batata_doce','Batata-doce cozida','cereais',77.00,0.60,18.40,0.10,2.20,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('beterraba','Beterraba cozida','legumes',32.00,1.30,7.20,0.10,1.90,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('brocolis','Brócolis cozido','legumes',25.00,2.10,4.40,0.50,3.40,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','',ARRAY['fermentavel']::text[]),
('cafe','Café coado sem açúcar','bebidas',1.00,0.10,0.30,0.00,0.00,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','',ARRAY['cafeina']::text[]),
('carne','Carne bovina magra cozida','proteinas',190.00,28.00,0.00,8.00,0.00,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('castanha_para','Castanha-do-pará crua','proteinas',656.00,14.00,12.00,66.00,7.50,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','',ARRAY['gorduroso']::text[]),
('cenoura','Cenoura cozida','legumes',30.00,0.80,6.70,0.20,2.60,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('cha_camomila','Chá de camomila sem açúcar','bebidas',1.00,0.00,0.00,0.00,0.00,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('chuchu','Chuchu cozido','legumes',19.00,0.40,4.80,0.10,1.30,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('coco','Coco fresco','frutas',354.00,3.00,15.00,33.00,9.00,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','',ARRAY['gorduroso']::text[]),
('couve','Couve refogada com pouca gordura','legumes',55.00,2.70,6.10,2.00,3.00,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','',ARRAY['fermentavel']::text[]),
('cuscuz','Cuscuz de milho cozido','cereais',113.00,2.20,25.30,0.70,2.10,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('ervilha','Ervilha cozida','proteinas',81.00,5.40,14.50,0.40,5.00,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','',ARRAY['fermentavel']::text[]),
('espinafre','Espinafre cozido','legumes',23.00,2.90,3.70,0.30,2.40,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('farinha','Farinha de mandioca','cereais',365.00,1.60,89.00,0.30,6.30,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','Pode ser seca/áspera; considerar tolerância e porção.','{}'::text[]),
('farofa','Farofa de mandioca temperada','cereais',406.00,2.10,80.30,9.10,7.80,'TACO/UNICAMP 4ª ed. (2011)','',ARRAY['gorduroso']::text[]),
('feijao','Feijão carioca cozido','proteinas',76.00,4.80,13.60,0.50,8.00,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','Pode causar gases; testar pequenas porções, se tolerado.',ARRAY['fermentavel']::text[]),
('feijao_preto','Feijão-preto cozido','proteinas',77.00,4.50,14.00,0.50,8.40,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','',ARRAY['fermentavel']::text[]),
('frango','Peito de frango cozido sem pele','proteinas',163.00,31.50,0.00,3.20,0.00,'TACO/UNICAMP 4ª ed. (2011)','','{}'::text[]),
('goiaba','Goiaba madura crua','frutas',54.00,0.90,13.00,0.40,5.40,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('granola','Granola industrializada','cereais',null,null,null,null,null,'Rótulo do fabricante obrigatório','Verificar composição e açúcar no rótulo da marca.',ARRAY['industrializado']::text[]),
('inhame','Inhame cozido','cereais',97.00,1.50,23.00,0.20,1.70,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('iogurte','Iogurte natural sem açúcar','proteinas',61.00,3.60,4.70,3.30,0.00,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','Lactose/gordura e tolerância variam por produto.',ARRAY['laticinio']::text[]),
('laranja','Laranja','frutas',46.00,1.00,11.50,0.20,0.80,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','',ARRAY['acido']::text[]),
('leite','Leite semidesnatado','proteinas',46.00,3.20,4.80,1.70,0.00,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','',ARRAY['laticinio']::text[]),
('lentilha','Lentilha cozida','proteinas',93.00,6.30,16.30,0.50,7.90,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','',ARRAY['fermentavel']::text[]),
('maca','Maçã sem casca','frutas',56.00,0.30,15.00,0.20,1.30,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('macaxeira','Macaxeira/mandioca cozida','cereais',125.00,0.60,30.10,0.30,1.60,'TACO/UNICAMP 4ª ed. (2011)','','{}'::text[]),
('mamão','Mamão','frutas',43.00,0.50,10.00,0.10,1.80,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('mandioca_frita','Macaxeira/mandioca frita','cereais',300.00,1.40,50.30,11.20,1.90,'TACO/UNICAMP 4ª ed. (2011)','',ARRAY['frito','gorduroso']::text[]),
('manga','Manga madura crua','frutas',60.00,0.50,15.00,0.20,1.60,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('maracuja','Maracujá, polpa','frutas',68.00,2.20,12.30,0.70,1.10,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','Fruta ácida: pode aumentar desconforto em algumas pessoas.',ARRAY['acido']::text[]),
('melancia','Melancia','frutas',33.00,0.90,7.50,0.20,0.40,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('melao','Melão cru','frutas',29.00,0.70,7.50,0.10,0.30,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('mingau_aveia','Mingau de aveia feito com água','cereais',72.00,2.50,12.00,1.60,1.20,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','Estimativa para receita simples sem açúcar.','{}'::text[]),
('mucilon','Mucilon (cereal industrializado)','cereais',null,null,null,null,null,'Rótulo do fabricante obrigatório','Produto de fórmula variável; conferir rótulo e faixa etária.',ARRAY['industrializado']::text[]),
('neston','Neston (cereal industrializado)','cereais',null,null,null,null,null,'Rótulo do fabricante obrigatório','Consultar rótulo específico: açúcar, ingredientes e proteína variam.',ARRAY['industrializado']::text[]),
('ovo','Ovo de galinha cozido','proteinas',146.00,12.60,0.60,9.50,0.00,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('peixe','Peixe magro cozido','proteinas',130.00,24.00,0.00,2.50,0.00,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','Valores variam por espécie.','{}'::text[]),
('pepino','Pepino cru','legumes',10.00,0.90,2.00,0.10,1.10,'TACO/UNICAMP 4ª ed. (2011)','','{}'::text[]),
('pera','Pera','frutas',57.00,0.40,15.00,0.10,3.10,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('sardinha','Sardinha assada','proteinas',164.00,29.00,0.00,4.70,0.00,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('suco_maracuja','Suco natural de maracujá sem açúcar','bebidas',27.00,0.30,6.00,0.10,0.20,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','',ARRAY['acido']::text[]),
('tapioca','Tapioca pronta, sem recheio','cereais',224.00,0.10,54.00,0.00,0.20,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('tilapia','Filé de tilápia grelhado','proteinas',128.00,26.00,0.00,2.50,0.00,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('tomate','Tomate cru','legumes',15.00,1.10,3.10,0.20,1.20,'TACO/UNICAMP 4ª ed. (2011)','',ARRAY['acido']::text[]),
('uva','Uva crua','frutas',69.00,0.70,18.00,0.20,0.90,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[]),
('vagem','Vagem cozida','legumes',35.00,1.80,7.00,0.10,3.00,'Estimativa editorial baseada em tabelas brasileiras; confirmar preparo','','{}'::text[])
on conflict(id) do update set name=excluded.name,food_group=excluded.food_group,
 kcal=excluded.kcal,protein_g=excluded.protein_g,carbs_g=excluded.carbs_g,
 fat_g=excluded.fat_g,fiber_g=excluded.fiber_g,provenance=excluded.provenance,
 note=excluded.note,flags=excluded.flags,updated_at=clock_timestamp();
alter table public.care_nutrition_preferences
 add column if not exists target_protein_g numeric(7,1),
 add column if not exists target_carbs_g numeric(7,1),
 add column if not exists target_fat_g numeric(7,1),
 add column if not exists target_kcal numeric(7,1);
alter table public.care_nutrition_preferences drop constraint if exists care_nutrition_macro_target_range;
alter table public.care_nutrition_preferences add constraint care_nutrition_macro_target_range check(
 (target_protein_g is null or target_protein_g between 1 and 500)
 and (target_carbs_g is null or target_carbs_g between 1 and 1200)
 and (target_fat_g is null or target_fat_g between 1 and 350)
 and (target_kcal is null or target_kcal between 500 and 7000));
create table if not exists public.care_food_consumptions(
 id uuid primary key default gen_random_uuid(),
 patient_id uuid not null references public.care_patients(id) on delete cascade,
 owner_id uuid not null,food_id text not null references public.care_food_catalog(id),
 grams numeric(7,1) not null check(grams between 1 and 2000),
 kcal numeric(9,2) not null check(kcal>=0),
 protein_g numeric(8,2) not null check(protein_g>=0),
 carbs_g numeric(8,2) not null check(carbs_g>=0),
 fat_g numeric(8,2) not null check(fat_g>=0),
 fiber_g numeric(8,2) not null check(fiber_g>=0),
 request_id uuid not null,actor_id uuid not null,
 recorded_at timestamptz not null default clock_timestamp(),
 unique(patient_id,request_id)
);
create index if not exists care_food_consumptions_patient_date_idx
 on public.care_food_consumptions(patient_id,recorded_at desc);
alter table public.care_food_consumptions enable row level security;
drop policy if exists care_food_consumptions_read on public.care_food_consumptions;
create policy care_food_consumptions_read on public.care_food_consumptions
 for select to authenticated using(exists(
 select 1 from public.care_patients p where p.id=patient_id
 and p.owner_id=care_food_consumptions.owner_id
 and (p.owner_id=(select auth.uid()) or exists(
  select 1 from public.care_patient_access a where a.patient_id=p.id
  and a.owner_id=p.owner_id and a.user_id=(select auth.uid())
 ))));
revoke all on public.care_food_consumptions from anon,authenticated;
grant select on public.care_food_consumptions to authenticated;
CREATE OR REPLACE FUNCTION public.care_delete_food_portion(p_entry_id uuid, p_verified boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();v_entry public.care_food_consumptions%rowtype;
begin
 if v_uid is null or p_verified is distinct from true then raise exception 'Confirmação necessária';end if;
 select f.* into v_entry from public.care_food_consumptions f
 join public.care_patients p on p.id=f.patient_id and p.owner_id=f.owner_id
 where f.id=p_entry_id and (p.owner_id=v_uid or exists(
   select 1 from public.care_patient_access a
   where a.patient_id=p.id and a.owner_id=p.owner_id and a.user_id=v_uid))
 for update of f;
 if not found then raise exception 'Consumo não encontrado';end if;
 delete from public.care_food_consumptions where id=v_entry.id;
 insert into public.care_activity_log
 (owner_id,patient_id,task_id,category,event_type,scheduled_at,happened_at,recorded_at,actor_id,source,details)
 values(v_entry.owner_id,v_entry.patient_id,null,'refeicao','food_portion_deleted',null,
  null,clock_timestamp(),v_uid,'client_nutrition_library',
  jsonb_build_object('food_id',v_entry.food_id,'grams',v_entry.grams,'entry_id',v_entry.id));
 return jsonb_build_object('deleted_id',v_entry.id);
end $function$

CREATE OR REPLACE FUNCTION public.care_log_food_portion(p_patient_id uuid, p_food_id text, p_grams numeric, p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 v_uid uuid:=auth.uid();v_owner uuid;v_food public.care_food_catalog%rowtype;
 v_entry public.care_food_consumptions%rowtype;v_now timestamptz:=clock_timestamp();
begin
 if v_uid is null or p_patient_id is null or p_request_id is null then
  raise exception 'Sessão, paciente ou identificador inválido';
 end if;
 if p_grams is null or p_grams<1 or p_grams>2000 then
  raise exception 'Porção deve estar entre 1 e 2.000 g';
 end if;
 select p.owner_id into v_owner from public.care_patients p where p.id=p_patient_id
 and (p.owner_id=v_uid or exists(
  select 1 from public.care_patient_access a
  where a.patient_id=p.id and a.owner_id=p.owner_id and a.user_id=v_uid));
 if not found then raise exception 'Prontuário indisponível';end if;
 select * into v_food from public.care_food_catalog where id=p_food_id;
 if not found or v_food.protein_g is null or v_food.carbs_g is null
   or v_food.fat_g is null or v_food.kcal is null then
    raise exception 'Alimento sem dados completos: consulte o rótulo';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,37));
 select * into v_entry from public.care_food_consumptions
 where patient_id=p_patient_id and request_id=p_request_id;
 if found then
  return jsonb_build_object('id',v_entry.id,'recorded_at',v_entry.recorded_at,
     'already_recorded',true);
 end if;
 insert into public.care_food_consumptions
 (patient_id,owner_id,food_id,grams,kcal,protein_g,carbs_g,fat_g,fiber_g,request_id,actor_id,recorded_at)
 values(p_patient_id,v_owner,v_food.id,p_grams,
 round(v_food.kcal*p_grams/100,2),round(v_food.protein_g*p_grams/100,2),
 round(v_food.carbs_g*p_grams/100,2),round(v_food.fat_g*p_grams/100,2),
 round(coalesce(v_food.fiber_g,0)*p_grams/100,2),p_request_id,v_uid,v_now)
 returning * into v_entry;
 insert into public.care_activity_log
 (owner_id,patient_id,task_id,category,event_type,scheduled_at,happened_at,recorded_at,actor_id,source,details)
 values(v_owner,p_patient_id,null,'refeicao','logged',null,v_now,v_now,v_uid,'client_nutrition_library',
 jsonb_build_object('title','Consumo alimentar registrado','food_id',v_food.id,
   'food_name',v_food.name,'grams',v_entry.grams,
   'kcal',v_entry.kcal,'protein_g',v_entry.protein_g,
   'carbs_g',v_entry.carbs_g,'fat_g',v_entry.fat_g,
   'request_id',p_request_id::text,'time_source','server','unscheduled',true));
 return jsonb_build_object('id',v_entry.id,'recorded_at',v_entry.recorded_at,
   'grams',v_entry.grams,'protein_g',v_entry.protein_g,'carbs_g',v_entry.carbs_g,
   'fat_g',v_entry.fat_g,'kcal',v_entry.kcal,'already_recorded',false);
end $function$

revoke all on function public.care_log_food_portion(uuid,text,numeric,uuid) from public,anon;
grant execute on function public.care_log_food_portion(uuid,text,numeric,uuid) to authenticated;
revoke all on function public.care_delete_food_portion(uuid,boolean) from public,anon;
grant execute on function public.care_delete_food_portion(uuid,boolean) to authenticated;
