export type ClientSection = "hoje" | "agenda" | "hidratacao" | "historico" | "alimentacao" | "cardapios";
export const clientSectionLabels: Record<ClientSection,{title:string;subtitle:string;tagline:string}> = {
  hoje:{
    title:"Visão geral",
    subtitle:"Acompanhamento de hoje, próximo cuidado e progresso do tratamento",
    tagline:"Painel do dia"
  },
  agenda:{
    title:"Agenda de cuidados",
    subtitle:"Horários programados, confirmações e pendências em uma única agenda",
    tagline:"Organização diária"
  },
  hidratacao:{
    title:"Minha hidratação",
    subtitle:"Meta individual, copos registrados, respostas e bebidas consumidas",
    tagline:"Controle de líquidos"
  },
  historico:{
    title:"Histórico e prontuário",
    subtitle:"Registros auditados, alimentação, líquidos e alterações por data",
    tagline:"Registros pessoais"
  },
  alimentacao:{
    title:"Alimentação",
    subtitle:"Refeições programadas e alimentos realmente registrados",
    tagline:"Diário alimentar"
  },
  cardapios:{
    title:"Cardápios e dietas",
    subtitle:"Planejamento educativo por objetivo, receitas regionais e calculadora de proteína",
    tagline:"Nutrição personalizada"
  }
};
export const clientSectionHashes:Record<ClientSection,string>={
  hoje:"visao-geral",agenda:"agenda",hidratacao:"minha-hidratacao",historico:"historico",alimentacao:"alimentacao",cardapios:"cardapios"
};
export function clientSectionFromHash(hash:string):ClientSection {
  const normalized=decodeURIComponent(hash.replace(/^#/,"")).toLowerCase().trim();
  const found=(Object.entries(clientSectionHashes) as [ClientSection,string][])
    .find(([key,slug])=>slug===normalized||key===normalized);
  return found?.[0]??"hoje";
}
export const clientSectionHash=(section:ClientSection)=>"#"+clientSectionHashes[section];
