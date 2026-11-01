import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Clock3, Pill } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Dose = { id:string; patient_id:string; title:string; category:string; scheduled_at:string; completed_at:string|null };
const tz = "America/Rio_Branco";
const formatDay = (iso:string) => new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(iso));
const formatTime = (iso:string) => new Intl.DateTimeFormat("pt-BR",{timeZone:tz,hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date(iso));
const formatDate = (iso:string) => new Intl.DateTimeFormat("pt-BR",{timeZone:tz,day:"2-digit",month:"short"}).format(new Date(iso));
const start = Date.parse("2026-10-31T12:00:00Z");
const end = "2026-12-05T00:00:00-05:00";
const delay = (schedule:string,actual:string) => Math.round((Date.parse(actual)-Date.parse(schedule))/60000);
const status = (schedule:string,actual:string) => {
 const diff=delay(schedule,actual);
 return Math.abs(diff)<=15 ? "Dentro da janela de 15 min" : diff>0 ? `Registrada ${diff} min após o horário` : `Registrada ${-diff} min antes do horário`;
};
export function MedicationBlisterCalendar({patientId,ownerId,revision,onConfirm}:{patientId:string;ownerId:string;revision:number;onConfirm:(dose:Dose)=>void}) {
 const [doses,setDoses]=useState<Dose[]>([]);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [selected,setSelected]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);
  void (async()=>{
   const res=await (supabase as any).from("care_daily_checklist")
    .select("id,patient_id,title,category,scheduled_at,completed_at").eq("owner_id",ownerId)
    .eq("patient_id",patientId).eq("category","medicacao")
    .gte("scheduled_at","2026-10-31T00:00:00-05:00").lt("scheduled_at",end)
    .order("scheduled_at",{ascending:true}).limit(80);
   if(!active)return;
   setError(res.error ? "Não foi possível carregar os registros de medicação." : "");
   setDoses(res.data??[]);setLoading(false);
  })();
  return()=>{active=false};
 },[patientId,ownerId,revision]);
 const days=useMemo(()=>Array.from({length:35},(_,i)=>{
  const iso=new Date(start+i*86400000).toISOString();
  const tasks=doses.filter(d=>formatDay(d.scheduled_at)===formatDay(iso));
  const stage1=i<7;
  return {iso,index:i,stage1,tasks,slots:stage1?8:7};
 }),[doses]);
 const completePills=days.reduce((sum,d)=>sum+d.tasks.filter(t=>t.completed_at).length*(d.stage1?4:1),0);
 const phase1Done=days.slice(0,7).reduce((sum,d)=>sum+d.tasks.filter(t=>t.completed_at).length*4,0);
 const phase2Done=days.slice(7).reduce((sum,d)=>sum+d.tasks.filter(t=>t.completed_at).length,0);
 const current=days[selected]??days[0];
 const todayKey=formatDay(new Date().toISOString());
 const groupStatus=(task:Dose|undefined)=>task?.completed_at?"confirmado":"pendente";
 const pillButton=(task:Dose|undefined,label:string,key:number)=> <button key={key} type="button" title={task ? `${label}: ${groupStatus(task)}${formatDay(task.scheduled_at)!==todayKey?" (apenas o dia atual permite confirmar)":""}` : "Sem horário cadastrado"} disabled={!task||Boolean(task.completed_at)||formatDay(task.scheduled_at)!==todayKey} onClick={()=>task&&formatDay(task.scheduled_at)===todayKey&&onConfirm(task)} className={`flex h-9 min-w-0 items-center justify-center rounded-full border transition-colors ${!task?"border-slate-200 bg-slate-100 text-slate-300":task.completed_at?"border-emerald-500 bg-emerald-100 text-emerald-700":"border-sky-300 bg-white text-sky-700 hover:bg-sky-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600"}`} aria-label={`${label}: ${task?.completed_at?"confirmado":task?"confirmar tomada":"sem registro"}`}>{task?.completed_at?<Check size={17}/>:<Pill size={16}/>}</button>;
 return <section className="mb-5 rounded-2xl border border-[#c6dbe6] bg-[#f7fafc] p-4 sm:p-5" aria-label="Cartelas interativas do tratamento">
  <div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="flex items-center gap-2 text-xl font-bold text-[#173b52]"><Pill size={22}/> Cartelas do tratamento</h4><p className="mt-1 text-sm text-muted-foreground">Toque nas cápsulas para confirmar a tomada do horário correspondente.</p></div><span className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-[#176d59]">{completePills} de 84 unidades registradas</span></div>
  <div className="mt-4 grid gap-3 md:grid-cols-2">
   <div className="rounded-xl border border-sky-200 bg-white p-4"><p className="font-bold text-[#173b52]">Etapa 1 · tratamento combinado</p><p className="mt-1 text-xs text-muted-foreground">31/10–06/11 · 7 cartelas × 8 unidades</p><div className="mt-2 text-2xl font-bold text-sky-800">{phase1Done}<span className="text-sm text-muted-foreground"> / 56 comprimidos</span></div><p className="mt-1 text-xs">4 pela manhã + 4 à noite em cada cartela.</p></div>
   <div className="rounded-xl border border-emerald-200 bg-white p-4"><p className="font-bold text-[#173b52]">Etapa 2 · continuidade</p><p className="mt-1 text-xs text-muted-foreground">07/11–04/12 · 4 cartelas × 7 cápsulas</p><div className="mt-2 text-2xl font-bold text-emerald-800">{phase2Done}<span className="text-sm text-muted-foreground"> / 28 cápsulas</span></div><p className="mt-1 text-xs">1 dose diária de lansoprazol conforme prescrição.</p></div>
  </div>
  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-600" style={{width:`${Math.min(100,completePills/84*100)}%`}}/></div>
  {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  {loading?<p className="mt-5 text-sm">Carregando cartelas…</p>: <>
  <h5 className="mt-5 text-sm font-bold text-[#173b52]">Etapa 1 · 7 cartelas, 8 comprimidos por dia</h5>
  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{days.slice(0,7).map(d=>{
   const morning=d.tasks.find(t=>formatTime(t.scheduled_at).slice(0,2)==="07")??d.tasks[0];
   const night=d.tasks.find(t=>formatTime(t.scheduled_at).slice(0,2)==="19")??d.tasks[1];
   return <div key={d.index} className={`rounded-xl border bg-white p-3 ${selected===d.index?"border-sky-600 ring-2 ring-sky-200":"border-slate-200"}`}><button className="mb-2 w-full text-left text-xs font-bold text-[#173b52]" type="button" onClick={()=>setSelected(d.index)}>Cartela {d.index+1} · {formatDate(d.iso)}</button>
    <div className="grid grid-cols-4 gap-1.5">{Array.from({length:4},(_,i)=>pillButton(morning,"Manhã",i))}{Array.from({length:4},(_,i)=>pillButton(night,"Noite",i+4))}</div>
    <div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>4 manhã</span><span>4 noite</span></div></div>;
  })}</div>
  <h5 className="mt-6 text-sm font-bold text-[#173b52]">Etapa 2 · 4 cartelas de 7 cápsulas</h5>
  <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({length:4},(_,week)=>{
   const weekDays=days.slice(7+week*7,14+week*7);
   return <div key={week} className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center gap-2"><img src="/images/cartela-lansoprazol-7.svg" alt="" className="h-12 w-12 object-contain"/><strong className="text-sm">Cartela {week+1}</strong></div><div className="mt-2 grid grid-cols-4 gap-1.5">{weekDays.map(d=>pillButton(d.tasks[0],`Dia ${d.index+1}`,d.index))}</div><p className="mt-2 text-xs text-muted-foreground">{weekDays.filter(d=>d.tasks[0]?.completed_at).length}/7 confirmadas</p></div>;
  })}</div>
  <div className="mt-5 rounded-xl border border-[#d0e2e9] bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h5 className="font-bold text-[#173b52]">Detalhes · dia {current.index+1} — {formatDate(current.iso)}</h5><select className="rounded-lg border p-2 text-xs" aria-label="Escolher dia" value={selected} onChange={e=>setSelected(Number(e.target.value))}>{days.map(d=><option key={d.index} value={d.index}>Dia {d.index+1} · {formatDate(d.iso)}</option>)}</select></div>
   {current.tasks.length===0?<p className="mt-3 text-sm text-amber-700">Sem horários cadastrados para este dia.</p>:<div className="mt-3 grid gap-2 sm:grid-cols-2">{current.tasks.map(t=><button key={t.id} disabled={Boolean(t.completed_at)||formatDay(t.scheduled_at)!==todayKey} type="button" onClick={()=>formatDay(t.scheduled_at)===todayKey&&onConfirm(t)} className={`rounded-xl border p-3 text-left text-sm ${t.completed_at?"border-emerald-300 bg-emerald-50":"border-sky-200 bg-sky-50 hover:bg-sky-100"}`}><span className="font-bold">{formatTime(t.scheduled_at).slice(0,5)} · {current.stage1?"4 comprimidos":"1 cápsula"}</span><p className="mt-1">{t.title}</p>{t.completed_at?<p className="mt-2 text-xs text-emerald-700">Confirmado em {formatDate(t.completed_at)} às {formatTime(t.completed_at)} · {status(t.scheduled_at,t.completed_at)}</p>:<p className="mt-2 flex gap-1 text-xs text-[#426c80]"><Clock3 size={14}/> {formatDay(t.scheduled_at)===todayKey?"Toque para confirmar agora":"Consulta apenas — confirmação restrita ao dia de hoje"}</p>}</button>)}</div>}
  </div>
  <p className="mt-3 flex gap-2 text-xs text-muted-foreground"><AlertTriangle size={16} className="shrink-0"/> Por padrão, não é possível lançar confirmações retroativas nem editar o horário. Cada conjunto de quatro ícones representa uma tomada conjunta, conforme a programação informada. Um clique abre a confirmação dessa tomada, não registra comprimidos isolados. O horário salvo é o da confirmação no servidor. Não duplique doses ou ajuste a prescrição por conta própria.</p>
  </>}
 </section>;
}
