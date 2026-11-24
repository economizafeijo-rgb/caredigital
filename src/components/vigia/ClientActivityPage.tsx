import { ensureUnlocked } from "@/lib/record-lock";
import { type LivePoint } from "./LiveWorkoutVisual";
import { NiceSelect } from "./NiceSelect";
import { ActivityDaysChart, ActivityHero } from "./ActivityHero";
import { RecordInfo } from "./RecordInfo";
import { WorkoutLive, WorkoutReady, WorkoutShell } from "./LiveWorkoutScreen";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bike,
  Clock3,
  Footprints,
  HeartPulse,
  Plus,
  Search,
  Waves,
  Dumbbell,
  MapPin,
  Pause,
  Play,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import {
  formatPace,
  metersBetween,
  ingest,
  initialTracker,
  isStopped,
  trackerConfig,
  type TrackerState,
} from "@/lib/gps-tracker";
import { buildMetrics, hms, mmss, type WorkoutMetrics } from "@/lib/workout-metrics";

type GpsPoint = LivePoint;
type ActivityEntry = {
  id: string;
  happened_at: string;
  details: {
    activity_type?: string;
    title?: string;
    duration_minutes?: number;
    distance_km?: number | null;
    intensity?: string;
    notes?: string;
    started_at?: string | null;
    metrics?: Partial<WorkoutMetrics> | null;
  } | null;
};

const activityOptions = [
  { value: "caminhada", label: "Caminhada", icon: Footprints },
  { value: "corrida", label: "Corrida", icon: Activity },
  { value: "ciclismo", label: "Ciclismo", icon: Bike },
  { value: "musculacao", label: "Musculação", icon: Dumbbell },
  { value: "natacao", label: "Natação", icon: Waves },
  { value: "outro", label: "Outra atividade", icon: HeartPulse },
] as const;
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Rio_Branco",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const SESSION_KEY = "nv-live-workout";
const MAX_MINUTES = 240; // treino encerra sozinho depois de 4 h em movimento
const IDLE_PROMPT_MS = 5 * 60_000; // parado por 5 min → pergunta se ainda está treinando
const PROMPT_SECONDS = 60;
type SavedSession = {
  type: string;
  startedAt: string;
  elapsed: number;
  distanceKm: number;
  route: GpsPoint[];
  autoPauses: number;
  savedAt: number;
};
const readSession = (): SavedSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SavedSession;
    return Date.now() - s.savedAt < 6 * 3_600_000 ? s : null;
  } catch {
    return null;
  }
};
const clearSession = () => {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
};

