import { symptomByKey } from "./symptoms";
import { TAG_LABELS, type ExposureKind } from "./exposure-tags";

/**
 * Motor de pistas: para cada sintoma, procura o que foi ingerido na janela de horas anterior e compara
 * com a frequência geral (quantas vezes qualquer ingestão foi seguida do mesmo sintoma).
 * Resultado é pista para investigar, nunca diagnóstico.
 */
export type Exposure = {
  id: string;
  at: number;
  label: string;
  kind: ExposureKind;
  tags: string[];
};
export type SymptomEvent = { id: string; at: number; symptoms: string[]; severity: number };
export type Confidence = "alta" | "media" | "baixa";

export type Clue = {
  symptom: string;
  tag: string;
  label: string;
  /** Vezes em que o gatilho foi seguido do sintoma. */
  hits: number;
  /** Vezes em que o gatilho foi registrado. */
  occurrences: number;
  /** Eventos do sintoma que tiveram o gatilho antes. */
  events: number;
  totalEvents: number;
  rate: number;
  baseline: number;
  lift: number;
  medianMin: number;
  score: number;
  confidence: Confidence;
  lastAt: number;
};

const H = 3_600_000;
/** Registros do mesmo gatilho com menos de 60 min contam como uma ocorrência só. */
const MERGE = H;

function dedupe(list: Exposure[]): Exposure[] {
  const sorted = [...list].sort((a, b) => a.at - b.at);
  const out: Exposure[] = [];
  for (const e of sorted) if (!out.length || e.at - out[out.length - 1].at >= MERGE) out.push(e);
  return out;
}

export function labelForTag(tag: string, exposures: Exposure[]): string {
  if (tag.startsWith("i:")) {
    const hit = exposures.find((e) => e.tags.includes(tag));
    return hit ? hit.label.replace(/\s+\d.*$/, "") : tag.slice(2);
  }
  return TAG_LABELS.get(tag) ?? tag.slice(2);
}

export function findClues(events: SymptomEvent[], exposures: Exposure[], minEvents = 1): Clue[] {
  if (!events.length || !exposures.length) return [];
  const byTag = new Map<string, Exposure[]>();
  for (const e of exposures)
    for (const t of e.tags) {
      const arr = byTag.get(t);
      if (arr) arr.push(e);
      else byTag.set(t, [e]);
    }
  const anyOcc = dedupe(exposures);
  const symptoms = new Set(events.flatMap((e) => e.symptoms));
  const all: Clue[] = [];

  for (const s of symptoms) {
    const def = symptomByKey.get(s);
    const from = (def?.from ?? 0.5) * H;
    const to = (def?.to ?? 8) * H;
    const evs = events.filter((e) => e.symptoms.includes(s));
    if (evs.length < minEvents) continue;
    const followed = (at: number) => evs.some((e) => e.at - at >= from && e.at - at <= to);
    const baseHits = anyOcc.filter((o) => followed(o.at)).length;
    const baseline = Math.max(baseHits / Math.max(anyOcc.length, 1), 0.02);
    const sig = new Set<string>();
    const found: Clue[] = [];

    for (const [tag, list] of byTag) {
      const occ = dedupe(list);
      const hitOcc = occ.filter((o) => followed(o.at));
      if (!hitOcc.length) continue;
      const covered = evs.filter((e) => occ.some((o) => e.at - o.at >= from && e.at - o.at <= to));
      const rate = hitOcc.length / occ.length;
      const lift = rate / baseline;
      // Com bastante histórico, gatilho que não pesa mais que o normal não é pista.
      if (anyOcc.length >= 8 && lift < 1.2) continue;
      const delays = covered
        .map((e) => {
          const near = occ.filter((o) => e.at - o.at >= from && e.at - o.at <= to).pop();
          return near ? (e.at - near.at) / 60_000 : 0;
        })
        .sort((a, b) => a - b);
      const coverage = covered.length / evs.length;
      const support = covered.length / (covered.length + 1);
      const score = (coverage * 0.5 + rate * 0.3 + Math.min(lift / 4, 1) * 0.2) * support;
      const confidence: Confidence =
        covered.length >= 3 && rate >= 0.5 && lift >= 2
          ? "alta"
          : covered.length >= 2 && lift >= 1.5
            ? "media"
            : "baixa";
      const signature = `${covered.map((c) => c.id).join(",")}|${occ.length}|${hitOcc.length}`;
      // Grupo e item com os mesmos números são a mesma pista: fica o grupo (mais legível).
      if (sig.has(signature)) {
        if (!tag.startsWith("i:")) {
          const idx = found.findIndex((c) => c.tag.startsWith("i:") && sigOf(c) === signature);
          if (idx >= 0) found.splice(idx, 1);
        } else continue;
      }
      sig.add(signature);
      const clue: Clue = {
        symptom: s,
        tag,
        label: labelForTag(tag, list),
        hits: hitOcc.length,
        occurrences: occ.length,
        events: covered.length,
        totalEvents: evs.length,
        rate,
        baseline,
        lift,
        medianMin: Math.round(delays[Math.floor(delays.length / 2)] ?? 0),
        score,
        confidence,
        lastAt: hitOcc[hitOcc.length - 1].at,
      };
      sigMap.set(clue, signature);
      found.push(clue);
    }
    found.sort((a, b) => b.score - a.score);
    all.push(...found.slice(0, 8));
  }
  return all.sort((a, b) => b.score - a.score);
}

const sigMap = new WeakMap<Clue, string>();
const sigOf = (c: Clue) => sigMap.get(c) ?? "";

export type EventItem = { exposure: Exposure; minBefore: number; suspect: boolean; novel: boolean };

/** O que foi ingerido antes de um evento, do mais próximo ao mais distante, marcando suspeitos e novidades. */
export function explainEvent(
  event: SymptomEvent,
  exposures: Exposure[],
  clues: Clue[],
): EventItem[] {
  const maxH = Math.max(...event.symptoms.map((s) => symptomByKey.get(s)?.to ?? 8), 2);
  const suspects = new Set(
    clues.filter((c) => event.symptoms.includes(c.symptom) && c.score >= 0.25).map((c) => c.tag),
  );
  return exposures
    .filter((e) => e.at <= event.at && event.at - e.at <= maxH * H)
    .sort((a, b) => b.at - a.at)
    .map((e) => {
      const item = e.tags.find((t) => t.startsWith("i:"));
      const novel =
        !!item &&
        !exposures.some(
          (o) => o.tags.includes(item) && o.at < e.at - 6 * H && o.at > e.at - 14 * 24 * H,
        ) &&
        e.kind !== "bebida";
      return {
        exposure: e,
        minBefore: Math.round((event.at - e.at) / 60_000),
        suspect: e.tags.some((t) => suspects.has(t)),
        novel,
      };
    });
}
