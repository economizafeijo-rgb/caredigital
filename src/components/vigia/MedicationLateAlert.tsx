import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff, Clock3, Pill, Volume2 } from "lucide-react";

export type MedicineAlertTask = { id:string; title:string; category:string; scheduled_at:string; completed_at:string|null };
type Props = {tasks:MedicineAlertTask[];onConfirm:(task:MedicineAlertTask)=>void;compact?:boolean;now?:Date|null};
const TZ="America/Rio_Branco";
const GRACE_MS=15*60*1000;
const CHIME_INTERVAL_MS=5*60*1000;
const clockFormat=(date:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:TZ,hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(date));
const localDate=(date:Date)=>new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
const profileKey="caredigital-medication-sound-preference-v1";

function chime(context:AudioContext){
  const t=context.currentTime;
  [0,.23,.48].forEach((offset,i)=>{
    const oscillator=context.createOscillator();
    const volume=context.createGain();
    oscillator.type="sine";
    oscillator.frequency.setValueAtTime([587,740,880][i],t+offset);
    volume.gain.setValueAtTime(.0001,t+offset);
    volume.gain.exponentialRampToValueAtTime(.085,t+offset+.02);
    volume.gain.exponentialRampToValueAtTime(.0001,t+offset+.25);
    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(t+offset);
    oscillator.stop(t+offset+.28);
  });
}
export function MedicationLateAlert({tasks,onConfirm,compact=false,now}:Props){
  const [internalNow,setInternalNow]=useState(()=>new Date());
  const [audioEnabled,setAudioEnabled]=useState(false);
  const [previousPreference,setPreviousPreference]=useState(false);
  const [message,setMessage]=useState("");
  const audioContext=useRef<AudioContext|null>(null);
  const lastSound=useRef(0);
  const overdueId=useRef("");
  useEffect(()=>{
    try{setPreviousPreference(window.localStorage.getItem(profileKey)==="enabled")}catch{}
    const refresh=()=>setInternalNow(new Date());
    const timer=window.setInterval(refresh,10000);
    window.addEventListener("focus",refresh);
    document.addEventListener("visibilitychange",refresh);
    return()=>{window.clearInterval(timer);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh)};
  },[]);
  useEffect(()=>()=>{if(audioContext.current){void audioContext.current.close();audioContext.current=null}},[]);
  const current=now??internalNow;
  const today=localDate(current);
  const doses=useMemo(()=>tasks.filter(t=>t.category==="medicacao"&&
    localDate(new Date(t.scheduled_at))===today).sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at)),[tasks,today]);
  const pending=doses.filter(t=>!t.completed_at);
  const overdue=pending.filter(t=>current.getTime()-new Date(t.scheduled_at).getTime()>=GRACE_MS);
  const firstLate=overdue[0];
  const next=pending.find(t=>Date.parse(t.scheduled_at)>current.getTime())??pending[0];
  const remaining=next?Math.max(0,Math.ceil((Date.parse(next.scheduled_at)-current.getTime())/60000)):0;
  const minutesLate=firstLate?Math.max(0,Math.floor((current.getTime()-Date.parse(firstLate.scheduled_at))/60000)):0;

  useEffect(()=>{
    if(!firstLate){overdueId.current="";return}
    const id=firstLate.id;
    const newlyLate=overdueId.current!==id;
    overdueId.current=id;
    if(!audioEnabled||!audioContext.current)return;
    if(!newlyLate&&Date.now()-lastSound.current<CHIME_INTERVAL_MS)return;
    if(document.visibilityState==="hidden")return;
    const ctx=audioContext.current;
    lastSound.current=Date.now();
    void ctx.resume().then(()=>chime(ctx)).catch(()=>setMessage("O navegador bloqueou o áudio. Ative novamente o alarme."));
  },[firstLate?.id,audioEnabled,internalNow,now]);

  async function toggleAudio(){
    if(audioEnabled){
      setAudioEnabled(false);
      setPreviousPreference(false);
      setMessage("");
      try{window.localStorage.setItem(profileKey,"disabled")}catch{}
      if(audioContext.current){void audioContext.current.suspend()}
      return;
    }
    try{
      const ctx=audioContext.current??new AudioContext();
      audioContext.current=ctx;
      await ctx.resume();
      if(ctx.state!=="running")throw new Error("audio not started");
      // Sound is started from a direct click, complying with autoplay limitations.
      chime(ctx);
      lastSound.current=Date.now();
      setAudioEnabled(true);
      setPreviousPreference(true);
      setMessage("Alarme sonoro ativado. Você ouviu o som de teste.");
      try{window.localStorage.setItem(profileKey,"enabled")}catch{}
    }catch{
      setAudioEnabled(false);
      setMessage("Seu navegador não liberou o áudio. O alerta visual continua disponível.");
    }
  }
  if(!doses.length)return null;

  if(compact){
    return <section role={firstLate?"alert":"status"} aria-label="Alarme de medicação" className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-2.5 py-1.5 ${firstLate?"border-amber-500/70 bg-amber-100 text-amber-950 dark:bg-amber-950/75 dark:text-amber-50":"border-sky-500/20 bg-sky-500/5 text-foreground"}`}>
      <svg viewBox="0 0 40 40" className="size-8 shrink-0" role="img" aria-label="Alarme de doses">
        <circle cx="20" cy="20" r="18" fill={firstLate?"#fac96b":"#d7f2fa"}/>
        <path d="M20 8a10 10 0 0 0-10 10v7l-3 4h26l-3-4v-7A10 10 0 0 0 20 8Z" fill={firstLate?"#97540d":"#216b8a"}/>
        <path d="M17 33h6" stroke={firstLate?"#97540d":"#216b8a"} strokeWidth="3" strokeLinecap="round"/>
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-extrabold">{firstLate?"Dose ainda não confirmada":pending.length?"Alarme preparado":"Doses de hoje confirmadas"} {firstLate&&<span className="ml-1 text-[10px] font-semibold">· {Math.floor(minutesLate/60)}h {String(minutesLate%60).padStart(2,"0")} de atraso</span>}</p>
        <p className="truncate text-[10px]">{firstLate?`${firstLate.title} · prevista ${clockFormat(firstLate.scheduled_at)}`:next?`Próxima dose às ${clockFormat(next.scheduled_at)}`:"Nenhuma dose pendente"}</p>
      </div>
      {firstLate&&<button type="button" onClick={()=>onConfirm(firstLate)} className="shrink-0 rounded-md bg-amber-900 px-2.5 py-1.5 text-[10px] font-bold text-white dark:bg-amber-300 dark:text-amber-950">Verificar / confirmar</button>}
      <button type="button" onClick={()=>void toggleAudio()} aria-pressed={audioEnabled} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-current/25 px-2 py-1.5 text-[10px] font-semibold">{audioEnabled?<BellOff size={13}/>:<Bell size={13}/>} {audioEnabled?"Silenciar":"Ativar som"}</button>
      {message&&<p role="status" className="w-full text-[10px]">{message}</p>}
    </section>;
  }
  if(!firstLate){
    return <section aria-label="Alarme de medicação" className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-500/25 bg-sky-500/5 text-foreground ${compact?"px-3 py-2":"p-3"}`}>
      <div className="flex min-w-0 items-center gap-2">
        <svg viewBox="0 0 44 44" className="size-9 shrink-0" role="img" aria-label="Sino do alarme de medicação">
          <circle cx="22" cy="22" r="20" fill="#d7f2fa" stroke="#81c4db"/>
          <path d="M22 10a10 10 0 0 0-10 10v8l-3 4h26l-3-4v-8a10 10 0 0 0-10-10Z" fill="#216b8a"/>
          <path d="M19 35h6" stroke="#216b8a" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <div className="min-w-0">
          <p className="text-xs font-bold">{pending.length? "Alarme de medicação preparado":"Medicações de hoje confirmadas"}</p>
          <p className="text-[11px] text-muted-foreground">{next?`Próxima dose: ${clockFormat(next.scheduled_at)} · ${remaining>0?`em ${remaining} min`:"aguardando confirmação"}`:"Nenhuma dose pendente para hoje."}</p>
        </div>
      </div>
      <button type="button" onClick={()=>void toggleAudio()} aria-pressed={audioEnabled} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/25 bg-card px-3 py-2 text-[11px] font-bold text-primary hover:bg-muted">
        {audioEnabled?<BellOff size={15}/>:<Volume2 size={15}/>}
        {audioEnabled?"Silenciar":"Ativar alarme sonoro"}
      </button>
      {(message||previousPreference&&!audioEnabled)&&<p role="status" className="basis-full text-[10px] text-muted-foreground">{message||"O som precisa ser reativado após reabrir o navegador."}</p>}
    </section>;
  }
  return <section role="alert" aria-label="Medicação atrasada e sem confirmação" className={`rounded-xl border border-amber-500/70 bg-amber-100/95 text-amber-950 shadow-sm dark:border-amber-400/60 dark:bg-[#422d15] dark:text-amber-50 ${compact?"p-2.5":"p-3"}`}>
    <div className="flex items-start gap-2.5">
      <svg viewBox="0 0 60 60" className="size-11 shrink-0" role="img" aria-label="Sino de alerta de dose atrasada">
        <circle cx="30" cy="30" r="28" fill="#f7cd6b" stroke="#bd7719" strokeWidth="2"/>
        <path d="M30 12a14 14 0 0 0-14 14v9l-5 6h38l-5-6v-9a14 14 0 0 0-14-14Z" fill="#8c4c0b"/>
        <path d="M26 47h8" stroke="#8c4c0b" strokeWidth="4" strokeLinecap="round"/>
        <circle cx="30" cy="26" r="3" fill="#ffe8a9"/>
      </svg>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><strong className="text-xs font-extrabold">Atenção: dose não confirmada</strong><span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold dark:bg-amber-900/70">{Math.floor(minutesLate/60)}h {String(minutesLate%60).padStart(2,"0")}min desde o horário previsto</span></div>
        <p className="mt-1 text-xs">{firstLate.title} · prevista às <strong>{clockFormat(firstLate.scheduled_at)}</strong>{overdue.length>1?` · mais ${overdue.length-1} pendente(s)`:""}</p>
        <p className="mt-1 text-[11px] opacity-85">A dose ainda não tem confirmação no prontuário. Não dobre doses para compensar atrasos.</p>
      </div>
    </div>
    <div className="mt-2 flex flex-wrap gap-2">
      <button type="button" onClick={()=>onConfirm(firstLate)} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-3 py-2 text-[11px] font-bold text-white dark:bg-amber-300 dark:text-amber-950"><Pill size={15}/> Verificar / confirmar dose</button>
      <button type="button" onClick={()=>void toggleAudio()} aria-pressed={audioEnabled} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-900/30 px-3 py-2 text-[11px] font-semibold">{audioEnabled?<BellOff size={15}/>:<Bell size={15}/>} {audioEnabled?"Silenciar som":"Ativar alarme sonoro"}</button>
      <span className="ml-auto inline-flex items-center gap-1 text-[10px] opacity-80"><Clock3 size={12}/> Alerta persistente</span>
    </div>
    {message&&<p role="status" className="mt-1 text-[11px]">{message}</p>}
  </section>;
}
