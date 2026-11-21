-- Moderação de mensagens no servidor (chat da loja).
-- Normaliza acentos, maiúsculas, símbolos e troca de letras por números. Não bloqueia palavras
-- isoladas sem contexto. Registra ocorrências sem guardar o texto (só um hash). Bloqueio temporário
-- por reincidência e limite de frequência, configuráveis. Nunca suspende permanentemente.

create table if not exists public.care_store_moderation_settings (
  id boolean primary key default true check (id),
  strikes_limit integer not null default 3 check (strikes_limit between 1 and 20),
  strikes_window_minutes integer not null default 15 check (strikes_window_minutes between 1 and 1440),
  block_minutes integer not null default 10 check (block_minutes between 1 and 1440),
  rate_max integer not null default 8 check (rate_max between 1 and 100),
  rate_window_seconds integer not null default 20 check (rate_window_seconds between 1 and 600)
);
insert into public.care_store_moderation_settings(id) values (true) on conflict do nothing;
alter table public.care_store_moderation_settings enable row level security;
revoke all on public.care_store_moderation_settings from anon, authenticated;

-- Registro de ocorrências: sem o texto, só o hash e a categoria. Acesso restrito (sem grants).
create table if not exists public.care_store_moderation_events (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.care_store_vendors(id) on delete cascade,
  user_id uuid not null,
  kind text not null check (kind in ('conteudo', 'frequencia', 'bloqueio')),
  category text,
  content_hash text,
  created_at timestamptz not null default now()
);
create index if not exists care_store_moderation_events_idx on public.care_store_moderation_events(vendor_id, user_id, created_at);
alter table public.care_store_moderation_events enable row level security;
revoke all on public.care_store_moderation_events from anon, authenticated;

create table if not exists public.care_store_moderation_blocks (
  vendor_id uuid not null references public.care_store_vendors(id) on delete cascade,
  user_id uuid not null,
  blocked_until timestamptz not null,
  primary key (vendor_id, user_id)
);
alter table public.care_store_moderation_blocks enable row level security;
revoke all on public.care_store_moderation_blocks from anon, authenticated;

-- Normalização: minúsculas, sem acentos, símbolos e números de troca viram letras, espaços simples.
create or replace function public.care_store_normalize(p text)
returns text language sql immutable as $$
  select btrim(regexp_replace(
           regexp_replace(
             translate(lower(coalesce(p, '')),
               'áàâãäéèêëíìîïóòôõöúùûüçñ@$!013457',
               'aaaaaeeeeiiiiooooouuuucnasioieast'),
             '[^a-z ]', ' ', 'g'),
           '\s+', ' ', 'g'))
$$;

-- Palavras inequívocas (uma palavra só). Devolve a categoria ou null.
create or replace function public.care_store_moderation_word(t text)
returns text language sql immutable
as $$
  select case
    when t in ('porra','caralho','merda','foda','fodase','fodasse','fodida','puta','putas','puto','buceta',
               'bosta','cuzao','cuzona','pqp','fdp','vsf','foder','vtnc') then 'palavrao'
    when t in ('idiota','imbecil','otario','otaria','babaca','retardado','arrombado','escroto','vagabunda',
               'vadia','prostituta','viado') then 'ofensa'
    when t in ('nudes','porno','porn','pornografia') then 'sexual'
  end
$$;

-- Verificação de conteúdo. Devolve a categoria encontrada ou null. Só casa termos inequívocos.
create or replace function public.care_store_moderation_category(p text)
returns text language plpgsql immutable set search_path = public, pg_temp
as $$
declare
  v text := public.care_store_normalize(p);
  toks text[];
  t text;
  run text := '';
  w text;
  i integer;
