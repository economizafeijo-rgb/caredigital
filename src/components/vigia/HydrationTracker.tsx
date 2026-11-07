import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Droplets } from "lucide-react";
import { Panel, SelectField, Tag } from "@/components/vigia/ui";
import { HydrationPersonalPlan } from "./HydrationPersonalPlan";
import { acreAddDays, acreDateAtTime, acreDateKey, acreTimeLabel } from "@/lib/acre-time";

const STORAGE_KEY = "vigia-hydration-v1";
const goals = [
  { id: "hipertrofia", title: "Hipertrofia", note: "Distribua lembretes ao longo do dia e ajuste em torno do treino conforme sede, calor e suor. Hipertrofia não determina, sozinha, uma meta maior de água." },
  { id: "emagrecimento", title: "Emagrecimento", note: "Água pode ser uma bebida sem calorias no lugar de bebidas açucaradas. Não substitui alimentação equilibrada e não exige beber além da sede." },
  { id: "ganho-de-peso", title: "Aumento de peso", note: "Organize goles entre refeições se isso ajudar na rotina. A meta de água não precisa aumentar só por buscar ganho de peso." },
] as const;

type HydrationLog = { at: string; amountMl: number; scheduledAt?: string };
type HydrationData = {
  day: string;
  targetMl: number;
  intervalMinutes: number;
  wakeTime: string;
  sleepTime: string;
  objective: string;
  intakeMl: number;
  logs: HydrationLog[];
  nextReminderAt: number;
};

function dayKey(date = new Date()) {
  return acreDateKey(date);
}

function timeOnDate(value: string, date: Date) {
  return acreDateAtTime(dayKey(date), value);
}

function nextReminder(from: Date, wakeTime: string, sleepTime: string, intervalMinutes: number) {
  const today = dayKey(from);
  const wake = timeOnDate(wakeTime, from);
  const sleep = timeOnDate(sleepTime, from);
  const intervalMs = intervalMinutes * 60_000;
  if (from < wake) return wake.getTime();
  if (from >= sleep) return acreDateAtTime(acreAddDays(today, 1), wakeTime).getTime();
  const elapsed = from.getTime() - wake.getTime();
  const due = new Date(wake.getTime() + (Math.floor(elapsed / intervalMs) + 1) * intervalMs);
  return due <= sleep ? due.getTime() : acreDateAtTime(acreAddDays(today, 1), wakeTime).getTime();
}

function defaults(now = new Date()): HydrationData {
  return { day: dayKey(now), targetMl: 2000, intervalMinutes: 90, wakeTime: "07:00", sleepTime: "22:00", objective: "hipertrofia", intakeMl: 0, logs: [], nextReminderAt: nextReminder(now, "07:00", "22:00", 90) };
}

function loadSaved(): HydrationData {
  const now = new Date();
  const fresh = defaults(now);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw) as Partial<HydrationData>;
    if (saved.day !== dayKey(now)) return { ...fresh, targetMl: saved.targetMl ?? fresh.targetMl, intervalMinutes: saved.intervalMinutes ?? fresh.intervalMinutes, wakeTime: saved.wakeTime ?? fresh.wakeTime, sleepTime: saved.sleepTime ?? fresh.sleepTime, objective: saved.objective ?? fresh.objective };
    return { ...fresh, ...saved, logs: Array.isArray(saved.logs) ? saved.logs : [] };
  } catch { return fresh; }
}

type HydrationContextValue = {
  data: HydrationData;
  ready: boolean;
  due: boolean;
  now: Date;
  setSettings: (patch: Partial<Pick<HydrationData, "targetMl" | "intervalMinutes" | "wakeTime" | "sleepTime" | "objective">>) => void;
  addWater: (amountMl: number, scheduledAt?: string) => void;
  snooze: () => void;
  enableNotifications: () => Promise<boolean>;
};
const HydrationContext = createContext<HydrationContextValue | null>(null);

