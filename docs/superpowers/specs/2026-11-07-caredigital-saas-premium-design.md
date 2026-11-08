# CareDigital — SaaS Premium Design System & Product Redesign

**Data:** 2026-11-07  
**Status:** Proposta para aprovação antes da implementação  
**Direção escolhida pelo proprietário:** SaaS premium; abrangência de toda a plataforma.  
**Auditoria relacionada:** `docs/audits/2026-11-07-caredigital-product-ui-audit.md`

## 1. Intenção e princípios

Transformar o CareDigital em uma plataforma HealthTech SaaS coesa, confiável, simples de entender e confortável para uso diário prolongado. A interface deve parecer um único produto mesmo quando o usuário navega entre homepage, paciente, prontuário, gestão, alimentação e protocolos.

Princípios:
- Clareza antes de decoração.
- Ação principal evidente em cada tela.
- Dados de saúde legíveis e contextualizados.
- Densidade informacional controlada, sem esconder conteúdo para caber em uma janela.
- Uma linguagem visual para claro e escuro.
- Componentes e navegação previsíveis em todos os perfis.
- A interface comunica o estado real; nunca inventa dados ou estados de saúde.

## 2. Público e arquitetura de experiência

### Perfis
- **Visitante:** entende o produto, conhece recursos demonstrativos e encontra acesso/login.
- **Paciente:** acompanha cuidados, agenda, hidratação, alimentação, medicamentos, atividade, indicadores, histórico e cardápios.
- **Administrador/proprietário:** administra prontuários, pacientes, protocolos e dados aos quais possui autorização.

### Mapa de informação proposto

**Público**
- Início
- Como funciona / Protocolos
- Recursos: Medicamentos, Hidratação, Alimentação, Biblioteca alimentar, Nutrição esportiva
- Entrar

**Paciente**
- Visão geral
- Minha rotina: Agenda, Histórico
- Cuidados: Medicamentos, Hidratação, Alimentação, Atividade
- Saúde: Indicadores, Perfil, Cardápios e dietas

**Gestão**
- Painel
- Prontuários
- Pacientes (mantendo redirecionamento/compatibilidade atual até decisão de produto)
- Protocolos
- Recursos de administração disponíveis conforme permissão real

A navegação deve refletir permissões já existentes. O design não concede acesso nem muda autorização. Evitar menus duplicados e atalhos repetidos sem necessidade. Em telas estreitas, usar navegação compacta com rótulo, estado ativo e acesso por teclado.

## 3. Abordagens consideradas

1. **Correções pontuais:** baixo custo inicial, mas preservam CSS concorrente e inconsistência entre módulos.
2. **Design system central + migração progressiva por domínio (RECOMENDADA):** cria tokens, componentes e shell consistentes e migra as páginas em fatias verificáveis. Reduz risco de regressão e permite rollback por etapa.
3. **Reconstrução simultânea de todas as páginas:** maior liberdade, mas risco elevado para fluxos sensíveis e testes; não é necessária para alcançar a identidade desejada.

**Decisão do proprietário:** abordagem 2, estilo SaaS Premium, abrangência all.

## 4. Direção visual

### Paleta de marca/interface

Valores iniciais propostos; validar contraste com ferramenta e conteúdo real antes de congelar.

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--background` | `#F4F7F6` | `#172327` | Fundo global |
| `--surface` | `#FFFFFF` | `#202F34` | Superfícies secundárias |
| `--card` | `#FFFFFF` | `#26383D` | Cartões |
| `--foreground` | `#20343A` | `#EDF5F2` | Texto principal |
| `--muted-foreground` | `#5C7074` | `#B6C8C5` | Texto secundário |
| `--primary` | `#1C6665` | `#83D2C2` | Ação principal |
| `--primary-foreground` | `#FFFFFF` | `#123B3A` | Texto em ação |
| `--accent` | `#E4F1ED` | `#304C4B` | Destaque leve |
| `--success` | `#287A5C` | `#8BD6B3` | Concluído |
| `--warning` | `#9A6A25` | `#E4BD78` | Atenção |
| `--destructive` | `#B4494F` | `#F1A1A0` | Erro/perigo |
| `--border` | `#DCE6E3` | `#3A4D50` | Bordas |
| `--ring` | `#278B83` | `#8CE0D0` | Foco |

Âmbar é reservado para atenção e informação complementar; não usar como cor dominante. Azul-petróleo/verde-água definem a identidade. Não usar gradientes como solução de hierarquia.

### Tipografia
- Interface: Inter, já carregada no projeto.
- Display: Inter com pesos 600–800; Anton não deve ser usado em textos operacionais ou títulos de formulários.
- Escala: 12/14/16/18/20/24/30/36 px, com line-height adequado.
- Números de horários, doses e indicadores: alinhamento tabular quando possível.
- Texto secundário nunca abaixo de 12 px em conteúdo operacional, salvo metadados não essenciais.

### Forma e espaçamento
- Escala de espaçamento: 4, 8, 12, 16, 20, 24, 32, 40.
- Raio: 8 (controles), 12 (cards pequenos), 16 (cards), 20 (grandes superfícies).
- Bordas finas e sombras discretas; evitar sombras em todos os elementos.
- Controles: altura mínima recomendada de 40–44 px; alvos de toque mobile preferencialmente 44×44 px.
- Largura de leitura limitada em texto longo; dashboards usam grid flexível.

## 5. Sistema de componentes

