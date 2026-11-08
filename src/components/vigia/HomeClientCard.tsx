import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, CalendarDays, CheckCircle2, Droplets, History, LayoutDashboard, LockKeyhole, Pill, Target, UtensilsCrossed, BookOpen, UserRound, AlertTriangle, Trash2, X, Activity, Clock3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CompactTreatmentBlister } from "./CompactTreatmentBlister";
import { PatientActivityHistory } from "./PatientActivityHistory";
import { ClientHydrationTab } from "./ClientHydrationTab";
import { ClientAgendaPage } from "./ClientAgendaPage";
import { ClientMealsPage } from "./ClientMealsPage";
import { ClientNutritionStudio } from "./ClientNutritionStudio";
import { ClientSectionHeader } from "./ClientSectionHeader";
import { clientSectionFromHash, clientSectionHash, type ClientSection } from "@/lib/client-pages";
import { ClientBeverageTracker } from "./ClientBeverageTracker";
import { ClientQuickIntake } from "./ClientQuickIntake";
import { CareTaskRecordModal } from "./CareTaskRecordModal";
import { CareReminderBeacon } from "./CareReminderBeacon";
import { ClientTodayTimeline } from "./ClientTodayTimeline";
import { CareRecentHistory } from "./CareRecentHistory";
import { ClientHealthProfile } from "./ClientHealthProfile";
import { ClientOverviewIndicators } from "./ClientOverviewIndicators";
import "./client-overview-premium.css";
import { canConfirmCare, careScheduleBlockMessage, careScheduleLabel, getCareScheduleState } from "@/lib/care-schedule";
import "./client-dashboard-art.css";