begin
  if v = '' then return null; end if;
  toks := regexp_split_to_array(v, ' ');

  -- Palavra inteira.
  foreach t in array toks loop
    w := public.care_store_moderation_word(t);
    if w is not null then return w; end if;
  end loop;

  -- Letras separadas (p u t a, v a d i a, p.u.t.a): junta a sequência de letras soltas e confere.
  for i in 1..coalesce(array_length(toks, 1), 0) loop
    if char_length(toks[i]) = 1 then
      run := run || toks[i];
    else
      if char_length(run) >= 3 then
        w := public.care_store_moderation_word(run);
        if w is not null then return w; end if;
      end if;
      run := '';
    end if;
  end loop;
  if char_length(run) >= 3 then
    w := public.care_store_moderation_word(run);
    if w is not null then return w; end if;
  end if;

  -- Expressões com intenção (oferta, pedido, ameaça). Sem intenção, a palavra não é bloqueada.
  if v ~ '\m(vendo|vendemos|compro|compra|manda|mando|entrego|troco)\M.{0,25}\m(cocaina|crack|maconha|lsd|ecstasy|heroina|drogas?)\M'
  then return 'drogas'; end if;
  if v ~ '\m(manda|mande|envia|envie|me manda)\M.{0,15}\m(nudes?|fotos? (intimas?|pelad[ao]s?))\M'
  then return 'sexual'; end if;
  if v ~ '\m(vou|vamos) te (matar|machucar|espancar|bater)\M'
     or v ~ '\m(vou|vamos|irei) matar (voce|vc|vcs|tu|ti)\M'
     or v ~ '\mte vou (matar|machucar|espancar)\M'
     or v ~ '\mvoce vai morrer\M'
  then return 'ameaca'; end if;
  return null;
end;
$$;

-- Verificação completa para quem envia (cliente ou atendente). Registra a ocorrência e devolve o veredito
-- sem lançar erro, para o registro não ser desfeito. Não guarda o texto.
create or replace function public.care_store_moderation_precheck(p_vendor uuid, p_body text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid(); s record; v_cat text; v_count integer; v_recent integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.care_store_vendors where id = p_vendor) then raise exception 'Vendor unavailable'; end if;
  select * into s from public.care_store_moderation_settings where id;

  -- Bloqueio temporário ativo.
  if exists (select 1 from public.care_store_moderation_blocks b
              where b.vendor_id = p_vendor and b.user_id = v_uid and b.blocked_until > now()) then
    return jsonb_build_object('ok', false, 'reason', 'blocked',
      'message', 'Envio temporariamente bloqueado por reincidência. Tente novamente mais tarde.');
  end if;

  -- Frequência: mensagens recentes do próprio remetente.
  select count(*) into v_count from public.care_store_messages
   where vendor_id = p_vendor and created_at > now() - make_interval(secs => s.rate_window_seconds)
     and ((not public.care_store_can_attend(p_vendor) and customer_id = v_uid and not from_vendor)
       or (public.care_store_can_attend(p_vendor) and from_vendor));
  if v_count >= s.rate_max then
    insert into public.care_store_moderation_events(vendor_id, user_id, kind) values (p_vendor, v_uid, 'frequencia');
    return jsonb_build_object('ok', false, 'reason', 'rate',
      'message', 'Você está enviando mensagens rápido demais. Aguarde alguns segundos.');
  end if;

  v_cat := public.care_store_moderation_category(p_body);
  if v_cat is null then return jsonb_build_object('ok', true); end if;

  insert into public.care_store_moderation_events(vendor_id, user_id, kind, category, content_hash)
  values (p_vendor, v_uid, 'conteudo', v_cat, md5(coalesce(p_body, '')));

  -- Reincidência: se passou do limite na janela, bloqueia temporariamente (nunca permanente).
  select count(*) into v_recent from public.care_store_moderation_events
   where vendor_id = p_vendor and user_id = v_uid and kind = 'conteudo'
     and created_at > now() - make_interval(mins => s.strikes_window_minutes);
  if v_recent >= s.strikes_limit then
    insert into public.care_store_moderation_blocks(vendor_id, user_id, blocked_until)
    values (p_vendor, v_uid, now() + make_interval(mins => s.block_minutes))
    on conflict (vendor_id, user_id) do update set blocked_until = excluded.blocked_until;
    insert into public.care_store_moderation_events(vendor_id, user_id, kind) values (p_vendor, v_uid, 'bloqueio');
  end if;

  return jsonb_build_object('ok', false, 'reason', 'content',
    'message', 'Sua mensagem contém conteúdo inadequado. Revise o texto para continuar.');
end;
$$;

-- Garantia no banco: mesmo que o navegador seja contornado, a inserção com conteúdo proibido é recusada.
create or replace function public.care_store_messages_moderate()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if public.care_store_moderation_category(new.body) is not null then
    raise exception 'Sua mensagem contém conteúdo inadequado. Revise o texto para continuar.';
  end if;
  return new;
end;
$$;
drop trigger if exists care_store_messages_moderate on public.care_store_messages;
create trigger care_store_messages_moderate before insert on public.care_store_messages
  for each row execute function public.care_store_messages_moderate();

revoke all on function public.care_store_moderation_precheck(uuid, text) from public, anon;
grant execute on function public.care_store_moderation_precheck(uuid, text) to authenticated;
