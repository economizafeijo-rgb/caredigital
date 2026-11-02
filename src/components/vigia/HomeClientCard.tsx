import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, CalendarDays, CheckCircle2, Droplets, History, House, LayoutDashboard, LockKeyhole, Pill, Target, UtensilsCrossed, UserRound, AlertTriangle, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CompactTreatmentBlister } from "./CompactTreatmentBlister";
import { PatientActivityHistory } from "./PatientActivityHistory";
import { ClientHydrationTab } from "./ClientHydrationTab";
import { ClientBeverageTracker } from "./ClientBeverageTracker";
import { MedicationLateAlert } from "./MedicationLateAlert";
import { ClientTodayTimeline } from "./ClientTodayTimeline";

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

export function HomeClientCard({patientName}:{patientName?:string}={}) {
  const [owner, setOwner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notice, setNotice] = useState("");
  const [confirmationResult,setConfirmationResult]=useState<{success:boolean;title:string;detail:string}|null>(null);
  const [locked, setLocked] = useState(false);
  const [pending, setPending] = useState<Task | null>(null);
  const [mealToDelete, setMealToDelete] = useState<Task | null>(null);
  const [mealEarlyAcknowledged, setMealEarlyAcknowledged] = useState(false);
  const [hydrationView, setHydrationView] = useState<"agua" | "bebidas">("agua");
  const [amount, setAmount] = useState("200");
  const [busy, setBusy] = useState(false);
  const [lateReason, setLateReason] = useState("acordei_tarde");
  const [activeTab, setActiveTab] = useState<"hoje" | "agenda" | "historico" | "alimentacao" | "hidratacao">("hoje");
  const [tick, setTick] = useState(0);
  const [clock, setClock] = useState<Date | null>(null);
  const [treatmentProgress,setTreatmentProgress] = useState<{confirmed:number;total:number}|null>(null);
  useEffect(() => { const update = () => setClock(new Date()); update(); const timer = window.setInterval(update,15000); return () => window.clearInterval(timer); }, []);

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

  const completed = tasks.filter(t => Boolean(t.completed_at)).length;
  const nextCare = tasks.find(t => !t.completed_at);
  const meals = tasks.filter(t => t.category === "refeicao");
  const mealGuide: Record<string,string> = { "Café da manhã":"Aveia cozida em água ou leite sem lactose, se tolerado, com banana madura.", "Lanche da manhã":"Mamão ou banana madura; ajuste à sua tolerância.", "Almoço":"Arroz, frango cozido ou grelhado sem excesso de gordura, batata e legumes cozidos.", "Lanche da tarde":"Batata-doce cozida ou fruta tolerada.", "Jantar":"Sopa suave de legumes e frango desfiado, sem pimenta.", "Ceia":"Mingau leve de aveia ou banana, conforme tolerância." };

  function askConfirm(task: Task) {
    if (!owner || !client) { setLocked(true); return; }
    if (task.completed_at) { setNotice("Esta atividade já foi confirmada."); return; }
    if (task.category === "medicacao") {
      if (dayInAcre(new Date(task.scheduled_at)) !== dayInAcre(new Date())) {
        setConfirmationResult({ success:false, title:"Confirmação indisponível",
          detail:"Somente medicamentos agendados para hoje podem ser confirmados. Para registrar uma dose de outro dia, procure o responsável pelo tratamento." });
        return;
      }
      if (Date.now() < Date.parse(task.scheduled_at)) {
        setConfirmationResult({ success:false, title:"Horário da medicação ainda não atingido",
          detail:`Esta dose está programada para ${timeInAcre(task.scheduled_at)} (horário do Acre). Por segurança, o registro só será permitido a partir desse horário. Não antecipe a medicação sem orientação profissional. Nenhuma confirmação foi salva.` });
        return;
      }
    }
    setMealEarlyAcknowledged(false);
    setLateReason("acordei_tarde");
    setNotice("");
    setConfirmationResult(null);
    setPending(task);
  }

  async function confirm() {
    if (!pending || !owner || !client || busy) return;
    if (pending.category === "medicacao" &&
      (dayInAcre(new Date(pending.scheduled_at)) !== dayInAcre(new Date()) ||
        Date.now() < Date.parse(pending.scheduled_at))) {
      setConfirmationResult({success:false,title:"Horário da medicação ainda não atingido",
        detail:`Confirmação disponível apenas no dia e a partir das ${timeInAcre(pending.scheduled_at)} (Acre). Nenhuma confirmação foi salva.`});
      setPending(null);
      return;
    }
    const mealIsEarly = pending.category === "refeicao" && Date.now() < Date.parse(pending.scheduled_at);
    if (mealIsEarly && !mealEarlyAcknowledged) {
      setNotice("Para registrar uma refeição antecipada, confirme que já a realizou.");
      return;
    }
    if (pending.category === "hidratacao" && (!Number.isInteger(Number(amount)) || Number(amount) < 10 || Number(amount) > 1500)) {
      setNotice("Informe o volume de água realmente consumido (10 a 1.500 ml).");
      return;
    }
    setBusy(true);
    try {
      // The database function performs confirmation and hydration logging atomically.
      const payload = pending.category === "hidratacao" ? Number(amount) : null;
      const result = mealIsEarly
        ? await (supabase as any).rpc("care_confirm_meal_early", { p_task_id: pending.id, p_verified: true })
        : await (supabase as any).rpc("care_confirm_task", { p_task_id: pending.id, p_water_ml: payload });
      if (result.error) throw result.error;
      if (typeof result.data !== "string" || !Number.isFinite(Date.parse(result.data))) throw new Error("Missing confirmed server timestamp");
      const confirmedAt=result.data as string;
      const verified=await (supabase as any).from("care_daily_checklist").select("id,completed_at")
        .eq("id",pending.id).eq("patient_id",client.id).single();
      if (verified.error || !verified.data?.completed_at) throw new Error("Could not verify record");
      setTasks(previous => previous.map(t=>t.id===pending.id?{...t,completed_at:verified.data.completed_at}:t));
      setTick(value=>value+1);
      const actual=new Intl.DateTimeFormat("pt-BR",{timeZone:tz,day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date(verified.data.completed_at));
      setConfirmationResult({success:true,title:pending.category==="medicacao"?"Medicação registrada com sucesso!":pending.category==="refeicao"?"Refeição registrada com sucesso!":"Cuidado registrado com sucesso!",detail:`${pending.title} · ${actual} (horário do Acre). ${mealIsEarly?"Confirmação antecipada verificada. ":""}Data e hora reais salvas no prontuário.`});
      setNotice("");
      setPending(null);
    } catch (failure) {
      const message=failure instanceof Error?failure.message:"";
      const detail=/already completed/i.test(message)?"Este cuidado já foi confirmado. Atualize o painel para consultar o registro.":/scheduled time not reached/i.test(message)?"O horário programado da medicação ainda não foi atingido. Nenhum registro foi salvo.":/scheduled date/i.test(message)?"Somente a dose agendada para hoje pode ser confirmada.":/Meal early confirmation requires verification/i.test(message)?"Uma refeição antecipada exige confirmação expressa antes do registro.":/task unavailable|authentication|permission|denied|401|403/i.test(message)?"Sua sessão não tem acesso a este cuidado. Entre novamente e consulte seu prontuário.":"O registro não pôde ser confirmado. Confira sua conexão e o histórico antes de tentar novamente.";
      setConfirmationResult({success:false,title:"Não foi possível confirmar",detail});
      setNotice(detail);
      setTick(value=>value+1);
    } finally { setBusy(false); }
  }

  async function deleteMeal() {
    if (!mealToDelete || !owner || !client || busy) return;
    setBusy(true);
    setConfirmationResult(null);
    try {
      const result = await (supabase as any).rpc("care_delete_meal", {
        p_task_id: mealToDelete.id, p_verified: true,
      });
      if (result.error) throw result.error;
      if (typeof result.data !== "string" || !Number.isFinite(Date.parse(result.data))) throw new Error("Invalid deletion timestamp");
      const removed = mealToDelete;
      setTasks(previous => previous.filter(task => task.id !== removed.id));
      setMealToDelete(null);
      setTick(value => value + 1);
      const actual = new Intl.DateTimeFormat("pt-BR", {
        timeZone: tz, day:"2-digit",month:"2-digit",year:"numeric",
        hour:"2-digit",minute:"2-digit",second:"2-digit",
      }).format(new Date(result.data));
      setConfirmationResult({success:true,title:"Refeição excluída com segurança",
        detail:`${removed.title} foi retirada da agenda em ${actual} (Acre). A exclusão permanece registrada no histórico de auditoria.`});
    } catch {
      setConfirmationResult({success:false,title:"Não foi possível excluir a refeição",
        detail:"Nenhuma exclusão foi confirmada. Confira sua conexão ou suas permissões."});
    } finally { setBusy(false); }
  }

  const medicineTasks=tasks.filter(task=>task.category==="medicacao");
  const medicineConfirmed=medicineTasks.filter(task=>Boolean(task.completed_at)).length;
  const progressPercent=treatmentProgress?Math.min(100,Math.round(treatmentProgress.confirmed/treatmentProgress.total*100)):0;
  const tabs=[
    {key:"hoje",label:"Visão geral",icon:LayoutDashboard},
    {key:"agenda",label:"Agenda",icon:CalendarDays},
    {key:"hidratacao",label:"Minha hidratação",icon:Droplets},
    {key:"historico",label:"Histórico",icon:History},
    {key:"alimentacao",label:"Alimentação",icon:UtensilsCrossed},
  ] as const;

  return <section aria-label="Painel de acompanhamento individual do cliente" className="care-client-dashboard flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[22px] border border-border bg-card/95 shadow-[0_20px_60px_-44px_rgba(25,65,54,.45)]">
    {loading ? <p role="status" className="p-6 text-sm text-muted-foreground">Verificando acesso seguro…</p> : !owner ? <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
      <div><div className="flex items-center gap-2 font-semibold"><LockKeyhole size={19} className="text-primary"/> Acesso protegido</div><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Entre com sua conta para consultar somente seu acompanhamento e confirmar os cuidados realizados.</p></div>
      <button onClick={() => setLocked(true)} className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Consultar programação</button>
    </div> : !client ? <p className="p-6 text-sm text-muted-foreground">Nenhum prontuário vinculado a esta conta. Confira seu acesso com o responsável.</p> : <div className="care-client-content flex h-full min-h-0 flex-1 flex-col gap-2 p-2 sm:p-3">

      <header className="care-client-identity flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/[.07] via-card to-primary/[.035] px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><UserRound size={24}/></span>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-primary">Meu acompanhamento · acesso individual</p>
            <h1 className="truncate text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{patientName||client.full_name}</h1>
            <p className="text-[11px] text-muted-foreground">Tratamento de 35 dias · horários do Acre</p>
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <div className="care-client-dose-status flex items-center gap-2 rounded-xl border border-success/20 bg-success/10 px-3 py-2">
            <CheckCircle2 className="shrink-0 text-success" size={21}/>
            <span className="min-w-0"><strong className="block text-xs font-extrabold text-foreground">{medicineTasks.length && medicineConfirmed===medicineTasks.length?"Medicações de hoje confirmadas":"Tratamento em acompanhamento"}</strong>
            <small className="block text-[10px] text-muted-foreground">{medicineTasks.length?`${medicineConfirmed}/${medicineTasks.length} doses confirmadas hoje`:"Nenhuma dose prevista hoje"}</small></span>
          </div>
          <Link to="/" className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground transition hover:border-primary/35 hover:text-primary"><House size={16}/> <span className="hidden sm:inline">Homepage</span><ArrowRight size={14}/></Link>
        </div>
      </header>

      <div className="care-client-medication-alert shrink-0">
        <MedicationLateAlert tasks={tasks} onConfirm={alertTask=>{const task=tasks.find(t=>t.id===alertTask.id);if(task)askConfirm(task)}} compact now={clock}/>
      </div>

      <div className="care-client-tabs flex shrink-0 gap-1 rounded-xl border border-border bg-muted/55 p-1" role="tablist" aria-label="Seções do acompanhamento">
        {tabs.map(tab=>{
          const Icon=tab.icon;
          return <button type="button" role="tab" key={tab.key} aria-selected={activeTab===tab.key} aria-controls="care-client-tab-panel"
            onClick={()=>setActiveTab(tab.key)} className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-bold transition-colors sm:text-xs ${activeTab===tab.key?"bg-primary text-primary-foreground shadow-sm":"text-muted-foreground hover:bg-card hover:text-foreground"}`}>
            <Icon size={15} className="hidden sm:block"/><span className="truncate">{tab.label}</span>
          </button>;
        })}
      </div>

      <div id="care-client-tab-panel" className="care-client-main grid min-h-0 flex-1 items-stretch gap-2 md:grid-cols-[minmax(0,1.06fr)_minmax(0,.94fr)]">
        <CompactTreatmentBlister patientId={client.id} ownerId={client.owner_id} revision={tick} onConfirm={askConfirm} dashboardMode onProgressChange={setTreatmentProgress}/>
        <section className="care-client-summary min-h-0 min-w-0 overflow-y-auto rounded-2xl border border-border bg-card p-3 sm:p-4" aria-label="Detalhes do acompanhamento">
          {activeTab==="hoje"&&<div className="care-summary-today flex h-full min-h-0 flex-col gap-3">
            <div className="flex shrink-0 items-center justify-between gap-2">
              <h2 className="inline-flex items-center gap-2 text-sm font-extrabold text-foreground"><LayoutDashboard size={18} className="text-primary"/> Resumo do dia</h2>
              <span className="whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">{dateInAcre(clock??new Date())}</span>
            </div>

            <div className="care-summary-stats grid shrink-0 grid-cols-3 gap-2">
              <div className="rounded-2xl border border-border/55 bg-muted/70 p-3"><p className="text-[11px] text-muted-foreground">Cuidados</p><strong className="mt-1 block text-2xl font-extrabold tabular-nums text-foreground">{tasks.length}</strong></div>
              <div className="rounded-2xl border border-success/15 bg-success/5 p-3"><p className="text-[11px] text-muted-foreground">Concluídos</p><strong className="mt-1 block text-2xl font-extrabold tabular-nums text-success">{completed}</strong></div>
              <div className="rounded-2xl border border-border/55 bg-muted/70 p-3"><p className="text-[11px] text-muted-foreground">Pendentes</p><strong className="mt-1 block text-2xl font-extrabold tabular-nums text-foreground">{tasks.length-completed}</strong></div>
            </div>

            <div className="care-next-care flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/[.045] p-3">
              <div className="flex min-w-0 flex-1 items-start gap-2.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CalendarClock size={21}/></span>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-foreground">Próximo cuidado pendente</p>
                  {nextCare?<><strong className="mt-1 block text-base font-extrabold tabular-nums text-foreground">{timeInAcre(nextCare.scheduled_at)} · {categoryInfo[nextCare.category]?.label??"Atividade"}</strong><p className="truncate text-xs text-muted-foreground">{nextCare.title}</p></>:<p className="mt-1 text-xs text-muted-foreground">Todos os cuidados de hoje foram confirmados.</p>}
                </div>
              </div>
              {nextCare&&<button type="button" onClick={()=>askConfirm(nextCare)} className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-[11px] font-extrabold text-primary-foreground transition hover:opacity-90">Consultar / confirmar <ArrowRight size={15}/></button>}
            </div>

            <div className="care-treatment-progress mt-auto shrink-0 border-t border-border pt-3">
              <div className="flex items-center justify-between gap-2"><h3 className="inline-flex items-center gap-2 text-xs font-extrabold text-foreground"><Target size={18} className="text-primary"/> Progresso do tratamento</h3>
                <span className="text-xs font-extrabold tabular-nums text-foreground">{treatmentProgress?`${treatmentProgress.confirmed}/${treatmentProgress.total}`:"Carregando…"} <span className="font-medium text-muted-foreground">{treatmentProgress?`· ${progressPercent}%`:""}</span></span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Unidades de medicação confirmadas" aria-valuenow={treatmentProgress?.confirmed??0} aria-valuemin={0} aria-valuemax={84}>
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-success transition-[width] duration-500" style={{width:`${progressPercent}%`}}/>
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground">7 cartelas de 8 unidades + 4 semanas de continuidade (28 cápsulas). O progresso considera somente registros salvos.</p>
            </div>
          </div>}

          {activeTab==="agenda"&&<div className="h-full space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground"><CalendarDays size={17} className="text-primary"/> Cuidados programados para hoje</h2>
            <p className="text-xs text-muted-foreground">Toque no cuidado realizado para registrar a hora real no servidor.</p>
            <div className="space-y-1.5">
              {tasks.map(task=>{const Icon=categoryInfo[task.category]?.icon??Pill;return <div key={task.id} className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-2.5">
                <Icon size={18} className="shrink-0 text-primary"/>
                <div className="min-w-0 flex-1"><strong className="block truncate text-xs text-foreground">{task.title}</strong><p className="text-[10px] text-muted-foreground">{timeInAcre(task.scheduled_at)} · {task.completed_at?`Confirmado às ${timeInAcre(task.completed_at)}`:"Aguardando confirmação"}</p></div>
                {task.completed_at?<CheckCircle2 size={18} className="shrink-0 text-success"/>:<button type="button" onClick={()=>askConfirm(task)} className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-bold text-primary-foreground">Confirmar</button>}
                {task.category==="refeicao"&&<button type="button" title="Excluir refeição" aria-label={`Excluir ${task.title}`} onClick={()=>{setPending(null);setMealToDelete(task)}} className="shrink-0 rounded-lg border border-destructive/30 p-1.5 text-destructive hover:bg-destructive/10"><Trash2 size={15}/></button>}
              </div>})}
              {!tasks.length&&<p className="text-sm text-muted-foreground">Nenhum cuidado cadastrado para hoje.</p>}
            </div>
          </div>}
          {activeTab==="hidratacao"&&<div className="space-y-3">
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/55 p-1" role="group" aria-label="Bebidas e hidratação">
              <button type="button" aria-pressed={hydrationView==="agua"} onClick={()=>setHydrationView("agua")} className={`rounded-lg px-2 py-2 text-xs font-bold ${hydrationView==="agua"?"bg-primary text-primary-foreground":"text-muted-foreground"}`}>Programa de água</button>
              <button type="button" aria-pressed={hydrationView==="bebidas"} onClick={()=>setHydrationView("bebidas")} className={`rounded-lg px-2 py-2 text-xs font-bold ${hydrationView==="bebidas"?"bg-primary text-primary-foreground":"text-muted-foreground"}`}>Chás e bebidas</button>
            </div>
            {hydrationView==="agua"
              ? <ClientHydrationTab patientId={client.id} ownerId={client.owner_id} tasks={tasks} revision={tick} onConfirm={askConfirm} onRecorded={()=>setTick(value=>value+1)}/>
              : <ClientBeverageTracker patientId={client.id} ownerId={client.owner_id} revision={tick} onRecorded={()=>setTick(value=>value+1)}/>}
          </div>}
          {activeTab==="historico"&&<div><h2 className="mb-1 flex items-center gap-2 text-sm font-extrabold text-foreground"><History size={17} className="text-primary"/> Histórico e prontuário</h2><p className="mb-2 text-xs text-muted-foreground">Datas e horários auditáveis, sem alterar registros originais.</p><PatientActivityHistory patientId={client.id} ownerId={client.owner_id} revision={tick}/></div>}
          {activeTab==="alimentacao"&&<div><h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground"><UtensilsCrossed size={17} className="text-primary"/> Alimentação de hoje</h2><p className="mt-1 text-xs text-muted-foreground">Orientações ilustrativas; siga as orientações do profissional responsável.</p><div className="mt-2 space-y-2">
            {meals.map(meal=><div key={meal.id} className="rounded-xl border border-border bg-muted/25 p-3">
              <div className="flex items-center justify-between gap-2"><strong className="text-xs text-foreground">{meal.title}</strong><span className="text-[10px] text-muted-foreground">{timeInAcre(meal.scheduled_at)}</span></div>
              <p className="mt-1 text-xs text-muted-foreground">{mealGuide[meal.title]??"Alimentação leve conforme tolerância."}</p>
              {meal.completed_at?<p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-success"><CheckCircle2 size={14}/> Confirmado às {timeInAcre(meal.completed_at)}</p>:<button type="button" className="mt-2 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/20" onClick={()=>askConfirm(meal)}>{Date.now()<Date.parse(meal.scheduled_at)?"Verificar registro antecipado":"Confirmar refeição"}</button>}
              <button type="button" className="ml-2 mt-2 inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-2.5 py-1.5 text-[11px] font-semibold text-destructive hover:bg-destructive/10" onClick={()=>{setPending(null);setMealToDelete(meal)}}><Trash2 size={13}/> Excluir refeição</button>
            </div>)}
            {!meals.length&&<p className="text-sm text-muted-foreground">Sem refeições agendadas.</p>}
          </div></div>}
        </section>
      </div>

      <ClientTodayTimeline tasks={tasks} onConfirm={askConfirm}/>
    </div>}
    {confirmationResult&&<div className="fixed inset-x-3 top-16 z-[95] mx-auto max-w-lg" role={confirmationResult.success?"status":"alert"} aria-live={confirmationResult.success?"polite":"assertive"}>
      <div className={`flex items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-lg ${confirmationResult.success?"border-emerald-400 bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50":"border-rose-400 bg-rose-50 text-rose-950 dark:bg-rose-950 dark:text-rose-50"}`}>
        {confirmationResult.success?<CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-300" size={24}/>:<AlertTriangle className="mt-0.5 shrink-0 text-rose-700 dark:text-rose-300" size={24}/>}
        <div className="min-w-0 flex-1"><p className="text-sm font-bold">{confirmationResult.title}</p><p className="mt-1 text-xs leading-relaxed">{confirmationResult.detail}</p></div>
        <button type="button" onClick={()=>setConfirmationResult(null)} aria-label="Fechar mensagem" className="rounded-lg border border-current/15 p-1"><X size={17}/></button>
      </div>
    </div>}
    {notice && <div role="status" className="pointer-events-none fixed inset-x-3 bottom-5 z-[95] mx-auto max-w-xl"><p className="pointer-events-auto rounded-xl border border-primary/20 bg-card px-4 py-3 text-sm text-foreground shadow-xl">{notice}</p></div>}
    {locked && <div role="dialog" aria-label="Acesso restrito" className="m-5 rounded-2xl border border-[#aec8d6] bg-[#eff5f8] p-5">
      <div className="flex items-center gap-2 font-bold text-[#163b56]"><LockKeyhole size={19}/> Acesso necessário</div>
      <p className="mt-2 text-sm text-[#456478]">Para proteger as informações de saúde, faça login antes de visualizar ou confirmar atividades do cliente.</p>
      <div className="mt-4 flex flex-wrap gap-2"><Link to="/entrar" className="rounded-xl bg-[#216083] px-5 py-3 text-sm font-semibold text-white">Ir para a tela de login</Link><button onClick={() => setLocked(false)} className="rounded-xl border border-[#b8d2df] px-4 py-3 text-sm">Fechar</button></div>
    </div>}
    {pending?.category === "medicacao" && typeof document !== "undefined" && createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#071b2c]/75 p-3 backdrop-blur-sm" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)setPending(null)}}>
        <section role="dialog" aria-modal="true" aria-labelledby="med-confirm-title" className="flex w-full max-w-[390px] max-h-[min(88dvh,430px)] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl">
          <div className="flex shrink-0 items-center gap-2.5 bg-gradient-to-r from-[#153d59] to-[#216083] px-3 py-2.5 text-white">
            <svg viewBox="0 0 48 48" className="size-10 shrink-0" role="img" aria-label="Cápsula e relógio">
              <rect x="4" y="13" width="31" height="14" rx="7" transform="rotate(-26 20 20)" fill="#f3fbff"/>
              <path d="m20 6 9-4a7 7 0 0 1 6 13l-10 5Z" fill="#81d3ee"/>
              <circle cx="35" cy="33" r="12" fill="#163d58" stroke="#b5e8f5" strokeWidth="2"/>
              <path d="M35 26v7l5 3" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
            </svg>
            <div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase tracking-widest text-sky-200">Confirmação segura</p><h3 id="med-confirm-title" className="text-base font-extrabold leading-tight">Tomou a medicação agora?</h3></div>
            <button type="button" aria-label="Fechar janela" disabled={busy} onClick={()=>setPending(null)} className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/15 hover:bg-white/25"><X size={16}/></button>
          </div>
          <div className="min-h-0 space-y-2 overflow-y-auto px-3 py-2.5">
            <div className="rounded-lg bg-muted px-2.5 py-2">
              <p className="text-xs font-bold text-foreground">{pending.title}</p>
              <p className="text-[11px] text-muted-foreground">Prevista: {timeInAcre(pending.scheduled_at)} · Acre</p>
            </div>
            {Date.now()>new Date(pending.scheduled_at).getTime()+15*60000&&
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-2.5 py-2 text-xs">
                <p className="flex items-center gap-1.5 font-bold text-foreground"><AlertTriangle size={14} className="shrink-0 text-warning"/> Fora do horário previsto</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{Date.now()>new Date(pending.scheduled_at).getTime()?"Horário ultrapassado.":"Horário ainda não atingido."} Confirme somente se tomou agora. Não dobre a dose.</p>
                {Date.now()>new Date(pending.scheduled_at).getTime()&&<label className="mt-1.5 block text-[11px] font-semibold text-foreground">Motivo (opcional)
                  <select value={lateReason} onChange={e=>setLateReason(e.target.value)} className="mt-1 h-8 w-full rounded-lg border border-input bg-background px-2 text-xs text-foreground">
                    <option value="acordei_tarde">Acordei mais tarde</option><option value="rotina">Mudança na rotina</option><option value="outro">Outro motivo</option>
                  </select>
                </label>}
              </div>}
            <p className="text-[10px] leading-snug text-muted-foreground">A confirmação será registrada com data e hora reais do servidor. Não antecipe medicamentos sem orientação do profissional responsável.</p>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border bg-card px-3 py-2.5">
            <button type="button" disabled={busy} onClick={()=>setPending(null)} className="h-9 rounded-lg border border-border text-xs font-semibold text-foreground">Cancelar</button>
            <button type="button" disabled={busy} onClick={()=>void confirm()} className="h-9 rounded-lg bg-primary px-2 text-xs font-bold text-primary-foreground disabled:opacity-60">{busy?"Registrando…":"Sim, tomei agora"}</button>
          </div>
        </section>
      </div>,
      document.body
    )}
    {pending && pending.category !== "medicacao" && typeof document !== "undefined" && createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setPending(null)}}>
        <section role="dialog" aria-modal="true" aria-labelledby="care-confirm-title" className="w-full max-w-[390px] overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-primary/10 px-4 py-3">
            <h3 id="care-confirm-title" className="flex items-center gap-2 text-sm font-extrabold text-foreground"><CheckCircle2 size={20} className="text-primary"/> Confirmar cuidado realizado</h3>
            <button type="button" disabled={busy} onClick={()=>setPending(null)} aria-label="Fechar confirmação" className="grid size-8 place-items-center rounded-lg hover:bg-muted"><X size={17}/></button>
          </div>
          <div className="space-y-3 px-4 py-3">
            <div className="rounded-xl border border-border bg-muted/45 p-3">
              <p className="text-sm font-bold">{pending.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">Horário programado: {timeInAcre(pending.scheduled_at)} (Acre)</p>
            </div>
            {pending.category==="refeicao"&&(Date.now()<Date.parse(pending.scheduled_at)
              ? <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                  <p className="flex items-center gap-2 text-xs font-extrabold text-foreground"><AlertTriangle size={17} className="text-warning"/> Verificação de refeição antecipada</p>
                  <p className="text-xs leading-relaxed text-foreground">Esta refeição está programada para {timeInAcre(pending.scheduled_at)} (Acre), e o horário ainda não chegou. Se você já a realizou, poderá registrar antecipadamente após confirmar. A data e a hora reais serão gravadas pelo servidor.</p>
                  <label className="flex items-start gap-2 text-xs font-semibold text-foreground"><input type="checkbox" className="mt-0.5" checked={mealEarlyAcknowledged} onChange={event=>setMealEarlyAcknowledged(event.target.checked)}/><span>Confirmo que já realizei esta refeição e desejo registrar agora, antes do horário programado.</span></label>
                </div>
              : <p className="text-xs leading-relaxed text-muted-foreground">Confirme somente se realizou esta refeição. O registro será salvo com a data e a hora reais do servidor.</p>)}
            {pending.category==="hidratacao"&&<label className="block text-xs font-bold text-foreground">Volume de água realmente consumido (ml)
              <input className="field mt-1.5 w-full" type="number" min={10} max={1500} step={10} value={amount} onChange={e=>setAmount(e.target.value)}/>
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">Confirme apenas a quantidade que você bebeu agora.</span>
            </label>}
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-border px-4 py-3">
            <button type="button" disabled={busy} onClick={()=>setPending(null)} className="h-10 rounded-xl border border-border text-xs font-bold text-foreground">Cancelar</button>
            <button type="button" disabled={busy||(pending.category==="refeicao"&&Date.now()<Date.parse(pending.scheduled_at)&&!mealEarlyAcknowledged)} onClick={()=>void confirm()} className="h-10 rounded-xl bg-primary px-2 text-xs font-extrabold text-primary-foreground disabled:opacity-60">{busy?"Registrando…":pending.category==="refeicao"&&Date.now()<Date.parse(pending.scheduled_at)?"Confirmar antecipação":"Confirmar agora"}</button>
          </div>
        </section>
      </div>,
      document.body
    )}
    {mealToDelete && typeof document !== "undefined" && createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)setMealToDelete(null)}}>
        <section role="alertdialog" aria-modal="true" aria-labelledby="delete-meal-title" aria-describedby="delete-meal-description" className="w-full max-w-[410px] rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl">
          <div className="flex items-center gap-2"><Trash2 size={22} className="text-destructive"/><h3 id="delete-meal-title" className="text-base font-extrabold">Confirmar exclusão de refeição</h3></div>
          <p id="delete-meal-description" className="mt-3 text-sm leading-relaxed">Deseja realmente excluir <strong>{mealToDelete.title}</strong>, programada para {timeInAcre(mealToDelete.scheduled_at)} (Acre)? A refeição será retirada da agenda, mas a data, a hora e o responsável pela exclusão permanecerão registrados no histórico de auditoria.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" disabled={busy} onClick={()=>setMealToDelete(null)} className="rounded-xl border border-border px-3 py-2 text-xs font-bold">Cancelar</button>
            <button type="button" disabled={busy} onClick={()=>void deleteMeal()} className="rounded-xl bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground disabled:opacity-60">{busy?"Excluindo…":"Sim, excluir refeição"}</button>
          </div>
        </section>
      </div>, document.body
    )}
  </section>;
}
