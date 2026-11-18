import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, History, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Category="hidratacao"|"refeicao"|"medicacao"|"resumo";
type RecordRow={id:string;title:string;category:Category;at:string;detail:string;kind:"task"|"water"|"beverage"|"meal"|"reconstructed"};
type Props={patientId:string;ownerId:string;category:Category|"todos";onClose?:()=>void;compact?:boolean};
const labels:Record<Category,string>={hidratacao:"Hidratação",refeicao:"Alimentação",medicacao:"Medicação",resumo:"Resumo histórico"};
const dateTime=(value:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Rio_Branco",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
export function CareRecentHistory({patientId,ownerId,category,onClose,compact=false}:Props){
 const [rows,setRows]=useState<RecordRow[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [showAll,setShowAll]=useState(false);
 useEffect(()=>{setShowAll(false)},[category,patientId]);
 useEffect(()=>{
  let active=true;setError("");
  const from=new Date(Date.now()-14*86400000).toISOString();
  let q=(supabase as any).from("care_daily_checklist")
   .select("id,title,category,scheduled_at,completed_at")
   .eq("patient_id",patientId).eq("owner_id",ownerId)
   .not("completed_at","is",null).gte("completed_at",from)
   .order("completed_at",{ascending:false}).limit(80);
  if(category!=="todos")q=q.eq("category",category);
  const water=(supabase as any).from("care_hydration").select("id,task_id,amount_ml,recorded_at")
   .eq("patient_id",patientId).eq("owner_id",ownerId).gte("recorded_at",from).order("recorded_at",{ascending:false}).limit(80);
  const beverages=(supabase as any).from("care_client_beverages").select("id,kind,name,amount_ml,consumed_at")
   .eq("patient_id",patientId).eq("owner_id",ownerId).gte("consumed_at",from).order("consumed_at",{ascending:false}).limit(80);
  const meals=(supabase as any).from("care_activity_log").select("id,recorded_at,details")
   .eq("patient_id",patientId).eq("owner_id",ownerId).eq("source","client_unscheduled_intake")
   .eq("event_type","logged").eq("category","refeicao").is("task_id",null)
   .gte("recorded_at",from).order("recorded_at",{ascending:false}).limit(80);
  const reconstructed=(supabase as any).from("care_activity_log")
   .select("id,category,event_type,details,happened_at,scheduled_at,recorded_at")
   .eq("patient_id",patientId).eq("owner_id",ownerId).eq("source","historical_reconstruction")
   .gte("recorded_at",from).order("recorded_at",{ascending:false}).limit(100);
  void Promise.all([q,category==="medicacao"?Promise.resolve({data:[],error:null}):water,
    category==="medicacao"?Promise.resolve({data:[],error:null}):beverages,
    category==="hidratacao"||category==="medicacao"?Promise.resolve({data:[],error:null}):meals,
    reconstructed])
   .then(([tasksResult,waterResult,beverageResult,mealResult,reconstructedResult]:any[])=>{
    if(!active)return;
    setLoading(false);
    const failed=[tasksResult,waterResult,beverageResult,mealResult,reconstructedResult].filter(result=>result.error);
    if(failed.length)setError("Algumas fontes não puderam ser consultadas. Os registros abaixo podem estar incompletos.");
    const confirmed=(tasksResult.data??[]).filter((r:any)=>["hidratacao","refeicao","medicacao"].includes(r.category));
    const taskIds=new Set(confirmed.map((r:any)=>r.id));
    const all:RecordRow[]=[
     ...confirmed.map((r:any)=>({id:"task:"+r.id,title:r.title,category:r.category,at:r.completed_at,detail:"Cuidado confirmado",kind:"task" as const})),
     ...(waterResult.data??[]).filter((r:any)=>!r.task_id||!taskIds.has(r.task_id)).map((r:any)=>({
      id:"water:"+r.id,title:`Água · ${Number(r.amount_ml).toLocaleString("pt-BR")} ml`,
      category:"hidratacao" as const,at:r.recorded_at,detail:"Consumo registrado",kind:"water" as const
     })),
     ...(beverageResult.data??[]).map((r:any)=>({
      id:"beverage:"+r.id,title:`${r.name||r.kind||"Bebida"} · ${Number(r.amount_ml).toLocaleString("pt-BR")} ml`,
      category:"hidratacao" as const,at:r.consumed_at,detail:"Bebida registrada",kind:"beverage" as const
     })),
     ...(mealResult.data??[]).filter((r:any)=>!r.details?.superseded).map((r:any)=>({
      id:"meal:"+r.id,title:r.details?.title||r.details?.description||"Refeição registrada",
      category:"refeicao" as const,at:r.recorded_at,detail:"Consumo avulso",kind:"meal" as const
     })),
     ...(reconstructedResult.data??[]).map((r:any)=>{
      const d=r.details??{};
      const evidence=String(d.evidence??"");
      const date=evidence.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      const time=String(d.local_time??"12:00");
      const reconstructedAt=r.happened_at??(date?date[3]+"-"+date[2]+"-"+date[1]+"T"+time+":00-05:00":r.scheduled_at??r.recorded_at);
      const category:Category=r.category==="hidratacao"?"hidratacao":r.category==="refeicao"?"refeicao":r.category==="resumo_diario"?"resumo":"medicacao";
      const titleByType:Record<string,string>={snapshot_dashboard:"Resumo do painel",snapshot_metas:"Resumo das metas",snapshot_tratamento:"Resumo do tratamento",conferencia_confirmada:"Conferência de medicamento",refeicao_confirmada:"Refeição reconstruída",lanche_extra_registrado:"Lanche extra reconstruído",cuidado_programado:"Cuidado programado na captura",medicacao_programada:"Medicação programada na captura",refeicao_programada:"Refeição programada na captura",nao_bebi:"Não bebi água"};
      const detailByType:Record<string,string>={
       snapshot_dashboard:[d.hydration_display,d.hydration_ml!=null?String(d.hydration_ml)+" ml de água":"",d.meals_confirmed?String(d.meals_confirmed)+" refeições":"",d.care_items_completed?String(d.care_items_completed)+" cuidados":"",d.medication_doses_confirmed?String(d.medication_doses_confirmed)+" doses":"",d.completion_percent!=null?String(d.completion_percent)+"% de conclusão":""].filter(Boolean).join(" · "),
       snapshot_metas:[d.nutrition_kcal!=null?String(d.nutrition_kcal)+" kcal":"",d.protein_g!=null?String(d.protein_g)+" g de proteína":"",d.hydration_ml!=null?String(d.hydration_ml)+" ml de água":""].filter(Boolean).join(" · "),
       snapshot_tratamento:[d.blister,d.progress,d.morning_dose,d.night_dose].filter(Boolean).join(" · "),
       refeicao_confirmada:[d.meal,Array.isArray(d.items)?d.items.join(", "):""].filter(Boolean).join(": "),
       lanche_extra_registrado:[d.meal,Array.isArray(d.items)?d.items.join(", "):"",d.quantity].filter(Boolean).join(" · "),
      };
      const detail=[detailByType[r.event_type]||d.description||"Registro recuperado de captura histórica",evidence,
       d.status==="programado_na_captura"?"Programado na captura; execução não confirmada":"Registro reconstruído, não é um novo consumo"].filter(Boolean).join(" · ");
      const title=(r.event_type==="refeicao_programada"||r.event_type==="nao_bebi")?(d.description||titleByType[r.event_type]):(titleByType[r.event_type]||d.description||"Registro histórico recuperado");
      return {id:"reconstructed:"+r.id,title,category,at:reconstructedAt,detail,kind:"reconstructed" as const};
     })
    ];
    setRows(all.filter(r=>category==="todos"||r.category===category)
     .sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,120));
   }).catch(()=>{if(active){setLoading(false);setError("Não foi possível consultar o histórico.");}});

  return()=>{active=false};
 },[patientId,ownerId,category]);
 const displayed=showAll?rows:rows.slice(0,5);
 return <section className={compact?"care-history-panel care-history-compact":"care-history-panel"} aria-label={"Histórico recente de "+(category==="todos"?"cuidados":labels[category])}>
  <header className="care-history-head"><div><span className="care-history-eyebrow"><History size={14}/> HISTÓRICO CONFIRMADO</span>{!compact&&<h4>{category==="todos"?"Últimos cuidados realizados":labels[category]+" · últimos registros"}</h4>}<p>Cuidados confirmados e consumos registrados nos últimos 14 dias.</p></div>
  {onClose&&<button type="button" className="care-history-close" onClick={onClose} aria-label="Fechar histórico"><X size={17}/></button>}</header>
  {loading?<p className="care-history-empty">Consultando registros…</p>:error&&rows.length===0?<p role="alert" className="care-history-empty">{error}</p>:rows.length===0?<p className="care-history-empty">Nenhum registro encontrado neste período. Outros eventos podem estar disponíveis no prontuário completo.</p>:
  <>{error&&<p role="alert" className="care-history-empty">{error}</p>}<div className="care-history-list">{displayed.map(row=><div className="care-history-entry" key={row.id}>
   <span className="care-history-entry-icon"><CheckCircle2 size={17}/></span>
   <div className="care-history-entry-copy"><strong>{row.title}</strong><span>{labels[row.category]} · {row.detail}</span></div>
   <time dateTime={row.at}><Clock3 size={12}/>{dateTime(row.at)}</time>
  </div>)}</div>
  {rows.length>5&&<button type="button" className="care-history-more" onClick={()=>setShowAll(v=>!v)}>{showAll?"Mostrar menos":`Ver mais ${rows.length-5} registros`}</button>}</>}
  {!compact&&<p className="care-history-footnote">Registros provenientes da agenda, hidratação, bebidas e refeições avulsas. Consulte o prontuário completo para detalhes adicionais.</p>}
 </section>;
}
