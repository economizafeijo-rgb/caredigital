import { useEffect, useRef } from "react";
import { useWeightGoalVersion } from "@/lib/weight-goal";
import { acreAddDays } from "@/lib/acre-time";
import { acreDayHour, buildDays, type GoalResult, type GoalStatus } from "@/lib/day-metrics";
import { loadPeriodRaw, lookbackStart, resolveTargets, saveGoalReviews } from "@/lib/period-data";
import { goalFxItem, useGoalFx } from "./GoalFx";

type Props = { patientId: string; ownerId: string; waterTarget: number | null; revision: number };

const storage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* sem armazenamento: o aviso pode repetir, nada se perde */
    }
  },
};

/**
 * Observa as metas do dia sem renderizar nada:
 *  - ao cruzar uma meta (ex.: beber o último copo), mostra a animação de meta atingida;
 *  - depois do fechamento do dia (22h, Acre), mostra a de meta não atingida e registra a observação.
 * O resultado de cada meta (e a observação) é gravado em care_goal_reviews, uma vez por dia e meta.
 */
export function GoalWatcher({ patientId, ownerId, waterTarget, revision }: Props) {
  const fx = useGoalFx();
  const fxRef = useRef(fx);
  fxRef.current = fx;
  const previous = useRef(new Map<string, GoalStatus>());
  const saved = useRef(new Set<string>());
  const running = useRef(false);
  const goalVersion = useWeightGoalVersion();

  useEffect(() => {
    if (!patientId || !ownerId || running.current) return;
    running.current = true;
    let active = true;
    void (async () => {
      try {
        const nowMs = Date.now();
        const today = acreDayHour(nowMs).day;
        const from = lookbackStart(today);
        const { raw, prefs } = await loadPeriodRaw(patientId, ownerId, from, today);
        if (!active) return;
        const days = buildDays(raw, from, today, {
          targets: resolveTargets(prefs, waterTarget),
          nowMs,
        });
        const stored = new Map(
          raw.reviews.map((review) => [`${review.day}|${review.metric}`, review]),
        );

        const toSave: { day: string; goal: GoalResult }[] = [];
        for (const day of days) {
          for (const goal of day.goals) {
            const key = `${day.day}|${goal.metric}`;
            const final =
              goal.status === "nao_atingida"
                ? day.closed
                : goal.status === "atingida"
                  ? goal.monotonic || day.closed
                  : false;
            if (!final) continue;
            const current = stored.get(key);
            const signature = `${key}|${goal.status}|${goal.actual}`;
            if (
              current &&
              current.status === goal.status &&
              Math.round(current.actual) === Math.round(goal.actual)
            )
              continue;
            if (saved.current.has(signature)) continue;
            saved.current.add(signature);
            toSave.push({ day: day.day, goal });
          }
        }
        if (toSave.length) {
          const result = await saveGoalReviews(patientId, ownerId, toSave);
          if (result.error)
            toSave.forEach(({ day, goal }) =>
              saved.current.delete(`${day}|${goal.metric}|${goal.status}|${goal.actual}`),
            );
        }
        if (!active) return;

        // Metas cruzadas agora: só avisa quando a mudança acontece com o app aberto, nunca ao abrir a página.
        const todayMetrics = days.find((day) => day.day === today);
        for (const goal of todayMetrics?.goals ?? []) {
          const key = `${today}|${goal.metric}`;
          const before = previous.current.get(key);
          previous.current.set(key, goal.status);
          if (goal.status !== "atingida" || before === undefined || before === "atingida") continue;
          const seenKey = `nv-fx-hit:${patientId}:${key}`;
          if (storage.get(seenKey)) continue;
          storage.set(seenKey, "1");
          fxRef.current.push(goalFxItem(goal, "hit", today));
        }

        // Dia fechado: avisa as metas não atingidas do último dia fechado, uma vez por meta.
        const lastClosed = [...days]
          .reverse()
          .find((day) => day.closed && day.day >= acreAddDays(today, -1));
        let shown = 0;
        for (const goal of lastClosed?.goals ?? []) {
          if (goal.status !== "nao_atingida" || shown >= 3) continue;
          const seenKey = `nv-fx-miss:${patientId}:${lastClosed!.day}|${goal.metric}`;
          if (storage.get(seenKey)) continue;
          storage.set(seenKey, "1");
          shown += 1;
          fxRef.current.push(goalFxItem(goal, "miss", lastClosed!.day));
        }
      } catch {
        /* sem rede ou tabela ausente: o observador tenta de novo na próxima atualização */
      } finally {
        running.current = false;
      }
    })();
    return () => {
      active = false;
      running.current = false;
    };
  }, [patientId, ownerId, waterTarget, revision, goalVersion]);

  return null;
}
