import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarClock, Check, Clock3, Droplets, Pill, Utensils, X, ArrowUpRight, ChevronRight, Activity, ListChecks } from "lucide-react";
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
 const [receipt,setReceipt]=useState<{success:boolean;message:string}|null>(null);
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
  setWorking(true);setError("");setReceipt(null);
  const response=await (supabase as any).rpc("care_confirm_task",{p_task_id:selected.id,p_water_ml:selected.category==="hidratacao"?water:null});
  setWorking(false);
  if(response.error || typeof response.data!=="string"){
    const msg=/already completed/i.test(response.error?.message??"")?"Esta atividade já consta como confirmada. Atualize a página.":"Não foi possível registrar. Confira seu acesso e a conexão antes de tentar novamente.";
    setError(msg);setReceipt({success:false,message:msg});return;
  }
  const record=await (supabase as any).from("care_daily_checklist").select("completed_at").eq("id",selected.id).single();
  if(record.error||!record.data?.completed_at){
    setReceipt({success:false,message:"O sistema recebeu a solicitação, mas não conseguiu verificar o registro. Consulte o prontuário antes de repetir."});
    setRevision(v=>v+1);return;
  }
  const when=new Intl.DateTimeFormat("pt-BR",{timeZone:zone,day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date(record.data.completed_at));
  setReceipt({success:true,message:`${selected.title} confirmado em ${when} (Acre). Registro salvo no prontuário.`});
  setSelected(null);setRevision(v=>v+1);
 }
 const finished=tasks.filter(t=>Boolean(t.completed_at)).length;
 const completion=tasks.length?Math.round(100*finished/tasks.length):0;
 const labelFor=(category:string)=>category==="medicacao"?"Medicação":category==="hidratacao"?"Água":"Refeição";
 const hour=new Intl.DateTimeFormat("pt-BR",{timeZone:zone,hour:"2-digit",hour12:false}).format(now??new Date());
 const greeting=Number(hour)<12?"Bom dia":Number(hour)<18?"Boa tarde":"Boa noite";
 return <section className="client-home-dashboard relative flex min-h-0 flex-col gap-3 overflow-hidden rounded-3xl border border-white/10 p-3 text-slate-50 shadow-[0_24px_70px_-42px_rgba(0,0,0,.8)] sm:p-4 lg:min-h-[min(75dvh,740px)]" aria-label="Painel interativo do cliente na homepage">
  <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 size-96 rounded-full bg-sky-400/10 blur-[90px]"/>
  <div className="relative flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-teal-300/20 bg-teal-300/10"><Activity size={23} className="text-teal-200"/></span>
      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">Meu painel de cuidados</p><h2 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">{greeting}, {patient?.full_name?.split(" ")[0]??"bem-vindo"}</h2><p className="text-xs text-slate-300">Sua rotina de hoje · {new Intl.DateTimeFormat("pt-BR",{timeZone:zone,weekday:"long",day:"2-digit",month:"long"}).format(now??new Date())}</p></div>
    </div>
    <Link to="/cliente" className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-teal-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-teal-200">Meu prontuário <ArrowUpRight size={15}/></Link>
  </div>
  <div className="relative shrink-0"><MedicationLateAlert tasks={tasks} onConfirm={setSelected} compact now={now}/></div>
  <div className="relative grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(290px,0.85fr)]">
    <div className="flex min-h-0 flex-col gap-3">
      <article className="patient-next-care relative flex min-h-[170px] flex-col justify-between overflow-hidden rounded-2xl border p-4 sm:min-h-[185px] sm:p-5">
        <div aria-hidden="true" className="pointer-events-none absolute -right-8 -bottom-9 text-teal-100/10"><Clock3 size={190} strokeWidth={1}/></div>
        <div className="relative flex items-center justify-between gap-2"><span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-sky-200"><Clock3 size={16}/> Próximo cuidado</span><span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-slate-200">{next?time(next.scheduled_at):"Agenda concluída"}</span></div>
        <div className="relative mt-3"><h3 className="max-w-[28ch] text-xl font-extrabold leading-tight sm:text-2xl">{next?next.title:"Todos os cuidados concluídos"}</h3><div className="mt-2 flex flex-wrap items-baseline gap-3"><strong className="font-mono text-2xl font-bold tabular-nums text-sky-200 sm:text-3xl">{next?countdown:"✓"}</strong><span className="text-xs text-slate-300">{next?(seconds===0?"Horário previsto já passou":"até o horário previsto"):"Nenhuma atividade pendente"}</span></div></div>
        <div className="relative mt-4 flex flex-wrap gap-2">{next&&<button type="button" onClick={()=>setSelected(next)} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-300 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-sky-200">Verificar / confirmar <ChevronRight size={15}/></button>}<Link to="/cliente" className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10">Ver tratamento completo</Link></div>
      </article>
      <div className="grid grid-cols-3 gap-2">{(["medicacao","refeicao","hidratacao"] as const).map(category=>{const Icon=icons[category];const group=tasks.filter(t=>t.category===category);const done=group.filter(t=>t.completed_at).length;const first=group.find(t=>!t.completed_at);return <button key={category} type="button" onClick={()=>first&&setSelected(first)} disabled={!first} className="flex min-w-0 flex-col items-start gap-1.5 rounded-xl border border-white/10 bg-white/[.055] p-3 text-left transition hover:border-teal-300/40 hover:bg-white/10 disabled:cursor-default disabled:opacity-75"><Icon size={18} className="text-sky-300"/><span className="text-[11px] font-semibold text-slate-200">{category==="medicacao"?"Medicação":category==="refeicao"?"Refeições":"Hidratação"}</span><span className="text-xl font-extrabold tabular-nums">{done}<span className="text-xs font-medium text-slate-400">/{group.length}</span></span><span className="h-1 w-full overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-sky-300" style={{width:(group.length?100*done/group.length:0)+"%"}}/></span></button>})}</div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300"><Check size={14} className="text-emerald-300"/>{finished} de {tasks.length} cuidados concluídos <span className="ml-auto font-bold text-sky-200">{completion}%</span></div>
    </div>
    <div className="patient-timeline flex min-h-0 flex-col rounded-2xl border p-3 sm:p-4">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 pb-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-sky-300">Linha do tempo</p><h3 className="mt-1 text-base font-extrabold">Agenda de hoje</h3></div><span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[10px] text-slate-200"><ListChecks size={13}/>{tasks.length} itens</span></div>
      <div className="mt-2 max-h-[380px] min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1 lg:max-h-none">{tasks.map(t=>{const Icon=icons[t.category as keyof typeof icons]??CalendarClock;const finished=Boolean(t.completed_at);const overdue=Boolean(now&&!finished&&Date.parse(t.scheduled_at)<now.getTime());return <button key={t.id} type="button" disabled={finished} onClick={()=>setSelected(t)} className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${finished?"border-emerald-500/15 bg-emerald-500/10":"border-white/10 bg-white/[.045] hover:border-sky-300/40 hover:bg-white/10"}`}><span className="w-11 shrink-0 font-mono text-[11px] font-bold tabular-nums text-sky-200">{time(t.scheduled_at)}</span><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${finished?"bg-emerald-500/15 text-emerald-300":"bg-sky-300/10 text-sky-300"}`}><Icon size={16}/></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{t.title}</span><span className={`block text-[10px] ${overdue?"text-amber-300":"text-slate-400"}`}>{finished?"Confirmado":overdue?"Aguardando confirmação":"Programado"} · {labelFor(t.category)}</span></span>{finished?<Check size={16} className="shrink-0 text-emerald-300"/>:<ChevronRight size={15} className="shrink-0 text-slate-400"/>}</button>})}{tasks.length===0&&<p className="rounded-lg p-4 text-sm text-slate-300">Nenhum cuidado programado para hoje.</p>}</div>
    </div>
  </div>
  {receipt&&<div role={receipt.success?"status":"alert"} className={`fixed inset-x-3 top-16 z-[95] mx-auto flex max-w-lg items-start gap-3 rounded-2xl border p-4 text-sm font-semibold shadow-xl ${receipt.success?"border-emerald-400 bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50":"border-rose-400 bg-rose-50 text-rose-950 dark:bg-rose-950 dark:text-rose-50"}`}><span className="flex-1">{receipt.success?"✓ Registro confirmado. ":"Atenção. "}{receipt.message}</span><button aria-label="Fechar aviso" type="button" onClick={()=>setReceipt(null)}><X size={17}/></button></div>}
  {error&&<p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
  {selected&&<div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4" onMouseDown={e=>{if(e.target===e.currentTarget&&!working)setSelected(null)}}><section role="dialog" aria-modal="true" aria-label="Confirmar cuidado" className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl"><div className="flex items-center justify-between"><h3 className="text-lg font-bold">Confirmar cuidado</h3><button aria-label="Cancelar" disabled={working} onClick={()=>setSelected(null)}><X size={19}/></button></div><p className="mt-3 text-sm font-semibold">{selected.title}</p><p className="mt-1 text-xs text-muted-foreground">Previsto para {time(selected.scheduled_at)} · fuso do Acre</p>{selected.category==="medicacao"&&<p className="mt-3 rounded-xl bg-muted p-3 text-xs">Confirme somente se tomou agora. Se tomou anteriormente, não use esta confirmação para registrar um horário passado; procure o responsável pelo prontuário.</p>}{selected.category==="hidratacao"&&<label className="mt-3 block text-xs">Água consumida (ml)<input type="number" min={10} max={1500} step={10} value={water} onChange={e=>setWater(Number(e.target.value))} className="field mt-1"/></label>}<div className="mt-4 grid grid-cols-2 gap-2"><button onClick={()=>setSelected(null)} className="rounded-lg border border-border p-2.5 text-sm">Cancelar</button><button disabled={working||(selected.category==="hidratacao"&&(!Number.isInteger(water)||water<10||water>1500))} onClick={()=>void confirm()} className="rounded-lg bg-primary p-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{working?"Registrando…":"Confirmar agora"}</button></div></section></div>}
 </section>;
}