# CareDigital — Auditoria de produto, UX e interface

**Data:** 2026-11-07  
**Branch auditada:** `main`  
**Commit observado:** `0fdec0ed8a4ec30faccef9e81a927989efe834c5`  
**Escopo:** homepage pública, autenticação, shell global, área do paciente, páginas de gestão e módulos de alimentação/saúde.  
**Método:** leitura estática das rotas, componentes, folhas CSS, package scripts e testes existentes. Não foi feita inspeção visual ao vivo em navegador nesta etapa; os achados visuais abaixo são inferências do código e precisam de validação em viewport real antes de qualquer implementação.

## 1. Resumo executivo

O CareDigital já possui uma base funcional relevante: React 19, TanStack Start/Router, Tailwind CSS 4, Radix UI, Lucide, TanStack Query, Supabase e Vitest. Há testes específicos para agenda, histórico, hidratação, métricas, lembretes, navegação e cartela de medicamentos.

O principal problema não é ausência de componentes, mas **fragmentação do sistema de interface**. O projeto tem tokens globais, um tema interno separado, CSS específico para três versões visuais do painel do paciente e ajustes de compatibilidade com seletores amplos. Isso cria risco de precedência imprevisível, diferenças entre páginas e correções que funcionam em um tema mas falham no outro.

A recomendação é consolidar primeiro a fundação visual e a navegação, depois reformular as áreas por domínio, mantendo intactos os contratos de dados e comportamentos clínicos.

## 2. Inventário observado

### Rotas
- `/`: homepage pública e decisão de acesso; renderiza `ClientHomeSummary` para um tipo de acesso e uma apresentação pública para os demais estados.
- `/entrar`: login, recuperação e redefinição de senha.
- `/cliente`: área autenticada do paciente; contém o painel `HomeClientCard`.
- `/admin`: resumo de gestão com autenticação administrativa, indicadores de pacientes/atividades e gestão de protocolos.
- `/prontuario`: cadastro/seleção de pacientes, agenda, água, observações e medicamentos.
- `/pacientes`: redireciona para `/prontuario`.
- `/medicamentos`, `/hidratacao`, `/nutricao-esportiva`: páginas demonstrativas públicas via `PublicCareShowcase`.
- `/dietas`, `/protocolos`: páginas de apresentação/explicação.
- `/biblioteca-alimentar`: catálogo, composição de refeições, metas e evolução com dados do Supabase.

### Shell e navegação
`AppShell.tsx` centraliza navegação pública, links de gestão, modo escuro, tela cheia, sessão e lembretes de hidratação. A navegação pública é dividida entre itens principais e menu “Mais”; links de gestão aparecem condicionalmente. A área do paciente tem navegação própria dentro de `HomeClientCard.tsx`.

### Estilos
- `src/styles.css`: 3.201 linhas; tokens globais, componentes utilitários e regras de tema.
- `internal-premium.css`: 167 linhas; redefine tokens dentro de `#care-content` e tem um segundo conjunto de tokens para dark mode.
- `client-overview-premium.css`: 227 linhas; regras específicas da visão geral V2.
- `client-overview-fullscreen.css`: 401 linhas; composição V3 com dimensões rígidas, `!important` e cores literais.
- `client-dashboard-art.css`: 804 linhas; outra direção visual para o painel do paciente, com superfícies azul-petróleo profundas e cores fixas.

## 3. Achados priorizados

### P0 — Sistema de temas com fontes concorrentes
**Evidência:** `styles.css` define tokens em `:root` e `:root.dark`; `internal-premium.css` redefine tokens dentro de `#care-content` e em `.dark #care-content`; folhas do paciente definem muitas cores diretamente em seletores `:root .care-client-overview-v3`.

**Impacto:** páginas podem apresentar fundos, texto, cartões, inputs e estados diferentes conforme o seletor vencedor, a ordem de carregamento e o tema. A manutenção depende de sobrescritas adicionais.

**Direção:** um único contrato de tokens semânticos por tema. Componentes devem consumir tokens, não valores hexadecimais locais, exceto ilustrações e estados de marca deliberados.

### P0 — Fragmentação de identidade visual
**Evidência:** coexistem três folhas CSS extensas e distintas para o dashboard do paciente, além do tema global e do tema interno.

