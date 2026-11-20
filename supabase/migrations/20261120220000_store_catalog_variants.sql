-- Catálogo completo: cores, limite de exibição no site e disponibilidade manual.
alter table public.care_store_products
  add column if not exists colors jsonb not null default '[]'::jsonb,
  add column if not exists display_limit integer check (display_limit is null or display_limit between 1 and 1000),
  add column if not exists availability text not null default 'auto' check (availability in ('auto','indisponivel','esgotado')),
  add column if not exists featured boolean not null default false;

-- O pedido recusa produto indisponível/esgotado ou acima do limite por pedido.
create or replace function public.care_store_place_order(
  p_vendor_id uuid, p_items jsonb, p_fulfillment text, p_name text, p_phone text,
  p_address text, p_payment text, p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_vendor public.care_store_vendors%rowtype;
  v_item jsonb;
  v_prod public.care_store_products%rowtype;
  v_qty integer;
  v_subtotal integer := 0;
  v_fee integer := 0;
  v_commission integer;
  v_lines jsonb := '[]'::jsonb;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'Cart invalid';
  end if;
  if p_fulfillment not in ('entrega','retirada') or p_payment not in ('pix','cartao','boleto','dinheiro')
     or char_length(btrim(coalesce(p_name,''))) < 3
     or char_length(regexp_replace(coalesce(p_phone,''), '\D', '', 'g')) < 10 then
    raise exception 'Order fields invalid';
  end if;
  select * into v_vendor from public.care_store_vendors where id = p_vendor_id and status = 'ativo';
  if not found then raise exception 'Vendor unavailable'; end if;
  if p_fulfillment = 'entrega' and not v_vendor.offers_delivery then raise exception 'Delivery not offered'; end if;
  if p_fulfillment = 'retirada' and not v_vendor.offers_pickup then raise exception 'Pickup not offered'; end if;
  if p_fulfillment = 'entrega' and char_length(btrim(coalesce(p_address,''))) < 8 then raise exception 'Address required'; end if;

  perform set_config('nv.stock_reason', 'venda', true);
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'qty')::integer;
    if v_qty is null or v_qty not between 1 and 20 then raise exception 'Quantity invalid'; end if;
    select * into v_prod from public.care_store_products
      where id = (v_item ->> 'product_id')::uuid and vendor_id = p_vendor_id and active for update;
    if not found then raise exception 'Product unavailable'; end if;
    if v_prod.availability <> 'auto' then raise exception 'Product unavailable'; end if;
    if v_prod.display_limit is not null and v_qty > v_prod.display_limit then raise exception 'Quantity invalid'; end if;
    if v_prod.stock < v_qty then raise exception 'Out of stock: %', v_prod.name; end if;
    update public.care_store_products set stock = stock - v_qty, updated_at = now() where id = v_prod.id;
    v_subtotal := v_subtotal + v_prod.price_cents * v_qty;
    v_lines := v_lines || jsonb_build_object('id', v_prod.id, 'name', v_prod.name, 'qty', v_qty, 'price_cents', v_prod.price_cents, 'image_url', v_prod.image_url);
  end loop;
  perform set_config('nv.stock_reason', '', true);

  if p_fulfillment = 'entrega' then
    v_fee := case when v_vendor.free_delivery_from_cents is not null and v_subtotal >= v_vendor.free_delivery_from_cents
                  then 0 else v_vendor.delivery_fee_cents end;
  end if;
  v_commission := round(v_subtotal * v_vendor.commission_bps / 10000.0)::integer;

  insert into public.care_store_orders(user_id, customer_name, customer_email, customer_phone, address, items, total_cents,
      payment_method, status, notes, vendor_id, fulfillment, delivery_fee_cents, commission_cents, vendor_net_cents)
  values (v_uid, btrim(p_name), nullif(lower(coalesce(auth.jwt() ->> 'email', '')), ''), btrim(p_phone),
      case when p_fulfillment = 'entrega' then btrim(p_address) else null end, v_lines, v_subtotal + v_fee,
      case when p_payment = 'dinheiro' then 'pix' else p_payment end, 'aguardando_pagamento',
      nullif(btrim(concat_ws(' · ', case when p_payment = 'dinheiro' then 'Pagar em dinheiro na retirada' end, nullif(btrim(coalesce(p_notes,'')), ''))), ''),
      v_vendor.id, p_fulfillment, v_fee, v_commission, v_subtotal + v_fee - v_commission)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.care_store_place_order(uuid,jsonb,text,text,text,text,text,text) from public, anon;