export function HydrationProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(defaults);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(new Date());
  const alertedAt = useRef(0);

  useEffect(() => { setData(loadSaved()); setReady(true); }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, ready]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setInterval(() => {
      const current = new Date();
      setNow(current);
      setData((previous) => {
        if (previous.day !== dayKey(current)) return { ...previous, day: dayKey(current), intakeMl: 0, logs: [], nextReminderAt: nextReminder(current, previous.wakeTime, previous.sleepTime, previous.intervalMinutes) };
        const wake = timeOnDate(previous.wakeTime, current);
        const sleep = timeOnDate(previous.sleepTime, current);
        if (current < wake || current >= sleep) return previous.nextReminderAt <= current.getTime()
          ? { ...previous, nextReminderAt: nextReminder(current, previous.wakeTime, previous.sleepTime, previous.intervalMinutes) }
          : previous;
        if (previous.nextReminderAt > current.getTime()) return previous;
        if (alertedAt.current !== previous.nextReminderAt) {
          alertedAt.current = previous.nextReminderAt;
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Hora de se hidratar", { body: `Pausa para beber água. Registro de hoje: ${previous.intakeMl} de ${previous.targetMl} ml.` });
          }
        }
        return previous;
      });
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [ready]);

  const value = useMemo<HydrationContextValue>(() => ({
    data, ready, now, due: ready && data.nextReminderAt <= now.getTime(),
    setSettings: (patch) => setData((previous) => {
      const updated = { ...previous, ...patch };
      if (timeOnDate(updated.wakeTime, new Date()).getTime() >= timeOnDate(updated.sleepTime, new Date()).getTime()) return previous;
      return { ...updated, nextReminderAt: nextReminder(new Date(), updated.wakeTime, updated.sleepTime, updated.intervalMinutes) };
    }),
    addWater: (amountMl, scheduledAt) => setData((previous) => {
      const current = new Date();
      const today = dayKey(current);
      const base = previous.day === today ? previous : { ...previous, day: today, intakeMl: 0, logs: [] };
      return { ...base, intakeMl: base.intakeMl + amountMl, logs: [{ at: current.toISOString(), amountMl, ...(scheduledAt ? {scheduledAt} : {}) }, ...base.logs].slice(0, 100), nextReminderAt: nextReminder(current, base.wakeTime, base.sleepTime, base.intervalMinutes) };
    }),
    snooze: () => setData((previous) => ({ ...previous, nextReminderAt: Date.now() + 15 * 60_000 })),
    enableNotifications: async () => {
      if (!("Notification" in window)) return false;
      return (await Notification.requestPermission()) === "granted";
    },
  }), [data, ready, now]);

  return <HydrationContext.Provider value={value}>{children}</HydrationContext.Provider>;
}

export function useHydration() {
  const context = useContext(HydrationContext);
  if (!context) throw new Error("HydrationProvider ausente");
  return context;
}

function timeLabel(timestamp: number) {
  return acreTimeLabel(timestamp);
}

