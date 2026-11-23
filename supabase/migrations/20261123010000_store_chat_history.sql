-- Histórico de conversas das lojas, senha de exclusão do dono e backup do administrador.
--
-- Regras:
-- * Quando um atendimento é encerrado (fila passa para 'closed'), a conversa é salva em
--   care_store_chat_archive automaticamente.
-- * A loja (dono e atendentes) consulta o histórico dos últimos 30 dias.
-- * Só o dono apaga conversas e históricos, sempre com a senha de exclusão
--   (padrão 000000, troca permitida uma única vez). Atendentes não apagam nada.
-- * Apagar na loja só esconde a conversa para a loja: o administrador mantém a cópia.
-- * Mensagens ao vivo com mais de 30 dias são salvas no histórico e removidas do chat.
-- * O backup do administrador é apagado automaticamente depois de 6 meses.
-- * Só o administrador da plataforma pode resetar a senha de exclusão.

-- 1. Arquivo das conversas ------------------------------------------------------
create table if not exists public.care_store_chat_archive (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.care_store_vendors(id) on delete cascade,
  customer_id uuid not null,
  customer_name text,
  queue_id uuid,
  agent_id uuid,
  started_at timestamptz not null,
  closed_at timestamptz not null default now(),
  close_reason text,
  messages jsonb not null default '[]'::jsonb,
  message_count integer not null default 0,
  vendor_deleted_at timestamptz,
  vendor_deleted_by uuid,
  archived_at timestamptz not null default now()
);
create index if not exists care_store_chat_archive_vendor_idx
  on public.care_store_chat_archive (vendor_id, closed_at desc);
create index if not exists care_store_chat_archive_pair_idx
  on public.care_store_chat_archive (vendor_id, customer_id, closed_at desc);
alter table public.care_store_chat_archive enable row level security;
-- Sem políticas: leitura e escrita só pelas funções abaixo.
revoke all on public.care_store_chat_archive from anon, authenticated;

-- Salva no arquivo as mensagens do par loja/cliente ainda não arquivadas.
create or replace function public.care_store_archive_pair(
  p_vendor uuid, p_customer uuid, p_reason text,
  p_queue uuid default null, p_agent uuid default null,
  p_since timestamptz default null, p_until timestamptz default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_last timestamptz;
  v_from timestamptz;
  v_until timestamptz := coalesce(p_until, now());
  v_msgs jsonb;
  v_count integer;
  v_first timestamptz;
  v_name text;
  v_id uuid;
begin
  select max(closed_at) into v_last
    from public.care_store_chat_archive where vendor_id = p_vendor and customer_id = p_customer;
  v_from := greatest(coalesce(v_last, '-infinity'::timestamptz), coalesce(p_since, '-infinity'::timestamptz));

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', m.id, 'from_vendor', m.from_vendor, 'is_system', coalesce(m.is_system, false),
           'body', m.body, 'created_at', m.created_at, 'deleted', m.deleted_at is not null)
           order by m.created_at), '[]'::jsonb),
         count(*), min(m.created_at), max(m.customer_name)
    into v_msgs, v_count, v_first, v_name
    from public.care_store_messages m
   where m.vendor_id = p_vendor and m.customer_id = p_customer
     and m.created_at > v_from and m.created_at <= v_until;

  if v_count = 0 then return null; end if;

  insert into public.care_store_chat_archive
    (vendor_id, customer_id, customer_name, queue_id, agent_id, started_at, closed_at,
     close_reason, messages, message_count)
  values
    (p_vendor, p_customer, v_name, p_queue, p_agent, v_first, v_until, p_reason, v_msgs, v_count)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.care_store_archive_pair(uuid, uuid, text, uuid, uuid, timestamptz, timestamptz)
  from public, anon, authenticated;

-- Ao encerrar um atendimento, salva a conversa.
create or replace function public.care_store_queue_archive_trg()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if new.status = 'closed' and old.status is distinct from 'closed' then
    perform public.care_store_archive_pair(
      new.vendor_id, new.customer_id, coalesce(new.close_reason, 'encerrado'),
      new.id, new.agent_id, new.entered_at - interval '2 hours', coalesce(new.closed_at, now()));
  end if;
  return new;
end $$;
drop trigger if exists care_store_queue_archive on public.care_store_queue;
create trigger care_store_queue_archive
  after update of status on public.care_store_queue
  for each row execute function public.care_store_queue_archive_trg();

