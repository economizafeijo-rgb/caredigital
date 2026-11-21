-- Administrador da plataforma edita a identidade de qualquer loja: nome, endereço, cor,
-- logomarca, banner, descrição, cidade, WhatsApp e horário. O dono não altera nada disso.

create or replace function public.care_store_admin_update_identity(
  p_vendor uuid,
  p_name text,
  p_slug text,
  p_accent_hex text,
  p_description text,
  p_city text,
  p_phone text,
  p_opening_hours text,
  p_logo_url text default null,
  p_banner_url text default null
) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_slug text := lower(btrim(coalesce(p_slug, '')));
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 80 then
    raise exception 'Nome deve ter de 2 a 80 caracteres';
  end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) not between 2 and 60 then
    raise exception 'Endereço inválido: use letras minúsculas, números e hífen';
  end if;
  if p_accent_hex is null or p_accent_hex !~ '^#[0-9a-fA-F]{6}$' then
    raise exception 'Cor inválida';
  end if;
  if p_logo_url is not null and p_logo_url !~ '^https://' then raise exception 'Logo precisa ser https'; end if;
  if p_banner_url is not null and p_banner_url !~ '^https://' then raise exception 'Banner precisa ser https'; end if;
  if char_length(coalesce(p_description, '')) > 500 then raise exception 'Descrição muito longa'; end if;

  begin
    update public.care_store_vendors
       set name = btrim(p_name),
           slug = v_slug,
           accent_hex = p_accent_hex,
           description = nullif(btrim(coalesce(p_description, '')), ''),
           city = nullif(btrim(coalesce(p_city, '')), ''),
           phone = nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), ''),
           opening_hours = nullif(btrim(coalesce(p_opening_hours, '')), ''),
           logo_url = coalesce(p_logo_url, logo_url),
           banner_url = coalesce(p_banner_url, banner_url),
           updated_at = now()
     where id = p_vendor;
  exception when unique_violation then
    raise exception 'Este endereço já está em uso por outra loja';
  end;
  if not found then raise exception 'Vendor not found'; end if;
end;
$$;

revoke all on function public.care_store_admin_update_identity(uuid, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.care_store_admin_update_identity(uuid, text, text, text, text, text, text, text, text, text) to authenticated;
