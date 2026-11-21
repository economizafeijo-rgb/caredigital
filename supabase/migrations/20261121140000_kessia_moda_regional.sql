-- Linha de moda regional da Kessia' Digital Store (Feijó, Acre). Idempotente: só insere o que ainda não existe.
do $$
declare v_vendor uuid; r record; i int := 0;
begin
  select id into v_vendor from public.care_store_vendors where slug = 'kessia-digital-store';
  if v_vendor is null then
    raise notice 'Loja kessia-digital-store não encontrada; nada a inserir.';
    return;
  end if;
  for r in select * from (values
    ('vestido-floresta','Vestido Midi Estampa Floresta','roupas-femininas',15990,18990,'Algodão leve com estampa de folhas amazônicas, ideal para o calor do Acre.',12,'[]'::jsonb,2,true),
    ('saia-acai','Saia Longa Fluida Açaí','roupas-femininas',11990,null,'Saia longa com caimento fluido na cor do açaí e cós confortável.',10,'[]'::jsonb,null,false),
    ('cropped-bordado','Cropped Bordado à Mão','roupas-femininas',8990,10990,'Algodão cru com bordado de flores feito por artesãs da região.',14,'[]'::jsonb,3,true),
    ('camiseta-feijo','Camiseta Feijó · Acre','roupas-femininas',5990,null,'Algodão penteado com estampa que celebra a nossa cidade.',30,'[{"name": "Areia", "hex": "#f6e3a1", "stock": 15}, {"name": "Verde", "hex": "#0e7a5f", "stock": 15}]'::jsonb,null,false),
    ('canga-amazonia','Canga Amazônia','acessorios',6990,null,'Canga estampada para rio, piscina e passeio, 1,60 m x 1,10 m.',18,'[]'::jsonb,null,false),
    ('chapeu-palha','Chapéu de Palha Trançada','acessorios',5490,6990,'Aba larga e fita em cor de contraste, protege do sol de Feijó.',16,'[]'::jsonb,3,true),
    ('bolsa-palha','Bolsa de Palha com Alça de Couro','acessorios',13990,null,'Trançado artesanal, forro de tecido e fecho com botão.',8,'[]'::jsonb,2,false),
    ('colar-sementes','Colar de Sementes Regionais','bijuterias',4990,null,'Biojoia artesanal com sementes amazônicas e pingente folheado.',22,'[]'::jsonb,null,false),
    ('brinco-buriti','Brinco de Fibra de Buriti','bijuterias',3990,4990,'Leves e artesanais, feitos com fibra de buriti trançada.',26,'[]'::jsonb,null,true)
  ) as t(ref,name,category,price,old,text,stock,colors,lim,feat) loop
    i := i + 1;
    if exists (select 1 from public.care_store_products where vendor_id = v_vendor and ref = r.ref) then continue; end if;
    insert into public.care_store_products(vendor_id,name,category,description,price_cents,old_price_cents,image_url,stock,min_stock,cost_cents,sku,ref,unit,colors,display_limit,availability,featured)
    values (v_vendor,r.name,r.category,r.text,r.price,r.old,'https://nextvita.life/loja/kessia/'||r.ref||'.png',r.stock,4,(r.price*0.5)::int,'KDS-'||(200+i),r.ref,'un',r.colors,r.lim,'auto',r.feat);
  end loop;
end $$;
