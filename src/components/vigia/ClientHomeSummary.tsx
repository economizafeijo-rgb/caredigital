import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarClock, Check, Clock3, Droplets, Pill, Utensils, X, ArrowUpRight, ChevronRight, Activity, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MedicationLateAlert } from "./MedicationLateAlert";
import { ClientQuickIntake } from "./ClientQuickIntake";
import { CareTaskRecordModal } from "./CareTaskRecordModal";
import { canConfirmCare, careScheduleBlockMessage } from "@/lib/care-schedule";

type Care = {id:string;title:string;category:string;scheduled_at:string;completed_at:string|null};
type Person = {id:string;owner_id:string;full_name:string};
const zone="America/Rio_Branco";
const day=(t:Date)=>new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"}).format(t);
const canConfirmMealToday=(task:Care)=>!task.completed_at && Date.now()>=Date.parse(task.scheduled_at) && day(new Date(task.scheduled_at))===day(new Date());
const currentAcreTime=()=>new Intl.DateTimeFormat("en-GB",{timeZone:zone,hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date());
const time=(iso:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:zone,hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(iso));
const icons={medicacao:Pill,refeicao:Utensils,hidratacao:Droplets} as const;

export function ClientHomeSummary(){
 const [patient,setPatient]=useState<Person|null>(null);
 const [tasks,setTasks]=useState<Care[]>([]);
 const [selected,setSelected]=useState<Care|null>(null);
 const [detailTask,setDetailTask]=useState<Care|null>(null);
 const [now,setNow]=useState<Date|null>(null);
 const [water,setWater]=useState(200);
 const [mealTime,setMealTime]=useState("");
 const [mealDescription,setMealDescription]=useState("");
 const [working,setWorking]=useState(false);
 const [error,setError]=useState("");
 const [receipt,setReceipt]=useState<{success:boolean;message:string}|null>(null);
 const [revision,setRevision]=useState(0);
 const [refresh,setRefresh]=useState(0);
 const [agendaPage,setAgendaPage]=useState(0);
 const agendaPageSize=3;
 const agendaPageCount=Math.max(1,Math.ceil(tasks.length/agendaPageSize));
 const visibleAgenda=tasks.slice(Math.min(agendaPage,agendaPageCount-1)*agendaPageSize,(Math.min(agendaPage,agendaPageCount-1)+1)*agendaPageSize);
 useEffect(()=>{setNow(new Date());const id=window.setInterval(()=>setNow(new Date()),1000);return()=>window.clearInterval(id)},[]);
 useEffect(()=>{const timer=window.setInterval(()=>setRefresh(v=>v+1),45000);const refreshAgenda=()=>setRefresh(v=>v+1);const visible=()=>{if(document.visibilityState==="visible")refreshAgenda()};window.addEventListener("focus",refreshAgenda);document.addEventListener("visibilitychange",visible);const channel=supabase.channel("client-home-care-changes").on("postgres_changes",{event:"*",schema:"public",table:"care_daily_checklist"},refreshAgenda).subscribe();return()=>{window.clearInterval(timer);window.removeEventListener("focus",refreshAgenda);document.removeEventListener("visibilitychange",visible);void supabase.removeChannel(channel)}},[]);
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
  if(!canConfirmCare(selected) && !(selected.category==="refeicao" && canConfirmMealToday(selected)) && !(selected.category==="medicacao" && Date.now()>=Date.parse(selected.scheduled_at) && !selected.completed_at)){setError(careScheduleBlockMessage(selected));return;}
  if(selected.category==="refeicao"&&(!/^([01]\d|2[0-3]):[0-5]\d$/.test(mealTime)||mealDescription.trim().length<3||mealDescription.trim().length>900)){setError("Descreva a refeição consumida (3 a 1.000 caracteres).");return;}
  setWorking(true);setError("");setReceipt(null);
  const response=selected.category==="refeicao"?await (supabase as any).rpc("care_confirm_meal",{p_task_id:selected.id,p_description:`Horário informado pelo cliente (Acre): ${mealTime}. Refeição: ${mealDescription.trim()}`}):await (supabase as any).rpc("care_confirm_task",{p_task_id:selected.id,p_water_ml:selected.category==="hidratacao"?water:null});
  setWorking(false);
  if(response.error || !response.data){
    const msg=/already completed/i.test(response.error?.message??"")?"Esta atividade já consta como confirmada. Atualize a página.":/Care window expired/i.test(response.error?.message??"")?"A versão do servidor ainda contém um bloqueio de horário; verifique a função SQL ativa.":`Não foi possível registrar: ${response.error?.message??"verifique sua conexão e tente novamente."}`;
    setError(msg);setReceipt({success:false,message:msg});return;
  }
  const record=await (supabase as any).from("care_daily_checklist").select("completed_at").eq("id",selected.id).single();
  if(record.error||!record.data?.completed_at){
    setReceipt({success:false,message:"O sistema recebeu a solicitação, mas não conseguiu verificar o registro. Consulte o prontuário antes de repetir."});
    setRevision(v=>v+1);return;
  }
  const when=new Intl.DateTimeFormat("pt-BR",{timeZone:zone,day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date(record.data.completed_at));
  setReceipt({success:true,message:`${selected.title} confirmado em ${when} (Acre). Registro salvo no prontuário; próximos horários elegíveis são atualizados automaticamente.`});
  setSelected(null);setMealDescription("");setMealTime("");setRevision(v=>v+1);
 }
 const finished=tasks.filter(t=>Boolean(t.completed_at)).length;
 const completion=tasks.length?Math.round(100*finished/tasks.length):0;
 const labelFor=(category:string)=>category==="medicacao"?"Medicação":category==="hidratacao"?"Água":"Refeição";
 const hour=new Intl.DateTimeFormat("pt-BR",{timeZone:zone,hour:"2-digit",hour12:false}).format(now??new Date());
 const greeting=Number(hour)<12?"Bom dia":Number(hour)<18?"Boa tarde":"Boa noite";
 return <section className="client-home-dashboard relative flex min-h-0 min-w-0 w-full flex-col gap-2 rounded-2xl border border-white/10 p-3 text-slate-50 shadow-xl md:h-full md:max-h-full md:gap-2 md:overflow-hidden" aria-label="Painel interativo do cliente na homepage">
  <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 size-96 rounded-full bg-sky-400/10 blur-[90px]"/>
  <div className="patient-header relative flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-teal-300/20 bg-teal-300/10"><Activity size={19} className="text-teal-200"/></span>
      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">Meu painel de cuidados</p><h2 className="truncate text-lg font-extrabold tracking-tight md:text-xl">{greeting}, {patient?.full_name?.split(" ")[0]??"bem-vindo"}</h2><p className="text-[11px] text-slate-300">Sua rotina de hoje · {new Intl.DateTimeFormat("pt-BR",{timeZone:zone,weekday:"long",day:"2-digit",month:"long"}).format(now??new Date())}</p></div>
    </div>
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5"><ClientQuickIntake patientId={patient?.id ?? ""} variant="home" mode="water" onRecorded={()=>setRefresh(value=>value+1)}/><ClientQuickIntake patientId={patient?.id ?? ""} variant="home" onRecorded={()=>setRefresh(value=>value+1)}/><Link to="/cliente" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-300 px-2.5 py-1.5 text-[11px] font-bold text-slate-950 transition hover:bg-teal-200">Meu prontuário <ArrowUpRight size={15}/></Link></div>
  </div>
  <div className="relative shrink-0"><MedicationLateAlert tasks={tasks} onConfirm={setSelected} compact now={now}/></div>
  <div className="relative grid min-h-0 min-w-0 flex-1 gap-2 md:grid-cols-[minmax(0,1.13fr)_minmax(0,0.87fr)] md:items-stretch">
    <div className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto_auto] gap-1.5">
      <article className="patient-next-care relative flex min-h-[190px] min-w-0 flex-col justify-between overflow-hidden rounded-2xl border p-3 md:min-h-0">
        <div aria-hidden="true" className="pointer-events-none absolute -right-8 -bottom-9 text-teal-100/10"><Clock3 size={140} strokeWidth={1}/></div>
        <div className="relative flex items-center justify-between gap-2"><span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-sky-200"><Clock3 size={16}/> Próximo cuidado</span><span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-slate-200">{next?time(next.scheduled_at):"Agenda concluída"}</span></div>
        <div className="relative mt-1.5"><h3 className="max-w-[28ch] text-lg font-extrabold leading-tight md:text-xl">{next?next.title:"Todos os cuidados concluídos"}</h3><div className="mt-1.5 flex flex-wrap items-baseline gap-2"><strong className="font-mono text-xl font-bold tabular-nums text-sky-200 md:text-2xl">{next?countdown:"✓"}</strong><span className="text-xs text-slate-300">{next?(seconds===0?"Horário previsto já passou":"até o horário previsto"):"Nenhuma atividade pendente"}</span></div></div>
        <div className="relative z-10 mt-2 flex shrink-0 flex-wrap gap-1.5">{next&&<button type="button" onClick={()=>{setSelected(next);setError("");setMealTime(currentAcreTime());setMealDescription("");}} className="inline-flex items-center gap-1 rounded-lg bg-sky-300 px-2.5 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-sky-200">Verificar / confirmar <ChevronRight size={15}/></button>}<Link to="/cliente" className="rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-white/10">Ver tratamento completo</Link></div>
      </article>
      <div className="grid min-w-0 grid-cols-3 gap-1.5">{(["medicacao","refeicao","hidratacao"] as const).map(category=>{const Icon=icons[category];const group=tasks.filter(t=>t.category===category);const done=group.filter(t=>t.completed_at).length;const first=group.find(t=>!t.completed_at);return <button key={category} type="button" onClick={()=>{if(first){setSelected(first);setError("");setMealTime(currentAcreTime());setMealDescription("");}}} disabled={!first} className="patient-stat-card flex min-w-0 flex-col items-start gap-0.5 rounded-xl border border-white/10 bg-white/[.055] p-2 text-left transition hover:border-teal-300/40 hover:bg-white/10 disabled:cursor-default disabled:opacity-75"><Icon size={16} className="text-sky-300"/><span className="text-[11px] font-semibold text-slate-200">{category==="medicacao"?"Medicação":category==="refeicao"?"Refeições":"Hidratação"}</span><span className="text-lg font-extrabold tabular-nums">{done}<span className="text-xs font-medium text-slate-400">/{group.length}</span></span><span className="h-1 w-full overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-sky-300" style={{width:(group.length?100*done/group.length:0)+"%"}}/></span></button>})}</div>
      <div className="patient-progress flex flex-wrap items-center gap-1.5 text-[10px] text-slate-300"><Check size={14} className="text-emerald-300"/>{finished} de {tasks.length} cuidados concluídos <span className="ml-auto font-bold text-sky-200">{completion}%</span></div>
    </div>
    <div className="patient-timeline flex min-h-[260px] min-w-0 flex-col overflow-hidden rounded-2xl border p-3 md:min-h-0">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 pb-2"><div><p className="text-[10px] font-bold uppercase tracking-widest text-sky-300">Linha do tempo</p><h3 className="mt-0.5 text-sm font-extrabold">Agenda de hoje</h3></div><span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[10px] text-slate-200"><ListChecks size={13}/>{tasks.length} itens</span></div>
      <div className="mt-1.5 min-h-0 flex-1 space-y-1 overflow-hidden">{visibleAgenda.map(t=>{const Icon=icons[t.category as keyof typeof icons]??CalendarClock;const finished=Boolean(t.completed_at);const overdue=Boolean(now&&!finished&&Date.parse(t.scheduled_at)<now.getTime());return <button key={t.id} type="button" title={finished?"Ver registro e corrigir quantidade, se necessário":"Ver detalhes deste cuidado"} aria-label={`${t.title} às ${time(t.scheduled_at)} — ${finished?"confirmado, abrir detalhes":"abrir detalhes"}`} onClick={()=>{setDetailTask(t);setError("");}} className={`patient-timeline-item flex w-full min-w-0 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left transition ${finished?"border-emerald-500/15 bg-emerald-500/10":"border-white/10 bg-white/[.045] hover:border-sky-300/40 hover:bg-white/10"}`}><span className="w-11 shrink-0 font-mono text-[11px] font-bold tabular-nums text-sky-200">{time(t.scheduled_at)}</span><span className={`grid size-7 shrink-0 place-items-center rounded-lg ${finished?"bg-emerald-500/15 text-emerald-300":"bg-sky-300/10 text-sky-300"}`}><Icon size={16}/></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{t.title}</span><span className={`block text-[10px] ${overdue?"text-amber-300":"text-slate-400"}`}>{finished?"Confirmado":overdue?"Aguardando confirmação":"Programado"} · {labelFor(t.category)}</span></span>{finished?<span className="flex shrink-0 items-center gap-1 text-emerald-300"><Check size={14}/><ChevronRight size={14}/></span>:<ChevronRight size={15} className="shrink-0 text-slate-400"/>}</button>})}{tasks.length===0&&<p className="rounded-lg p-4 text-sm text-slate-300">Nenhum cuidado programado para hoje.</p>}</div>
      {tasks.length>agendaPageSize&&<nav aria-label="Páginas da agenda" className="mt-1.5 flex shrink-0 items-center justify-between border-t border-white/10 pt-1.5">
        <button type="button" onClick={()=>setAgendaPage(p=>Math.max(0,p-1))} disabled={agendaPage===0} className="rounded-lg border border-white/15 px-2.5 py-1 text-[11px] font-semibold disabled:opacity-35">Anterior</button>
        <span className="text-[11px] text-slate-300">Página {Math.min(agendaPage,agendaPageCount-1)+1} de {agendaPageCount}</span>
        <button type="button" onClick={()=>setAgendaPage(p=>Math.min(agendaPageCount-1,p+1))} disabled={agendaPage>=agendaPageCount-1} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold disabled:opacity-35">Próxima</button>
      </nav>}
    </div>
  </div>
  {receipt&&<div role={receipt.success?"status":"alert"} className={`fixed inset-x-3 top-16 z-[95] mx-auto flex max-w-lg items-start gap-3 rounded-2xl border p-4 text-sm font-semibold shadow-xl ${receipt.success?"border-emerald-400 bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50":"border-rose-400 bg-rose-50 text-rose-950 dark:bg-rose-950 dark:text-rose-50"}`}><span className="flex-1">{receipt.success?"✓ Registro confirmado. ":"Atenção. "}{receipt.message}</span><button aria-label="Fechar aviso" type="button" onClick={()=>setReceipt(null)}><X size={17}/></button></div>}
  {error&&<p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
  <CareTaskRecordModal task={detailTask} onClose={()=>setDetailTask(null)} onSaved={()=>setRefresh(value=>value+1)} onConfirm={task=>{setSelected(task);setError("");setMealTime(currentAcreTime());setMealDescription("");}}/>
  {selected&&<div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-2 sm:p-4" onMouseDown={e=>{if(e.target===e.currentTarget&&!working)setSelected(null)}}><section role="dialog" aria-modal="true" aria-label="Confirmar cuidado" className="my-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-sm flex-col overflow-y-auto rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-2xl sm:p-4"><div className="flex items-center justify-between"><h3 className="text-lg font-bold">Confirmar cuidado</h3><button aria-label="Cancelar" disabled={working} onClick={()=>setSelected(null)}><X size={19}/></button></div><p className="mt-3 text-sm font-semibold">{selected.title}</p><p className="mt-1 text-xs text-muted-foreground">Previsto para {time(selected.scheduled_at)} · fuso do Acre</p>{selected.category==="medicacao"&&<p className="mt-3 rounded-xl bg-muted p-3 text-xs">Confirme apenas se tomou esta dose agora. O sistema registra a hora real, inclusive se houver atraso. Se ainda não tomou, procure orientação profissional; não dobre a dose.</p>}{selected.category==="refeicao"&&<div className="mt-3"><label className="block text-xs font-semibold">Horário em que realizou a refeição (Acre)<input type="time" value={mealTime} onChange={e=>setMealTime(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground"/></label><label className="mt-2 block text-xs font-semibold">O que você comeu nesta refeição?<textarea rows={3} maxLength={1000} value={mealDescription} onChange={e=>setMealDescription(e.target.value)} placeholder="Ex.: arroz, feijão, frango grelhado e salada. Quantidades e observações, se desejar." className="mt-1 w-full resize-y rounded-lg border border-border bg-background p-3 text-sm text-foreground" /><span className="mt-1 block text-[11px] font-normal text-muted-foreground">Informe os alimentos realmente consumidos. O horário informado descreve o consumo; o servidor registra separadamente o momento da confirmação.</span></label></div>}{selected.category==="hidratacao"&&<label className="mt-3 block text-xs">Água consumida (ml)<input type="number" min={10} max={1500} step={10} value={water} onChange={e=>setWater(Number(e.target.value))} className="field mt-1"/></label>}<div className="mt-3 grid shrink-0 grid-cols-2 gap-2"><button onClick={()=>setSelected(null)} className="rounded-lg border border-border p-2.5 text-sm">Cancelar</button><button disabled={working||(selected.category==="refeicao"&&(mealDescription.trim().length<3||mealDescription.trim().length>900||!mealTime))||(selected.category==="hidratacao"&&(!Number.isInteger(water)||water<10||water>1500))} onClick={()=>void confirm()} className="rounded-lg bg-primary p-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{working?"Registrando…":"Confirmar agora"}</button></div></section></div>}
 </section>;
}