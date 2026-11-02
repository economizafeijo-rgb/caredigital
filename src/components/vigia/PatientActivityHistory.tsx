import {useEffect,useState} from "react";
import {supabase} from "@/integrations/supabase/client";
import {getCareScheduleState} from "@/lib/care-schedule";
type Event={id:string;category:string;title:string;scheduled_at:string;completed_at:string};
const fmt=(x:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Rio_Branco",dateStyle:"short",timeStyle:"medium"}).format(new Date(x));
export function PatientActivityHistory({patientId,ownerId,revision}:{patientId:string;ownerId:string;revision:number}){
 const [events,setEvents]=useState<Event[]>([]);
 const [problem,setProblem]=useState("");
 useEffect(()=>{let live=true;(async()=>{
  const db=supabase as any;
  const [result, hydration, observations, audit, beverages]=await Promise.all([
    db.from("care_daily_checklist").select("id,category,title,scheduled_at,completed_at").eq("patient_id",patientId).eq("owner_id",ownerId).gte("scheduled_at",new Date(Date.now()-30*86400000).toISOString()).order("scheduled_at",{ascending:false}).limit(300),
    db.from("care_hydration").select("id,amount_ml,recorded_at").eq("patient_id",patientId).eq("owner_id",ownerId).order("recorded_at",{ascending:false}).limit(150),
    db.from("care_observations").select("id,observation_type,notes,recorded_at").eq("patient_id",patientId).eq("owner_id",ownerId).order("recorded_at",{ascending:false}).limit(150),
    db.from("care_activity_log").select("id,category,event_type,source,details,scheduled_at,happened_at,recorded_at").eq("patient_id",patientId).eq("owner_id",ownerId).order("recorded_at",{ascending:false}).limit(150),
    db.from("care_client_beverages").select("id,kind,name,amount_ml,notes,consumed_at").eq("patient_id",patientId).eq("owner_id",ownerId).order("consumed_at",{ascending:false}).limit(150)
  ]);
  if(!live)return;
  if(result.error){setProblem("Não foi possível consultar o histórico.");return;}
  const scheduledRows=(result.data??[]) as Array<Omit<Event,"completed_at">&{completed_at:string|null}>;
  const all:Event[]=scheduledRows.flatMap(t=>t.completed_at?[{...t,completed_at:t.completed_at}]:getCareScheduleState(t)==="missed"?[{...t,category:"nao_confirmado",title:`Não confirmado · ${t.title}`,completed_at:t.scheduled_at}]:[]);
  if(!hydration.error)(hydration.data??[]).forEach((h:any)=>all.push({id:"agua-"+h.id,category:"hidratacao",title:"Água · "+h.amount_ml+" ml",scheduled_at:h.recorded_at,completed_at:h.recorded_at}));
  if(!observations.error)(observations.data??[]).forEach((o:any)=>all.push({id:"observacao-"+o.id,category:o.observation_type,title:o.notes||"Observação registrada",scheduled_at:o.recorded_at,completed_at:o.recorded_at}));
  if(!beverages.error)(beverages.data??[]).forEach((b:any)=>all.push({id:"bebida-"+b.id,category:"bebida",title:`${b.kind==="cha"?"Chá":b.kind==="agua"?"Água":b.kind==="suco"?"Suco":b.kind==="cafe"?"Café":"Bebida"} · ${b.name} · ${b.amount_ml} ml`,scheduled_at:b.consumed_at,completed_at:b.consumed_at}));
  if(!audit.error)(audit.data??[]).filter((e:any)=>e.event_type!=="confirmed").forEach((e:any)=>all.push({id:"log-"+e.id,category:e.event_type==="deleted"?"exclusao":e.category,title:e.event_type==="deleted"?`Refeição excluída · ${e.details?.title||"Refeição"}`:e.event_type==="patient_report"?"Relato do paciente — "+(e.details?.period==="morning"?"manhã fora do horário":e.details?.period==="night"?"noite às 19h":"horário informado"):"Ocorrência registrada",scheduled_at:e.scheduled_at||e.happened_at||e.recorded_at,completed_at:e.recorded_at}));
  all.sort((x,y)=>Date.parse(y.completed_at)-Date.parse(x.completed_at));
  setEvents(all);setProblem("");
 })();return()=>{live=false};},[patientId,ownerId,revision]);
 return <section className="mt-6 rounded-2xl border border-border bg-card p-5"><h4 className="text-lg font-bold">Histórico do paciente</h4><p className="mt-1 text-xs text-muted-foreground">Registros confirmados, cuidados não confirmados, refeições, chás, bebidas e exclusões. As confirmações usam o horário real do servidor; ausência de confirmação não comprova que o cuidado deixou de acontecer.</p>{problem&&<p role="alert">{problem}</p>}<div className="mt-4 max-h-96 space-y-2 overflow-y-auto">{events.map(e=><article key={e.id} className="rounded-xl border border-border bg-background p-3"><p className="text-sm font-semibold">{e.title}</p><p className="mt-1 text-xs text-muted-foreground">{e.category==="nao_confirmado"?`Previsto para ${fmt(e.scheduled_at)} (Acre) · Não confirmado no horário` : e.category==="bebida"||e.category==="exclusao"?`Registrado em: ${fmt(e.completed_at)} (Acre)` :`${e.category} · previsto: ${fmt(e.scheduled_at)} · registrado: ${fmt(e.completed_at)} (Acre)`}</p></article>)}{!events.length&&!problem&&<p className="text-sm text-muted-foreground">Ainda não há confirmações registradas.</p>}</div></section>;
}