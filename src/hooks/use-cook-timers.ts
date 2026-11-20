import { useCallback, useEffect, useRef, useState } from "react";
import { playChime } from "@/components/vigia/NextUpClock";
import { cookFoodById, presetOf } from "@/lib/cooking-times";
import {
  addMs,
  makeTimer,
  parseTimers,
  pauseTimer,
  restartTimer,
  resumeTimer,
  settle,
  type CookTimer,
} from "@/lib/cook-timers";

const key = (patientId: string) => `nv-cook-timers-${patientId}`;
/** Timers que terminaram há mais que isso não tocam alarme ao reabrir a página. */
const STALE_MS = 2 * 60_000;

function load(patientId: string): CookTimer[] {
  try {
    return parseTimers(localStorage.getItem(key(patientId)));
  } catch {
    return [];
  }
}

export function useCookTimers(patientId: string, soundOn: boolean) {
  const [timers, setTimers] = useState<CookTimer[]>(() =>
    typeof window === "undefined" ? [] : load(patientId),
  );
  const [now, setNow] = useState(() => Date.now());
  const alarmed = useRef(new Set<string>());
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  // Persistência.
  useEffect(() => {
    try {
      localStorage.setItem(key(patientId), JSON.stringify(timers));
    } catch {
      /* sem armazenamento */
    }
  }, [timers, patientId]);

  const anyRunning = timers.some((t) => t.status === "running");

  // Relógio: 4 vezes por segundo enquanto houver timer correndo.
  useEffect(() => {
    if (!anyRunning) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [anyRunning]);

  // Conclui timers vencidos e dispara o alarme uma única vez.
  useEffect(() => {
    if (!timers.some((t) => t.status === "running" && t.endsAt <= now)) return;
    const finished: CookTimer[] = [];
    setTimers((list) =>
      list.map((t) => {
        const s = settle(t, now);
        if (s !== t) finished.push(s);
        return s;
      }),
    );
    for (const t of finished) {
      if (alarmed.current.has(t.id)) continue;
      alarmed.current.add(t.id);
      if (now - t.doneAt > STALE_MS) continue;
      const food = cookFoodById.get(t.foodId);
      const name = food ? `${food.name} (${presetOf(food, t.presetKey).label})` : "Preparo";
      if (soundRef.current) {
        playChime(0.3);
        window.setTimeout(() => playChime(0.3), 1600);
        window.setTimeout(() => playChime(0.3), 3200);
      }
      try {
        navigator.vibrate?.([300, 150, 300, 150, 500]);
      } catch {
        /* sem vibração */
      }
      if (
        document.hidden &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification("Tempo de preparo concluído", {
            body: `${name} está pronto.`,
            tag: t.id,
          });
        } catch {
          /* sem notificação */
        }
      }
    }
  }, [now, timers]);

  // Mantém a tela acesa enquanto algo cozinha (quando o navegador permite).
  useEffect(() => {
    if (!anyRunning || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = () =>
      navigator.wakeLock
        .request("screen")
        .then((l) => {
          if (cancelled) void l.release();
          else lock = l;
        })
        .catch(() => undefined);
    void request();
    const onVisible = () => {
      if (!document.hidden) void request();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [anyRunning]);

  const update = useCallback((id: string, fn: (t: CookTimer, at: number) => CookTimer) => {
    const at = Date.now();
    setNow(at);
    setTimers((list) => list.map((t) => (t.id === id ? fn(t, at) : t)));
  }, []);

  const start = useCallback(
    (input: { foodId: string; presetKey: string; qty: number; minutes: number }) => {
      const at = Date.now();
      const id = `${at.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      setNow(at);
      setTimers((list) =>
        [
          ...list.filter((t) => t.status !== "done" || at - t.doneAt < 10 * 60_000),
          makeTimer({ id, ...input }, at),
        ].slice(-12),
      );
      return id;
    },
    [],
  );

  return {
    timers,
    now,
    start,
    pause: (id: string) => update(id, pauseTimer),
    resume: (id: string) => update(id, resumeTimer),
    addMinute: (id: string) => update(id, (t, at) => addMs(t, 60_000, at)),
    restart: (id: string) => {
      alarmed.current.delete(id);
      update(id, restartTimer);
    },
    remove: (id: string) => setTimers((list) => list.filter((t) => t.id !== id)),
  };
}
