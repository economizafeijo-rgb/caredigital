import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Panel, Tag } from "@/components/vigia/ui";

const STORAGE_KEY = "vigia-hydration-v1";
const goals = [
  { id: "hipertrofia", title: "Hipertrofia", note: "Distribua lembretes ao longo do dia e ajuste em torno do treino conforme sede, calor e suor. Hipertrofia não determina, sozinha, uma meta maior de água." },
  { id: "emagrecimento", title: "Emagrecimento", note: "Água pode ser uma bebida sem calorias no lugar de bebidas açucaradas. Não substitui alimentação equilibrada e não exige beber além da sede." },
  { id: "ganho-de-peso", title: "Aumento de peso", note: "Organize goles entre refeições se isso ajudar na rotina. A meta de água não precisa aumentar só por buscar ganho de peso." },
] as const;

type HydrationLog = { at: string; amountMl: number };
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
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function timeOnDate(value: string, date: Date) {
  const [hours, minutes] = value.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours || 0, minutes || 0, 0, 0);
  return result;
}

function nextReminder(from: Date, wakeTime: string, sleepTime: string, intervalMinutes: number) {
  const wake = timeOnDate(wakeTime, from);
  const sleep = timeOnDate(sleepTime, from);
  const intervalMs = intervalMinutes * 60_000;
  if (from < wake) return wake.getTime();
  if (from >= sleep) {
    const tomorrow = new Date(from);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return timeOnDate(wakeTime, tomorrow).getTime();
  }
  const elapsed = from.getTime() - wake.getTime();
  const due = new Date(wake.getTime() + (Math.floor(elapsed / intervalMs) + 1) * intervalMs);
  return due <= sleep ? due.getTime() : timeOnDate(wakeTime, new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1)).getTime();
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
  addWater: (amountMl: number) => void;
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
    addWater: (amountMl) => setData((previous) => {
      const current = new Date();
      const today = dayKey(current);
      const base = previous.day === today ? previous : { ...previous, day: today, intakeMl: 0, logs: [] };
      return { ...base, intakeMl: base.intakeMl + amountMl, logs: [{ at: current.toISOString(), amountMl }, ...base.logs].slice(0, 100), nextReminderAt: nextReminder(current, base.wakeTime, base.sleepTime, base.intervalMinutes) };
    }),
    snooze: () => setData((previous) => ({ ...previous, nextReminderAt: Date.now() + 15 * 60_000 })),
    enableNotifications: async () => {
      if (!("Notification" in window)) return false;
      return (await Notification.requestPermission()) === "granted";
    },
  }), [data, ready, now]);

  return <HydrationContext.Provider value={value}>{children}</HydrationContext.Provider>;
}

function useHydration() {
  const context = useContext(HydrationContext);
  if (!context) throw new Error("HydrationProvider ausente");
  return context;
}

