-- Troca as fotos de produto PNG (~1 MB) por WebP (~30 KB) nas lojas Bela Vista e Kessia.
update public.care_store_products
set image_url = regexp_replace(image_url, '(/loja/(bela-vista|kessia)/[a-z0-9-]+)\.png(\?.*)?$', '\1.webp')
where image_url ~ '/loja/(bela-vista|kessia)/[a-z0-9-]+\.png(\?.*)?$';
