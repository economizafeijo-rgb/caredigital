import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff, Clock3, Pill, ShieldAlert } from "lucide-react";

export type MedicineAlertTask = {id:string;title:string;category:string;scheduled_at:string;completed_at:string|null};
type Props = {tasks:MedicineAlertTask[];onConfirm:(task:MedicineAlertTask)=>void;compact?:boolean;now?:Date|null};
const TZ="America/Rio_Branco";
const shortTime=(date:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:TZ,hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(date));
const day=(date:Date)=>new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
const MINUTES=15;
function playGentleChime(ctx:AudioContext) {
  const at=ctx.currentTime;
  [0,0.22].forEach((offset,i)=>{
    const oscillator=ctx.createOscillator();
    const gain=ctx.createGain();
    oscillator.type="sine";
    oscillator.frequency.setValueAtTime(i===0?659:784,at+offset);
    gain.gain.setValueAtTime(0.0001,at+offset);
    gain.gain.exponentialRampToValueAtTime(0.055,at+offset+0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001,at+offset+0.34);
    oscillator.connect(gain);gain.connect(ctx.destination);
    oscillator.start(at+offset);oscillator.stop(at+offset+0.36);
  });
}
export function MedicationLateAlert({tasks,onConfirm,compact=false,now}:Props){
 const [clock,setClock]=useState(()=>new Date());
 const [sound,setSound]=useState(false);
 const [soundError,setSoundError]=useState("");
 const context=useRef<AudioContext|null>(null);
 const lastPlayed=useRef(0);
 useEffect(()=>{const timer=window.setInterval(()=>setClock(new Date()),15000);return()=>window.clearInterval(timer)},[]);
 useEffect(()=>()=>{if(context.current){void context.current.close();context.current=null}},[]);
 const current=now??clock;
 const overdue=useMemo(()=>tasks.filter(t=>
   t.category==="medicacao"&&!t.completed_at&&
   day(new Date(t.scheduled_at))===day(current)&&
   current.getTime()-new Date(t.scheduled_at).getTime()>MINUTES*60_000
  ).sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at)),[tasks,current]);
 const first=overdue[0];
 useEffect(()=>{
   if(!sound||!first||!context.current||Date.now()-lastPlayed.current<300000)return;
   const instance=context.current;
   lastPlayed.current=Date.now();
   void instance.resume().then(()=>playGentleChime(instance)).catch(()=>setSoundError("Som bloqueado pelo navegador. O aviso visual permanece ativo."));
 },[sound,first?.id,clock]);
 async function toggleSound(){
   if(sound){setSound(false);setSoundError("");return}
   try{
     const ctx=context.current??new AudioContext();
     context.current=ctx;
     await ctx.resume();
     setSound(true);setSoundError("");lastPlayed.current=Date.now();
     if(first)playGentleChime(ctx);
   }catch{setSound(false);setSoundError("Toque novamente para habilitar o som; este navegador pode restringir alertas de áudio.");}
 }
 if(!first)return null;
 const minutes=Math.max(0,Math.floor((current.getTime()-Date.parse(first.scheduled_at))/60000));
 return <section role="alert" aria-live="polite" aria-label="Dose de medicação não confirmada" className={`rounded-xl border border-amber-400/70 bg-amber-100/95 text-amber-950 shadow-sm dark:border-amber-500/50 dark:bg-[#412d17] dark:text-amber-50 ${compact?"p-2.5":"p-3"}`}>
   <div className="flex items-start gap-2.5">
     <svg viewBox="0 0 56 56" className="h-10 w-10 shrink-0" role="img" aria-label="Alerta de medicação atrasada">
       <circle cx="28" cy="28" r="25" fill="#ffcf70" stroke="#d88a22" strokeWidth="2"/>
       <path d="M28 12a14 14 0 0 0-14 14v8l-4 5h36l-4-5v-8a14 14 0 0 0-14-14Z" fill="#9c560c"/>
       <path d="M24 45h8" stroke="#9c560c" strokeWidth="4" strokeLinecap="round"/>
       <circle cx="28" cy="27" r="3" fill="#ffefc9"/>
     </svg>
     <div className="min-w-0 flex-1">
       <div className="flex flex-wrap items-center gap-2"><strong className="text-xs font-extrabold">Medicação não confirmada</strong><span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold dark:bg-amber-900/70">Atraso: {Math.floor(minutes/60)}h {String(minutes%60).padStart(2,"0")}min</span></div>
       <p className="mt-0.5 text-xs">{first.title} · previsto às <strong>{shortTime(first.scheduled_at)}</strong>{overdue.length>1?` · +${overdue.length-1} pendente(s)`:""}</p>
       <p className="mt-1 text-[11px] opacity-85">Este aviso continua até haver registro. Se esqueceu uma dose, siga as orientações prescritas; não dobre a medicação.</p>
     </div>
   </div>
   <div className="mt-2 flex flex-wrap items-center gap-2">
     <button type="button" onClick={()=>onConfirm(first)} className="inline-flex items-center gap-1 rounded-lg bg-amber-900 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800 dark:bg-amber-300 dark:text-[#34210b]"><Pill size={14}/> Verificar / confirmar</button>
     <button type="button" onClick={()=>void toggleSound()} aria-pressed={sound} className="inline-flex items-center gap-1 rounded-lg border border-amber-700/30 px-3 py-2 text-xs font-semibold">{sound?<BellOff size={14}/>:<Bell size={14}/>} {sound?"Silenciar som":"Ativar som"}</button>
     <span className="ml-auto flex items-center gap-1 text-[10px] opacity-80"><Clock3 size={12}/> Monitoramento ativo</span>
   </div>
   {soundError&&<p className="mt-1 text-xs">{soundError}</p>}
 </section>;
}
