create table if not exists public.digestive_diet_guides (
  id text primary key,
  category text not null,
  name text not null,
  summary text not null,
  guidance jsonb not null default '[]'::jsonb,
  caution text not null,
  sources jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  updated_at date not null default current_date
);

alter table public.digestive_diet_guides enable row level security;
grant select on public.digestive_diet_guides to anon, authenticated;
drop policy if exists "Digestive diet guides are readable" on public.digestive_diet_guides;
create policy "Digestive diet guides are readable"
  on public.digestive_diet_guides for select to anon, authenticated
  using (is_active = true);

insert into public.digestive_diet_guides (id, category, name, summary, guidance, caution, sources, is_active) values
('gastrite-h-pylori', 'Estômago', 'Alimentação na gastrite por H. pylori',
 'Não existe uma dieta que elimine H. pylori ou substitua o tratamento. Priorize alimentação suficiente e identifique apenas os itens que pioram seus sintomas.',
 '["Mantenha refeições equilibradas e hidratação conforme sua necessidade; não é necessário excluir grupos alimentares sem motivo individual.", "Converse com um profissional sobre investigação e tratamento da infecção. O esquema usa medicamentos prescritos; dieta não erradica a bactéria.", "Registre sintomas e alimentos por curto período para reconhecer gatilhos pessoais, sem transformar observações em proibições permanentes.", "Se houver anemia ou deficiência de ferro, faça avaliação e reposição orientada pela equipe de saúde."]'::jsonb,
 'Não use suplementos, ervas ou dietas restritivas para tratar H. pylori por conta própria. Vômito com sangue, fezes negras, desmaio ou dor forte exigem atendimento urgente.',
 '[{"label":"NIDDK — alimentação na gastrite e gastropatia","url":"https://www.niddk.nih.gov/health-information/digestive-diseases/gastritis-gastropathy/eating-diet-nutrition"},{"label":"NIDDK — tratamento da gastrite e gastropatia","url":"https://www.niddk.nih.gov/health-information/digestive-diseases/gastritis-gastropathy/treatment"}]'::jsonb, true),
('gastrite-autoimune', 'Estômago', 'Alimentação na gastrite autoimune / atrófica',
 'Não há cardápio específico que reverta a gastrite autoimune. A prioridade nutricional é acompanhar possíveis deficiências de ferro e vitamina B12 com a equipe médica.',
 '["Mantenha alimentação variada e suficiente, ajustada à tolerância individual.", "Converse com o médico sobre exames periódicos de ferro e vitamina B12; suplementos ou injeções são decididos conforme exames e diagnóstico.", "Se algum alimento agravar sintomas, registre o padrão e discuta ajustes pontuais com nutricionista.", "Evite iniciar dietas de exclusão sem avaliação, especialmente se já houver perda de peso ou anemia."]'::jsonb,
 'A dieta não trata a causa autoimune nem substitui acompanhamento, exames ou reposição prescrita. Não inicie ferro ou vitamina B12 em dose terapêutica por conta própria.',
 '[{"label":"NIDDK — alimentação na gastrite e gastropatia","url":"https://www.niddk.nih.gov/health-information/digestive-diseases/gastritis-gastropathy/eating-diet-nutrition"},{"label":"NIDDK — gastrite e gastropatia","url":"https://www.niddk.nih.gov/health-information/digestive-diseases/gastritis-gastropathy"}]'::jsonb, true),
('dispepsia-funcional', 'Estômago', 'Estratégia alimentar para dispepsia funcional',
 'Os gatilhos variam entre pessoas. A abordagem mais segura é testar ajustes limitados e observar sintomas sem cortar alimentos que você tolera.',
 '["Faça um diário simples de refeições e sintomas por alguns dias para procurar padrões reproduzíveis.", "Se houver relação clara, teste reduzir um possível gatilho por vez — como refeições muito gordurosas, cafeína ou bebidas gaseificadas — e reavalie.", "Prefira uma alimentação variada; um médico ou nutricionista pode ajudar a manter os nutrientes ao limitar um item.", "Procure avaliação se sintomas persistirem, piorarem ou vierem com perda de peso, dificuldade para engolir ou vômitos repetidos."]'::jsonb,
 'Não há lista universal de alimentos proibidos para dispepsia. Evite exclusões amplas e suplementos sem orientação; sintomas persistentes precisam de avaliação da causa.',
 '[{"label":"NIDDK — alimentação para indigestão/dispepsia","url":"https://www.niddk.nih.gov/health-information/digestive-diseases/indigestion-dyspepsia/eating-diet-nutrition"}]'::jsonb, true),
