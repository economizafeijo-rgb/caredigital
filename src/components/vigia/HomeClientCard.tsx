import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarClock, Clock3, CheckCircle2, Droplets, LockKeyhole, Pill, UtensilsCrossed, UserRound, AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CompactTreatmentBlister } from "./CompactTreatmentBlister";
import { PatientActivityHistory } from "./PatientActivityHistory";
import { ClientHydrationTab } from "./ClientHydrationTab";
import { MedicationLateAlert } from "./MedicationLateAlert";

type Client = { id: string; owner_id: string; full_name: string; status: string; care_goal: string | null };
type Task = { id: string; patient_id: string; title: string; category: string; scheduled_at: string; completed_at: string | null };
const db = supabase as unknown as { from: (table: string) => any; auth: typeof supabase.auth };
const tz = "America/Rio_Branco";
const dayInAcre = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const dateInAcre = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday:"long", day:"2-digit", month:"long" }).format(d);
const timeInAcre = (iso: string) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(iso));
const categoryInfo: Record<string, { label: string; icon: typeof Pill }> = {
  medicacao: { label: "Medicação", icon: Pill },
  hidratacao: { label: "Hidratação", icon: Droplets },
  refeicao: { label: "Refeição", icon: UtensilsCrossed },
};

export function HomeClientCard() {
  const [owner, setOwner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notice, setNotice] = useState("");
  const [locked, setLocked] = useState(false);
  const [pending, setPending] = useState<Task | null>(null);
  const [amount, setAmount] = useState("200");
  const [busy, setBusy] = useState(false);
  const [lateReason, setLateReason] = useState("acordei_tarde");
  const [activeTab, setActiveTab] = useState<"hoje" | "agenda" | "historico" | "alimentacao" | "hidratacao">("hoje");
  const [tick, setTick] = useState(0);
  const [clock, setClock] = useState<Date | null>(null);
  useEffect(() => { const update = () => setClock(new Date()); update(); const timer = window.setInterval(update,1000); return () => window.clearInterval(timer); }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setTick(t => t + 1), 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    const loadAuth = async () => {
      const { data } = await db.auth.getUser();
      if (!active) return;
      setOwner(data.user?.id ?? null);
      setLoading(false);
    };
    void loadAuth();
    const { data: listener } = db.auth.onAuthStateChange(() => { if (active) void loadAuth(); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!owner) { setClient(null); setTasks([]); return; }
    let active = true;
    const load = async () => {
      const grants = await db.from("care_patient_access").select("patient_id").eq("user_id",owner).limit(1);
      if (grants.error) { if (active) setNotice("Não foi possível verificar o vínculo de acesso."); return; }
      const assignedId = grants.data?.[0]?.patient_id;
      const res = assignedId
        ? await db.from("care_patients").select("id,owner_id,full_name,status,care_goal").eq("id",assignedId).limit(1)
        : await db.from("care_patients").select("id,owner_id,full_name,status,care_goal").eq("owner_id", owner).order("created_at", {ascending: true}).limit(1);
      if (!active) return;
      if (res.error) { setNotice("Não foi possível consultar o prontuário."); return; }
      const first = (res.data ?? [])[0] as Client | undefined;
      setClient(first ?? null);
      if (!first) { setTasks([]); return; }
      const date = dayInAcre(new Date());
      const from = new Date(date + "T00:00:00-05:00").toISOString();
      const until = new Date(new Date(from).getTime() + 86400000).toISOString();
      const rows = await db.from("care_daily_checklist").select("id,patient_id,title,category,scheduled_at,completed_at")
        .eq("owner_id",first.owner_id).eq("patient_id",first.id).gte("scheduled_at",from).lt("scheduled_at",until)
        .in("category",["medicacao","hidratacao","refeicao"]).order("scheduled_at",{ascending:true}).limit(100);
      if (active) { if (rows.error) setNotice("Não foi possível carregar a agenda de hoje."); else setTasks(rows.data ?? []); }
    };
    void load();
    return () => { active = false; };
  }, [owner, tick]);

  const nextItems = useMemo(() => {
    const now = Date.now();
    const future = tasks.filter(t => !t.completed_at && new Date(t.scheduled_at).getTime() >= now);
    const due = tasks.filter(t => !t.completed_at && new Date(t.scheduled_at).getTime() < now);
    const ordered = [...due.slice(-3).reverse(), ...future];
    const grouped = ["medicacao", "hidratacao", "refeicao"].map(kind => ordered.find(t => t.category === kind)).filter((t): t is Task => Boolean(t));
    return grouped;
  }, [tasks, tick]);
  const completed = tasks.filter(t => Boolean(t.completed_at)).length;
  const nextCare = tasks.find(t => !t.completed_at && new Date(t.scheduled_at).getTime() >= (clock?.getTime() ?? Date.now())) ?? tasks.find(t => !t.completed_at);
  const meals = tasks.filter(t => t.category === "refeicao");
  const mealGuide: Record<string,string> = { "Café da manhã":"Aveia cozida em água ou leite sem lactose, se tolerado, com banana madura.", "Lanche da manhã":"Mamão ou banana madura; ajuste à sua tolerância.", "Almoço":"Arroz, frango cozido ou grelhado sem excesso de gordura, batata e legumes cozidos.", "Lanche da tarde":"Batata-doce cozida ou fruta tolerada.", "Jantar":"Sopa suave de legumes e frango desfiado, sem pimenta.", "Ceia":"Mingau leve de aveia ou banana, conforme tolerância." };

  function askConfirm(task: Task) {
    if (!owner || !client) { setLocked(true); return; }
    if (task.completed_at) { setNotice("Esta atividade já foi confirmada."); return; }
    if (task.category === "medicacao" && dayInAcre(new Date(task.scheduled_at)) !== dayInAcre(new Date())) {
      setNotice("Por segurança, apenas tomadas programadas para hoje podem ser confirmadas. Para registrar uma dose de outro dia, procure o responsável pelo tratamento.");
      return;
    }
    setLateReason("acordei_tarde");
    setNotice("");
    setPending(task);
  }

  async function confirm() {
    if (!pending || !owner || !client || busy) return;
    if (pending.category === "medicacao" && dayInAcre(new Date(pending.scheduled_at)) !== dayInAcre(new Date())) {
      setNotice("A confirmação de medicação só é permitida no dia agendado."); setPending(null); return;
    }
    if (pending.category === "hidratacao" && (!Number.isInteger(Number(amount)) || Number(amount) < 10 || Number(amount) > 1500)) {
      setNotice("Informe o volume de água realmente consumido (10 a 1.500 ml).");
      return;
    }
    setBusy(true);
    try {
      // The database function performs confirmation and hydration logging atomically.
      const payload = pending.category === "hidratacao" ? Number(amount) : null;
      const result = await (supabase as any).rpc("care_confirm_task", { p_task_id: pending.id, p_water_ml: payload });
      if (result.error) throw result.error;
      setTasks(previous => previous.map(t => t.id === pending.id ? { ...t, completed_at: typeof result.data === "string" ? result.data : new Date().toISOString() } : t));
      setTick(value => value + 1);
      const offsetMinutes = Math.round((Date.now() - new Date(pending.scheduled_at).getTime()) / 60000);
      setNotice(pending.category === "hidratacao" ? "Hidratação confirmada e volume registrado."
        : pending.category === "medicacao" && offsetMinutes > 15
        ? "Tomada registrada agora, após o horário previsto. Motivo informado: " + (lateReason === "acordei_tarde" ? "acordei mais tarde." : lateReason === "rotina" ? "mudança de rotina." : "outro motivo.") + " O horário efetivo é o da confirmação."
        : pending.category === "medicacao" && offsetMinutes < -15
        ? "Tomada registrada agora, antes do horário previsto."
        : "Atividade confirmada no prontuário.");
      setPending(null);
    } catch {
      setNotice("Não foi possível confirmar. Consulte o prontuário antes de tentar novamente.");
    } finally { setBusy(false); }
  }

  return <section aria-label="Resumo do cliente e agenda" className="flex min-h-0 flex-col rounded-xl border border-border bg-card shadow-sm md:h-full md:overflow-hidden">
    {loading ? <p className="p-6 text-sm text-muted-foreground">Verificando acesso seguro…</p> : !owner ? <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
      <div><div className="flex items-center gap-2 font-semibold"><LockKeyhole size={19} className="text-primary"/> Acesso protegido</div><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Entre com sua conta para visualizar o cliente cadastrado, consultar a programação e confirmar medicação, água e refeições. Nenhum dado pessoal aparece sem autenticação.</p></div>
      <button onClick={() => setLocked(true)} className="rounded-xl bg-[#216083] px-5 py-3 text-sm font-semibold text-white">Consultar programação</button>
    </div> : !client ? <p className="p-6 text-sm text-muted-foreground">Nenhum cliente vinculado a esta conta. Confira seu acesso ao prontuário.</p> : <div className="p-2 sm:p-3">
      <div className="mb-1 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="min-w-0"><p className="text-[11px] font-semibold text-muted-foreground">Tratamento · 35 dias · horários do Acre</p></div>
        <div className="flex items-center gap-2"><span className="rounded-lg bg-muted px-2.5 py-1.5 text-[11px] font-semibold text-foreground">{completed}/{tasks.length} cuidados hoje</span><span className="hidden font-mono text-xs tabular-nums text-muted-foreground sm:block">{clock?new Intl.DateTimeFormat("pt-BR",{timeZone:tz,hour:"2-digit",minute:"2-digit",hour12:false}).format(clock):"--:--"}</span></div>
      </div>
      <div className="shrink-0"><MedicationLateAlert tasks={tasks} onConfirm={alertTask=>{const task=tasks.find(t=>t.id===alertTask.id);if(task)askConfirm(task)}} compact now={clock}/></div>
      <div className="mt-1 mb-1 flex shrink-0 gap-1 overflow-x-auto rounded-lg border border-border bg-muted/40 p-1" role="tablist" aria-label="Seções do acompanhamento">
        {([{key:"hoje",label:"Visão geral"},{key:"agenda",label:"Agenda"},{key:"hidratacao",label:"Minha hidratação"},{key:"historico",label:"Histórico"},{key:"alimentacao",label:"Alimentação"}] as const).map(tab=><button type="button" role="tab" key={tab.key} aria-selected={activeTab===tab.key} onClick={()=>setActiveTab(tab.key)} className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${activeTab===tab.key?"bg-card text-primary shadow-sm ring-1 ring-border":"text-muted-foreground hover:text-foreground"}`}>{tab.label}</button>)}
      </div>
      <div className="grid min-h-0 flex-1 items-stretch gap-2 md:overflow-hidden md:grid-cols-[minmax(255px,0.9fr)_minmax(0,1.1fr)]">
        <CompactTreatmentBlister patientId={client.id} ownerId={client.owner_id} revision={tick} onConfirm={askConfirm}/>
        <div className="min-h-0 min-w-0 overflow-y-auto rounded-xl border border-border bg-card p-2.5 sm:p-3 max-md:max-h-[420px]">
          {activeTab==="hoje"&&<div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-bold text-foreground">Resumo do dia</h4><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">{dateInAcre(clock??new Date())}</span></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-muted p-2.5"><p className="text-[10px] text-muted-foreground">Cuidados</p><p className="mt-1 text-lg font-extrabold tabular-nums">{tasks.length}</p></div>
              <div className="rounded-xl bg-muted p-2.5"><p className="text-[10px] text-muted-foreground">Concluídos</p><p className="mt-1 text-lg font-extrabold tabular-nums text-success">{completed}</p></div>
              <div className="rounded-xl bg-muted p-2.5"><p className="text-[10px] text-muted-foreground">Pendentes</p><p className="mt-1 text-lg font-extrabold tabular-nums">{tasks.length-completed}</p></div>
            </div>
            <div className="rounded-xl border border-border p-3"><div className="flex items-center gap-2 text-xs font-bold text-foreground"><CalendarClock size={16} className="text-primary"/> Próximo cuidado</div>{nextCare?<><p className="mt-1 text-sm font-semibold">{timeInAcre(nextCare.scheduled_at)} · {categoryInfo[nextCare.category]?.label??"Atividade"}</p><p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{nextCare.title}</p><button type="button" onClick={()=>askConfirm(nextCare)} className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Consultar / confirmar</button></>:<p className="mt-2 text-xs text-muted-foreground">Nenhum cuidado pendente hoje.</p>}</div>
            <details className="rounded-xl bg-muted/65 p-2.5"><summary className="cursor-pointer text-xs font-bold">Ver plano completo (35 dias)</summary><p className="mt-1 text-xs text-muted-foreground">31/10–06/11: 7 cartelas de 8 unidades (4 manhã e 4 noite).</p><p className="mt-1 text-xs text-muted-foreground">07/11–04/12: 4 semanas de lansoprazol, 1 cápsula ao dia.</p></details>

          </div>}
          {activeTab==="agenda"&&<div><h4 className="text-sm font-bold">Cuidados agendados para hoje</h4><p className="mt-1 text-xs text-muted-foreground">Selecione apenas uma atividade realizada; o horário é registrado pelo servidor.</p><div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto">{tasks.map(task=>{const Icon=categoryInfo[task.category]?.icon??Pill;return <div key={task.id} className="flex items-center gap-2 rounded-xl border border-border p-2.5"><Icon size={17} className="shrink-0 text-primary"/><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{task.title}</p><p className="text-[11px] text-muted-foreground">{timeInAcre(task.scheduled_at)} · {task.completed_at?"Confirmado":"Pendente"}</p></div>{!task.completed_at&&<button className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-2 text-xs font-semibold text-primary" onClick={()=>askConfirm(task)}>Confirmar</button>}</div>})}{tasks.length===0&&<p className="text-sm text-muted-foreground">Nenhum cuidado cadastrado hoje.</p>}</div></div>}
          {activeTab==="hidratacao"&&<ClientHydrationTab patientId={client.id} ownerId={client.owner_id} tasks={tasks} revision={tick} onConfirm={askConfirm} onRecorded={()=>setTick(value=>value+1)}/>}
          {activeTab==="historico"&&<div><h4 className="mb-2 text-sm font-bold">Histórico e prontuário</h4><p className="mb-2 text-xs text-muted-foreground">Confira datas, horários e registros existentes, sem alterar o histórico original.</p><PatientActivityHistory patientId={client.id} ownerId={client.owner_id} revision={tick}/></div>}
          {activeTab==="alimentacao"&&<div><h4 className="text-sm font-bold">Alimentação do dia</h4><p className="mt-1 text-xs text-muted-foreground">Sugestões orientativas; adapte aos sintomas e à prescrição.</p><div className="mt-3 max-h-[430px] space-y-2 overflow-y-auto">{meals.map(meal=><div key={meal.id} className="rounded-xl border border-border p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold">{meal.title}</p><span className="text-[10px] text-muted-foreground">{timeInAcre(meal.scheduled_at)}</span></div><p className="mt-1 text-xs text-muted-foreground">{mealGuide[meal.title]??"Alimentação leve conforme tolerância."}</p>{!meal.completed_at&&<button className="mt-2 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary" onClick={()=>askConfirm(meal)}>Confirmar refeição</button>}</div>)}{meals.length===0&&<p className="text-sm text-muted-foreground">Sem refeições agendadas.</p>}</div></div>}
        </div>
      </div>
    </div>}
    {notice && <p role="status" className="mx-5 mb-4 rounded-xl bg-[#e4eff4] p-3 text-sm text-[#24526c]">{notice}</p>}
    {locked && <div role="dialog" aria-label="Acesso restrito" className="m-5 rounded-2xl border border-[#aec8d6] bg-[#eff5f8] p-5">
      <div className="flex items-center gap-2 font-bold text-[#163b56]"><LockKeyhole size={19}/> Acesso necessário</div>
      <p className="mt-2 text-sm text-[#456478]">Para proteger as informações de saúde, faça login antes de visualizar ou confirmar atividades do cliente.</p>
      <div className="mt-4 flex flex-wrap gap-2"><Link to="/entrar" className="rounded-xl bg-[#216083] px-5 py-3 text-sm font-semibold text-white">Ir para a tela de login</Link><button onClick={() => setLocked(false)} className="rounded-xl border border-[#b8d2df] px-4 py-3 text-sm">Fechar</button></div>
    </div>}
    {pending?.category === "medicacao" && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#081724]/75 px-3 py-6 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setPending(null); }}>
      <section role="dialog" aria-modal="true" aria-label="Confirmar tomada de medicação" className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl">
        <div className="relative bg-gradient-to-br from-[#143a55] to-[#215978] px-6 py-6 text-white">
          <button type="button" aria-label="Fechar confirmação" disabled={busy} onClick={() => setPending(null)} className="absolute right-4 top-4 rounded-full bg-white/15 p-2 hover:bg-white/25"><X size={17}/></button>
          <svg viewBox="0 0 320 132" className="mx-auto h-28 w-full max-w-xs" role="img" aria-label="Ilustração de cápsula e relógio, confirmação de tomada">
            <defs><linearGradient id="capsuleFill" x1="0" x2="1"><stop offset="0" stopColor="#82d3ee"/><stop offset="1" stopColor="#3787b2"/></linearGradient></defs>
            <circle cx="160" cy="65" r="58" fill="#ffffff" opacity=".08"/>
            <rect x="83" y="47" width="150" height="43" rx="21" transform="rotate(-24 158 69)" fill="#fff" opacity=".96"/>
            <path d="M 156 39 L 192 23 A 21 21 0 0 1 209 61 L 174 76 Z" fill="url(#capsuleFill)" transform="rotate(0 160 65)"/>
            <circle cx="235" cy="89" r="25" fill="#163d58" stroke="#b5e8f5" strokeWidth="3"/>
            <path d="M235 75 V89 L244 95" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round"/>
            <circle cx="235" cy="89" r="3" fill="#fff"/>
            <path d="M61 26 l5 7 9 1 -6 6 1 9 -9 -4 -8 4 1 -9 -7 -6 9 -1z" fill="#b8e6f3" opacity=".8"/>
          </svg>
          <p className="text-center text-xs font-semibold uppercase tracking-[.16em] text-sky-200">Confirmação segura</p>
          <h3 className="mt-2 text-center text-2xl font-bold">Você tomou a medicação agora?</h3>
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          <div className="rounded-xl bg-muted p-3 text-sm"><p className="font-semibold">{pending.title}</p><p className="mt-1 text-muted-foreground">Programada para {timeInAcre(pending.scheduled_at)} · Acre</p><p className="mt-1 text-xs text-muted-foreground">A data e a hora reais serão registradas automaticamente pelo servidor. Não é possível preenchê-las manualmente.</p></div>
          {Math.abs(Date.now()-new Date(pending.scheduled_at).getTime()) > 15*60000 && <div className="rounded-xl border border-warning/40 bg-muted p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold text-foreground"><AlertTriangle size={17} className="text-warning"/> Tomada fora do horário previsto</div>
            <p className="mt-1 text-muted-foreground">{Date.now()>new Date(pending.scheduled_at).getTime() ? "O horário já passou." : "O horário ainda não chegou."} Se você realmente tomou o medicamento agora, confirme abaixo. Isso não indica que deva compensar ou dobrar a dose.</p>
            {Date.now()>new Date(pending.scheduled_at).getTime() && <label className="mt-3 block text-xs font-semibold">Motivo informado (opcional)
              <select value={lateReason} onChange={e=>setLateReason(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background p-2.5 text-sm text-foreground">
                <option value="acordei_tarde">Acordei mais tarde</option><option value="rotina">Mudança na rotina</option><option value="outro">Outro motivo</option>
              </select>
            </label>}
          </div>}
          <p className="text-xs text-muted-foreground">Se tomou anteriormente e esqueceu de registrar, escolha cancelar. Não registre uma hora inventada; procure o responsável pelo acompanhamento para corrigir o histórico.</p>
          <div className="grid grid-cols-2 gap-2"><button type="button" disabled={busy} onClick={()=>setPending(null)} className="rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground">Cancelar</button><button type="button" disabled={busy} onClick={()=>void confirm()} className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy?"Registrando…":"Sim, tomei agora"}</button></div>
        </div>
      </section>
    </div>}
    {pending && pending.category !== "medicacao" && <div role="dialog" aria-label="Confirmar cuidado" className="m-5 rounded-2xl border border-[#aec8d6] bg-[#eff5f8] p-5">
      <div className="flex items-center gap-2 font-bold text-[#163b56]"><CheckCircle2 size={19}/> Confirmação de cuidado</div>
      <p className="mt-2 text-sm">{pending.title} · {timeInAcre(pending.scheduled_at)}</p>
      {pending.category === "medicacao" && <div className="mt-3 space-y-2 text-sm"><p>Horário programado: <strong>{timeInAcre(pending.scheduled_at)}</strong>. Registro efetivo: <strong>data e hora atuais do servidor</strong>.</p>{Math.abs(Date.now()-new Date(pending.scheduled_at).getTime()) > 15*60000 && <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">Atenção: você está fora da janela de 15 minutos do horário programado. A confirmação será registrada como adiantada ou atrasada, com horário real. Confirme somente se acabou de tomar; não tome dose extra para compensar.</p>}<p className="text-xs text-muted-foreground">Se tomou anteriormente e esqueceu de registrar, não use esta confirmação para informar uma hora passada.</p></div>}
      {pending.category === "refeicao" && <p className="mt-2 text-xs text-muted-foreground">Confirme somente se a refeição foi realizada.</p>}
      {pending.category === "hidratacao" && <label className="mt-3 block text-sm">Água realmente consumida (ml)<input className="field mt-1 max-w-40" type="number" min={10} max={1500} step={10} value={amount} onChange={e => setAmount(e.target.value)} /></label>}
      <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy} onClick={() => void confirm()} className="rounded-xl bg-[#216083] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Salvando…" : "Confirmar realização"}</button><button disabled={busy} onClick={() => setPending(null)} className="rounded-xl border border-[#b8d2df] px-4 py-3 text-sm">Cancelar</button></div>
    </div>}
  </section>;
}