function timeLabel(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function countdown(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function HydrationReminder() {
  const { data, ready, due, now, addWater, snooze } = useHydration();
  if (!ready) return null;
  const seconds = Math.ceil((data.nextReminderAt - now.getTime()) / 1000);
  return <aside className={`fixed bottom-4 right-4 z-40 w-[min(21rem,calc(100vw-2rem))] rounded-2xl border p-4 shadow-xl backdrop-blur-xl ${due ? "border-primary/50 bg-background/95" : "border-border bg-background/90"}`} aria-live="polite">
    <div className="flex items-center justify-between gap-2"><div className="label-mono text-muted-foreground">Lembrete de água</div><Tag tone={due ? "primary" : "success"}>{due ? "Agora" : countdown(seconds)}</Tag></div>
    <div className="mt-2 flex items-baseline justify-between"><strong className="font-display text-2xl">{data.intakeMl} ml</strong><span className="text-xs text-muted-foreground">meta ajustável · {data.targetMl} ml</span></div>
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (data.intakeMl / data.targetMl) * 100)}%` }} /></div>
    <div className="mt-3 flex gap-2"><button type="button" onClick={() => addWater(200)} className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Registrei 200 ml</button>{due && <button type="button" onClick={snooze} className="rounded-lg bg-foreground/5 px-3 py-2 text-xs font-semibold">Adiar 15 min</button>}</div>
    <Link to="/hidratacao" className="mt-2 block text-center text-xs font-semibold text-primary underline underline-offset-4">Ver cronograma</Link>
  </aside>;
}

export function HydrationDashboard() {
  const { data, ready, due, now, setSettings, addWater, enableNotifications } = useHydration();
  const objective = goals.find((item) => item.id === data.objective) ?? goals[0];
  const totalMinutes = Math.max(1, (timeOnDate(data.sleepTime, now).getTime() - timeOnDate(data.wakeTime, now).getTime()) / 60_000);
  const reminderCount = Math.max(1, Math.floor(totalMinutes / data.intervalMinutes) + 1);
  const portionMl = Math.round(data.targetMl / reminderCount / 25) * 25;
  const percent = Math.min(100, Math.round((data.intakeMl / data.targetMl) * 100));
  const schedule = Array.from({ length: reminderCount }, (_, index) => {
    const time = timeOnDate(data.wakeTime, now);
    time.setMinutes(time.getMinutes() + index * data.intervalMinutes);
    return { at: time, amount: portionMl };
  }).filter((item) => item.at <= timeOnDate(data.sleepTime, now));

  if (!ready) return <p className="rounded-xl bg-foreground/5 p-4 text-sm text-muted-foreground">Carregando seu cronograma salvo neste dispositivo…</p>;

  return <div className="space-y-5">
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5"><div className="label-mono text-primary">Plano diário · sincronizado neste navegador</div><h2 className="mt-2 font-display text-3xl tracking-tight">Água ao longo do seu dia</h2><p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground">Configure sua meta pessoal, janela do dia e intervalo. O objetivo ajuda a organizar os lembretes, mas não define sozinho a quantidade de água. O cronômetro permanece ativo ao navegar pelo app e salva registros/configurações neste dispositivo; para alertas do navegador, permita notificações e mantenha o app aberto.</p></div>

    <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
      <Panel title="Configurar rotina">
        <label className="mb-4 block"><span className="label-mono mb-1.5 block text-[10px] text-muted-foreground">Objetivo atual</span><select value={data.objective} onChange={(e) => setSettings({ objective: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="hipertrofia">Hipertrofia / ganho de massa</option><option value="emagrecimento">Emagrecimento</option><option value="ganho-de-peso">Aumento de peso</option></select></label>
        <label className="mb-4 block"><span className="label-mono mb-1.5 block text-[10px] text-muted-foreground">Meta diária pessoal (ml) · definida com sua equipe</span><input type="number" min="250" max="6000" step="50" value={data.targetMl} onChange={(e) => setSettings({ targetMl: Math.min(6000, Math.max(250, Number(e.target.value) || 250)) })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="label-mono mb-1.5 block text-[10px] text-muted-foreground">Acordar</span><input type="time" value={data.wakeTime} onChange={(e) => setSettings({ wakeTime: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
          <label className="block"><span className="label-mono mb-1.5 block text-[10px] text-muted-foreground">Encerrar</span><input type="time" value={data.sleepTime} onChange={(e) => setSettings({ sleepTime: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
        </div>
        <label className="mt-4 block"><span className="label-mono mb-1.5 block text-[10px] text-muted-foreground">Lembrete a cada · minutos</span><select value={data.intervalMinutes} onChange={(e) => setSettings({ intervalMinutes: Number(e.target.value) })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value={45}>45 minutos</option><option value={60}>60 minutos</option><option value={90}>90 minutos</option><option value={120}>120 minutos</option></select></label>
        <p className="mt-4 rounded-xl bg-foreground/5 p-3 text-xs leading-relaxed text-muted-foreground">{objective.note}</p>
        <button type="button" onClick={() => void enableNotifications()} className="mt-4 w-full rounded-lg bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground">Ativar notificações do navegador</button>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">O lembrete na tela funciona enquanto o app está aberto. O navegador pode suspender ou não entregar avisos se a página for fechada, se o sistema bloquear notificações ou se a economia de bateria estiver ativa.</p>
      </Panel>

      <div className="space-y-5">
        <Panel title="Progresso de hoje" action={<Tag tone={due ? "warning" : "primary"}>{due ? "Lembrete pendente" : `Próximo · ${timeLabel(data.nextReminderAt)}`}</Tag>}>
          <div className="flex items-end justify-between gap-4"><div><div className="font-display text-5xl">{(data.intakeMl / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}<span className="text-2xl"> L</span></div><div className="mt-1 text-sm text-muted-foreground">de {(data.targetMl / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L de meta configurada</div></div><div className="font-mono text-2xl text-primary">{percent}%</div></div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-foreground/10"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} /></div>
          <div className="mt-4 flex flex-wrap gap-2">{[150, 200, 250, 350].map((amount) => <button key={amount} type="button" onClick={() => addWater(amount)} className="rounded-lg bg-foreground/5 px-3 py-2 text-sm font-semibold hover:bg-foreground/10">+{amount} ml</button>)}</div>
        </Panel>

        <Panel title="Cronograma sugerido de lembretes">
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">Exemplo de distribuição uniforme da meta selecionada, dentro da janela acordada; não é uma prescrição clínica. A porção se recalcula quando você muda o intervalo.</p>
          <ol className="max-h-80 divide-y divide-border overflow-auto rounded-xl border border-border/70">{schedule.map((item) => <li key={item.at.toISOString()} className={`flex items-center justify-between gap-3 p-3 ${item.at.getHours() === now.getHours() && item.at.getMinutes() === now.getMinutes() ? "bg-primary/10" : ""}`}><time className="font-mono text-sm font-semibold text-primary">{item.at.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time><span className="text-xs text-muted-foreground">Pausa para hidratação</span><span className="text-sm font-semibold">~{item.amount} ml</span></li>)}</ol>
        </Panel>
      </div>
    </div>

    <Panel title="Seu registro de hoje">
      {data.logs.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma ingestão registrada hoje. Use os botões acima para acompanhar o que bebeu.</p> : <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{data.logs.map((log, index) => <li key={`${log.at}-${index}`} className="flex justify-between rounded-lg bg-foreground/5 p-3 text-sm"><time className="font-mono text-muted-foreground">{new Date(log.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time><strong>{log.amountMl} ml</strong></li>)}</ol>}
    </Panel>

    <p className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-xs leading-relaxed">Referências populacionais para adultos estimam água total em torno de 2,7 L/dia para mulheres e 3,7 L/dia para homens, contando água dos alimentos e todas as bebidas; isso não é uma meta individual de água pura. Calor, exercício e doenças podem alterar a necessidade. Não force grandes volumes nem tente compensar rapidamente. Doença renal ou cardíaca, gravidez, amamentação, diarreia/vômitos ou restrição médica exigem meta profissional individualizada. <a href="https://www.nationalacademies.org/read/10925/chapter/6" target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">National Academies</a> · <a href="https://www.cdc.gov/healthy-weight-growth/water-healthy-drinks/index.html" target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">CDC</a> · <a href="https://pubmed.ncbi.nlm.nih.gov/17277604/" target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">ACSM — exercício e reposição de líquidos</a></p>
  </div>;
}
