export type ClientSection = "hoje" | "agenda" | "hidratacao" | "historico" | "alimentacao" | "cardapios" | "medicacao" | "atividade" | "peso" | "sono" | "suplementos" | "indicadores";
export const clientSectionLabels: Record<ClientSection,{title:string;subtitle:string;tagline:string}> = {
  hoje:{title:"Visão geral",subtitle:"Acompanhamento de hoje, próximo cuidado e progresso do tratamento",tagline:"Painel do dia"},
  agenda:{title:"Meu dia",subtitle:"Remédios, água, refeições, suplementos, movimento e sono numa linha do tempo",tagline:"Organização diária"},
  hidratacao:{title:"Minha hidratação",subtitle:"Meta individual, copos registrados, respostas e bebidas consumidas",tagline:"Controle de líquidos"},
  historico:{title:"Histórico e prontuário",subtitle:"Registros auditados, alimentação, líquidos e alterações por data",tagline:"Registros pessoais"},
  alimentacao:{title:"Alimentação",subtitle:"Refeições programadas e alimentos realmente registrados",tagline:"Diário alimentar"},
  cardapios:{title:"Cardápios e dietas",subtitle:"Planejamento educativo por objetivo, receitas regionais e calculadora de proteína",tagline:"Nutrição personalizada"},
  medicacao:{title:"Tratamento e medicamentos",subtitle:"Cartelas de doses, horários programados e confirmações do tratamento",tagline:"Acompanhamento do tratamento"},
  atividade:{title:"Atividade física",subtitle:"Registre caminhadas, corrida, ciclismo, musculação e acompanhe sua rotina",tagline:"Movimento e evolução"},
  peso:{title:"Peso e composição",subtitle:"Registre seu peso e acompanhe a evolução com gráficos, IMC e metas",tagline:"Evolução corporal"},
  sono:{title:"Monitoramento do sono",subtitle:"Nota do sono, horas dormidas, regularidade e batimentos em tempo real com sensor Bluetooth",tagline:"Descanso e recuperação"},
  suplementos:{title:"Central de suplementação",subtitle:"Seus suplementos, doses, horários com timer, dicas e biblioteca de referência",tagline:"Suplementação inteligente"},
  indicadores:{title:"Evolução e métricas",subtitle:"Métricas do dia, do mês e do ano com gráficos interativos, metas atingidas e observações registradas",tagline:"Histórico e resultados"}
};
export const clientSectionHashes:Record<ClientSection,string>={
  hoje:"visao-geral",agenda:"agenda",hidratacao:"minha-hidratacao",historico:"historico",
  alimentacao:"alimentacao",cardapios:"cardapios",medicacao:"medicacao",atividade:"atividade",peso:"peso",sono:"sono",suplementos:"suplementos",indicadores:"indicadores"
};
export function clientSectionFromHash(hash:string):ClientSection {
  let normalized:string;
  try {
    normalized=decodeURIComponent(hash.replace(/^#/,"")).toLowerCase().trim();
  } catch {
    return "hoje";
  }
  const found=(Object.entries(clientSectionHashes) as [ClientSection,string][])
    .find(([key,slug])=>slug===normalized||key===normalized);
  return found?.[0]??"hoje";
}
export const clientSectionHash=(section:ClientSection)=>"#"+clientSectionHashes[section];
