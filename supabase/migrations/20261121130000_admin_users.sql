-- Painel do administrador: lista e ficha das contas cadastradas, edição, suspensão,
-- troca de senha, encerramento de sessões e exclusão. Tudo por funções security definer;
-- a conta do administrador da plataforma não pode ser suspensa nem excluída por aqui.

create or replace function public.care_admin_list_users(
  p_search text default null,
  p_limit integer default 50,
  p_offset integer default 0
) returns jsonb
language plpgsql stable security definer set search_path = public, auth, pg_temp
as $$
declare v_out jsonb;
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) into v_out from (
    select u.id, lower(u.email) as email,
      coalesce(u.raw_user_meta_data ->> 'display_name', u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name') as name,
      u.created_at, u.last_sign_in_at,
      u.email_confirmed_at is not null as confirmed,
      (u.banned_until is not null and u.banned_until > now()) as suspended,
      lower(u.email) = 'francdenisbr@gmail.com' as is_admin,
      exists (select 1 from public.care_store_vendors v where v.owner_id = u.id) as is_vendor_owner,
      exists (select 1 from public.care_patients p where p.owner_id = u.id) as has_patients
      from auth.users u
     where nullif(btrim(coalesce(p_search, '')), '') is null
        or u.email ilike '%' || btrim(p_search) || '%'
        or coalesce(u.raw_user_meta_data ->> 'full_name', '') ilike '%' || btrim(p_search) || '%'
     order by u.created_at desc
     limit least(greatest(coalesce(p_limit, 50), 1), 200)
    offset greatest(coalesce(p_offset, 0), 0)
  ) t;
  return v_out;
end;
$$;

create or replace function public.care_admin_user_detail(p_user uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, auth, pg_temp
as $$
declare v_u auth.users%rowtype;
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  select * into v_u from auth.users where id = p_user;
  if not found then raise exception 'User not found'; end if;
  return jsonb_build_object(
    'user', jsonb_build_object(
      'id', v_u.id,
      'email', lower(v_u.email),
      'name', coalesce(v_u.raw_user_meta_data ->> 'display_name', v_u.raw_user_meta_data ->> 'full_name', v_u.raw_user_meta_data ->> 'name'),
      'phone', coalesce(v_u.raw_user_meta_data ->> 'phone', v_u.phone),
      'created_at', v_u.created_at,
      'updated_at', v_u.updated_at,
      'last_sign_in_at', v_u.last_sign_in_at,
      'confirmed', v_u.email_confirmed_at is not null,
      'suspended', v_u.banned_until is not null and v_u.banned_until > now(),
      'provider', v_u.raw_app_meta_data ->> 'provider',
      'account_type', v_u.raw_user_meta_data ->> 'account_type',
      'is_admin', lower(v_u.email) = 'francdenisbr@gmail.com'
    ),
    'vendors', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'slug', v.slug, 'status', v.status, 'city', v.city))
        from public.care_store_vendors v where v.owner_id = p_user), '[]'::jsonb),
    'staff', coalesce((
      select jsonb_agg(jsonb_build_object('vendor', v.name, 'role', s.role, 'active', s.active))
        from public.care_store_staff s join public.care_store_vendors v on v.id = s.vendor_id
       where s.user_id = p_user), '[]'::jsonb),
    'patients_count', (select count(*) from public.care_patients where owner_id = p_user),
    'orders_count', (select count(*) from public.care_store_orders where user_id = p_user),
    'orders_total_cents', (select coalesce(sum(total_cents), 0) from public.care_store_orders where user_id = p_user),
    'devices', (select count(*) from public.care_store_devices where user_id = p_user),
    'sessions', (select count(*) from auth.sessions where user_id = p_user),
    'last_orders', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'created_at', o.created_at, 'total_cents', o.total_cents, 'status', o.status, 'vendor_id', o.vendor_id))
        from (select * from public.care_store_orders where user_id = p_user order by created_at desc limit 5) o), '[]'::jsonb)
  );
end;
$$;

