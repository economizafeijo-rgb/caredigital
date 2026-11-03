import { useEffect, useState } from "react";
import "./care-home-reference.css";
import { Link } from "@tanstack/react-router";
import { CalendarClock, Check, Clock3, Droplets, Pill, Utensils, X, ArrowUpRight, ChevronRight, Plus, ListChecks, AlertCircle, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CareReminderBeacon } from "./CareReminderBeacon";
import { CareProgressVisual } from "./CareProgressVisual";
import { ClientQuickIntake } from "./ClientQuickIntake";
import { CareTaskRecordModal } from "./CareTaskRecordModal";
import type { HydrationGoalSnapshot } from "@/lib/hydration-goal";
import { canConfirmCare, careScheduleBlockMessage } from "@/lib/care-schedule";

type Care = {id:string;title:string;category:string;scheduled_at:string;completed_at:string|null};
type WaterEntry = {id:string;task_id:string|null;amount_ml:number;recorded_at:string};
type BeverageEntry = {id:string;kind:string;name:string;amount_ml:number;consumed_at:string};
type MealEntry = {id:string;recorded_at:string;details:{title?:string;description?:string;kind?:string}|null};
type AgendaRow = {key:string;at:string;title:string;subtitle:string;category:"medicacao"|"hidratacao"|"refeicao";task:Care|null;completed:boolean;resolved:boolean;overdue:boolean};
type Person = {id:string;owner_id:string;full_name:string};
const zone="America/Rio_Branco";
const day=(t:Date)=>new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"}).format(t);
const canConfirmMealToday=(task:Care)=>!task.completed_at && Date.now()>=Date.parse(task.scheduled_at) && day(new Date(task.scheduled_at))===day(new Date());
const currentAcreTime=()=>new Intl.DateTimeFormat("en-GB",{timeZone:zone,hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date());
const time=(iso:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:zone,hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(iso));
const icons={medicacao:Pill,refeicao:Utensils,hidratacao:Droplets} as const;
// Só associa refeições de tipos inequívocos. Um lanche avulso não deve
// cumprir automaticamente um lanche programado diferente.
const plannedMealKind=(title:string):string|null=>{
 const normalized=title.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
 if(/^jantar\b/.test(normalized))return "jantar";
 if(/^almoco\b/.test(normalized))return "almoco";
 if(/^cafe da manha\b/.test(normalized))return "cafe_manha";
 if(/^ceia\b/.test(normalized))return "ceia";
 return null;
};

export function ClientHomeSummary(){
 const [patient,setPatient]=useState<Person|null>(null);
 const [tasks,setTasks]=useState<Care[]>([]);
 const [selected,setSelected]=useState<Care|null>(null);
 const [detailTask,setDetailTask]=useState<Care|null>(null);
 const [now,setNow]=useState<Date|null>(null);
 const [water,setWater]=useState(200);
 const [mealTime,setMealTime]=useState("");
 const [mealDescription,setMealDescription]=useState("");
 const [waterOpenSignal,setWaterOpenSignal]=useState(0);
 const [foodOpenSignal,setFoodOpenSignal]=useState(0);
 const [working,setWorking]=useState(false);
 const [error,setError]=useState("");
 const [receipt,setReceipt]=useState<{success:boolean;message:string}|null>(null);
 const [revision,setRevision]=useState(0);
 const [refresh,setRefresh]=useState(0);
 const [dailyGoal,setDailyGoal]=useState<HydrationGoalSnapshot|null>(null);
 const [hydrationPlan,setHydrationPlan]=useState<Record<string,{suggested_ml:number;reason:string;remaining_ml:number}>>({});
 const [resolvedStates,setResolvedStates]=useState<Record<string,string>>({});
 const [extraWater,setExtraWater]=useState<WaterEntry[]>([]);
 const [extraBeverages,setExtraBeverages]=useState<BeverageEntry[]>([]);
 const [extraMeals,setExtraMeals]=useState<MealEntry[]>([]);
 const [extraError,setExtraError]=useState("");
 const [agendaCategory,setAgendaCategory]=useState<"todos"|"hidratacao"|"refeicao"|"medicacao">("todos");
 const [agendaPage,setAgendaPage]=useState(0);
 const agendaPageSize=4;
 useEffect(()=>{setNow(new Date());const id=window.setInterval(()=>setNow(new Date()),1000);return()=>window.clearInterval(id)},[]);
 useEffect(()=>{const timer=window.setInterval(()=>setRefresh(v=>v+1),45000);const refreshAgenda=()=>setRefresh(v=>v+1);const visible=()=>{if(document.visibilityState==="visible")refreshAgenda()};window.addEventListener("focus",refreshAgenda);document.addEventListener("visibilitychange",visible);const channel=supabase.channel("client-home-care-changes")
 .on("postgres_changes",{event:"*",schema:"public",table:"care_daily_checklist"},refreshAgenda)
 .on("postgres_changes",{event:"*",schema:"public",table:"care_hydration"},refreshAgenda)
 .on("postgres_changes",{event:"*",schema:"public",table:"care_client_beverages"},refreshAgenda)
 .on("postgres_changes",{event:"*",schema:"public",table:"care_activity_log"},refreshAgenda)
 .on("postgres_changes",{event:"*",schema:"public",table:"care_hydration_suggested_portions"},refreshAgenda).subscribe();return()=>{window.clearInterval(timer);window.removeEventListener("focus",refreshAgenda);document.removeEventListener("visibilitychange",visible);void supabase.removeChannel(channel)}},[]);
 useEffect(()=>{let active=true;void (async()=>{
    const session=await supabase.auth.getUser();
    const uid=session.data.user?.id;
    if(!uid){if(active)setError("Entre para acessar sua rotina.");return;}
    const grant=await (supabase as any).from("care_patient_access").select("patient_id").eq("user_id",uid).limit(1);
    if(grant.error||!grant.data?.length){if(active)setError("Não há um prontuário vinculado à sua conta.");return;}
    const detail=await (supabase as any).from("care_patients").select("id,owner_id,full_name").eq("id",grant.data[0].patient_id).limit(1);
    if(!active)return;
    if(detail.error||!detail.data?.length){setError("Não foi possível abrir o acompanhamento.");return;}
    const person=detail.data[0] as Person;
    setPatient(person);
    const from=new Date(day(new Date())+"T00:00:00-05:00");
    const finish=new Date(from.getTime()+86400000);
    const [res,goalResult,resolutions,waterAnswers,waterEntries,beverages,mealEntries,waterSuggestions]=await Promise.all([
      (supabase as any).from("care_daily_checklist").select("id,title,category,scheduled_at,completed_at")
      .eq("owner_id",person.owner_id).eq("patient_id",person.id)
      .gte("scheduled_at",from.toISOString()).lt("scheduled_at",finish.toISOString())
      .in("category",["medicacao","refeicao","hidratacao"]).order("scheduled_at",{ascending:true}).limit(120),
      (supabase as any).rpc("care_sync_hydration_goal",{p_patient_id:person.id}),
      (supabase as any).from("care_task_resolutions").select("task_id,status")
        .eq("patient_id",person.id).eq("owner_id",person.owner_id)
        .gte("scheduled_at",from.toISOString()).lt("scheduled_at",finish.toISOString()).limit(120),
      (supabase as any).from("care_hydration_responses").select("task_id,response")
        .eq("patient_id",person.id).eq("owner_id",person.owner_id)
        .gte("recorded_at",from.toISOString()).lt("recorded_at",finish.toISOString()).eq("response","not_drunk").limit(120),
      (supabase as any).from("care_hydration").select("id,task_id,amount_ml,recorded_at")
        .eq("patient_id",person.id).eq("owner_id",person.owner_id)
        .gte("recorded_at",from.toISOString()).lt("recorded_at",finish.toISOString())
        .order("recorded_at",{ascending:true}).limit(300),
      (supabase as any).from("care_client_beverages").select("id,kind,name,amount_ml,consumed_at")
        .eq("patient_id",person.id).eq("owner_id",person.owner_id)
        .gte("consumed_at",from.toISOString()).lt("consumed_at",finish.toISOString())
        .order("consumed_at",{ascending:true}).limit(300),
      (supabase as any).from("care_activity_log").select("id,recorded_at,details")
        .eq("patient_id",person.id).eq("owner_id",person.owner_id)
        .eq("source","client_unscheduled_intake").eq("event_type","logged")
        .eq("category","refeicao").is("task_id",null)
        .gte("recorded_at",from.toISOString()).lt("recorded_at",finish.toISOString())
        .order("recorded_at",{ascending:true}).limit(300),
      (supabase as any).from("care_hydration_suggested_portions")
        .select("task_id,suggested_ml,reason,remaining_ml")
        .eq("patient_id",person.id).eq("owner_id",person.owner_id).limit(120)
    ]);
    if(!active)return;
    if(res.error){setError("Não foi possível carregar sua agenda.");return;}
    setTasks(res.data??[]);
    const resolutionMap:Record<string,string>={};
    if(!resolutions.error)for(const row of resolutions.data??[])resolutionMap[row.task_id]=row.status;
    if(!waterAnswers.error)for(const row of waterAnswers.data??[])if(row.response==="not_drunk")resolutionMap[row.task_id]="nao_bebi";
    setResolvedStates(resolutionMap);
    setDailyGoal(goalResult.error?null:goalResult.data as HydrationGoalSnapshot);
    setExtraWater(waterEntries.error?[]:waterEntries.data??[]);
    setExtraBeverages(beverages.error?[]:beverages.data??[]);
    setExtraMeals(mealEntries.error?[]:mealEntries.data??[]);
    setHydrationPlan(waterSuggestions.error?{}:Object.fromEntries((waterSuggestions.data??[]).map((row:{task_id:string;suggested_ml:number;reason:string;remaining_ml:number})=>
      [row.task_id,{suggested_ml:Number(row.suggested_ml),reason:row.reason,remaining_ml:Number(row.remaining_ml)}])));
    setExtraError([waterEntries.error&&"água",beverages.error&&"bebidas",mealEntries.error&&"refeições"].filter(Boolean).join(", "));
    setError("");
 })();return()=>{active=false}},[revision,refresh]);
 // Se uma refeição já foi registrada no diário, o mesmo horário planejado
 // não reaparece como uma segunda refeição pendente. Mantém a tarefa original
 // intacta no servidor e preserva o consumo real em seu histórico.
 const loggedMealsByKind=new Map<string,string>();
 for(const meal of extraMeals){
   const rawKind=meal.details?.kind ?? "";
   const kind=rawKind === "refeicao" ? plannedMealKind(meal.details?.title ?? "") : rawKind;
   if(kind&&["jantar","almoco","cafe_manha","ceia"].includes(kind)){
     const previous=loggedMealsByKind.get(kind);
     if(!previous || Date.parse(meal.recorded_at)>Date.parse(previous)){
       loggedMealsByKind.set(kind,meal.recorded_at);
     }
   }
 }
 const matchedMealIds=new Set(tasks.filter(task=>
   task.category==="refeicao"&&!task.completed_at&&!resolvedStates[task.id]&&
   Boolean(plannedMealKind(task.title)&&loggedMealsByKind.has(plannedMealKind(task.title)!))
 ).map(task=>task.id));
 const summaryTasks=tasks.map(task=>{
   if(!matchedMealIds.has(task.id))return task;
   const kind=plannedMealKind(task.title);
   return {...task,completed_at:(kind&&loggedMealsByKind.get(kind))||task.completed_at};
 });
 const pending=summaryTasks.filter(t=>!t.completed_at&&!resolvedStates[t.id]);
 const next=now?pending.filter(t=>new Date(t.scheduled_at).getTime()>=now.getTime())[0]??pending[0]:pending[0];
 const seconds=next&&now?Math.max(0,Math.round((new Date(next.scheduled_at).getTime()-now.getTime())/1000)):null;
 const countdown=seconds===null?"--:--:--":[Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60].map(x=>String(x).padStart(2,"0")).join(":");
 async function confirm(){
  if(!selected||working||!patient)return;
  if(selected.category==="medicacao"&&day(new Date(selected.scheduled_at))!==day(new Date())){setError("Medicação somente pode ser confirmada no dia previsto.");return;}
  if(!canConfirmCare(selected) && !(selected.category==="refeicao" && day(new Date(selected.scheduled_at))===day(new Date())) && !(selected.category==="medicacao" && Date.now()>=Date.parse(selected.scheduled_at) && !selected.completed_at)){setError(careScheduleBlockMessage(selected));return;}
  if(selected.category==="refeicao"&&(!/^([01]\d|2[0-3]):[0-5]\d$/.test(mealTime)||mealDescription.trim().length<3||mealDescription.trim().length>900)){setError("Descreva a refeição consumida (3 a 1.000 caracteres).");return;}
  const actualMealTime=selected.category==="refeicao"?new Date(`${day(new Date())}T${mealTime}:00-05:00`):null;
  if(actualMealTime && (!Number.isFinite(actualMealTime.getTime()) || actualMealTime.getTime()>Date.now())){setError("Informe um horário já ocorrido no dia de hoje.");return;}
  setWorking(true);setError("");setReceipt(null);
  const response=selected.category==="refeicao"?await (supabase as any).rpc("care_replace_meal",{p_task_id:selected.id,p_description:mealDescription.trim(),p_consumed_at:actualMealTime!.toISOString()}):await (supabase as any).rpc("care_confirm_task",{p_task_id:selected.id,p_water_ml:selected.category==="hidratacao"?water:null});
  setWorking(false);
  if(response.error || !response.data){
    const msg=/already completed/i.test(response.error?.message??"")?"Esta atividade já consta como confirmada. Atualize a página.":/Care window expired/i.test(response.error?.message??"")?"A versão do servidor ainda contém um bloqueio de horário; verifique a função SQL ativa.":`Não foi possível registrar: ${response.error?.message??"verifique sua conexão e tente novamente."}`;
    setError(msg);setReceipt({success:false,message:msg});return;
  }
  const record=await (supabase as any).from("care_daily_checklist").select("completed_at").eq("id",selected.id).single();
  if(record.error||!record.data?.completed_at){
    setReceipt({success:false,message:"O sistema recebeu a solicitação, mas não conseguiu verificar o registro. Consulte o prontuário antes de repetir."});
    setRevision(v=>v+1);return;
  }
  const when=new Intl.DateTimeFormat("pt-BR",{timeZone:zone,day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date(record.data.completed_at));
  setReceipt({success:true,message:`${selected.title} confirmado em ${when} (Acre). Registro salvo no prontuário; próximos horários elegíveis são atualizados automaticamente.`});
  setSelected(null);setMealDescription("");setMealTime("");setRevision(v=>v+1);
 }
 const finished=summaryTasks.filter(t=>Boolean(t.completed_at)).length;
 const completion=summaryTasks.length?Math.round(100*finished/summaryTasks.length):0;
 const labelFor=(category:string)=>category==="medicacao"?"Medicação":category==="hidratacao"?"Água":"Refeição";
 // A programação não contém consumos avulsos. As fontes extras são lidas sem
 // criar tarefas fictícias nem contar o mesmo copo duas vezes.
 const knownTaskIds=new Set(tasks.map(task=>task.id));
 const agendaItems:AgendaRow[]=[
   ...tasks.map(task=>{const matched=matchedMealIds.has(task.id);const resolved=resolvedStates[task.id];const completed=Boolean(task.completed_at)||matched;const overdue=Boolean(now&&!completed&&!resolved&&Date.parse(task.scheduled_at)<now.getTime());return {
     key:"task:"+task.id,at:task.completed_at??(matched?(loggedMealsByKind.get(plannedMealKind(task.title)!)??task.scheduled_at):task.scheduled_at),title:task.title,category:task.category as AgendaRow["category"],task:matched?null:task,
     completed,resolved:Boolean(resolved),overdue,
     subtitle:(matched?"Registrado no diário":completed?"Realizado no horário informado":resolved==="cancelado"?"Cancelado":resolved==="nao_cumprido"?"Não realizado":resolved==="nao_bebi"?"Não bebi":overdue?"Aguardando confirmação":"Programado")+" · "+labelFor(task.category)
       +(!completed&&!resolved&&task.category==="hidratacao"&&hydrationPlan[task.id]?.suggested_ml>0?" · sug. "+hydrationPlan[task.id].suggested_ml+" ml":"")
   };}),
   ...extraWater.filter(item=>!item.task_id||!knownTaskIds.has(item.task_id)).map(item=>({
     key:"water:"+item.id,at:item.recorded_at,title:"Água registrada · "+item.amount_ml+" ml",
     category:"hidratacao" as const,task:null,completed:true,resolved:false,overdue:false,subtitle:"Consumo realizado · Água"
   })),
   ...extraBeverages.map(item=>({
     key:"beverage:"+item.id,at:item.consumed_at,title:(item.name||"Bebida")+" · "+item.amount_ml+" ml",
     category:"hidratacao" as const,task:null,completed:true,resolved:false,overdue:false,subtitle:"Consumo realizado · Bebida"
   })),
   ...extraMeals.filter(item=>!(item.details as any)?.superseded).filter(item=>!matchedMealIds.size || !matchedMealIds.has(tasks.find(task=>task.category==="refeicao" && plannedMealKind(task.title)===item.details?.kind && loggedMealsByKind.get(item.details?.kind??"")===item.recorded_at)?.id??"")).map(item=>({
     key:"meal:"+item.id,at:item.recorded_at,title:item.details?.title||"Refeição registrada",
     category:"refeicao" as const,task:null,completed:true,resolved:false,overdue:false,
     subtitle:item.details?.description?"Registrado · "+item.details.description:"Consumo realizado · Refeição"
   }))
 ].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||a.key.localeCompare(b.key));
 const filteredAgenda=agendaCategory==="todos"?agendaItems:agendaItems.filter(item=>item.category===agendaCategory);
 const agendaPageCount=Math.max(1,Math.ceil(filteredAgenda.length/agendaPageSize));
 const agendaIndex=Math.min(agendaPage,agendaPageCount-1);
 const visibleAgenda=filteredAgenda.slice(agendaIndex*agendaPageSize,(agendaIndex+1)*agendaPageSize);
 // Every progress card remains actionable even if today's goal was completed.
 // A due and unanswered task opens its existing verified confirmation workflow;
 // otherwise open a real, unscheduled intake form (never auto-confirm a task).
 const duePending=(category:"hidratacao"|"refeicao"|"medicacao")=>
   summaryTasks.find(task=>task.category===category&&!task.completed_at&&!resolvedStates[task.id]
     &&Date.now()>=Date.parse(task.scheduled_at) &&
     (category!=="medicacao"||day(new Date(task.scheduled_at))===day(new Date())));
 const openDueConfirmation=(task:Care)=>{
   setSelected(task);setDetailTask(null);setError("");setReceipt(null);
   setMealTime(currentAcreTime());setMealDescription("");
   if(task.category==="hidratacao"){
     const suggested=hydrationPlan[task.id]?.suggested_ml;
     setWater(suggested&&suggested>=10?Math.min(suggested,350):200);
   }
 };
 const openHydrationCard=()=>{
   const task=duePending("hidratacao");
   if(task)openDueConfirmation(task);
   else setWaterOpenSignal(value=>value+1);
 };
 const openFoodCard=()=>{
   const task=duePending("refeicao");
   if(task)openDueConfirmation(task);
   else setFoodOpenSignal(value=>value+1);
 };
 const openMedicationCard=()=>{
   const task=duePending("medicacao");
   if(task){openDueConfirmation(task);return;}
   const medications=summaryTasks.filter(t=>t.category==="medicacao")
     .sort((a,b)=>Date.parse(a.scheduled_at)-Date.parse(b.scheduled_at));
   const nextMedication=medications.find(t=>!t.completed_at&&!resolvedStates[t.id])??medications[medications.length-1];
   if(nextMedication){setSelected(null);setDetailTask(nextMedication);setError("");setReceipt(null);return;}
   // If no medication is scheduled, the full treatment section still opens.
   window.location.assign("/cliente#visao-geral");
 };
 // Mostra apenas eventos vencidos e ainda sem resposta, ou explicitamente não realizados.
 // Eventos futuros, confirmados e corrigidos nunca aparecem como pendência.
 const attentionItems=summaryTasks.filter(task=>{
   if(task.completed_at)return false;
   const status=resolvedStates[task.id];
   if(status==="cancelado")return false;
   if(status==="nao_cumprido"||status==="nao_bebi")return true;
   return Boolean(now&&Date.parse(task.scheduled_at)<now.getTime()&&!status);
 }).sort((a,b)=>Date.parse(b.scheduled_at)-Date.parse(a.scheduled_at));
 const attentionRecent=attentionItems.slice(0,2);
 const attentionText=(task:Care)=>{
   const status=resolvedStates[task.id];
   return status==="nao_bebi"?"Não bebeu":status==="nao_cumprido"?"Não realizado":"Sem confirmação";
 };
 const categoryCounts={hidratacao:agendaItems.filter(item=>item.category==="hidratacao").length,
   refeicao:agendaItems.filter(item=>item.category==="refeicao").length,
   medicacao:agendaItems.filter(item=>item.category==="medicacao").length};
 const chooseAgenda=(category:typeof agendaCategory)=>{setAgendaCategory(category);setAgendaPage(0);};
 return <section className="client-home-dashboard care-home-art-v2 care-home-art-reference care-premium-v3 care-reference-2026 relative flex min-h-0 min-w-0 w-full flex-col gap-2 rounded-[24px] border p-3 shadow-xl md:h-full md:max-h-full md:gap-2 md:overflow-hidden" aria-label="Painel interativo do cliente na homepage">
  <div aria-hidden="true" className="care-home-ambient pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]"><img src="/images/caredigital-ambient-background.svg" alt="" loading="eager" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center opacity-85" /><span className="care-home-glow care-home-glow-a"/><span className="care-home-glow care-home-glow-b"/></div>
  <details className="care-home-shortcuts absolute left-2 top-2 z-40">
    <summary aria-label="Abrir ações rápidas e lembretes" title="Ações rápidas e lembretes" className="care-home-shortcut-trigger">
      <Plus size={20} aria-hidden="true" />
    </summary>
    <div className="care-home-shortcuts-content">
      <p className="care-home-shortcuts-title">Ações rápidas</p>
      <p className="care-home-shortcuts-subtitle">Olá, {patient?.full_name?.split(" ")[0] ?? "bem-vindo"}. Acompanhe e registre seus cuidados.</p>
      <div className="patient-home-actions flex flex-wrap gap-2">
        <ClientQuickIntake patientId={patient?.id ?? ""} variant="home" mode="water"
          openSignal={waterOpenSignal} onRecorded={()=>setRefresh(value=>value+1)}/>
        <ClientQuickIntake patientId={patient?.id ?? ""} variant="home"
          openSignal={foodOpenSignal} onRecorded={()=>setRefresh(value=>value+1)}/>
        <Link to="/cliente" className="care-home-chart-link inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-bold">Meu prontuário <ArrowUpRight size={15}/></Link>
        <a href="/cliente#cardapios" className="care-home-chart-link inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-bold">Cardápios e dietas <ArrowUpRight size={15}/></a>
      </div>
      <div className="care-home-medication mt-3">
        <CareReminderBeacon tasks={summaryTasks} patientId={patient?.id??""} ownerId={patient?.owner_id??""}
          refreshKey={refresh+revision}
          onOpen={task=>{setDetailTask(task);setError("");}}
          onConfirm={task=>{
            setSelected(task);setError("");setReceipt(null);
            setMealTime(currentAcreTime());setMealDescription("");
          }} compact/>
      </div>
    </div>
  </details>
  <div className="care-premium-welcome care-reference-hero relative z-10 flex items-center justify-between gap-3 overflow-hidden rounded-[20px] border border-cyan-200/10 bg-gradient-to-r from-slate-950/55 to-teal-900/30 px-4 py-3 pr-14 sm:px-5 sm:pr-16">
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[.16em] text-teal-200/80">Saúde · Rotina · Evolução</p>
      <h2 className="mt-1 truncate text-lg font-extrabold tracking-tight text-white sm:text-2xl">Olá, <span className="text-teal-200">{patient?.full_name?.split(" ").slice(0,2).join(" ")??"bem-vindo"}</span></h2>
      <p className="mt-1 text-[11px] text-slate-200">Acompanhe seus cuidados e sua evolução.</p>
    </div>
    <img src="/images/care-next-wellness.svg" alt="" aria-hidden="true" className="hidden h-[76px] w-[150px] shrink-0 object-contain opacity-80 sm:block" loading="lazy"/>
  </div>
  {attentionRecent.length>0&&<details className="care-premium-pending group relative z-30 shrink-0" aria-label="Cuidados que precisam de atenção">
    <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-2xl border border-amber-200/25 bg-slate-900/55 px-3 py-2 text-white shadow-sm backdrop-blur-xl transition hover:bg-slate-800/70 [&::-webkit-details-marker]:hidden">
      <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-amber-300/15 text-amber-200"><ShieldAlert size={15}/></span>
      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">Pendências recentes</span>
      <span className="shrink-0 rounded-full bg-amber-200/15 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-100">{attentionItems.length}</span>
      <span className="hidden min-w-0 max-w-[42%] truncate text-[10px] text-white/70 sm:block">{attentionRecent[0]?.title} · {time(attentionRecent[0].scheduled_at)}</span>
      <ChevronRight size={15} className="shrink-0 text-white/70 transition-transform group-open:rotate-90"/>
    </summary>
    <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[240px] space-y-1.5 overflow-y-auto rounded-2xl border border-white/20 bg-slate-900/95 p-2.5 text-white shadow-[0_18px_45px_rgba(0,0,0,.35)] backdrop-blur-2xl">
      {attentionRecent.map(task=>{
        const Icon=icons[task.category as keyof typeof icons]??AlertCircle;
        const status=resolvedStates[task.id];
        const canOpen=Boolean(!status&&task.category!=="medicacao");
        return <button key={task.id} type="button"
          onClick={()=>{if(canOpen){openDueConfirmation(task)}else{setDetailTask(task);setError("");setReceipt(null);}}}
          className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[.06] px-3 py-2 text-left transition hover:bg-white/[.13]">
          <Icon size={16} className="shrink-0 text-amber-100"/>
          <span className="min-w-0 flex-1"><strong className="block truncate text-xs font-semibold">{task.title}</strong><small className="block text-[10px] text-white/65">{time(task.scheduled_at)} · {attentionText(task)}</small></span>
          <ChevronRight size={14} className="shrink-0 text-white/60"/>
        </button>;
      })}
      {attentionItems.length>2&&<p className="px-2 text-[10px] text-white/60">Mais {attentionItems.length-2} eventos na linha do tempo.</p>}
    </div>
  </details>}
  <div className="care-home-body care-reference-grid relative grid min-h-0 min-w-0 flex-1 gap-2.5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-stretch">
    <div className="care-home-left care-reference-primary grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto_auto] gap-1.5">
      <article className="patient-next-care care-reference-next relative flex min-h-[210px] min-w-0 flex-col justify-between overflow-hidden rounded-[22px] border p-3 sm:p-4 md:min-h-0">
        <div aria-hidden="true" className="care-next-art pointer-events-none absolute inset-0 overflow-hidden">
          <span className="care-next-image-aura"/>
          <img src="/images/care-next-wellness.svg" alt="" loading="eager" decoding="async"
            className="care-next-generated-art" draggable={false}/>
        </div>
        <div className="relative flex items-center justify-between gap-2"><span className="care-next-overline inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest"><Clock3 size={17}/> Próximo cuidado</span><span className="care-next-time-chip rounded-full px-2.5 py-1 text-[10px] font-bold">{next?time(next.scheduled_at):"Agenda concluída"}</span></div>
        <div className="care-next-copy relative z-10 mt-2"><h3 className="max-w-[26ch] text-xl font-extrabold leading-tight md:text-2xl">{next?next.title:"Nenhum cuidado aguardando resposta"}</h3><div className="mt-2 flex flex-wrap items-baseline gap-2"><strong className="care-next-countdown font-mono text-2xl font-extrabold tabular-nums md:text-[30px]">{next?countdown:"✓"}</strong><span className="care-next-countdown-label text-xs">{next?(seconds===0?"Horário previsto já passou":"até o horário previsto"):"Nenhuma atividade pendente"}</span></div></div>
        {next?.category==="hidratacao"&&hydrationPlan[next.id]&&<p className="relative z-10 text-[11px] font-semibold text-cyan-100">
          {hydrationPlan[next.id].suggested_ml===0?"Meta de água atingida; lembrete opcional.":
           "Volume orientativo atualizado: até "+hydrationPlan[next.id].suggested_ml+" ml por lembrete."}
          {hydrationPlan[next.id].reason==="restante_supera_capacidade"&&" Meta restante exige mais fracionamento."}
        </p>}
        <div className="relative z-10 mt-2 flex shrink-0 flex-wrap gap-1.5">{next&&<button type="button" onClick={()=>{setSelected(next);setError("");setMealTime(currentAcreTime());setMealDescription("");}} className="care-next-cta inline-flex min-h-9 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-extrabold transition">Verificar / confirmar <ChevronRight size={15}/></button>}<Link to="/cliente" className="care-next-secondary inline-flex min-h-9 items-center rounded-full border px-3 py-1.5 text-[11px] font-bold transition">Ver tratamento completo</Link></div>
      </article>
      <CareProgressVisual tasks={summaryTasks} goal={dailyGoal}
        onHydration={openHydrationCard} onFood={openFoodCard}
        onMedication={openMedicationCard} onOpen={task=>{setDetailTask(task);setError("");}}/>
      <div className="patient-progress care-premium-progress flex flex-wrap items-center gap-1.5 text-[10px] text-slate-300"><Check size={14} className="text-emerald-300"/>{finished} de {summaryTasks.length} cuidados concluídos
        {dailyGoal?.status==="atingida"&&<span title={`Hidratação: ${dailyGoal.consumed_ml} de ${dailyGoal.target_ml} ml até 23h.`} className="inline-flex items-center gap-1 rounded-md border border-emerald-300/25 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-200"><Droplets size={11}/> Meta de água atingida</span>}
        {dailyGoal?.status==="nao_atingida"&&<span title={`Hidratação: ${dailyGoal.consumed_ml} de ${dailyGoal.target_ml} ml até 23h.`} className="inline-flex items-center gap-1 rounded-md border border-amber-300/25 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-200"><Droplets size={11}/> Meta não atingida · 23h</span>}
        <span className="ml-auto font-bold text-sky-200">{completion}%</span></div>
    </div>
    <div className="patient-timeline care-reference-timeline care-timeline-with-image relative isolate flex min-h-[260px] min-w-0 flex-col overflow-hidden rounded-[22px] border p-3 md:min-h-0">
      <div aria-hidden="true" className="care-timeline-image-layer pointer-events-none absolute inset-0 z-0">
        <img src="/images/care-agenda-wellness.svg" alt="" loading="eager" decoding="async"
          className="care-timeline-generated-art" draggable={false}/>
      </div>
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-2 border-b border-white/10 pb-2"><div><p className="care-timeline-eyebrow text-[10px] font-extrabold uppercase tracking-widest">Linha do tempo</p><h3 className="mt-0.5 text-sm font-extrabold">Agenda de hoje</h3></div><span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[10px] text-slate-200"><ListChecks size={13}/>{agendaItems.length} registros</span></div>
      <div className="care-timeline-filters relative z-10 flex shrink-0 flex-wrap gap-1.5 pt-2" role="group" aria-label="Filtrar registros da agenda">
        {([{key:"todos",label:"Todos",count:agendaItems.length},{key:"hidratacao",label:"Líquidos",count:categoryCounts.hidratacao},{key:"refeicao",label:"Refeições",count:categoryCounts.refeicao},{key:"medicacao",label:"Medicamentos",count:categoryCounts.medicacao}] as const).map(category=><button
          key={category.key} type="button" aria-pressed={agendaCategory===category.key}
          onClick={()=>chooseAgenda(category.key)} className="care-timeline-filter inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold transition">
          {category.label} <span className="tabular-nums opacity-80">{category.count}</span>
        </button>)}
      </div>
      <div className="care-timeline-scroll relative z-10 mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1" aria-live="polite">
        {visibleAgenda.map(item=>{const Icon=icons[item.category]??CalendarClock;return <button key={item.key} type="button"
          data-care-category={item.category} data-care-state={item.completed?"done":item.resolved?"resolved":item.overdue?"overdue":"scheduled"}
          title={item.task?"Ver ou corrigir cuidado programado":"Abrir o histórico completo deste consumo"}
          aria-label={item.title+" às "+time(item.at)+". "+item.subtitle}
          onClick={()=>{if(item.task){setDetailTask(item.task);setError("");}else{window.location.assign("/cliente#historico");}}}
          className="patient-timeline-item flex w-full min-w-0 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left transition">
          <span className="w-11 shrink-0 font-mono text-[11px] font-bold tabular-nums">{time(item.at)}</span>
          <span className="grid size-7 shrink-0 place-items-center rounded-lg"><Icon size={16}/></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{item.title}</span>
            <span className="block truncate text-[10px]">{item.subtitle}</span></span>
          {item.completed&&<Check size={14} className="shrink-0 text-emerald-200"/>}<ChevronRight size={15} className="shrink-0"/>
        </button>})}
        {filteredAgenda.length===0&&<p className="rounded-lg p-4 text-sm text-slate-200">Nenhum registro nesta categoria para hoje.</p>}
        {extraError&&<p role="alert" className="rounded-lg border border-amber-300/40 bg-amber-950/60 p-2 text-[11px] text-amber-100">Não foi possível consultar todos os registros de {extraError}. O prontuário pode conter outros lançamentos.</p>}
      </div>
      <nav aria-label="Páginas da agenda" className="care-timeline-navigation relative z-20 mt-2 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/15 pt-2">
        <button type="button" onClick={()=>setAgendaPage(p=>Math.max(0,p-1))} disabled={agendaPage===0} className="rounded-lg border border-white/15 px-2.5 py-1 text-[11px] font-semibold disabled:opacity-35">Anterior</button>
        <span className="text-[11px] text-slate-300">Página {agendaIndex+1} de {agendaPageCount}</span>
        <button type="button" onClick={()=>setAgendaPage(p=>Math.min(agendaPageCount-1,p+1))} disabled={agendaPage>=agendaPageCount-1} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold disabled:opacity-35">Próxima</button>
        <Link to="/cliente" hash="historico" className="care-timeline-all-link" title="Abrir a área do cliente e consultar o histórico completo">Ver todos os registros <ChevronRight size={14}/></Link>
      </nav>
    </div>
  </div>
  {receipt&&<div role={receipt.success?"status":"alert"} className={`fixed inset-x-3 top-16 z-[95] mx-auto flex max-w-lg items-start gap-3 rounded-2xl border p-4 text-sm font-semibold shadow-xl ${receipt.success?"border-emerald-400 bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50":"border-rose-400 bg-rose-50 text-rose-950 dark:bg-rose-950 dark:text-rose-50"}`}><span className="flex-1">{receipt.success?"✓ Registro confirmado. ":"Atenção. "}{receipt.message}</span><button aria-label="Fechar aviso" type="button" onClick={()=>setReceipt(null)}><X size={17}/></button></div>}
  {error&&<p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
  <CareTaskRecordModal task={detailTask} onClose={()=>setDetailTask(null)} onSaved={()=>setRefresh(value=>value+1)} onConfirm={task=>{setSelected(task);setError("");setMealTime(currentAcreTime());setMealDescription("");}}/>
  {selected&&<div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-2 sm:p-4" onMouseDown={e=>{if(e.target===e.currentTarget&&!working)setSelected(null)}}><section role="dialog" aria-modal="true" aria-label="Confirmar cuidado" className="my-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-sm flex-col overflow-y-auto rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-2xl sm:p-4"><div className="flex items-center justify-between"><h3 className="text-lg font-bold">Confirmar cuidado</h3><button aria-label="Cancelar" disabled={working} onClick={()=>setSelected(null)}><X size={19}/></button></div><p className="mt-3 text-sm font-semibold">{selected.title}</p><p className="mt-1 text-xs text-muted-foreground">Previsto para {time(selected.scheduled_at)} · fuso do Acre</p>{selected.category==="medicacao"&&<p className="mt-3 rounded-xl bg-muted p-3 text-xs">Confirme apenas se tomou esta dose agora. O sistema registra a hora real, inclusive se houver atraso. Se ainda não tomou, procure orientação profissional; não dobre a dose.</p>}{selected.category==="refeicao"&&<div className="mt-3"><label className="block text-xs font-semibold">Horário em que realizou a refeição (Acre)<input type="time" value={mealTime} onChange={e=>setMealTime(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground"/></label><label className="mt-2 block text-xs font-semibold">O que você comeu nesta refeição?<textarea rows={3} maxLength={1000} value={mealDescription} onChange={e=>setMealDescription(e.target.value)} placeholder="Ex.: arroz, feijão, frango grelhado e salada. Quantidades e observações, se desejar." className="mt-1 w-full resize-y rounded-lg border border-border bg-background p-3 text-sm text-foreground" /><span className="mt-1 block text-[11px] font-normal text-muted-foreground">Esta confirmação substitui o almoço anterior do mesmo dia. O horário real informado será preservado, sem duplicar a refeição.</span></label></div>}{selected.category==="hidratacao"&&<label className="mt-3 block text-xs">Água consumida (ml)<input type="number" min={10} max={1500} step={10} value={water} onChange={e=>setWater(Number(e.target.value))} className="field mt-1"/></label>}<div className="mt-3 grid shrink-0 grid-cols-2 gap-2"><button onClick={()=>setSelected(null)} className="rounded-lg border border-border p-2.5 text-sm">Cancelar</button><button disabled={working||(selected.category==="refeicao"&&(mealDescription.trim().length<3||mealDescription.trim().length>900||!mealTime))||(selected.category==="hidratacao"&&(!Number.isInteger(water)||water<10||water>1500))} onClick={()=>void confirm()} className="rounded-lg bg-primary p-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{working?"Registrando…":"Confirmar agora"}</button></div></section></div>}
 </section>;
}