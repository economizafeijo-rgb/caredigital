import { ACRE_UTC_OFFSET, acreDateKey } from "./acre-time";

export type UrineVolume = "pouco" | "moderado" | "muito";
export type UrinationLog = {
  id: string;
  at: string;
  volume: UrineVolume;
  ml: number | null;
  notes: string;
  /** Temperatura (°C) no momento do registro; null em registros antigos. */
  temp_c?: number | null;
};
export type Liquid = { at: string; ml: number };

export const VOLUME_LABEL: Record<UrineVolume, string> = {
  pouco: "Pouco",
  moderado: "Moderado",
  muito: "Muito",
};

const hourOf = (iso: string) =>
  Number(
    new Date(iso).toLocaleString("en-GB", {
      timeZone: "America/Rio_Branco",
      hour: "2-digit",
      hourCycle: "h23",
    }),
  );

export const logsOfDay = <T extends { at: string }>(logs: T[], day: string) =>
  logs.filter((l) => acreDateKey(l.at) === day);

/** Idas por hora do dia (0–23). */
export function hourlyCounts(logs: { at: string }[]): number[] {
  const out = Array<number>(24).fill(0);
  for (const l of logs) out[hourOf(l.at)]++;
  return out;
}

/** Soma de ml por hora do dia (0–23). */
export function hourlyMl(items: Liquid[]): number[] {
  const out = Array<number>(24).fill(0);
  for (const l of items) out[hourOf(l.at)] += l.ml;
  return out;
}

/** Intervalo médio, em minutos, entre idas consecutivas do mesmo dia; null com menos de 2 registros. */
export function avgIntervalMin(logs: { at: string }[]): number | null {
  const t = logs.map((l) => new Date(l.at).getTime()).sort((a, b) => a - b);
  if (t.length < 2) return null;
  return Math.round((t[t.length - 1] - t[0]) / (t.length - 1) / 60_000);
}

export type Insight = {
  tone: "ok" | "info" | "warn";
  title: string;
  text: string;
};

export const MEDICAL_NOTE =
  "Informação educativa, não é diagnóstico. Procure um profissional de saúde se houver dor, ardor, sangue na urina, febre ou mudanças que persistam.";

/** Indicadores educativos a partir do cruzamento entre líquidos e idas ao banheiro do dia. */
export function hydrationInsight(i: {
  count: number;
  nightCount: number;
  liquidMl: number;
  goalMl: number;
  lastTwoHoursMl: number;
  lastTwoHoursCount: number;
  hourNow: number;
}): Insight {
  const { count, liquidMl, goalMl } = i;
  const pct = goalMl > 0 ? liquidMl / goalMl : 0;
  if (i.lastTwoHoursMl >= 1000 || (i.lastTwoHoursMl >= 700 && i.lastTwoHoursCount >= 4))
    return {
      tone: "warn",
      title: "Muito líquido em pouco tempo",
      text: "Você bebeu bastante nas últimas 2 horas e foi várias vezes ao banheiro. Prefira copos pequenos e espaçados.",
    };
  if (count >= 10)
    return {
      tone: "warn",
      title: "Frequência alta hoje",
      text: "Foram 10 idas ou mais. Pode ser excesso de líquidos ou de cafeína; observe se o padrão se repete nos próximos dias.",
    };
  if (i.nightCount >= 2)
    return {
      tone: "info",
      title: "Idas durante a noite",
      text: "Reduza líquidos 2 a 3 horas antes de dormir e concentre a água no começo do dia.",
    };
  if (i.hourNow >= 12 && count <= 2 && pct < 0.5)
    return {
      tone: "info",
      title: "Possível necessidade de mais água",
      text: "Poucas idas e pouco líquido até agora. Distribua copos pequenos nas próximas horas.",
    };
  if (count >= 4 && count <= 8 && pct >= 0.5)
    return {
      tone: "ok",
      title: "Ritmo de hidratação equilibrado",
      text: "Frequência e ingestão estão em faixa usual para o horário.",
    };
  if (!count && !liquidMl)
    return {
      tone: "info",
      title: "Sem dados hoje",
      text: "Registre líquidos e idas ao banheiro para ver o cruzamento.",
    };
  return {
    tone: "info",
    title: "Padrão ainda em formação",
    text: "Continue registrando ao longo do dia para uma leitura mais confiável.",
  };
}

/** Recalcula o ritmo da água para o resto do dia: copos pequenos e espaçados, com corte antes de dormir. */
export function pacingPlan(i: {
  goalMl: number;
  liquidMl: number;
  nowMs: number;
  bedHour: number;
  nightCount: number;
}): { remainingMl: number; cupMl: number; everyMin: number; cups: number; stopAt: string } | null {
  const remaining = Math.max(0, Math.round(i.goalMl - i.liquidMl));
  const cutoff = i.bedHour - (i.nightCount >= 2 ? 3 : 2);
  const day = acreDateKey(i.nowMs);
  const stopMs = new Date(
    `${day}T${String(Math.max(cutoff, 0)).padStart(2, "0")}:00:00${ACRE_UTC_OFFSET}`,
  ).getTime();
  const minLeft = Math.floor((stopMs - i.nowMs) / 60_000);
  const stopAt = `${String(Math.max(cutoff, 0)).padStart(2, "0")}h`;
  if (remaining <= 0 || minLeft < 20) return null;
  const cupMl = remaining > 1500 ? 250 : 150;
  const cups = Math.max(1, Math.ceil(remaining / cupMl));
  const everyMin = Math.max(20, Math.floor(minLeft / cups));
  return { remainingMl: remaining, cupMl, everyMin, cups, stopAt };
}
