-- Troca as ilustrações vetoriais da Bela Vista Fitness por fotos de produto (PNG).
-- Só altera image_url dos produtos dessa loja que ainda apontam para .svg.
update public.care_store_products p
set image_url = regexp_replace(p.image_url, '/loja/bela-vista/([a-z0-9-]+)\.svg$', '/loja/bela-vista/\1.png')
where p.vendor_id = (select v.id from public.care_store_vendors v where v.slug = 'bela-vista-fitness')
  and p.image_url like '%/loja/bela-vista/%.svg';
