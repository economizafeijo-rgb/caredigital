import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, CheckCircle2, ChevronRight, Droplets, History, LayoutDashboard, LockKeyhole, Pill, Sparkles, Target, UtensilsCrossed, BookOpen, UserRound, AlertTriangle, Trash2, X, Activity, Clock3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CompactTreatmentBlister } from "./CompactTreatmentBlister";
import { PatientActivityHistory } from "./PatientActivityHistory";
import { ClientHydrationTab } from "./ClientHydrationTab";
import { ClientAgendaPage } from "./ClientAgendaPage";
import { ClientMealsPage } from "./ClientMealsPage";
import { ClientNutritionStudio } from "./ClientNutritionStudio";
import { ClientActivityPage } from "./ClientActivityPage";
import { clientSectionFromHash, clientSectionHashes, clientSectionLabels, type ClientSection } from "@/lib/client-pages";
import { ClientBeverageTracker } from "./ClientBeverageTracker";
import { ClientQuickIntake } from "./ClientQuickIntake";
import { CareTaskRecordModal } from "./CareTaskRecordModal";
import { CareReminderBeacon } from "./CareReminderBeacon";
import { CareRecentHistory } from "./CareRecentHistory";
import { ClientHealthProfile } from "./ClientHealthProfile";
import { ClientOverviewIndicators } from "./ClientOverviewIndicators";
import { canConfirmCare, careScheduleBlockMessage, getCareScheduleState } from "@/lib/care-schedule";

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
  const navigate = useNavigate();
  const activeTab = clientSectionFromHash(useRouterState({ select: state => state.location.hash }));
  const openSection = (section: ClientSection) => { void navigate({ to: "/cliente", hash: clientSectionHashes[section] }); };
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
  const sections=[
    {key:"hoje",label:"Visão geral",icon:LayoutDashboard},
    {key:"agenda",label:"Agenda",icon:CalendarDays},
    {key:"historico",label:"Histórico",icon:History},
    {key:"medicacao",label:"Medicação",icon:Pill},
    {key:"hidratacao",label:"Hidratação",icon:Droplets},
    {key:"alimentacao",label:"Alimentação",icon:UtensilsCrossed},
    {key:"atividade",label:"Atividade",icon:Activity},
    {key:"indicadores",label:"Indicadores",icon:Target},
    {key:"cardapios",label:"Cardápios",icon:BookOpen},
  ] as const;
  const nowMs=clock?.getTime()??Date.now();
  const today=dateInAcre(clock??new Date());
  const dayPercent=tasks.length?Math.round(completed/tasks.length*100):0;
  const sectionCount=activeTab==="agenda"?tasks.length:activeTab==="hidratacao"?hydrationTasks.length:activeTab==="alimentacao"?meals.length:activeTab==="atividade"?activityCount:null;
  const kpis=[
    {key:"hidratacao",label:"Água",icon:Droplets,tone:"text-water bg-water/10",bar:"bg-water",percent:hydrationPercent,
      value:hydrationTarget>0?hydrationConsumed.toLocaleString("pt-BR")+" ml":hydrationConfirmed+"/"+hydrationTasks.length,
      note:hydrationTarget>0?"de "+hydrationTarget.toLocaleString("pt-BR")+" ml":hydrationTasks.length+" lembretes hoje"},
    {key:"alimentacao",label:"Refeições",icon:UtensilsCrossed,tone:"text-meal bg-meal/10",bar:"bg-meal",percent:mealPercent,
      value:mealRecordCount===null?"—":mealRecordCount.toLocaleString("pt-BR"),
      note:mealRecordCount===null?(mealRecordsLoading?"Consultando…":"Indisponível"):`${mealConfirmed}/${mealTotal} confirmadas`},
    {key:"medicacao",label:"Medicamentos",icon:Pill,tone:"text-med bg-med/10",bar:"bg-med",percent:medicinePercent,
      value:medicineValue,note:"doses confirmadas"},
    {key:"atividade",label:"Atividade",icon:Activity,tone:"text-activity bg-activity/10",bar:"bg-activity",percent:activityCount&&activityCount>0?100:0,
      value:activityCount===null?"—":activityCount.toLocaleString("pt-BR"),
      note:activityCount===null?"Sem dados disponíveis":activityCount===0?"Sem registro hoje":"registros hoje"},
  ] as const;
  const card="rounded-2xl border border-border bg-card shadow-card";
  const supplement=(task:Task)=>task.category==="outro";

  return <section aria-label="Painel de acompanhamento individual" className="flex min-h-full w-full flex-col gap-3 lg:h-full lg:min-h-0">
    {loading ? <p role="status" className="grid flex-1 place-items-center text-sm text-muted-foreground">Verificando acesso seguro…</p> : !owner ? <div className={card+" mx-auto mt-10 max-w-md p-8 text-center"}>
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground"><LockKeyhole size={22}/></span>
      <h1 className="mt-4 text-lg font-bold">Acesso protegido</h1>
      <p className="mt-2 text-sm text-muted-foreground">Entre com sua conta para consultar seu acompanhamento e confirmar os cuidados realizados.</p>
      <Link to="/entrar" className="mt-5 inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">Entrar</Link>
    </div> : !client ? <p className={card+" mx-auto mt-10 max-w-md p-8 text-center text-sm text-muted-foreground"}>Nenhum prontuário vinculado a esta conta. Confira seu acesso com o responsável.</p> : <>

      <nav className="-mx-1 flex shrink-0 gap-1.5 overflow-x-auto px-1 pb-1 xl:hidden" aria-label="Áreas do acompanhamento">
        {sections.map(({key,label,icon:Icon})=><button key={key} type="button" onClick={()=>openSection(key)} aria-current={activeTab===key?"page":undefined}
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${activeTab===key?"border-primary bg-primary text-primary-foreground":"border-border bg-surface text-muted-foreground"}`}>
          <Icon size={14}/>{label}
        </button>)}
      </nav>

      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{activeTab==="hoje"?`Olá, ${(patientName||client.full_name).split(" ")[0]}`:clientSectionLabels[activeTab].title}</h1>
          <p className="truncate text-[13px] text-muted-foreground first-letter:uppercase">
            {activeTab==="hoje"?`${today} · ${completed} de ${tasks.length} cuidados concluídos`:clientSectionLabels[activeTab].subtitle}
            {activeTab!=="hoje"&&sectionCount!=null&&` · ${sectionCount} hoje`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ClientQuickIntake patientId={client.id} mode="water" onRecorded={()=>setTick(value=>value+1)}/>
          <ClientQuickIntake patientId={client.id} onRecorded={()=>setTick(value=>value+1)}/>
          <button type="button" onClick={()=>setShowHealthProfile(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-semibold transition-colors hover:border-primary/40 hover:bg-accent"><UserRound size={15}/> Meu perfil</button>
        </div>
      </header>

      <div className="shrink-0 empty:hidden">
        <CareReminderBeacon tasks={tasks} patientId={client.id} ownerId={client.owner_id} refreshKey={tick}
          onOpen={alertTask=>{const task=tasks.find(t=>t.id===alertTask.id);if(task)showTaskDetails(task)}}
          onConfirm={alertTask=>{const task=tasks.find(t=>t.id===alertTask.id);if(task)askConfirm(task)}} compact/>
      </div>

      {activeTab==="hoje" ? <div id="care-client-tab-panel" data-client-page="hoje" className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map(({key,label,icon:Icon,tone,bar,percent,value,note})=><button key={key} type="button" onClick={()=>openSection(key)}
            aria-label={`${label}: ${value}, ${note}. Abrir área.`} className={card+" group p-3.5 text-left transition hover:border-primary/40"}>
            <span className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><span className={`grid size-7 place-items-center rounded-lg ${tone}`}><Icon size={15}/></span>{label}</span>
              <ChevronRight size={15} className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary"/>
            </span>
            <strong className="mt-2 block font-display text-2xl font-bold leading-none tabular-nums">{value}</strong>
            <span className="mt-1 block truncate text-xs text-muted-foreground">{note}</span>
            <span className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-muted"><i className={`block h-full rounded-full ${bar} transition-[width]`} style={{width:percent+"%"}}/></span>
          </button>)}
        </div>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-3">
          <div className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto lg:pr-0.5">
            <section aria-label="Próximo cuidado" className="shrink-0 rounded-2xl bg-primary p-4 text-primary-foreground shadow-card">
              <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider opacity-85">
                <span>Próximo cuidado</span><span className="inline-flex items-center gap-1 normal-case tracking-normal"><Clock3 size={12}/> Horário do Acre</span>
              </div>
              {nextCare ? <>
                <h3 className="mt-2 line-clamp-2 text-base font-bold leading-snug">{nextCare.title}</h3>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <div className="min-w-0 text-xs opacity-90 [&>span]:!mt-0 [&>span]:!text-xs [&>span]:!text-primary-foreground">
                    <p>{categoryInfo[nextCare.category]?.label??"Cuidado"}</p>
                    <LiveCareCountdown scheduledAt={nextCare.scheduled_at}/>
                  </div>
                  <strong className="font-display text-3xl font-extrabold leading-none tabular-nums">{timeInAcre(nextCare.scheduled_at)}</strong>
                </div>
                <button type="button" onClick={()=>askConfirm(nextCare)} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-white text-sm font-semibold text-slate-900 transition hover:bg-white/90"><CheckCircle2 size={16}/> Confirmar / registrar</button>
              </> : <p className="mt-2 text-sm opacity-90">Nenhum cuidado pendente para hoje. Consulte o histórico para conferir os registros.</p>}
            </section>
            <section aria-label="Resumo do dia" className={card+" shrink-0 p-4"}>
              <div className="care-overview-section-heading"><div><span className="care-overview-eyebrow">Seu dia</span><h3>Resumo do dia</h3></div><span className="care-overview-heading-note tabular-nums">{dayPercent}% concluído</span></div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[["Total",tasks.length,""],["Concluídos",completed,"text-success"],["Pendentes",Math.max(0,tasks.length-completed),"text-warning"]].map(([label,value,tone])=>
                  <div key={label} className="rounded-xl bg-muted px-2 py-2.5"><strong className={`block font-display text-xl font-bold tabular-nums ${tone}`}>{value}</strong><span className="text-[11px] text-muted-foreground">{label}</span></div>)}
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Percentual de cuidados concluídos" aria-valuenow={dayPercent} aria-valuemin={0} aria-valuemax={100}><i className="block h-full rounded-full bg-primary transition-[width]" style={{width:dayPercent+"%"}}/></div>
            </section>
            <div className={card+" shrink-0 p-4"}>
              <ClientOverviewIndicators heightCm={client.height_cm} weightKg={healthProfile.weightKg??client.weight_kg} waterTarget={hydrationTarget||null}
                protein={healthProfile.protein} carbs={healthProfile.carbs} fat={healthProfile.fat} kcal={healthProfile.kcal}/>
            </div>
          </div>

          <section aria-label="Agenda de hoje" className={card+" flex min-h-[320px] flex-col p-4 lg:min-h-0"}>
            <div className="care-overview-section-heading shrink-0">
              <div><span className="care-overview-eyebrow">Rotina</span><h3>Agenda de hoje</h3></div>
              <button type="button" onClick={()=>openSection("agenda")} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Ver agenda <ArrowRight size={13}/></button>
            </div>
            <ul className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">
              {tasks.map(task=>{
                const info=supplement(task)?{label:"Suplemento",icon:Sparkles}:categoryInfo[task.category]??{label:"Cuidado",icon:Clock3};
                const Icon=info.icon;
                const response=resolvedStates[task.id];
                const done=Boolean(task.completed_at);
                const state=getCareScheduleState(task,nowMs);
                const isNext=task.id===nextCare?.id;
                const status=done?"Confirmado":response==="cancelado"?"Cancelado":response==="nao_cumprido"?"Não realizado":response==="nao_bebi"?"Não bebi":isNext?"Próximo":state==="waiting"?"Programado":state==="available"?"Registrar":"Sem confirmação";
                const tone=done?"text-success":response?"text-muted-foreground":isNext||state==="available"?"text-primary":state==="missed"?"text-warning":"text-muted-foreground";
                return <li key={task.id}><button type="button" onClick={()=>showTaskDetails(task)} aria-label={`${info.label} às ${timeInAcre(task.scheduled_at)}: ${task.title}. ${status}. Abrir detalhes.`}
                  className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted ${isNext?"bg-accent/60":""}`}>
                  <span className="w-11 shrink-0 text-[13px] font-semibold tabular-nums">{timeInAcre(task.scheduled_at)}</span>
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon size={15}/></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{task.title}</span><span className="block truncate text-[11px] text-muted-foreground">{info.label} · <span className={`font-semibold ${tone}`}>{status}</span></span></span>
                  {done?<CheckCircle2 size={16} className="shrink-0 text-success"/>:<ChevronRight size={15} className="shrink-0 text-muted-foreground"/>}
                </button></li>;
              })}
              {!tasks.length&&<li className="grid h-full min-h-32 place-items-center rounded-xl bg-muted p-4 text-center text-sm text-muted-foreground">Nenhum cuidado programado para hoje.</li>}
            </ul>
          </section>

          <div className="flex min-h-0 flex-col gap-3">
            <div className="shrink-0 lg:max-h-[55%] lg:overflow-y-auto" id="care-overview-medication">
              <CompactTreatmentBlister patientId={client.id} ownerId={client.owner_id} revision={tick} onConfirm={askConfirm} dashboardMode onProgressChange={setTreatmentProgress}/>
            </div>
            <section aria-label="Histórico recente" className={card+" flex min-h-[220px] flex-1 flex-col p-4 lg:min-h-0"}>
              <div className="care-overview-section-heading shrink-0">
                <div><span className="care-overview-eyebrow">Registros</span><h3>Histórico recente</h3></div>
                <button type="button" onClick={()=>openSection("historico")} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Ver tudo <ArrowRight size={13}/></button>
              </div>
              <div className="mb-2 flex shrink-0 flex-wrap gap-1" role="group" aria-label="Filtrar histórico recente">
                {([{key:"todos",label:"Todos"},{key:"hidratacao",label:"Água"},{key:"refeicao",label:"Refeições"},{key:"medicacao",label:"Medicação"}] as const).map(item=><button key={item.key} type="button" aria-pressed={historyCategory===item.key} onClick={()=>setHistoryCategory(item.key)}
                  className={`h-7 rounded-full px-2.5 text-[11px] font-semibold transition-colors ${historyCategory===item.key?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground hover:text-foreground"}`}>{item.label}</button>)}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain"><CareRecentHistory patientId={client.id} ownerId={client.owner_id} category={historyCategory} compact/></div>
            </section>
          </div>
        </div>
      </div> : <section id="care-client-tab-panel" data-client-page={activeTab} data-page={activeTab} aria-label={clientSectionLabels[activeTab].title}
        className={card+" min-h-[60dvh] min-w-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 lg:min-h-0"}>
        {activeTab==="agenda"&&<ClientAgendaPage tasks={tasks} resolved={resolvedStates} now={nowMs} onView={showTaskDetails} onConfirm={askConfirm}/>}
        {activeTab==="hidratacao"&&<div className="flex h-full min-h-0 flex-col gap-3">
          <div className="grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:max-w-sm" role="group" aria-label="Bebidas e hidratação">
            {([["agua","Minha meta de água"],["bebidas","Chás e bebidas"]] as const).map(([key,label])=><button key={key} type="button" aria-pressed={hydrationView===key} onClick={()=>setHydrationView(key)}
              className={`h-9 rounded-lg px-3 text-xs font-semibold transition-colors ${hydrationView===key?"bg-surface text-foreground shadow-sm":"text-muted-foreground hover:text-foreground"}`}>{label}</button>)}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {hydrationView==="agua"
              ? <ClientHydrationTab patientId={client.id} ownerId={client.owner_id} tasks={tasks} revision={tick} onConfirm={askConfirm} onRecorded={()=>setTick(value=>value+1)}/>
              : <ClientBeverageTracker patientId={client.id} ownerId={client.owner_id} revision={tick} onRecorded={()=>setTick(value=>value+1)}/>}
          </div>
        </div>}
        {activeTab==="historico"&&<PatientActivityHistory patientId={client.id} ownerId={client.owner_id} revision={tick} onRecordChanged={()=>setTick(value=>value+1)}/>}
        {activeTab==="alimentacao"&&<ClientMealsPage patientId={client.id} ownerId={client.owner_id}
          meals={meals} resolved={resolvedStates} revision={tick} now={nowMs}
          onView={showTaskDetails} onConfirm={askConfirm}
          onDelete={meal=>{const item=tasks.find(task=>task.id===meal.id);if(item){setPending(null);setMealToDelete(item);}}}
          onRecorded={()=>setTick(value=>value+1)}/>}
        {activeTab==="cardapios"&&<ClientNutritionStudio patientId={client.id} ownerId={client.owner_id} onLogged={()=>setTick(v=>v+1)}/>}
        {activeTab==="medicacao"&&<div className="mx-auto w-full max-w-3xl"><CompactTreatmentBlister patientId={client.id} ownerId={client.owner_id} revision={tick} onConfirm={askConfirm}/></div>}
        {activeTab==="atividade"&&<ClientActivityPage patientId={client.id} ownerId={client.owner_id} revision={tick} onRecorded={()=>setTick(value=>value+1)}/>}
        {activeTab==="indicadores"&&<ClientOverviewIndicators heightCm={client.height_cm} weightKg={healthProfile.weightKg??client.weight_kg} waterTarget={hydrationTarget||null} protein={healthProfile.protein} carbs={healthProfile.carbs} fat={healthProfile.fat} kcal={healthProfile.kcal} patientId={client.id} ownerId={client.owner_id} revision={tick} full/>}
      </section>}
    </>}
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
    {locked && <div role="dialog" aria-label="Acesso restrito" className="mx-auto max-w-md rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2 font-bold"><LockKeyhole size={19} className="text-primary"/> Acesso necessário</div>
      <p className="mt-2 text-sm text-muted-foreground">Para proteger as informações de saúde, faça login antes de visualizar ou confirmar atividades.</p>
      <div className="mt-4 flex flex-wrap gap-2"><Link to="/entrar" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Ir para o login</Link><button onClick={() => setLocked(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm">Fechar</button></div>
    </div>}
    {pending?.category === "medicacao" && typeof document !== "undefined" && createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)setPending(null)}}>
        <section role="dialog" aria-modal="true" aria-labelledby="med-confirm-title" className="flex w-full max-w-[390px] max-h-[min(88dvh,430px)] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h3 id="med-confirm-title" className="flex items-center gap-2 text-sm font-bold"><span className="grid size-8 place-items-center rounded-lg bg-med/10 text-med"><Pill size={17}/></span> Tomou a medicação agora?</h3>
            <button type="button" aria-label="Fechar janela" disabled={busy} onClick={()=>setPending(null)} className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-muted"><X size={17}/></button>
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
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
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
