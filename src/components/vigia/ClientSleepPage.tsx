import { useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlarmClock, BedDouble, Bluetooth, BluetoothOff, HeartPulse, Lightbulb, Moon, Save, Sparkles, Star, Sunrise, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DayDetailDialog } from "./DayDetailDialog";
import { NextUpClock } from "./NextUpClock";
import { acreDateKey } from "@/lib/acre-time";
import { useDialog } from "@/lib/dialog";

export type SleepLog = { id: string; sleep_date: string; bed_at: string; wake_at: string; quality: number; awakenings: number; avg_hr: number | null; min_hr: number | null; source: string; notes: string | null };
const GOAL_HOURS = 8;
const tz = "America/Rio_Branco";
const hours = (log: Pick<SleepLog, "bed_at" | "wake_at">) => (Date.parse(log.wake_at) - Date.parse(log.bed_at)) / 3_600_000;
const hm = (h: number) => `${Math.floor(h)}h${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
const clock = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const short = (key: string) => key.slice(8, 10) + "/" + key.slice(5, 7);

/** Nota de 0 a 100: duração frente à meta (60), qualidade percebida (30) e despertares (10). */
export function sleepScore(log: Pick<SleepLog, "bed_at" | "wake_at" | "quality" | "awakenings">, goal = GOAL_HOURS): number {
  const h = hours(log);
  const duration = Math.min(1, h / goal) * 60 - Math.max(0, h - goal - 1.5) * 6;
  return Math.max(0, Math.min(100, Math.round(duration + log.quality * 6 + Math.max(0, 10 - log.awakenings * 3))));
}
export const scoreLabel = (score: number) => score >= 85 ? "Excelente" : score >= 70 ? "Bom" : score >= 50 ? "Regular" : "Precisa de atenção";
const scoreColor = (score: number) => score >= 85 ? "#10b981" : score >= 70 ? "#6366f1" : score >= 50 ? "#f59e0b" : "#ef4444";

/** Desvio médio (em minutos) do horário de dormir em relação à média: quanto menor, mais regular. */
export function bedtimeRegularity(logs: Pick<SleepLog, "bed_at">[]): number | null {
  if (logs.length < 3) return null;
  const mins = logs.map(log => { const d = new Date(Date.parse(log.bed_at) - 5 * 3_600_000); let m = d.getUTCHours() * 60 + d.getUTCMinutes(); if (m < 12 * 60) m += 24 * 60; return m; });
  const avg = mins.reduce((a, b) => a + b, 0) / mins.length;
  return Math.round(mins.reduce((a, b) => a + Math.abs(b - avg), 0) / mins.length);
}

/** Leitura do padrão Bluetooth "Heart Rate Measurement": 8 ou 16 bits conforme o primeiro bit. */
export function parseHeartRate(view: DataView): number {
  return view.getUint8(0) & 1 ? view.getUint16(1, true) : view.getUint8(1);
}

const localKey = (id: string) => `nextvita-sleep-${id}`;
const readLocal = (id: string): SleepLog[] => { try { return JSON.parse(localStorage.getItem(localKey(id)) ?? "[]"); } catch { return []; } };
const toLocalInput = (date: Date) => new Date(date.getTime() - 5 * 3_600_000).toISOString().slice(0, 16);
const fromLocalInput = (value: string) => new Date(value + ":00-05:00");

function ScoreRing({ score }: { score: number }) {
  const r = 70, c = 2 * Math.PI * r, color = scoreColor(score);
  return <div className="relative mx-auto size-[150px] shrink-0 sm:size-[176px]">
    <svg viewBox="0 0 176 176" className="size-full -rotate-90"><circle cx="88" cy="88" r={r} fill="none" strokeWidth="14" className="stroke-white/15"/>
      <circle cx="88" cy="88" r={r} fill="none" strokeWidth="14" stroke={color} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} style={{ transition: "stroke-dashoffset 1s ease", filter: `drop-shadow(0 0 8px ${color})` }}/></svg>
    <div className="absolute inset-0 grid place-items-center text-center"><div><strong className="block text-5xl font-extrabold tabular-nums leading-none">{score}</strong><span className="text-xs font-semibold uppercase tracking-widest text-white/70">{scoreLabel(score)}</span></div></div>
  </div>;
}

/** Régua da noite (18h → 12h): mostra quando deitou e acordou frente à janela ideal 22h–06h. */
function NightBar({ log }: { log: SleepLog }) {
  const minutesFrom18 = (iso: string) => { const d = new Date(Date.parse(iso) - 5 * 3_600_000); let m = d.getUTCHours() * 60 + d.getUTCMinutes() - 18 * 60; if (m < 0) m += 24 * 60; return m; };
  const span = 18 * 60, pos = (m: number) => Math.min(100, Math.max(0, (m / span) * 100));
  const a = pos(minutesFrom18(log.bed_at)), b = pos(minutesFrom18(log.wake_at));
  return <div className="mt-3" aria-label={`Dormiu ${clock(log.bed_at)}, acordou ${clock(log.wake_at)}`}>
    <div className="relative h-9 rounded-xl bg-white/10">
      <span aria-hidden="true" className="absolute inset-y-0 rounded-xl border border-dashed border-white/25" style={{ left: `${pos(4 * 60)}%`, width: `${pos(12 * 60) - pos(4 * 60)}%` }}/>
      <span className="nv-progress absolute inset-y-1 rounded-lg bg-gradient-to-r from-indigo-400 via-violet-400 to-amber-300 shadow-[0_0_18px_rgba(167,139,250,.55)]" style={{ left: `${a}%`, width: `${Math.max(2, b - a)}%` }}/>
      <span className="absolute top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-indigo-950 text-indigo-200 ring-2 ring-indigo-300" style={{ left: `${a}%` }}><Moon size={13}/></span>
      <span className="absolute top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-amber-300 text-amber-900 ring-2 ring-amber-100" style={{ left: `${b}%` }}><Sunrise size={13}/></span>
    </div>
    <div className="mt-1 flex justify-between text-[10px] font-semibold text-white/55">{["18h", "21h", "00h", "03h", "06h", "09h", "12h"].map(t => <span key={t}>{t}</span>)}</div>
  </div>;
}

export function ClientSleepPage({ patientId, ownerId }: { patientId: string; ownerId: string }) {
  const dialog = useDialog();
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [remote, setRemote] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [range, setRange] = useState<7 | 14 | 30>(14);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const yesterdayNight = () => { const d = new Date(); d.setHours(d.getHours() - 8); return d; };
  const [bed, setBed] = useState(() => toLocalInput(yesterdayNight()));
  const [wake, setWake] = useState(() => toLocalInput(new Date()));
  const [quality, setQuality] = useState(4);
  const [awakenings, setAwakenings] = useState(0);
  const [notes, setNotes] = useState("");
  // sensor ao vivo
  const [bpm, setBpm] = useState<number | null>(null);
  const [samples, setSamples] = useState<{ t: number; bpm: number }[]>([]);
  const [deviceName, setDeviceName] = useState("");
  const [session, setSession] = useState<{ start: number; sum: number; count: number; min: number } | null>(null);
  const [sensorHr, setSensorHr] = useState<{ avg: number; min: number } | null>(null);
  const deviceRef = useRef<any>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const db = supabase as any;
  const bluetooth = typeof navigator !== "undefined" && "bluetooth" in navigator;

  useEffect(() => {
    let active = true;
    const since = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10);
    void db.from("care_sleep_logs").select("id,sleep_date,bed_at,wake_at,quality,awakenings,avg_hr,min_hr,source,notes").eq("patient_id", patientId).eq("owner_id", ownerId).gte("sleep_date", since).order("sleep_date").then((r: any) => {
      if (!active) return;
      if (r.error) { setRemote(false); setLogs(readLocal(patientId)); } else { setRemote(true); setLogs(r.data ?? []); }
      setLoaded(true);
    });
    return () => { active = false; };
  }, [patientId, ownerId, reload]);
  useEffect(() => () => { try { deviceRef.current?.gatt?.disconnect(); } catch { /* já desconectado */ } }, []);

  async function connect() {
    setMessage(null);
    try {
      const device = await (navigator as any).bluetooth.requestDevice({ filters: [{ services: ["heart_rate"] }] });
      deviceRef.current = device;
      device.addEventListener("gattserverdisconnected", () => { setBpm(null); setDeviceName(""); });
      const server = await device.gatt.connect();
      const characteristic = await (await server.getPrimaryService("heart_rate")).getCharacteristic("heart_rate_measurement");
      characteristic.addEventListener("characteristicvaluechanged", (event: any) => {
        const value = parseHeartRate(event.target.value);
        if (value < 25 || value > 220) return;
        setBpm(value);
        setSamples(current => [...current.slice(-119), { t: Date.now(), bpm: value }]);
        if (sessionRef.current) setSession(s => s && { ...s, sum: s.sum + value, count: s.count + 1, min: Math.min(s.min, value) });
      });
      await characteristic.startNotifications();
      setDeviceName(device.name || "Sensor cardíaco");
    } catch (failure) {
      if ((failure as Error)?.name !== "NotFoundError") setMessage({ ok: false, text: "Não foi possível conectar ao sensor. Verifique se o Bluetooth está ligado e se o aparelho transmite frequência cardíaca." });
    }
  }
  function disconnect() { try { deviceRef.current?.gatt?.disconnect(); } catch { /* ok */ } setBpm(null); setDeviceName(""); }
  function startNight() { setSession({ start: Date.now(), sum: 0, count: 0, min: 999 }); setSensorHr(null); setMessage({ ok: true, text: "Monitoramento da noite iniciado. Mantenha esta tela aberta e o aparelho carregando." }); }
  function endNight() {
    if (!session) return;
    setBed(toLocalInput(new Date(session.start))); setWake(toLocalInput(new Date()));
    if (session.count > 0) setSensorHr({ avg: Math.round(session.sum / session.count), min: session.min });
    setSession(null);
    setMessage({ ok: true, text: "Noite encerrada. Confira os horários, avalie a qualidade e salve o registro." });
  }

  async function save() {
    const bedAt = fromLocalInput(bed), wakeAt = fromLocalInput(wake);
    const h = (wakeAt.getTime() - bedAt.getTime()) / 3_600_000;
    if (!(h > 0.5 && h <= 20)) return setMessage({ ok: false, text: "Confira os horários: o sono precisa ter entre 30 minutos e 20 horas." });
    if (wakeAt.getTime() > Date.now() + 60_000) return setMessage({ ok: false, text: "O horário de acordar não pode estar no futuro." });
    if (!(await dialog.confirm("Confirmar registro de sono?", `Registrar ${hm(h)} de sono: dormiu às ${clock(bedAt.toISOString())} e acordou às ${clock(wakeAt.toISOString())}?`, false, "Confirmar registro"))) return;
    const row = { sleep_date: acreDateKey(wakeAt), bed_at: bedAt.toISOString(), wake_at: wakeAt.toISOString(), quality, awakenings, avg_hr: sensorHr?.avg ?? null, min_hr: sensorHr?.min ?? null, source: sensorHr ? "sensor" : "manual", notes: notes.trim() || null };
    if (remote) {
      const r = await db.from("care_sleep_logs").upsert({ ...row, patient_id: patientId, owner_id: ownerId }, { onConflict: "patient_id,sleep_date" });
      if (r.error) return setMessage({ ok: false, text: "Não foi possível salvar o registro de sono." });
    } else {
      const list = [...logs.filter(l => l.sleep_date !== row.sleep_date), { ...row, id: crypto.randomUUID() }].sort((a, b) => a.sleep_date.localeCompare(b.sleep_date));
      try { localStorage.setItem(localKey(patientId), JSON.stringify(list)); } catch { /* indisponível */ }
    }
    setMessage({ ok: true, text: `Sono de ${hm(h)} registrado. Nota ${sleepScore(row)}.` });
    setSensorHr(null); setNotes(""); setReload(v => v + 1);
  }
  async function remove(log: SleepLog) {
    if (!(await dialog.confirm("Excluir registro de sono?", `O registro de ${short(log.sleep_date)} será removido definitivamente.`, true))) return;
    if (remote) await db.from("care_sleep_logs").delete().eq("id", log.id);
    else try { localStorage.setItem(localKey(patientId), JSON.stringify(logs.filter(l => l.id !== log.id))); } catch { /* ok */ }
    setSelected(null); setReload(v => v + 1);
  }

  const windowLogs = useMemo(() => { const since = acreDateKey(new Date(Date.now() - (range - 1) * 86_400_000)); return logs.filter(l => l.sleep_date >= since); }, [logs, range]);
  const chart = useMemo(() => {
    const byDay = new Map(windowLogs.map(l => [l.sleep_date, l]));
    const end = Date.parse(acreDateKey() + "T12:00:00Z");
    return Array.from({ length: range }, (_, i) => { const key = new Date(end - (range - 1 - i) * 86_400_000).toISOString().slice(0, 10); const log = byDay.get(key);
      return { day: key, hours: log ? Number(hours(log).toFixed(2)) : 0, score: log ? sleepScore(log) : null, log }; });
  }, [windowLogs, range]);
  const last = logs.at(-1);
  const focus = (selected && logs.find(l => l.sleep_date === selected)) || last;
  const avgHours = windowLogs.length ? windowLogs.reduce((s, l) => s + hours(l), 0) / windowLogs.length : 0;
  const avgScore = windowLogs.length ? Math.round(windowLogs.reduce((s, l) => s + sleepScore(l), 0) / windowLogs.length) : 0;
  const regularity = bedtimeRegularity(windowLogs);
  const debt = windowLogs.reduce((s, l) => s + Math.max(0, GOAL_HOURS - hours(l)), 0);
  const tip = !focus ? "Registre sua primeira noite para receber orientações." : hours(focus) < 6 ? "Você dormiu menos de 6 horas. Tente deitar 30 minutos mais cedo hoje e evite telas na última hora."
    : focus.awakenings >= 3 ? "Muitos despertares. Reduza líquidos e cafeína à noite e mantenha o quarto escuro e fresco."
    : regularity !== null && regularity > 60 ? "Seus horários de dormir variam bastante. Um horário fixo melhora a qualidade do sono."
    : "Bom padrão de sono. Mantenha o horário regular e a rotina de desaceleração.";
  // Horário de dormir: média das últimas noites (ou 22h30); o lembrete toca 30 min antes, para desacelerar.
  const bedTarget = (() => {
    const recent = logs.slice(-7);
    const mins = recent.map(l => { const d = new Date(Date.parse(l.bed_at) - 5 * 3_600_000); let m = d.getUTCHours() * 60 + d.getUTCMinutes(); if (m < 12 * 60) m += 24 * 60; return m; });
    const avg = mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : 22 * 60 + 30;
    const base = Date.parse(acreDateKey() + "T00:00:00-05:00");
    let at = base + avg * 60_000;
    if (Date.now() > at + 3 * 3_600_000) at += 86_400_000;
    return at;
  })();
  const field = "mt-1 block h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm";

  return <div className="flex flex-col gap-3">
    {!remote && loaded && <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">Modo local: seus registros de sono ficam neste navegador até a atualização do banco ser aplicada.</p>}

    <div className="grid gap-3 xl:grid-cols-[1.25fr_1fr]">
      <section className="nv-dark relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#120d3a] via-[#1e1b4b] to-[#3b1d6e] p-4 text-white shadow-card sm:p-5" aria-label="Resumo do sono">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-amber-100/10 shadow-[inset_-18px_-6px_0_rgba(255,255,255,.08)]"/>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: "radial-gradient(1.5px 1.5px at 12% 22%, #fff, transparent), radial-gradient(1px 1px at 38% 12%, #fff, transparent), radial-gradient(1.5px 1.5px at 64% 30%, #fff, transparent), radial-gradient(1px 1px at 84% 16%, #fff, transparent), radial-gradient(1px 1px at 74% 62%, #fff, transparent), radial-gradient(1.5px 1.5px at 22% 70%, #fff, transparent)" }}/>
        <div className="relative flex flex-wrap items-center gap-5">
          <ScoreRing score={focus ? sleepScore(focus) : 0}/>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-white/70">{selected ? "Noite selecionada" : "Última noite"}{focus ? ` · ${short(focus.sleep_date)}` : ""}</p>
            <p className="mt-1 text-4xl font-extrabold tabular-nums">{focus ? hm(hours(focus)) : "—"}<span className="ml-2 text-base font-semibold text-white/70">de sono</span></p>
            {focus && <NightBar log={focus}/>}
            {focus && <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
              {[[Moon, "Dormiu", clock(focus.bed_at)], [Sunrise, "Acordou", clock(focus.wake_at)], [AlarmClock, "Despertares", String(focus.awakenings)], ...(focus.avg_hr ? [[HeartPulse, "FC média", `${focus.avg_hr} bpm`]] : [])].map(([Icon, label, value]: any) =>
                <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1"><Icon size={12} className="text-white/70"/><span className="text-white/70">{label}</span><strong className="tabular-nums">{value}</strong></span>)}
            </div>}
            <p className="mt-3 flex gap-2 rounded-xl bg-white/10 p-3 text-sm"><Lightbulb size={17} className="mt-0.5 shrink-0 text-amber-300"/>{tip}</p>
            <NextUpClock className="mt-3" alertKey="sono" title="Hora de desacelerar" color="#c4b5fd" target={bedTarget - 30 * 60_000} from={bedTarget - 4 * 3_600_000}
              detail={`dormir às ${clock(new Date(bedTarget).toISOString())}`} actionLabel="Vou dormir" onAction={deviceName ? startNight : undefined}/>
            <a href="#nv-sleep-form" className="nv-bump mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-indigo-950 shadow-sm transition hover:bg-white/90 active:scale-[.97]"><BedDouble size={17}/> Registrar noite</a>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5" aria-label="Sensor em tempo real">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-lg font-bold"><HeartPulse size={20} className="text-rose-500"/> Sensor em tempo real</h3>
          {deviceName ? <button type="button" onClick={disconnect} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-bold hover:bg-muted"><BluetoothOff size={16}/> Desconectar</button>
            : <button type="button" onClick={() => void connect()} disabled={!bluetooth} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-500 px-4 text-sm font-bold text-white shadow-sm hover:brightness-110 disabled:opacity-50"><Bluetooth size={16}/> Conectar sensor</button>}
        </div>
        {!bluetooth ? <p className="mt-3 rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">Este navegador não oferece Bluetooth para sites. Use o Chrome ou o Edge no Android ou no computador. No iPhone, registre a noite manualmente.</p>
          : !deviceName ? <p className="mt-3 text-sm text-muted-foreground">Conecte uma cinta, pulseira ou relógio que transmita frequência cardíaca por Bluetooth (padrão "Heart Rate"). Os batimentos aparecem aqui ao vivo e entram no registro da noite.</p>
          : <>
            <div className="mt-3 flex items-end gap-3">
              <span className="relative grid size-16 place-items-center"><span className="absolute inset-0 animate-ping rounded-full bg-rose-500/30" style={{ animationDuration: bpm ? `${Math.max(0.35, 60 / bpm)}s` : "1s" }}/><HeartPulse size={34} className="relative text-rose-500"/></span>
              <p className="text-5xl font-extrabold tabular-nums leading-none">{bpm ?? "—"}<span className="ml-1 text-base font-semibold text-muted-foreground">bpm</span></p>
              <span className="ml-auto text-right text-xs text-muted-foreground">{deviceName}<br/>{samples.length} leituras</span>
            </div>
            <div className="mt-2 h-24"><ResponsiveContainer width="100%" height="100%"><AreaChart data={samples} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs><linearGradient id="hrFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" stopOpacity={0.45}/><stop offset="100%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient></defs>
              <YAxis hide domain={["dataMin - 5", "dataMax + 5"]}/><Area type="monotone" dataKey="bpm" stroke="#f43f5e" strokeWidth={2.5} fill="url(#hrFill)" isAnimationActive={false}/></AreaChart></ResponsiveContainer></div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {session ? <button type="button" onClick={endNight} className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-bold text-slate-950"><Sunrise size={17}/> Acordei · encerrar noite</button>
                : <button type="button" onClick={startNight} className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-500 px-4 text-sm font-bold text-white"><Moon size={17}/> Vou dormir · iniciar noite</button>}
              {session && <span className="text-sm text-muted-foreground">Monitorando desde {clock(new Date(session.start).toISOString())}{session.count ? ` · média ${Math.round(session.sum / session.count)} bpm · mínima ${session.min}` : ""}</span>}
            </div>
          </>}
      </section>
    </div>

    <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5" aria-label="Evolução do sono">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto"><h3 className="text-lg font-bold">Evolução do sono</h3><p className="text-sm text-muted-foreground">Horas dormidas e nota de cada noite. Toque em uma barra para ver os detalhes.</p></div>
        <div role="group" aria-label="Período" className="flex gap-1 rounded-xl bg-muted p-1">{([7, 14, 30] as const).map(v => <button key={v} type="button" aria-pressed={range === v} onClick={() => setRange(v)} className={`h-9 rounded-lg px-3 text-sm font-semibold ${range === v ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{v} dias</button>)}</div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[["Média por noite", avgHours ? hm(avgHours) : "—", `meta ${GOAL_HOURS}h`], ["Nota média", avgScore ? String(avgScore) : "—", avgScore ? scoreLabel(avgScore) : "sem registros"], ["Regularidade", regularity === null ? "—" : `±${regularity} min`, "variação do horário de dormir"], ["Débito de sono", debt ? hm(debt) : "0h00", `em ${range} dias`]]
          .map(([label, value, note]) => <div key={label} className="rounded-2xl bg-muted/50 p-3"><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="text-xl font-extrabold tabular-nums">{value}</p><p className="truncate text-xs text-muted-foreground">{note}</p></div>)}
      </div>
      <div className="mt-3 h-[280px]">
        {!loaded ? <div className="h-full animate-pulse rounded-2xl bg-muted/60"/> : windowLogs.length === 0 ? <div className="grid h-full place-items-center rounded-2xl border border-dashed border-border text-center text-sm text-muted-foreground"><span><BedDouble className="mx-auto mb-2 text-indigo-500" size={28}/>Nenhuma noite registrada neste período.</span></div>
          : <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart} margin={{ top: 10, right: 0, left: -18, bottom: 0 }} onClick={(state: any) => { const row = chart.find(c => c.day === state?.activeLabel); if (row?.log) setSelected(row.day); }}>
              <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="currentColor" className="text-border"/>
              <XAxis dataKey="day" tickFormatter={short} tick={{ fontSize: 12, fill: "currentColor" }} className="text-muted-foreground" tickLine={false} axisLine={false} minTickGap={14}/>
              <YAxis yAxisId="h" domain={[0, 10]} unit="h" tick={{ fontSize: 12, fill: "currentColor" }} className="text-muted-foreground" tickLine={false} axisLine={false}/>
              <YAxis yAxisId="s" orientation="right" domain={[0, 100]} tick={{ fontSize: 12, fill: "currentColor" }} className="text-muted-foreground" tickLine={false} axisLine={false} width={34}/>
              <Tooltip cursor={{ fill: "#6366f1", fillOpacity: 0.08 }} content={({ active, payload, label }) => { const row = payload?.[0]?.payload; if (!active || !row?.log) return null;
                return <div className="rounded-2xl border border-border bg-card/95 px-3.5 py-2.5 text-sm shadow-pop backdrop-blur"><p className="font-bold">{short(String(label))}</p><p>Sono: <strong>{hm(row.hours)}</strong></p><p>Nota: <strong>{row.score}</strong> · {scoreLabel(row.score)}</p><p className="text-xs text-muted-foreground">{clock(row.log.bed_at)} → {clock(row.log.wake_at)}</p></div>; }}/>
              <ReferenceLine yAxisId="h" y={GOAL_HOURS} stroke="#6366f1" strokeDasharray="6 5" label={{ value: `Meta ${GOAL_HOURS}h`, position: "insideTopLeft", fontSize: 11, fontWeight: 700, fill: "#6366f1" }}/>
              <Bar yAxisId="h" dataKey="hours" radius={[8, 8, 8, 8]} maxBarSize={34} cursor="pointer">{chart.map(row => <Cell key={row.day} fill={row.score === null ? "transparent" : scoreColor(row.score)} fillOpacity={selected && selected !== row.day ? 0.45 : 0.95}/>)}</Bar>
              <Line yAxisId="s" dataKey="score" type="monotone" stroke="#a78bfa" strokeWidth={3} connectNulls dot={{ r: 3, fill: "#fff", stroke: "#a78bfa", strokeWidth: 2 }}/>
            </ComposedChart>
          </ResponsiveContainer>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {[["#10b981", "Excelente"], ["#6366f1", "Bom"], ["#f59e0b", "Regular"], ["#ef4444", "Atenção"]].map(([c, l]) => <span key={l} className="inline-flex items-center gap-1.5"><i className="size-3 rounded" style={{ background: c }}/>{l}</span>)}
        <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4 rounded bg-violet-400"/>Nota</span>
        {selected && <button type="button" onClick={() => setDetail(selected)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 font-semibold text-white hover:brightness-110">Ver dia completo</button>}
        {selected && focus && <button type="button" onClick={() => void remove(focus)} className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 font-semibold text-destructive hover:bg-destructive/10"><Trash2 size={13}/> Excluir noite de {short(focus.sleep_date)}</button>}
      </div>
    </section>

    <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5" id="nv-sleep-form" aria-label="Registrar noite" data-register-target="Registrar noite">
      <h3 className="flex items-center gap-2 text-lg font-bold"><Sparkles size={20} className="text-indigo-500"/> Registrar noite de sono</h3>
      <div className="mt-3 grid gap-3 text-sm font-semibold sm:grid-cols-2 lg:grid-cols-4">
        <label>Fui dormir<input type="datetime-local" className={field} value={bed} onChange={e => setBed(e.target.value)}/></label>
        <label>Acordei<input type="datetime-local" className={field} value={wake} onChange={e => setWake(e.target.value)}/></label>
        <label>Despertares na noite<input type="number" min={0} max={30} className={field} value={awakenings} onChange={e => setAwakenings(Math.max(0, Math.min(30, Number(e.target.value))))}/></label>
        <div>Qualidade percebida<div className="mt-1 flex h-11 items-center gap-1" role="group" aria-label="Qualidade de 1 a 5">{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" aria-pressed={quality >= n} aria-label={`${n} de 5`} onClick={() => setQuality(n)} className="grid size-10 place-items-center rounded-lg hover:bg-muted"><Star size={24} className={quality >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}/></button>)}</div></div>
        <label className="sm:col-span-2 lg:col-span-3">Observações<input className={field} maxLength={300} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex.: café à noite, treino tarde, quarto quente"/></label>
        <button type="button" onClick={() => void save()} className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-xl bg-gradient-to-r from-indigo-600 to-violet-500 text-sm font-bold text-white shadow-sm hover:brightness-110"><Save size={17}/> Salvar noite</button>
      </div>
      {sensorHr && <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-700 dark:text-rose-300">Dados do sensor nesta noite: média {sensorHr.avg} bpm, mínima {sensorHr.min} bpm. Serão salvos junto com o registro.</p>}
      {message && <p role="status" className={`mt-3 rounded-xl px-3 py-2 text-sm font-medium ${message.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 text-destructive"}`}>{message.text}</p>}
      <p className="mt-3 text-xs text-muted-foreground">A nota do sono é uma estimativa educativa (duração, qualidade percebida e despertares). Não substitui avaliação médica nem exame do sono.</p>
    </section>
    <DayDetailDialog patientId={patientId} ownerId={ownerId} focus="sono" day={detail} onClose={() => setDetail(null)} />
  </div>;
}
