import { useEffect, useMemo, useState } from "react";
import { Check, Clock3, Pill, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Dose = { id:string; patient_id:string; title:string; category:string; scheduled_at:string; completed_at:string|null };
const tz = "America/Rio_Branco";
const dateKey = (value:string) => new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value));
const time = (value:string) => new Intl.DateTimeFormat("pt-BR",{timeZone:tz,hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date(value));
const date = (value:string) => new Intl.DateTimeFormat("pt-BR",{timeZone:tz,day:"2-digit",month:"short"}).format(new Date(value));
const deltaMinutes = (scheduled:string,actual:string) => Math.round((new Date(actual).getTime()-new Date(scheduled).getTime())/60000);
const timing = (scheduled:string,actual:string) => { const diff=deltaMinutes(scheduled,actual); return Math.abs(diff)<=15 ? "No horário (±15 min)" : diff>0 ? `Atraso de ${diff} min` : `Antecipada em ${-diff} min`; };
const plannedStart="2026-10-31T00:00:00-05:00";
const plannedEnd="2026-11-14T00:00:00-05:00";

export function MedicationBlisterCalendar({patientId,ownerId,revision,onConfirm}:{patientId:string;ownerId:string;revision:number;onConfirm:(dose:Dose)=>void}) {
 const [doses,setDoses]=useState<Dose[]>([]);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [selectedDay,setSelectedDay]=useState<string|null>(null);
 useEffect(()=>{let active=true;setLoading(true);
  (async()=>{
   const {data,error:dbError}=await (supabase as any).from("care_daily_checklist")
    .select("id,patient_id,title,category,scheduled_at,completed_at")
    .eq("owner_id",ownerId).eq("patient_id",patientId).eq("category","medicacao")
    .gte("scheduled_at",plannedStart).lt("scheduled_at",plannedEnd).order("scheduled_at",{ascending:true}).limit(60);
   if(!active)return;
   if(dbError){setError("Não foi possível carregar as tomadas do tratamento.");setDoses([]);}
   else {setError("");setDoses(data??[]);}
   setLoading(false);
  })();
  return()=>{active=false};
 },[patientId,ownerId,revision]);
 const days=useMemo(()=>Array.from({length:14},(_,index)=>{
  const iso=new Date(Date.parse(plannedStart)+index*86400000).toISOString();
  const key=dateKey(iso);
  return {key,iso,tasks:doses.filter(t=>dateKey(t.scheduled_at)===key)};
 }),[doses]);
 const done=doses.filter(t=>t.completed_at).length;
 const today=dateKey(new Date().toISOString());
 const day = days.find(d=>d.key===(selectedDay??today))??days[0];
 return <section aria-label="Cartelas e tomadas por dia" className="mb-5 rounded-2xl border border-[#c6dbe6] bg-[#f7fafc] p-4 sm:p-5">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[#1b5876]"><Pill size={19}/><h4 className="text-lg font-bold">Cartela visual do tratamento</h4></div><p className="mt-1 text-xs text-muted-foreground">14 dias · cada cápsula representa uma tomada agendada, não a quantidade física de comprimidos.</p></div><span className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#205978]">{done} / {doses.length} tomadas confirmadas</span></div>
  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#d9e7ed]"><div className="h-full rounded-full bg-[#29856f] transition-all" style={{width:`${doses.length?100*done/doses.length:0}%`}}/></div>
  {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  {loading ? <p className="mt-4 text-sm">Carregando programação…</p> :
   <><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{days.map((d,i)=><button type="button" key={d.key} onClick={()=>setSelectedDay(d.key)} aria-pressed={day.key===d.key} className={`min-h-28 rounded-xl border p-3 text-left transition-all ${day.key===d.key?"border-[#256986] bg-[#e6f3f7] ring-2 ring-[#a4ccdb]":"border-[#d6e5ec] bg-white hover:border-[#9bc3d4]"}`}>
    <div className="flex items-center justify-between text-xs font-semibold text-[#3d6379]"><span>Dia {i+1}</span><span>{date(d.iso)}</span></div>
    <div className="mt-3 flex flex-wrap gap-1.5">{d.tasks.length ? d.tasks.map(t=><span key={t.id} title={t.completed_at?`Tomada em ${time(t.completed_at)} — ${timing(t.scheduled_at,t.completed_at)}`:`Pendente: ${time(t.scheduled_at)}`} className={`flex h-7 w-12 items-center justify-center rounded-full border text-xs font-bold ${t.completed_at?"border-[#16826b] bg-[#d5f4e8] text-[#176d59]":"border-[#b9ceda] bg-[#f1f5f8] text-[#496b7f]"}`}>{t.completed_at?<Check size={17}/>:time(t.scheduled_at).slice(0,5)}</span>):<span className="text-xs text-muted-foreground">Sem registros</span>}</div>
    <div className="mt-3 text-[11px] text-[#557084]">{d.tasks.filter(t=>t.completed_at).length}/{d.tasks.length} confirmadas</div>
   </button>)}</div>
   <div className="mt-4 rounded-xl border border-[#d0e2e9] bg-white p-4"><h5 className="font-bold text-[#173b52]">Dia {days.findIndex(d=>d.key===day.key)+1} · {date(day.iso)}</h5>
    {day.tasks.length===0?<p className="mt-2 text-sm text-muted-foreground">Nenhuma tomada cadastrada neste dia.</p>:<div className="mt-3 grid gap-2 sm:grid-cols-2">{day.tasks.map(t=>{
      const diff=deltaMinutes(t.scheduled_at,new Date().toISOString());
      return <button key={t.id} type="button" disabled={Boolean(t.completed_at)} onClick={()=>onConfirm(t)} className={`rounded-xl border p-3 text-left ${t.completed_at?"border-[#b1dfd0] bg-[#edf9f3]":"border-[#c8dce5] bg-[#f5f9fb] hover:border-[#317e9b]"}`}>
      <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm font-semibold"><Pill size={16}/>{time(t.scheduled_at).slice(0,5)}</span>{t.completed_at?<Check size={18} className="text-[#167b65]"/>:<Clock3 size={17} className="text-[#446d83]"/>}</div>
      <p className="mt-2 text-sm">{t.title}</p>
      {t.completed_at?<p className="mt-2 text-xs text-[#176d59]">Registrada em {date(t.completed_at)} às {time(t.completed_at)} · {timing(t.scheduled_at,t.completed_at)}</p>:<p className="mt-2 flex items-center gap-1 text-xs text-[#537083]">{Math.abs(diff)>15&&<AlertTriangle size={13}/>} {diff>15?`Horário passou há ${diff} min. Clique somente se tomou agora.`:diff < -15?"Tomada antecipada: confirme apenas se tomou agora.":"Toque para confirmar a tomada real"}</p>}
      </button>})}</div>}
   </div>
   <p className="mt-3 text-xs text-muted-foreground">O registro salva a data e a hora efetiva da confirmação no servidor. Se a medicação foi tomada anteriormente, não confirme como “agora”: solicite ajuste do registro ao responsável. Tomar fora do horário não significa que deva dobrar ou compensar dose; consulte a prescrição.</p>
   </>}
 </section>;
}
