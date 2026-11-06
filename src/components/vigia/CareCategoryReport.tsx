import {useEffect,useMemo,useState} from "react";
import {createPortal} from "react-dom";
import {BarChart3,CalendarDays,CheckCircle2,Clock3,Download,Plus,X} from "lucide-react";
import {supabase} from "@/integrations/supabase/client";

type Category="hidratacao"|"refeicao"|"medicacao";
type Period="dia"|"mes"|"ano";
type Event={id:string;at:string;title:string;state:"realizado"|"pendente"|"nao_realizado";detail:string;amount?:number};
type Props={patientId:string;ownerId?:string;category:Category;onClose:()=>void;onAdd?:()=>void};
const zone="America/Rio_Branco";
const labels:Record<Category,string>={hidratacao:"Hidratação",refeicao:"Alimentação",medicacao:"Medicamentos e suplementos"};
const stamp=(d:Date)=>new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
const format=(d:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:zone,day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(d));
function range(period:Period){
 const now=new Date(),local=stamp(now),[y,m,d]=local.split("-").map(Number);
 const start=period==="dia"?Date.UTC(y,m-1,d,5):period==="mes"?Date.UTC(y,m-1,1,5):Date.UTC(y,0,1,5);
 const end=period==="dia"?start+86400000:period==="mes"?Date.UTC(y,m,1,5):Date.UTC(y+1,0,1,5);
 return {from:new Date(start).toISOString(),to:new Date(end).toISOString()};
}
export function CareCategoryReport({patientId,ownerId,category,onClose,onAdd}:Props){
 const [period,setPeriod]=useState<Period>("dia");
 const [events,setEvents]=useState<Event[]>([]);
 const [loading,setLoading]=useState(true);
 const [warning,setWarning]=useState("");
 const [all,setAll]=useState(false);
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
   const scheduled:Event[]=(tasks.data??[]).map((r:any)=>{
    const status=String(resolutionMap.get(r.id)??"");
    const done=Boolean(r.completed_at);
    const missed=!done&&(status==="nao_bebi"||status==="nao_realizado"||status==="nao_confirmou"||status==="not_drunk"||Date.parse(r.scheduled_at)<now);
    return {id:"task:"+r.id,at:r.completed_at||r.scheduled_at,title:r.title||labels[category],
     state:done?"realizado":missed?"nao_realizado":"pendente",
     detail:done?"Confirmado":status?"Situação registrada: "+status:missed?"Horário passou sem confirmação":"Ainda programado"};
   });
   const extra:Event[]=[
    ...(water.data??[]).filter((r:any)=>!r.task_id||!taskIds.has(r.task_id)).map((r:any)=>({id:"water:"+r.id,at:r.recorded_at,title:"Água consumida",state:"realizado" as const,detail:"Consumo avulso",amount:Number(r.amount_ml)||0})),
    ...(beverages.data??[]).map((r:any)=>({id:"drink:"+r.id,at:r.consumed_at,title:r.name||r.kind||"Bebida",state:"realizado" as const,detail:"Bebida registrada",amount:Number(r.amount_ml)||0})),
    ...(meals.data??[]).filter((r:any)=>!r.details?.superseded).map((r:any)=>({id:"meal:"+r.id,at:r.recorded_at,title:r.details?.title||r.details?.description||"Refeição avulsa",state:"realizado" as const,detail:"Consumo registrado"}))
   ];
   setEvents([...scheduled,...extra].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)));
   setLoading(false);
  }
  void load().catch(e=>{if(active){setLoading(false);setWarning(e instanceof Error?e.message:"Erro ao consultar os registros.");}});
  return()=>{active=false};
 },[patientId,ownerId,category,period]);
 const stats=useMemo(()=>({done:events.filter(x=>x.state==="realizado").length,missed:events.filter(x=>x.state==="nao_realizado").length,pending:events.filter(x=>x.state==="pendente").length,volume:events.reduce((n,x)=>n+(x.amount??0),0)}),[events]);
 const exportCsv=()=>{
  const rows=[["Data (Acre)","Categoria","Evento","Situação","Detalhes","Volume (ml)"],...events.map(e=>[format(e.at),labels[category],e.title,e.state,e.detail,String(e.amount??"")])];
  const csv="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(";")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const link=document.createElement("a");link.href=url;link.download="caredigital-"+category+"-"+period+".csv";link.click();URL.revokeObjectURL(url);
 };
 return typeof document==="undefined"?null:createPortal(
  <div className="fixed inset-0 z-[190] flex items-center justify-center bg-slate-950/80 p-2 backdrop-blur-sm sm:p-4" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
   <section role="dialog" aria-modal="true" aria-label={"Relatório de "+labels[category]} className="flex h-[min(90dvh,690px)] w-full max-w-[950px] flex-col overflow-hidden rounded-2xl border border-teal-300/30 bg-[#102b3b] text-white shadow-2xl">
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
     <div><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-teal-300"><BarChart3 size={15}/> Relatório de acompanhamento</p><h2 className="text-lg font-extrabold">{labels[category]}</h2><p className="text-xs text-slate-300">Eventos realizados, não confirmados e futuros · horário do Acre</p></div>
     <button type="button" aria-label="Fechar relatório" onClick={onClose} className="rounded-lg border border-white/20 p-2"><X size={19}/></button>
    </header>
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-3">
     <div className="flex rounded-xl border border-white/15 bg-slate-950/30 p-1" role="group" aria-label="Período">
      {(["dia","mes","ano"] as const).map(p=><button key={p} type="button" aria-pressed={period===p} onClick={()=>setPeriod(p)} className={"rounded-lg px-4 py-2 text-xs font-bold "+(period===p?"bg-teal-300 text-slate-950":"text-slate-200 hover:bg-white/10")}>{p==="dia"?"Diário":p==="mes"?"Mensal":"Anual"}</button>)}
     </div>
     <button type="button" onClick={exportCsv} disabled={loading||events.length===0} className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-bold disabled:opacity-40"><Download size={14}/> Exportar CSV</button>
    </div>
    <div className="grid shrink-0 grid-cols-2 gap-2 px-4 pb-3 sm:grid-cols-4">
     {([{label:"Realizados",value:stats.done,icon:CheckCircle2},{label:"Sem confirmação",value:stats.missed,icon:Clock3},{label:"Pendentes",value:stats.pending,icon:CalendarDays},{label:category==="hidratacao"?"Volume avulso":"Eventos",value:category==="hidratacao"?(stats.volume/1000).toLocaleString("pt-BR",{maximumFractionDigits:2})+" L":events.length,icon:BarChart3}] as const).map(item=><div key={item.label} className="rounded-xl border border-white/10 bg-white/5 p-3"><span className="block text-[11px] text-slate-300">{item.label}</span><strong className="mt-1 block text-xl">{item.value}</strong></div>)}
    </div>
    {warning&&<p role="alert" className="mx-4 mb-2 rounded-lg border border-amber-300/40 bg-amber-300/10 p-2 text-xs text-amber-100">{warning}</p>}
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4" role="region" aria-label="Eventos do período">
     {loading?<p className="p-4 text-sm text-slate-300">Consultando registros…</p>:events.length===0?<p className="p-4 text-sm text-slate-300">Nenhum evento encontrado neste período.</p>:<div className="space-y-2">
      {(all?events:events.slice(0,35)).map(e=><div key={e.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
       <span className={"mt-1 size-2 shrink-0 rounded-full "+(e.state==="realizado"?"bg-emerald-300":e.state==="pendente"?"bg-sky-300":"bg-amber-300")}/>
       <div className="min-w-0 flex-1"><strong className="block text-sm">{e.title}</strong><p className="mt-1 text-xs text-slate-300">{e.detail}{e.amount!==undefined?" · "+e.amount.toLocaleString("pt-BR")+" ml":""}</p></div>
       <div className="shrink-0 text-right"><time className="block text-[11px] text-slate-300">{format(e.at)}</time><span className="text-[11px] font-semibold">{e.state==="realizado"?"Realizado":e.state==="pendente"?"Pendente":"Sem confirmação"}</span></div>
      </div>)}
      {events.length>35&&<button type="button" onClick={()=>setAll(v=>!v)} className="w-full rounded-lg border border-teal-300/30 p-2 text-xs font-bold text-teal-100">{all?"Mostrar menos":"Mostrar todos os "+events.length+" registros"}</button>}
     </div>}
    </div>
    {onAdd&&<div className="shrink-0 border-t border-white/10 px-4 py-3"><button type="button" onClick={onAdd} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-300 px-4 py-2.5 text-sm font-extrabold text-slate-950 transition hover:bg-teal-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><Plus size={18}/> {category==="hidratacao"?"Registrar nova hidratação":category==="refeicao"?"Registrar nova alimentação":"Registrar informação de medicação"}</button></div>}
    <footer className="shrink-0 border-t border-white/10 px-4 py-2 text-[11px] text-slate-300">Sem confirmação não comprova que o cuidado deixou de ocorrer. Dados limitados aos registros acessíveis no sistema.</footer>
   </section>
  </div>,document.body);
}