type Client = { id: string; owner_id: string; full_name: string; status: string; care_goal: string | null; height_cm: number | null; weight_kg: number | null };
type OverviewHealthProfile = { age: number | null; activityMinutes: number; weightKg: number | null; objective: string | null; protein: number | null; carbs: number | null; fat: number | null; kcal: number | null };
type Task = { id: string; patient_id: string; title: string; category: string; scheduled_at: string; completed_at: string | null };
const db = supabase as unknown as { from: (table: string) => any; auth: typeof supabase.auth };
const tz = "America/Rio_Branco";
const dayInAcre = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const dateInAcre = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday:"long", day:"2-digit", month:"long" }).format(d);
const timeInAcre = (iso: string) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(iso));
function LiveCareCountdown({scheduledAt}:{scheduledAt:string}){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{
  const update=()=>setNow(Date.now());
  const id=window.setInterval(update,1000);
  window.addEventListener("focus",update);
  return()=>{window.clearInterval(id);window.removeEventListener("focus",update);};
 },[]);
 const ms=Math.max(0,Date.parse(scheduledAt)-now);
 const seconds=Math.ceil(ms/1000);
 const display=[Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60]
  .map(value=>String(value).padStart(2,"0")).join(":");
 return <span className="mt-1 block text-[11px] font-semibold text-primary" aria-label="Tempo restante para o próximo cuidado">
  {seconds?"Faltam "+display:"Horário previsto já chegou"}
 </span>;
}

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
  const [resolvedStates,setResolvedStates]=useState<Record<string,string>>({});
  const [notice, setNotice] = useState("");
  const [confirmationResult,setConfirmationResult]=useState<{success:boolean;title:string;detail:string}|null>(null);
  const [locked, setLocked] = useState(false);
  const [pending, setPending] = useState<Task | null>(null);
  const [mealToDelete, setMealToDelete] = useState<Task | null>(null);
  const [hydrationView, setHydrationView] = useState<"agua" | "bebidas">("agua");
  const [amount, setAmount] = useState("200");
  const [mealDescription,setMealDescription]=useState("");
  const [detailTask,setDetailTask]=useState<Task|null>(null);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<ClientSection>(()=>typeof window!=="undefined"?clientSectionFromHash(window.location.hash):"hoje");
  const [tick, setTick] = useState(0);
  const [clock, setClock] = useState<Date | null>(null);
  const [treatmentProgress,setTreatmentProgress] = useState<{confirmed:number;total:number}|null>(null);
  const [hydrationGoal,setHydrationGoal] = useState<{consumed_ml?:number;target_ml?:number;status?:string}|null>(null);
  const [mealRecordCount,setMealRecordCount] = useState<number|null>(null);
  const [mealRecordsLoading,setMealRecordsLoading] = useState(true);
  const [healthProfile,setHealthProfile] = useState<OverviewHealthProfile>({age:null,activityMinutes:0,weightKg:null,objective:null,protein:null,carbs:null,fat:null,kcal:null});
  const [activityCount,setActivityCount] = useState<number|null>(null);
  const [historyCategory,setHistoryCategory] = useState<"todos"|"hidratacao"|"refeicao"|"medicacao">("todos");
  const [showHealthProfile,setShowHealthProfile] = useState(false);
  const mealRecordDay=dayInAcre(clock??new Date());
  useEffect(()=>{
    const syncHash=()=>setActiveTab(clientSectionFromHash(window.location.hash));
    window.addEventListener("hashchange",syncHash);
    window.addEventListener("popstate",syncHash);
    return()=>{
      window.removeEventListener("hashchange",syncHash);
      window.removeEventListener("popstate",syncHash);
    };
  },[]);
  function openSection(section:ClientSection){
    setActiveTab(section);
    if(typeof window!=="undefined"){
      const desired=clientSectionHash(section);
      if(window.location.hash!==desired){
        window.history.pushState(window.history.state,"",window.location.pathname+window.location.search+desired);
      }
    }
  }
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
        ? await db.from("care_patients").select("id,owner_id,full_name,status,care_goal,height_cm,weight_kg").eq("id",assignedId).limit(1)
        : await db.from("care_patients").select("id,owner_id,full_name,status,care_goal,height_cm,weight_kg").eq("owner_id", owner).order("created_at", {ascending: true}).limit(1);
      if (!active) return;
      if (res.error) { setNotice("Não foi possível consultar o prontuário."); return; }
      const first = (res.data ?? [])[0] as Client | undefined;
      setClient(first ?? null);
      if (!first) { setTasks([]); setResolvedStates({}); return; }
      const date = dayInAcre(new Date());
      const from = new Date(date + "T00:00:00-05:00").toISOString();
      const until = new Date(new Date(from).getTime() + 86400000).toISOString();
      const rows = await db.from("care_daily_checklist").select("id,patient_id,title,category,scheduled_at,completed_at")
        .eq("owner_id",first.owner_id).eq("patient_id",first.id).gte("scheduled_at",from).lt("scheduled_at",until)
        .in("category",["medicacao","hidratacao","refeicao","outro"]).order("scheduled_at",{ascending:true}).limit(120);
      if(!active)return;
      if(rows.error){setNotice("Não foi possível carregar a agenda de hoje.");return;}
      const eligible=(rows.data??[]).filter((task:Task)=>task.category!=="outro"||
        /suplement|vitamin|creatina|whey|ômega|omega|minerais|magnésio|magnesio/i.test(task.title));
      const ids=eligible.map((task:Task)=>task.id);
      const [decisions,waterAnswers]=ids.length?await Promise.all([
        db.from("care_task_resolutions").select("task_id,status")
          .eq("patient_id",first.id).eq("owner_id",first.owner_id)
          .in("task_id",ids).limit(120),
        db.from("care_hydration_responses").select("task_id,response")
          .eq("patient_id",first.id).eq("owner_id",first.owner_id)
          .in("task_id",ids).eq("response","not_drunk").limit(120)
      ]):[{data:[],error:null},{data:[],error:null}];
      if(!active)return;
      if(decisions.error||waterAnswers.error){
        setNotice("Não foi possível verificar todas as respostas. Consulte o prontuário antes de confirmar.");
      }
      const resolutionMap:Record<string,string>={};
      for(const record of decisions.data??[])resolutionMap[record.task_id]=record.status;
      for(const record of waterAnswers.data??[])resolutionMap[record.task_id]="nao_bebi";
      setResolvedStates(resolutionMap);
      setTasks(eligible);
    };
    void load();
    return () => { active = false; };
  }, [owner, tick]);

  useEffect(() => {
    if (!client?.id) { setHydrationGoal(null); return; }
    let active = true;
    void (supabase as any).rpc("care_sync_hydration_goal", { p_patient_id: client.id })
      .then((result: any) => {
        if (active) setHydrationGoal(result.error ? null : (result.data ?? null));
      }, () => { if (active) setHydrationGoal(null); });
    return () => { active = false; };
  }, [client?.id, client?.owner_id, tick]);

  // Metas e perfil são somente leitura nesta visão geral; a edição continua no modal Meu perfil.
  useEffect(() => {
    if (!client?.id || !client?.owner_id) {
      setHealthProfile({age:null,activityMinutes:0,weightKg:null,objective:null,protein:null,carbs:null,fat:null,kcal:null});
      return;
    }
    let active = true;
    void Promise.all([
      db.from("care_hydration_profiles").select("age,activity_minutes,weight_kg")
        .eq("patient_id",client.id).eq("owner_id",client.owner_id).maybeSingle(),
      db.from("care_nutrition_preferences").select("weight_kg,objective,target_protein_g,target_carbs_g,target_fat_g,target_kcal")
        .eq("patient_id",client.id).eq("owner_id",client.owner_id).maybeSingle()
    ]).then(([hydration,nutrition]) => {
      if (!active) return;
      const num = (value:unknown):number|null => {
        if (value===null||value===undefined||value==="") return null;
        const parsed=Number(value);
        return Number.isFinite(parsed)&&parsed>0?parsed:null;
      };
      setHealthProfile({
        age:num(hydration.data?.age),
        activityMinutes:num(hydration.data?.activity_minutes)??0,
        weightKg:num(nutrition.data?.weight_kg)??num(hydration.data?.weight_kg)??num(client.weight_kg),
        objective:typeof nutrition.data?.objective==="string"?nutrition.data.objective:client.care_goal,
        protein:num(nutrition.data?.target_protein_g),
        carbs:num(nutrition.data?.target_carbs_g),
        fat:num(nutrition.data?.target_fat_g),
        kcal:num(nutrition.data?.target_kcal)
      });
    }).catch(() => { if(active) setHealthProfile({age:null,activityMinutes:0,weightKg:client.weight_kg,objective:client.care_goal,protein:null,carbs:null,fat:null,kcal:null}); });
    return () => { active=false; };
  }, [client?.id,client?.owner_id,client?.weight_kg,client?.care_goal,tick]);

  // A atividade só aparece quando existe um evento real lançado no prontuário.
  useEffect(() => {
    if (!client?.id || !client?.owner_id) { setActivityCount(null); return; }
    let active=true;
    const from=new Date(mealRecordDay+"T00:00:00-05:00").toISOString();
    const until=new Date(new Date(from).getTime()+86400000).toISOString();
    void db.from("care_activity_log").select("id")
      .eq("patient_id",client.id).eq("owner_id",client.owner_id).eq("category","atividade")
      .in("event_type",["confirmed","logged"]).gte("recorded_at",from).lt("recorded_at",until).limit(200)
      .then((result:any) => { if(active) setActivityCount(result.error?null:(result.data??[]).length); })
      .catch(() => { if(active) setActivityCount(null); });
    return () => { active=false; };
  }, [client?.id,client?.owner_id,mealRecordDay,tick]);

  // Conta registros alimentares reais do prontuário, sem confundir com a agenda.
  // Confirmações programadas e lançamentos avulsos vêm do mesmo histórico auditável.
  useEffect(() => {
    if (!client?.id || !client?.owner_id) {
      setMealRecordCount(0);
      setMealRecordsLoading(false);
      return;
    }
    let active = true;
    setMealRecordsLoading(true);
    const from = new Date(mealRecordDay + "T00:00:00-05:00").toISOString();
    const until = new Date(new Date(from).getTime() + 86400000).toISOString();
    void (async () => {
      const [result,foodRows,mealRows] = await Promise.all([
        (supabase as any).from("care_activity_log")
          .select("id,task_id,event_type,source,details")
          .eq("patient_id", client.id)
          .eq("owner_id", client.owner_id)
          .eq("category", "refeicao")
          .in("event_type", ["confirmed", "logged"])
          .gte("happened_at", from)
          .lt("happened_at", until)
          .limit(200),
        (supabase as any).from("care_food_consumptions")
          .select("id,request_id,meal_group_id")
          .eq("patient_id", client.id)
          .eq("owner_id", client.owner_id)
          .gte("recorded_at", from)
          .lt("recorded_at", until)
          .limit(500),
        (supabase as any).from("care_nutrition_meal_logs")
          .select("id,request_id")
          .eq("patient_id", client.id)
          .eq("owner_id", client.owner_id)
          .gte("recorded_at", from)
          .lt("recorded_at", until)
          .limit(500),
      ]);
      if (!active) return;
      if (result.error || foodRows.error || mealRows.error) {
        setMealRecordCount(null);
        setMealRecordsLoading(false);
        return;
      }
      const uniqueRecords = new Set<string>();
      const foodRequests = new Set((foodRows.data ?? [])
        .map((row:any)=>row.request_id).filter(Boolean));
      for (const row of foodRows.data ?? []) {
        const groupId=typeof row.meal_group_id==="string"?row.meal_group_id:null;
        const requestId=typeof row.request_id==="string"?row.request_id:null;
        uniqueRecords.add(groupId?"group:"+groupId:requestId?"request:"+requestId:"food:"+row.id);
      }
      for (const row of mealRows.data ?? []) {
        if(row.request_id&&foodRequests.has(row.request_id))continue;
        uniqueRecords.add(row.request_id?"request:"+row.request_id:"nutrition:"+row.id);
      }
      for (const row of result.data ?? []) {
        const details = row.details && typeof row.details === "object"
          ? row.details as Record<string, unknown>
          : {};
        if (row.event_type === "confirmed") {
          uniqueRecords.add(row.task_id ? "task:" + row.task_id : "log:" + row.id);
        } else if (
          row.event_type === "logged" &&
          row.source === "client_unscheduled_intake" &&
          details.superseded !== true
        ) {
          const linkedTask = typeof details.linked_task_id === "string"
            ? details.linked_task_id
            : null;
          uniqueRecords.add(linkedTask ? "task:" + linkedTask : "log:" + row.id);
        }
      }
      setMealRecordCount(uniqueRecords.size);
      setMealRecordsLoading(false);
    })();
    return () => { active = false; };
  }, [client?.id, client?.owner_id, tick, mealRecordDay]);

  const completed = tasks.filter(t => Boolean(t.completed_at)).length;
  const nextCare = tasks.find(t => !t.completed_at && !resolvedStates[t.id] && Date.parse(t.scheduled_at) >= (clock?.getTime() ?? Date.now()))
    ?? tasks.find(t => !t.completed_at && !resolvedStates[t.id] && getCareScheduleState(t, clock?.getTime() ?? Date.now()) === "available");
  const meals = tasks.filter(t => t.category === "refeicao");
  const mealGuide: Record<string,string> = { "Café da manhã":"Aveia cozida em água ou leite sem lactose, se tolerado, com banana madura.", "Lanche da manhã":"Mamão ou banana madura; ajuste à sua tolerância.", "Almoço":"Arroz, frango cozido ou grelhado sem excesso de gordura, batata e legumes cozidos.", "Lanche da tarde":"Batata-doce cozida ou fruta tolerada.", "Jantar":"Sopa suave de legumes e frango desfiado, sem pimenta.", "Ceia":"Mingau leve de aveia ou banana, conforme tolerância." };

  function showTaskDetails(task: Task) { setDetailTask(task);setConfirmationResult(null); }

  function askConfirm(task: Task) {
    if (!owner || !client) { setLocked(true); return; }
    if(resolvedStates[task.id]){showTaskDetails(task);return;}
    if (!canConfirmCare(task) && !(task.category === "medicacao" && !task.completed_at && Date.now() >= Date.parse(task.scheduled_at))) {
      setPending(null);
      setConfirmationResult({success:false,title:"Confirmação indisponível",detail:careScheduleBlockMessage(task)});
      return;
    }
    setNotice("");
    setConfirmationResult(null);
    if(task.category==="refeicao")setMealDescription("");
    setPending(task);
  }

  async function confirm() {
    if (!pending || !owner || !client || busy) return;
    if (!canConfirmCare(pending) && !(pending.category === "medicacao" && !pending.completed_at && Date.now() >= Date.parse(pending.scheduled_at))) {
      setConfirmationResult({success:false,title:"Confirmação fora do horário",detail:careScheduleBlockMessage(pending)});
      setPending(null);
      return;
    }
    if (pending.category === "hidratacao" && (!Number.isInteger(Number(amount)) || Number(amount) < 10 || Number(amount) > 1500)) {
      setNotice("Informe o volume de água realmente consumido (10 a 1.500 ml).");
      return;
    }
    if(pending.category==="refeicao"&&(mealDescription.trim().length<3||mealDescription.trim().length>1000)){setNotice("Descreva os alimentos consumidos (3 a 1.000 caracteres).");return;}
    setBusy(true);
    try {
      const payload = pending.category === "hidratacao" ? Number(amount) : null;
      const result = pending.category==="refeicao" ? await (supabase as any).rpc("care_confirm_meal",{p_task_id:pending.id,p_description:mealDescription.trim()}) : await (supabase as any).rpc("care_confirm_task", {p_task_id:pending.id,p_water_ml:payload});
      if (result.error) throw result.error;
      if (typeof result.data !== "string" || !Number.isFinite(Date.parse(result.data))) throw new Error("Missing server timestamp");
      const verified = await (supabase as any).from("care_daily_checklist").select("id,completed_at")
        .eq("id",pending.id).eq("patient_id",client.id).single();
      if (verified.error || !verified.data?.completed_at) throw new Error("Could not verify record");
      setTasks(previous=>previous.map(t=>t.id===pending.id?{...t,completed_at:verified.data.completed_at}:t));
      setTick(value=>value+1);
      const actual = new Intl.DateTimeFormat("pt-BR",{timeZone:tz,day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date(verified.data.completed_at));
      setConfirmationResult({success:true,
        title:pending.category==="medicacao"?"Medicação registrada com sucesso!":pending.category==="refeicao"?"Refeição registrada com sucesso!":"Hidratação registrada com sucesso!",
        detail:`${pending.title} · ${actual} (horário do Acre). ${pending.category==="medicacao" && Date.parse(verified.data.completed_at)>=Date.parse(pending.scheduled_at)+900000?"Tomada atrasada registrada. ":""}Data e hora reais salvas no prontuário. Próximos horários elegíveis são recalculados automaticamente.`});
      setNotice("");
      setPending(null);
      setMealDescription("");
    } catch (failure) {
      const message=failure instanceof Error?failure.message:"";
      const detail=/Care window not started/i.test(message)?"O horário programado ainda não chegou. Nenhuma confirmação foi salva."
        :/Care window expired|Early meal confirmation disabled/i.test(message)?"O servidor conectado ainda utiliza uma regra antiga. Atualize o aplicativo e verifique se o Supabase correto está configurado."
        :/already completed/i.test(message)?"Este cuidado já foi confirmado. Atualize a agenda."
        :/Water was already marked as not drunk/i.test(message)?"Este horário foi registrado como Não bebi e não pode ser confirmado novamente."
        :/task unavailable|authentication|permission|denied|401|403/i.test(message)?"Sua sessão não tem acesso a este cuidado. Entre novamente e consulte seu prontuário."
        :"O registro não pôde ser confirmado. Confira sua conexão e o histórico antes de tentar novamente.";
      setConfirmationResult({success:false,title:"Não foi possível confirmar",detail});
      setNotice(detail);
      setTick(value=>value+1);
    } finally {setBusy(false);}
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
  const hydrationTasks=tasks.filter(task=>task.category==="hidratacao");
  const hydrationConfirmed=hydrationTasks.filter(task=>Boolean(task.completed_at)).length;
  const mealConfirmed=tasks.filter(task=>task.category==="refeicao"&&Boolean(task.completed_at)).length;
  const progressPercent=treatmentProgress?Math.min(100,Math.round(treatmentProgress.confirmed/treatmentProgress.total*100)):0;
  const hydrationTarget=Number(hydrationGoal?.target_ml)||0;
  const hydrationConsumed=Number(hydrationGoal?.consumed_ml)||0;
  const hydrationPercent=hydrationTarget>0?Math.min(100,Math.round(hydrationConsumed/hydrationTarget*100)):(hydrationTasks.length?Math.round(hydrationConfirmed/hydrationTasks.length*100):0);
  const mealTotal=meals.length;
  const mealPercent=mealTotal?Math.round(mealConfirmed/mealTotal*100):0;
  const medicinePercent=treatmentProgress?progressPercent:(medicineTasks.length?Math.round(medicineConfirmed/medicineTasks.length*100):0);
  const medicineValue=treatmentProgress?`${treatmentProgress.confirmed}/${treatmentProgress.total}`:`${medicineConfirmed}/${medicineTasks.length}`;
  const tabs=[
    {key:"hoje",label:"Visão geral",icon:LayoutDashboard},
    {key:"agenda",label:"Agenda",icon:CalendarDays},
    {key:"hidratacao",label:"Minha hidratação",icon:Droplets},
    {key:"historico",label:"Histórico",icon:History},
    {key:"alimentacao",label:"Alimentação",icon:UtensilsCrossed},
    {key:"cardapios",label:"Cardápios e dietas",icon:BookOpen},
  ] as const;

  return <section aria-label="Painel de acompanhamento individual do cliente" className={`care-client-dashboard care-client-art-reference care-client-route care-client-one-window ${activeTab==="hoje"?"care-client-overview-v2":""} flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[22px] border border-border bg-card/95 shadow-[0_20px_60px_-44px_rgba(25,65,54,.45)]`}>
    {loading ? <p role="status" className="p-6 text-sm text-muted-foreground">Verificando acesso seguro…</p> : !owner ? <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
      <div><div className="flex items-center gap-2 font-semibold"><LockKeyhole size={19} className="text-primary"/> Acesso protegido</div><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Entre com sua conta para consultar somente seu acompanhamento e confirmar os cuidados realizados.</p></div>
      <button onClick={() => setLocked(true)} className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Consultar programação</button>
    </div> : !client ? <p className="p-6 text-sm text-muted-foreground">Nenhum prontuário vinculado a esta conta. Confira seu acesso com o responsável.</p> : <div className="care-client-content care-client-one-window-content flex h-full min-h-0 flex-1 flex-col gap-2 p-2 sm:p-3">

      <header className={"care-client-identity shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/[.07] via-card to-primary/[.035] px-3 py-2.5 sm:px-4 "+(activeTab==="hoje"?"flex":"hidden")}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><UserRound size={24}/></span>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-primary">Meu acompanhamento · acesso individual</p>
            <h1 className="truncate text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{patientName||client.full_name}</h1>
            <p className="text-[11px] text-muted-foreground">Tratamento e rotina · {dateInAcre(clock??new Date())} · {completed}/{tasks.length} cuidados concluídos</p>
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <div className="care-client-dose-status flex items-center gap-2 rounded-xl border border-success/20 bg-success/10 px-3 py-2">
            <CheckCircle2 className="shrink-0 text-success" size={21}/>
            <span className="min-w-0"><strong className="block text-xs font-extrabold text-foreground">{medicineTasks.length && medicineConfirmed===medicineTasks.length?"Medicações de hoje confirmadas":"Tratamento em acompanhamento"}</strong>
            <small className="block text-[10px] text-muted-foreground">{medicineTasks.length?`${medicineConfirmed}/${medicineTasks.length} doses confirmadas hoje`:"Nenhuma dose prevista hoje"}</small></span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <ClientQuickIntake patientId={client.id} mode="water" onRecorded={()=>setTick(value=>value+1)}/>
            <ClientQuickIntake patientId={client.id} onRecorded={()=>setTick(value=>value+1)}/>
            <button type="button" className="care-overview-profile-button" onClick={()=>setShowHealthProfile(true)}>Meu perfil</button>
          </div>
        </div>
      </header>

      {activeTab==="hoje"&&<nav className="care-overview-shortcuts" aria-label="Atalhos rápidos">
        <button type="button" onClick={()=>openSection("hidratacao")}><Droplets size={15}/> Água</button>
        <button type="button" onClick={()=>openSection("alimentacao")}><UtensilsCrossed size={15}/> Alimentação</button>
        <button type="button" onClick={()=>document.getElementById("care-overview-medication")?.scrollIntoView({behavior:"smooth",block:"center"})}><Pill size={15}/> Medicação</button>
        <button type="button" onClick={()=>openSection("historico")}><Activity size={15}/> Atividade</button>
        <button type="button" onClick={()=>document.getElementById("care-overview-indicators")?.scrollIntoView({behavior:"smooth",block:"center"})}><Target size={15}/> Indicadores</button>
      </nav>}
      <div className={"care-client-medication-alert shrink-0 "+(activeTab==="hoje"?"hidden":"")}>
        <CareReminderBeacon tasks={tasks} patientId={client.id} ownerId={client.owner_id} refreshKey={tick}
          onOpen={alertTask=>{const task=tasks.find(t=>t.id===alertTask.id);if(task)showTaskDetails(task)}}
          onConfirm={alertTask=>{const task=tasks.find(t=>t.id===alertTask.id);if(task)askConfirm(task)}} compact/>
      </div>

      <div className="care-client-tabs care-client-page-nav grid shrink-0 grid-cols-3 gap-1 rounded-xl border border-border bg-muted/55 p-1 sm:grid-cols-6" role="tablist" aria-label="Páginas do acompanhamento">
        {tabs.map(tab=>{
          const Icon=tab.icon;
          return <button type="button" role="tab" key={tab.key} aria-selected={activeTab===tab.key} aria-controls="care-client-tab-panel"
            onClick={()=>openSection(tab.key)} className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-bold transition-colors sm:text-xs ${activeTab===tab.key?"bg-primary text-primary-foreground shadow-sm":"text-muted-foreground hover:bg-card hover:text-foreground"}`}>
            <Icon size={15} className="shrink-0"/><span className="min-w-0 whitespace-normal break-words text-center leading-tight">{tab.label}</span>
          </button>;
        })}
      </div>

      {activeTab!=="hoje"&&<ClientSectionHeader section={activeTab} count={activeTab==="agenda"?tasks.length:activeTab==="hidratacao"?tasks.filter(t=>t.category==="hidratacao").length:activeTab==="alimentacao"?meals.length:undefined} dateLabel={dateInAcre(clock??new Date())}/>}

      <div id="care-client-tab-panel" role="tabpanel" aria-label={tabs.find(tab=>tab.key===activeTab)?.label}
        data-client-page={activeTab}
        className={"care-client-main care-client-page-main grid min-h-0 min-w-0 flex-1 items-stretch gap-2 "+(activeTab==="hoje"?"care-overview-layout":"grid-cols-1")}>
        {activeTab==="hoje" ? <>
          <div className="care-overview-primary" id="care-overview-medication">
            <CompactTreatmentBlister patientId={client.id} ownerId={client.owner_id} revision={tick} onConfirm={askConfirm} dashboardMode onProgressChange={setTreatmentProgress}/>
            <section className="care-overview-progress" aria-label="Progresso dos cuidados por categoria">
              <div className="care-overview-section-heading">
                <div><span className="care-overview-eyebrow">ACOMPANHAMENTO</span><h3>Progresso dos cuidados</h3></div>
                <span className="care-overview-heading-note">Hoje · Acre</span>
              </div>
              <div className="care-overview-progress-grid">
                <article className="care-overview-progress-item">
                  <header><Droplets size={13}/> Água</header>
                  <strong>{hydrationTarget>0?hydrationConsumed.toLocaleString("pt-BR")+" ml":hydrationConfirmed+"/"+hydrationTasks.length}</strong>
                  <small>{hydrationTarget>0?"de "+hydrationTarget.toLocaleString("pt-BR")+" ml":hydrationTasks.length+" lembretes"}</small>
                  <div className="care-overview-progress-track"><i style={{width:hydrationPercent+"%"}}/></div>
                </article>
                <article className="care-overview-progress-item">
                  <header><UtensilsCrossed size={13}/> Refeições</header>
                  <strong>{mealRecordCount===null?"—":mealRecordCount.toLocaleString("pt-BR")}</strong>
                  <small>{mealRecordCount===null?(mealRecordsLoading?"Consultando":"Indisponível"):`${mealConfirmed}/${mealTotal} confirmadas`}</small>
                  <div className="care-overview-progress-track"><i style={{width:mealPercent+"%"}}/></div>
                </article>
                <article className="care-overview-progress-item">
                  <header><Pill size={13}/> Medicamentos</header>
                  <strong>{medicineValue}</strong>
                  <small>doses confirmadas</small>
                  <div className="care-overview-progress-track"><i style={{width:medicinePercent+"%"}}/></div>
                </article>
                <article className="care-overview-progress-item">
                  <header><Activity size={13}/> Atividade</header>
                  <strong>{activityCount===null?"—":activityCount.toLocaleString("pt-BR")}</strong>
                  <small>{activityCount===null?"Sem dados disponíveis":activityCount===0?"Sem registro hoje":"registros hoje"}</small>
                  <div className="care-overview-progress-track"><i style={{width:activityCount&&activityCount>0?"100%":"0%"}}/></div>
                </article>
              </div>
            </section>
          </div>
          <div className="care-overview-secondary">
            <section className="care-overview-card" aria-label="Resumo do dia">
              <div className="care-overview-section-heading">
                <div><span className="care-overview-eyebrow">SEU DIA</span><h3>Resumo do dia</h3></div>
                <span className="care-overview-heading-note">{dateInAcre(clock??new Date())}</span>
              </div>
              <div className="care-overview-stats">
                <div className="care-overview-stat"><span>Total de cuidados</span><strong>{tasks.length}</strong></div>
                <div className="care-overview-stat is-complete"><span>Concluídos</span><strong>{completed}</strong></div>
                <div className="care-overview-stat"><span>Pendentes</span><strong>{Math.max(0,tasks.length-completed)}</strong></div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-bold text-slate-600">
                <span>Progresso diário</span><span className="tabular-nums">{tasks.length?Math.round(completed/tasks.length*100):0}%</span>
              </div>
              <div className="care-overview-progress-track" role="progressbar" aria-label="Percentual de cuidados concluídos" aria-valuenow={tasks.length?Math.round(completed/tasks.length*100):0} aria-valuemin={0} aria-valuemax={100}>
                <i style={{width:(tasks.length?Math.round(completed/tasks.length*100):0)+"%"}}/>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
                <span className="flex items-center gap-2 text-[10px] font-bold text-sky-800"><Droplets size={15}/> Meta de hidratação</span>
                <strong className="text-[11px] font-extrabold tabular-nums text-sky-900">{hydrationTarget>0?hydrationConsumed.toLocaleString("pt-BR")+" / "+hydrationTarget.toLocaleString("pt-BR")+" ml":"Não disponível"}</strong>
              </div>
            </section>
            <section className="care-overview-card care-overview-next" data-kind={nextCare?.category==="hidratacao"?"hidratacao":undefined} aria-label="Próximo cuidado">
              <div className="flex items-center justify-between gap-2">
                <span className="care-overview-eyebrow">PRÓXIMO CUIDADO</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[9px] font-bold text-slate-600"><Clock3 size={12}/> Horário do Acre</span>
              </div>
              {nextCare ? <>
                <h3 className="mt-1">{nextCare.title}</h3>
                <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                  <strong className="care-overview-next-time">{timeInAcre(nextCare.scheduled_at)}</strong>
                  <span className="text-[10px] font-semibold text-slate-600">{categoryInfo[nextCare.category]?.label??"Atividade"}</span>
                </div>
                <LiveCareCountdown scheduledAt={nextCare.scheduled_at}/>
                <button type="button" onClick={()=>askConfirm(nextCare)}><CheckCircle2 size={14}/> Confirmar / registrar</button>
                {nextCare.category==="hidratacao"&&<small className="mt-1 block text-[9px] font-semibold text-sky-800">Hidratação: registre somente o volume realmente consumido.</small>}
              </> : <p className="mt-2 text-xs">Nenhum cuidado futuro pendente. Consulte o histórico para conferir os registros do dia.</p>}
            </section>
            <section id="care-home-timeline" className="care-overview-agenda" aria-label="Agenda de hoje e histórico recente">
              <div className="care-overview-section-heading">
                <div><span className="care-overview-eyebrow">ROTINA E REGISTROS</span><h3>Agenda e histórico recente</h3></div>
                <button type="button" onClick={()=>openSection("agenda")} className="text-[10px] font-bold text-teal-700">Ver agenda <ArrowRight size={12} className="inline"/></button>
              </div>
              <ClientTodayTimeline tasks={tasks} resolved={resolvedStates} onConfirm={askConfirm} onDetails={showTaskDetails} now={clock?.getTime()}/>
              <div className="care-overview-history-filters" role="group" aria-label="Filtrar histórico recente">
                {([{key:"todos",label:"Todos"},{key:"hidratacao",label:"Água"},{key:"refeicao",label:"Refeições"},{key:"medicacao",label:"Medicamentos"}] as const).map(item=><button key={item.key} type="button" aria-pressed={historyCategory===item.key} onClick={()=>setHistoryCategory(item.key)}>{item.label}</button>)}
              </div>
              <CareRecentHistory patientId={client.id} ownerId={client.owner_id} category={historyCategory} compact/>
            </section>
            <div id="care-overview-indicators">
              <ClientOverviewIndicators heightCm={client.height_cm} weightKg={healthProfile.weightKg??client.weight_kg} waterTarget={hydrationTarget||null}
                protein={healthProfile.protein} carbs={healthProfile.carbs} fat={healthProfile.fat} kcal={healthProfile.kcal}/>
            </div>
          </div>
        </> : <section data-page={activeTab} className="care-client-summary care-client-page-content min-h-0 min-w-0 rounded-2xl border border-border bg-card overflow-y-auto overscroll-contain p-2 sm:p-3" aria-label={"Página "+tabs.find(tab=>tab.key===activeTab)?.label}>
          {activeTab==="agenda"&&<ClientAgendaPage tasks={tasks} resolved={resolvedStates} now={clock?.getTime()}
            onView={showTaskDetails} onConfirm={askConfirm}/>}
          {activeTab==="hidratacao"&&<div className="care-client-hydration-page flex h-full min-h-0 flex-col gap-2">
            <div className="care-client-hydration-switch grid shrink-0 grid-cols-2 gap-1 rounded-xl border border-border bg-muted/45 p-1" role="group" aria-label="Bebidas e hidratação">
              <button type="button" aria-pressed={hydrationView==="agua"} onClick={()=>setHydrationView("agua")}
                className={`rounded-lg px-3 py-2.5 text-xs font-bold transition-colors ${hydrationView==="agua"?"bg-primary text-primary-foreground shadow-sm":"text-muted-foreground hover:bg-card"}`}>Minha meta de água</button>
              <button type="button" aria-pressed={hydrationView==="bebidas"} onClick={()=>setHydrationView("bebidas")}
                className={`rounded-lg px-3 py-2.5 text-xs font-bold transition-colors ${hydrationView==="bebidas"?"bg-primary text-primary-foreground shadow-sm":"text-muted-foreground hover:bg-card"}`}>Chás e bebidas</button>
            </div>
            <div className="care-client-hydration-content min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl border border-border/55 bg-card/45 p-2 sm:p-3">
              {hydrationView==="agua"
                ? <ClientHydrationTab patientId={client.id} ownerId={client.owner_id} tasks={tasks} revision={tick} onConfirm={askConfirm} onRecorded={()=>setTick(value=>value+1)}/>
                : <ClientBeverageTracker patientId={client.id} ownerId={client.owner_id} revision={tick} onRecorded={()=>setTick(value=>value+1)}/>}
            </div>
          </div>}
          {activeTab==="historico"&&<PatientActivityHistory patientId={client.id} ownerId={client.owner_id} revision={tick} onRecordChanged={()=>setTick(value=>value+1)}/>}
          {activeTab==="alimentacao"&&<ClientMealsPage patientId={client.id} ownerId={client.owner_id}
            meals={meals} resolved={resolvedStates} revision={tick} now={clock?.getTime()}
            onView={showTaskDetails} onConfirm={askConfirm}
            onDelete={meal=>{const item=tasks.find(task=>task.id===meal.id);if(item){setPending(null);setMealToDelete(item);}}}
            onRecorded={()=>setTick(value=>value+1)}/>}
          {activeTab==="cardapios"&&<ClientNutritionStudio patientId={client.id} ownerId={client.owner_id} onLogged={()=>setTick(v=>v+1)}/>}

        </section>}
      </div>

    </div>}
    {showHealthProfile&&client&&<ClientHealthProfile patientId={client.id} ownerId={client.owner_id}
      initial={{weight:healthProfile.weightKg??client.weight_kg,height:client.height_cm,age:healthProfile.age,objective:healthProfile.objective,
        protein:healthProfile.protein,carbs:healthProfile.carbs,fat:healthProfile.fat,kcal:healthProfile.kcal,activityMinutes:healthProfile.activityMinutes}}
      onSaved={()=>setTick(value=>value+1)} onClose={()=>setShowHealthProfile(false)}/>}
    <CareTaskRecordModal task={detailTask} onClose={()=>setDetailTask(null)}
      onSaved={()=>setTick(value=>value+1)} onConfirm={record=>{const task=tasks.find(item=>item.id===record.id);if(task)askConfirm(task);}}/>
    {confirmationResult && typeof document!=="undefined" && createPortal(
      <div className="pointer-events-none fixed inset-0 z-[10010] flex items-start justify-center px-4 pt-20 sm:pt-24" role={confirmationResult.success?"status":"alert"} aria-live={confirmationResult.success?"polite":"assertive"}>
        <div className={`pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-[0_18px_55px_rgba(0,0,0,0.25)] ring-1 ring-black/5 dark:ring-white/10 ${confirmationResult.success?"border-emerald-400/50":"border-amber-400/60"}`}>
          <div className={`h-1 w-full ${confirmationResult.success?"bg-emerald-500":"bg-amber-500"}`}/>
          <div className="flex items-start gap-3 p-4 sm:p-5">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${confirmationResult.success?"bg-emerald-500/10 text-emerald-600 dark:text-emerald-400":"bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
              {confirmationResult.success?<CheckCircle2 size={21}/>:<AlertTriangle size={21}/>}
            </span>
            <div className="min-w-0 flex-1"><p className="text-sm font-bold leading-5">{confirmationResult.title}</p><p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{confirmationResult.detail}</p></div>
            <button type="button" onClick={()=>setConfirmationResult(null)} aria-label="Fechar mensagem" className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><X size={17}/></button>
          </div>
        </div>
      </div>,document.body)}
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
            <p className="text-[10px] leading-snug text-muted-foreground">Se tomou esta dose agora, confirme para registrar a hora real do servidor, mesmo com atraso. Se ainda não tomou, procure orientação profissional antes de decidir; não dobre a dose.</p>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border bg-card px-3 py-2.5">
            <button type="button" disabled={busy} onClick={()=>setPending(null)} className="h-9 rounded-lg border border-border text-xs font-semibold text-foreground">Cancelar</button>
            <button type="button" disabled={busy || (!canConfirmCare(pending,clock?.getTime()??Date.now()) && (clock?.getTime()??Date.now()) < Date.parse(pending.scheduled_at))} onClick={()=>void confirm()} className="h-9 rounded-lg bg-primary px-2 text-xs font-bold text-primary-foreground disabled:opacity-60">{busy?"Registrando…":"Confirmo que tomei agora"}</button>
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
            {pending.category==="refeicao"&&<label className="block text-xs font-semibold text-foreground">O que você comeu nesta refeição?<textarea rows={3} maxLength={1000} value={mealDescription} onChange={e=>setMealDescription(e.target.value)} placeholder="Ex.: pão, ovos, fruta; informe quantidades se desejar." className="mt-1.5 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground"/><span className="mt-1 block text-[11px] font-normal text-muted-foreground">Descreva os alimentos realmente consumidos. Confirmação disponível apenas durante os 15 minutos após o horário previsto.</span></label>}
            {pending.category==="hidratacao"&&<label className="block text-xs font-bold text-foreground">Volume de água realmente consumido (ml)
              <input className="field mt-1.5 w-full" type="number" min={10} max={1500} step={10} value={amount} onChange={e=>setAmount(e.target.value)}/>
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">Confirme apenas a quantidade que você bebeu agora.</span>
            </label>}
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-border px-4 py-3">
            <button type="button" disabled={busy} onClick={()=>setPending(null)} className="h-10 rounded-xl border border-border text-xs font-bold text-foreground">Cancelar</button>
            <button type="button" disabled={busy || !canConfirmCare(pending,clock?.getTime()??Date.now()) || (pending.category==="refeicao"&&mealDescription.trim().length<3)} onClick={()=>void confirm()} className="h-10 rounded-xl bg-primary px-2 text-xs font-extrabold text-primary-foreground disabled:opacity-60">{busy?"Registrando…":"Confirmar agora"}</button>
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
