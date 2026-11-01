import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarClock, Check, Clock3, Droplets, Pill, Utensils, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MedicationLateAlert } from "./MedicationLateAlert";

type Care = {id:string;title:string;category:string;scheduled_at:string;completed_at:string|null};
type Person = {id:string;owner_id:string;full_name:string};
const zone="America/Rio_Branco";
const day=(t:Date)=>new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"}).format(t);
const time=(iso:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:zone,hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(iso));
const icons={medicacao:Pill,refeicao:Utensils,hidratacao:Droplets} as const;

export function ClientHomeSummary(){
 const [patient,setPatient]=useState<Person|null>(null);
 const [tasks,setTasks]=useState<Care[]>([]);
 const [selected,setSelected]=useState<Care|null>(null);
 const [now,setNow]=useState<Date|null>(null);
 const [water,setWater]=useState(200);
 const [working,setWorking]=useState(false);
 const [error,setError]=useState("");
 const [revision,setRevision]=useState(0);
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{setNow(new Date());const id=window.setInterval(()=>setNow(new Date()),1000);return()=>window.clearInterval(id)},[]);
 useEffect(()=>{const timer=window.setInterval(()=>setRefresh(v=>v+1),45000);const focus=()=>setRefresh(v=>v+1);window.addEventListener("focus",focus);return()=>{window.clearInterval(timer);window.removeEventListener("focus",focus)}},[]);
 useEffect(()=>{let active=true;void (async()=>{
    const session=await supabase.auth.getUser();
    const uid=session.data.user?.id;
    if(!uid){if(active)setError("Entre para acessar sua rotina.");return;}
    const grant=await (supabase as any).from("care_patient_access").select("patient_id").eq("user_id",uid).limit(1);
    if(grant.error||!grant.data?.length){if(active)setError("Não há um prontuário vinculado à sua conta.");return;}
    const detail=await (supabase as any).from("care_patients").select("id,owner_id,full_name").eq("id",grant.data[0].patient_id).limit(1);
    if(!active)return;
    if(detail.error||!detail.data?.length){setError("Não foi possível abrir o acompanhamento.");return;}
    const person=detail.data[0] as Person;
    setPatient(person);
    const from=new Date(day(new Date())+"T00:00:00-05:00");
    const finish=new Date(from.getTime()+86400000);
    const res=await (supabase as any).from("care_daily_checklist").select("id,title,category,scheduled_at,completed_at")
      .eq("owner_id",person.owner_id).eq("patient_id",person.id)
      .gte("scheduled_at",from.toISOString()).lt("scheduled_at",finish.toISOString())
      .in("category",["medicacao","refeicao","hidratacao"]).order("scheduled_at",{ascending:true}).limit(120);
    if(!active)return;
    if(res.error){setError("Não foi possível carregar sua agenda.");return;}
    setTasks(res.data??[]);setError("");
 })();return()=>{active=false}},[revision,refresh]);
 const pending=tasks.filter(t=>!t.completed_at);
 const next=now?pending.filter(t=>new Date(t.scheduled_at).getTime()>=now.getTime())[0]??pending[0]:pending[0];
 const seconds=next&&now?Math.max(0,Math.round((new Date(next.scheduled_at).getTime()-now.getTime())/1000)):null;
 const countdown=seconds===null?"--:--:--":[Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60].map(x=>String(x).padStart(2,"0")).join(":");
 async function confirm(){
  if(!selected||working||!patient)return;
  if(selected.category==="medicacao"&&day(new Date(selected.scheduled_at))!==day(new Date())){setError("Medicação somente pode ser confirmada no dia previsto.");return;}
  setWorking(true);setError("");
  const response=await (supabase as any).rpc("care_confirm_task",{p_task_id:selected.id,p_water_ml:selected.category==="hidratacao"?water:null});
  setWorking(false);
  if(response.error){setError("Não foi possível confirmar o cuidado. Consulte o prontuário.");return;}
  setSelected(null);setRevision(v=>v+1);
 }
 return <section className="mb-4 rounded-2xl border border-border bg-card/95 p-4 shadow-sm" aria-label="Resumo interativo do cliente na homepage">
  <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Minha rotina de saúde</p><h2 className="text-lg font-bold">{patient?.full_name??"Acompanhamento pessoal"}</h2></div><Link to="/cliente" className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Abrir área do cliente</Link></div>
  <div className="mt-2"><MedicationLateAlert tasks={tasks} onConfirm={setSelected} compact now={now}/></div>
  <div className="mt-3 grid gap-2 sm:grid-cols-[1.1fr_.9fr]">
   <div className="rounded-xl border border-border bg-muted/60 p-3"><div className="flex items-center gap-2 text-xs font-semibold"><Clock3 size={16} className="text-primary"/> Próximo cuidado</div><p className="mt-1 text-sm font-bold">{next?next.title:"Sem cuidados pendentes"}</p><div className="mt-2 flex flex-wrap items-baseline gap-3"><strong className="font-mono text-2xl tabular-nums">{countdown}</strong><span className="text-xs text-muted-foreground">{next?time(next.scheduled_at)+" · "+(seconds===0?"Horário vencido":"Programado"):"Agenda concluída"}</span></div></div>
   <div className="grid grid-cols-3 gap-2">{(["medicacao","refeicao","hidratacao"] as const).map(category=>{const Icon=icons[category];const group=tasks.filter(t=>t.category===category);return <button key={category} type="button" onClick={()=>{const item=group.find(t=>!t.completed_at);if(item)setSelected(item)}} disabled={!group.some(t=>!t.completed_at)} className="rounded-xl border border-border bg-muted/40 p-2 text-center transition hover:border-primary disabled:opacity-60"><Icon className="mx-auto text-primary" size={18}/><p className="mt-1 text-[10px] font-semibold">{category==="medicacao"?"Remédios":category==="refeicao"?"Refeições":"Água"}</p><p className="mt-1 text-xs font-bold">{group.filter(t=>t.completed_at).length}/{group.length}</p></button>})}</div>
  </div>
  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">{tasks.map(t=>{const Icon=icons[t.category as keyof typeof icons]??CalendarClock;return <button key={t.id} type="button" onClick={()=>!t.completed_at&&setSelected(t)} className={`flex min-w-[165px] max-w-[210px] flex-1 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs ${t.completed_at?"border-success/30 bg-success/10":"border-border bg-background hover:border-primary"}`}><Icon size={17} className="shrink-0 text-primary"/><div className="min-w-0"><div className="font-bold">{time(t.scheduled_at)} {t.completed_at?"· Feito":""}</div><div className="truncate text-muted-foreground">{t.title}</div></div>{t.completed_at&&<Check size={15} className="text-success"/>}</button>})}</div>
  {error&&<p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
  {selected&&<div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4" onMouseDown={e=>{if(e.target===e.currentTarget&&!working)setSelected(null)}}><section role="dialog" aria-modal="true" aria-label="Confirmar cuidado" className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl"><div className="flex items-center justify-between"><h3 className="text-lg font-bold">Confirmar cuidado</h3><button aria-label="Cancelar" disabled={working} onClick={()=>setSelected(null)}><X size={19}/></button></div><p className="mt-3 text-sm font-semibold">{selected.title}</p><p className="mt-1 text-xs text-muted-foreground">Previsto para {time(selected.scheduled_at)} · fuso do Acre</p>{selected.category==="medicacao"&&<p className="mt-3 rounded-xl bg-muted p-3 text-xs">Confirme somente se tomou agora. Se tomou anteriormente, não use esta confirmação para registrar um horário passado; procure o responsável pelo prontuário.</p>}{selected.category==="hidratacao"&&<label className="mt-3 block text-xs">Água consumida (ml)<input type="number" min={10} max={1500} step={10} value={water} onChange={e=>setWater(Number(e.target.value))} className="field mt-1"/></label>}<div className="mt-4 grid grid-cols-2 gap-2"><button onClick={()=>setSelected(null)} className="rounded-lg border border-border p-2.5 text-sm">Cancelar</button><button disabled={working||(selected.category==="hidratacao"&&(!Number.isInteger(water)||water<10||water>1500))} onClick={()=>void confirm()} className="rounded-lg bg-primary p-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{working?"Registrando…":"Confirmar agora"}</button></div></section></div>}
 </section>;
}