create or replace function public.care_admin_update_user(p_user uuid, p_name text, p_email text, p_phone text)
returns void
language plpgsql security definer set search_path = public, auth, pg_temp
as $$
declare v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  if not exists (select 1 from auth.users where id = p_user) then raise exception 'User not found'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 80 then raise exception 'Nome deve ter de 2 a 80 caracteres'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then raise exception 'Email invalid'; end if;
  if exists (select 1 from auth.users where lower(email) = v_email and id <> p_user) then
    raise exception 'Este e-mail já está em uso por outra conta';
  end if;
  if exists (select 1 from auth.users where id = p_user and lower(email) = 'francdenisbr@gmail.com')
     and v_email <> 'francdenisbr@gmail.com' then
    raise exception 'O e-mail do administrador não pode ser alterado aqui';
  end if;
  update auth.users
     set email = v_email,
         raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
           'display_name', btrim(p_name), 'full_name', btrim(p_name), 'phone', nullif(btrim(coalesce(p_phone, '')), '')),
         updated_at = now()
   where id = p_user;
  update auth.identities
     set identity_data = identity_data || jsonb_build_object('email', v_email), updated_at = now()
   where user_id = p_user and provider = 'email';
end;
$$;

create or replace function public.care_admin_set_user_suspended(p_user uuid, p_suspended boolean)
returns void
language plpgsql security definer set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  if exists (select 1 from auth.users where id = p_user and lower(email) = 'francdenisbr@gmail.com') then
    raise exception 'A conta do administrador não pode ser suspensa';
  end if;
  update auth.users
     set banned_until = case when p_suspended then now() + interval '100 years' else null end,
         updated_at = now()
   where id = p_user;
  if not found then raise exception 'User not found'; end if;
  if p_suspended then delete from auth.sessions where user_id = p_user; end if;
end;
$$;

create or replace function public.care_admin_set_user_password(p_user uuid, p_password text)
returns void
language plpgsql security definer set search_path = public, auth, extensions, pg_temp
as $$
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  if p_password is null or char_length(p_password) < 6 or char_length(p_password) > 72 then raise exception 'Password length invalid'; end if;
  if exists (select 1 from auth.users where id = p_user and lower(email) = 'francdenisbr@gmail.com') then
    raise exception 'A senha do administrador não pode ser alterada aqui';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
   where id = p_user;
  if not found then raise exception 'User not found'; end if;
  delete from auth.sessions where user_id = p_user;
end;
$$;

create or replace function public.care_admin_end_user_sessions(p_user uuid)
returns void
language plpgsql security definer set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  delete from auth.sessions where user_id = p_user;
end;
$$;

create or replace function public.care_admin_delete_user(p_user uuid, p_confirm_email text)
returns void
language plpgsql security definer set search_path = public, auth, pg_temp
as $$
declare v_email text;
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  select lower(email) into v_email from auth.users where id = p_user;
  if v_email is null then raise exception 'User not found'; end if;
  if v_email = 'francdenisbr@gmail.com' then raise exception 'A conta do administrador não pode ser excluída'; end if;
  if lower(btrim(coalesce(p_confirm_email, ''))) <> v_email then raise exception 'Confirmação de e-mail não confere'; end if;
  if exists (select 1 from public.care_store_vendors where owner_id = p_user) then
    raise exception 'Esta conta é dona de loja. Transfira a loja antes de excluir a conta.';
  end if;
  begin
    delete from auth.users where id = p_user;
  exception when foreign_key_violation then
    raise exception 'Conta com dados vinculados (pacientes, pedidos ou histórico). Use Suspender para bloquear o acesso.';
  end;
end;
$$;

revoke all on function public.care_admin_list_users(text, integer, integer) from public, anon;
revoke all on function public.care_admin_user_detail(uuid) from public, anon;
revoke all on function public.care_admin_update_user(uuid, text, text, text) from public, anon;
revoke all on function public.care_admin_set_user_suspended(uuid, boolean) from public, anon;
revoke all on function public.care_admin_set_user_password(uuid, text) from public, anon;
revoke all on function public.care_admin_end_user_sessions(uuid) from public, anon;
revoke all on function public.care_admin_delete_user(uuid, text) from public, anon;
grant execute on function public.care_admin_list_users(text, integer, integer) to authenticated;
grant execute on function public.care_admin_user_detail(uuid) to authenticated;
grant execute on function public.care_admin_update_user(uuid, text, text, text) to authenticated;
grant execute on function public.care_admin_set_user_suspended(uuid, boolean) to authenticated;
grant execute on function public.care_admin_set_user_password(uuid, text) to authenticated;
grant execute on function public.care_admin_end_user_sessions(uuid) to authenticated;
grant execute on function public.care_admin_delete_user(uuid, text) to authenticated;
