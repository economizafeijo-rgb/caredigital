import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Battery, Bluetooth, BluetoothOff, HeartPulse, Info, Loader2, Play, Save, Square, Timer, Trash2, Watch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import { bluetoothSupport, HeartRateLink, heartZones, startSimulation, zoneOf, type HrSample } from "@/lib/heart-rate";
import { EvoChart } from "./EvoChart";

type Session = { id: string; device_name: string | null; started_at: string; ended_at: string; avg_bpm: number; min_bpm: number; max_bpm: number };
type LinkState = "parado" | "conectando" | "conectado" | "reconectando" | "desconectado" | "simulando";
const fmtClock = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const fmtDate = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Rio_Branco", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Traçado tipo eletrocardiograma desenhado a cada batida, no ritmo da frequência real. */
function EcgTrace({ bpm, color, running }: { bpm: number; color: string; running: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ bpm, color, running });
  live.current = { bpm, color, running };
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0; let x = 0; let last = performance.now(); let nextBeat = last; let beatT = -1;
    const ys: number[] = [];
    const resize = () => { const r = canvas.getBoundingClientRect(); canvas.width = Math.max(1, Math.round(r.width * devicePixelRatio)); canvas.height = Math.max(1, Math.round(r.height * devicePixelRatio)); ys.length = canvas.width; ys.fill(NaN); x = 0; };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    // Forma PQRST normalizada (0..1 do tempo da batida → altura).
    const wave = (p: number) => {
      if (p < 0.08) return 0.12 * Math.sin((p / 0.08) * Math.PI);
      if (p < 0.14) return 0;
      if (p < 0.17) return -0.18 * ((p - 0.14) / 0.03);
      if (p < 0.21) return -0.18 + 1.18 * ((p - 0.17) / 0.04);
      if (p < 0.25) return 1 - 1.35 * ((p - 0.21) / 0.04);
      if (p < 0.28) return -0.35 + 0.35 * ((p - 0.25) / 0.03);
      if (p < 0.4) return 0;
      if (p < 0.56) return 0.28 * Math.sin(((p - 0.4) / 0.16) * Math.PI);
      return 0;
    };
    const tick = (now: number) => {
      const { bpm: b, color: c, running: on } = live.current;
      const W = canvas.width, H = canvas.height, dpr = devicePixelRatio;
      const speed = 90 * dpr; // px por segundo
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const beatMs = 60000 / Math.max(30, b || 60);
      const steps = Math.max(1, Math.round(speed * dt));
      for (let i = 0; i < steps; i++) {
        const tNow = now - (steps - i) * (1000 / speed) * dpr;
        if (on && b > 0 && tNow >= nextBeat) { beatT = tNow; nextBeat = tNow + beatMs; }
        const p = beatT >= 0 ? (tNow - beatT) / Math.min(beatMs, 900) : 1;
        const v = on && b > 0 && p >= 0 && p <= 1 ? wave(p) : 0;
        ys[x] = H * 0.62 - v * H * 0.48;
        x = (x + 1) % W;
        for (let g = 0; g < 18 * dpr; g++) ys[(x + g) % W] = NaN; // espaço à frente do traço
      }
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 2.2 * dpr; ctx.lineJoin = "round"; ctx.strokeStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 12 * dpr;
      ctx.beginPath(); let pen = false;
      for (let i = 0; i < W; i++) { const y = ys[i]; if (Number.isNaN(y)) { pen = false; continue; } if (!pen) { ctx.moveTo(i, y); pen = true; } else ctx.lineTo(i, y); }
      ctx.stroke();
      // cabeça brilhante do traço
      const hy = ys[(x - 1 + W) % W];
      if (!Number.isNaN(hy)) { ctx.shadowBlur = 18 * dpr; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc((x - 1 + W) % W, hy, 2.6 * dpr, 0, Math.PI * 2); ctx.fill(); }
      if (!reduce) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return <canvas ref={ref} className="h-28 w-full" aria-hidden="true" />;
}

