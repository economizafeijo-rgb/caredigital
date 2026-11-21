-- Teste de moderação. Requer o stub de supabase/tests/store_presence_queue.test.sql (auth.uid e tabelas de loja/mensagens) e as migrações 20261120250000 e 20261120270000.
do $$
declare v uuid := gen_random_uuid(); u uuid := gen_random_uuid(); r jsonb; n integer; w text; hsh text; i integer;
  bad text[] := array['seu idiota','vai se foder','VAI SE F0DER','p u t a','p.u.t.a','Vendo cocaína no privado','manda nudes','vou te matar','Vou matar você','seu imbecil','porr@','caralhô','v a d i a','Você vai morrer'];
  ok  text[] := array['a bateria morreu','vou matar a aula','cor nude disponível','cocaína é uma droga perigosa','meu computador travou','a loja abre amanhã','vou te mandar o pedido','a tinta vem em 3 cores','o colar é de ouro','te matar de rir kkk','obrigado pela ajuda','medicamentos devem ser guardados longe do calor'];
begin
  -- 1. Classificação: tudo que deve ser bloqueado é bloqueado, e tudo legítimo passa.
  foreach w in array bad loop
    assert public.care_store_moderation_category(w) is not null, 'deveria bloquear: ' || w;
  end loop;
  foreach w in array ok loop
    assert public.care_store_moderation_category(w) is null, 'não deveria bloquear: ' || w;
  end loop;

  insert into care_store_vendors(id, owner_id, status, chat_capacity) values (v, gen_random_uuid(), 'ativo', 3);
  perform set_config('request.jwt.claim.sub', u::text, true);

  -- 2. Mensagem limpa passa e não registra ocorrência.
  r := care_store_moderation_precheck(v, 'quero saber o prazo de entrega');
  assert r->>'ok' = 'true', 'limpa bloqueada: ' || r::text;
  select count(*) into n from care_store_moderation_events where user_id = u;
  assert n = 0, 'registrou ocorrência de mensagem limpa';

  -- 3. Conteúdo proibido é recusado e registrado sem o texto (só hash).
  r := care_store_moderation_precheck(v, 'seu idiota');
  assert r->>'reason' = 'content', 'deveria recusar: ' || r::text;
  select content_hash into hsh from care_store_moderation_events where user_id = u and kind = 'conteudo' limit 1;
  assert hsh is not null and hsh <> 'seu idiota', 'hash deveria existir e não ser o texto';

  -- 4. Reincidência (3 na janela) gera bloqueio temporário, nunca permanente.
  r := care_store_moderation_precheck(v, 'vou te matar');
  r := care_store_moderation_precheck(v, 'seu imbecil');
  assert r->>'reason' = 'content', 'segunda ocorrência: ' || r::text;
  select count(*) into n from care_store_moderation_blocks where vendor_id = v and user_id = u and blocked_until > now() + interval '5 minutes' and blocked_until <= now() + interval '11 minutes';
  assert n = 1, 'bloqueio temporário de ~10 min não foi criado';
  r := care_store_moderation_precheck(v, 'quero saber o prazo');
  assert r->>'reason' = 'blocked', 'mensagem limpa deveria estar bloqueada durante o bloqueio: ' || r::text;

  -- 5. Passado o bloqueio, volta a enviar normalmente.
  update care_store_moderation_blocks set blocked_until = now() - interval '1 second' where vendor_id = v and user_id = u;
  r := care_store_moderation_precheck(v, 'quero saber o prazo');
  assert r->>'ok' = 'true', 'após o bloqueio deveria liberar: ' || r::text;

  -- 6. Limite de frequência (rate_max = 8 em 20 s).
  delete from care_store_moderation_events where user_id = u;
  delete from care_store_moderation_blocks where user_id = u;
  for i in 1..8 loop
    insert into care_store_messages(vendor_id, customer_id, from_vendor, body) values (v, u, false, 'msg ' || i);
  end loop;
  r := care_store_moderation_precheck(v, 'mais uma');
  assert r->>'reason' = 'rate', 'deveria limitar frequência: ' || r::text;

  -- 7. Gatilho no banco bloqueia inserção direta com conteúdo proibido (defesa extra).
  begin
    insert into care_store_messages(vendor_id, customer_id, from_vendor, body) values (v, u, false, 'vou te matar');
    assert false, 'gatilho deveria bloquear';
  exception when others then
    assert sqlerrm like 'Sua mensagem contém conteúdo inadequado%', 'mensagem do gatilho: ' || sqlerrm;
  end;

  -- 8. Nenhum texto fica guardado no registro de ocorrências.
  select count(*) into n from care_store_moderation_events where content_hash like '%idiota%' or content_hash like '%matar%';
  assert n = 0, 'texto vazou para o registro';

  raise notice 'MODERACAO OK: % frases bloqueadas, % legítimas passaram', array_length(bad,1), array_length(ok,1);
end $$;
