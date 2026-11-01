import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, Info, Pill, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Dose = { id: string; patient_id: string; title: string; category: string; scheduled_at: string; completed_at: string | null };
type Props = { patientId: string; ownerId: string; revision: number; onConfirm: (task: Dose) => void };
const zone = "America/Rio_Branco";
const dateKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, year:"numeric",month:"2-digit",day:"2-digit" }).format(new Date(iso));
const timeText = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: zone,hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false }).format(new Date(iso));
const dayLabel = (iso:string) => new Intl.DateTimeFormat("pt-BR",{timeZone:zone,day:"2-digit",month:"short"}).format(new Date(iso));
const reportedPatientId = "28da9bb3-0049-4206-b1cd-e93008b87786";

export function CompactTreatmentBlister({patientId,ownerId,revision,onConfirm}:Props) {
 const [doses,setDoses]=useState<Dose[]>([]);
 const [selected,setSelected]=useState(0);
 const [activePill,setActivePill]=useState<{index:number;period:"morning"|"night";slot:number}|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{let active=true;setLoading(true);
   void (async()=>{
     const result=await (supabase as any).from("care_daily_checklist")
       .select("id,patient_id,title,category,scheduled_at,completed_at")
       .eq("owner_id",ownerId).eq("patient_id",patientId).eq("category","medicacao")
       .gte("scheduled_at","2026-10-31T00:00:00-05:00").lt("scheduled_at","2026-12-05T00:00:00-05:00")
       .order("scheduled_at",{ascending:true}).limit(80);
     if(!active)return;
     setError(result.error?"Não foi possível carregar os registros de medicação.":"");
     setDoses(result.data??[]);setLoading(false);
   })();
   return ()=>{active=false};
 },[patientId,ownerId,revision]);
 const days=useMemo(()=>Array.from({length:35},(_,index)=>{
   const iso=new Date(Date.parse("2026-10-31T12:00:00Z")+index*86400000).toISOString();
   return {index,iso,first:index<7,tasks:doses.filter(d=>dateKey(d.scheduled_at)===dateKey(iso))};
 }),[doses]);
 const day=days[selected];
 const first=day.first;
 const morning=day.tasks.find(t=>timeText(t.scheduled_at).startsWith("07:"))??day.tasks[0];
 const evening=first?(day.tasks.find(t=>timeText(t.scheduled_at).startsWith("19:"))??day.tasks[1]):undefined;
 const firstReport=selected===0&&patientId===reportedPatientId;
 const verified=days.reduce((total,d)=>total+d.tasks.filter(t=>t.completed_at).length*(d.first?4:1),0);
 const currentDate=dateKey(new Date().toISOString());
 const getTask=(period:"morning"|"night")=>period==="morning"?morning:evening;
 const info=activePill?days[activePill.index]:null;
 const infoTask=info?.tasks.find(t=>timeText(t.scheduled_at).startsWith(activePill?.period==="morning"?"07:":"19:"))??info?.tasks[activePill?.period==="morning"?0:1];
 const isReported=Boolean(activePill?.index===0&&patientId===reportedPatientId);
 const reportTime=activePill?.period==="morning"?"10:00":"19:00";
 return <section aria-label="Cartelas interativas" className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
  <div className="flex flex-wrap items-center justify-between gap-2">
   <div><h3 className="flex items-center gap-2 text-sm font-bold text-foreground"><Pill size={17} className="text-primary"/> Cartela interativa</h3><p className="text-[11px] text-muted-foreground">Toque em uma unidade para ver o registro.</p></div>
   <div className="text-right"><span className="text-lg font-extrabold tabular-nums text-foreground">{verified}/84</span><p className="text-[10px] text-muted-foreground">confirmadas no sistema</p></div>
  </div>
  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-success transition-all" style={{width:`${verified/84*100}%`}}/></div>
  <div className="mt-3 flex items-center justify-between gap-2">
    <button type="button" disabled={selected===0} onClick={()=>setSelected(x=>Math.max(0,x-1))} className="rounded-lg border border-border p-1.5 text-foreground disabled:opacity-30" aria-label="Cartela anterior"><ArrowLeft size={16}/></button>
    <div className="min-w-0 text-center"><p className="text-sm font-bold text-foreground">{first?`Cartela ${selected+1} de 7`:`Lansoprazol · semana ${Math.floor((selected-7)/7)+1} de 4`}</p><p className="text-[11px] text-muted-foreground">{dayLabel(day.iso)} · Dia {selected+1} de 35 · {first?"4 manhã + 4 noite":"1 cápsula diária"}</p></div>
    <button type="button" disabled={selected===34} onClick={()=>setSelected(x=>Math.min(34,x+1))} className="rounded-lg border border-border p-1.5 text-foreground disabled:opacity-30" aria-label="Próxima cartela"><ArrowRight size={16}/></button>
  </div>
  {loading?<p className="mt-5 text-center text-sm text-muted-foreground">Carregando tratamento…</p>:<>
   <div className="mx-auto mt-2 w-full max-w-[205px]">
     <div className={`relative mx-auto overflow-hidden rounded-xl ${first?"aspect-[480/440]":"aspect-[580/430]"}`}>
       <img className="absolute inset-0 h-full w-full object-contain" src={first?"/images/cartela-combinada-8.svg":"/images/cartela-lansoprazol-7.svg"} alt={first?"Cartela ilustrativa de oito unidades organizadas por manhã e noite":"Cartela ilustrativa de sete cápsulas"}/>
       {first?Array.from({length:8},(_,i)=>{
         const period=i<4?"morning":"night";
         const task=getTask(period);
         const reported=firstReport;
         const done=Boolean(task?.completed_at);
         const row=i%4;
         return <button key={i} type="button" onClick={()=>setActivePill({index:selected,period,slot:row+1})}
           aria-label={`Ver unidade ${row+1} ${period==="morning"?"da manhã":"da noite"}`}
           className={`absolute flex items-center justify-center rounded-full border-0 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${done?"bg-emerald-500/20 text-white":reported?"bg-amber-500/15 text-white":"bg-transparent hover:bg-sky-300/15"}`}
           style={{left:period==="morning"?"10.8333%":"56.25%",top:`${(30+row*91)/440*100}%`,width:"35.8333%",height:"14.7727%"}}>
           {(done||reported)&&<Check size={17} strokeWidth={3}/>}
         </button>;
       }):Array.from({length:7},(_,i)=>{
         const task=day.tasks[0];
         return <button key={i} type="button" onClick={()=>setActivePill({index:selected,period:"morning",slot:i+1})} aria-label={`Detalhes da cápsula ${i+1}`} className={`absolute rounded-full border ${task?.completed_at?"border-success bg-success/25":"border-sky-400/40 hover:bg-sky-400/15"}`} style={{width:"30%",height:"21%",left:`${10+(i%2)*46}%`,top:`${7+Math.floor(i/2)*23}%`}}>{task?.completed_at&&<Check size={15} className="mx-auto text-success"/>}</button>;
       })}
     </div>
   </div>
   <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-muted-foreground"><span><i className="mr-1 inline-block size-2 rounded-full bg-success"/>Confirmado</span><span><i className="mr-1 inline-block size-2 rounded-full bg-amber-400"/>Relatado</span><span><i className="mr-1 inline-block size-2 rounded-full border border-border"/>Pendente</span></div>
   {firstReport&&<p className="mt-2 rounded-lg border border-amber-300/40 bg-amber-50 px-2 py-1.5 text-center text-[11px] text-amber-900 dark:bg-amber-950/25 dark:text-amber-100">31/10 · 8 unidades relatadas: manhã 10h, noite 19h</p>}
   {error&&<p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
  </>}
  <div className="mt-2 flex gap-1 overflow-x-auto pb-1" aria-label="Selecionar cartela">
    {Array.from({length:7},(_,i)=><button type="button" key={i} onClick={()=>setSelected(i)} aria-current={selected===i?"true":undefined} className={`min-w-8 rounded-lg border px-2 py-1 text-[11px] font-semibold ${selected===i?"border-primary bg-primary/15 text-primary":"border-border text-muted-foreground"}`}>{i+1}</button>)}
    <span className="my-auto whitespace-nowrap px-1 text-[10px] text-muted-foreground">Continuidade</span>
    {Array.from({length:4},(_,i)=><button type="button" key={i+7} onClick={()=>setSelected(7+i*7)} className={`min-w-9 rounded-lg border px-2 py-1 text-[11px] ${selected>=7+i*7&&selected<14+i*7?"border-primary bg-primary/15 text-primary":"border-border text-muted-foreground"}`}>S{i+1}</button>)}
  </div>
  {activePill&&<div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm" onMouseDown={e=>{if(e.target===e.currentTarget)setActivePill(null)}}>
    <section role="dialog" aria-modal="true" aria-label="Detalhes da medicação" className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl">
      <div className="flex items-center justify-between gap-3"><h4 className="flex items-center gap-2 text-base font-bold"><Info size={18} className="text-primary"/> Detalhes da unidade</h4><button aria-label="Fechar" onClick={()=>setActivePill(null)} className="rounded-lg border border-border p-1.5"><X size={17}/></button></div>
      <p className="mt-2 text-xs text-muted-foreground">{info?.first?`Cartela ${activePill.index+1}`:"Continuidade"} · unidade {activePill.slot} · {activePill.period==="morning"?"manhã":"noite"}</p>
      <div className="mt-3 rounded-xl bg-muted p-3"><div className="flex items-center gap-2 text-sm font-semibold"><Clock3 size={16}/> Horário programado</div><p className="mt-1 text-sm">{infoTask?timeText(infoTask.scheduled_at):"Nenhum horário cadastrado"}</p></div>
      {isReported&&<div className="mt-3 rounded-xl border border-amber-300/40 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/25 dark:text-amber-100"><strong>Relato do paciente — 31/10:</strong> quatro comprimidos às {reportTime}.{activePill.period==="morning"?" Tomados em jejum após acordar tarde; 3h depois do previsto.":" No horário previsto."}<p className="mt-1 text-xs">Relato não equivale à confirmação auditada no banco.</p></div>}
      <p className="mt-3 text-sm">{infoTask?.completed_at?`Confirmação do sistema: ${timeText(infoTask.completed_at)}.`:"Ainda sem confirmação persistida para esta tomada."}</p>
      <p className="mt-2 text-xs text-muted-foreground">A confirmação registra a tomada conjunta de quatro unidades na primeira etapa, não comprimidos individualmente.</p>
      <div className="mt-4 flex gap-2"><button type="button" className="flex-1 rounded-xl border border-border p-2.5 text-sm" onClick={()=>setActivePill(null)}>Fechar</button>{infoTask&&!infoTask.completed_at&&dateKey(infoTask.scheduled_at)===currentDate&&<button type="button" className="flex-1 rounded-xl bg-primary p-2.5 text-sm font-semibold text-primary-foreground" onClick={()=>{setActivePill(null);onConfirm(infoTask)}}>Confirmar agora</button>}</div>
    </section>
   </div>}
 </section>;
}
