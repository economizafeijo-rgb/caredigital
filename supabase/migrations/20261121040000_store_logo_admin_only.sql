-- A logomarca da loja passa a ser definida só pelo administrador da plataforma.
-- O lojista continua editando os dados da loja, mas não consegue mais alterar logo_url.
revoke update (logo_url) on public.care_store_vendors from authenticated;

-- Upload da logo pelo administrador (pasta da loja no bucket store-media).
drop policy if exists store_media_admin_write on storage.objects;
create policy store_media_admin_write on storage.objects for insert to authenticated
  with check (bucket_id = 'store-media' and public.is_nextvita_platform_admin());

-- Define ou remove a logo de uma loja. Só o administrador.
create or replace function public.care_store_admin_set_logo(p_vendor uuid, p_logo_url text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  if p_logo_url is not null and p_logo_url !~ '^https://' then raise exception 'Logo url invalid'; end if;
  update public.care_store_vendors
     set logo_url = nullif(btrim(coalesce(p_logo_url, '')), ''), updated_at = now()
   where id = p_vendor;
  if not found then raise exception 'Vendor not found'; end if;
end;
$$;
revoke all on function public.care_store_admin_set_logo(uuid, text) from public, anon;
grant execute on function public.care_store_admin_set_logo(uuid, text) to authenticated;