**Impacto:** a experiência pode alternar entre superfícies claras, azul-petróleo escuro e temas internos diferentes; o mesmo componente não tem garantias de consistência.

**Direção:** selecionar uma linguagem única SaaS premium; migrar estilos em etapas e remover folhas antigas somente depois de provar que nenhum componente depende delas.

### P1 — Navegação pública e privada com modelos diferentes
**Evidência:** `AppShell` possui arrays independentes para navegação pública e de gestão; `HomeClientCard` tem cinco abas principais e quatro abas secundárias, e os atalhos rápidos repetem algumas áreas.

**Impacto:** hierarquia pouco previsível, rótulos repetidos e dificuldade para identificar a localização atual. O painel interno pode parecer outro produto em relação ao shell.

**Direção:** mapa de navegação explícito por perfil (visitante, paciente, administrador), agrupamento por tarefa e estado ativo consistente. Evitar repetir atalhos e abas sem razão de uso.

### P1 — Homepage tem função dupla e excesso de responsabilidades
**Evidência:** `/` verifica sessão, reconhece um e-mail administrativo fixo, consulta vínculo do paciente e decide entre resumo do paciente e landing pública. O hero público tem largura máxima de 850px mesmo com um shell de desktop mais amplo.

**Impacto:** a homepage é simultaneamente entrada de produto, roteador por perfil e painel do paciente para um caminho de acesso. O layout pode deixar espaço ocioso e o comportamento fica difícil de validar isoladamente.

**Direção:** preservar os contratos atuais de acesso, mas separar apresentação pública, redirecionamento/decisão de acesso e experiência autenticada em componentes/responsabilidades distintas. Não alterar regras de autorização sem auditoria de backend.

### P1 — Visão geral do paciente está comprimida para caber em uma janela
**Evidência:** `client-overview-fullscreen.css` fixa linhas de grade e alturas, usa `overflow:hidden` e reduz tipografia/controles. Agenda/histórico têm limites de altura e rolagem interna; a visão geral tem layout próprio.

**Impacto:** conteúdo pode ficar truncado em telas menores, zoom do navegador, fonte maior ou dados extensos. “Uma janela” está sendo tratada como requisito absoluto, mesmo quando sacrifica leitura.

**Direção:** prioridade para conteúdo e ações críticas; rolagem interna somente em regiões com altura definida e acessível; permitir rolagem natural da página em celulares e zoom. Desktop pode ter composição densa, mas sem cortar conteúdo.

### P1 — Componentes internos com estilos de superfície pouco semânticos
**Evidência:** `internal-premium.css` aplica seletores por descendência e por classes utilitárias, inclusive backgrounds e headings globais dentro do content root.

**Impacto:** mudanças locais podem afetar diálogos, tabelas, gráficos e páginas que não compartilham a mesma semântica.

**Direção:** componentes base (PageHeader, Panel, Btn, campos, tabela, badge, empty state) e variantes explícitas; reduzir seletores globais e `:has()` como mecanismo de arquitetura.

### P1 — Segurança e clareza de perfis precisam ser tratadas como invariantes
**Evidência:** rotas e shell fazem verificações de sessão/vínculo; homepage/admin comparam e-mail administrativo; o próprio texto administrativo alerta que RLS limita os registros ao proprietário.

**Impacto:** aparência nova não pode esconder diferenças entre permissões, sessão ausente, conta sem vínculo e erro de rede. A identificação visual de acesso não substitui autorização no servidor.

**Direção:** não mexer na autorização neste projeto visual. Cobrir estados visitante, autenticado sem vínculo, paciente, proprietário/admin, carregando e erro.

### P2 — Tipografia não tem hierarquia plenamente coerente
**Evidência:** fonte de display Anton global, Inter para sans e JetBrains Mono; folhas internas redefinem headings e tamanhos com regras próprias.

**Impacto:** títulos de impacto e títulos funcionais competem; tabelas, cartões e dados numéricos podem perder hierarquia.

**Direção:** Inter (ou a fonte de interface já disponível) para UI; fonte display apenas em momentos de marca; escalas tipográficas semânticas para título, seção, corpo, legenda e números tabulares.