Criar ou consolidar componentes reutilizáveis, respeitando os padrões existentes:
- `AppPage`: largura, padding, título, ações e responsividade.
- `PageHeader`: título, descrição, breadcrumb e ações.
- `SectionHeader`: rótulo, título e contexto.
- `Card/Panel`: superfície padrão e variantes.
- `Button`: primário, secundário, ghost, danger e loading.
- `FormField`: label, hint, erro e acessibilidade.
- `StatusBadge`: pendente, confirmado, não confirmado, em andamento, concluído, atenção e erro.
- `MetricCard`: valor, unidade, contexto e explicação.
- `EmptyState`, `LoadingState`, `ErrorState`.
- `DataTable`/lista compacta responsiva.
- `PageNavigation`: navegação ativa por perfil e viewport.

Não criar biblioteca paralela se `ui.tsx` ou componentes Radix existentes já atenderem. Preferir adaptação e consolidação.

## 6. Layouts por domínio

### Homepage pública
- Hero com proposta de valor clara, CTA principal de acesso e CTA secundário de conhecer o produto.
- Benefícios em três ou quatro blocos curtos; sem competir com o hero.
- Ilustração atual pode ser preservada se sua qualidade e enquadramento forem aprovados; não é requisito criar imagem nova.
- Separar lógica de acesso da composição visual sem alterar as regras atuais de autenticação.
- Acesso de administrador/paciente continua decidido pelo fluxo de autorização existente.

### Login
- Formulário central, largura confortável, recuperação de senha clara e feedback de erro/sucesso.
- Não alterar autenticação, reset, validação ou redirecionamento funcional.

### Shell global
- Header compacto com marca, navegação adequada ao perfil, tema, tela cheia quando suportada e sessão.
- Menu ativo sempre identificável.
- Em desktop, navegação horizontal ou lateral conforme quantidade de destinos; mobile usa drawer/menu compacto.
- Não ocultar links de gestão que o usuário está autorizado a acessar.

### Área do paciente
- Visão geral: saudação, data local de Feijó/Acre, progresso, próximo cuidado, atalhos e resumo.
- Conteúdo de detalhe em telas próprias/seções dedicadas: Agenda, Histórico, Água, Alimentação, Medicamentos, Atividade, Indicadores, Cardápios.
- Desktop: duas colunas quando o conteúdo permitir; tablet: grade adaptativa; mobile: coluna única.
- Rolagem interna apenas em listas com contexto e altura previsível; evitar `overflow:hidden` em ancestrais que cortem conteúdo.
- Medicamentos: preservar cartela, contagem, doses, sequência e prescrições exatamente como estão no domínio funcional.

### Gestão e prontuários
- Painel de gestão com indicadores concisos e ações de maior frequência.
- Prontuário organizado por paciente selecionado, resumo, agenda e histórico; formulários em seções ou diálogos acessíveis.
- Tabelas tornam-se listas/cartões no mobile sem perder campos ou ações.
- Permissões e RLS continuam sendo a autoridade.

### Alimentação e biblioteca
- Busca, grupos, catálogo e montador de refeição em layout de trabalho; resumo nutricional em painel contextual.
- Metas e evolução em gráficos legíveis, com unidades, período e estados sem dados.
- Preservar fórmulas e dados nutricionais existentes; redesign não altera cálculo.

### Páginas públicas de recursos
- Padrão de showcase compartilhado, conteúdo e ilustrações alinhados à homepage.
- Diferenciar conteúdo demonstrativo de dados reais; CTA para login sem prometer função não implementada.

## 7. Interação e acessibilidade

- WCAG 2.2 AA como meta de design.
- Contraste validado para texto normal, texto grande, ícones e estados.
- Foco visível, ordem de tabulação, labels, aria-labels, aria-current/aria-selected corretos.
- Menus e diálogos utilizáveis com teclado e leitores de tela.
- `prefers-reduced-motion` respeitado.
- Feedback explícito para carregamento, sucesso, erro, ausência de dados e ausência de permissão.
- Tema escolhido pelo usuário persiste e é aplicado antes de a tela piscar; preferência do sistema pode ser fallback se não houver preferência salva.
- Zoom 200% e larguras de 320, 375, 768, 1024 e 1440 px não podem cortar conteúdo essencial.

## 8. Requisitos não funcionais e restrições

- Stack existente: React 19, TanStack Start/Router, Tailwind CSS 4, Radix UI, Lucide, TanStack Query, Supabase, Vitest.
- Não adicionar dependências sem justificativa.
- Não alterar schema, dados, RLS, Edge Functions ou permissões Supabase neste projeto visual.
- Não modificar prescrições, doses, horários, datas, duração de tratamento, cartelas ou registros.
- Preservar fuso horário de Feijó/Acre e funções de data já existentes.
- Preservar contratos dos componentes e callbacks que alimentam confirmação/registro.
- Não remover nem enfraquecer testes existentes.

## 9. Critérios de aceite

1. Uma única fonte de tokens semânticos controla tema claro e escuro.
2. Páginas públicas, paciente e gestão usam o mesmo sistema de tipografia, superfícies, controles e estados.
3. Cada item de menu leva à área correta e mostra estado ativo.
4. Todos os perfis têm estados loading, empty, error, unauthorized e ready coerentes.
5. Nenhum conteúdo essencial é cortado em viewport suportada ou com zoom 200%.
6. Build, lint e testes passam.
7. Testes de navegação, persistência do tema e comportamento responsivo são adicionados.
8. Fluxos sensíveis e dados do paciente não mudam.
9. Capturas de tela em desktop, tablet e mobile são revisadas antes de publicação.

## 10. Decisões deixadas ao implementador

- Manter Tailwind e CSS atual; não migrar para outra biblioteca.
- Consolidar tokens em `src/styles.css` e componentes base existentes.
- Migrar folhas legadas por página, mantendo-as temporariamente até não haver dependências.
- Separar subprojetos por fundação visual, público/shell, paciente e gestão/saúde para facilitar revisão e rollback.
- Não alterar a arquitetura de autenticação nesta iniciativa.
