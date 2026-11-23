import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Battery,
  Bluetooth,
  BluetoothOff,
  HeartPulse,
  Info,
  Loader2,
  Play,
  Save,
  Square,
  Timer,
  Trash2,
  Watch,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import {
  bluetoothSupport,
  HeartRateLink,
  heartZones,
  startSimulation,
  zoneOf,
  type HrSample,
} from "@/lib/heart-rate";
import { EvoChart } from "./EvoChart";
import { EcgTrace } from "./EcgTrace";

type Session = {
  id: string;
  device_name: string | null;
  started_at: string;
  ended_at: string;
  avg_bpm: number;
  min_bpm: number;
  max_bpm: number;
};
type LinkState =
  "parado" | "conectando" | "conectado" | "reconectando" | "desconectado" | "simulando";
const fmtClock = (s: number) =>
  `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Rio_Branco",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export function ClientHeartRate({
  patientId,
  ownerId,
  ageYears,
}: {
  patientId: string;
  ownerId: string;
  ageYears?: number | null;
}) {
  const { confirm, notify } = useDialog();
  const { max, zones } = useMemo(() => heartZones(ageYears), [ageYears]);
  const [state, setState] = useState<LinkState>("parado");
  const [detail, setDetail] = useState("");
  const [samples, setSamples] = useState<HrSample[]>([]);
  const [contact, setContact] = useState<boolean | null>(null);
  const [device, setDevice] = useState<{ name: string; battery: number | null } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [history, setHistory] = useState<Session[]>([]);
  const [saving, setSaving] = useState(false);
  const linkRef = useRef<HeartRateLink | null>(null);
  const simRef = useRef<(() => void) | null>(null);
  const support = useMemo(() => bluetoothSupport(), []);

  const loadHistory = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("care_heart_rate_sessions")
      .select("id,device_name,started_at,ended_at,avg_bpm,min_bpm,max_bpm")
      .eq("patient_id", patientId)
      .order("started_at", { ascending: false })
      .limit(12);
    setHistory(data ?? []);
  }, [patientId]);
  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  useEffect(
    () => () => {
      void linkRef.current?.disconnect();
      simRef.current?.();
    },
    [],
  );

  const onSample = useCallback((s: HrSample & { contact: boolean | null }) => {
    setContact(s.contact);
    setSamples((prev) => (prev.length >= 7200 ? [...prev.slice(-7199), s] : [...prev, s]));
  }, []);

  async function connect() {
    setDetail("");
    simRef.current?.();
    simRef.current = null;
    const link = new HeartRateLink(onSample, (st, d) => {
      setState(st);
      if (d) setDetail(d);
      if (st === "conectado") setDevice({ name: link.name, battery: link.battery });
    });
    linkRef.current = link;
    try {
      await link.connect();
      setSamples([]);
    } catch (e) {
      const msg = String((e as Error)?.name ?? "");
      setState("parado");
      setDetail(
        msg === "NotFoundError"
          ? "Nenhum aparelho escolhido. Ative a transmissão de frequência no relógio e tente de novo."
          : "Não foi possível conectar. Confira se o Bluetooth está ligado e o relógio está transmitindo a frequência.",
      );
    }
  }
  async function stop() {
    await linkRef.current?.disconnect();
    linkRef.current = null;
    simRef.current?.();
    simRef.current = null;
    setState("parado");
  }
  function simulate() {
    void linkRef.current?.disconnect();
    linkRef.current = null;
    setSamples([]);
    setDevice({ name: "Simulação", battery: null });
    setState("simulando");
    simRef.current = startSimulation(onSample);
  }

  const active = state === "conectado" || state === "simulando" || state === "reconectando";
  const bpm = samples.at(-1)?.bpm ?? 0;
  const zone = zoneOf(bpm || 60, zones);
  const stats = useMemo(() => {
    if (!samples.length) return null;
    const v = samples.map((s) => s.bpm);
    const inZone: Record<string, number> = {};
    samples.forEach((s) => {
      const k = zoneOf(s.bpm, zones).key;
      inZone[k] = (inZone[k] ?? 0) + 1;
    });
    return {
      avg: Math.round(v.reduce((a, b) => a + b, 0) / v.length),
      min: Math.min(...v),
      max: Math.max(...v),
      secs: Math.round((samples.at(-1)!.t - samples[0].t) / 1000),
      inZone,
    };
  }, [samples, zones]);
  const chart = useMemo(() => {
    const t0 = samples[0]?.t ?? now;
    const recent = samples.filter((s) => s.t >= now - 5 * 60_000);
    return { t0, points: recent.map((s) => ({ x: (s.t - t0) / 1000, y: s.bpm })) };
  }, [samples, now]);

  async function save() {
    if (!stats || samples.length < 20) return;
    if (state === "simulando") {
      setDetail("Sessões simuladas não são salvas. Conecte um relógio ou cinta para registrar.");
      return;
    }
    setSaving(true);
    // Guarda só os pontos que importam: início, menor, maior e fim (sem milhares de leituras no prontuário).
    const t0 = samples[0].t;
    const lowest = samples.reduce((m, x) => (x.bpm < m.bpm ? x : m), samples[0]);
    const highest = samples.reduce((m, x) => (x.bpm > m.bpm ? x : m), samples[0]);
    const key = [samples[0], lowest, highest, samples.at(-1)!]
      .filter((x, i, arr) => arr.findIndex((y) => y.t === x.t) === i)
      .sort((x, y) => x.t - y.t)
      .map((x) => [Math.round((x.t - t0) / 1000), x.bpm]);
    // Esforço físico: tempo em zona aeróbica ou acima (a partir de 70% da frequência máxima).
    const effortSamples = samples.filter((x) => zoneOf(x.bpm, zones).from >= zones[3].from).length;
    const effortMin = Math.round(effortSamples / 60);
    const effort = effortMin >= 10 && effortSamples / samples.length >= 0.25;
    const startIso = new Date(t0).toISOString();
    const endIso = new Date(samples.at(-1)!.t).toISOString();
    let linked = false;
    try {
      const { data: acts } = await (supabase as any)
        .from("care_activity_log")
        .select("id")
        .eq("patient_id", patientId)
        .eq("category", "atividade")
        .in("event_type", ["confirmed", "logged"])
        .gte("recorded_at", new Date(t0 - 60 * 60_000).toISOString())
        .lte("recorded_at", new Date(samples.at(-1)!.t + 60 * 60_000).toISOString())
        .limit(1);
      linked = Boolean(acts?.length);
    } catch {
      /* sem vínculo */
    }
    const { error } = await (supabase as any).from("care_heart_rate_sessions").insert({
      patient_id: patientId,
      owner_id: ownerId,
      device_name: device?.name ?? null,
      started_at: startIso,
      ended_at: endIso,
      avg_bpm: stats.avg,
      min_bpm: stats.min,
      max_bpm: stats.max,
      samples: key,
      zones: stats.inZone,
    });
    setSaving(false);
    setDetail(
      error
        ? "Não foi possível salvar a sessão."
        : `Sessão salva: pico ${stats.max} bpm e mínima ${stats.min} bpm.`,
    );
    if (error) return;
    void loadHistory();
    // Sincroniza com a atividade física: esforço detectado e nenhum treino registrado no período.
    if (effort && !linked) {
      const ok = await confirm(
        "Registrar como atividade física?",
        `Seu coração ficou ${effortMin} min em zona de esforço (pico ${stats.max} bpm). Quer registrar esse período como atividade para somar às suas metas?`,
        false,
        "Registrar atividade",
      );
      if (ok) {
        const share = effortSamples / samples.length;
        const { error: actErr } = await (supabase as any).rpc("care_log_client_activity", {
          p_patient_id: patientId,
          p_activity_type: "outro",
          p_duration_minutes: Math.max(1, Math.min(1440, Math.round(samples.length / 60))),
          p_distance_km: null,
          p_intensity: share > 0.6 ? "intensa" : "moderada",
          p_notes: `Detectado pelo monitor cardíaco: pico ${stats.max} bpm.`,
        });
        notify?.(
          actErr
            ? "Não foi possível registrar a atividade."
            : "Atividade registrada a partir do monitor.",
          actErr ? "danger" : "success",
        );
      }
    } else if (effort && linked) {
      notify?.("Sessão ligada ao treino registrado neste horário.", "info");
    }
  }
  async function remove(s: Session) {
    if (
      !(await confirm(
        "Apagar esta sessão?",
        `${fmtDate(s.started_at)} · média ${s.avg_bpm} bpm. Não dá para desfazer.`,
        true,
        "Apagar",
      ))
    )
      return;
    await (supabase as any).from("care_heart_rate_sessions").delete().eq("id", s.id);
    void loadHistory();
  }

  const beat = bpm ? 60 / bpm : 1;
  const pct = bpm ? Math.min(100, Math.round((bpm / max) * 100)) : 0;

  const [tab, setTab] = useState<"sessoes" | "conectar">("sessoes");
  const [hoverZone, setHoverZone] = useState<string | null>(null);
  const span = Math.max(1, (zones.at(-1)?.to ?? max) > 250 ? max : (zones.at(-1)?.to ?? max));
  const markPct = bpm ? Math.min(100, Math.max(0, (bpm / span) * 100)) : 0;
  const btn =
    "inline-flex h-9 items-center justify-center gap-2 px-3.5 text-[13px] font-bold transition active:scale-[.97] disabled:opacity-45";

  return (
    <div className="grid gap-3">
      <section
        aria-label="Frequência cardíaca ao vivo"
        className="nv-dark relative isolate overflow-hidden border border-white/10 bg-[#070b12] p-3.5 text-white shadow-pop sm:p-4"
        style={{ "--hr": zone.color, "--beat": `${beat}s` } as CSSProperties}
      >
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-60 transition-[background] duration-700"
          style={{
            background: `radial-gradient(60% 100% at 10% 20%, color-mix(in srgb, ${active ? zone.color : "#334155"} 26%, transparent), transparent 70%)`,
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-[.06] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:20px_20px]"
        />
        <i
          aria-hidden
          className="absolute inset-x-0 top-0 h-[2px] transition-colors duration-700"
          style={{ background: `linear-gradient(90deg, ${zone.color}, transparent 70%)` }}
        />

        <div className="grid items-center gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto]">
          <div className="relative mx-auto grid size-28 place-items-center">
            {active && bpm > 0 && (
              <span
                className="nv-hr-ring absolute inset-0 rounded-full border"
                style={{ borderColor: zone.color }}
              />
            )}
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(255,255,255,.08)"
                strokeWidth="4"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={zone.color}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * 282.7} 282.7`}
                className="transition-[stroke-dasharray,stroke] duration-700"
              />
            </svg>
            <div className="grid justify-items-center">
              <HeartPulse
                size={18}
                className={active && bpm ? "nv-hr-heart" : "opacity-40"}
                style={{ color: zone.color }}
                aria-hidden
              />
              <p
                className="font-display text-4xl font-extrabold tabular-nums leading-none"
                aria-live="polite"
                aria-atomic="true"
              >
                {bpm || "--"}
              </p>
              <p className="text-[10px] font-semibold text-white/55">bpm</p>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 font-bold"
                style={{
                  background: `color-mix(in srgb, ${zone.color} 22%, transparent)`,
                  color: zone.color,
                }}
              >
                <span className="size-1.5" style={{ background: zone.color }} />
                {active && bpm ? zone.label : "Sem leitura"}
              </span>
              {state === "simulando" && (
                <span className="bg-amber-400/20 px-2 py-0.5 font-bold text-amber-300">
                  Simulação
                </span>
              )}
              {state === "reconectando" && (
                <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5">
                  <Loader2 size={11} className="animate-spin" /> Reconectando…
                </span>
              )}
              {contact === false && active && (
                <span className="bg-rose-500/20 px-2 py-0.5 font-semibold text-rose-300">
                  Sem contato com a pele
                </span>
              )}
              {device && active && (
                <span className="inline-flex items-center gap-1.5 text-white/65">
                  <Watch size={12} /> {device.name}
                  {device.battery != null && (
                    <>
                      <Battery size={12} className="ml-1" /> {device.battery}%
                    </>
                  )}
                </span>
              )}
            </div>
            <EcgTrace bpm={bpm} color={zone.color} running={active && bpm > 0} />
            {(detail || support !== "ok") && (
              <p
                role="status"
                className="mt-1.5 flex items-start gap-1.5 text-[11px] text-white/65"
              >
                {support !== "ok" ? (
                  <BluetoothOff size={13} className="mt-0.5 shrink-0" />
                ) : (
                  <Info size={13} className="mt-0.5 shrink-0" />
                )}
                {detail ||
                  (support === "ios"
                    ? "No iPhone, o Safari não conecta a sensores Bluetooth. Use o app Bluefy ou um celular Android/computador com Chrome."
                    : support === "insecure"
                      ? "A conexão Bluetooth só funciona no site seguro (https)."
                      : "Este navegador não conecta a sensores Bluetooth. Use o Chrome ou o Edge no computador ou no Android.")}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 md:w-44 md:flex-col">
            {!active ? (
              <>
                <button
                  type="button"
                  onClick={() => void connect()}
                  disabled={support !== "ok" || state === "conectando"}
                  className={`${btn} bg-white text-slate-950 hover:bg-white/90 md:w-full`}
                >
                  {state === "conectando" ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Bluetooth size={15} />
                  )}
                  Conectar sensor
                </button>
                <button
                  type="button"
                  onClick={simulate}
                  className={`${btn} border border-white/20 bg-white/5 hover:bg-white/10 md:w-full`}
                >
                  <Play size={14} /> Ver simulação
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving || samples.length < 20 || state === "simulando"}
                  className={`${btn} bg-white text-slate-950 hover:bg-white/90 md:w-full`}
                >
                  <Save size={14} /> Salvar sessão
                </button>
                <button
                  type="button"
                  onClick={() => void stop()}
                  className={`${btn} bg-white/10 ring-1 ring-white/20 hover:bg-white/15 md:w-full`}
                >
                  <Square size={13} /> Parar
                </button>
              </>
            )}
          </div>
        </div>

        <ul className="mt-3 grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-5">
          {[
            [Timer, "Tempo", stats ? fmtClock(stats.secs) : "00:00:00"],
            [HeartPulse, "Média", stats ? `${stats.avg}` : "—"],
            [HeartPulse, "Mínima", stats ? `${stats.min}` : "—"],
            [HeartPulse, "Máxima", stats ? `${stats.max}` : "—"],
            [HeartPulse, "Máx. estimada", `${max}`],
          ].map(([I, l, v], i) => {
            const Icon = I as typeof Timer;
            return (
              <li
                key={l as string}
                className={`group bg-[#0a1019] px-3 py-1.5 transition-colors hover:bg-[#101a28] ${i === 4 ? "col-span-2 sm:col-span-1" : ""}`}
              >
                <p className="flex items-center gap-1.5 text-[10px] font-semibold text-white/50">
                  <Icon size={11} className="transition-transform group-hover:scale-125" />{" "}
                  {l as string}
                </p>
                <p className="font-display text-base font-extrabold tabular-nums">
                  {v as string}
                  {i > 0 && (
                    <span className="ml-1 text-[10px] font-semibold text-white/45">bpm</span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>

        <div className="mt-3" aria-label="Zonas de frequência">
          <div className="relative">
            <div className="flex h-3 gap-px">
              {zones.map((z) => {
                const w = Math.max(
                  4,
                  Math.min(z.to > 250 ? span : z.to, span) - Math.min(z.from, span),
                );
                const share = stats
                  ? Math.round(((stats.inZone[z.key] ?? 0) / samples.length) * 100)
                  : 0;
                const here = active && bpm && z.key === zone.key;
                return (
                  <button
                    key={z.key}
                    type="button"
                    onMouseEnter={() => setHoverZone(z.key)}
                    onMouseLeave={() => setHoverZone(null)}
                    onFocus={() => setHoverZone(z.key)}
                    onBlur={() => setHoverZone(null)}
                    aria-label={`${z.label}: ${z.from} a ${z.to > 250 ? "mais" : z.to} bpm, ${share}% do tempo`}
                    className="relative h-full transition-[filter,transform] duration-200 hover:brightness-125 focus-visible:outline-none"
                    style={{
                      flex: w,
                      background: z.color,
                      opacity: here ? 1 : hoverZone === z.key ? 0.9 : 0.5,
                      transform: hoverZone === z.key ? "scaleY(1.5)" : undefined,
                    }}
                  />
                );
              })}
            </div>
            {bpm > 0 && (
              <i
                aria-hidden
                className="absolute -top-1.5 size-0 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent transition-[left] duration-700"
                style={{ left: `${markPct}%`, borderTopColor: zone.color }}
              />
            )}
          </div>
          <p
            className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 text-[11px] text-white/60"
            role="status"
          >
            {(() => {
              const z = zones.find((x) => x.key === (hoverZone ?? zone.key)) ?? zone;
              const share = stats
                ? Math.round(((stats.inZone[z.key] ?? 0) / samples.length) * 100)
                : 0;
              return (
                <>
                  <span className="font-semibold" style={{ color: z.color }}>
                    {z.label} · {z.from}–{z.to > 250 ? "+" : z.to} bpm
                  </span>
                  <span className="tabular-nums">{share}% do tempo na sessão</span>
                </>
              );
            })()}
          </p>
        </div>
      </section>

      <section className="border border-border bg-card p-3" aria-label="Últimos 5 minutos">
        <h3 className="mb-1 text-[13px] font-bold">Últimos 5 minutos</h3>
        {chart.points.length > 1 ? (
          <EvoChart
            ariaLabel="Frequência cardíaca nos últimos 5 minutos"
            height={170}
            yAuto
            persistTip
            series={[
              {
                id: "bpm",
                label: "Frequência",
                color: zone.color,
                points: chart.points,
                area: true,
                live: active,
              },
            ]}
            xMin={chart.points[0].x}
            xMax={Math.max(chart.points.at(-1)!.x, chart.points[0].x + 10)}
            xTicks={[chart.points[0].x, chart.points.at(-1)!.x].map((x) => ({
              x,
              label: fmtClock(Math.round(x)).slice(3),
            }))}
            formatX={(x) => fmtClock(Math.round(x))}
            formatY={(y) => `${Math.round(y)} bpm`}
            band={{
              from: zones[2].from,
              to: zones[3].to,
              label: "Zona aeróbica",
              color: "#22c55e",
            }}
          />
        ) : (
          <p className="grid h-[110px] place-items-center text-center text-sm text-muted-foreground">
            Conecte um sensor ou veja a simulação para acompanhar ao vivo.
          </p>
        )}
      </section>

      <section className="border border-border bg-card" aria-label="Sessões e conexão">
        <div role="tablist" className="relative flex border-b border-border">
          {(
            [
              ["sessoes", `Sessões salvas${history.length ? ` · ${history.length}` : ""}`],
              ["conectar", "Como conectar"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`h-10 flex-1 text-[13px] font-semibold transition-colors ${tab === k ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {l}
            </button>
          ))}
          <i
            aria-hidden
            className="absolute bottom-[-1px] h-[2px] w-1/2 bg-rose-500 transition-transform duration-300"
            style={{ transform: tab === "sessoes" ? "translateX(0)" : "translateX(100%)" }}
          />
        </div>
        <div key={tab} className="nv-fade-in p-3">
          {tab === "sessoes" ? (
            <ul className="divide-y divide-border">
              {history.map((s) => (
                <li key={s.id} className="group flex items-center gap-3 py-2 text-[13px]">
                  <HeartPulse size={15} className="text-rose-500" />
                  <span className="min-w-0 flex-1">
                    <strong className="block">{fmtDate(s.started_at)}</strong>
                    <span className="text-[11px] text-muted-foreground">
                      {s.device_name ?? "Sensor"} ·{" "}
                      {fmtClock(
                        Math.round(
                          (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) /
                            1000,
                        ),
                      )}
                    </span>
                  </span>
                  <span className="hidden w-28 sm:block" aria-hidden>
                    <span className="block h-1.5 bg-muted">
                      <span
                        className="nv-grow-x block h-full bg-rose-500"
                        style={{ width: `${Math.min(100, Math.round((s.max_bpm / max) * 100))}%` }}
                      />
                    </span>
                  </span>
                  <span className="text-right text-xs tabular-nums">
                    <strong className="text-sm">{s.avg_bpm}</strong> média
                    <span className="block text-[11px] text-muted-foreground">
                      {s.min_bpm}–{s.max_bpm}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void remove(s)}
                    aria-label="Apagar sessão"
                    className="grid size-8 place-items-center text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
              {!history.length && (
                <li className="py-5 text-center text-sm text-muted-foreground">
                  Nenhuma sessão salva ainda.
                </li>
              )}
            </ul>
          ) : (
            <ConnectGuide />
          )}
        </div>
      </section>
    </div>
  );
}

type Brand = {
  key: string;
  label: string;
  ok: "sim" | "alguns" | "nao";
  steps: string[];
  note?: string;
};
const BRANDS: Brand[] = [
  {
    key: "garmin",
    label: "Garmin",
    ok: "sim",
    steps: [
      "No relógio, segure o botão de menu e abra Configurações > Saúde e bem-estar > FC no pulso > Transmitir FC (ou abra o menu de controles e toque em Transmitir FC).",
      "Confirme com o botão de iniciar: o relógio começa a transmitir.",
      "Aqui, toque em Conectar relógio ou cinta e escolha o Garmin na lista.",
    ],
    note: "Transmitir a frequência gasta mais bateria. Para parar, use o mesmo botão.",
  },
  {
    key: "huawei",
    label: "Huawei",
    ok: "alguns",
    steps: [
      "No relógio ou na pulseira, abra a lista de apps e vá em Configurações > Transmissão de dados de FC.",
      "Ative a opção. Você também pode iniciar um treino: a transmissão continua.",
      "Aqui, toque em Conectar relógio ou cinta e escolha o aparelho Huawei.",
    ],
    note: "Se a opção não aparecer no menu, o seu modelo não tem esse recurso. Modelos que só aceitam uma conexão se desligam do app Huawei Saúde enquanto transmitem.",
  },
  {
    key: "amazfit",
    label: "Amazfit",
    ok: "sim",
    steps: [
      "Abra o app Zepp > Dispositivo > seu Amazfit > Monitoramento de saúde (ou o app Frequência no relógio).",
      "Ative Transmissão de frequência (Heart Rate Push). Em alguns modelos é preciso iniciar um treino.",
      "Aqui, toque em Conectar relógio ou cinta e escolha o Amazfit.",
    ],
  },
  {
    key: "xiaomi",
    label: "Xiaomi",
    ok: "alguns",
    steps: [
      "Abra o app Mi Fitness > Dispositivo > Frequência cardíaca e procure a opção de compartilhar/transmitir a frequência.",
      "Se existir, ative e deixe a pulseira por perto.",
      "Aqui, toque em Conectar relógio ou cinta e escolha a pulseira.",
    ],
    note: "Depende do modelo e da versão: em várias Smart Band recentes a Xiaomi não oferece mais essa opção. Se não aparecer, a pulseira não transmite para outros apps.",
  },
  {
    key: "cinta",
    label: "Polar, Coros e cintas",
    ok: "sim",
    steps: [
      "Cintas peitorais: umedeça os sensores e vista; elas transmitem sozinhas.",
      "Relógios Polar e Coros: ative a opção de compartilhar a frequência com outros dispositivos nas configurações do relógio.",
      "Aqui, toque em Conectar relógio ou cinta e escolha o sensor.",
    ],
  },
  {
    key: "apple",
    label: "Apple Watch",
    ok: "nao",
    steps: [
      "O Apple Watch não transmite a frequência pelo Bluetooth para sites.",
      "A leitura do Apple Watch vai chegar pelo aplicativo NextVita para iPhone, ligado ao app Saúde (em preparação).",
    ],
  },
  {
    key: "samsung",
    label: "Samsung",
    ok: "nao",
    steps: [
      "O Galaxy Watch não transmite a frequência pelo Bluetooth para sites.",
      "A leitura vai chegar pelo aplicativo NextVita para Android, ligado ao Health Connect (em preparação).",
    ],
  },
];
const OK_LABEL = {
  sim: ["Funciona", "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"],
  alguns: ["Alguns modelos", "bg-amber-500/15 text-amber-700 dark:text-amber-300"],
  nao: ["Ainda não", "bg-muted text-muted-foreground"],
} as const;

/** Passo a passo por marca para ativar a transmissão da frequência cardíaca. */
function ConnectGuide() {
  const [sel, setSel] = useState("garmin");
  const b = BRANDS.find((x) => x.key === sel) ?? BRANDS[0];
  return (
    <section className="text-[13px]" aria-label="Como conectar">
      <div role="tablist" aria-label="Marca do relógio" className="flex flex-wrap gap-1.5">
        {BRANDS.map((x) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={sel === x.key}
            onClick={() => setSel(x.key)}
            className={`h-8 px-3 text-xs font-semibold transition-colors ${sel === x.key ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:text-foreground"}`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" key={b.key} className="nv-fade-in mt-3">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${OK_LABEL[b.ok][1]}`}
        >
          {OK_LABEL[b.ok][0]}
        </span>
        <ol className="mt-2 grid list-decimal gap-1.5 pl-5 text-muted-foreground">
          {b.steps.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
        {b.note && <p className="mt-2 text-xs text-muted-foreground">{b.note}</p>}
      </div>
      <p className="mt-3 rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">
        Não precisa ler QR Code: o QR do relógio serve só para o app da própria marca. A conexão com
        a NextVita funciona no Chrome e no Edge (Android e computador). Valores apenas informativos,
        não substituem avaliação médica.
      </p>
    </section>
  );
}
