export type ClientSection =
  | "hoje"
  | "agenda"
  | "hidratacao"
  | "historico"
  | "alimentacao"
  | "cardapios"
  | "medicacao"
  | "atividade"
  | "peso"
  | "medidas"
  | "batimentos"
  | "sono"
  | "miccao"
  | "cafeina"
  | "lactose"
  | "suplementos"
  | "indicadores";
export const clientSectionLabels: Record<
  ClientSection,
  { title: string; subtitle: string; tagline: string }
> = {
  hoje: {
    title: "Visão geral",
    subtitle: "Acompanhamento de hoje, próximo cuidado e progresso do tratamento",
    tagline: "Painel do dia",
  },
  agenda: {
    title: "Meu dia",
    subtitle: "Remédios e suplementos programados e tudo o que você registrou hoje",
    tagline: "Organização diária",
  },
  hidratacao: {
    title: "Minha hidratação",
    subtitle: "Meta individual, copos registrados, respostas e bebidas consumidas",
    tagline: "Controle de líquidos",
  },
  historico: {
    title: "Histórico e prontuário",
    subtitle: "Registros auditados, alimentação, líquidos e alterações por data",
    tagline: "Registros pessoais",
  },
  alimentacao: {
    title: "Alimentação",
    subtitle: "Refeições programadas e alimentos realmente registrados",
    tagline: "Diário alimentar",
  },
  cardapios: {
    title: "Cardápios e dietas",
    subtitle: "Planejamento educativo por objetivo, receitas regionais e calculadora de proteína",
    tagline: "Nutrição personalizada",
  },
  medicacao: {
    title: "Tratamento e medicamentos",
    subtitle: "Cartelas de doses, horários programados e confirmações do tratamento",
    tagline: "Acompanhamento do tratamento",
  },
  atividade: {
    title: "Atividade física",
    subtitle: "Registre caminhadas, corrida, ciclismo, musculação e acompanhe sua rotina",
    tagline: "Movimento e evolução",
  },
  peso: {
    title: "Peso e composição",
    subtitle: "Registre seu peso e acompanhe a evolução com gráficos, IMC e metas",
    tagline: "Evolução corporal",
  },
  batimentos: {
    title: "Batimentos cardíacos",
    subtitle:
      "Conecte o relógio ou a cinta e acompanhe a frequência ao vivo, com zonas e histórico",
    tagline: "Coração ao vivo",
  },
  medidas: {
    title: "Medidas do corpo",
    subtitle:
      "Circunferências, evolução na academia ou no seu projeto, relação cintura-quadril e gordura estimada",
    tagline: "Composição e medidas",
  },
  sono: {
    title: "Monitoramento do sono",
    subtitle:
      "Nota do sono, horas dormidas, regularidade e batimentos em tempo real com sensor Bluetooth",
    tagline: "Descanso e recuperação",
  },
  miccao: {
    title: "Micção e hidratação",
    subtitle: "Registre idas ao banheiro e cruze com os líquidos que você bebeu",
    tagline: "Equilíbrio de líquidos",
  },
  cafeina: {
    title: "Cafeína e sono",
    subtitle: "Doses, limite diário, horário de corte e relação com a qualidade do sono",
    tagline: "Energia sem atrapalhar a noite",
  },
  lactose: {
    title: "Gestão de lactose",
    subtitle: "Lactose de cada leite ou derivado, limite por refeição e no dia, sintomas e dicas",
    tagline: "Laticínios sem surpresas",
  },
  suplementos: {
    title: "Central de suplementação",
    subtitle: "Seus suplementos, doses, horários com timer, dicas e biblioteca de referência",
    tagline: "Suplementação inteligente",
  },
  indicadores: {
    title: "Evolução e métricas",
    subtitle:
      "Métricas do dia, do mês e do ano com gráficos interativos, metas atingidas e observações registradas",
    tagline: "Histórico e resultados",
  },
};
export const clientSectionHashes: Record<ClientSection, string> = {
  hoje: "visao-geral",
  agenda: "agenda",
  hidratacao: "minha-hidratacao",
  historico: "historico",
  alimentacao: "alimentacao",
  cardapios: "cardapios",
  medicacao: "medicacao",
  atividade: "atividade",
  peso: "peso",
  medidas: "medidas",
  batimentos: "batimentos",
  sono: "sono",
  miccao: "miccao",
  cafeina: "cafeina",
  lactose: "lactose",
  suplementos: "suplementos",
  indicadores: "indicadores",
};
export function clientSectionFromHash(hash: string): ClientSection {
  let normalized: string;
  try {
    normalized = decodeURIComponent(hash.replace(/^#/, "")).toLowerCase().trim();
  } catch {
    return "hoje";
  }
  const found = (Object.entries(clientSectionHashes) as [ClientSection, string][]).find(
    ([key, slug]) => slug === normalized || key === normalized,
  );
  return found?.[0] ?? "hoje";
}
export const clientSectionHash = (section: ClientSection) => "#" + clientSectionHashes[section];
