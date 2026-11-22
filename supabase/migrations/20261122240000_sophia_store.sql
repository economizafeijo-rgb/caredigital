-- Sophia Store (infanto-juvenil), Bela Vista, Feijó/AC. Dona: fjconcursoac11@gmail.com.
-- A conta (e a senha) é criada pela própria dona em /entrar; a loja é vinculada ao e-mail.
alter table public.care_store_products drop constraint if exists care_store_products_category_check;
alter table public.care_store_products add constraint care_store_products_category_check
  check (category in ('suplementos','vitaminas','nutricao','roupas-masculinas','roupas-femininas','acessorios','naturais','fitoterapicos','farmacia','beleza','bijuterias','papelaria','infantil','festa','outros'));

do $$
declare v_owner uuid; v_admin uuid; v_vendor uuid; r record; i int := 0;
begin
  select id into v_owner from auth.users where lower(email) = 'fjconcursoac11@gmail.com';
  select id into v_admin from auth.users where lower(email) = 'francdenisbr@gmail.com';
  if v_admin is null and v_owner is null then return; end if;
  select id into v_vendor from public.care_store_vendors where slug = 'sophia-store';
  if v_vendor is null then
    insert into public.care_store_vendors(owner_id,name,slug,segment,description,logo_url,phone,city,address,offers_delivery,offers_pickup,delivery_fee_cents,free_delivery_from_cents,delivery_area,status,plan,monthly_fee_cents,commission_bps,verified,accent_hex,banner_url,opening_hours,prep_minutes,delivery_minutes,is_demo)
    values (coalesce(v_owner, v_admin),'Sophia Store','sophia-store','outros',
      'Tudo para o mundo infanto-juvenil: papelaria, canetas, cadernos personalizados, kits de miçangas, camisas, bonés, esmaltes, pulseiras, mochilas e pack de topos de bolo.',
      'https://nextvita.life/loja/sophia-store/logo.svg','68999990000','Feijó','Rua Joel Ferreira de Sousa · Bela Vista · Feijó, AC',true,true,500,15000,'Feijó: Bela Vista e bairros próximos','ativo','basico',0,1000,true,'#d946ef','https://nextvita.life/loja/sophia-store/banner.svg','Seg a sáb · 8h às 18h',30,90,false)
    returning id into v_vendor;
  end if;
  for r in select * from (values
  ('caneta-gel-glitter','Kit Canetas Gel Glitter 12 cores','papelaria',2990,3490,'Tinta com brilho, ponta fina e cores vibrantes para desenhar e decorar.',30,'https://nextvita.life/loja/sophia-store/caneta-gel-glitter.svg','[]'::jsonb,null,'auto','kit',true),
  ('caneta-pastel','Canetas Tons Pastel 6 un','papelaria',1990,null,'Cores suaves para cadernos, agendas e planners.',28,'https://nextvita.life/loja/sophia-store/caneta-pastel.svg','[]'::jsonb,null,'auto','kit',false),
  ('lapis-cor','Lápis de Cor 24 cores','papelaria',2490,null,'Cores macias e pigmentadas, ideais para a escola.',35,'https://nextvita.life/loja/sophia-store/lapis-cor.svg','[]'::jsonb,null,'auto','kit',false),
  ('caderno-personalizado','Caderno Personalizado com Nome','papelaria',3990,null,'Capa dura com nome da criança, 96 folhas pautadas.',20,'https://nextvita.life/loja/sophia-store/caderno-personalizado.svg','[]'::jsonb,null,'auto','un',true),
  ('caderno-unicornio','Caderno Brochura Unicórnio','papelaria',2290,null,'Capa ilustrada, 80 folhas, ótimo para a rotina escolar.',26,'https://nextvita.life/loja/sophia-store/caderno-unicornio.svg','[]'::jsonb,null,'auto','un',false),
  ('agenda-planner','Agenda Planner Infantil','papelaria',3490,null,'Rotina, tarefas e adesivos para organizar o dia.',14,'https://nextvita.life/loja/sophia-store/agenda-planner.svg','[]'::jsonb,null,'auto','un',false),
  ('adesivos','Cartela de Adesivos Fofinhos','papelaria',990,null,'Adesivos de bichinhos, flores e estrelas.',50,'https://nextvita.life/loja/sophia-store/adesivos.svg','[]'::jsonb,null,'auto','un',false),
  ('kit-papelaria','Kit Volta às Aulas Completo','papelaria',8990,10990,'Caderno, estojo, canetas, lápis, borracha e apontador.',12,'https://nextvita.life/loja/sophia-store/kit-papelaria.svg','[]'::jsonb,null,'auto','kit',true),
  ('estojo','Estojo Duplo Glitter','papelaria',2790,null,'Dois compartimentos, zíper reforçado e acabamento brilhante.',22,'https://nextvita.life/loja/sophia-store/estojo.svg','[]'::jsonb,null,'auto','un',false),
  ('mochila-escolar','Mochila Escolar Infantil','infantil',8990,10990,'Alças acolchoadas, bolso frontal e estampa divertida.',10,'https://nextvita.life/loja/sophia-store/mochila-escolar.svg','[]'::jsonb,null,'auto','un',true),
  ('lancheira','Lancheira Térmica Infantil','infantil',4990,null,'Mantém o lanche fresquinho, fácil de lavar.',15,'https://nextvita.life/loja/sophia-store/lancheira.svg','[]'::jsonb,null,'auto','un',false),
  ('garrafinha','Garrafinha com Canudo 500 ml','infantil',2990,null,'Tampa com trava e canudo de silicone.',24,'https://nextvita.life/loja/sophia-store/garrafinha.svg','[]'::jsonb,null,'auto','un',false),
  ('camisa-infantil','Camiseta Infantil Estampada','roupas-femininas',3990,null,'Algodão macio, estampas variadas. Tamanhos 2 a 12.',30,'https://nextvita.life/loja/sophia-store/camisa-infantil.svg','[]'::jsonb,null,'auto','un',false),
  ('camisa-personalizada','Camisa Personalizada com Nome','roupas-femininas',4990,5990,'Estampa personalizada para aniversários e passeios.',18,'https://nextvita.life/loja/sophia-store/camisa-personalizada.svg','[]'::jsonb,null,'auto','un',true),
  ('bone','Boné Infantil Ajustável','acessorios',2490,null,'Aba curva, regulagem traseira, várias cores.',25,'https://nextvita.life/loja/sophia-store/bone.svg','[]'::jsonb,null,'auto','un',false),
  ('pulseira-micanga','Pulseira de Miçangas','bijuterias',990,null,'Colorida e delicada, feita à mão.',60,'https://nextvita.life/loja/sophia-store/pulseira-micanga.svg','[]'::jsonb,null,'auto','un',false),
  ('pulseira-nome','Pulseira com Nome em Letrinhas','bijuterias',1990,null,'Monte o nome da criança com letras coloridas.',40,'https://nextvita.life/loja/sophia-store/pulseira-nome.svg','[]'::jsonb,null,'auto','un',true),
  ('kit-micangas','Kit de Miçangas para Montar','infantil',3490,4290,'Miçangas, fios e fechos para fazer pulseiras e colares.',16,'https://nextvita.life/loja/sophia-store/kit-micangas.svg','[]'::jsonb,null,'auto','kit',true),
  ('kit-pulseiras','Kit Pulseiras Fofas 5 un','bijuterias',1990,null,'Cinco pulseiras combinando.',30,'https://nextvita.life/loja/sophia-store/kit-pulseiras.svg','[]'::jsonb,null,'auto','kit',false),
  ('esmalte-infantil','Esmalte Infantil Lavável','beleza',990,null,'Não tóxico, sai com água e sabão.',45,'https://nextvita.life/loja/sophia-store/esmalte-infantil.svg','[]'::jsonb,null,'auto','un',false),
  ('kit-esmaltes','Kit 6 Esmaltes Infantis','beleza',4990,5990,'Seis cores, sem cheiro forte, com adesivos de unha.',14,'https://nextvita.life/loja/sophia-store/kit-esmaltes.svg','[]'::jsonb,null,'auto','kit',true),
  ('kit-maquiagem','Kit Maquiagem Infantil Lavável','beleza',5490,null,'Brilho labial, sombra e blush suaves.',12,'https://nextvita.life/loja/sophia-store/kit-maquiagem.svg','[]'::jsonb,null,'auto','kit',false),
  ('presilhas','Kit Presilhas e Laços 10 un','acessorios',1890,null,'Laços, presilhas e xuxinhas coloridos.',34,'https://nextvita.life/loja/sophia-store/presilhas.svg','[]'::jsonb,null,'auto','kit',false),
  ('tiara','Tiara Princesa Brilhante','acessorios',2290,null,'Tiara com brilho para festas e brincadeiras.',18,'https://nextvita.life/loja/sophia-store/tiara.svg','[]'::jsonb,null,'auto','un',false),
  ('topo-bolo','Pack Topos de Bolo Personalizados','festa',3990,null,'Topos de bolo temáticos, impressos em papel especial.',20,'https://nextvita.life/loja/sophia-store/topo-bolo.svg','[]'::jsonb,null,'auto','pack',true),
  ('pack-festa','Pack Decoração de Festa','festa',5990,6990,'Topos, tags, caixinhas e painel no tema escolhido.',10,'https://nextvita.life/loja/sophia-store/pack-festa.svg','[]'::jsonb,null,'auto','pack',true),
  ('caixinha-lembrancinha','Caixinhas de Lembrancinha 10 un','festa',2490,null,'Caixinhas personalizadas para aniversário.',25,'https://nextvita.life/loja/sophia-store/caixinha-lembrancinha.svg','[]'::jsonb,null,'auto','pack',false),
  ('squishy','Squishy Macio Bichinho','infantil',1490,null,'Antiestresse macio, vários modelos.',40,'https://nextvita.life/loja/sophia-store/squishy.svg','[]'::jsonb,null,'auto','un',false),
  ('slime-kit','Kit Slime Divertido','infantil',2490,null,'Kit para fazer slime com glitter e cores.',20,'https://nextvita.life/loja/sophia-store/slime-kit.svg','[]'::jsonb,null,'auto','kit',false)
  ) as t(ref,name,category,price,old,text,stock,img,colors,lim,av,unit,feat) loop
    i := i + 1;
    if exists (select 1 from public.care_store_products where vendor_id = v_vendor and ref = r.ref) then continue; end if;
    insert into public.care_store_products(vendor_id,name,category,description,price_cents,old_price_cents,image_url,stock,min_stock,cost_cents,sku,ref,unit,colors,display_limit,availability,featured)
    values (v_vendor,r.name,r.category,r.text,r.price,r.old,r.img,r.stock,4,(r.price*0.5)::int,'SOF-'||(100+i),r.ref,r.unit,r.colors,r.lim,r.av,r.feat);
  end loop;
end $$;

-- Quando a dona criar a conta com o e-mail combinado, a loja passa para o nome dela.
create or replace function public.care_store_claim_sophia()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if lower(new.email) = 'fjconcursoac11@gmail.com' then
    update public.care_store_vendors set owner_id = new.id where slug = 'sophia-store';
  end if;
  return new;
end;
$$;
do $$
begin
  drop trigger if exists care_store_claim_sophia on auth.users;
  create trigger care_store_claim_sophia after insert on auth.users for each row execute function public.care_store_claim_sophia();
exception when others then raise notice 'Não foi possível criar o gatilho em auth.users; vincule a loja manualmente.';
end $$;
