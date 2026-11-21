-- Nome, cor e banner da loja passam a ser definidos só pela administração da plataforma.
-- O dono continua editando contato, endereço, horários, entrega e apresentação.
revoke update (name, accent_hex, banner_url) on public.care_store_vendors from authenticated;
