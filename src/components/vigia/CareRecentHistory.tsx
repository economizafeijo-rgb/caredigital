import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, History, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Category="hidratacao"|"refeicao"|"medicacao";
type RecordRow={id:string;title:string;category:Category;scheduled_at:string;completed_at:string|null};
type Props={patientId:string;ownerId:string;category:Category|"todos";onClose?:()=>void};
const labels:Record<Category,string>={hidratacao:"Hidratação",refeicao:"Alimentação",medicacao:"Medicação"};
const dateTime=(value:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Rio_Branco",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
export function CareRecentHistory({patientId,ownerId,category,onClose}:Props){
 const [rows,setRows]=useState<RecordRow[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [showAll,setShowAll]=useState(false);
 useEffect(()=>{
  let active=true;setLoading(true);setError("");setRows([]);setShowAll(false);
  const from=new Date(Date.now()-14*86400000).toISOString();
  let q=(supabase as any).from("care_daily_checklist")
   .select("id,title,category,scheduled_at,completed_at")
   .eq("patient_id",patientId).eq("owner_id",ownerId)
   .not("completed_at","is",null).gte("completed_at",from)
   .order("completed_at",{ascending:false}).limit(80);
  if(category!=="todos")q=q.eq("category",category);
  void q.then((result:any)=>{if(!active)return;setLoading(false);
   if(result.error)setError("Não foi possível carregar os registros confirmados.");
   else setRows((result.data??[]).filter((r:RecordRow)=>["hidratacao","refeicao","medicacao"].includes(r.category)));
  });
  return()=>{active=false};
 },[patientId,ownerId,category]);
 const displayed=showAll?rows:rows.slice(0,5);
 return <section className="care-history-panel" aria-label={"Histórico recente de "+(category==="todos"?"cuidados":labels[category])}>
  <header className="care-history-head"><div><span className="care-history-eyebrow"><History size={14}/> HISTÓRICO CONFIRMADO</span><h4>{category==="todos"?"Últimos cuidados realizados":labels[category]+" · últimos registros"}</h4><p>Confirmações dos últimos 14 dias, registradas no prontuário.</p></div>
  {onClose&&<button type="button" className="care-history-close" onClick={onClose} aria-label="Fechar histórico"><X size={17}/></button>}</header>
  {loading?<p className="care-history-empty">Consultando registros…</p>:error?<p role="alert" className="care-history-empty">{error}</p>:rows.length===0?<p className="care-history-empty">Nenhuma confirmação encontrada neste período. Outros registros podem estar disponíveis no prontuário completo.</p>:
  <><div className="care-history-list">{displayed.map(row=><div className="care-history-entry" key={row.id}>
   <span className="care-history-entry-icon"><CheckCircle2 size={17}/></span>
   <div className="care-history-entry-copy"><strong>{row.title}</strong><span>{labels[row.category]} · confirmado</span></div>
   <time dateTime={row.completed_at!}><Clock3 size={12}/>{dateTime(row.completed_at!)}</time>
  </div>)}</div>
  {rows.length>5&&<button type="button" className="care-history-more" onClick={()=>setShowAll(v=>!v)}>{showAll?"Mostrar menos":`Ver mais ${rows.length-5} confirmações`}</button>}</>}
  <p className="care-history-footnote">Este painel mostra apenas cuidados confirmados da agenda. Consumos avulsos e outros eventos permanecem no histórico completo do cliente.</p>
 </section>;
}
