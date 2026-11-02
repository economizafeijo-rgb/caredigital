import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Bell, BellOff, CheckCircle2, ChevronRight, Clock3, Volume2 } from "lucide-react";
import {
  CARE_REMINDER_WINDOW_MS, reminderCategoryLabel, reminderClock,
  reminderMmSs, summarizeCareReminders, type ReminderTask,
} from "@/lib/care-reminders";

type Props = {
  tasks: ReminderTask[];
  onOpen: (task: ReminderTask) => void;
  compact?: boolean;
};

const featureLabel: Record<string, string> = {
  medicacao: "medicação", hidratacao: "hidratação", refeicao: "alimentação", outro: "cuidado",
};

function ReminderArtwork({category,progress,active}:{
  category:string;progress:number;active:boolean;
}) {
  const id=useId().replace(/:/g,"");
  const gradient="careBeaconGradient"+id;
  const ringLength=2*Math.PI*36;
  return <svg className={"care-reminder-art shrink-0 "+(active?"is-active":"")}
    viewBox="0 0 104 104" width="65" height="65" role="img"
    aria-label={"Ilustração de "+(featureLabel[category]??"lembrete")}>
    <defs>
      <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={category==="hidratacao"?"#38bdf8":category==="refeicao"?"#34d399":"#b7a7fa"}/>
        <stop offset="1" stopColor={category==="hidratacao"?"#0891b2":category==="refeicao"?"#059669":"#7c3aed"}/>
      </linearGradient>
    </defs>
    <circle cx="52" cy="52" r="46" fill="currentColor" opacity=".075"/>
    <circle cx="52" cy="52" r="36" fill="none" stroke="currentColor" strokeWidth="4" opacity=".13"/>
    <circle cx="52" cy="52" r="36" fill="none" stroke={"url(#"+gradient+")"}
      strokeWidth="4.5" strokeLinecap="round" transform="rotate(-90 52 52)"
      strokeDasharray={ringLength} strokeDashoffset={ringLength*(1-Math.max(0,Math.min(1,progress)))}
      className="care-reminder-ring"/>
    <circle cx="52" cy="52" r="29" fill={"url(#"+gradient+")"} opacity=".17"/>
    {category==="hidratacao"?
      <g fill="none" stroke={"url(#"+gradient+")"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M52 27C46 37 35 48 35 60a17 17 0 0 0 34 0c0-12-11-23-17-33Z"/>
        <path d="M43 63c1 5 4 8 9 9" strokeWidth="3"/>
      </g>:category==="refeicao"?
      <g fill="none" stroke={"url(#"+gradient+")"} strokeWidth="3.8" strokeLinecap="round">
        <path d="M32 55a20 20 0 0 0 40 0" strokeWidth="4.5"/>
        <path d="M29 55h46M40 38c-4-5 5-8 1-13M53 39c-4-5 5-8 1-13M65 38c-4-5 5-8 1-13"/>
        <path d="M37 73h30"/>
      </g>:
      <g transform="rotate(-35 52 52)" stroke={"url(#"+gradient+")"} strokeWidth="3.8" strokeLinejoin="round">
        <rect x="40" y="26" width="24" height="52" rx="12" fill="none"/>
        <path d="M40 52h24"/>
        <path d="M40 51h24v15a12 12 0 0 1-24 0Z" fill={"url(#"+gradient+")"} stroke="none" opacity=".8"/>
      </g>}
    <circle cx="83" cy="19" r="9" fill="currentColor" opacity={active?".14":".07"}/>
    <path d="M80 19h6M83 16v6" stroke={"url(#"+gradient+")"} strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}

function chime(context:AudioContext) {
  const t=context.currentTime;
  // Original two-tone notification, intentionally quieter than a medical alarm.
  [659,784].forEach((freq,index)=>{
    const oscillator=context.createOscillator();
    const gain=context.createGain();
    oscillator.type="sine";
    oscillator.frequency.setValueAtTime(freq,t+index*.18);
    gain.gain.setValueAtTime(.0001,t+index*.18);
    gain.gain.exponentialRampToValueAtTime(.055,t+index*.18+.025);
    gain.gain.exponentialRampToValueAtTime(.0001,t+index*.18+.22);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(t+index*.18);
    oscillator.stop(t+index*.18+.24);
  });
}

export function CareReminderBeacon({tasks,onOpen,compact=false}:Props) {
  const [now,setNow]=useState(()=>Date.now());
  const [soundEnabled,setSoundEnabled]=useState(false);
  const [soundNotice,setSoundNotice]=useState("");
  const contextRef=useRef<AudioContext|null>(null);
  const lastPlayed=useRef<{id:string;time:number}|null>(null);
  useEffect(()=>{
    const tick=()=>setNow(Date.now());
    const timer=window.setInterval(tick,1000);
    window.addEventListener("focus",tick);
    document.addEventListener("visibilitychange",tick);
    return()=>{
      window.clearInterval(timer);
      window.removeEventListener("focus",tick);
      document.removeEventListener("visibilitychange",tick);
    };
  },[]);
  useEffect(()=>()=>{if(contextRef.current){void contextRef.current.close();contextRef.current=null;}},[]);
  const summary=useMemo(()=>summarizeCareReminders(tasks,now),[tasks,now]);
  const {primary,dueCount,unconfirmedCount,next}=summary;
  const stage=primary?.state??"quiet";
  const task=primary?.task;
  const due=stage==="due";
  const late=stage==="unconfirmed";
  const focusId=due?task?.id:null;
  // Sound is only generated after explicit user activation. A newly due task
  // receives periodic short reminders while its 10-minute window is open.
  useEffect(()=>{
    if(!soundEnabled||!due||!focusId||!contextRef.current||document.visibilityState!=="visible")return;
    const previous=lastPlayed.current;
    if(previous?.id===focusId&&now-previous.time<180_000)return;
    const ctx=contextRef.current;
    lastPlayed.current={id:focusId,time:now};
    void ctx.resume().then(()=>{
      if(ctx.state==="running")chime(ctx);
    }).catch(()=>setSoundNotice("O navegador interrompeu o áudio. Reative o som."));
  },[soundEnabled,due,focusId,now]);

  async function toggleAudio(){
    if(soundEnabled){
      setSoundEnabled(false);
      setSoundNotice("Avisos sonoros desativados. Os avisos visuais permanecem.");
      if(contextRef.current)void contextRef.current.suspend();
      return;
    }
    try{
      const ctx=contextRef.current??new AudioContext();
      contextRef.current=ctx;
      await ctx.resume();
      if(ctx.state!=="running")throw new Error("audio blocked");
      chime(ctx);
      lastPlayed.current=due&&task?{id:task.id,time:Date.now()}:null;
      setSoundEnabled(true);
      setSoundNotice("Som ativado neste navegador enquanto a página estiver aberta.");
    }catch{
      setSoundEnabled(false);
      setSoundNotice("O navegador não autorizou o som. Os avisos visuais continuam disponíveis.");
    }
  }
  const title=due?"Hora do seu cuidado":late?"Sem confirmação no prazo":
    next?"Próximo lembrete programado":"Acompanhamento em dia";
  const description=due?
    "Confirme apenas após realizar o cuidado. O aviso permanece por até 10 minutos.":
    late?
      "Passaram 10 minutos sem confirmação. O cuidado pode ter ocorrido; registre a informação real no prontuário.":
      next?
        `${reminderCategoryLabel(next.task.category)} às ${reminderClock(next.task.scheduled_at)} · aviso visual quando chegar o horário.`:
        "Nenhum cuidado pendente na programação de hoje.";
  const percent=due?Math.max(0,primary!.remainingMs/CARE_REMINDER_WINDOW_MS):late?1:0;

  return <section aria-label="Central de lembretes de cuidados"
    data-reminder-status={stage} data-reminder-category={task?.category??"nenhuma"}
    className={"care-reminder-beacon relative flex w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-2xl border p-2.5 shadow-sm sm:gap-3 sm:px-3.5 "+(compact?"care-reminder-compact":"")}>
    <ReminderArtwork category={task?.category??next?.task.category??"medicacao"}
      progress={percent} active={due}/>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <strong className="care-reminder-heading text-xs font-extrabold sm:text-sm">{title}</strong>
        {due&&<span className="care-reminder-badge inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold">
          <Clock3 size={12}/> {reminderMmSs(primary!.remainingMs)} restantes
        </span>}
        {late&&<span className="care-reminder-badge inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold">
          <Bell size={11}/> Pendente
        </span>}
      </div>
      {task&&<p className="care-reminder-task mt-0.5 truncate text-[12px] font-semibold">
        {reminderCategoryLabel(task.category)} · {task.title} · {reminderClock(task.scheduled_at)}
      </p>}
      <p className="care-reminder-subtitle mt-0.5 max-w-[74ch] text-[10px] leading-snug sm:text-[11px]">{description}</p>
      {due&&<div className="care-reminder-track mt-1.5 h-1 max-w-[260px] overflow-hidden rounded-full">
        <div className="care-reminder-track-fill h-full rounded-full" style={{width:(percent*100)+"%"}}/>
      </div>}
      {Boolean(dueCount>1||unconfirmedCount>0)&&<p className="care-reminder-queue mt-1 text-[10px] font-semibold">
        {dueCount>1?`${dueCount} lembretes no horário`:""}
        {dueCount>1&&unconfirmedCount>0?" · ":""}
        {unconfirmedCount>0?`${unconfirmedCount} sem confirmação no prazo`:""}
      </p>}
      {soundNotice&&<p role="status" className="care-reminder-subtitle mt-0.5 text-[10px]">{soundNotice}</p>}
    </div>
    <div className="care-reminder-actions flex shrink-0 flex-col items-end justify-center gap-1.5">
      {task&&<button type="button" onClick={()=>onOpen(task)}
        className="care-reminder-open inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-[10px] font-extrabold sm:text-[11px]">
        Ver cuidado <ChevronRight size={14}/>
      </button>}
      <button type="button" onClick={()=>void toggleAudio()} aria-pressed={soundEnabled}
        title={soundEnabled?"Desativar avisos sonoros":"Ativar avisos sonoros com teste"}
        className="care-reminder-sound inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 text-[10px] font-bold">
        {soundEnabled?<BellOff size={13}/>:<Volume2 size={14}/>}
        {soundEnabled?"Silenciar":"Ativar som"}
      </button>
    </div>
  </section>;
}
