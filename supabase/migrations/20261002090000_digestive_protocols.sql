create table if not exists public.digestive_protocols (
  id text primary key,
  category text not null check (category in ('Estômago', 'Intestino', 'Intolerância')),
  name text not null,
  summary text not null,
  guidance text[] not null default '{}',
  caution text not null,
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  updated_at timestamptz not null default now()
);

alter table public.digestive_protocols enable row level security;
grant select on public.digestive_protocols to anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.digestive_protocols from anon, authenticated;

drop policy if exists "Digestive protocols are readable" on public.digestive_protocols;
create policy "Digestive protocols are readable"
  on public.digestive_protocols for select to anon, authenticated using (true);

insert into public.digestive_protocols (id, category, name, summary, guidance, caution, sources)
values
  (
    'gastrite-h-pylori', 'Estômago', 'Gastrite por H. pylori',
    'A alimentação pode ajudar no conforto, mas não elimina a bactéria nem substitui o tratamento prescrito.',
    array[
      'Mantenha alimentação variada e suficiente, ajustada à tolerância da pessoa.',
      'Registre sintomas e alimentos por um período curto; retire apenas itens que provoquem sintomas de forma repetida.',
      'Confirme com a equipe de saúde o tratamento da infecção e o teste de cura após o tratamento.'
    ],
    'Não usar dietas, chás, suplementos ou probióticos como substitutos da erradicação prescrita. H. pylori e gastrite podem afetar a absorção de ferro.',
    '[{"label":"NIDDK — dieta na gastrite e gastropatia","url":"https://www.niddk.nih.gov/health-information/digestive-diseases/gastritis-gastropathy/eating-diet-nutrition"},{"label":"ACG — diretriz de H. pylori (2024)","url":"https://gi.org/journals-publications/ebgi/schoenfeld_sep2024"}]'::jsonb
  ),
  (
    'gastrite-autoimune-atrofica', 'Estômago', 'Gastrite autoimune / atrófica',
    'Não existe dieta que reverta a causa autoimune. O cuidado inclui avaliar absorção e deficiências nutricionais.',
    array[
      'Manter alimentação equilibrada, sem excluir grupos alimentares sem indicação.',
      'A equipe clínica pode acompanhar ferro e vitamina B12; reposição depende de avaliação individual.',
      'Registrar sintomas e mudanças de peso ou apetite para discutir no acompanhamento.'
    ],
    'Não iniciar ferro, vitamina B12 ou outros suplementos por conta própria. Gastrite autoimune/atrófica requer acompanhamento médico.',
    '[{"label":"NIDDK — dieta na gastrite e gastropatia","url":"https://www.niddk.nih.gov/health-information/digestive-diseases/gastritis-gastropathy/eating-diet-nutrition"},{"label":"NIDDK — tipos e complicações da gastrite","url":"https://www.niddk.nih.gov/health-information/digestive-diseases/gastritis-gastropathy/definition-facts"}]'::jsonb
  ),
  (
    'gastropatia-reativa-erosiva', 'Estômago', 'Gastropatia reativa / erosiva',
    'O foco é identificar e tratar a causa da irritação; uma dieta específica não substitui essa avaliação.',
    array[
      'Revisar com o profissional os medicamentos e exposições que podem irritar o estômago, como AINEs e álcool.',
      'Evitar álcool durante a recuperação e observar tolerância alimentar individual.',
      'Não suspender nem reduzir medicamentos prescritos sem conversar com quem os indicou.'
    ],
    'Sangue no vômito, vômito com aspecto de borra de café ou fezes negras exigem atendimento médico imediato.',
    '[{"label":"NIDDK — causas da gastrite e gastropatia","url":"https://www.niddk.nih.gov/health-information/digestive-diseases/gastritis-gastropathy/symptoms-causes"},{"label":"NIDDK — tratamento da gastrite e gastropatia","url":"https://www.niddk.nih.gov/health-information/digestive-diseases/gastritis-gastropathy/treatment"}]'::jsonb
  ),
  (
    'dispepsia-funcional', 'Estômago', 'Dispepsia funcional',
    'Gatilhos variam entre pessoas. A estratégia é observar padrões e evitar restrições amplas sem benefício demonstrado.',
    array[
      'Usar um diário breve de refeições, sintomas e horários para procurar relações consistentes.',
      'Se um alimento ou bebida piorar sintomas repetidamente, testar uma redução temporária e reavaliar.',
      'Bebidas gaseificadas, cafeína, alimentos gordurosos e alguns produtos de trigo podem piorar sintomas em algumas pessoas.'
    ],
    'Dor persistente, perda de peso, vômitos recorrentes ou dificuldade para engolir precisam de avaliação clínica.',
    '[{"label":"NIDDK — alimentação na dispepsia","url":"https://www.niddk.nih.gov/health-information/digestive-diseases/indigestion-dyspepsia/eating-diet-nutrition"}]'::jsonb
  ),
  (
    'refluxo-gerd', 'Estômago', 'Refluxo gastroesofágico',
    'Recomendações de estilo de vida com melhor respaldo e identificação individual dos alimentos que desencadeiam sintomas.',
    array[
      'Evitar refeições nas 2–3 horas antes de deitar.',
      'Evitar apenas os alimentos que a própria pessoa identifica como gatilhos; não é necessário excluir todos preventivamente.',
      'Para sintomas noturnos, elevar a cabeceira pode ajudar. Se houver excesso de peso, conversar sobre redução gradual com a equipe.'
    ],
    'Dificuldade ou dor para engolir, sangramento, vômitos persistentes ou perda de peso sem explicação requerem avaliação médica.',
    '[{"label":"ACG — diretriz para refluxo gastroesofágico","url":"https://doi.org/10.14309/ajg.0000000000001538"},{"label":"ASGE — recomendações para refluxo","url":"https://www.asge.org/home/resources/publications/guidelines/american-society-for-gastrointestinal-endoscopy-guideline-on-the-diagnosis-and-management-of-gerd--summary-and-recommendations"}]'::jsonb
  ),
  (
    'sii-fodmap', 'Intestino', 'Síndrome do intestino irritável — baixo FODMAP',
    'Intervenção temporária em três fases, indicada para algumas pessoas com SII e preferencialmente acompanhada por nutricionista.',
    array[
      'Fase 1 — redução por no máximo 4–6 semanas; combinar antes como será avaliada a resposta.',
      'Fase 2 — reintroduzir grupos de FODMAP de forma organizada para identificar tolerâncias.',
      'Fase 3 — personalizar uma alimentação o mais variada possível, mantendo restrições somente quando necessárias.',
      'Fibra solúvel pode ajudar sintomas globais; aumentar gradualmente e ajustar à tolerância.'
    ],
    'Não manter a fase restritiva indefinidamente. Avaliar risco de desnutrição, insegurança alimentar e transtorno alimentar antes de dietas restritivas.',
    '[{"label":"AGA — papel da dieta na SII","url":"https://gastro.org/clinical-guidance/the-role-of-diet-in-irritable-bowel-syndrome-ibs/"},{"label":"ACG — informação para pacientes sobre baixo FODMAP","url":"https://gi.org/topics/low-fodmap-diet/"}]'::jsonb
  ),
  (
    'intolerancia-lactose', 'Intolerância', 'Intolerância à lactose',
    'A quantidade tolerada varia; costuma ser possível reduzir a lactose sem excluir todos os laticínios.',
    array[
      'Testar pequenas porções junto às refeições e aumentar aos poucos conforme tolerância.',
      'Leite sem lactose, iogurte e queijos duros podem ser opções melhor toleradas por algumas pessoas.',
      'Se reduzir laticínios, planejar fontes adequadas de cálcio e vitamina D com nutricionista ou equipe clínica.'
    ],
    'Sintomas digestivos não confirmam intolerância. Evitar exclusão ampla e prolongada sem avaliar a causa e a adequação nutricional.',
    '[{"label":"NIDDK — dieta na intolerância à lactose","url":"https://www.niddk.nih.gov/health-information/digestive-diseases/lactose-intolerance/eating-diet-nutrition"}]'::jsonb
  ),
  (
    'doenca-celiaca', 'Intestino', 'Doença celíaca — sem glúten',
    'Para diagnóstico confirmado, a dieta sem glúten é estrita e por toda a vida, com atenção a contaminação cruzada e nutrientes.',
    array[
      'Antes de iniciar a dieta, investigar com a equipe: retirar glúten pode alterar os resultados dos exames diagnósticos.',
      'Após confirmação, evitar trigo, cevada e centeio e fontes de contaminação cruzada; revisar rótulos e preparo dos alimentos.',
      'Acompanhamento com nutricionista ajuda a manter fibras, ferro, cálcio e outros nutrientes adequados.'
    ],
    'Não recomendar dieta sem glúten como tratamento genérico para sintomas digestivos nem antes de investigar suspeita de doença celíaca.',
    '[{"label":"NIDDK — diagnóstico da doença celíaca","url":"https://www.niddk.nih.gov/health-information/digestive-diseases/celiac-disease/diagnosis"},{"label":"NIDDK — dieta e nutrição na doença celíaca","url":"https://www.niddk.nih.gov/health-information/digestive-diseases/celiac-disease/eating-diet-nutrition"}]'::jsonb
  )
on conflict (id) do update set
  category = excluded.category,
  name = excluded.name,
  summary = excluded.summary,
  guidance = excluded.guidance,
  caution = excluded.caution,
  sources = excluded.sources,
  updated_at = now();
