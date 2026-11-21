-- Testes de fila e presença. Rodar em um banco limpo com o stub abaixo e depois a migração:
-- psql -f supabase/tests/store_presence_queue.test.sql (carrega stub, migração e cenários)
-- Stub mínimo (só o que a migração usa do Supabase): auth.uid() e tabelas de loja/staff.
create extension if not exists pgcrypto;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
do $$ begin if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if; if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if; end $$;
create table public.care_store_vendors (id uuid primary key default gen_random_uuid(), owner_id uuid, status text default 'ativo', chat_capacity integer not null default 3 check (chat_capacity between 1 and 50));
create table public.care_store_staff (vendor_id uuid references public.care_store_vendors(id), user_id uuid, active boolean default true);
create or replace function public.care_store_is_staff(p_vendor uuid) returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select exists (select 1 from public.care_store_staff s where s.vendor_id = p_vendor and s.user_id = auth.uid() and s.active) $$;
grant usage on schema public, auth to authenticated, anon;

-- migração:
\i supabase/migrations/20261120250000_store_presence_queue.sql

do $$
declare
  v uuid := gen_random_uuid(); o uuid := gen_random_uuid(); a1 uuid := gen_random_uuid(); a2 uuid := gen_random_uuid();
  c1 uuid := gen_random_uuid(); c2 uuid := gen_random_uuid(); c3 uuid := gen_random_uuid(); c4 uuid := gen_random_uuid();
  r jsonb; n integer; st text; msg text;
begin
  insert into care_store_vendors(id, owner_id, status, chat_capacity) values (v, o, 'ativo', 1);
  insert into care_store_staff(vendor_id, user_id, active) values (v, a1, true), (v, a2, true);

  -- 1. Loja offline não aceita entrada na fila.
  perform set_config('request.jwt.claim.sub', c1::text, true);
  begin perform care_store_queue_join(v); msg := 'no error'; exception when others then msg := sqlerrm; end;
  assert msg = 'Store offline', 'T1 offline: ' || msg;

  -- 2. Atendente A1 fica online.
  perform set_config('request.jwt.claim.sub', a1::text, true);
  r := care_store_set_online(v, true);
  assert (r->>'open')::boolean and (r->>'agents_online')::int = 1, 'T2 online: ' || r::text;

  -- 3. C1 entra e é atendido na hora; C2 e C3 entram na fila com posições corretas.
  perform set_config('request.jwt.claim.sub', c1::text, true);
  r := care_store_queue_join(v);
  assert r->>'state' = 'atendimento', 'T3a C1 deveria estar em atendimento: ' || r::text;
  perform set_config('request.jwt.claim.sub', c2::text, true);
  r := care_store_queue_join(v);
  assert r->>'state' = 'espera' and (r->>'position')::int = 1, 'T3b C2 posição 1: ' || r::text;
  perform set_config('request.jwt.claim.sub', c3::text, true);
  r := care_store_queue_join(v);
  assert r->>'state' = 'espera' and (r->>'position')::int = 2 and (r->>'ahead')::int = 1, 'T3c C3 posição 2: ' || r::text;

  -- 4. Entrada repetida não duplica a fila nem muda a posição.
  r := care_store_queue_join(v);
  assert (r->>'position')::int = 2, 'T4 reentrada mudou posição: ' || r::text;
  select count(*) into n from care_store_queue where vendor_id = v and customer_id = c3 and status in ('waiting','active');
  assert n = 1, 'T4 duplicou: ' || n;

  -- 5. A2 fica online: recebe o primeiro da fila (C2), sem repetir cliente.
  perform set_config('request.jwt.claim.sub', a2::text, true);
  r := care_store_set_online(v, true);
  select count(*) into n from care_store_queue where vendor_id = v and status = 'active' and customer_id = c2 and agent_id = a2;
  assert n = 1, 'T5 A2 não recebeu C2';
  perform set_config('request.jwt.claim.sub', c3::text, true);
  r := care_store_queue_position(v);
  assert r->>'state' = 'espera' and (r->>'position')::int = 1, 'T5b C3 deveria ser o próximo: ' || r::text;

  -- 6. Atendimento de C1 termina: C3 é encaminhado automaticamente.
  perform set_config('request.jwt.claim.sub', a1::text, true);
  n := care_store_close_chat(v, c1, 'atendido');
  assert n = 1, 'T6 close nao encontrou';
  select count(*) into n from care_store_queue where vendor_id = v and customer_id = c3 and status = 'active';
  assert n = 1, 'T6 proximo cliente não foi encaminhado';

  -- 7. Fechar de novo é idempotente e não reatribui nada.
  n := care_store_close_chat(v, c1, 'atendido');
  assert n = 0, 'T7 não idempotente';

  -- 8. Cliente C4 entra e sai voluntariamente da fila.
  perform set_config('request.jwt.claim.sub', c4::text, true);
  r := care_store_queue_join(v);
  assert r->>'state' = 'espera', 'T8a C4 deveria esperar: ' || r::text;
  r := care_store_queue_leave(v);
  r := care_store_queue_position(v);
  assert r->>'state' = 'none', 'T8b saída não removeu: ' || r::text;

  -- 9. Atendente A2 fica offline: não recebe mais e a fila para de ser atribuída a ele.
  perform set_config('request.jwt.claim.sub', a2::text, true);
  r := care_store_set_online(v, false);
  assert (r->>'agents_online')::int = 1, 'T9 A2 ainda conta como online: ' || r::text;

  -- 10. Sinal de presença vencido (mais de 60 s) tira o atendente da contagem.
  update care_store_presence set last_seen = now() - interval '2 minutes' where vendor_id = v and user_id = a1;
  perform set_config('request.jwt.claim.sub', c2::text, true);
  r := care_store_queue_position(v);
  assert (care_store_store_status(v)->>'agents_online')::int = 0, 'T10 presença vencida ainda conta';

  raise notice 'TODOS OS CENARIOS PASSARAM';
end $$;
