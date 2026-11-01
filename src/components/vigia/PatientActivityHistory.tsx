import {useEffect,useState} from "react";
import {supabase} from "@/integrations/supabase/client";
type Event={id:string;category:string;title:string;scheduled_at:string;completed_at:string};
const fmt=(x:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Rio_Branco",dateStyle:"short",timeStyle:"medium"}).format(new Date(x));
export function PatientActivityHistory({patientId,ownerId,revision}:{patientId:string;ownerId:string;revision:number}){
 const [events,setEvents]=useState<Event[]>([]);
 const [problem,setProblem]=useState("");
 useEffect(()=>{let live=true;(async()=>{
  const db=supabase as any;
  const [result, hydration, observations, audit]=await Promise.all([
    db.from("care_daily_checklist").select("id,category,title,scheduled_at,completed_at").eq("patient_id",patientId).eq("owner_id",ownerId).not("completed_at","is",null).order("completed_at",{ascending:false}).limit(300),
    db.from("care_hydration").select("id,amount_ml,recorded_at").eq("patient_id",patientId).eq("owner_id",ownerId).order("recorded_at",{ascending:false}).limit(150),
    db.from("care_observations").select("id,observation_type,notes,recorded_at").eq("patient_id",patientId).eq("owner_id",ownerId).order("recorded_at",{ascending:false}).limit(150),
    db.from("care_activity_log").select("id,category,event_type,source,details,happened_at,recorded_at").eq("patient_id",patientId).eq("owner_id",ownerId).order("recorded_at",{ascending:false}).limit(150)
  ]);
  if(!live)return;
  if(result.error){setProblem("Não foi possível consultar o histórico.");return;}
  const all:Event[]=[...(result.data??[])];
  if(!hydration.error)(hydration.data??[]).forEach((h:any)=>all.push({id:"agua-"+h.id,category:"hidratacao",title:"Água · "+h.amount_ml+" ml",scheduled_at:h.recorded_at,completed_at:h.recorded_at}));
  if(!observations.error)(observations.data??[]).forEach((o:any)=>all.push({id:"observacao-"+o.id,category:o.observation_type,title:o.notes||"Observação registrada",scheduled_at:o.recorded_at,completed_at:o.recorded_at}));
  if(!audit.error)(audit.data??[]).filter((e:any)=>e.event_type!=="confirmed").forEach((e:any)=>all.push({id:"log-"+e.id,category:e.category,title:e.event_type==="patient_report"?"Relato do paciente — "+(e.details?.period==="morning"?"manhã fora do horário":e.details?.period==="night"?"noite às 19h":"horário informado"):"Ocorrência registrada",scheduled_at:e.happened_at||e.recorded_at,completed_at:e.recorded_at}));
  all.sort((x,y)=>Date.parse(y.completed_at)-Date.parse(x.completed_at));
  setEvents(all);setProblem("");
 })();return()=>{live=false};},[patientId,ownerId,revision]);
 return <section className="mt-6 rounded-2xl border border-border bg-card p-5"><h4 className="text-lg font-bold">Histórico do paciente</h4><p className="mt-1 text-xs text-muted-foreground">Registros de cuidados, hidratação, observações e ocorrências. O horário de confirmação é diferente do horário relatado da ingestão.</p>{problem&&<p role="alert">{problem}</p>}<div className="mt-4 max-h-96 space-y-2 overflow-y-auto">{events.map(e=><article key={e.id} className="rounded-xl border border-border bg-background p-3"><p className="text-sm font-semibold">{e.title}</p><p className="mt-1 text-xs text-muted-foreground">{e.category} · previsto: {fmt(e.scheduled_at)} · registrado: {fmt(e.completed_at)}</p></article>)}{!events.length&&!problem&&<p className="text-sm text-muted-foreground">Ainda não há confirmações registradas.</p>}</div></section>;
}