('refluxo-gerd', 'Estômago', 'Ajustes alimentares para refluxo',
 'Ajuste o que comprovadamente provoca sintomas em você. Algumas pessoas também melhoram evitando deitar logo após comer à noite.',
 '["Observe se itens como café, álcool, chocolate, hortelã, comidas gordurosas, ácidas ou picantes desencadeiam sintomas; não é necessário excluir todos se não forem gatilhos pessoais.", "Se os sintomas aparecem à noite, tente terminar a refeição pelo menos 3 horas antes de se deitar.", "Se houver sobrepeso, converse com profissional sobre uma estratégia segura e individualizada; não faça dieta extrema.", "Anote sintomas e ajustes para revisar com médico ou nutricionista."]'::jsonb,
 'A resposta varia e restrições universais não são necessárias. Dor no peito, dificuldade ou dor ao engolir, vômitos persistentes, sangue ou perda de peso precisam de avaliação médica.',
 '[{"label":"NIDDK — alimentação para refluxo gastroesofágico","url":"https://www.niddk.nih.gov/health-information/digestive-diseases/acid-reflux-ger-gerd-adults/eating-diet-nutrition"}]'::jsonb, true),
('sii-baixo-fodmap', 'Intestino', 'Baixo FODMAP para intestino irritável',
 'Pode reduzir dor e distensão em algumas pessoas com síndrome do intestino irritável. O método tem etapas e não foi feito para ser uma dieta restritiva permanente.',
 '["Antes de começar, confirme o diagnóstico e avalie com nutricionista familiarizado com sintomas gastrointestinais.", "Se indicado, faça uma fase curta de redução de FODMAPs, seguida de reintrodução gradual e sistemática para descobrir tolerâncias.", "Mantenha variedade e adequação nutricional; personalize a dieta final e evite permanecer na fase estrita.", "Acompanhe sintomas e padrão intestinal durante cada etapa."]'::jsonb,
 'Não é indicado para todos; pode ser inadequado em risco de desnutrição, histórico de transtorno alimentar ou condições complexas sem acompanhamento. Procure avaliação diante de sangue nas fezes, febre ou perda de peso.',
 '[{"label":"American College of Gastroenterology — dieta low FODMAP","url":"https://gi.org/topics/low-fodmap-diet/"},{"label":"American College of Gastroenterology — diretriz de intestino irritável","url":"https://gi.org/guidelines/irritable-bowel-syndrome/"}]'::jsonb, true),
('intolerancia-lactose', 'Intolerância', 'Redução individualizada de lactose',
 'Muitas pessoas toleram alguma lactose. O objetivo é encontrar a quantidade que evita sintomas e manter fontes adequadas de cálcio e vitamina D.',
 '["Teste porções menores junto às refeições ou produtos sem lactose, observando a resposta individual.", "Iogurte e queijos maturados podem ser mais toleráveis para algumas pessoas; ajuste pela sua experiência.", "Leia rótulos e converse com nutricionista sobre cálcio e vitamina D se reduzir laticínios.", "Se houver dúvida sobre o diagnóstico ou sintomas persistentes, converse com médico antes de excluir todo o grupo."]'::jsonb,
 'Intolerância à lactose não é a mesma coisa que alergia à proteína do leite. Não restrinja laticínios sem planejar substituições nutricionais, especialmente para crianças.',
 '[{"label":"NIDDK — alimentação para intolerância à lactose","url":"https://www.niddk.nih.gov/health-information/digestive-diseases/lactose-intolerance/eating-diet-nutrition"}]'::jsonb, true),
('doenca-celiaca', 'Intolerância', 'Alimentação sem glúten na doença celíaca',
 'Após diagnóstico confirmado, o tratamento é uma dieta sem glúten estrita e contínua, com atenção a contaminação cruzada e acompanhamento nutricional.',
 '["Se ainda não houve diagnóstico, converse com o médico antes de retirar glúten: começar a dieta pode prejudicar os exames.", "Após confirmação, evite trigo, cevada e centeio e verifique rótulos e preparo dos alimentos.", "Armazene e prepare alimentos sem glúten separadamente para reduzir contaminação cruzada.", "Use arroz, milho, mandioca, batata e alimentos naturalmente sem glúten como opções, e acompanhe adequação nutricional com nutricionista."]'::jsonb,
 'Esta orientação é para doença celíaca diagnosticada, não para emagrecimento nem para sintomas sem investigação. A dieta exige seguimento profissional.',
 '[{"label":"NIDDK — alimentação para doença celíaca","url":"https://www.niddk.nih.gov/health-information/digestive-diseases/celiac-disease/eating-diet-nutrition"},{"label":"NIDDK — tratamento da doença celíaca","url":"https://www.niddk.nih.gov/health-information/digestive-diseases/celiac-disease/treatment"}]'::jsonb, true)
on conflict (id) do update set
  category = excluded.category,
  name = excluded.name,
  summary = excluded.summary,
  guidance = excluded.guidance,
  caution = excluded.caution,
  sources = excluded.sources,
  is_active = true,
  updated_at = current_date;
