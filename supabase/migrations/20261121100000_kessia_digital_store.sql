-- Marca nova da loja de Kessia: nome, endereço (slug), logomarca e cor rosa.
-- A logomarca vem do administrador da plataforma; aqui só apontamos para o arquivo publicado.
update public.care_store_vendors
   set name = 'Kessia'' Digital Store',
       slug = 'kessia-digital-store',
       logo_url = 'https://nextvita.life/loja/kessia/mark.svg',
       accent_hex = '#c81d6b',
       description = 'Moda fitness feminina, suplementos, beleza e bijuterias com o jeito da Kessia. Feijó, AC.'
 where slug = 'bela-vista-fitness';

update public.care_store_products p
   set name = 'Perfume Kessia 50 ml'
  from public.care_store_vendors v
 where v.id = p.vendor_id and v.slug = 'kessia-digital-store' and p.name = 'Perfume Bela Vista 50 ml';
