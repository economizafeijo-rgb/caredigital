-- Contas de teste das lojas: o administrador vincula cada loja de teste à conta <slug>@teste.nextvita.life
-- depois que essa conta é criada pela tela Entrar (a senha fica com quem criou a conta).
create or replace function public.care_store_admin_link_test_accounts()
returns jsonb language plpgsql security definer set search_path = public, auth, pg_temp
as $$
declare v record; v_user uuid; v_out jsonb := '[]'::jsonb; v_email text;
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  for v in select id, slug, name, owner_id from public.care_store_vendors where is_demo order by name loop
    v_email := v.slug || '@teste.nextvita.life';
    select id into v_user from auth.users where lower(email) = v_email;
    if v_user is not null then
      update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = v_user;
      update public.care_store_vendors set owner_id = v_user, updated_at = now() where id = v.id;
    end if;
    v_out := v_out || jsonb_build_object('slug', v.slug, 'name', v.name, 'email', v_email, 'linked', v_user is not null);
  end loop;
  return v_out;
end;
$$;
revoke all on function public.care_store_admin_link_test_accounts() from public, anon;
grant execute on function public.care_store_admin_link_test_accounts() to authenticated;

-- Situação das lojas de teste sem alterar nada.
create or replace function public.care_store_admin_test_accounts_status()
returns jsonb language sql stable security definer set search_path = public, auth, pg_temp
as $$
  select case when public.is_nextvita_platform_admin() then coalesce(jsonb_agg(jsonb_build_object(
    'slug', v.slug, 'name', v.name, 'email', v.slug || '@teste.nextvita.life',
    'exists', u.id is not null, 'linked', u.id is not null and v.owner_id = u.id) order by v.name), '[]'::jsonb) else '[]'::jsonb end
  from public.care_store_vendors v left join auth.users u on lower(u.email) = v.slug || '@teste.nextvita.life'
  where v.is_demo;
$$;
revoke all on function public.care_store_admin_test_accounts_status() from public, anon;
grant execute on function public.care_store_admin_test_accounts_status() to authenticated;
