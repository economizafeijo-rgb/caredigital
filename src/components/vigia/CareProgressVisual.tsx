import { useId } from "react";
import type { HydrationGoalSnapshot } from "@/lib/hydration-goal";
import type { ReminderTask } from "@/lib/care-reminders";

type Props={tasks:ReminderTask[];goal:HydrationGoalSnapshot|null;onOpen?:(task:ReminderTask)=>void;};

const pct=(numerator:number,denominator:number)=>denominator>0?
  Math.max(0,Math.min(1,numerator/denominator)):0;

function WaterVessel({amount,target}: {amount:number;target:number}){
  const id=useId().replace(/:/g,"");
  const clip="waterClip"+id, gradient="waterFill"+id;
  const level=pct(amount,target);
  const bottle=target>=2000;
  const waterHeight=level*77;
  const y=103-waterHeight;
  return <svg aria-hidden="true" className="care-progress-svg care-progress-water-visual"
    viewBox="0 0 104 126" width="73" height="88">
    <defs>
      <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#79f4ee"/><stop offset="1" stopColor="#0ea5e9"/>
      </linearGradient>
      {bottle?
        <clipPath id={clip}><path d="M43 22h18v8c0 6 14 16 14 29v43c0 8-5 11-13 11H42c-8 0-13-3-13-11V59c0-13 14-23 14-29Z"/></clipPath>:
        <clipPath id={clip}><path d="M27 28h50l-6 72c-1 9-5 13-14 13H47c-9 0-13-4-14-13Z"/></clipPath>}
    </defs>
    <ellipse cx="52" cy="118" rx="36" ry="5" fill="#0a718e" opacity=".14"/>
    {bottle?<g>
      <rect x="40" y="12" width="24" height="14" rx="4" fill="#57ced8" stroke="#158ca7" strokeWidth="2"/>
      <path d="M43 22h18v8c0 6 14 16 14 29v43c0 8-5 11-13 11H42c-8 0-13-3-13-11V59c0-13 14-23 14-29Z"
        fill="rgba(255,255,255,.64)" stroke="#2b98af" strokeWidth="2.6"/>
    </g>:<path d="M27 28h50l-6 72c-1 9-5 13-14 13H47c-9 0-13-4-14-13Z"
      fill="rgba(255,255,255,.65)" stroke="#2b98af" strokeWidth="2.6"/>}
    <g clipPath={"url(#"+clip+")"}>
      <rect className="care-water-fill" x="24" y={y} width="56" height={waterHeight+11}
        fill={"url(#"+gradient+")"}/>
      {level>0&&<path className="care-water-wave"
        d={"M22 "+(y+2)+" Q32 "+(y-2)+" 42 "+(y+2)+" T62 "+(y+2)+" T82 "+(y+2)}
        fill="none" stroke="#d1fffa" strokeWidth="3" opacity=".9"/>}
      <path d="M41 38q-7 13-7 31v29" fill="none" stroke="white" strokeWidth="3" opacity=".55" strokeLinecap="round"/>
    </g>
    {bottle?<path d="M37 73h30v20H37Z" rx="5" fill="rgba(255,255,255,.45)" stroke="#5dc4d6" strokeWidth="1" />:null}
    <g fill="#06768c" opacity=".58">
      <circle cx="67" cy="64" r="2.2"/><circle cx="60" cy="79" r="1.6"/>
    </g>
  </svg>;
}
function MealPlate({ratio}: {ratio:number}){
  const id=useId().replace(/:/g,"");
  return <svg aria-hidden="true" className="care-progress-svg" viewBox="0 0 104 104" width="72" height="82">
    <defs><linearGradient id={"plate"+id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#86efac"/><stop offset="1" stopColor="#34d399"/>
    </linearGradient></defs>
    <circle cx="52" cy="50" r="41" fill="#dffbef" stroke="#87d6b1" strokeWidth="2"/>
    <circle cx="52" cy="50" r="33" fill="#fff" stroke="#b0ead2" strokeWidth="6"/>
    <circle cx="52" cy="50" r="26" fill={"url(#plate"+id+")"} opacity=".16"/>
    <circle cx="52" cy="50" r="37" fill="none" stroke="#0f9f7f"
      strokeWidth="5" strokeLinecap="round"
      strokeDasharray={2*Math.PI*37} strokeDashoffset={2*Math.PI*37*(1-ratio)}
      transform="rotate(-90 52 50)" className="care-progress-ring"/>
    <g stroke="#168465" strokeWidth="3" strokeLinecap="round" fill="none">
      <path d="M40 29v15m-5-15v14m10-14v14m-10 0q5 8 10 0v26m17-40v40m-7-36q7-8 7-4"/>
    </g>
    <circle cx="75" cy="24" r="8" fill="#abf7cb" opacity=".6"/>
  </svg>;
}
function MedicationCapsule({ratio}: {ratio:number}){
  return <svg aria-hidden="true" className="care-progress-svg" viewBox="0 0 104 104" width="72" height="82">
    <circle cx="52" cy="50" r="42" fill="#e4e8ff" stroke="#b8c5ff" strokeWidth="2"/>
    <circle cx="52" cy="50" r="36" fill="none" stroke="#9ca3f5" strokeWidth="5" opacity=".25"/>
    <circle cx="52" cy="50" r="36" fill="none" stroke="#6d5ce7" strokeWidth="5" strokeLinecap="round"
      strokeDasharray={2*Math.PI*36} strokeDashoffset={2*Math.PI*36*(1-ratio)}
      transform="rotate(-90 52 50)" className="care-progress-ring"/>
    <g transform="rotate(-39 52 50)">
      <rect x="39" y="22" width="26" height="56" rx="13" fill="#f7f7ff" stroke="#7768d8" strokeWidth="3"/>
      <path d="M39 50h26v15a13 13 0 0 1-26 0Z" fill="#8f7aff"/>
      <path d="M39 50h26" stroke="#7768d8" strokeWidth="3"/>
      <path d="M45 34v10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
    </g>
    <circle cx="76" cy="19" r="7" fill="#a9a3ff" opacity=".5"/>
  </svg>;
}

export function CareProgressVisual({tasks,goal,onOpen}:Props){
  const meds=tasks.filter(t=>t.category==="medicacao");
  const meals=tasks.filter(t=>t.category==="refeicao");
  const completedMeds=meds.filter(t=>Boolean(t.completed_at)).length;
  const completedMeals=meals.filter(t=>Boolean(t.completed_at)).length;
  const waterTarget=goal?.target_ml??0, water=goal?.consumed_ml??0;
  const waterRatio=pct(water,waterTarget);
  const fmt=(value:number)=>value.toLocaleString("pt-BR");
  const open=(category:string)=>{
    const first=tasks.find(t=>t.category===category&&!t.completed_at);
    if(first)onOpen?.(first);
  };

  return <section aria-label="Progresso ilustrado do cuidado de hoje"
    className="care-visual-progress grid min-w-0 grid-cols-3 gap-1.5 sm:gap-2">
    <article data-visual="water" className="care-visual-tile relative flex min-w-0 items-center gap-1.5 overflow-hidden rounded-2xl border px-1.5 py-1.5 sm:gap-2 sm:px-2.5">
      <WaterVessel amount={water} target={waterTarget}/>
      <div className="min-w-0 flex-1">
        <p className="care-visual-title truncate text-[10px] font-extrabold sm:text-xs">Hidratação</p>
        <strong className="care-visual-value block text-[13px] font-extrabold tabular-nums sm:text-base">{fmt(water)}<span className="text-[9px]"> ml</span></strong>
        <p className="care-visual-subtitle truncate text-[9px]">{waterTarget? `de ${fmt(waterTarget)} ml`:"Sem meta definida"}</p>
        <div className="care-visual-track mt-1 h-1 overflow-hidden rounded-full"><i style={{width:(waterRatio*100)+"%"}}/></div>
      </div>
    </article>
    <button type="button" data-visual="meals" onClick={()=>open("refeicao")}
      disabled={!meals.some(t=>!t.completed_at)}
      title="Consultar a próxima refeição programada"
      className="care-visual-tile relative flex min-w-0 items-center gap-1.5 overflow-hidden rounded-2xl border px-1.5 py-1.5 text-left sm:gap-2 sm:px-2.5 disabled:cursor-default">
      <MealPlate ratio={pct(completedMeals,meals.length)}/>
      <span className="min-w-0 flex-1">
        <span className="care-visual-title block truncate text-[10px] font-extrabold sm:text-xs">Alimentação</span>
        <strong className="care-visual-value block text-[13px] font-extrabold tabular-nums sm:text-base">{completedMeals}<span className="text-[10px]">/{meals.length}</span></strong>
        <span className="care-visual-subtitle block truncate text-[9px]">refeições confirmadas</span>
        <span className="care-visual-track mt-1 block h-1 overflow-hidden rounded-full"><i style={{width:(pct(completedMeals,meals.length)*100)+"%"}}/></span>
      </span>
    </button>
    <button type="button" data-visual="medicine" onClick={()=>open("medicacao")}
      disabled={!meds.some(t=>!t.completed_at)}
      title="Consultar a próxima medicação programada"
      className="care-visual-tile relative flex min-w-0 items-center gap-1.5 overflow-hidden rounded-2xl border px-1.5 py-1.5 text-left sm:gap-2 sm:px-2.5 disabled:cursor-default">
      <MedicationCapsule ratio={pct(completedMeds,meds.length)}/>
      <span className="min-w-0 flex-1">
        <span className="care-visual-title block truncate text-[10px] font-extrabold sm:text-xs">Medicação</span>
        <strong className="care-visual-value block text-[13px] font-extrabold tabular-nums sm:text-base">{completedMeds}<span className="text-[10px]">/{meds.length}</span></strong>
        <span className="care-visual-subtitle block truncate text-[9px]">doses confirmadas</span>
        <span className="care-visual-track mt-1 block h-1 overflow-hidden rounded-full"><i style={{width:(pct(completedMeds,meds.length)*100)+"%"}}/></span>
      </span>
    </button>
  </section>;
}
