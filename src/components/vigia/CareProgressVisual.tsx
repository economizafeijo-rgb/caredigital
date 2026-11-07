import { Droplets, Utensils, Pill, BellRing } from "lucide-react";
import type { HydrationGoalSnapshot } from "@/lib/hydration-goal";
import type { ReminderTask } from "@/lib/care-reminders";

type Props={tasks:ReminderTask[];goal:HydrationGoalSnapshot|null;recordedMealCount?:number|null;mealRecordsStatus?:"loading"|"error"|"ready";
  alertCategories?:Array<"hidratacao"|"refeicao"|"medicacao">;
  nowMs?:number;
  resolvedTaskIds?:string[];
  onOpen?:(task:ReminderTask)=>void;
  onHydration?:()=>void;onFood?:()=>void;onMedication?:()=>void;
};

const pct=(numerator:number,denominator:number)=>denominator>0?
  Math.max(0,Math.min(1,numerator/denominator)):0;

// Decorative SVG artwork removed: the original illustrations were rendering as corrupted textures in the live dashboard.

export function CareProgressVisual({tasks,goal,recordedMealCount,mealRecordsStatus="ready",onOpen,onHydration,onFood,onMedication,alertCategories=[],nowMs,resolvedTaskIds=[]}:Props){
  const alertWater=alertCategories.includes("hidratacao");
  const alertFood=alertCategories.includes("refeicao");
  const alertMedicine=alertCategories.includes("medicacao");
  const urgency=(category:"hidratacao"|"refeicao"|"medicacao")=>{
    if(nowMs===undefined)return "idle";
    const pending=tasks.filter(t=>t.category===category&&!t.completed_at&&!resolvedTaskIds.includes(t.id));
    if(pending.some(t=>Date.parse(t.scheduled_at)<=nowMs))return "due";
    if(pending.some(t=>{const remaining=Date.parse(t.scheduled_at)-nowMs;return remaining>0&&remaining<=15*60*1000;}))return "soon";
    return "idle";
  };
  const hydrationMet=Boolean(goal?.target_ml && goal.target_ml>0 && (goal.status==="atingida" || (goal.consumed_ml??0)>=goal.target_ml));
  const waterUrgency=hydrationMet?"idle":alertWater?"due":urgency("hidratacao");
  const foodUrgency=alertFood?"due":urgency("refeicao");
  const medicineUrgency=alertMedicine?"due":urgency("medicacao");
  const meds=tasks.filter(t=>t.category==="medicacao");
  const meals=tasks.filter(t=>t.category==="refeicao");
  const completedMeds=meds.filter(t=>Boolean(t.completed_at)).length;
  const completedMeals=meals.filter(t=>Boolean(t.completed_at)).length;
  const mealCountValue=recordedMealCount===undefined?completedMeals:recordedMealCount;
  const waterTarget=goal?.target_ml??0, water=goal?.consumed_ml??0;
  const waterRatio=pct(water,waterTarget);
  const fmt=(value:number)=>value.toLocaleString("pt-BR");
  const open=(category:"hidratacao"|"refeicao"|"medicacao")=>{
    // Existing confirmed events are never modified by clicking a summary.
    // Prefer the owning page's verified registration flow; retain a fallback
    // for other callers using the older onOpen API.
    const direct={hidratacao:onHydration,refeicao:onFood,medicacao:onMedication}[category];
    if(direct){direct();return;}
    const first=tasks.find(t=>t.category===category&&!t.completed_at);
    if(first)onOpen?.(first);
  };

  return <section aria-label="Progresso ilustrado do cuidado de hoje"
    className="care-visual-progress grid min-w-0 grid-cols-3 gap-1.5 sm:gap-2">
    <button type="button" data-visual="water" data-care-alert={waterUrgency==="idle"?undefined:waterUrgency} data-action="register-hydration"
      onClick={()=>open("hidratacao")}
      title="Registrar água ou conferir hidratação" aria-label={alertWater?"Hidratação. Cuidado programado pendente. Abrir registro.":"Hidratação. Abrir registro de água."}
      className="care-visual-tile care-visual-action relative flex min-w-0 items-center gap-1.5 overflow-hidden rounded-2xl border px-1.5 py-1.5 text-left sm:gap-2 sm:px-2.5">
      <div className="care-reference-tile-top"><Droplets size={24}/><span className="care-reference-ring" style={{"--care-ratio":`${Math.round(waterRatio*100)}%`} as React.CSSProperties}>{Math.round(waterRatio*100)}%</span></div>
      <div className="min-w-0 flex-1">
        <p className="care-visual-title truncate text-[10px] font-extrabold sm:text-xs">Hidratação</p>
        <strong className="care-visual-value block text-[13px] font-extrabold tabular-nums sm:text-base">{fmt(water)}<span className="text-[9px]"> ml</span></strong>
        <p className="care-visual-subtitle truncate text-[9px]">{waterTarget? `de ${fmt(waterTarget)} ml`:"Sem meta definida"}</p>
        <div className="care-visual-track mt-1 h-1 overflow-hidden rounded-full"><i style={{width:(waterRatio*100)+"%"}}/></div>
      </div>
    {waterUrgency!=="idle"&&<span className="care-tile-alert-label" aria-label="Cuidado programado aguardando confirmação"><BellRing size={12} aria-hidden="true"/> {waterUrgency==="soon"?"Em breve":"Ação pendente"}</span>}</button>
    <button type="button" data-visual="meals" data-care-alert={foodUrgency==="idle"?undefined:foodUrgency} data-action="register-food"
      onClick={()=>open("refeicao")}
      title="Registrar uma refeição ou alimento" aria-label={alertFood?"Alimentação. Cuidado programado pendente. Abrir registro.":"Alimentação. Abrir registro de refeição ou alimento."}
      className="care-visual-tile care-visual-action relative flex min-w-0 items-center gap-1.5 overflow-hidden rounded-2xl border px-1.5 py-1.5 text-left sm:gap-2 sm:px-2.5">
      <div className="care-reference-tile-top"><Utensils size={24}/><span className="care-reference-ring" style={{"--care-ratio":`${Math.round(pct(completedMeals,meals.length)*100)}%`} as React.CSSProperties}>{Math.round(pct(completedMeals,meals.length)*100)}%</span></div>
      <span className="min-w-0 flex-1">
        <span className="care-visual-title block truncate text-[10px] font-extrabold sm:text-xs">Alimentação</span>
        <strong className="care-visual-value block text-[13px] font-extrabold tabular-nums sm:text-base">{mealCountValue===null?"—":fmt(mealCountValue)}</strong>
        <span className="care-visual-subtitle block truncate text-[9px]">{mealCountValue===null?"Consultando registros":mealRecordsStatus==="error"?`Contagem parcial · ${completedMeals}/${meals.length} confirmadas`:`refeições registradas · ${completedMeals}/${meals.length} confirmadas`}</span>
        <span className="care-visual-track mt-1 block h-1 overflow-hidden rounded-full"><i style={{width:(pct(completedMeals,meals.length)*100)+"%"}}/></span>
      </span>
    {foodUrgency!=="idle"&&<span className="care-tile-alert-label" aria-label="Cuidado programado aguardando confirmação"><BellRing size={12} aria-hidden="true"/> {foodUrgency==="soon"?"Em breve":"Ação pendente"}</span>}</button>
    <button type="button" data-visual="medicine" data-care-alert={medicineUrgency==="idle"?undefined:medicineUrgency} data-action="register-medication"
      onClick={()=>open("medicacao")}
      title="Abrir registro ou histórico de medicação" aria-label={alertMedicine?"Medicação. Cuidado programado pendente. Abrir registro.":"Medicação. Abrir registro de medicação ou detalhes das doses."}
      className="care-visual-tile care-visual-action relative flex min-w-0 items-center gap-1.5 overflow-hidden rounded-2xl border px-1.5 py-1.5 text-left sm:gap-2 sm:px-2.5">
      <div className="care-reference-tile-top"><Pill size={24}/><span className="care-reference-ring" style={{"--care-ratio":`${Math.round(pct(completedMeds,meds.length)*100)}%`} as React.CSSProperties}>{Math.round(pct(completedMeds,meds.length)*100)}%</span></div>
      <span className="min-w-0 flex-1">
        <span className="care-visual-title block truncate text-[10px] font-extrabold sm:text-xs">Medicação</span>
        <strong className="care-visual-value block text-[13px] font-extrabold tabular-nums sm:text-base">{completedMeds}<span className="text-[10px]">/{meds.length}</span></strong>
        <span className="care-visual-subtitle block truncate text-[9px]">doses confirmadas</span>
        <span className="care-visual-track mt-1 block h-1 overflow-hidden rounded-full"><i style={{width:(pct(completedMeds,meds.length)*100)+"%"}}/></span>
      </span>
    {medicineUrgency!=="idle"&&<span className="care-tile-alert-label" aria-label="Cuidado programado aguardando confirmação"><BellRing size={12} aria-hidden="true"/> {medicineUrgency==="soon"?"Em breve":"Ação pendente"}</span>}</button>
  </section>;
}