function countdown(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function HydrationReminder() {
  const { data, ready, due, now, addWater, snooze } = useHydration();
  if (!ready) return null;
  const seconds = Math.ceil((data.nextReminderAt - now.getTime()) / 1000);
  return <aside className={`fixed bottom-20 left-2 right-2 z-40 rounded-xl border p-2 shadow-xl backdrop-blur-xl md:bottom-4 md:left-auto md:right-4 md:w-[20rem] md:rounded-xl md:px-3 md:py-2 ${due ? "border-primary/50 bg-background/95" : "border-border bg-background/90"}`} aria-live="polite">
    <div className="flex items-center justify-between gap-2 md:hidden">
      <div className="flex min-w-0 items-center gap-2"><Droplets size={16} className="shrink-0 text-primary" /><span className="text-xs font-semibold">{due ? "Hora de beber água" : countdown(seconds)}</span><span className="truncate text-[11px] text-muted-foreground">{data.intakeMl}/{data.targetMl} ml</span></div>
      <button type="button" onClick={() => addWater(200)} className="shrink-0 rounded-lg bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground">+200 ml</button>
    </div>
    <div className="hidden items-center gap-2 md:flex">
      <Droplets size={16} className="shrink-0 text-primary" />
      <div className="min-w-0 flex-1"><div className="text-xs font-semibold">Água · {data.intakeMl} ml</div><div className="text-[10px] text-muted-foreground">{due ? "Hora de beber água" : `Próximo em ${countdown(seconds)}`} · meta {data.targetMl} ml</div></div>
      <button type="button" onClick={() => addWater(200)} className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground">+200 ml</button>
      <Link to="/hidratacao" aria-label="Abrir hidratação" className="shrink-0 text-xs font-semibold text-primary underline">Ver</Link>
    </div>
  </aside>;
}

export function HydrationDashboard() {
  const { data, ready, due, now, setSettings, addWater, enableNotifications } = useHydration();
  const objective = goals.find((item) => item.id === data.objective) ?? goals[0];
  const [confirmSlot,setConfirmSlot] = useState<{scheduledAt:string;amount:number}|null>(null);
  const toleranceMs = 20*60*1000;
  const [customMl,setCustomMl]=useState("400");
  const [freeConfirm,setFreeConfirm]=useState(false);
  const [notice,setNotice]=useState("");
  const validMl=(ml:number)=>Number.isInteger(ml)&&ml>=10&&ml<=1500;
  const register=(ml:number,slot?:string)=>{if(!validMl(ml))return;addWater(ml,slot);setNotice(ml+" ml registrados com o horário atual.");setConfirmSlot(null);setFreeConfirm(false);};
  const totalMinutes = Math.max(1, (timeOnDate(data.sleepTime, now).getTime() - timeOnDate(data.wakeTime, now).getTime()) / 60_000);
  const reminderCount = Math.max(1, Math.floor(totalMinutes / data.intervalMinutes) + 1);
  const portionMl = Math.round(data.targetMl / reminderCount / 25) * 25;
  const percent = Math.min(100, Math.round((data.intakeMl / data.targetMl) * 100));
  const schedule = Array.from({ length: reminderCount }, (_, index) => {
    const start = timeOnDate(data.wakeTime, now);
    const at = new Date(start.getTime() + index * data.intervalMinutes * 60_000);
    return { at, amount: portionMl };
  }).filter((item) => item.at <= timeOnDate(data.sleepTime, now));

  if (!ready) return <p className="rounded-xl bg-foreground/5 p-4 text-sm text-muted-foreground">Carregando seu cronograma salvo neste dispositivo…</p>;

  return <div className="space-y-4">
    <section aria-label="Registro rápido de hidratação" className="rounded-2xl border border-primary/40 bg-primary/10 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-base font-bold">Confirmar água bebida</h2><p className="text-xs text-muted-foreground">Escolha a quantidade realmente consumida. O total será atualizado automaticamente.</p></div><span className="rounded-lg bg-background px-3 py-2 text-xs font-bold">{data.intakeMl} / {data.targetMl} ml</span></div>
      <div className="mt-3 flex flex-wrap items-end gap-2">{[200,300,400,500].map(ml=><button key={ml} type="button" onClick={()=>{setCustomMl(String(ml));setFreeConfirm(true)}} className="rounded-lg border border-primary/30 bg-background px-3 py-2 text-sm font-semibold hover:bg-primary/10">{ml} ml</button>)}<label className="text-xs font-semibold">Outra quantidade<input aria-label="Quantidade de água em ml" type="number" inputMode="numeric" min="10" max="1500" value={customMl} onChange={e=>setCustomMl(e.target.value)} className="mt-1 block w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm"/></label><button type="button" disabled={!validMl(Number(customMl))} onClick={()=>setFreeConfirm(true)} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">Confirmar água</button></div>
      {freeConfirm&&<div role="dialog" aria-label="Confirmar ingestão" className="mt-3 rounded-xl border border-primary/30 bg-background p-3"><p className="text-sm font-semibold">Você bebeu {customMl} ml agora?</p><p className="mt-1 text-xs text-muted-foreground">O horário real será registrado. Isso não confirma automaticamente um copo programado.</p><div className="mt-3 flex gap-2"><button type="button" disabled={!validMl(Number(customMl))} onClick={()=>register(Number(customMl))} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40">Sim, bebi agora</button><button type="button" onClick={()=>setFreeConfirm(false)} className="rounded-lg border px-4 py-2 text-xs">Cancelar</button></div></div>}
      {notice&&<p role="status" className="mt-2 text-xs font-medium text-primary">{notice}</p>}
    </section>
    <HydrationPersonalPlan currentTarget={data.targetMl} onApply={(targetMl)=>setSettings({targetMl})}/>
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5"><div className="label-mono text-primary">Plano diário · sincronizado neste navegador</div><h2 className="mt-2 font-display text-3xl tracking-tight">Água ao longo do seu dia</h2><p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground">Configure sua meta pessoal, janela do dia e intervalo. O objetivo ajuda a organizar os lembretes, mas não define sozinho a quantidade de água. O cronômetro permanece ativo ao navegar pelo app e salva registros/configurações neste dispositivo; para alertas do navegador, permita notificações e mantenha o app aberto.</p></div>

    <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
      <Panel title="Configurar rotina">
      <label className="mb-4 block"><span className="label-mono mb-1.5 block text-[10px] text-muted-foreground">Objetivo atual</span><SelectField value={data.objective} onValueChange={(objective) => setSettings({ objective })} options={[{ value: "hipertrofia", label: "Hipertrofia / ganho de massa" }, { value: "emagrecimento", label: "Emagrecimento" }, { value: "ganho-de-peso", label: "Aumento de peso" }]} /></label>
        <label className="mb-4 block"><span className="label-mono mb-1.5 block text-[10px] text-muted-foreground">Meta diária pessoal (ml) · definida com sua equipe</span><input type="number" min="250" max="6000" step="50" value={data.targetMl} onChange={(e) => setSettings({ targetMl: Math.min(6000, Math.max(250, Number(e.target.value) || 250)) })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="label-mono mb-1.5 block text-[10px] text-muted-foreground">Acordar</span><input type="time" value={data.wakeTime} onChange={(e) => setSettings({ wakeTime: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
          <label className="block"><span className="label-mono mb-1.5 block text-[10px] text-muted-foreground">Encerrar</span><input type="time" value={data.sleepTime} onChange={(e) => setSettings({ sleepTime: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
        </div>
        <label className="mt-4 block"><span className="label-mono mb-1.5 block text-[10px] text-muted-foreground">Lembrete a cada · minutos</span><SelectField value={String(data.intervalMinutes)} onValueChange={(interval) => setSettings({ intervalMinutes: Number(interval) })} options={[{ value: "45", label: "45 minutos" }, { value: "60", label: "60 minutos" }, { value: "90", label: "90 minutos" }, { value: "120", label: "120 minutos" }]} /></label>
        <p className="mt-4 rounded-xl bg-foreground/5 p-3 text-xs leading-relaxed text-muted-foreground">{objective.note}</p>
        <button type="button" onClick={() => void enableNotifications()} className="mt-4 w-full rounded-lg bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground">Ativar notificações do navegador</button>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">O lembrete na tela funciona enquanto o app está aberto. O navegador pode suspender ou não entregar avisos se a página for fechada, se o sistema bloquear notificações ou se a economia de bateria estiver ativa.</p>
      </Panel>

      <div className="space-y-5">
        <Panel title="Progresso de hoje" action={<Tag tone={due ? "warning" : "primary"}>{due ? "Lembrete pendente" : `Próximo · ${timeLabel(data.nextReminderAt)}`}</Tag>}>
          <div className="flex items-end justify-between gap-4"><div><div className="font-display text-5xl">{(data.intakeMl / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}<span className="text-2xl"> L</span></div><div className="mt-1 text-sm text-muted-foreground">de {(data.targetMl / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L de meta configurada</div></div><div className="font-mono text-2xl text-primary">{percent}%</div></div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-foreground/10"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} /></div>
          <div className="mt-4 flex flex-wrap gap-2">{[150,200,250,350,400,500].map(amount=><button key={amount} type="button" onClick={()=>{setCustomMl(String(amount));setFreeConfirm(true)}} className="rounded-lg bg-foreground/5 px-3 py-2 text-sm font-semibold hover:bg-foreground/10">{amount} ml</button>)}</div>
          <div className="mt-3 flex flex-wrap items-end gap-2"><label className="text-xs font-semibold">Outra quantidade (ml)<input type="number" inputMode="numeric" min="10" max="1500" step="1" value={customMl} onChange={e=>setCustomMl(e.target.value)} className="mt-1 block w-36 rounded-lg border border-border bg-background px-3 py-2 text-sm"/></label><button type="button" disabled={!validMl(Number(customMl))} onClick={()=>setFreeConfirm(true)} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40">Registrar quantidade</button></div>
          {freeConfirm&&<div role="dialog" aria-label="Confirmar água consumida" className="mt-3 rounded-xl border border-primary/30 bg-background p-3"><p className="text-sm font-semibold">Você bebeu {customMl} ml agora?</p><p className="mt-1 text-xs text-muted-foreground">Consumo livre não confirma automaticamente um copo programado.</p><div className="mt-3 flex gap-2"><button type="button" disabled={!validMl(Number(customMl))} onClick={()=>register(Number(customMl))} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40">Sim, bebi agora</button><button type="button" onClick={()=>setFreeConfirm(false)} className="rounded-lg border px-3 py-2 text-xs">Cancelar</button></div></div>}{notice&&<p role="status" className="mt-2 text-xs text-primary">{notice}</p>}
        </Panel>

        <Panel title="Roteiro guiado de hidratação" action={<Tag tone={due?"warning":"primary"}>{due?"Pausa sugerida":"Rotina de hoje"}</Tag>}>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">Guia visual flexível, não prescrição: horários e porções sugeridos com base na sua meta e no período acordado. Marque apenas o volume realmente bebido; horários perdidos não exigem compensação rápida.</p>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-muted p-2.5"><p className="text-[10px] text-muted-foreground">Meta do dia</p><p className="mt-1 text-base font-bold tabular-nums">{data.targetMl} ml</p></div>
            <div className="rounded-xl bg-muted p-2.5"><p className="text-[10px] text-muted-foreground">Já registrado</p><p className="mt-1 text-base font-bold tabular-nums text-success">{data.intakeMl} ml</p></div>
            <div className="rounded-xl bg-muted p-2.5"><p className="text-[10px] text-muted-foreground">Restante</p><p className="mt-1 text-base font-bold tabular-nums">{Math.max(0,data.targetMl-data.intakeMl)} ml</p></div>
          </div>
          <ol className="max-h-[390px] space-y-2 overflow-y-auto pr-1">
            {schedule.map((item,index)=>{
              const scheduledPassed=item.at.getTime()<=now.getTime();
              const slotConfirmed=data.logs.some(log=>log.scheduledAt===item.at.toISOString());
              const slotExpired=now.getTime()>item.at.getTime()+toleranceMs;
              const slotOpen=scheduledPassed&&!slotExpired&&!slotConfirmed;
              const nextSlot= index===schedule.length-1 ? null : schedule[index+1]?.at;
              const currentSlot=scheduledPassed&&(!nextSlot||nextSlot.getTime()>now.getTime());
              const suggestedCumulative=Math.min(data.targetMl,Math.round((index+1)*data.targetMl/schedule.length));
              const copy=index===0?"Ao acordar":index===schedule.length-1?"Fim da rotina":index<schedule.length/3?"Durante a manhã":index<schedule.length*2/3?"Ao longo do dia":"Fim da tarde/noite";
              return <li key={item.at.toISOString()} className={`flex items-center gap-3 rounded-xl border p-2.5 sm:p-3 ${currentSlot?"border-primary/60 bg-primary/10":"border-border bg-background/70"}`}>
                <div className="relative flex w-12 shrink-0 flex-col items-center gap-1">
                  <svg viewBox="0 0 46 56" className="h-12 w-10" role="img" aria-label="Ilustração de copo de água"><path d="M8 6h30l-4 42a7 7 0 0 1-7 6h-8a7 7 0 0 1-7-6z" fill="none" stroke="currentColor" strokeOpacity=".5" strokeWidth="2.5"/><path d="M11 25q11-4 24 0l-2 21q-1 6-7 6h-6q-6 0-7-6z" fill="#58bcdf" fillOpacity=".75"/><path d="M12 21h23" stroke="#a5daec" strokeWidth="2"/></svg>
                  <span className="text-[10px] font-bold text-muted-foreground">{index+1}/{schedule.length}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><time className="text-sm font-bold tabular-nums text-foreground">{acreTimeLabel(item.at)}</time>{slotConfirmed?<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">Confirmado</span>:slotExpired?<span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">Não confirmado</span>:slotOpen?<span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">Confirmar · tolerância 20 min</span>:<span className="text-[10px] text-muted-foreground">Programado</span>}</div>
                  <p className="mt-0.5 text-xs font-medium">{copy}</p>
                  <p className="text-[11px] text-muted-foreground">Porção sugerida ~{Math.round(data.targetMl/schedule.length/25)*25} ml · referência acumulada {suggestedCumulative} ml</p>
                  {scheduledPassed&&<p className="mt-0.5 text-[10px] text-muted-foreground">Volume real do dia: {data.intakeMl} ml (não atribuído automaticamente a esta etapa).</p>}
                </div>
                <button type="button" onClick={()=>setConfirmSlot({scheduledAt:item.at.toISOString(),amount:Math.max(50,Math.round(data.targetMl/schedule.length/50)*50)})} disabled={!slotOpen} aria-label={`Confirmar água bebida na etapa das ${acreTimeLabel(item.at)}`} className="shrink-0 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-2 text-xs font-semibold text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40">{slotConfirmed?"Registrado":slotExpired?"Expirado":!scheduledPassed?"Aguardar":"Confirmar"} · {Math.max(50,Math.round(data.targetMl/schedule.length/50)*50)} ml</button>
              </li>;
            })}
          </ol>
          <p className="mt-3 text-[11px] text-muted-foreground">Cada horário pode ser confirmado durante 20 minutos após o início. Após esse período, fica como não confirmado, sem presumir que você não bebeu. Para registrar água realmente consumida fora do cronograma, use o registro livre acima.</p>
          {confirmSlot&&<div role="dialog" aria-modal="true" aria-label="Confirmar copo de água" className="mt-3 rounded-xl border border-primary/30 bg-background p-4 shadow-lg"><p className="font-semibold">Quanto você bebeu neste horário?</p><label className="mt-2 flex items-center gap-2 text-xs"><input type="number" inputMode="numeric" min="10" max="1500" step="1" value={confirmSlot.amount} onChange={e=>setConfirmSlot({...confirmSlot,amount:Number(e.target.value)})} className="w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm"/> ml</label><p className="mt-1 text-xs text-muted-foreground">Horário previsto: {acreTimeLabel(confirmSlot.scheduledAt)}. O horário real da confirmação será registrado.</p><div className="mt-3 flex gap-2"><button type="button" className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40" disabled={!validMl(confirmSlot.amount)} onClick={()=>{const start=Date.parse(confirmSlot.scheduledAt);if(Date.now()>=start&&Date.now()<=start+toleranceMs&&!data.logs.some(log=>log.scheduledAt===confirmSlot.scheduledAt)){register(confirmSlot.amount,confirmSlot.scheduledAt)}else{setNotice("Etapa encerrada ou já confirmada. Use o registro livre para consumo fora do horário.");setConfirmSlot(null)}}}>Sim, bebi agora</button><button type="button" className="rounded-lg border px-4 py-2 text-xs" onClick={()=>setConfirmSlot(null)}>Cancelar</button></div></div>}
        </Panel>
      </div>
    </div>

    <Panel title="Seu registro de hoje">
      {data.logs.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma ingestão registrada hoje. Use os botões acima para acompanhar o que bebeu.</p> : <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{data.logs.map((log, index) => <li key={`${log.at}-${index}`} className="flex justify-between rounded-lg bg-foreground/5 p-3 text-sm"><time className="font-mono text-muted-foreground">{acreTimeLabel(log.at)}</time><strong>{log.amountMl} ml</strong></li>)}</ol>}
    </Panel>

    <p className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-xs leading-relaxed">Referências populacionais para adultos estimam água total em torno de 2,7 L/dia para mulheres e 3,7 L/dia para homens, contando água dos alimentos e todas as bebidas; isso não é uma meta individual de água pura. Calor, exercício e doenças podem alterar a necessidade. Não force grandes volumes nem tente compensar rapidamente. Doença renal ou cardíaca, gravidez, amamentação, diarreia/vômitos ou restrição médica exigem meta profissional individualizada. <a href="https://www.nationalacademies.org/read/10925/chapter/6" target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">National Academies</a> · <a href="https://www.cdc.gov/healthy-weight-growth/water-healthy-drinks/index.html" target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">CDC</a> · <a href="https://pubmed.ncbi.nlm.nih.gov/17277604/" target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">ACSM — exercício e reposição de líquidos</a></p>
  </div>;
}
