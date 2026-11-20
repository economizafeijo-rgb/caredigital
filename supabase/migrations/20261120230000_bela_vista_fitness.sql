-- Loja Bela Vista Fitness (Kessia de Sousa Oliveira), Feijó/AC. Dona: centralappfj@gmail.com.
-- Novas categorias de produto: beleza e bijuterias.
alter table public.care_store_products drop constraint if exists care_store_products_category_check;
alter table public.care_store_products add constraint care_store_products_category_check
  check (category in ('suplementos','vitaminas','nutricao','roupas-masculinas','roupas-femininas','acessorios','naturais','fitoterapicos','farmacia','beleza','bijuterias','outros'));

do $$
declare v_owner uuid; v_admin uuid; v_vendor uuid; r record; i int := 0;
begin
  select id into v_owner from auth.users where lower(email) = 'centralappfj@gmail.com';
  select id into v_admin from auth.users where lower(email) = 'francdenisbr@gmail.com';
  if v_admin is null and v_owner is null then return; end if;
  select id into v_vendor from public.care_store_vendors where slug = 'bela-vista-fitness';
  if v_vendor is null then
    insert into public.care_store_vendors(owner_id,name,slug,segment,description,logo_url,phone,city,address,offers_delivery,offers_pickup,delivery_fee_cents,free_delivery_from_cents,delivery_area,status,plan,monthly_fee_cents,commission_bps,verified,accent_hex,banner_url,opening_hours,prep_minutes,delivery_minutes,is_demo)
    values (coalesce(v_owner, v_admin),'Bela Vista Fitness','bela-vista-fitness','roupas',
      'Treine com estilo. Brilhe em tudo. Moda fitness feminina, suplementos, beleza e bijuterias selecionadas por Kessia de Sousa Oliveira.',
      'https://nextvita.life/loja/bela-vista/logo.svg','68999990000','Feijó','Rua Joel Ferreira de Sousa · Feijó, AC · CEP 69960-000',true,true,700,19900,'Feijó: Centro e bairros próximos','ativo','basico',0,1000,true,'#9f1d5a','https://nextvita.life/loja/bela-vista/banner.svg','Seg a sáb · 8h às 19h',30,120,false)
    returning id into v_vendor;
  end if;
  for r in select * from (values
  ('legging-cos-alto','Legging Cintura Alta Compressão','roupas-femininas',11990,13990,'Compressão confortável, cós alto que modela e tecido que não marca.',24,'https://nextvita.life/loja/bela-vista/legging-cos-alto.svg','[{"name": "Preto", "hex": "#111827", "stock": 9}, {"name": "Vinho", "hex": "#7f1d4a", "stock": 8}, {"name": "Marinho", "hex": "#1e3a8a", "stock": 7}]'::jsonb,null,'auto','un',true),
  ('legging-seamless','Legging Seamless Textura','roupas-femininas',13990,null,'Sem costura, textura canelada e acabamento macio na pele.',16,'https://nextvita.life/loja/bela-vista/legging-seamless.svg','[{"name": "Rosé", "hex": "#e8a2bd", "stock": 6}, {"name": "Grafite", "hex": "#374151", "stock": 5}, {"name": "Bordô", "hex": "#7f1d3a", "stock": 5}]'::jsonb,null,'auto','un',false),
  ('legging-estampada','Legging Estampada Aurora','roupas-femininas',12990,null,'Estampa exclusiva com tecido de alta durabilidade.',12,'https://nextvita.life/loja/bela-vista/legging-estampada.svg','[]'::jsonb,null,'auto','un',false),
  ('top-sustentacao','Top Fitness Sustentação Média','roupas-femininas',7990,null,'Bojo removível, alças reforçadas e tecido respirável.',30,'https://nextvita.life/loja/bela-vista/top-sustentacao.svg','[{"name": "Preto", "hex": "#111827", "stock": 10}, {"name": "Rosé", "hex": "#f4a6c0", "stock": 10}, {"name": "Verde", "hex": "#10b981", "stock": 0}, {"name": "Branco", "hex": "#f9fafb", "stock": 10}]'::jsonb,null,'auto','un',false),
  ('top-cropped','Cropped Canelado','roupas-femininas',6490,null,'Cropped leve para treino e para o dia a dia.',22,'https://nextvita.life/loja/bela-vista/top-cropped.svg','[{"name": "Preto", "hex": "#111827", "stock": 8}, {"name": "Nude", "hex": "#e7c6b0", "stock": 7}, {"name": "Vinho", "hex": "#7f1d4a", "stock": 7}]'::jsonb,null,'auto','un',false),
  ('conjunto-ellegance','Conjunto Top + Legging Elegance','roupas-femininas',18990,21990,'Conjunto coordenado, ideal para musculação e funcional.',14,'https://nextvita.life/loja/bela-vista/conjunto-ellegance.svg','[{"name": "Preto", "hex": "#111827", "stock": 5}, {"name": "Rosé", "hex": "#f4a6c0", "stock": 5}, {"name": "Marinho", "hex": "#1e3a8a", "stock": 4}]'::jsonb,null,'auto','un',true),
  ('conjunto-seamless','Conjunto Seamless Glow','roupas-femininas',19990,null,'Modelagem sem costura que acompanha o corpo.',9,'https://nextvita.life/loja/bela-vista/conjunto-seamless.svg','[{"name": "Vinho", "hex": "#7f1d4a", "stock": 5}, {"name": "Nude", "hex": "#e7c6b0", "stock": 4}]'::jsonb,null,'auto','un',false),
  ('conjunto-jaqueta','Conjunto 3 Peças com Jaqueta','roupas-femininas',25990,29990,'Top, legging e jaqueta corta-vento para o antes e depois do treino.',6,'https://nextvita.life/loja/bela-vista/conjunto-jaqueta.svg','[]'::jsonb,2,'auto','un',true),
  ('short-cintura-alta','Short Cintura Alta Fitness','roupas-femininas',6990,null,'Short com cós alto, bolso lateral e secagem rápida.',26,'https://nextvita.life/loja/bela-vista/short-cintura-alta.svg','[{"name": "Preto", "hex": "#111827", "stock": 10}, {"name": "Cinza", "hex": "#9ca3af", "stock": 8}, {"name": "Rosé", "hex": "#f4a6c0", "stock": 8}]'::jsonb,null,'auto','un',false),
  ('short-saia','Short-Saia Esportivo','roupas-femininas',8990,null,'Liberdade de movimento com visual feminino.',15,'https://nextvita.life/loja/bela-vista/short-saia.svg','[{"name": "Preto", "hex": "#111827", "stock": 8}, {"name": "Branco", "hex": "#f9fafb", "stock": 7}]'::jsonb,null,'auto','un',false),
  ('macaquinho','Macaquinho Fitness Sofisticado','roupas-femininas',12990,14990,'Peça única, com forro interno e compressão leve.',10,'https://nextvita.life/loja/bela-vista/macaquinho.svg','[{"name": "Preto", "hex": "#111827", "stock": 5}, {"name": "Vinho", "hex": "#7f1d4a", "stock": 5}]'::jsonb,null,'auto','un',true),
  ('regata-alongada','Regata Alongada Dry','roupas-femininas',5990,null,'Alongada, leve e com tecido que seca rápido.',28,'https://nextvita.life/loja/bela-vista/regata-alongada.svg','[{"name": "Branco", "hex": "#f9fafb", "stock": 10}, {"name": "Rosa", "hex": "#ec4899", "stock": 9}, {"name": "Preto", "hex": "#111827", "stock": 9}]'::jsonb,null,'auto','un',false),
  ('jaqueta-corta-vento','Jaqueta Corta-Vento Metalizada','roupas-femininas',15990,null,'Leve e impermeável, com detalhe dourado.',0,'https://nextvita.life/loja/bela-vista/jaqueta-corta-vento.svg','[{"name": "Preto", "hex": "#111827", "stock": 0}, {"name": "Rosa", "hex": "#ec4899", "stock": 0}]'::jsonb,null,'auto','un',false),
  ('vestido-fitness','Vestido Fitness Ribana','roupas-femininas',13990,null,'Vestido de academia com bermuda interna.',8,'https://nextvita.life/loja/bela-vista/vestido-fitness.svg','[{"name": "Preto", "hex": "#111827", "stock": 4}, {"name": "Nude", "hex": "#e7c6b0", "stock": 4}]'::jsonb,null,'auto','un',false),
  ('whey-isolado','Whey Protein Isolado 900 g','suplementos',17990,19990,'Proteína isolada de rápida absorção para recuperação muscular.',18,'https://nextvita.life/loja/bela-vista/whey-isolado.svg','[]'::jsonb,3,'auto','un',true),
  ('colageno','Colágeno Hidrolisado 300 g','suplementos',8990,null,'Colágeno em pó para pele, cabelos, unhas e articulações.',22,'https://nextvita.life/loja/bela-vista/colageno.svg','[]'::jsonb,null,'auto','un',false),
  ('creatina','Creatina Monohidratada 300 g','suplementos',8490,null,'Força e desempenho em treinos intensos.',20,'https://nextvita.life/loja/bela-vista/creatina.svg','[]'::jsonb,null,'auto','un',false),
  ('termogenico','Termogênico em Cápsulas 60 cps','suplementos',9990,null,'Apoio ao metabolismo e à disposição no treino.',11,'https://nextvita.life/loja/bela-vista/termogenico.svg','[]'::jsonb,2,'auto','un',false),
  ('multi-feminino','Multivitamínico Feminino 60 cps','suplementos',6490,null,'Vitaminas e minerais pensados para a rotina feminina.',17,'https://nextvita.life/loja/bela-vista/multi-feminino.svg','[]'::jsonb,null,'auto','un',false),
  ('omega3','Ômega 3 120 cápsulas','suplementos',5490,null,'Óleo de peixe com EPA e DHA para o dia a dia.',15,'https://nextvita.life/loja/bela-vista/omega3.svg','[]'::jsonb,null,'auto','un',false),
  ('pre-treino','Pré-Treino Energy 300 g','suplementos',11990,13490,'Energia e foco para treinos intensos.',0,'https://nextvita.life/loja/bela-vista/pre-treino.svg','[]'::jsonb,null,'auto','un',true),
  ('shaker-600','Coqueteleira Shaker 600 ml','acessorios',3990,null,'Tampa de segurança e misturador interno.',34,'https://nextvita.life/loja/bela-vista/shaker-600.svg','[{"name": "Rosa", "hex": "#f4a6c0", "stock": 12}, {"name": "Preto", "hex": "#111827", "stock": 12}, {"name": "Lilás", "hex": "#c4b5fd", "stock": 10}]'::jsonb,null,'auto','un',false),
  ('garrafa-2l','Garrafa Motivacional 2 L','acessorios',4990,null,'Marcação de horários para bater a meta de água.',19,'https://nextvita.life/loja/bela-vista/garrafa-2l.svg','[]'::jsonb,null,'auto','un',false),
  ('bolsa-treino','Bolsa de Treino Premium','acessorios',15990,null,'Compartimento para tênis, bolso térmico e alça ajustável.',8,'https://nextvita.life/loja/bela-vista/bolsa-treino.svg','[{"name": "Preto", "hex": "#111827", "stock": 4}, {"name": "Vinho", "hex": "#7f1d4a", "stock": 4}]'::jsonb,null,'auto','un',false),
  ('tapete-yoga','Tapete de Yoga e Pilates','acessorios',7990,null,'Antiderrapante, 6 mm de espessura.',13,'https://nextvita.life/loja/bela-vista/tapete-yoga.svg','[{"name": "Rosa", "hex": "#ec4899", "stock": 7}, {"name": "Lilás", "hex": "#a78bfa", "stock": 6}]'::jsonb,null,'auto','un',false),
  ('elasticos','Kit Mini Band 5 Níveis','acessorios',5990,6990,'Elásticos de resistência para glúteos e pernas.',25,'https://nextvita.life/loja/bela-vista/elasticos.svg','[]'::jsonb,null,'auto','kit',true),
  ('corda-pular','Corda de Pular Ajustável','acessorios',3490,null,'Cabos com rolamento e ajuste de altura.',21,'https://nextvita.life/loja/bela-vista/corda-pular.svg','[]'::jsonb,null,'auto','un',false),
  ('faixa-cabelo','Faixa de Cabelo Esportiva','acessorios',1990,null,'Elástica e antiderrapante, não marca a testa.',40,'https://nextvita.life/loja/bela-vista/faixa-cabelo.svg','[{"name": "Preto", "hex": "#111827", "stock": 20}, {"name": "Rosé", "hex": "#f4a6c0", "stock": 20}]'::jsonb,5,'auto','un',false),
  ('batom-matte','Batom Matte Longa Duração','beleza',3490,null,'Cor intensa, acabamento aveludado e conforto o dia todo.',45,'https://nextvita.life/loja/bela-vista/batom-matte.svg','[{"name": "Vermelho", "hex": "#b3123f", "stock": 15}, {"name": "Rosé", "hex": "#d86a8c", "stock": 15}, {"name": "Nude", "hex": "#c98a7a", "stock": 15}, {"name": "Vinho", "hex": "#6d1a36", "stock": 0}]'::jsonb,null,'auto','un',false),
  ('gloss','Gloss Labial Brilho Espelhado','beleza',2490,null,'Hidratação e brilho intenso sem ficar pegajoso.',38,'https://nextvita.life/loja/bela-vista/gloss.svg','[{"name": "Transparente", "hex": "#fce7f3", "stock": 20}, {"name": "Rosa", "hex": "#f48fb1", "stock": 18}]'::jsonb,null,'auto','un',false),
  ('base-liquida','Base Líquida Alta Cobertura','beleza',5990,null,'Textura leve, resistente ao suor.',14,'https://nextvita.life/loja/bela-vista/base-liquida.svg','[{"name": "Clara", "hex": "#f1d3bf", "stock": 5}, {"name": "Média", "hex": "#d9a77f", "stock": 5}, {"name": "Morena", "hex": "#a87050", "stock": 4}]'::jsonb,null,'auto','un',false),
  ('mascara-cilios','Máscara de Cílios Volume','beleza',3990,null,'Volume e curvatura que resistem ao treino.',28,'https://nextvita.life/loja/bela-vista/mascara-cilios.svg','[]'::jsonb,null,'auto','un',false),
  ('serum-facial','Sérum Facial Vitamina C','beleza',6990,7990,'Ilumina e uniformiza o tom da pele.',16,'https://nextvita.life/loja/bela-vista/serum-facial.svg','[]'::jsonb,3,'auto','un',true),
  ('protetor-solar','Protetor Solar FPS 50 Toque Seco','beleza',4990,null,'Proteção diária, ideal para treinos ao ar livre.',32,'https://nextvita.life/loja/bela-vista/protetor-solar.svg','[]'::jsonb,null,'auto','un',false),
  ('hidratante-corporal','Hidratante Corporal Nutritivo','beleza',3990,null,'Hidratação profunda com perfume suave.',27,'https://nextvita.life/loja/bela-vista/hidratante-corporal.svg','[]'::jsonb,null,'auto','un',false),
  ('perfume-bela','Perfume Bela Vista 50 ml','beleza',12990,null,'Fragrância floral com fundo amadeirado.',9,'https://nextvita.life/loja/bela-vista/perfume-bela.svg','[]'::jsonb,2,'auto','un',false),
  ('kit-skincare','Kit Skincare Rotina Completa','beleza',17990,21990,'Limpeza, tônico, sérum e hidratante em um só kit.',7,'https://nextvita.life/loja/bela-vista/kit-skincare.svg','[]'::jsonb,2,'auto','kit',true),
  ('cordao-folheado','Cordão Folheado a Ouro','bijuterias',8990,null,'Corrente delicada com banho de ouro 18k.',20,'https://nextvita.life/loja/bela-vista/cordao-folheado.svg','[]'::jsonb,null,'auto','un',false),
  ('colar-ponto-luz','Colar Ponto de Luz','bijuterias',6990,null,'Pingente com zircônia, brilho discreto.',18,'https://nextvita.life/loja/bela-vista/colar-ponto-luz.svg','[{"name": "Dourado", "hex": "#d9b382", "stock": 10}, {"name": "Prata", "hex": "#cbd5e1", "stock": 8}]'::jsonb,null,'auto','un',false),
  ('brinco-argola','Brinco Argola Grande','bijuterias',4990,null,'Argola leve com banho de ouro.',30,'https://nextvita.life/loja/bela-vista/brinco-argola.svg','[{"name": "Dourado", "hex": "#d9b382", "stock": 15}, {"name": "Prata", "hex": "#cbd5e1", "stock": 15}]'::jsonb,null,'auto','par',false),
  ('brinco-perola','Brinco Pérola Clássico','bijuterias',3990,null,'Pérola cultivada com haste em prata.',24,'https://nextvita.life/loja/bela-vista/brinco-perola.svg','[]'::jsonb,null,'auto','par',false),
  ('pulseira-pingentes','Pulseira com Pingentes','bijuterias',5990,null,'Pulseira ajustável com pingentes de coração.',15,'https://nextvita.life/loja/bela-vista/pulseira-pingentes.svg','[]'::jsonb,null,'auto','un',false),
  ('anel-solitario','Anel Solitário Zircônia','bijuterias',4490,null,'Aro ajustável com zircônia cravejada.',0,'https://nextvita.life/loja/bela-vista/anel-solitario.svg','[]'::jsonb,null,'auto','un',false),
  ('colar-perolas','Colar de Pérolas Curto','bijuterias',7990,8990,'Pérolas cultivadas com fecho dourado.',10,'https://nextvita.life/loja/bela-vista/colar-perolas.svg','[]'::jsonb,3,'auto','un',true),
  ('kit-bijuteria','Kit Bijuterias 5 Peças','bijuterias',10990,13990,'Cordão, brincos, pulseira e anel combinando.',6,'https://nextvita.life/loja/bela-vista/kit-bijuteria.svg','[]'::jsonb,2,'auto','kit',true)
  ) as t(ref,name,category,price,old,text,stock,img,colors,lim,av,unit,feat) loop
    i := i + 1;
    if exists (select 1 from public.care_store_products where vendor_id = v_vendor and ref = r.ref) then continue; end if;
    insert into public.care_store_products(vendor_id,name,category,description,price_cents,old_price_cents,image_url,stock,min_stock,cost_cents,sku,ref,unit,colors,display_limit,availability,featured)
    values (v_vendor,r.name,r.category,r.text,r.price,r.old,r.img,r.stock,4,(r.price*0.5)::int,'BVF-'||(100+i),r.ref,r.unit,r.colors,r.lim,r.av,r.feat);
  end loop;
end $$;

-- Quando a dona criar a conta com o e-mail combinado, a loja passa para o nome dela.
create or replace function public.care_store_claim_bela_vista()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if lower(new.email) = 'centralappfj@gmail.com' then
    update public.care_store_vendors set owner_id = new.id where slug = 'bela-vista-fitness';
  end if;
  return new;
end;
$$;
do $$
begin
  drop trigger if exists care_store_claim_bela_vista on auth.users;
  create trigger care_store_claim_bela_vista after insert on auth.users for each row execute function public.care_store_claim_bela_vista();
exception when others then raise notice 'Não foi possível criar o gatilho em auth.users; vincule a loja manualmente.';
end $$;
-- Se a conta já existir, garante o vínculo agora.
update public.care_store_vendors v set owner_id = u.id from auth.users u
 where v.slug = 'bela-vista-fitness' and lower(u.email) = 'centralappfj@gmail.com';
