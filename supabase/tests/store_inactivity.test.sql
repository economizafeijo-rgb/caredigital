-- Teste de inatividade. Requer as migrações 20261120250000 e 20261120280000 e o stub de loja/mensagens.
do $$
declare v uuid := gen_random_uuid(); a uuid := gen_random_uuid(); c1 uuid := gen_random_uuid(); c2 uuid := gen_random_uuid();
  v2 uuid := gen_random_uuid(); a2 uuid := gen_random_uuid(); c5 uuid := gen_random_uuid();
  n integer; st text; stt text; msgs integer; s jsonb;
begin
  insert into care_store_vendors(id, owner_id, status, chat_capacity) values (v, gen_random_uuid(), 'ativo', 1);
  insert into care_store_staff(vendor_id, user_id, active) values (v, a, true);
  perform set_config('request.jwt.claim.sub', a::text, true);
  perform care_store_set_online(v, true);

  perform set_config('request.jwt.claim.sub', c1::text, true);
  perform care_store_queue_join(v);
  perform set_config('request.jwt.claim.sub', c2::text, true);
  perform care_store_queue_join(v);
  select status into st from care_store_queue where vendor_id = v and customer_id = c1;
  assert st = 'active', 'C1 deveria estar ativo';
  select status into st from care_store_queue where vendor_id = v and customer_id = c2;
  assert st = 'waiting', 'C2 deveria esperar';

  -- Loja respondeu C1 há 10 minutos e o cliente não respondeu.
  insert into care_store_messages(vendor_id, customer_id, from_vendor, body, created_at)
  values (v, c1, true, 'Olá, em que posso ajudar?', now() - interval '10 minutes');

  -- 1. Primeiro aviso (3 min sem interação do cliente).
  n := care_store_inactivity_tick();
  assert n = 1, 'T1 deveria emitir aviso 1: ' || n;
  select count(*) into msgs from care_store_messages where customer_id = c1 and is_system and body like 'Você ainda está por aqui%';
  assert msgs = 1, 'T1 texto do aviso 1 não foi enviado';
  select inactivity_stage into stt from care_store_queue where vendor_id = v and customer_id = c1;
  assert stt = 'aviso1', 'T1 estágio: ' || stt;

  -- 2. Não repete o aviso no mesmo minuto.
  n := care_store_inactivity_tick();
  assert n = 0, 'T2 repetiu aviso: ' || n;

  -- 3. Aviso 2 depois de 2 minutos sem resposta.
  update care_store_queue set stage_at = now() - interval '3 minutes' where vendor_id = v and customer_id = c1;
  n := care_store_inactivity_tick();
  assert n = 1, 'T3 deveria emitir aviso 2';
  select count(*) into msgs from care_store_messages where customer_id = c1 and is_system and body like 'Seu atendimento será encerrado em 1 minuto%';
  assert msgs = 1, 'T3 texto do aviso 2 faltando';

  -- 4. Encerramento após mais 1 minuto, e C2 é encaminhado ao atendente liberado.
  update care_store_queue set stage_at = now() - interval '2 minutes' where vendor_id = v and customer_id = c1;
  n := care_store_inactivity_tick();
  assert n = 1, 'T4 deveria encerrar';
  select status || '/' || close_reason into st from care_store_queue where vendor_id = v and customer_id = c1;
  assert st = 'closed/inatividade', 'T4 encerramento: ' || st;
  select status into st from care_store_queue where vendor_id = v and customer_id = c2;
  assert st = 'active', 'T4 próximo cliente não foi encaminhado: ' || st;
  select count(*) into msgs from care_store_messages where customer_id = c1 and is_system and body like 'Atendimento encerrado por inatividade%';
  assert msgs = 1, 'T4 aviso final faltando';

  -- 5. Loja deve a resposta: cliente falou por último, relógio parado, nada é enviado.
  insert into care_store_messages(vendor_id, customer_id, from_vendor, body, created_at)
  values (v, c2, true, 'Pode aguardar', now() - interval '10 minutes');
  insert into care_store_messages(vendor_id, customer_id, from_vendor, body, created_at)
  values (v, c2, false, 'Obrigada', now());
  n := care_store_inactivity_tick();
  assert n = 0, 'T5 puniu cliente enquanto a loja devia resposta: ' || n;

  -- 6. Cliente toca "Continuar atendimento": zera o estágio e renova.
  perform set_config('request.jwt.claim.sub', c2::text, true);
  s := care_store_customer_ping(v);
  assert s->>'renewed' = 'true', 'T6 ping não renovou';

  -- 7. Presença do atendente não renova o prazo do cliente.
  -- Cenário separado: loja v2, cliente c5, loja respondeu há 10 minutos.
  insert into care_store_vendors(id, owner_id, status, chat_capacity) values (v2, gen_random_uuid(), 'ativo', 1);
  insert into care_store_staff(vendor_id, user_id, active) values (v2, a2, true);
  perform set_config('request.jwt.claim.sub', a2::text, true);
  perform care_store_set_online(v2, true);
  perform set_config('request.jwt.claim.sub', c5::text, true);
  perform care_store_queue_join(v2);
  insert into care_store_messages(vendor_id, customer_id, from_vendor, body, created_at)
  values (v2, c5, true, 'Aguarde um instante', now() - interval '10 minutes');
  perform set_config('request.jwt.claim.sub', a2::text, true);
  perform care_store_heartbeat(v2);
  perform care_store_heartbeat(v2);
  n := care_store_inactivity_tick();
  assert n = 1, 'T7 presença renovou o prazo indevidamente';

  -- 8. Mensagem de sistema não reinicia o relógio: depois do aviso 1 o estágio segue normalmente.
  update care_store_queue set stage_at = now() - interval '3 minutes' where vendor_id = v2 and customer_id = c5;
  n := care_store_inactivity_tick();
  assert n = 1, 'T8 aviso de sistema reiniciou o relógio';

  raise notice 'INATIVIDADE OK';
end $$;
