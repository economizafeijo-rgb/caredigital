import {useEffect,useMemo,useState} from "react";
import {createPortal} from "react-dom";
import {BarChart3,CalendarDays,CheckCircle2,Clock3,Download,Plus,X,Pencil,Trash2,Save,AlertTriangle} from "lucide-react";
import {supabase} from "@/integrations/supabase/client";
import type {HydrationGoalSnapshot} from "@/lib/hydration-goal";

type Category="hidratacao"|"refeicao"|"medicacao";
type Period="dia"|"mes"|"ano";
type Event={id:string;at:string;title:string;state:"realizado"|"pendente"|"nao_realizado";detail:string;amount?:number;taskId?:string;entryType?:"water"|"beverage"|"meal";entryId?:string;canDelete?:boolean};
type TaskDetails={task_id:string;title:string;category:string;scheduled_at:string;completed_at:string|null;description:string|null;amount_ml:number|null;water_entry_id:string|null;last_corrected_at:string|null;can_edit_water:boolean};
type Props={patientId:string;ownerId?:string;category:Category;onClose:()=>void;onAdd?:()=>void;hydrationGoal?:HydrationGoalSnapshot|null};
const zone="America/Rio_Branco";
const labels:Record<Category,string>={hidratacao:"Hidratação",refeicao:"Alimentação",medicacao:"Medicamentos e suplementos"};
const stamp=(d:Date)=>new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
const format=(d:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:zone,day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(d));
const acreInputValue=(value:string)=>{
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(value));
 const part=(type:string)=>parts.find(x=>x.type===type)?.value??"00";
 return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
};
function range(period:Period){
 const now=new Date(),local=stamp(now),[y,m,d]=local.split("-").map(Number);
 const start=period==="dia"?Date.UTC(y,m-1,d,5):period==="mes"?Date.UTC(y,m-1,1,5):Date.UTC(y,0,1,5);
 const end=period==="dia"?start+86400000:period==="mes"?Date.UTC(y,m,1,5):Date.UTC(y+1,0,1,5);
 return {from:new Date(start).toISOString(),to:new Date(end).toISOString()};
}
export function CareCategoryReport({patientId,ownerId,category,onClose,onAdd,hydrationGoal}:Props){
 const [period,setPeriod]=useState<Period>("dia");
 const [events,setEvents]=useState<Event[]>([]);
 const [loading,setLoading]=useState(true);
 const [warning,setWarning]=useState("");
 const [all,setAll]=useState(false);
 const [selectedEvent,setSelectedEvent]=useState<Event|null>(null);
 const [selectedTaskDetails,setSelectedTaskDetails]=useState<TaskDetails|null>(null);
 const [selectedWaterResponse,setSelectedWaterResponse]=useState<{response:string;recorded_at:string}|null>(null);
 const [detailLoading,setDetailLoading]=useState(false);
 const [detailError,setDetailError]=useState("");
 const [revision,setRevision]=useState(0);
 const [editing,setEditing]=useState(false);
 const [editDescription,setEditDescription]=useState("");
 const [editAmount,setEditAmount]=useState("200");
 const [editAt,setEditAt]=useState("");
 const [mutating,setMutating]=useState(false);
 const [confirmDelete,setConfirmDelete]=useState(false);
 useEffect(()=>{
  let active=true;setLoading(true);setWarning("");setEvents([]);setAll(false);
  async function load(){
   const db=supabase as any;
   let owner=ownerId;
   if(!owner){const p=await db.from("care_patients").select("owner_id").eq("id",patientId).maybeSingle();if(p.error||!p.data?.owner_id)throw Error("Não foi possível verificar o acesso ao relatório.");owner=p.data.owner_id;}
   const {from,to}=range(period);
   const base=(table:string,field:string)=>db.from(table).select("*").eq("patient_id",patientId).eq("owner_id",owner).gte(field,from).lt(field,to).order(field,{ascending:false}).limit(2500);
   const [tasks,resolutions,water,beverages,meals]=await Promise.all([
    base("care_daily_checklist","scheduled_at").eq("category",category),
    base("care_task_resolutions","scheduled_at"),
    category==="hidratacao"?base("care_hydration","recorded_at"):Promise.resolve({data:[],error:null}),
    category==="hidratacao"?base("care_client_beverages","consumed_at"):Promise.resolve({data:[],error:null}),
    category==="refeicao"?base("care_activity_log","recorded_at").eq("source","client_unscheduled_intake").eq("event_type","logged").eq("category","refeicao").is("task_id",null):Promise.resolve({data:[],error:null})
   ]);
   if(!active)return;
   const results=[tasks,resolutions,water,beverages,meals];
   if(results.some(r=>r.error))setWarning("Algumas fontes não puderam ser consultadas; o relatório pode estar incompleto.");
   if(results.some(r=>(r.data??[]).length===2500))setWarning("Limite de 2.500 registros por fonte atingido. O relatório pode estar incompleto.");
   const now=Date.now(),resolutionMap=new Map((resolutions.data??[]).map((r:any)=>[r.task_id,r.status]));
   const taskIds=new Set((tasks.data??[]).map((r:any)=>r.id));
   const waterByTask=new Map<string,any>((water.data??[]).filter((r:any)=>r.task_id).map((r:any)=>[r.task_id,r]));
   const scheduled:Event[]=(tasks.data??[]).map((r:any)=>{
    const status=String(resolutionMap.get(r.id)??"");
    const done=Boolean(r.completed_at);
    const missed=!done&&(status==="nao_bebi"||status==="nao_realizado"||status==="nao_confirmou"||status==="not_drunk"||Date.parse(r.scheduled_at)<now);
    const linkedWater=category==="hidratacao"?waterByTask.get(r.id):undefined;
    return {id:"task:"+r.id,at:r.completed_at||r.scheduled_at,title:r.title||labels[category],
     state:done?"realizado":missed?"nao_realizado":"pendente",
     detail:done?"Confirmado":status?"Situação registrada: "+status:missed?"Horário passou sem confirmação":"Ainda programado",taskId:r.id,
     amount:linkedWater?Number(linkedWater.amount_ml)||0:undefined,
     entryType:linkedWater?"water":undefined,entryId:linkedWater?.id,canDelete:!linkedWater?.task_id};
   });
   const extra:Event[]=[
    ...(water.data??[]).filter((r:any)=>!r.task_id||!taskIds.has(r.task_id)).map((r:any)=>({id:"water:"+r.id,at:r.recorded_at,title:"Água consumida",state:"realizado" as const,detail:"Consumo avulso",amount:Number(r.amount_ml)||0,entryType:"water" as const,entryId:r.id,canDelete:!r.task_id})),
    ...(beverages.data??[]).map((r:any)=>({id:"drink:"+r.id,at:r.consumed_at,title:r.name||r.kind||"Bebida",state:"realizado" as const,detail:r.name||"Bebida registrada",amount:Number(r.amount_ml)||0,entryType:"beverage" as const,entryId:r.id,canDelete:true})),
    ...(meals.data??[]).filter((r:any)=>!r.details?.superseded).map((r:any)=>({id:"meal:"+r.id,at:r.recorded_at,title:r.details?.title||"Refeição avulsa",state:"realizado" as const,detail:String(r.details?.description||"Nenhuma descrição alimentar foi informada."),amount:undefined,entryType:"meal" as const,entryId:r.id,taskId:r.details?.linked_task_id||undefined,canDelete:true}))
   ];
   setEvents([...scheduled,...extra].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)));
   setLoading(false);
  }
  void load().catch(e=>{if(active){setLoading(false);setWarning(e instanceof Error?e.message:"Erro ao consultar os registros.");}});
  return()=>{active=false};
 },[patientId,ownerId,category,period,revision]);
 const stats=useMemo(()=>({done:events.filter(x=>x.state==="realizado").length,missed:events.filter(x=>x.state==="nao_realizado").length,pending:events.filter(x=>x.state==="pendente").length,volume:events.filter(x=>x.id.startsWith("water:")).reduce((n,x)=>n+(x.amount??0),0),beverages:events.filter(x=>x.id.startsWith("drink:")).reduce((n,x)=>n+(x.amount??0),0)}),[events]);
 const today=stamp(new Date());
 const goalForToday=category==="hidratacao"&&period==="dia"&&hydrationGoal?.goal_date===today&&Number(hydrationGoal.target_ml)>0?hydrationGoal:null;
 const dailyConsumed=goalForToday?Number(goalForToday.consumed_ml??0):null;
 const dailyTarget=goalForToday?Number(goalForToday.target_ml??0):null;
 const dailyPercent=dailyTarget&&dailyConsumed!==null?Math.min(100,Math.round(dailyConsumed/dailyTarget*100)):0;
 const openEventDetails=async(event:Event)=>{
  setSelectedEvent(event);setSelectedTaskDetails(null);setSelectedWaterResponse(null);setDetailError("");
  setEditing(false);setConfirmDelete(false);setMutating(false);
  setEditDescription(event.entryType==="water"?"":event.detail);
  setEditAmount(String(event.amount??200));
  setEditAt(acreInputValue(event.at));
  if(!event.taskId){setDetailLoading(false);return;}
  setDetailLoading(true);
  try{
   const db=supabase as any;
   const [record,response]=await Promise.all([
    db.rpc("care_get_task_record",{p_task_id:event.taskId}),
    category==="hidratacao"
      ?db.from("care_hydration_responses").select("response,recorded_at").eq("task_id",event.taskId).maybeSingle()
      :Promise.resolve({data:null,error:null})
   ]);
   if(record.error)throw record.error;
   if(!record.data||record.data.task_id!==event.taskId)throw new Error("O detalhe deste cuidado não foi encontrado no prontuário.");
   setSelectedTaskDetails(record.data as TaskDetails);
   if(response.error)throw response.error;
   setSelectedWaterResponse(response.data??null);
  }catch(failure){
   setDetailError(failure instanceof Error?failure.message:"Não foi possível carregar os detalhes adicionais.");
  }finally{setDetailLoading(false);}
 };
 const saveEntry=async()=>{
  const event=selectedEvent;
  if(!event?.entryType||!event.entryId||mutating)return;
  const when=new Date(editAt+"-05:00");
  if(!editAt||!Number.isFinite(when.getTime())||when.getTime()>Date.now()+120000){
   setDetailError("Informe uma data e hora válidas, sem horário futuro (Acre).");return;
  }
  const amount=event.entryType==="meal"?null:Number(editAmount);
  if(event.entryType!=="meal"&&(amount===null||!Number.isInteger(amount)||amount<10||amount>1500)){
   setDetailError("Informe uma quantidade entre 10 e 1.500 ml.");return;
  }
  if((event.entryType==="meal"&&editDescription.trim().length<3)||(event.entryType==="beverage"&&editDescription.trim().length<2)){
   setDetailError(event.entryType==="meal"?"Descreva a refeição (mínimo 3 caracteres).":"Informe o nome da bebida.");return;
  }
  setMutating(true);setDetailError("");
  try{
   const {error}=await (supabase as any).rpc("care_update_intake_entry",{
    p_patient_id:patientId,p_entry_type:event.entryType,p_entry_id:event.entryId,
    p_description:event.entryType==="water"?null:editDescription.trim(),
    p_amount_ml:amount,p_consumed_at:when.toISOString()
   });
   if(error)throw error;
   setSelectedEvent(null);setEditing(false);setRevision(v=>v+1);
  }catch(failure){
   setDetailError(failure instanceof Error?failure.message:"Não foi possível atualizar o registro.");
  }finally{setMutating(false);}
 };
 const deleteEntry=async()=>{
  const event=selectedEvent;
  if(!event?.entryType||!event.entryId||!event.canDelete||mutating)return;
  setMutating(true);setDetailError("");
  try{
   const {error}=await (supabase as any).rpc("care_delete_intake_entry",{
    p_patient_id:patientId,p_entry_type:event.entryType,p_entry_id:event.entryId
   });
   if(error)throw error;
   setSelectedEvent(null);setConfirmDelete(false);setRevision(v=>v+1);
  }catch(failure){
   setDetailError(failure instanceof Error?failure.message:"Não foi possível excluir o registro.");
  }finally{setMutating(false);}
 };
 const exportCsv=()=>{
  const rows=[["Data (Acre)","Categoria","Evento","Situação","Detalhes","Volume (ml)"],...events.map(e=>[format(e.at),labels[category],e.title,e.state,e.detail,String(e.amount??"")])];
  const csv="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(";")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const link=document.createElement("a");link.href=url;link.download="caredigital-"+category+"-"+period+".csv";link.click();URL.revokeObjectURL(url);
 };
 return typeof document==="undefined"?null:createPortal(
  <div className="fixed inset-0 z-[190] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
   <section role="dialog" aria-modal="true" aria-label={"Relatório de "+labels[category]} className="care-category-report-dialog flex h-[min(96dvh,760px)] w-full max-w-[900px] min-h-0 flex-col overflow-hidden rounded-t-3xl border border-primary/30 bg-card text-foreground shadow-2xl sm:h-[min(94dvh,760px)] sm:rounded-2xl">
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2 sm:px-4 sm:py-2.5">
     <div><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary"><BarChart3 size={15}/> Relatório de acompanhamento</p><h2 className="text-base font-bold sm:text-lg">{labels[category]}</h2><p className="text-xs text-muted-foreground">Eventos realizados, não confirmados e futuros · horário do Acre</p></div>
     <button type="button" aria-label="Fechar relatório" onClick={onClose} className="rounded-lg border border-border p-2"><X size={19}/></button>
    </header>
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5">
     <div className="flex min-w-0 rounded-xl border border-border bg-muted p-1" role="group" aria-label="Período">
      {(["dia","mes","ano"] as const).map(p=><button key={p} type="button" aria-pressed={period===p} onClick={()=>setPeriod(p)} className={"rounded-lg px-3 py-1.5 text-[11px] font-bold sm:px-4 sm:py-2 sm:text-xs "+(period===p?"bg-primary text-primary-foreground":"text-foreground hover:bg-muted")}>{p==="dia"?"Diário":p==="mes"?"Mensal":"Anual"}</button>)}
     </div>
     <button type="button" onClick={exportCsv} disabled={loading||events.length===0} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold disabled:opacity-40"><Download size={14}/> Exportar CSV</button>
    </div>
    {category==="hidratacao"&&<div className="mx-3 mb-2 shrink-0 rounded-xl border border-primary/30 bg-gradient-to-r from-accent to-transparent p-2.5 sm:mx-4 sm:mb-2.5 sm:p-3" aria-live="polite">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">{period==="dia"?"Consumo de água de hoje":"Água registrada no período"}</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1"><strong className="text-2xl font-bold tabular-nums sm:text-3xl">{(dailyConsumed??stats.volume).toLocaleString("pt-BR")} <span className="text-base font-bold">ml</span></strong>
        {dailyTarget!==null&&<span className="text-sm text-foreground">de {dailyTarget.toLocaleString("pt-BR")} ml · {dailyPercent}%</span>}
      </div>
      {dailyTarget!==null&&dailyConsumed!==null&&<><div role="progressbar" aria-label="Meta de hidratação" aria-valuenow={dailyPercent} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:dailyPercent+"%"}}/></div>
        <p className="mt-1.5 text-[11px] text-primary sm:text-xs">{dailyConsumed>=dailyTarget?"Meta alcançada · "+(dailyConsumed-dailyTarget).toLocaleString("pt-BR")+" ml acima da meta":(dailyTarget-dailyConsumed).toLocaleString("pt-BR")+" ml restantes para a meta"}</p></>}
      {dailyConsumed===null&&<p className="mt-2 text-xs text-muted-foreground">Total de água registrado no período. Bebidas aparecem separadamente no histórico.</p>}
      <p className="mt-1 text-[11px] text-muted-foreground sm:text-[11px]">Registros de água: {stats.volume.toLocaleString("pt-BR")} ml · Outras bebidas: {stats.beverages.toLocaleString("pt-BR")} ml</p>
    </div>}
    <div className="grid shrink-0 grid-cols-2 gap-1.5 px-3 pb-2 sm:grid-cols-4 sm:gap-2 sm:px-4 sm:pb-2.5">
     {([{label:"Realizados",value:stats.done,icon:CheckCircle2},{label:"Sem confirmação",value:stats.missed,icon:Clock3},{label:"Pendentes",value:stats.pending,icon:CalendarDays},{label:category==="hidratacao"?"Água registrada":"Eventos",value:category==="hidratacao"?(stats.volume/1000).toLocaleString("pt-BR",{maximumFractionDigits:2})+" L":events.length,icon:BarChart3}] as const).map(item=><div key={item.label} className="rounded-lg border border-border bg-muted p-2 sm:rounded-xl sm:p-2.5"><span className="block text-[11px] leading-tight text-muted-foreground sm:text-[11px]">{item.label}</span><strong className="mt-0.5 block text-lg leading-tight sm:mt-1 sm:text-xl">{item.value}</strong></div>)}
    </div>
    {warning&&<p role="alert" className="mx-4 mb-2 rounded-lg border border-amber-300/40 bg-amber-300/10 p-2 text-xs text-warning">{warning}</p>}
    <div className="care-category-report-events min-h-[150px] flex-1 overflow-y-auto overscroll-contain px-3 pb-2 sm:px-4 sm:pb-3" role="region" aria-label="Eventos do período">
     {loading?<p className="p-4 text-sm text-muted-foreground">Consultando registros…</p>:events.length===0?<p className="p-4 text-sm text-muted-foreground">Nenhum evento encontrado neste período.</p>:<div className="space-y-2">
      {(all?events:events.slice(0,35)).map(e=><button key={e.id} type="button" onClick={()=>void openEventDetails(e)}
       aria-label={"Ver detalhes de "+e.title+" às "+format(e.at)}
       className="group flex w-full items-start gap-2.5 rounded-lg border border-border bg-muted p-2 sm:gap-3 sm:rounded-xl sm:p-2.5 text-left transition hover:border-primary/30 hover:bg-teal-300/[.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300">
       <span className={"mt-1 size-2 shrink-0 rounded-full "+(e.state==="realizado"?"bg-emerald-300":e.state==="pendente"?"bg-sky-300":"bg-amber-300")}/>
       <span className="min-w-0 flex-1"><strong className="block text-[12px] leading-snug sm:text-sm">{e.title}</strong><span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground sm:mt-1 sm:text-xs">{e.detail}{e.amount!==undefined?" · "+e.amount.toLocaleString("pt-BR")+" ml":""}</span></span>
       <span className="shrink-0 text-right"><time className="block text-[11px] text-muted-foreground sm:text-[11px]">{format(e.at)}</time><span className="text-[11px] font-semibold sm:text-[11px]">{e.state==="realizado"?"Realizado":e.state==="pendente"?"Pendente":"Sem confirmação"}</span><span className="mt-0.5 flex items-center justify-end gap-1 text-[11px] font-bold text-primary opacity-80 group-hover:opacity-100">Detalhes <span aria-hidden="true">›</span></span></span>
      </button>)}
      {events.length>35&&<button type="button" onClick={()=>setAll(v=>!v)} className="w-full rounded-lg border border-primary/30 p-2 text-xs font-bold text-primary">{all?"Mostrar menos":"Mostrar todos os "+events.length+" registros"}</button>}
     </div>}
    </div>
    {selectedEvent&&<div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm" onMouseDown={e=>{if(e.target===e.currentTarget)setSelectedEvent(null);}}>
     <section role="dialog" aria-modal="true" aria-labelledby="care-report-detail-title" className="w-full max-w-xl overflow-hidden rounded-2xl border border-primary/30 bg-card text-foreground shadow-2xl">
      <header className="flex items-start justify-between gap-3 border-b border-border bg-white/[.04] px-4 py-3">
       <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-widest text-primary">{category==="hidratacao"?"Detalhes da hidratação":category==="refeicao"?"Detalhes da refeição":"Detalhes do cuidado"}</p><h3 id="care-report-detail-title" className="mt-1 break-words text-lg font-bold">{selectedEvent.title}</h3><p className="mt-1 text-xs text-muted-foreground">{format(selectedEvent.at)} · horário do Acre</p></div>
       <button type="button" aria-label="Fechar detalhes" onClick={()=>setSelectedEvent(null)} className="shrink-0 rounded-lg border border-border p-2 hover:bg-muted"><X size={17}/></button>
      </header>
      <div className="space-y-3 p-4">
       <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-muted p-3"><span className="block text-[11px] text-muted-foreground">Situação</span><strong className="mt-1 block text-sm">{selectedEvent.state==="realizado"?"Realizado":selectedEvent.state==="pendente"?"Pendente":"Sem confirmação"}</strong></div>
        <div className="rounded-xl border border-border bg-muted p-3"><span className="block text-[11px] text-muted-foreground">{category==="hidratacao"?"Quantidade":category==="refeicao"?"Horário registrado":"Registro"}</span><strong className="mt-1 block text-sm">{category==="hidratacao"?((selectedTaskDetails?.amount_ml??selectedEvent.amount)!=null?String((selectedTaskDetails?.amount_ml??selectedEvent.amount)?.toLocaleString("pt-BR"))+" ml":"Não informado"):format(selectedEvent.at)}</strong></div>
       </div>
       {detailLoading&&<p className="rounded-xl border border-primary/30 bg-accent p-3 text-sm text-primary">Carregando detalhes do prontuário…</p>}
       {category==="hidratacao"&&<div className="rounded-xl border border-primary/30 bg-teal-300/[.08] p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-primary">Informações da hidratação</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{selectedTaskDetails?.description||selectedEvent.detail||"Sem observações adicionais."}</p>{selectedWaterResponse&&<p className="mt-2 text-xs text-primary">Resposta: {selectedWaterResponse.response} · {format(selectedWaterResponse.recorded_at)}</p>}{selectedTaskDetails?.last_corrected_at&&<p className="mt-2 text-xs text-muted-foreground">Quantidade corrigida em {format(selectedTaskDetails.last_corrected_at)}.</p>}</div>}
       {category==="refeicao"&&<div className="rounded-xl border border-primary/30 bg-teal-300/[.08] p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-primary">Alimentos e porções</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{selectedTaskDetails?.description||(!selectedEvent.taskId?selectedEvent.detail:"")||"Nenhuma descrição detalhada dos alimentos foi registrada para esta refeição."}</p></div>}
       {detailError&&<p role="alert" className="rounded-lg border border-amber-300/35 bg-amber-300/10 p-3 text-xs text-warning">{detailError}</p>}
       {selectedEvent.entryType&&<div className="space-y-3 rounded-xl border border-border bg-white/[.04] p-3">
        {!editing&&!confirmDelete&&<div className="flex flex-wrap gap-2">
         <button type="button" onClick={()=>setEditing(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"><Pencil size={15}/> Editar registro</button>
         {selectedEvent.canDelete&&<button type="button" onClick={()=>setConfirmDelete(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-300/40 px-4 text-sm font-bold text-destructive hover:bg-rose-400/10"><Trash2 size={15}/> Excluir</button>}
         {!selectedEvent.canDelete&&<p className="self-center text-[11px] text-muted-foreground">Registro vinculado a um cuidado programado: pode editar a quantidade e o horário, mas não excluir por aqui.</p>}
        </div>}
        {editing&&<div className="space-y-3">
         <p className="text-xs font-bold uppercase tracking-wide text-primary">Editar informações</p>
         {(selectedEvent.entryType==="meal"||selectedEvent.entryType==="beverage")&&<label className="block text-xs font-semibold">{selectedEvent.entryType==="meal"?"Alimentos consumidos":"Nome da bebida"}
          {selectedEvent.entryType==="meal"
           ?<textarea rows={3} maxLength={1000} value={editDescription} onChange={e=>setEditDescription(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-muted p-3 text-sm text-foreground"/>
           :<input value={editDescription} maxLength={100} onChange={e=>setEditDescription(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-muted p-3 text-sm text-foreground"/>}
         </label>}
         {selectedEvent.entryType!=="meal"&&<label className="block text-xs font-semibold">Quantidade (ml)
          <input type="number" min={10} max={1500} step={1} value={editAmount} onChange={e=>setEditAmount(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-muted p-3 text-sm text-foreground"/>
         </label>}
         <label className="block text-xs font-semibold">Data e hora do consumo · Acre
          <input type="datetime-local" value={editAt} onChange={e=>setEditAt(e.target.value)} className="mt-1 block w-full min-w-0 rounded-lg border border-border bg-muted p-3 text-sm text-foreground"/>
         </label>
         <div className="flex flex-wrap gap-2">
          <button type="button" disabled={mutating} onClick={()=>{setEditing(false);setDetailError("");}} className="min-h-10 rounded-lg border border-border px-4 text-sm font-semibold">Cancelar</button>
          <button type="button" disabled={mutating} onClick={()=>void saveEntry()} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"><Save size={15}/>{mutating?"Salvando…":"Salvar alterações"}</button>
         </div>
        </div>}
        {confirmDelete&&<div className="space-y-2 rounded-lg border border-rose-300/30 bg-rose-400/10 p-3">
         <p className="flex items-center gap-2 text-sm font-bold text-destructive"><AlertTriangle size={16}/> Excluir este registro?</p>
         <p className="text-xs text-foreground">A entrada será removida do acompanhamento. As metas e os horários de hidratação serão recalculados.</p>
         <div className="flex flex-wrap gap-2">
          <button type="button" disabled={mutating} onClick={()=>setConfirmDelete(false)} className="min-h-10 rounded-lg border border-border px-4 text-sm font-semibold">Manter registro</button>
          <button type="button" disabled={mutating} onClick={()=>void deleteEntry()} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-rose-500 px-4 text-sm font-bold text-foreground disabled:opacity-50"><Trash2 size={15}/>{mutating?"Excluindo…":"Confirmar exclusão"}</button>
         </div>
        </div>}
       </div>}
       <div className="flex justify-end"><button type="button" onClick={()=>setSelectedEvent(null)} className="min-h-10 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary">Fechar</button></div>
      </div>
     </section>
    </div>}
    {onAdd&&<div className="shrink-0 border-t border-border px-3 py-2 sm:px-4 sm:py-2"><button type="button" onClick={onAdd} className="flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold sm:min-h-10 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm text-primary-foreground transition hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><Plus size={18}/> {category==="hidratacao"?"Registrar nova hidratação":category==="refeicao"?"Registrar nova alimentação":"Registrar informação de medicação"}</button></div>}
    <footer className="shrink-0 border-t border-border px-3 py-1.5 text-[11px] leading-snug text-muted-foreground sm:px-4 sm:py-2 sm:text-[11px]">Sem confirmação não comprova que o cuidado deixou de ocorrer. Dados limitados aos registros acessíveis no sistema.</footer>
   </section>
  </div>,document.body);
}
