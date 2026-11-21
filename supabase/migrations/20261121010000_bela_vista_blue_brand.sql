-- Cor da loja Bela Vista: troca o vermelho pelo azul da paleta da plataforma.
update public.care_store_vendors
   set accent_hex = '#1d4ed8'
 where slug = 'bela-vista-fitness';
