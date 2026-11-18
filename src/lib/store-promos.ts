import type { Product } from "./store";

/** Campanhas sazonais da loja, pelo calendário do Acre. */
export type Campaign = {
  id: "black-friday" | "natal" | "semana";
  name: string;
  headline: string;
  sub: string;
  /** Contagem regressiva até este instante. */
  until: number;
  untilLabel: string;
  theme: { bg: string; accent: string; ink: string };
};

const at = (d: string) => Date.parse(`${d}T00:00:00-05:00`);

export function currentCampaign(now = Date.now()): Campaign {
  const y = new Date(now - 5 * 3_600_000).getUTCFullYear();
  // Black Friday: última sexta de novembro.
  const nov30 = new Date(Date.UTC(y, 10, 30));
  const bfDay = 30 - ((nov30.getUTCDay() + 2) % 7);
  const bf = at(`${y}-11-${String(bfDay).padStart(2, "0")}`);
  const bfEnd = bf + 4 * 86_400_000; // até a Cyber Monday
  if (now >= at(`${y}-11-01`) && now < bfEnd) {
    const live = now >= bf;
    return {
      id: "black-friday", name: "Black Friday NextVita",
      headline: live ? "A Black Friday chegou." : "Esquenta Black Friday",
      sub: live ? "Os melhores descontos do ano em suplementos, vitaminas e moda fitness." : "Descontos liberados antes da data. Garanta antes de acabar o estoque.",
      until: live ? bfEnd : bf, untilLabel: live ? "Termina em" : "Black Friday em",
      theme: { bg: "from-[#050505] via-[#111] to-[#1c1206]", accent: "#facc15", ink: "#0a0a0a" },
    };
  }
  if (now >= bfEnd && now < at(`${y}-12-26`)) {
    return {
      id: "natal", name: "Natal Saudável",
      headline: "Presentes que cuidam de quem você ama.",
      sub: "Kits de suplementos, chás da Amazônia e moda fitness para presentear.",
      until: at(`${y}-12-24`), untilLabel: "Entrega garantida até",
      theme: { bg: "from-[#2a0508] via-[#5b0a12] to-[#0d3b26]", accent: "#fca5a5", ink: "#2a0508" },
    };
  }
  const nextSunday = at(new Date(now + ((7 - new Date(now).getUTCDay()) % 7 || 7) * 86_400_000).toISOString().slice(0, 10));
  return {
    id: "semana", name: "Ofertas da semana", headline: "Ofertas da semana NextVita", sub: "Seleção com preço especial até domingo.",
    until: nextSunday, untilLabel: "Termina em", theme: { bg: "from-[#03241e] via-[#064e3b] to-[#0e7490]", accent: "#6ee7b7", ink: "#022c22" },
  };
}

/** Próxima campanha (para o teaser). */
export function nextCampaignTeaser(now = Date.now()) {
  const c = currentCampaign(now);
  return c.id === "black-friday" ? { name: "Natal Saudável", when: "Em dezembro", text: "Kits presente, chás da Amazônia e moda fitness com embalagem especial." } : null;
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Etiquetas de vitrine de cada produto (não alteram o preço cobrado). */
export function productBadges(p: Product, campaign: Campaign) {
  const h = hash(p.id);
  const off = p.oldPriceCents ? Math.round((1 - p.priceCents / p.oldPriceCents) * 100) : 0;
  const ribbon = off > 0 ? (campaign.id === "black-friday" ? "BLACK FRIDAY" : campaign.id === "natal" ? "OFERTA DE NATAL" : "OFERTA") : null;
  const extras = ["Frete grátis acima de R$ 199", "Exclusivo NextVita", "Combina com seu treino", "Entrega rápida", "Novidade"];
  const perk = p.priceCents >= 9900 ? "Frete grátis" : extras[h % extras.length];
  const lowStock = off > 0 && h % 3 === 0 ? 3 + (h % 6) : null;
  const sold = off > 0 ? 45 + (h % 45) : null; // % vendido no relâmpago (vitrine ilustrativa)
  return { off, ribbon, perk, lowStock, sold, installments: Math.round(p.priceCents / 3) };
}

export function countdownParts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