/** Mini mapa do percurso guardado no registro. */
function RouteMini({ route, className = "" }: { route: [number, number][]; className?: string }) {
  if (route.length < 2) return null;
  const lat = route.map((r) => r[0]);
  const lon = route.map((r) => r[1]);
  const minLat = Math.min(...lat);
  const maxLat = Math.max(...lat);
  const minLon = Math.min(...lon);
  const maxLon = Math.max(...lon);
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const sx = Math.max((maxLon - minLon) * k, 1e-6);
  const sy = Math.max(maxLat - minLat, 1e-6);
  const W = 160;
  const H = 96;
  const pad = 10;
  const sc = Math.min((W - pad * 2) / sx, (H - pad * 2) / sy);
  const ox = (W - sx * sc) / 2;
  const oy = (H - sy * sc) / 2;
  const pts = route.map(
    (r) => [ox + (r[1] - minLon) * k * sc, H - (oy + (r[0] - minLat) * sc)] as [number, number],
  );
  const d = pts.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role="img"
      aria-label="Percurso da atividade"
    >
      <rect width={W} height={H} rx="10" className="fill-muted/40" />
      <path
        d={d}
        fill="none"
        stroke="#0d9488"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={pts[0][0]} cy={pts[0][1]} r="3.5" fill="#fff" stroke="#0d9488" strokeWidth="2" />
      <circle
        cx={pts.at(-1)![0]}
        cy={pts.at(-1)![1]}
        r="4"
        fill="#0ea5e9"
        stroke="#fff"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/** Linhas de métricas estimadas para exibir (resumo e histórico). */
function metricRows(m: Partial<WorkoutMetrics>, distanceKm?: number | null): [string, string][] {
  const rows: [string, string][] = [];
  if (m.kcal_est) rows.push(["Gasto estimado", `${m.kcal_est} kcal`]);
  if (m.avg_pace_s_km) rows.push(["Ritmo médio", `${mmss(m.avg_pace_s_km)} min/km`]);
  if (m.avg_speed_kmh)
    rows.push(["Velocidade média", `${m.avg_speed_kmh.toLocaleString("pt-BR")} km/h`]);
  if (m.max_speed_kmh)
    rows.push(["Velocidade máxima", `${m.max_speed_kmh.toLocaleString("pt-BR")} km/h`]);
  if (m.avg_bpm)
    rows.push(["Batimento médio", `${m.avg_bpm} bpm${m.max_bpm ? ` · pico ${m.max_bpm}` : ""}`]);
  if (m.steps_est) rows.push(["Passos (estimado)", m.steps_est.toLocaleString("pt-BR")]);
  if (m.moving_seconds && m.total_seconds && m.total_seconds - m.moving_seconds > 30)
    rows.push(["Tempo parado", hms(m.total_seconds - m.moving_seconds)]);
  if (m.effort)
    rows.push([
      "Esforço",
      m.effort === "intensa" ? "Intenso" : m.effort === "moderada" ? "Moderado" : "Leve",
    ]);
  void distanceKm;
  return rows;
}

export function ClientActivityPage({
  patientId,
  ownerId,
  revision,
  onRecorded,
}: {
  patientId: string;
  ownerId: string;
  revision: number;
  onRecorded: () => void;
}) {
  const [items, setItems] = useState<ActivityEntry[]>([]);
  const [type, setType] = useState<(typeof activityOptions)[number]["value"]>("caminhada");
  const [duration, setDuration] = useState("30");
  const [distance, setDistance] = useState("");
  const [intensity, setIntensity] = useState("moderada");
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tracking, setTracking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);
  const [metrics, setMetrics] = useState<WorkoutMetrics | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const autoPausesRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gpsLost, setGpsLost] = useState(false);
  const [locked, setLocked] = useState(false);
  const [stillPrompt, setStillPrompt] = useState<number | null>(null);
  const [gapPrompt, setGapPrompt] = useState<number | null>(null);
  const heartbeatRef = useRef(0);
  const gapRef = useRef<{ ms: number; anchor: TrackerState["anchor"] } | null>(null);
  const [recovered, setRecovered] = useState<SavedSession | null>(null);
  const lastFixAtRef = useRef(0);
  const haltedSinceRef = useRef(0);
  const finishRef = useRef<(reason?: string) => void>(() => undefined);
  const [gpsDistance, setGpsDistance] = useState(0);
  const [gpsState, setGpsState] = useState<"searching" | "ok" | "denied">("searching");
  const [elapsed, setElapsed] = useState(0);
  const [route, setRoute] = useState<GpsPoint[]>([]);
  const [summary, setSummary] = useState<{
    duration: number;
    distance: number;
    pace: string;
    points: number;
  } | null>(null);
  const watchRef = useRef<number | null>(null);
  const startedRef = useRef(0);
  const pausedRef = useRef(false);
  const pauseAtRef = useRef(0);
  pausedRef.current = paused;
  const trackerRef = useRef<TrackerState>(initialTracker());
  const autoPausedRef = useRef(false);
  const motionAtRef = useRef(0);
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null);
  const prevHaltedRef = useRef(false);
  const typeRef = useRef(type);
  typeRef.current = type;
  autoPausedRef.current = autoPaused;
  const halted = paused || autoPaused;
  const { confirm, prompt, notify } = useDialog();

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const since = new Date(Date.now() - 90 * 86400000).toISOString();
        const result = await (supabase as any)
          .from("care_activity_log")
          .select("id,happened_at,details")
          .eq("patient_id", patientId)
          .eq("owner_id", ownerId)
          .eq("category", "atividade")
          .eq("event_type", "logged")
          .gte("happened_at", since)
          .order("happened_at", { ascending: false })
          .limit(200);
        if (!active) return;
        if (result.error) throw result.error;
        setItems(result.data ?? []);
        setError("");
      } catch {
        if (active)
          setError("Não foi possível carregar as atividades. Tente novamente em instantes.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [patientId, ownerId, revision]);

  const filtered = useMemo(
    () => items.filter((item) => filter === "todos" || item.details?.activity_type === filter),
    [items, filter],
  );
  const routeDistance = gpsDistance;
  const liveStatus: "searching" | "moving" | "auto" | "manual" = paused
    ? "manual"
    : autoPaused
      ? "auto"
      : trackerRef.current.anchor
        ? "moving"
        : "searching";
  // Tempo em movimento: pausa (manual ou automática) não conta; ao retomar, o início é deslocado.
  useEffect(() => {
    if (!tracking) {
      prevHaltedRef.current = false;
      return;
    }
    if (halted && !prevHaltedRef.current) {
      pauseAtRef.current = Date.now();
      haltedSinceRef.current = Date.now();
      navigator.vibrate?.([60, 60, 60]);
    }
    if (!halted) haltedSinceRef.current = 0;
    if (!halted && prevHaltedRef.current && pauseAtRef.current) {
      navigator.vibrate?.(80);
      startedRef.current += Date.now() - pauseAtRef.current;
      // Depois de uma pausa manual, recomeça a medir do ponto atual (sem somar o deslocamento parado).
      if (!autoPausedRef.current) trackerRef.current = { ...trackerRef.current, anchor: null };
    }
    prevHaltedRef.current = halted;
  }, [halted, tracking]);
  useEffect(() => {
    if (!tracking || halted) return;
    const timer = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - startedRef.current) / 1000)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [tracking, halted]);
  // Pausa automática: sem deslocamento no GPS e sem movimento do corpo → pausa; voltou a se mover → continua.
  useEffect(() => {
    if (!tracking) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      // Limite de duração: não deixa o treino ligado indefinidamente.
      if (
        (now - startedRef.current) / 1000 >= MAX_MINUTES * 60 &&
        !pausedRef.current &&
        !autoPausedRef.current
      ) {
        finishRef.current("Treino encerrado: atingiu o limite de 4 horas.");
        return;
      }
      // Inatividade: parado (automático ou manual) há muito tempo → pergunta.
      if (haltedSinceRef.current && now - haltedSinceRef.current > IDLE_PROMPT_MS) {
        haltedSinceRef.current = now + 24 * 3_600_000; // só pergunta uma vez por parada
        navigator.vibrate?.([200, 100, 200]);
        setStillPrompt(PROMPT_SECONDS);
      }
      // Sinal do GPS: sem leitura há 20 s.
      if (!pausedRef.current && lastFixAtRef.current)
        setGpsLost(now - lastFixAtRef.current > 20_000);
      if (pausedRef.current) return;
      const stopped = isStopped(trackerRef.current, Date.now(), motionAtRef.current);
      if (stopped && !autoPausedRef.current) {
        autoPausesRef.current += 1;
        setAutoPaused(true);
      } else if (
        !stopped &&
        autoPausedRef.current &&
        Date.now() - trackerRef.current.lastMoveAt < 3000
      )
        setAutoPaused(false);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [tracking]);
  // Sensor de movimento do aparelho (acelerômetro): reforça a detecção quando o GPS oscila.
  useEffect(() => {
    if (!tracking) return;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.acceleration;
      const g = e.accelerationIncludingGravity;
      const mag =
        a && a.x !== null
          ? Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0)
          : g && g.x !== null
            ? Math.abs(Math.hypot(g.x ?? 0, g.y ?? 0, g.z ?? 0) - 9.81)
            : 0;
      if (mag > 1.6) {
        motionAtRef.current = Date.now();
        // Movimento do corpo retoma a contagem de tempo mesmo antes do GPS confirmar.
        if (
          autoPausedRef.current &&
          !pausedRef.current &&
          Date.now() - trackerRef.current.lastMoveAt < 20000
        )
          setAutoPaused(false);
      }
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [tracking]);
  // Mantém a tela ligada durante a atividade, para o GPS não ser suspenso.
  useEffect(() => {
    if (!tracking) return;
    let alive = true;
    const lock = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
        };
        if (nav.wakeLock && document.visibilityState === "visible") {
          const l = await nav.wakeLock.request("screen");
          if (alive) wakeRef.current = l;
          else void l.release();
        }
      } catch {
        /* sem suporte: segue sem manter a tela ligada */
      }
    };
    void lock();
    const onVis = () => void lock();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVis);
      void wakeRef.current?.release().catch(() => undefined);
      wakeRef.current = null;
    };
  }, [tracking]);
  useEffect(
    () => () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    },
    [],
  );
  finishRef.current = (reason?: string) => void stopGps(reason);
  function cancelReady() {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    setCountdown(null);
    setReady(false);
  }
  // Treino interrompido (app fechado, tela travou): oferece retomar.
  useEffect(() => {
    setRecovered(readSession());
  }, []);
  // Guarda o treino em andamento a cada poucos segundos para não perder nada se o app fechar.
  useEffect(() => {
    if (!tracking || !startedAt) return;
    if (elapsed % 5 !== 0 && route.length % 5 !== 0) return;
    try {
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          type,
          startedAt,
          elapsed,
          distanceKm: gpsDistance,
          route: route.slice(-500),
          autoPauses: autoPausesRef.current,
          savedAt: Date.now(),
        } satisfies SavedSession),
      );
    } catch {
      /* sem espaço: segue sem salvar */
    }
  }, [tracking, startedAt, elapsed, route, gpsDistance, type]);
  // Proteção contra fechar a página sem querer durante o treino.
  useEffect(() => {
    if (!tracking) return;
    const onBefore = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [tracking]);
  // Contagem da pergunta de inatividade; sem resposta, encerra o treino.
  useEffect(() => {
    if (stillPrompt === null) return;
    if (stillPrompt <= 0) {
      finishRef.current("Treino encerrado por inatividade. Revise e salve se quiser.");
      return;
    }
    const t = window.setTimeout(() => setStillPrompt((v) => (v === null ? v : v - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [stillPrompt]);

  // Saiu da tela (app em segundo plano, tela desligada): o navegador congela a página e o GPS para.
  // Ao voltar, o tempo fora NÃO conta, a menos que a pessoa confirme que continuou treinando.
  useEffect(() => {
    if (!tracking) return;
    heartbeatRef.current = Date.now();
    const check = () => {
      const now = Date.now();
      const gap = now - heartbeatRef.current;
      heartbeatRef.current = now;
      if (gap < 15_000 || document.visibilityState !== "visible") return;
      // Parado/pausado: o tempo já não está contando, nada a descontar.
      if (pausedRef.current || autoPausedRef.current) return;
      startedRef.current += gap;
      setElapsed(Math.floor((now - startedRef.current) / 1000));
      gapRef.current = { ms: gap, anchor: trackerRef.current.anchor };
      trackerRef.current = { ...trackerRef.current, anchor: null };
      setGapPrompt(Math.round(gap / 60_000) || 1);
    };
    const beat = window.setInterval(check, 1000);
    const onVis = () => {
      if (document.visibilityState === "visible") check();
      else heartbeatRef.current = Date.now();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onVis);
    return () => {
      window.clearInterval(beat);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onVis);
    };
  }, [tracking]);
  function answerGap(kept: boolean) {
    const g = gapRef.current;
    gapRef.current = null;
    setGapPrompt(null);
    if (!kept || !g) return;
    // Continuou treinando: devolve o tempo e soma a distância em linha reta entre os pontos (estimativa mínima).
    startedRef.current -= g.ms;
    setElapsed(Math.floor((Date.now() - startedRef.current) / 1000));
    const now = trackerRef.current.anchor;
    if (g.anchor && now) {
      const m = metersBetween(g.anchor, now);
      if (m / (g.ms / 1000) <= trackerConfig(typeRef.current).maxSpeed) {
        trackerRef.current = {
          ...trackerRef.current,
          distanceKm: trackerRef.current.distanceKm + m / 1000,
        };
        setGpsDistance(trackerRef.current.distanceKm);
        setRoute((r) => [...r]);
      }
    }
  }

  /** Abre a tela de preparação (confirmação antes de começar). */
  function startGps() {
    if (!navigator.geolocation) {
      setError("Este dispositivo não disponibilizou GPS.");
      return;
    }
    setError("");
    setReady(true);
    setCountdown(null);
  }
  function requestDeviceExtras() {
    // iOS exige permissão explícita (dada por este toque) para o sensor de movimento.
    const DME = (
      window as unknown as {
        DeviceMotionEvent?: { requestPermission?: () => Promise<string> };
      }
    ).DeviceMotionEvent;
    if (DME?.requestPermission) void DME.requestPermission().catch(() => undefined);
    // Tela cheia de verdade onde o navegador permite (Android / computador).
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => void;
    };
    try {
      if (!document.fullscreenElement) {
        if (el.requestFullscreen)
          void el.requestFullscreen({ navigationUI: "hide" }).catch(() => undefined);
        else el.webkitRequestFullscreen?.();
      }
    } catch {
      /* sem suporte */
    }
  }
  /** Toque em "Iniciar": contagem 3-2-1 enquanto o GPS já procura o sinal. */
  function confirmStart() {
    requestDeviceExtras();
    beginWatch();
    setCountdown(3);
  }
  useEffect(() => {
    if (countdown === null) return;
    const t = window.setTimeout(
      () => {
        if (countdown > 0) setCountdown(countdown - 1);
        else {
          setCountdown(null);
          setReady(false);
          beginTracking();
        }
      },
      countdown > 0 ? 1000 : 600,
    );
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);
  function beginTracking(restore?: SavedSession) {
    setRoute(restore?.route ?? []);
    setElapsed(restore?.elapsed ?? 0);
    setGpsDistance(restore?.distanceKm ?? 0);
    setAutoPaused(false);
    setMetrics(null);
    setSummary(null);
    setLocked(false);
    setStillPrompt(null);
    setGpsLost(false);
    autoPausesRef.current = restore?.autoPauses ?? 0;
    setStartedAt(restore?.startedAt ?? new Date().toISOString());
    trackerRef.current = { ...initialTracker(), distanceKm: restore?.distanceKm ?? 0 };
    motionAtRef.current = Date.now();
    startedRef.current = Date.now() - (restore?.elapsed ?? 0) * 1000;
    pauseAtRef.current = 0;
    haltedSinceRef.current = 0;
    lastFixAtRef.current = Date.now();
    setTracking(true);
    setPaused(false);
  }
  function beginWatch() {
    setGpsState("searching");
    trackerRef.current = { ...trackerRef.current, anchor: null };
    const cfg = trackerConfig(typeRef.current);
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const c = position.coords;
        setGpsState("ok");
        lastFixAtRef.current = Date.now();
        setGpsLost(false);
        if (pausedRef.current) return;
        const { state, accepted } = ingest(
          trackerRef.current,
          {
            latitude: c.latitude,
            longitude: c.longitude,
            accuracy: c.accuracy,
            speed: c.speed,
            t: position.timestamp,
          },
          cfg,
        );
        trackerRef.current = state;
        if (!accepted) return;
        setGpsDistance(state.distanceKm);
        if (state.moving && autoPausedRef.current) setAutoPaused(false);
        setRoute((current) => [
          ...current,
          {
            latitude: c.latitude,
            longitude: c.longitude,
            accuracy: c.accuracy,
            speed: state.moving ? c.speed : 0,
            t: position.timestamp,
          },
        ]);
      },
      (err) => {
        if (err.code === 1) {
          setGpsState("denied");
          setError("Permita o acesso à localização para registrar o percurso.");
        } else {
          setGpsLost(true);
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  }
  function resumeRecovered() {
    if (!recovered) return;
    setType(recovered.type as typeof type);
    typeRef.current = recovered.type as typeof type;
    requestDeviceExtras();
    beginTracking(recovered);
    beginWatch();
    setRecovered(null);
  }
  async function stopGps(reason?: string) {
    if (
      !reason &&
      !(await confirm(
        "Encerrar o treino?",
        `${routeDistance.toFixed(2)} km em ${Math.max(1, Math.round(elapsed / 60))} min. Você poderá revisar e salvar no prontuário em seguida.`,
        true,
        "Encerrar treino",
      ))
    )
      return;
    if (reason) setNotice(reason);
    setStillPrompt(null);
    setLocked(false);
    clearSession();
    try {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    } catch {
      /* ignore */
    }
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    const minutes = Math.max(1, Math.round(elapsed / 60));
    const pace = formatPace(routeDistance, elapsed);
    // Se houver sessão de batimentos no mesmo período, usa para estimar o esforço e o gasto.
    let avgBpm: number | undefined;
    let maxBpm: number | undefined;
    try {
      const from = new Date(
        Date.parse(startedAt ?? new Date().toISOString()) - 10 * 60000,
      ).toISOString();
      const { data } = await (supabase as any)
        .from("care_heart_rate_sessions")
        .select("avg_bpm,max_bpm,started_at")
        .eq("patient_id", patientId)
        .gte("started_at", from)
        .order("started_at", { ascending: false })
        .limit(1);
      const hr = data?.[0];
      if (hr?.avg_bpm) {
        avgBpm = Number(hr.avg_bpm);
        maxBpm = Number(hr.max_bpm) || undefined;
      }
    } catch {
      /* sem batimentos: segue só com tempo e percurso */
    }
    const built = buildMetrics({
      type,
      route,
      distanceKm: routeDistance,
      movingSeconds: elapsed,
      totalSeconds: startedAt
        ? Math.max(elapsed, (Date.now() - Date.parse(startedAt)) / 1000)
        : elapsed,
      autoPauses: autoPausesRef.current,
      avgBpm,
      maxBpm,
    });
    setMetrics(built);
    setIntensity(built.effort);
    setSummary({
      duration: minutes,
      distance: routeDistance,
      pace: pace === "—" ? pace : `${pace} min/km`,
      points: route.length,
    });
    setTracking(false);
    setPaused(false);
    setAutoPaused(false);
    setDistance(routeDistance.toFixed(2));
    setDuration(String(Math.max(1, Math.round(elapsed / 60))));
    const points = route.slice(-30);
    if (points.length >= 2) {
      const origin = points[0];
      const destination = points.at(-1)!;
      const waypoints = points
        .slice(1, -1)
        .filter((_, i) => i % 4 === 0)
        .map((p) => `${p.latitude},${p.longitude}`)
        .join("|");
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}${waypoints ? `&waypoints=${waypoints}` : ""}`;
      setNotes(`Percurso GPS: ${url}`);
    }
  }

  async function removeItem(item: ActivityEntry) {
    if (!(await ensureUnlocked(item.happened_at, prompt, notify))) return;
    const title = item.details?.title ?? "atividade";
    if (
      !(await confirm(
        "Excluir este registro?",
        `A ${title.toLowerCase()} de ${formatDate(item.happened_at)} será apagada do seu prontuário. Isso não pode ser desfeito.`,
        true,
        "Excluir",
      ))
    )
      return;
    setDeleting(item.id);
    setError("");
    try {
      const { error: err } = await (supabase as any).rpc("care_delete_client_activity", {
        p_patient_id: patientId,
        p_id: item.id,
      });
      if (err) throw err;
      setItems((cur) => cur.filter((x) => x.id !== item.id));
      setNotice("Registro excluído.");
      onRecorded();
    } catch {
      setError("Não foi possível excluir agora. Tente novamente.");
    } finally {
      setDeleting(null);
    }
  }

  async function save() {
    const minutes = Number(duration);
    const km = distance.trim() === "" ? null : Number(distance.replace(",", "."));
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
      setError("Informe uma duração entre 1 e 1.440 minutos.");
      return;
    }
    if (km !== null && (!Number.isFinite(km) || km < 0 || km > 500)) {
      setError("Informe uma distância válida entre 0 e 500 km.");
      return;
    }
    if (notes.trim().length > 500) {
      setError("As observações podem ter até 500 caracteres.");
      return;
    }
    if (
      !(await confirm(
        "Confirmar registro?",
        `Registrar ${type} de ${minutes} min${km !== null ? ` (${km.toLocaleString("pt-BR")} km)` : ""} agora?`,
        false,
        "Confirmar registro",
      ))
    )
      return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await (supabase as any).rpc("care_log_client_activity_v2", {
        p_patient_id: patientId,
        p_activity_type: type,
        p_duration_minutes: minutes,
        p_distance_km: km,
        p_intensity: intensity,
        p_notes: notes.trim(),
        p_metrics: metrics ?? {},
        p_started_at: metrics ? startedAt : null,
      });
      if (result.error) throw result.error;
      setNotice("Atividade registrada no seu prontuário.");
      setDuration("30");
      setDistance("");
      setIntensity("moderada");
      setNotes("");
      setMetrics(null);
      setSummary(null);
      onRecorded();
    } catch {
      setError("Não foi possível registrar. Confira sua conexão e o acesso ao prontuário.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pb-2"
      aria-label="Atividade física"
    >
      {(ready || countdown !== null) && !tracking && (
        <WorkoutShell label="Preparar treino">
          <WorkoutReady
            type={type}
            onType={(t) => setType(t as typeof type)}
            onStart={confirmStart}
            onCancel={cancelReady}
            countdown={countdown}
          />
        </WorkoutShell>
      )}
      {tracking && (
        <WorkoutShell label="Treino em andamento" moving={liveStatus === "moving"}>
          <WorkoutLive
            type={type}
            status={liveStatus}
            elapsed={elapsed}
            distanceKm={routeDistance}
            route={route}
            gpsLost={gpsLost}
            locked={locked}
            onLock={setLocked}
            onTogglePause={() => setPaused((v) => !v)}
            onStop={() => void stopGps()}
            stillPrompt={stillPrompt}
            gapPrompt={gapPrompt}
            onGap={answerGap}
            onStillHere={() => {
              setStillPrompt(null);
              haltedSinceRef.current = Date.now();
            }}
            onFinishNow={() => finishRef.current("Treino encerrado.")}
            maxMinutes={MAX_MINUTES}
          />
        </WorkoutShell>
      )}
      {summary && !tracking && (
        <WorkoutShell label="Resumo do treino">
          <div className="nvw-in mx-auto w-full max-w-lg px-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[.22em] text-emerald-200">
                Treino concluído
              </p>
              <button
                type="button"
                onClick={() => setSummary(null)}
                aria-label="Fechar resumo"
                className="grid size-10 place-items-center rounded-full bg-white/10 ring-1 ring-white/15"
              >
                <X size={18} />
              </button>
            </div>
            <h2 className="mt-2 font-display text-3xl font-extrabold">
              {activityOptions.find((o) => o.value === type)?.label ?? "Atividade"} ·{" "}
              {summary.distance.toFixed(2)} km
            </h2>
            <dl className="mt-4 grid grid-cols-3 divide-x divide-white/10 rounded-3xl bg-white/[.07] py-3 ring-1 ring-white/10 backdrop-blur-md">
              {[
                ["Tempo", `${summary.duration} min`],
                ["Distância", `${summary.distance.toFixed(2)} km`],
                ["Ritmo", summary.pace.replace(" min/km", "")],
              ].map(([k, v]) => (
                <div key={k} className="px-2 text-center">
                  <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-white/55">
                    {k}
                  </dt>
                  <dd className="mt-0.5 text-xl font-extrabold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            {metrics && (
              <div className="mt-3 grid gap-3">
                {metrics.route.length > 1 && (
                  <RouteMini route={metrics.route} className="w-full rounded-2xl" />
                )}
                <dl className="grid grid-cols-2 gap-2">
                  {metricRows(metrics).map(([k, v]) => (
                    <div key={k} className="rounded-2xl bg-black/30 px-3 py-2 ring-1 ring-white/10">
                      <dt className="text-[11px] text-white/60">{k}</dt>
                      <dd className="text-sm font-bold tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            <p className="mt-3 text-center text-[11px] text-white/55">
              Gasto, passos e esforço são estimativas pelo tempo e percurso
              {metrics?.avg_bpm ? " e batimentos" : ""}.
            </p>
            {notice && (
              <p className="mt-2 text-center text-xs font-semibold text-amber-200">{notice}</p>
            )}
            <div className="mt-4 grid gap-2 pb-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="h-13 min-h-12 rounded-2xl bg-emerald-400 text-base font-extrabold text-emerald-950 shadow-[0_12px_40px_-10px_rgba(52,211,153,.8)] disabled:opacity-50"
              >
                {saving ? "Salvando…" : "Salvar no prontuário"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSummary(null)}
                  className="h-11 rounded-2xl bg-white/10 text-sm font-semibold ring-1 ring-white/15"
                >
                  Editar antes
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      await confirm(
                        "Descartar este treino?",
                        "Os dados capturados não serão salvos.",
                        true,
                        "Descartar",
                      )
                    ) {
                      setSummary(null);
                      setMetrics(null);
                      setNotes("");
                      setDistance("");
                    }
                  }}
                  className="h-11 rounded-2xl bg-white/10 text-sm font-semibold text-rose-200 ring-1 ring-white/15"
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        </WorkoutShell>
      )}
      {recovered && !tracking && !ready && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm">
          <p className="min-w-0 flex-1">
            <strong>Treino interrompido.</strong> Você tinha uma{" "}
            {activityOptions.find((o) => o.value === recovered.type)?.label.toLowerCase() ??
              "atividade"}{" "}
            em andamento ({recovered.distanceKm.toFixed(2)} km ·{" "}
            {Math.round(recovered.elapsed / 60)} min).
          </p>
          <button
            type="button"
            onClick={resumeRecovered}
            className="h-9 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground"
          >
            Retomar
          </button>
          <button
            type="button"
            onClick={() => {
              clearSession();
              setRecovered(null);
            }}
            className="h-9 rounded-lg border border-border px-3 text-xs font-semibold"
          >
            Descartar
          </button>
        </div>
      )}
      <ActivityHero
        items={items}
        onStartGps={startGps}
        gpsLabel={type === "corrida" ? "Iniciar corrida com GPS" : "Iniciar caminhada com GPS"}
      />

      <div className="grid shrink-0 gap-3 lg:grid-cols-[minmax(300px,.85fr)_minmax(0,1.15fr)]">
        <section
          id="nv-activity-form"
          data-register-target="Registrar atividade"
          className="scroll-mt-4 rounded-2xl border border-border bg-card p-3 sm:p-4"
        >
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Plus size={18} />
            </span>
            <div>
              <h3 className="text-sm font-bold">Registrar atividade</h3>
              <p className="text-[11px] text-muted-foreground">
                O horário real é salvo automaticamente.
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center gap-2">
              <MapPin size={17} className="text-primary" />
              <div>
                <p className="text-xs font-bold">Caminhada e corrida com GPS</p>
                <p className="text-[11px] text-muted-foreground">
                  Tempo {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} ·{" "}
                  {routeDistance.toFixed(2)} km
                </p>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              {!tracking ? (
                <button
                  type="button"
                  onClick={startGps}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                >
                  <Play size={14} /> Começar
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setPaused((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold"
                  >
                    {paused ? <Play size={14} /> : <Pause size={14} />}{" "}
                    {paused ? "Retomar" : "Pausar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void stopGps()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-2 text-xs font-bold text-white"
                  >
                    <Square size={14} /> Parar
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {activityOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  aria-pressed={type === option.value}
                  className={`flex min-h-10 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-semibold transition ${type === option.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                >
                  <Icon size={15} />
                  {option.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold">
              Duração (min)
              <input
                type="number"
                min="1"
                max="1440"
                step="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="field mt-1 w-full"
              />
            </label>
            <label className="text-xs font-semibold">
              Distância (km)
              <input
                type="text"
                inputMode="decimal"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="Opcional"
                className="field mt-1 w-full"
              />
            </label>
            <label className="col-span-2 text-xs font-semibold">
              Intensidade
              <NiceSelect
                className="mt-1"
                ariaLabel="Intensidade"
                value={intensity}
                onChange={setIntensity}
                options={[
                  { value: "leve", label: "Leve" },
                  { value: "moderada", label: "Moderada" },
                  { value: "intensa", label: "Intensa" },
                ]}
              />
            </label>
            <label className="col-span-2 text-xs font-semibold">
              Observações
              <textarea
                rows={2}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Percurso, sensação ou detalhes (opcional)"
                className="field mt-1 w-full resize-y"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Salvar atividade"}
          </button>
          {error && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="mt-2 text-xs text-emerald-600">
              {notice}
            </p>
          )}
        </section>

        <div className="flex min-h-0 min-w-0 flex-col gap-3">
          <ActivityDaysChart items={items} />
          <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-card p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold">Histórico de atividades</h3>
                <p className="text-[11px] text-muted-foreground">
                  Registros reais dos últimos 90 dias
                </p>
              </div>
              <label className="flex items-center gap-1.5 text-xs">
                <Search size={14} />
                <NiceSelect
                  className="h-9 min-w-[9rem]"
                  ariaLabel="Filtrar atividades"
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: "todos", label: "Todas" },
                    ...activityOptions.map((option) => ({
                      value: option.value,
                      label: option.label,
                    })),
                  ]}
                />
              </label>
            </div>
            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {loading ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Carregando atividades…
                </p>
              ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <Activity className="mx-auto text-muted-foreground" size={22} />
                  <p className="mt-2 text-xs font-semibold">
                    Nenhuma atividade registrada neste filtro.
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Seus registros aparecerão aqui depois de salvar uma atividade.
                  </p>
                </div>
              ) : (
                filtered.map((item) => {
                  const detail = item.details ?? {};
                  const option = activityOptions.find(
                    (entry) => entry.value === detail.activity_type,
                  );
                  const Icon = option?.icon ?? Activity;
                  return (
                    <article
                      key={item.id}
                      className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/20 p-3"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Icon size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <strong className="text-xs">
                            {detail.title ?? option?.label ?? "Atividade"}
                          </strong>
                          <span className="flex items-center gap-1.5">
                            <time className="text-[11px] text-muted-foreground">
                              {formatDate(item.happened_at)}
                            </time>
                            <RecordInfo
                              title={detail.title ?? option?.label ?? "Atividade"}
                              at={item.happened_at}
                              category="Atividade física"
                              color="#0d9488"
                              rows={[
                                {
                                  label: "Atividade",
                                  value: option?.label ?? detail.activity_type ?? "Atividade",
                                },
                                {
                                  label: "Duração",
                                  value: `${detail.duration_minutes ?? "—"} min`,
                                },
                                ...(detail.distance_km != null
                                  ? [
                                      {
                                        label: "Distância",
                                        value: `${Number(detail.distance_km).toLocaleString("pt-BR")} km`,
                                      },
                                    ]
                                  : []),
                                ...(detail.distance_km && detail.duration_minutes
                                  ? [
                                      {
                                        label: "Ritmo médio",
                                        value: `${(Number(detail.duration_minutes) / Number(detail.distance_km)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} min/km`,
                                      },
                                    ]
                                  : []),
                                {
                                  label: "Intensidade",
                                  value: detail.intensity ?? "não informada",
                                },
                              ]}
                              description={detail.notes}
                            />
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          <Clock3 className="mr-1 inline" size={12} />
                          {detail.duration_minutes ?? "—"} min
                          {detail.distance_km != null
                            ? ` · ${Number(detail.distance_km).toLocaleString("pt-BR")} km`
                            : ""}{" "}
                          · Intensidade {detail.intensity ?? "não informada"}
                        </p>
                        {detail.metrics && Object.keys(detail.metrics).length > 0 && (
                          <div className="mt-2 flex items-start gap-3">
                            <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
                              {metricRows(detail.metrics).map(([k, v]) => (
                                <div key={k} className="min-w-0">
                                  <dt className="truncate text-[10.5px] text-muted-foreground">
                                    {k}
                                  </dt>
                                  <dd className="truncate text-xs font-bold tabular-nums">{v}</dd>
                                </div>
                              ))}
                            </dl>
                            {detail.metrics.route && detail.metrics.route.length > 1 && (
                              <RouteMini
                                route={detail.metrics.route}
                                className="hidden w-28 shrink-0 sm:block"
                              />
                            )}
                          </div>
                        )}
                        {detail.notes && !detail.notes.startsWith("Percurso GPS:") && (
                          <p className="mt-1 text-xs">{detail.notes}</p>
                        )}
                        {detail.notes?.startsWith("Percurso GPS:") && (
                          <a
                            href={detail.notes.replace("Percurso GPS: ", "")}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-block text-[11px] font-semibold text-primary underline"
                          >
                            Abrir percurso no Google Maps
                          </a>
                        )}
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            disabled={deleting === item.id}
                            onClick={() => void removeItem(item)}
                            aria-label={`Excluir registro de ${detail.title ?? "atividade"}`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-[11px] font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                          >
                            <Trash2 size={13} /> {deleting === item.id ? "Excluindo…" : "Excluir"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
