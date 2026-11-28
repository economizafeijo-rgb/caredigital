/**
 * Métricas e dicas de sono a partir dos horários de dormir e acordar.
 * Faixas por idade: National Sleep Foundation (Hirshkowitz et al., Sleep Health 2015, reafirmadas em 2025).
 * Cafeína: Drake et al., J Clin Sleep Med 2013 — 400 mg até 6 h antes de deitar reduziu o sono em ~1 h.
 * Refeições: evitar refeição pesada 2–3 h antes de deitar. Regularidade: horários estáveis
 * se associam a melhores desfechos de saúde (UK Biobank, 2024).
 */

export type SleepNight = { sleep_date: string; bed_at: string; wake_at: string; quality: number };
export type DayExposure = { at: number; tags: string[]; kind: string };
export type ActivityMark = { at: number; minutes: number };

const HOUR = 3_600_000;
/** Horário do Acre (UTC−5): minutos do dia local. */
const acreMinutes = (iso: string | number) => {
  const d = new Date((typeof iso === "number" ? iso : Date.parse(iso)) - 5 * HOUR);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};
/** Minutos contados a partir de 12h, para a meia-noite não "quebrar" a média de quem dorme tarde. */
const fromNoon = (m: number) => (m - 720 + 1440) % 1440;
const toClock = (fromNoonMin: number) => {
  const m = Math.round((fromNoonMin + 720) % 1440);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const sd = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
export const nightHours = (n: Pick<SleepNight, "bed_at" | "wake_at">) =>
  (Date.parse(n.wake_at) - Date.parse(n.bed_at)) / HOUR;

/** Faixa recomendada (horas) pela NSF para a idade. */
export function recommendedRange(age: number | null): { min: number; max: number; label: string } {
  if (age === null || !Number.isFinite(age)) return { min: 7, max: 9, label: "adultos" };
  if (age < 6) return { min: 10, max: 13, label: "3 a 5 anos" };
  if (age < 14) return { min: 9, max: 11, label: "6 a 13 anos" };
  if (age < 18) return { min: 8, max: 10, label: "14 a 17 anos" };
  if (age < 26) return { min: 7, max: 9, label: "18 a 25 anos" };
  if (age < 65) return { min: 7, max: 9, label: "26 a 64 anos" };
  return { min: 7, max: 8, label: "65 anos ou mais" };
}

export type SleepMetrics = {
  nights: number;
  avgHours: number;
  avgQuality: number;
  inRangePct: number;
  debtHours: number; // últimas 7 noites abaixo do mínimo recomendado
  bedtime: string;
  wakeTime: string;
  bedSdMin: number;
  wakeSdMin: number;
  socialJetlagMin: number | null;
  idealBedtime: string;
  caffeineCutoff: string;
  lastMealCutoff: string;
  target: number;
};

export function sleepMetrics(logs: SleepNight[], age: number | null): SleepMetrics | null {
  const valid = logs.filter((l) => {
    const h = nightHours(l);
    return h > 0 && h < 18;
  });
  if (!valid.length) return null;
  const range = recommendedRange(age);
  const target = (range.min + range.max) / 2;
  const hours = valid.map(nightHours);
  const beds = valid.map((l) => fromNoon(acreMinutes(l.bed_at)));
  const wakes = valid.map((l) => fromNoon(acreMinutes(l.wake_at)));
  const last7 = [...valid].sort((a, b) => b.sleep_date.localeCompare(a.sleep_date)).slice(0, 7);
  const debt = last7.reduce((s, l) => s + Math.max(0, range.min - nightHours(l)), 0);
  // Jet lag social: diferença do meio do sono entre fins de semana e dias úteis.
  const mid = (l: SleepNight) => fromNoon(acreMinutes(l.bed_at)) + (nightHours(l) * 60) / 2;
  const weekend = valid.filter((l) => {
    const d = new Date(l.sleep_date + "T12:00:00Z").getUTCDay();
    return d === 5 || d === 6; // noites de sexta e sábado
  });
  const weekday = valid.filter((l) => !weekend.includes(l));
  const jet =
    weekend.length && weekday.length
      ? Math.round(Math.abs(mean(weekend.map(mid)) - mean(weekday.map(mid))))
      : null;
  const wakeAvg = mean(wakes);
  // Hora ideal de deitar: acordar no horário habitual dormindo a meta da faixa, com ~15 min para pegar no sono.
  const ideal = wakeAvg - target * 60 - 15 + 1440;
  return {
    nights: valid.length,
    avgHours: mean(hours),
    avgQuality: mean(valid.map((l) => l.quality)),
    inRangePct: Math.round(
      (hours.filter((h) => h >= range.min && h <= range.max + 0.5).length / hours.length) * 100,
    ),
    debtHours: debt,
    bedtime: toClock(mean(beds)),
    wakeTime: toClock(wakeAvg),
    bedSdMin: Math.round(sd(beds)),
    wakeSdMin: Math.round(sd(wakes)),
    socialJetlagMin: jet,
    idealBedtime: toClock(ideal),
    caffeineCutoff: toClock(ideal - 6 * 60),
    lastMealCutoff: toClock(ideal - 3 * 60),
    target,
  };
}

export type NightContext = {
  lateCaffeine: boolean;
  lateMeal: boolean;
  activeDay: boolean;
};

/** O que aconteceu antes de cada noite: cafeína até 6 h antes, refeição até 3 h antes, treino no dia. */
export function nightContext(
  night: SleepNight,
  exposures: DayExposure[],
  activities: ActivityMark[],
): NightContext {
  const bed = Date.parse(night.bed_at);
  const within = (h: number) => (e: DayExposure) => e.at <= bed && e.at >= bed - h * HOUR;
  return {
    lateCaffeine: exposures.filter(within(6)).some((e) => e.tags.includes("g:cafeina")),
    lateMeal: exposures.filter(within(3)).some((e) => e.kind === "alimento"),
    activeDay: activities.some((a) => a.at <= bed && a.at >= bed - 18 * HOUR && a.minutes >= 20),
  };
}

export type Comparison = {
  key: keyof NightContext;
  label: string;
  withH: number;
  withoutH: number;
  withQ: number;
  withoutQ: number;
  n: number;
};

const LABELS: Record<keyof NightContext, string> = {
  lateCaffeine: "Cafeína nas 6 h antes de deitar",
  lateMeal: "Refeição nas 3 h antes de deitar",
  activeDay: "Dia com 20 min ou mais de atividade",
};

/** Compara noites com e sem cada hábito. Só mostra quando há pelo menos 2 noites de cada lado. */
export function compareHabits(
  logs: SleepNight[],
  exposures: DayExposure[],
  activities: ActivityMark[],
): Comparison[] {
  const rows = logs
    .filter((l) => nightHours(l) > 0 && nightHours(l) < 18)
    .map((l) => ({ l, c: nightContext(l, exposures, activities) }));
  return (Object.keys(LABELS) as (keyof NightContext)[]).flatMap((key) => {
    const yes = rows.filter((r) => r.c[key]);
    const no = rows.filter((r) => !r.c[key]);
    if (yes.length < 2 || no.length < 2) return [];
    return [
      {
        key,
        label: LABELS[key],
        withH: mean(yes.map((r) => nightHours(r.l))),
        withoutH: mean(no.map((r) => nightHours(r.l))),
        withQ: mean(yes.map((r) => r.l.quality)),
        withoutQ: mean(no.map((r) => r.l.quality)),
        n: yes.length,
      },
    ];
  });
}

/** Dicas priorizadas pelo que os dados mostram. */
export function sleepTips(m: SleepMetrics, cmp: Comparison[], age: number | null): string[] {
  const r = recommendedRange(age);
  const tips: string[] = [];
  if (m.avgHours < r.min)
    tips.push(
      `Sua média é ${m.avgHours.toFixed(1).replace(".", ",")} h, abaixo das ${r.min}–${r.max} h recomendadas para ${r.label}. Tente deitar por volta das ${m.idealBedtime}.`,
    );
  else if (m.avgHours > r.max + 1)
    tips.push(
      "Você dorme bem mais que a faixa recomendada. Sono longo e cansaço constante merecem conversa com um médico.",
    );
  if (m.debtHours >= 3)
    tips.push(
      `Dívida de sono de ${m.debtHours.toFixed(1).replace(".", ",")} h na última semana. Recupere aos poucos: 30–60 min a mais por noite, sem cochilos longos.`,
    );
  if (m.bedSdMin > 60 || m.wakeSdMin > 60)
    tips.push(
      "Seus horários variam mais de 1 h de uma noite para outra. Horários estáveis, inclusive no fim de semana, estão ligados a melhor saúde.",
    );
  if (m.socialJetlagMin !== null && m.socialJetlagMin >= 60)
    tips.push(
      `No fim de semana seu sono se desloca ${Math.round(m.socialJetlagMin / 6) / 10} h ("jet lag social"). Mantenha a diferença abaixo de 1 h.`,
    );
  const caf = cmp.find((c) => c.key === "lateCaffeine");
  if (caf && caf.withoutH - caf.withH >= 0.25)
    tips.push(
      `Nas noites com cafeína tardia você dormiu ${Math.round((caf.withoutH - caf.withH) * 60)} min a menos. Pare a cafeína até as ${m.caffeineCutoff}.`,
    );
  else
    tips.push(`Evite café, chá preto, mate e refrigerante de cola depois das ${m.caffeineCutoff}.`);
  const meal = cmp.find((c) => c.key === "lateMeal");
  if (meal && meal.withoutQ - meal.withQ >= 0.4)
    tips.push(
      `Jantar perto da hora de deitar piorou a qualidade do seu sono. Faça a última refeição até as ${m.lastMealCutoff}.`,
    );
  const act = cmp.find((c) => c.key === "activeDay");
  if (act && act.withQ - act.withoutQ >= 0.3)
    tips.push(
      "Nos dias com atividade física seu sono foi melhor. Prefira treinar de manhã ou à tarde.",
    );
  tips.push(
    "Pegue luz natural por 10–30 min logo cedo e diminua telas e luz forte 1 h antes de deitar.",
  );
  return tips.slice(0, 6);
}
