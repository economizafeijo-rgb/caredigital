import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { BellRing, CalendarCheck2, CheckCircle2, Clock3, Droplets, Pill, UtensilsCrossed, X, CircleX, CalendarClock, Info, ArrowLeft, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { reminderCategoryLabel, reminderClock, reminderMmSs, type ReminderTask } from "@/lib/care-reminders";
import "./care-clock-alert.css";

type Props = {
  task: ReminderTask;
  now: number;
  remainingMs: number;
  onDetails: () => void;
  onConfirm: () => void;
  onSnooze: (minutes:number) => void;
  onDismiss: () => void;
  onChanged: () => void;
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

export function CareClockAlert({task,now,remainingMs,onDetails,onConfirm,onSnooze,onDismiss,onChanged}:Props) {
  const [view,setView]=useState<"main"|"notdone"|"postpone"|"cancel">("main");
  const [reason,setReason]=useState("");
  const [delay,setDelay]=useState("10");
  const [customTime,setCustomTime]=useState("");
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const isMedication=task.category==="medicacao";
  const canReschedule=task.category==="refeicao"||task.category==="hidratacao";
  async function saveDecision(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(saving)return;
    setSaving(true);setError("");
    try{
      let result:any;
      if(view==="postpone"){
        if(isMedication){
          onSnooze(3);
          return;
        }
        const minutes=Number(delay);
        let next:Date;
        if(delay==="custom"){
          if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(customTime))throw Error("Informe um horário válido.");
          const parts=new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
          const get=(type:string)=>parts.find(p=>p.type===type)?.value;
          next=new Date(`${get("year")}-${get("month")}-${get("day")}T${customTime}:00-05:00`);
        }else{
          if(![10,20,30].includes(minutes))throw Error("Selecione o tempo de adiamento.");
          next=new Date(Date.now()+minutes*60000);
        }
        if(!Number.isFinite(next.getTime())||next.getTime()<=Date.now())throw Error("Escolha um horário futuro.");
        result=await (supabase as any).rpc("care_reschedule_pending_task",{
          p_task_id:task.id,p_new_scheduled_at:next.toISOString(),p_reason:"Adiado pelo cliente no lembrete de cuidado"
        });
        if(result.error)throw result.error;
        if(result.data?.task_id!==task.id||result.data?.status!=="remarcado")throw Error("A remarcação não foi confirmada.");
      }else if(view==="notdone"||view==="cancel"){
        result=await (supabase as any).rpc("care_resolve_pending_task",{
          p_task_id:task.id,p_status:view==="notdone"?"nao_cumprido":"cancelado",p_reason:reason.trim()
        });
        if(result.error)throw result.error;
        const expected=view==="notdone"?"nao_cumprido":"cancelado";
        if(result.data?.task_id!==task.id||result.data?.status!==expected)throw Error("O registro não foi confirmado pelo servidor.");
      }else return;
      onChanged();
      onDismiss();
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar a decisão.");}
    finally{setSaving(false);}
  }
  const firstButton=useRef<HTMLButtonElement|null>(null);
  const dialogRef=useRef<HTMLElement|null>(null);
  const dismissRef=useRef(onDismiss);
  dismissRef.current=onDismiss;
  useEffect(()=>{
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    firstButton.current?.focus();
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){
        event.preventDefault();
        dismissRef.current();
      }
      if(event.key==="Tab"){
        const focusable=dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])");
        if(!focusable?.length)return;
        const first=focusable[0],last=focusable[focusable.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    };
    window.addEventListener("keydown",onKey);
    return()=>{
      document.body.style.overflow=previousOverflow;
      window.removeEventListener("keydown",onKey);
      previous?.focus();
    };
  },[task.id]);
  if(typeof document==="undefined")return null;
  const Icon=categoryIcon[task.category as keyof typeof categoryIcon]??CalendarCheck2;
  return createPortal(<div className="care-clock-alert-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onDismiss();}}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-label="Lembrete de cuidado no horário"
      aria-describedby="care-clock-alert-description"
      className="care-clock-alert-window" data-category={task.category}>
      <div className="care-clock-background-glow" aria-hidden="true"/>
      <div className="care-clock-background-line" aria-hidden="true">
        <svg viewBox="0 0 740 70" preserveAspectRatio="none"><path d="M0 35h170l15-5 10 15 11-45 13 65 15-30h188l12-7 12 22 10-37 13 42 12-20h250" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
      </div>
      <button type="button" className="care-clock-close" aria-label="Fechar lembrete sem confirmar" onClick={onDismiss}><X size={21}/></button>
      <div className="care-clock-alert-head">
        <span className="care-clock-alert-eyebrow"><BellRing size={15}/> Lembrete de cuidado</span>
        <div className="care-clock-alert-mini-art"><PulseClock now={now}/></div>
        <h2>Seu cuidado está no horário</h2>
        <p id="care-clock-alert-description">Confira o compromisso e escolha como deseja prosseguir.</p>
      </div>
      <div className="care-clock-alert-task">
        <span className="care-clock-alert-task-symbol"><Icon size={22}/></span>
        <div className="care-clock-alert-task-details">
          <span className="care-clock-alert-task-label">{reminderCategoryLabel(task.category)}</span>
          <strong>{task.title}</strong>
          <span>Previsto para {reminderClock(task.scheduled_at)} · Acre</span>
        </div>
        <span className="care-clock-alert-countdown" title="Tempo restante para este aviso"><Clock3 size={14}/>{reminderMmSs(remainingMs)}</span>
      </div>
      {view==="main"?<>
        <button ref={firstButton} type="button" className="care-clock-button care-clock-button-primary care-clock-main-action" onClick={onConfirm}>
          <CheckCircle2 size={18}/> Confirmar realização
        </button>
        <div className="care-clock-alert-actions">
          <button type="button" className="care-clock-button care-clock-button-secondary" onClick={()=>{setView("notdone");setError("");}}>
            <CircleX size={17}/> Não fiz
          </button>
          <button type="button" className="care-clock-button care-clock-button-secondary" onClick={()=>{setView("postpone");setError("");}}>
            <CalendarClock size={17}/> Deixar para depois
          </button>
        </div>
        <div className="care-clock-alert-tertiary">
          <button type="button" onClick={onDetails}><Info size={15}/> Ver detalhes</button>
          <button type="button" onClick={()=>{setView("cancel");setError("");}}><Ban size={15}/> Cancelar cuidado</button>
        </div>
        <p className="care-clock-alert-note">Fechar este aviso não confirma nem cancela o cuidado.</p>
      </>:<form onSubmit={event=>void saveDecision(event)} className="care-clock-decision-form">
        <div className="care-clock-decision-heading">
          <strong>{view==="notdone"?"Registrar como não realizado":view==="cancel"?"Cancelar o cuidado de hoje":"Escolher novo horário"}</strong>
          <button type="button" onClick={()=>{setView("main");setError("");}} disabled={saving}><ArrowLeft size={15}/> Voltar</button>
        </div>
        {view==="postpone"?<>
          {canReschedule?<><p>O cuidado será remarcado no prontuário. O horário original permanecerá no histórico.</p>
            <div className="care-clock-delay-options">
              {["10","20","30","custom"].map(value=><label key={value}><input type="radio" name="care-delay" value={value} checked={delay===value} onChange={()=>setDelay(value)}/>{value==="custom"?"Outro horário":value+" minutos"}</label>)}
            </div>
            {delay==="custom"&&<label className="care-clock-field">Novo horário (Acre)<input type="time" required value={customTime} onChange={event=>setCustomTime(event.target.value)}/></label>}
          </>:<p>O horário da medicação não pode ser alterado por este aviso. É possível apenas lembrar novamente em 3 minutos, sem modificar a prescrição.</p>}
        </>:<>
          <p>{view==="notdone"?"O cuidado será registrado como não realizado.":"O cuidado de hoje será registrado como cancelado, sem apagar o histórico."} {isMedication?"Isso não altera a prescrição médica.":""}</p>
          <label className="care-clock-field">Motivo (opcional)
            <select value={reason} onChange={event=>setReason(event.target.value)}>
              <option value="">Não informar</option>
              <option value="Esqueci">Esqueci</option>
              <option value="Não consegui realizar">Não consegui realizar</option>
              {task.category==="refeicao"&&<option value="Não senti fome">Não senti fome</option>}
              <option value="Outro motivo">Outro motivo</option>
            </select>
          </label>
        </>}
        {error&&<p className="care-clock-form-error" role="alert">{error}</p>}
        <button type="submit" disabled={saving} className="care-clock-button care-clock-button-primary">
          {saving?"Salvando…":view==="notdone"?"Salvar como não realizado":view==="cancel"?"Confirmar cancelamento":canReschedule?"Salvar novo horário":"Lembrar em 3 minutos"}
        </button>
      </form>}
    </section>
  </div>,document.body);
}