### P2 — Densidade, espaçamento e dimensões variam por página
**Evidência:** padding e radius usam valores diferentes em folhas distintas; o painel do paciente tem escalas próprias e vários breakpoints locais.

**Impacto:** sensação de produto montado por módulos separados.

**Direção:** escala de espaçamento 4/8/12/16/20/24/32; raio 8/12/16/20; alturas de controle acessíveis; largura de leitura e grid consistentes.

### P2 — Estados de interface e acessibilidade devem ser padronizados
**Evidência:** existem roles e labels em várias áreas, mas não há evidência de uma revisão global de foco, teclado, contraste, redução de movimento, loading, vazio e erro.

**Impacto:** funcionalidades podem existir e ainda assim ser difíceis de usar, especialmente em dispositivos móveis e tecnologias assistivas.

**Direção:** checklist WCAG 2.2 AA como alvo de projeto; foco visível, nomes acessíveis, teclado, contraste, alvos de toque, status anunciados e respeito a `prefers-reduced-motion`.

## 4. Avaliação por área

| Área | Estado observado | Prioridade de UX |
|---|---|---|
| Homepage | Landing e decisão de perfil no mesmo módulo | Alta |
| Entrar | Fluxos login/recuperação/reset existentes | Média |
| Shell global | Navegação, tema, tela cheia e lembretes centralizados | Crítica |
| Paciente — visão geral | Layout dedicado e muito comprimido | Crítica |
| Paciente — agenda/histórico | Componentes próprios no mesmo painel | Alta |
| Paciente — água/alimentação/medicação | Fluxos internos ricos, exigem preservação funcional | Crítica |
| Paciente — atividade/indicadores/cardápios | Abas dedicadas, cobertura de layout a validar | Alta |
| Prontuário | Página de gestão densa com várias operações | Alta |
| Administração | Resumo e gestão de protocolos | Alta |
| Biblioteca alimentar | Página funcional com catálogo, composição e evolução | Alta |
| Dietas/protocolos | Apresentação demonstrativa e conteúdo editorial | Média |
| Medicamentos/hidratação/nutrição esportiva públicas | Showcase reutilizado por tipo | Média |

**Nota de cobertura:** a matriz registra a existência e o papel das rotas/composições observadas no código. Não significa que cada fluxo tenha sido exercitado visualmente ou validado com usuário real.

## 5. Riscos e invariantes

1. Nenhuma migração de schema, alteração de dados ou mudança de RLS como parte da reformulação visual.
2. Não alterar dose, prescrição, data/hora, duração, cartela ou sequência de tratamento.
3. Não duplicar registros, confirmações, lembretes ou eventos.
4. Preservar fuso de Feijó/Acre e seleção automática da data local onde já aplicável.
5. Preservar estados de autenticação, vínculo de paciente e permissões.
6. Não remover testes existentes; acrescentar testes de regressão.
7. Não substituir dados reais por mocks na experiência de produção.
8. Não forçar “uma tela sem scroll” quando isso esconder conteúdo ou impedir zoom/acessibilidade.

## 6. Critérios de aceite da auditoria e redesign

- Um sistema de tokens claro/escuro é a única fonte de cor para interface.
- Homepage, login, shell, paciente e gestão compartilham tipografia, controles, cartões, estados e navegação coerentes.
- Menus mostram claramente a seção ativa e abrem a página/área correspondente.
- Desktop, tablet e celular funcionam sem cortes horizontais ou conteúdo inacessível.
- Acessibilidade: teclado, foco, labels, contraste, redução de movimento e alvos de toque revisados.
- Testes existentes permanecem; testes de navegação/tema/responsividade são adicionados.
- Build, lint e suíte de testes passam; screenshots por viewport são revisados antes de publicar.
- Dados e fluxos de saúde continuam idênticos em comportamento e conteúdo.

## 7. Limitações desta etapa

A inspeção foi feita por leitura do código no GitHub. Não foram obtidos screenshots atuais de todas as rotas, nem foi possível testar contas reais de cada perfil em desktop/tablet/celular. Antes da implementação, o plano exige uma rodada de validação visual no navegador para confirmar overflow, estados e diferenças reais de tema.
