import {useEffect,useState} from "react";
import {supabase} from "@/integrations/supabase/client";
type Event={id:string;category:string;title:string;scheduled_at:string;completed_at:string};
const fmt=(x:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Rio_Branco",dateStyle:"short",timeStyle:"medium"}).format(new Date(x));
export function PatientActivityHistory({patientId,ownerId,revision}:{patientId:string;ownerId:string;revision:number}){
 const [events,setEvents]=useState<Event[]>([]);
 const [problem,setProblem]=useState("");
 useEffect(()=>{let live=true;(async()=>{
  const result=await (supabase as any).from("care_daily_checklist").select("id,category,title,scheduled_at,completed_at").eq("patient_id",patientId).eq("owner_id",ownerId).not("completed_at","is",null).order("completed_at",{ascending:false}).limit(300);
  if(!live)return;if(result.error)setProblem("Não foi possível consultar o histórico.");else{setEvents(result.data??[]);setProblem("");}
 })();return()=>{live=false};},[patientId,ownerId,revision]);
 return <section className="mt-6 rounded-2xl border border-border bg-card p-5"><h4 className="text-lg font-bold">Histórico de confirmações</h4><p className="mt-1 text-xs text-muted-foreground">O horário mostrado é o da confirmação salva, não necessariamente o horário real da ingestão.</p>{problem&&<p role="alert">{problem}</p>}<div className="mt-4 max-h-96 space-y-2 overflow-y-auto">{events.map(e=><article key={e.id} className="rounded-xl border border-border bg-background p-3"><p className="text-sm font-semibold">{e.title}</p><p className="mt-1 text-xs text-muted-foreground">{e.category} · previsto: {fmt(e.scheduled_at)} · registrado: {fmt(e.completed_at)}</p></article>)}{!events.length&&!problem&&<p className="text-sm text-muted-foreground">Ainda não há confirmações registradas.</p>}</div></section>;
}