-- 2. Senha de exclusão do dono ---------------------------------------------------
create table if not exists public.care_store_owner_secrets (
  vendor_id uuid primary key references public.care_store_vendors(id) on delete cascade,
  pass_hash text not null,
  change_count integer not null default 0,
  changed_at timestamptz,
  reset_at timestamptz,
  failed_attempts integer not null default 0,
  locked_until timestamptz
);
alter table public.care_store_owner_secrets enable row level security;
revoke all on public.care_store_owner_secrets from anon, authenticated;

create or replace function public.care_store_is_owner(p_vendor uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select exists (select 1 from public.care_store_vendors v where v.id = p_vendor and v.owner_id = auth.uid()) $$;
revoke all on function public.care_store_is_owner(uuid) from public, anon;
grant execute on function public.care_store_is_owner(uuid) to authenticated;

-- Garante a linha com a senha padrão 000000.
create or replace function public.care_store_owner_secret_row(p_vendor uuid)
returns public.care_store_owner_secrets
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare r public.care_store_owner_secrets;
begin
  insert into public.care_store_owner_secrets (vendor_id, pass_hash)
  values (p_vendor, extensions.crypt('000000', extensions.gen_salt('bf')))
  on conflict (vendor_id) do nothing;
  select * into r from public.care_store_owner_secrets where vendor_id = p_vendor;
  return r;
end $$;
revoke all on function public.care_store_owner_secret_row(uuid) from public, anon, authenticated;

-- Confere a senha. 5 erros seguidos bloqueiam por 15 minutos.
create or replace function public.care_store_check_owner_pass(p_vendor uuid, p_password text)
returns void
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare r public.care_store_owner_secrets;
begin
  r := public.care_store_owner_secret_row(p_vendor);
  if r.locked_until is not null and r.locked_until > now() then
    raise exception 'Password locked';
  end if;
  if p_password is null or extensions.crypt(p_password, r.pass_hash) <> r.pass_hash then
    update public.care_store_owner_secrets
       set failed_attempts = failed_attempts + 1,
           locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' else null end
     where vendor_id = p_vendor;
    raise exception 'Wrong password';
  end if;
  update public.care_store_owner_secrets set failed_attempts = 0, locked_until = null where vendor_id = p_vendor;
end $$;
revoke all on function public.care_store_check_owner_pass(uuid, text) from public, anon, authenticated;

create or replace function public.care_store_owner_pass_status(p_vendor uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare r public.care_store_owner_secrets;
begin
  if not public.care_store_is_owner(p_vendor) then
    return jsonb_build_object('is_owner', false);
  end if;
  r := public.care_store_owner_secret_row(p_vendor);
  return jsonb_build_object(
    'is_owner', true,
    'can_change', r.change_count = 0,
    'is_default', extensions.crypt('000000', r.pass_hash) = r.pass_hash,
    'changed_at', r.changed_at);
end $$;
revoke all on function public.care_store_owner_pass_status(uuid) from public, anon;
grant execute on function public.care_store_owner_pass_status(uuid) to authenticated;

create or replace function public.care_store_owner_pass_change(p_vendor uuid, p_current text, p_new text)
returns void
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare r public.care_store_owner_secrets;
begin
  if not public.care_store_is_owner(p_vendor) then raise exception 'Only the owner'; end if;
  r := public.care_store_owner_secret_row(p_vendor);
  if r.change_count > 0 then raise exception 'Already changed'; end if;
  if p_new !~ '^\d{6}$' then raise exception 'Invalid new password'; end if;
  if p_new = '000000' then raise exception 'Invalid new password'; end if;
  perform public.care_store_check_owner_pass(p_vendor, p_current);
  update public.care_store_owner_secrets
     set pass_hash = extensions.crypt(p_new, extensions.gen_salt('bf')),
         change_count = change_count + 1, changed_at = now()
   where vendor_id = p_vendor;
end $$;
revoke all on function public.care_store_owner_pass_change(uuid, text, text) from public, anon;
grant execute on function public.care_store_owner_pass_change(uuid, text, text) to authenticated;

-- Só o administrador da plataforma: volta para 000000 e libera uma nova troca.
create or replace function public.care_store_admin_reset_owner_pass(p_vendor uuid)
returns void
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  perform public.care_store_owner_secret_row(p_vendor);
  update public.care_store_owner_secrets
     set pass_hash = extensions.crypt('000000', extensions.gen_salt('bf')),
         change_count = 0, reset_at = now(), failed_attempts = 0, locked_until = null
   where vendor_id = p_vendor;
end $$;
revoke all on function public.care_store_admin_reset_owner_pass(uuid) from public, anon;
grant execute on function public.care_store_admin_reset_owner_pass(uuid) to authenticated;

-- 3. Histórico na loja -------------------------------------------------------------
create or replace function public.care_store_chat_history_list(
  p_vendor uuid, p_search text default null, p_limit integer default 100
) returns table (
  id uuid, customer_id uuid, customer_name text, started_at timestamptz, closed_at timestamptz,
  close_reason text, message_count integer, preview text
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  if not public.care_store_can_attend(p_vendor) then raise exception 'Not your store'; end if;
  return query
    select a.id, a.customer_id, a.customer_name, a.started_at, a.closed_at, a.close_reason,
           a.message_count,
           left(coalesce((select e ->> 'body' from jsonb_array_elements(a.messages) e
                           where not (e ->> 'is_system')::boolean
                           order by e ->> 'created_at' desc limit 1), ''), 140)
      from public.care_store_chat_archive a
     where a.vendor_id = p_vendor and a.vendor_deleted_at is null
       and a.closed_at > now() - interval '30 days'
       and (p_search is null or btrim(p_search) = ''
            or a.customer_name ilike '%' || p_search || '%'
            or a.messages::text ilike '%' || p_search || '%')
     order by a.closed_at desc
     limit least(greatest(coalesce(p_limit, 100), 1), 500);
end $$;
revoke all on function public.care_store_chat_history_list(uuid, text, integer) from public, anon;
grant execute on function public.care_store_chat_history_list(uuid, text, integer) to authenticated;

create or replace function public.care_store_chat_history_get(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare a public.care_store_chat_archive;
begin
  select * into a from public.care_store_chat_archive where id = p_id;
  if a.id is null or a.vendor_deleted_at is not null or a.closed_at <= now() - interval '30 days'
     or not public.care_store_can_attend(a.vendor_id) then
    raise exception 'Not found';
  end if;
  return jsonb_build_object('id', a.id, 'customer_name', a.customer_name, 'started_at', a.started_at,
    'closed_at', a.closed_at, 'close_reason', a.close_reason, 'messages', a.messages);
end $$;
revoke all on function public.care_store_chat_history_get(uuid) from public, anon;
grant execute on function public.care_store_chat_history_get(uuid) to authenticated;

-- Dono + senha: esconde do histórico da loja (o administrador mantém a cópia).
create or replace function public.care_store_chat_history_delete(p_vendor uuid, p_ids uuid[], p_password text)
returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_n integer;
begin
  if not public.care_store_is_owner(p_vendor) then raise exception 'Only the owner'; end if;
  perform public.care_store_check_owner_pass(p_vendor, p_password);
  update public.care_store_chat_archive
     set vendor_deleted_at = now(), vendor_deleted_by = auth.uid()
   where vendor_id = p_vendor and id = any(p_ids) and vendor_deleted_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.care_store_chat_history_delete(uuid, uuid[], text) from public, anon;
grant execute on function public.care_store_chat_history_delete(uuid, uuid[], text) to authenticated;

-- 4. Apagar conversas ao vivo: só dono com senha, salvando antes no backup -----------
drop function if exists public.care_store_delete_threads(uuid, uuid[]);
create or replace function public.care_store_delete_threads(p_vendor uuid, p_customers uuid[], p_password text)
returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_n integer; v_c uuid;
begin
  if public.is_nextvita_platform_admin() then
    null;
  elsif public.care_store_is_owner(p_vendor) then
    perform public.care_store_check_owner_pass(p_vendor, p_password);
  else
    raise exception 'Only the owner';
  end if;
  foreach v_c in array p_customers loop
    perform public.care_store_archive_pair(p_vendor, v_c, 'apagada_pela_loja');
  end loop;
  -- A cópia salva agora também sai do histórico da loja; o administrador continua com ela.
  update public.care_store_chat_archive
     set vendor_deleted_at = now(), vendor_deleted_by = auth.uid()
   where vendor_id = p_vendor and customer_id = any(p_customers) and vendor_deleted_at is null;
  delete from public.care_store_messages where vendor_id = p_vendor and customer_id = any(p_customers);
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.care_store_delete_threads(uuid, uuid[], text) from public, anon;
grant execute on function public.care_store_delete_threads(uuid, uuid[], text) to authenticated;

-- Mensagem avulsa: o cliente apaga as próprias; do lado da loja, só o dono com senha.
drop function if exists public.care_store_delete_message(uuid);
create or replace function public.care_store_delete_message(p_message uuid, p_password text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare m public.care_store_messages;
begin
  select * into m from public.care_store_messages where id = p_message and deleted_at is null;
  if m.id is null then raise exception 'Message cannot be deleted'; end if;
  if public.is_nextvita_platform_admin() then
    null;
  elsif not m.from_vendor and m.customer_id = auth.uid() then
    null;
  elsif m.from_vendor and public.care_store_is_owner(m.vendor_id) then
    perform public.care_store_check_owner_pass(m.vendor_id, p_password);
  else
    raise exception 'Message cannot be deleted';
  end if;
  update public.care_store_messages set deleted_at = now(), body = 'Mensagem apagada' where id = p_message;
end $$;
revoke all on function public.care_store_delete_message(uuid, text) from public, anon;
grant execute on function public.care_store_delete_message(uuid, text) to authenticated;

-- 5. Backup do administrador ----------------------------------------------------------
create or replace function public.care_store_admin_chat_backup_list(
  p_vendor uuid default null, p_search text default null, p_limit integer default 200
) returns table (
  id uuid, vendor_id uuid, vendor_name text, customer_id uuid, customer_name text,
  started_at timestamptz, closed_at timestamptz, close_reason text, message_count integer,
  vendor_deleted_at timestamptz, preview text
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  return query
    select a.id, a.vendor_id, v.name, a.customer_id, a.customer_name, a.started_at, a.closed_at,
           a.close_reason, a.message_count, a.vendor_deleted_at,
           left(coalesce((select e ->> 'body' from jsonb_array_elements(a.messages) e
                           where not (e ->> 'is_system')::boolean
                           order by e ->> 'created_at' desc limit 1), ''), 140)
      from public.care_store_chat_archive a
      join public.care_store_vendors v on v.id = a.vendor_id
     where (p_vendor is null or a.vendor_id = p_vendor)
       and (p_search is null or btrim(p_search) = ''
            or a.customer_name ilike '%' || p_search || '%'
            or v.name ilike '%' || p_search || '%'
            or a.messages::text ilike '%' || p_search || '%')
     order by a.closed_at desc
     limit least(greatest(coalesce(p_limit, 200), 1), 1000);
end $$;
revoke all on function public.care_store_admin_chat_backup_list(uuid, text, integer) from public, anon;
grant execute on function public.care_store_admin_chat_backup_list(uuid, text, integer) to authenticated;

create or replace function public.care_store_admin_chat_backup_get(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare a public.care_store_chat_archive; v_name text;
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  select * into a from public.care_store_chat_archive where id = p_id;
  if a.id is null then raise exception 'Not found'; end if;
  select name into v_name from public.care_store_vendors where id = a.vendor_id;
  return jsonb_build_object('id', a.id, 'vendor_name', v_name, 'customer_name', a.customer_name,
    'started_at', a.started_at, 'closed_at', a.closed_at, 'close_reason', a.close_reason,
    'vendor_deleted_at', a.vendor_deleted_at, 'messages', a.messages);
end $$;
revoke all on function public.care_store_admin_chat_backup_get(uuid) from public, anon;
grant execute on function public.care_store_admin_chat_backup_get(uuid) to authenticated;

-- 6. Limpeza automática diária --------------------------------------------------------
-- Mensagens com mais de 30 dias vão para o arquivo e saem do chat ao vivo.
-- O arquivo (backup do administrador) é apagado depois de 6 meses.
create or replace function public.care_store_purge_chat()
returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_n integer; r record; v_cut timestamptz := now() - interval '30 days';
begin
  for r in
    select distinct vendor_id, customer_id from public.care_store_messages where created_at < v_cut
  loop
    perform public.care_store_archive_pair(r.vendor_id, r.customer_id, 'limpeza_automatica',
                                           null, null, null, v_cut);
  end loop;
  delete from public.care_store_messages where created_at < v_cut;
  get diagnostics v_n = row_count;
  delete from public.care_store_chat_archive where archived_at < now() - interval '6 months';
  return v_n;
end $$;
revoke all on function public.care_store_purge_chat() from public, anon, authenticated;
