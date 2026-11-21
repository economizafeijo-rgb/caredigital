-- O banner precisa de URL absoluta https (regra da coluna banner_url).
-- Substitui a migration 20261121020000, que gravava um caminho relativo e falhava na checagem.
update public.care_store_vendors
   set banner_url = 'https://nextvita.life/loja/bela-vista/banner.jpg'
 where slug = 'bela-vista-fitness';
