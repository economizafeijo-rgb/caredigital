-- Administrador gerencia o acesso dos lojistas pelo painel: vê o dono da loja, confirma o e-mail,
-- define uma nova senha e cria o login da loja (já confirmado), sem abrir o Supabase.

create or replace function public.care_store_admin_vendor_owner(p_vendor uuid)
returns jsonb language plpgsql stable security definer set search_path = public, auth, pg_temp
as $$
declare v_out jsonb;
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  select jsonb_build_object(
    'user_id', u.id, 'email', u.email,
    'name', coalesce(u.raw_user_meta_data ->> 'display_name', u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
    'phone', coalesce(u.raw_user_meta_data ->> 'phone', u.phone),
    'confirmed', u.email_confirmed_at is not null, 'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at,
    'is_admin', lower(u.email) = 'francdenisbr@gmail.com')
    into v_out
    from public.care_store_vendors v join auth.users u on u.id = v.owner_id
   where v.id = p_vendor;
  return coalesce(v_out, '{}'::jsonb);
end;
$$;

create or replace function public.care_store_admin_confirm_owner_email(p_vendor uuid)
returns void language plpgsql security definer set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  update auth.users u set email_confirmed_at = coalesce(u.email_confirmed_at, now()), updated_at = now()
    from public.care_store_vendors v where v.id = p_vendor and u.id = v.owner_id;
  if not found then raise exception 'Vendor not found'; end if;
end;
$$;

create or replace function public.care_store_admin_set_owner_password(p_vendor uuid, p_password text)
returns void language plpgsql security definer set search_path = public, auth, extensions, pg_temp
as $$
declare v_owner uuid;
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  if p_password is null or char_length(p_password) < 6 or char_length(p_password) > 72 then raise exception 'Password length invalid'; end if;
  select owner_id into v_owner from public.care_store_vendors where id = p_vendor;
  if v_owner is null then raise exception 'Vendor not found'; end if;
  if exists (select 1 from auth.users where id = v_owner and lower(email) = 'francdenisbr@gmail.com') then
    raise exception 'Admin account cannot be changed here';
  end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
         email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now()
   where id = v_owner;
end;
$$;

-- Cria o login do lojista (e-mail já confirmado) e passa a loja para ele.
create or replace function public.care_store_admin_create_owner(p_vendor uuid, p_email text, p_password text, p_name text)
returns uuid language plpgsql security definer set search_path = public, auth, extensions, pg_temp
as $$
declare v_email text := lower(btrim(p_email)); v_user uuid;
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then raise exception 'Email invalid'; end if;
  if p_password is null or char_length(p_password) < 6 or char_length(p_password) > 72 then raise exception 'Password length invalid'; end if;
  if not exists (select 1 from public.care_store_vendors where id = p_vendor) then raise exception 'Vendor not found'; end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then raise exception 'Email already registered'; end if;
  v_user := gen_random_uuid();
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new)
  values ('00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated', v_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('account_type', 'vendor', 'display_name', nullif(btrim(coalesce(p_name, '')), '')),
      now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_user, v_user::text,
      jsonb_build_object('sub', v_user::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
      'email', null, now(), now());
  update public.care_store_vendors set owner_id = v_user, updated_at = now() where id = p_vendor;
  return v_user;
end;
$$;

revoke all on function public.care_store_admin_vendor_owner(uuid) from public, anon;
revoke all on function public.care_store_admin_confirm_owner_email(uuid) from public, anon;
revoke all on function public.care_store_admin_set_owner_password(uuid, text) from public, anon;
revoke all on function public.care_store_admin_create_owner(uuid, text, text, text) from public, anon;
grant execute on function public.care_store_admin_vendor_owner(uuid) to authenticated;
grant execute on function public.care_store_admin_confirm_owner_email(uuid) to authenticated;
grant execute on function public.care_store_admin_set_owner_password(uuid, text) to authenticated;
grant execute on function public.care_store_admin_create_owner(uuid, text, text, text) to authenticated;

-- Apagar mensagem do chat (em tempo real para os dois lados).
alter table public.care_store_messages add column if not exists deleted_at timestamptz;
alter table public.care_store_messages replica identity full;
create or replace function public.care_store_delete_message(p_message uuid)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  update public.care_store_messages m
     set deleted_at = now(), body = 'Mensagem apagada'
   where m.id = p_message and m.deleted_at is null
     and ((not m.from_vendor and m.customer_id = auth.uid())
       or (m.from_vendor and exists (select 1 from public.care_store_vendors v where v.id = m.vendor_id and v.owner_id = auth.uid()))
       or public.is_nextvita_platform_admin());
  if not found then raise exception 'Message cannot be deleted'; end if;
end;
$$;
revoke all on function public.care_store_delete_message(uuid) from public, anon;
grant execute on function public.care_store_delete_message(uuid) to authenticated;
