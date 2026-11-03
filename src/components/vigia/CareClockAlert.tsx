import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { BellRing, CalendarCheck2, CheckCircle2, Clock3, Droplets, Pill, UtensilsCrossed, X } from "lucide-react";
import { reminderCategoryLabel, reminderClock, reminderMmSs, type ReminderTask } from "@/lib/care-reminders";
import "./care-clock-alert.css";

type Props = {
  task: ReminderTask;
  now: number;
  remainingMs: number;
  onDetails: () => void;
  onConfirm: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
};

const zone = "America/Rio_Branco";
const categoryIcon = {
  medicacao: Pill,
  hidratacao: Droplets,
  refeicao: UtensilsCrossed,
} as const;

/** Animated in-browser, not a video or an automatically submitted care record. */
function PulseClock({now}:{now:number}) {
  const parts = new Intl.DateTimeFormat("en-GB",{
    timeZone: zone, hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false,
  }).formatToParts(now);
  const value=(unit:"hour"|"minute"|"second")=>Number(parts.find(x=>x.type===unit)?.value??0);
  const hour=value("hour"), minute=value("minute"), second=value("second");
  const hoursAngle=30*((hour%12)+minute/60);
  const minutesAngle=6*(minute+second/60);
  const secondsAngle=6*second;
  return <div className="care-clock-visual" aria-hidden="true">
    <div className="care-clock-visual-halo"/>
    <div className="care-clock-visual-wave care-clock-visual-wave-one"/>
    <div className="care-clock-visual-wave care-clock-visual-wave-two"/>
    <svg className="care-clock-face" viewBox="0 0 200 200" focusable="false">
      <defs>
        <radialGradient id="clock-alert-core" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#09b6b7" stopOpacity=".92"/>
          <stop offset="72%" stopColor="#00778b" stopOpacity=".9"/>
          <stop offset="100%" stopColor="#003849" stopOpacity=".95"/>
        </radialGradient>
        <linearGradient id="clock-alert-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="45%" stopColor="#9ffff7"/>
          <stop offset="100%" stopColor="#00bfc1"/>
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="90" fill="none" stroke="#67ffec" strokeOpacity=".18" strokeWidth="7"/>
      <circle cx="100" cy="100" r="78" fill="url(#clock-alert-core)" stroke="url(#clock-alert-ring)" strokeWidth="10"/>
      {Array.from({length:12},(_,index)=>{
        const angle=index*Math.PI/6, inner=index%3===0?57:61;
        return <line key={index} x1={100+Math.sin(angle)*inner} y1={100-Math.cos(angle)*inner}
          x2={100+Math.sin(angle)*66} y2={100-Math.cos(angle)*66}
          stroke="#f2fffe" strokeWidth={index%3===0?4.2:2.5} strokeLinecap="round"/>;
      })}
      <g transform={`rotate(${hoursAngle} 100 100)`}>
        <path d="M100 104V66" stroke="#f3fffe" strokeWidth="7" strokeLinecap="round"/>
      </g>
      <g transform={`rotate(${minutesAngle} 100 100)`}>
        <path d="M100 109V51" stroke="#f3fffe" strokeWidth="5" strokeLinecap="round"/>
      </g>
      <g transform={`rotate(${secondsAngle} 100 100)`}>
        <path d="M100 116V43" stroke="#6dfff1" strokeWidth="1.8" strokeLinecap="round"/>
      </g>
      <circle cx="100" cy="100" r="7.5" fill="#efffff" stroke="#57f7e9" strokeWidth="3"/>
    </svg>
    <div className="care-clock-ring-orbit care-clock-ring-orbit-one"/>
    <div className="care-clock-ring-orbit care-clock-ring-orbit-two"/>
  </div>;
}

export function CareClockAlert({task,now,remainingMs,onDetails,onConfirm,onSnooze,onDismiss}:Props) {
  const firstButton=useRef<HTMLButtonElement|null>(null);
  useEffect(()=>{
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    firstButton.current?.focus();
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){
        event.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener("keydown",onKey);
    return()=>{window.removeEventListener("keydown",onKey);previous?.focus();};
  },[task.id,onDismiss]);
  if(typeof document==="undefined")return null;
  const Icon=categoryIcon[task.category as keyof typeof categoryIcon]??CalendarCheck2;
  return createPortal(<div className="care-clock-alert-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onDismiss();}}>
    <section role="dialog" aria-modal="true" aria-label="Lembrete de cuidado no horário"
      aria-describedby="care-clock-alert-description"
      className="care-clock-alert-window" data-category={task.category}>
      <div className="care-clock-background-glow" aria-hidden="true"/>
      <div className="care-clock-background-line" aria-hidden="true">
        <svg viewBox="0 0 740 70" preserveAspectRatio="none"><path d="M0 35h170l15-5 10 15 11-45 13 65 15-30h188l12-7 12 22 10-37 13 42 12-20h250" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
      </div>
      <button type="button" className="care-clock-close" aria-label="Fechar lembrete sem confirmar" onClick={onDismiss}><X size={21}/></button>
      <div className="care-clock-alert-head">
        <span className="care-clock-alert-eyebrow"><BellRing size={15}/> Lembrete de cuidado ativo</span>
        <PulseClock now={now}/>
        <div className="care-clock-alert-category"><Icon size={16}/>{reminderCategoryLabel(task.category)}</div>
        <h2>Está na hora do compromisso</h2>
        <p id="care-clock-alert-description">Seu cuidado programado está no horário. Confira o que foi previsto antes de registrar qualquer realização.</p>
      </div>
      <div className="care-clock-alert-task">
        <span className="care-clock-alert-task-symbol"><Icon size={23}/></span>
        <div className="care-clock-alert-task-details">
          <span className="care-clock-alert-task-label">Compromisso programado</span>
          <strong>{task.title}</strong>
          <span>Horário {reminderClock(task.scheduled_at)} · fuso do Acre</span>
        </div>
        <span className="care-clock-alert-countdown"><Clock3 size={14}/>{reminderMmSs(remainingMs)}</span>
      </div>
      <div className="care-clock-alert-actions">
        <button ref={firstButton} type="button" className="care-clock-button care-clock-button-primary" onClick={onDetails}>
          <CalendarCheck2 size={18}/> Ver detalhes
        </button>
        <button type="button" className="care-clock-button care-clock-button-secondary" onClick={onConfirm}>
          <CheckCircle2 size={18}/> Abrir confirmação
        </button>
      </div>
      <div className="care-clock-alert-footer">
        <p>O cuidado só será confirmado após você declarar que realmente o realizou.</p>
        <button type="button" onClick={onSnooze}>Lembrar em 3 min</button>
      </div>
    </section>
  </div>,document.body);
}
