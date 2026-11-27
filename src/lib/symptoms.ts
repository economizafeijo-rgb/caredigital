/** Catálogo de sintomas, janelas de tempo típicas e sinais de alerta. Educativo, não é diagnóstico. */

export type SymptomGroup = "digestivo" | "pele" | "circulacao" | "geral";
export type SymptomDef = {
  key: string;
  label: string;
  group: SymptomGroup;
  /** Janela (horas) em que o gatilho costuma aparecer antes do sintoma. */
  from: number;
  to: number;
  /** Sinal de alerta: orienta atendimento de urgência. */
  red?: boolean;
};

export const SYMPTOM_GROUPS: Record<SymptomGroup, string> = {
  digestivo: "Barriga e digestão",
  pele: "Pele e alergia",
  circulacao: "Pressão e coração",
  geral: "Corpo em geral",
};

export const SYMPTOMS: SymptomDef[] = [
  { key: "dor_barriga", label: "Dor de barriga", group: "digestivo", from: 0.25, to: 10 },
  { key: "nausea", label: "Enjoo", group: "digestivo", from: 0.25, to: 8 },
  { key: "vomito", label: "Vômito", group: "digestivo", from: 0.25, to: 8 },
  { key: "diarreia", label: "Diarreia", group: "digestivo", from: 0.5, to: 12 },
  { key: "inchaco_gases", label: "Inchaço e gases", group: "digestivo", from: 0.5, to: 10 },
  { key: "azia", label: "Azia ou refluxo", group: "digestivo", from: 0.25, to: 5 },
  { key: "coceira", label: "Coceira", group: "pele", from: 0.1, to: 6 },
  { key: "manchas", label: "Manchas ou urticária", group: "pele", from: 0.1, to: 6 },
  {
    key: "inchaco_rosto",
    label: "Inchaço no rosto ou lábios",
    group: "pele",
    from: 0.1,
    to: 4,
    red: true,
  },
  { key: "nariz", label: "Espirros ou nariz entupido", group: "pele", from: 0.1, to: 4 },
  { key: "falta_ar", label: "Falta de ar", group: "pele", from: 0.1, to: 4, red: true },
  { key: "pressao_alta", label: "Pressão alta", group: "circulacao", from: 0.5, to: 8 },
  { key: "pressao_baixa", label: "Pressão baixa", group: "circulacao", from: 0.5, to: 8 },
  { key: "palpitacao", label: "Palpitação", group: "circulacao", from: 0.25, to: 6 },
  { key: "tontura", label: "Tontura", group: "circulacao", from: 0.25, to: 8 },
  { key: "dor_peito", label: "Dor no peito", group: "circulacao", from: 0.1, to: 6, red: true },
  { key: "desmaio", label: "Desmaio", group: "circulacao", from: 0.1, to: 6, red: true },
  { key: "dor_cabeca", label: "Dor de cabeça", group: "geral", from: 0.5, to: 10 },
  { key: "sonolencia", label: "Sono ou cansaço forte", group: "geral", from: 0.5, to: 8 },
  { key: "suor_frio", label: "Suor frio ou tremor", group: "geral", from: 0.25, to: 6 },
  { key: "febre", label: "Febre", group: "geral", from: 1, to: 24 },
];

export const symptomByKey = new Map(SYMPTOMS.map((s) => [s.key, s]));
export const symptomLabel = (key: string) => symptomByKey.get(key)?.label ?? key;

export const SEVERITY_LABELS = ["", "Muito leve", "Leve", "Moderado", "Forte", "Muito forte"];

export type BpClass = { label: string; tone: "ok" | "warn" | "bad" };
/** Classificação simples da pressão (referência das diretrizes brasileiras de hipertensão). */
export function classifyBp(sys?: number | null, dia?: number | null): BpClass | null {
  if (!sys || !dia) return null;
  if (sys >= 180 || dia >= 120) return { label: "Muito alta (crise)", tone: "bad" };
  if (sys < 90 || dia < 60) return { label: "Baixa", tone: "warn" };
  if (sys >= 140 || dia >= 90) return { label: "Alta", tone: "warn" };
  if (sys >= 130 || dia >= 85) return { label: "Limítrofe", tone: "warn" };
  return { label: "Normal", tone: "ok" };
}

/** Texto de alerta quando há sinal de risco; null se nada preocupante. */
export function redFlag(
  keys: string[],
  severity: number,
  sys?: number | null,
  dia?: number | null,
): string | null {
  const reds = keys.map((k) => symptomByKey.get(k)).filter((s) => s?.red);
  if (reds.length)
    return `${reds.map((s) => s!.label).join(", ")}: pode ser urgente. Procure atendimento agora ou ligue 192 (SAMU). Não espere o app achar a causa.`;
  if (sys && dia && (sys >= 180 || dia >= 120))
    return "Pressão muito alta. Descanse sentado e meça de novo em 5 minutos; se continuar ou houver dor de cabeça forte, dor no peito ou fala enrolada, ligue 192.";
  if (sys && dia && (sys < 80 || dia < 50))
    return "Pressão muito baixa. Deite com as pernas elevadas e procure atendimento se houver desmaio ou confusão.";
  if (keys.includes("vomito") && keys.includes("diarreia") && severity >= 4)
    return "Vômito e diarreia fortes juntos desidratam rápido. Beba soro e procure atendimento se não parar.";
  return null;
}
