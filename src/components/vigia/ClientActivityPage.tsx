import { LiveWorkoutVisual, type LivePoint } from "./LiveWorkoutVisual";
import { NiceSelect } from "./NiceSelect";
import { ActivityDaysChart, ActivityHero } from "./ActivityHero";
import { RecordInfo } from "./RecordInfo";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";

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
  const { confirm } = useDialog();

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
  const routeDistance = useMemo(
    () =>
      route.slice(1).reduce((sum, point, index) => sum + distanceBetween(route[index], point), 0),
    [route],
  );
  function distanceBetween(a: GpsPoint, b: GpsPoint) {
    const r = 6371;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a.latitude * Math.PI) / 180) *
        Math.cos((b.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }
  useEffect(() => {
    if (!tracking || paused) return;
    const timer = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - startedRef.current) / 1000)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [tracking, paused]);
  useEffect(
    () => () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    },
    [],
  );
  function startGps() {
    if (!navigator.geolocation) {
      setError("Este dispositivo não disponibilizou GPS.");
      return;
    }
    setError("");
    setRoute([]);
    setElapsed(0);
    startedRef.current = Date.now();
    setTracking(true);
    setPaused(false);
    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        // Ignora leituras imprecisas e não soma distância enquanto estiver pausado.
        const c = position.coords;
        if (pausedRef.current || (c.accuracy && c.accuracy > 40)) return;
        setRoute((current) => [
          ...current,
          { latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy, speed: c.speed, t: position.timestamp },
        ]);
      },
      () => setError("Permita o acesso à localização para registrar o percurso."),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );
  }
  async function stopGps() {
    if (
      !(await confirm(
        "Encerrar atividade?",
        "O tempo, a distância e o percurso capturados serão preparados para registro.",
        false,
      ))
    )
      return;
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    const minutes = Math.max(1, Math.round(elapsed / 60));
    const pace =
      routeDistance > 0
        ? `${Math.floor(minutes / routeDistance)}:${String(Math.round(((minutes / routeDistance) % 1) * 60)).padStart(2, "0")} min/km`
        : "—";
    setSummary({ duration: minutes, distance: routeDistance, pace, points: route.length });
    setTracking(false);
    setPaused(false);
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
    if (!(await confirm("Confirmar registro?", `Registrar ${type} de ${minutes} min${km !== null ? ` (${km.toLocaleString("pt-BR")} km)` : ""} agora?`, false, "Confirmar registro"))) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await (supabase as any).rpc("care_log_client_activity", {
        p_patient_id: patientId,
        p_activity_type: type,
        p_duration_minutes: minutes,
        p_distance_km: km,
        p_intensity: intensity,
        p_notes: notes.trim(),
      });
      if (result.error) throw result.error;
      setNotice("Atividade registrada no seu prontuário.");
      setDuration("30");
      setDistance("");
      setIntensity("moderada");
      setNotes("");
      onRecorded();
    } catch {
      setError("Não foi possível registrar. Confira sua conexão e o acesso ao prontuário.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pb-2" aria-label="Atividade física">
      {(tracking || summary) && (
        <div
          className="fixed inset-0 z-[180] grid place-items-center bg-[#071a1d]/95 p-5 text-white backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label={summary ? "Resumo da atividade" : "Atividade em andamento"}
        >
          <div className="w-full max-w-3xl rounded-[28px] border border-white/15 bg-white/10 p-5 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-200">
                  NextVita · movimento e evolução
                </p>
                <h2 className="mt-1 text-2xl font-extrabold sm:text-4xl">
                  {summary
                    ? "Resumo da atividade"
                    : type === "corrida"
                      ? "Corrida em andamento"
                      : "Caminhada em andamento"}
                </h2>
              </div>
              {!summary && (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-200">
                  <span className="size-2 animate-pulse rounded-full bg-emerald-300" />
                  GPS ativo
                </span>
              )}
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                [
                  "Tempo",
                  summary
                    ? `${summary.duration} min`
                    : `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`,
                ],
                ["Distância", `${(summary?.distance ?? routeDistance).toFixed(2)} km`],
                [
                  "Ritmo médio",
                  summary?.pace ??
                    (routeDistance > 0
                      ? `${Math.floor(elapsed / 60 / routeDistance)} min/km`
                      : "—"),
                ],
                ["Pontos GPS", String(summary?.points ?? route.length)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-black/20 p-4">
                  <span className="text-xs text-white/60">{label}</span>
                  <strong className="mt-1 block text-2xl font-extrabold tabular-nums sm:text-3xl">
                    {value}
                  </strong>
                </div>
              ))}
            </div>
            {!summary && (
              <LiveWorkoutVisual
                route={route}
                elapsed={elapsed}
                paused={paused}
                type={type}
                distanceKm={routeDistance}
              />
            )}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {summary ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSummary(null)}
                    className="rounded-xl bg-primary px-6 py-3 text-sm font-bold"
                  >
                    Voltar ao registro
                  </button>
                  {notes.startsWith("Percurso GPS:") && (
                    <a
                      href={notes.replace("Percurso GPS: ", "")}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-white/20 px-6 py-3 text-sm font-bold"
                    >
                      Abrir percurso no Google Maps
                    </a>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      // O tempo pausado não conta: ao retomar, o início é deslocado.
                      if (paused) startedRef.current += Date.now() - pauseAtRef.current;
                      else pauseAtRef.current = Date.now();
                      setPaused((value) => !value);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-bold"
                  >
                    {paused ? <Play size={17} /> : <Pause size={17} />}{" "}
                    {paused ? "Retomar" : "Pausar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void stopGps()}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-6 py-3 text-sm font-bold"
                  >
                    <Square size={17} /> Parar atividade
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <ActivityHero items={items} onStartGps={startGps} gpsLabel={type === "corrida" ? "Iniciar corrida com GPS" : "Iniciar caminhada com GPS"} />
      {items.length > 0 && <ActivityDaysChart items={items} />}

      <div className="grid min-h-[26rem] shrink-0 flex-1 gap-3 lg:grid-cols-[minmax(280px,.8fr)_minmax(0,1.2fr)]">
        <section id="nv-activity-form" data-register-target="Registrar atividade" className="scroll-mt-4 rounded-2xl border border-border bg-card p-3 sm:p-4">
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

        <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-card p-3 sm:p-4">
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
                options={[{ value: "todos", label: "Todas" }, ...activityOptions.map((option) => ({ value: option.value, label: option.label }))]}
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
                              { label: "Atividade", value: option?.label ?? detail.activity_type ?? "Atividade" },
                              { label: "Duração", value: `${detail.duration_minutes ?? "—"} min` },
                              ...(detail.distance_km != null ? [{ label: "Distância", value: `${Number(detail.distance_km).toLocaleString("pt-BR")} km` }] : []),
                              ...(detail.distance_km && detail.duration_minutes ? [{ label: "Ritmo médio", value: `${(Number(detail.duration_minutes) / Number(detail.distance_km)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} min/km` }] : []),
                              { label: "Intensidade", value: detail.intensity ?? "não informada" },
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
                      {detail.notes && <p className="mt-1 text-xs">{detail.notes}</p>}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