export function ClientHeartRate({ patientId, ownerId, ageYears }: { patientId: string; ownerId: string; ageYears?: number | null }) {
  const { confirm } = useDialog();
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
    const { data } = await (supabase as any).from("care_heart_rate_sessions").select("id,device_name,started_at,ended_at,avg_bpm,min_bpm,max_bpm").eq("patient_id", patientId).order("started_at", { ascending: false }).limit(12);
    setHistory(data ?? []);
  }, [patientId]);
  useEffect(() => { void loadHistory(); }, [loadHistory]);
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, []);
  useEffect(() => () => { void linkRef.current?.disconnect(); simRef.current?.(); }, []);

  const onSample = useCallback((s: HrSample & { contact: boolean | null }) => {
    setContact(s.contact);
    setSamples((prev) => (prev.length >= 7200 ? [...prev.slice(-7199), s] : [...prev, s]));
  }, []);

  async function connect() {
    setDetail("");
    simRef.current?.(); simRef.current = null;
    const link = new HeartRateLink(onSample, (st, d) => { setState(st); if (d) setDetail(d); if (st === "conectado") setDevice({ name: link.name, battery: link.battery }); });
    linkRef.current = link;
    try { await link.connect(); setSamples([]); }
    catch (e) {
      const msg = String((e as Error)?.name ?? "");
      setState("parado");
      setDetail(msg === "NotFoundError" ? "Nenhum aparelho escolhido. Ative a transmissão de frequência no relógio e tente de novo." : "Não foi possível conectar. Confira se o Bluetooth está ligado e o relógio está transmitindo a frequência.");
    }
  }
  async function stop() {
    await linkRef.current?.disconnect(); linkRef.current = null;
    simRef.current?.(); simRef.current = null;
    setState("parado");
  }
  function simulate() {
    void linkRef.current?.disconnect(); linkRef.current = null;
    setSamples([]); setDevice({ name: "Simulação", battery: null }); setState("simulando");
    simRef.current = startSimulation(onSample);
  }

  const active = state === "conectado" || state === "simulando" || state === "reconectando";
  const bpm = samples.at(-1)?.bpm ?? 0;
  const zone = zoneOf(bpm || 60, zones);
  const stats = useMemo(() => {
    if (!samples.length) return null;
    const v = samples.map((s) => s.bpm);
    const inZone: Record<string, number> = {};
    samples.forEach((s) => { const k = zoneOf(s.bpm, zones).key; inZone[k] = (inZone[k] ?? 0) + 1; });
    return { avg: Math.round(v.reduce((a, b) => a + b, 0) / v.length), min: Math.min(...v), max: Math.max(...v), secs: Math.round((samples.at(-1)!.t - samples[0].t) / 1000), inZone };
  }, [samples, zones]);
  const chart = useMemo(() => {
    const t0 = samples[0]?.t ?? now;
    const recent = samples.filter((s) => s.t >= now - 5 * 60_000);
    return { t0, points: recent.map((s) => ({ x: (s.t - t0) / 1000, y: s.bpm })) };
  }, [samples, now]);

  async function save() {
    if (!stats || samples.length < 20) return;
    if (state === "simulando") { setDetail("Sessões simuladas não são salvas. Conecte um relógio ou cinta para registrar."); return; }
    setSaving(true);
    const step = Math.max(1, Math.ceil(samples.length / 1800));
    const { error } = await (supabase as any).from("care_heart_rate_sessions").insert({
      patient_id: patientId, owner_id: ownerId, device_name: device?.name ?? null,
      started_at: new Date(samples[0].t).toISOString(), ended_at: new Date(samples.at(-1)!.t).toISOString(),
      avg_bpm: stats.avg, min_bpm: stats.min, max_bpm: stats.max,
      samples: samples.filter((_, i) => i % step === 0).map((s) => [Math.round((s.t - samples[0].t) / 1000), s.bpm]),
      zones: stats.inZone,
    });
    setSaving(false);
    setDetail(error ? "Não foi possível salvar a sessão." : "Sessão salva no seu histórico.");
    if (!error) void loadHistory();
  }
  async function remove(s: Session) {
    if (!(await confirm("Apagar esta sessão?", `${fmtDate(s.started_at)} · média ${s.avg_bpm} bpm. Não dá para desfazer.`, true, "Apagar"))) return;
    await (supabase as any).from("care_heart_rate_sessions").delete().eq("id", s.id);
    void loadHistory();
  }

  const beat = bpm ? 60 / bpm : 1;
  const pct = bpm ? Math.min(100, Math.round((bpm / max) * 100)) : 0;

  return (
    <div className="grid gap-4">
      <section aria-label="Frequência cardíaca ao vivo" className="nv-dark relative isolate overflow-hidden rounded-3xl bg-[#07090f] p-5 text-white shadow-pop sm:p-6"
        style={{ "--hr": zone.color, "--beat": `${beat}s` } as CSSProperties}>
        <div aria-hidden className="absolute inset-0 -z-10 opacity-60 transition-[background] duration-700" style={{ background: `radial-gradient(70% 90% at 15% 30%, color-mix(in srgb, ${active ? zone.color : "#334155"} 28%, transparent), transparent 70%)` }} />
        <div aria-hidden className="absolute inset-0 -z-10 opacity-[.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:22px_22px]" />

        <div className="grid items-center gap-5 md:grid-cols-[auto_minmax(0,1fr)]">
          <div className="relative mx-auto grid size-40 place-items-center sm:size-44">
            {active && bpm > 0 && <>
              <span className="nv-hr-ring absolute inset-0 rounded-full border-2" style={{ borderColor: zone.color }} />
              <span className="nv-hr-ring absolute inset-0 rounded-full border-2" style={{ borderColor: zone.color, animationDelay: `calc(var(--beat) / 2)` }} />
            </>}
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="5" />
              <circle cx="50" cy="50" r="45" fill="none" stroke={zone.color} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 282.7} 282.7`} className="transition-[stroke-dasharray,stroke] duration-700" />
            </svg>
            <div className="grid justify-items-center">
              <HeartPulse size={30} className={active && bpm ? "nv-hr-heart" : "opacity-40"} style={{ color: zone.color }} aria-hidden />
              <p className="font-display text-5xl font-extrabold tabular-nums leading-none" aria-live="polite" aria-atomic="true">{bpm || "--"}</p>
              <p className="text-xs font-semibold text-white/60">bpm</p>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: `color-mix(in srgb, ${zone.color} 22%, transparent)`, color: zone.color }}>
                <span className="size-2 rounded-full" style={{ background: zone.color }} />{active && bpm ? zone.label : "Sem leitura"}
              </span>
              {state === "simulando" && <span className="rounded-full bg-amber-400/20 px-2.5 py-1 text-xs font-bold text-amber-300">Simulação</span>}
              {state === "reconectando" && <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs"><Loader2 size={12} className="animate-spin" /> Reconectando…</span>}
              {contact === false && active && <span className="rounded-full bg-rose-500/20 px-2.5 py-1 text-xs font-semibold text-rose-300">Sem contato com a pele</span>}
              {device && active && <span className="inline-flex items-center gap-1.5 text-xs text-white/65"><Watch size={13} /> {device.name}{device.battery != null && <><Battery size={13} className="ml-1" /> {device.battery}%</>}</span>}
            </div>
            <EcgTrace bpm={bpm} color={zone.color} running={active && bpm > 0} />
            <div className="flex flex-wrap gap-2">
              {!active ? (
                <>
                  <button type="button" onClick={() => void connect()} disabled={support !== "ok" || state === "conectando"}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-950 transition hover:bg-white/90 active:scale-[.98] disabled:opacity-50">
                    {state === "conectando" ? <Loader2 size={16} className="animate-spin" /> : <Bluetooth size={16} />} Conectar relógio ou cinta
                  </button>
                  <button type="button" onClick={simulate} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-semibold transition hover:bg-white/10"><Play size={15} /> Ver simulação</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => void stop()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-bold ring-1 ring-white/20 transition hover:bg-white/15"><Square size={14} /> Parar</button>
                  <button type="button" onClick={() => void save()} disabled={saving || samples.length < 20 || state === "simulando"} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-950 transition hover:bg-white/90 disabled:opacity-45"><Save size={15} /> Salvar sessão</button>
                </>
              )}
            </div>
            {(detail || support !== "ok") && (
              <p role="status" className="mt-3 flex items-start gap-2 text-xs text-white/70">
                {support !== "ok" ? <BluetoothOff size={14} className="mt-0.5 shrink-0" /> : <Info size={14} className="mt-0.5 shrink-0" />}
                {detail || (support === "ios" ? "No iPhone, o Safari não conecta a sensores Bluetooth. Use o app Bluefy ou um celular Android/computador com Chrome." : support === "insecure" ? "A conexão Bluetooth só funciona no site seguro (https)." : "Este navegador não conecta a sensores Bluetooth. Use o Chrome ou o Edge no computador ou no Android.")}
              </p>
            )}
          </div>
        </div>

        <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[[Timer, "Tempo", stats ? fmtClock(stats.secs) : "00:00:00"], [HeartPulse, "Média", stats ? `${stats.avg} bpm` : "—"], [HeartPulse, "Mínima", stats ? `${stats.min} bpm` : "—"], [HeartPulse, "Máxima", stats ? `${stats.max} bpm` : "—"], [HeartPulse, "Máx. estimada", `${max} bpm`]].map(([I, l, v], i) => {
            const Icon = I as typeof Timer;
            return <li key={l as string} className={`rounded-xl bg-white/[.05] px-3 py-2 ring-1 ring-white/10 ${i === 4 ? "col-span-2 sm:col-span-1" : ""}`}><p className="flex items-center gap-1.5 text-[11px] text-white/55"><Icon size={12} /> {l as string}</p><p className="font-display text-lg font-extrabold tabular-nums">{v as string}</p></li>;
          })}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-border bg-card p-4" aria-label="Últimos 5 minutos">
          <h3 className="text-sm font-bold">Últimos 5 minutos</h3>
          {chart.points.length > 1 ? (
            <EvoChart ariaLabel="Frequência cardíaca nos últimos 5 minutos" height={210} yAuto
              series={[{ id: "bpm", label: "Frequência", color: zone.color, points: chart.points, area: true, live: active }]}
              xMin={chart.points[0].x} xMax={Math.max(chart.points.at(-1)!.x, chart.points[0].x + 10)}
              xTicks={[chart.points[0].x, chart.points.at(-1)!.x].map((x) => ({ x, label: fmtClock(Math.round(x)).slice(3) }))}
              formatX={(x) => fmtClock(Math.round(x))} formatY={(y) => `${Math.round(y)} bpm`}
              band={{ from: zones[2].from, to: zones[3].to, label: "Zona aeróbica", color: "#22c55e" }} />
          ) : <p className="grid h-[210px] place-items-center text-center text-sm text-muted-foreground">Conecte um sensor ou veja a simulação para acompanhar ao vivo.</p>}
        </section>
        <section className="rounded-2xl border border-border bg-card p-4" aria-label="Zonas de frequência">
          <h3 className="text-sm font-bold">Zonas de frequência</h3>
          <ul className="mt-3 grid gap-2">
            {[...zones].reverse().map((z) => {
              const share = stats ? Math.round(((stats.inZone[z.key] ?? 0) / samples.length) * 100) : 0;
              const here = active && bpm && z.key === zone.key;
              return (
                <li key={z.key} className={`grid grid-cols-[1fr_auto] items-center gap-x-3 rounded-lg px-2 py-1 transition-colors ${here ? "bg-muted" : ""}`}>
                  <span className="flex items-center gap-2 text-[13px]"><span className={`size-2.5 rounded-full ${here ? "nv-hr-heart" : ""}`} style={{ background: z.color }} />{z.label}<span className="text-[11px] text-muted-foreground">{z.from}–{z.to > 250 ? "+" : z.to}</span></span>
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">{share}%</span>
                  <span className="col-span-2 mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${share}%`, background: z.color }} /></span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-4" aria-label="Sessões salvas">
          <h3 className="text-sm font-bold">Sessões salvas</h3>
          <ul className="mt-2 divide-y divide-border">
            {history.map((s) => (
              <li key={s.id} className="group flex items-center gap-3 py-2 text-[13px]">
                <HeartPulse size={16} className="text-rose-500" />
                <span className="min-w-0 flex-1"><strong className="block">{fmtDate(s.started_at)}</strong><span className="text-xs text-muted-foreground">{s.device_name ?? "Sensor"} · {fmtClock(Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000))}</span></span>
                <span className="text-right text-xs tabular-nums"><strong className="text-sm">{s.avg_bpm}</strong> média<br /><span className="text-muted-foreground">{s.min_bpm}–{s.max_bpm}</span></span>
                <button type="button" onClick={() => void remove(s)} aria-label="Apagar sessão" className="grid size-8 place-items-center rounded-lg text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100 focus:opacity-100"><Trash2 size={14} /></button>
              </li>
            ))}
            {!history.length && <li className="py-6 text-center text-sm text-muted-foreground">Nenhuma sessão salva ainda.</li>}
          </ul>
        </section>
        <section className="rounded-2xl border border-border bg-card p-4 text-[13px]" aria-label="Como conectar">
          <h3 className="flex items-center gap-2 text-sm font-bold"><Watch size={15} /> Como conectar</h3>
          <ol className="mt-2 grid list-decimal gap-1.5 pl-5 text-muted-foreground">
            <li>Ligue o Bluetooth do celular ou do computador.</li>
            <li>No relógio, ative a <strong className="text-foreground">transmissão da frequência cardíaca</strong> (Garmin: "Transmitir FC"; Polar, Coros, Amazfit: "Compartilhar FC"). Cintas peitorais transmitem sozinhas ao vestir.</li>
            <li>Toque em <strong className="text-foreground">Conectar relógio ou cinta</strong> e escolha o aparelho na lista.</li>
          </ol>
          <p className="mt-3 rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">Funciona no Chrome e no Edge (Android e computador). Apple Watch e Galaxy Watch não transmitem a frequência para sites. Valores apenas informativos, não substituem avaliação médica.</p>
        </section>
      </div>
    </div>
  );
}