grant execute on function public.care_store_place_order(uuid,jsonb,text,text,text,text,text,text) to authenticated;

-- Cores de exemplo nas peças de moda já cadastradas.
update public.care_store_products set colors = '[{"name":"Preto","hex":"#111827","stock":5},{"name":"Cinza","hex":"#9ca3af","stock":4},{"name":"Azul","hex":"#1d4ed8","stock":3}]'::jsonb
 where category like 'roupas-%' and colors = '[]'::jsonb;

-- Amplia o catálogo das lojas de teste (só insere o que ainda não existe).
do $$
declare p record; v_vendor uuid; v_img text;
  p_list jsonb := '[{"vendor": "arena", "ref": "creatina-300", "name": "Creatina Monohidratada 300 g", "category": "suplementos", "price": 8990, "old": 9990, "text": "Creatina pura para força e desempenho em treinos curtos e intensos.", "stock": 20, "sku": "ARE-104", "colors": [], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "arena", "ref": "bcaa-240", "name": "BCAA 2:1:1 240 cápsulas", "category": "suplementos", "price": 6490, "old": null, "text": "Aminoácidos de cadeia ramificada para apoiar a recuperação.", "stock": 15, "sku": "ARE-105", "colors": [], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "arena", "ref": "albumina-500", "name": "Albumina 500 g Baunilha", "category": "suplementos", "price": 5990, "old": null, "text": "Proteína do ovo de absorção lenta, ótima para refeições e shakes.", "stock": 0, "sku": "ARE-106", "colors": [], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "arena", "ref": "hipercalorico-3kg", "name": "Hipercalórico 3 kg", "category": "suplementos", "price": 13990, "old": 15990, "text": "Calorias e carboidratos para quem quer ganhar peso com treino.", "stock": 6, "sku": "ARE-107", "colors": [], "lim": 3, "av": "auto", "unit": "un"}, {"vendor": "arena", "ref": "glutamina-300", "name": "Glutamina 300 g", "category": "suplementos", "price": 7490, "old": null, "text": "Aminoácido para apoio à recuperação muscular.", "stock": 9, "sku": "ARE-108", "colors": [], "lim": null, "av": "indisponivel", "unit": "un"}, {"vendor": "farmavida", "ref": "omega3-120", "name": "Ômega 3 120 cápsulas", "category": "vitaminas", "price": 5490, "old": null, "text": "Óleo de peixe com EPA e DHA para o dia a dia.", "stock": 18, "sku": "FAR-103", "colors": [], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "farmavida", "ref": "vitamina-c-60", "name": "Vitamina C 1 g 60 comprimidos", "category": "vitaminas", "price": 2990, "old": 3490, "text": "Antioxidante de uso diário para apoio à imunidade.", "stock": 25, "sku": "FAR-104", "colors": [], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "farmavida", "ref": "magnesio-60", "name": "Magnésio Dimalato 60 cápsulas", "category": "vitaminas", "price": 4490, "old": null, "text": "Mineral importante para músculos e sistema nervoso.", "stock": 0, "sku": "FAR-105", "colors": [], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "farmavida", "ref": "complexo-b-60", "name": "Complexo B 60 cápsulas", "category": "vitaminas", "price": 3490, "old": null, "text": "Vitaminas do complexo B para o metabolismo energético.", "stock": 14, "sku": "FAR-106", "colors": [], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "farmavida", "ref": "termometro", "name": "Termômetro Digital", "category": "farmacia", "price": 2990, "old": null, "text": "Leitura rápida e precisa, com aviso sonoro.", "stock": 10, "sku": "FAR-107", "colors": [], "lim": 2, "av": "auto", "unit": "un"}, {"vendor": "farmavida", "ref": "soro-fisiologico", "name": "Soro Fisiológico 500 ml", "category": "farmacia", "price": 1290, "old": null, "text": "Solução estéril para higiene e limpeza.", "stock": 40, "sku": "FAR-108", "colors": [], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "erva-viva", "ref": "castanha-para", "name": "Castanha-do-Pará 250 g", "category": "naturais", "price": 2290, "old": null, "text": "Castanhas selecionadas, ricas em selênio e gorduras boas.", "stock": 22, "sku": "ERV-104", "colors": [], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "erva-viva", "ref": "cha-hortela", "name": "Chá de Hortelã 30 sachês", "category": "fitoterapicos", "price": 1390, "old": null, "text": "Folhas de hortelã desidratadas para infusão.", "stock": 16, "sku": "ERV-105", "colors": [], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "erva-viva", "ref": "mel-silvestre", "name": "Mel Silvestre 500 g", "category": "naturais", "price": 3490, "old": 3990, "text": "Mel puro de abelhas da região, sem aditivos.", "stock": 8, "sku": "ERV-106", "colors": [], "lim": 4, "av": "auto", "unit": "un"}, {"vendor": "erva-viva", "ref": "unha-gato", "name": "Unha-de-Gato 60 cápsulas", "category": "fitoterapicos", "price": 3190, "old": null, "text": "Fitoterápico em cápsulas de uso tradicional na Amazônia.", "stock": 0, "sku": "ERV-107", "colors": [], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "erva-viva", "ref": "acai-po", "name": "Açaí em Pó 100 g", "category": "naturais", "price": 2690, "old": null, "text": "Açaí liofilizado para vitaminas, iogurtes e bowls.", "stock": 12, "sku": "ERV-108", "colors": [], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "emporio", "ref": "pasta-amendoim", "name": "Pasta de Amendoim 500 g", "category": "nutricao", "price": 2790, "old": null, "text": "Pasta integral sem adição de açúcar.", "stock": 24, "sku": "EMP-102", "colors": [], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "emporio", "ref": "aveia-flocos", "name": "Aveia em Flocos 500 g", "category": "nutricao", "price": 990, "old": null, "text": "Fibras e carboidratos para café da manhã e pré-treino.", "stock": 50, "sku": "EMP-103", "colors": [], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "emporio", "ref": "leite-amendoas", "name": "Leite de Amêndoas 1 L", "category": "naturais", "price": 1890, "old": null, "text": "Bebida vegetal sem lactose.", "stock": 0, "sku": "EMP-104", "colors": [], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "emporio", "ref": "granola", "name": "Granola Sem Açúcar 400 g", "category": "nutricao", "price": 2190, "old": 2490, "text": "Mix crocante de aveia, castanhas e frutas secas.", "stock": 17, "sku": "EMP-105", "colors": [], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "emporio", "ref": "barra-proteina", "name": "Barra de Proteína Cx 12", "category": "nutricao", "price": 8990, "old": null, "text": "Caixa com 12 barras para lanches práticos.", "stock": 10, "sku": "EMP-106", "colors": [], "lim": 3, "av": "auto", "unit": "cx"}, {"vendor": "studio-move", "ref": "top-sustentacao", "name": "Top Fitness Sustentação", "category": "roupas-femininas", "price": 7990, "old": null, "text": "Top com sustentação média e tecido respirável.", "stock": 18, "sku": "STU-105", "colors": [{"name": "Preto", "hex": "#111827", "stock": 6}, {"name": "Rosé", "hex": "#f9a8d4", "stock": 5}, {"name": "Verde", "hex": "#10b981", "stock": 0}, {"name": "Azul", "hex": "#1e3a8a", "stock": 7}], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "studio-move", "ref": "short-saia", "name": "Short-Saia Esportivo", "category": "roupas-femininas", "price": 8990, "old": null, "text": "Conforto e liberdade para treino e corrida.", "stock": 12, "sku": "STU-106", "colors": [{"name": "Preto", "hex": "#111827", "stock": 5}, {"name": "Cinza", "hex": "#9ca3af", "stock": 7}], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "studio-move", "ref": "macaquinho", "name": "Macaquinho Fitness", "category": "roupas-femininas", "price": 11990, "old": 13990, "text": "Peça única de compressão leve.", "stock": 9, "sku": "STU-107", "colors": [{"name": "Preto", "hex": "#111827", "stock": 4}, {"name": "Vinho", "hex": "#7f1d1d", "stock": 5}], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "studio-move", "ref": "jaqueta-corta-vento", "name": "Jaqueta Corta-Vento", "category": "roupas-femininas", "price": 14990, "old": null, "text": "Leve e impermeável para dias de chuva.", "stock": 0, "sku": "STU-108", "colors": [{"name": "Preto", "hex": "#111827", "stock": 0}, {"name": "Rosa", "hex": "#ec4899", "stock": 0}], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "studio-move", "ref": "faixa-cabelo", "name": "Faixa de Cabelo Esportiva", "category": "acessorios", "price": 1990, "old": null, "text": "Elástica e antiderrapante.", "stock": 40, "sku": "STU-109", "colors": [{"name": "Preto", "hex": "#111827", "stock": 20}, {"name": "Branco", "hex": "#f9fafb", "stock": 20}], "lim": 5, "av": "auto", "unit": "un"}, {"vendor": "base-athletic", "ref": "bermuda-treino", "name": "Bermuda de Treino", "category": "roupas-masculinas", "price": 6990, "old": null, "text": "Tecido leve com bolsos laterais e zíper.", "stock": 20, "sku": "BAS-104", "colors": [{"name": "Preto", "hex": "#111827", "stock": 8}, {"name": "Grafite", "hex": "#374151", "stock": 7}, {"name": "Azul", "hex": "#1d4ed8", "stock": 5}], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "base-athletic", "ref": "camiseta-uv", "name": "Camiseta Proteção UV", "category": "roupas-masculinas", "price": 8490, "old": null, "text": "Proteção solar FPS 50+ para corrida ao ar livre.", "stock": 14, "sku": "BAS-105", "colors": [{"name": "Branco", "hex": "#f9fafb", "stock": 6}, {"name": "Azul", "hex": "#1d4ed8", "stock": 8}], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "base-athletic", "ref": "moletom", "name": "Moletom com Capuz", "category": "roupas-masculinas", "price": 17990, "old": 19990, "text": "Moletom felpudo para o frio de inverno.", "stock": 7, "sku": "BAS-106", "colors": [{"name": "Preto", "hex": "#111827", "stock": 3}, {"name": "Cinza", "hex": "#9ca3af", "stock": 4}], "lim": 2, "av": "auto", "unit": "un"}, {"vendor": "base-athletic", "ref": "meia-esportiva", "name": "Meia Esportiva Kit 3", "category": "roupas-masculinas", "price": 3490, "old": null, "text": "Kit com 3 pares de cano médio.", "stock": 0, "sku": "BAS-107", "colors": [{"name": "Branco", "hex": "#f9fafb", "stock": 0}, {"name": "Preto", "hex": "#111827", "stock": 0}], "lim": null, "av": "auto", "unit": "kit"}, {"vendor": "base-athletic", "ref": "bone-running", "name": "Boné Running", "category": "acessorios", "price": 4990, "old": null, "text": "Leve, com tela respirável.", "stock": 16, "sku": "BAS-108", "colors": [{"name": "Preto", "hex": "#111827", "stock": 8}, {"name": "Azul", "hex": "#1d4ed8", "stock": 8}], "lim": null, "av": "indisponivel", "unit": "un"}, {"vendor": "casa-do-treino", "ref": "corda-pular", "name": "Corda de Pular Ajustável", "category": "acessorios", "price": 3490, "old": null, "text": "Cabos com rolamento e ajuste de altura.", "stock": 22, "sku": "CAS-105", "colors": [], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "casa-do-treino", "ref": "elastico-kit", "name": "Kit Elásticos de Resistência", "category": "acessorios", "price": 5990, "old": 6990, "text": "Cinco níveis de resistência para treino funcional.", "stock": 13, "sku": "CAS-106", "colors": [], "lim": null, "av": "auto", "unit": "kit"}, {"vendor": "casa-do-treino", "ref": "roda-abdominal", "name": "Roda Abdominal", "category": "acessorios", "price": 4490, "old": null, "text": "Base larga e pegadores emborrachados.", "stock": 0, "sku": "CAS-107", "colors": [], "lim": null, "av": "auto", "unit": "un"}, {"vendor": "casa-do-treino", "ref": "luva-treino", "name": "Luva de Treino", "category": "acessorios", "price": 3990, "old": null, "text": "Proteção para as mãos na musculação.", "stock": 19, "sku": "CAS-108", "colors": [{"name": "Preto", "hex": "#111827", "stock": 10}, {"name": "Vermelho", "hex": "#dc2626", "stock": 9}], "lim": 3, "av": "auto", "unit": "par"}, {"vendor": "casa-do-treino", "ref": "banco-supino", "name": "Banco Supino Ajustável", "category": "acessorios", "price": 69900, "old": null, "text": "Banco com ajuste de inclinação e estrutura reforçada.", "stock": 3, "sku": "CAS-109", "colors": [], "lim": 1, "av": "indisponivel", "unit": "un"}]'::jsonb;
begin
  for p in select * from jsonb_to_recordset(p_list) as x(vendor text, ref text, name text, category text, price int, old int, text text, stock int, sku text, colors jsonb, lim int, av text, unit text) loop
    select id into v_vendor from public.care_store_vendors where slug = p.vendor and is_demo;
    if v_vendor is null then continue; end if;
    if exists (select 1 from public.care_store_products where vendor_id = v_vendor and ref = p.ref) then continue; end if;
    select image_url into v_img from public.care_store_products
      where vendor_id = v_vendor and image_url is not null
      order by (category = p.category) desc, created_at limit 1;
    insert into public.care_store_products(vendor_id,name,category,description,price_cents,old_price_cents,image_url,stock,min_stock,cost_cents,sku,ref,unit,colors,display_limit,availability,featured)
    values (v_vendor,p.name,p.category,p.text,p.price,p.old,v_img,p.stock,5,(p.price*0.55)::int,p.sku,p.ref,p.unit,coalesce(p.colors,'[]'::jsonb),p.lim,p.av,p.old is not null);
  end loop;
end $$;

-- Chat: apagar conversas inteiras em lote (lojista dono da loja ou administrador).
create or replace function public.care_store_delete_threads(p_vendor uuid, p_customers uuid[])
returns integer language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_n integer;
begin
  if not (exists (select 1 from public.care_store_vendors v where v.id = p_vendor and v.owner_id = auth.uid())
          or public.is_nextvita_platform_admin()) then
    raise exception 'Not your store';
  end if;
  delete from public.care_store_messages where vendor_id = p_vendor and customer_id = any(p_customers);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function public.care_store_delete_threads(uuid, uuid[]) from public, anon;
grant execute on function public.care_store_delete_threads(uuid, uuid[]) to authenticated;
