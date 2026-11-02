import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3,
  Coffee, Info, Search, Trash2, UtensilsCrossed,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ClientQuickIntake } from "./ClientQuickIntake";
import { getCareIntakeIcon } from "./CareIntakePicker";
import type { FoodKind } from "@/lib/care-intake-categories";
import { careReminderState, reminderClock, type ReminderTask } from "@/lib/care-reminders";
type PatientCare = ReminderTask & {patient_id:string};

type Props={
  patientId:string;
  ownerId:string;
  meals:PatientCare[];
  resolved?:Record<string,string>;
  revision:number;
  now?:number;
  onView:(task:PatientCare)=>void;
  onConfirm:(task:PatientCare)=>void;
  onDelete:(task:PatientCare)=>void;
  onRecorded:()=>void;
};

type MealDetail={task_id:string;description:string;recorded_at:string|null};
const PAGE_SIZE=4;
const mealKind=(title:string):FoodKind=>{
  if(/café da manhã|cafe da manha/i.test(title))return "cafe_manha";
  if(/almoço|almoco/i.test(title))return "almoco";
  if(/jantar/i.test(title))return "jantar";
  if(/ceia/i.test(title))return "ceia";
  if(/lanche|colação|colacao/i.test(title))return "lanche";
  if(/fruta/i.test(title))return "fruta";
  if(/salada/i.test(title))return "salada";
  if(/sopa|caldo/i.test(title))return "sopa";
  if(/sobremesa/i.test(title))return "sobremesa";
  return "refeicao";
};
const foodIcon=(title:string)=>getCareIntakeIcon(mealKind(title))??UtensilsCrossed;

export function ClientMealsPage({patientId,ownerId,meals,resolved={},revision,now=Date.now(),onView,onConfirm,onDelete,onRecorded}:Props){
  const [details,setDetails]=useState<MealDetail[]>([]);
  const [detailsError,setDetailsError]=useState(false);
  const [filter,setFilter]=useState<"todos"|"confirmados"|"pendentes">("todos");
  const [query,setQuery]=useState("");
  const [page,setPage]=useState(0);
  useEffect(()=>{
    if(!patientId||!ownerId)return;
    let active=true;
    void (async()=>{
      const result=await (supabase as any).from("care_meal_details")
        .select("task_id,description,recorded_at")
        .eq("patient_id",patientId).eq("owner_id",ownerId).limit(120);
      if(active){
        setDetails(result.error?[]:result.data??[]);
        setDetailsError(Boolean(result.error));
      }
    })();
    return()=>{active=false};
  },[patientId,ownerId,revision]);
  const byTask=useMemo(()=>new Map(details.map(m=>[m.task_id,m])),[details]);
  const confirmed=meals.filter(m=>Boolean(m.completed_at)).length;
  const pending=meals.filter(meal=>!meal.completed_at&&!resolved[meal.id]).length;
  const filtered=useMemo(()=>meals.filter(meal=>{
    if(filter==="confirmados"&&!meal.completed_at)return false;
    if(filter==="pendentes"&&meal.completed_at)return false;
    const mealDetail=byTask.get(meal.id);
    const haystack=(meal.title+" "+(mealDetail?.description??"")).toLocaleLowerCase("pt-BR");
    return !query.trim()||haystack.includes(query.trim().toLocaleLowerCase("pt-BR"));
  }).sort((a,b)=>Date.parse(a.scheduled_at)-Date.parse(b.scheduled_at)),[meals,byTask,filter,query]);
  const count=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const current=Math.min(page,count-1);
  const visible=filtered.slice(current*PAGE_SIZE,(current+1)*PAGE_SIZE);
  function setStatus(value:typeof filter){setFilter(value);setPage(0);}

  return <div className="care-page-meals flex h-full min-h-0 min-w-0 flex-col gap-3">
    <div className="care-meals-actions flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/[.06] p-3">
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
          <UtensilsCrossed size={17} className="text-emerald-600 dark:text-emerald-300"/> Alimentação de hoje
        </h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {confirmed} de {meals.length} refeições confirmadas · {pending} sem confirmação
        </p>
      </div>
      <ClientQuickIntake patientId={patientId} variant="panel" mode="food" onRecorded={onRecorded}/>
    </div>
    <div className="care-page-meals-filters flex shrink-0 flex-wrap items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-1 rounded-xl border border-border bg-muted/35 p-1">
        {([
          {key:"todos",label:"Todas"},
          {key:"confirmados",label:"Confirmadas"},
          {key:"pendentes",label:"Não confirmadas"}
        ] as const).map(option=><button key={option.key} type="button"
          aria-pressed={filter===option.key} onClick={()=>setStatus(option.key)}
          className={"min-w-0 flex-1 rounded-lg px-2 py-2 text-[10px] font-bold transition-colors sm:text-xs "+
            (filter===option.key?"bg-primary text-primary-foreground":"text-muted-foreground hover:bg-card")}>
          {option.label}
        </button>)}
      </div>
      <label className="relative block w-full min-w-[180px] flex-1 sm:max-w-[260px]">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
        <input type="search" aria-label="Buscar refeição ou alimento"
          className="h-10 w-full rounded-xl border border-border bg-card pl-8 pr-3 text-xs text-foreground"
          value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}
          placeholder="Buscar alimento ou refeição…"/>
      </label>
    </div>
    {detailsError&&<div role="status" className="shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/[.065] px-3 py-2 text-[11px] text-foreground">
      A agenda foi carregada, mas as descrições das refeições não estão disponíveis no momento.
    </div>}
    <div className="care-page-meals-list min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
      <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2">
        {visible.map(meal=>{
          const Icon=foodIcon(meal.title);
          const detail=byTask.get(meal.id);
          const status=careReminderState(meal,now);
          const confirmedMeal=Boolean(meal.completed_at);
          const response=resolved[meal.id];
          return <article key={meal.id} data-food-category={mealKind(meal.title)}
            className={"care-meal-record flex min-w-0 flex-col gap-2 rounded-2xl border p-3 "+
              (confirmedMeal?"border-emerald-500/25 bg-emerald-500/[.05]":"border-border bg-card/90")}>
            <div className="flex min-w-0 items-start gap-2">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><Icon size={20}/></span>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-extrabold leading-snug text-foreground">{meal.title}</h4>
                <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                  <Clock3 size={12} className="mr-1 inline"/>{reminderClock(meal.scheduled_at)} · Horário programado
                </p>
              </div>
              {confirmedMeal&&<CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-300"/>}
            </div>
            <div className="min-h-[40px] rounded-xl border border-border/50 bg-background/50 px-3 py-2">
              {confirmedMeal&&detail?.description?
                <p className="line-clamp-3 break-words text-[11px] leading-snug text-foreground">{detail.description}</p>:
                confirmedMeal?
                  <p className="text-[11px] text-muted-foreground">Refeição confirmada; descrição não informada.</p>:
                  <p className="text-[11px] text-muted-foreground">Aguardando o registro dos alimentos consumidos.</p>}
            </div>
            <div className="flex min-h-8 flex-wrap items-center justify-between gap-1.5 border-t border-border/60 pt-2">
              <span className={"text-[10px] font-semibold "+(confirmedMeal?
                "text-emerald-700 dark:text-emerald-300":status==="unconfirmed"?
                "text-amber-700 dark:text-amber-300":"text-muted-foreground")}>
                {confirmedMeal?"Confirmada às "+reminderClock(meal.completed_at!):
                  response==="cancelado"?"Cancelada · resposta registrada":
                  response==="nao_cumprido"?"Não comi · resposta registrada":
                  status==="unconfirmed"?"Sem confirmação no prazo":
                  status==="due"?"Disponível para registrar":"Aguardando horário"}
              </span>
              <div className="flex gap-1.5">
                <button type="button" onClick={()=>onView(meal)}
                  className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[10px] font-bold text-foreground">
                  Ver detalhes
                </button>
                {!confirmedMeal&&!response&&status!=="waiting"&&<button type="button" onClick={()=>onConfirm(meal)}
                  className="rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-extrabold text-primary-foreground">
                  Registrar
                </button>}
                <button type="button" onClick={()=>onDelete(meal)} title="Excluir com confirmação e registro de auditoria"
                  aria-label={"Excluir "+meal.title}
                  className="rounded-lg border border-destructive/25 px-2 py-1.5 text-destructive hover:bg-destructive/5">
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
          </article>;
        })}
      </div>
      {!visible.length&&<div className="rounded-xl border border-dashed border-border p-5 text-center">
        <CalendarDays size={18} className="mx-auto text-muted-foreground"/>
        <p className="mt-1 text-xs text-muted-foreground">Não há refeições para os filtros selecionados.</p>
      </div>}
    </div>
    <nav aria-label="Paginação das refeições" className="flex shrink-0 items-center justify-between gap-2 border-t border-border/60 pt-2">
      <button type="button" disabled={current===0} onClick={()=>setPage(n=>Math.max(0,n-1))}
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] font-bold text-foreground disabled:opacity-40">
        <ChevronLeft size={14}/>Anterior</button>
      <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">Página {current+1} de {count}</span>
      <button type="button" disabled={current===count-1} onClick={()=>setPage(n=>Math.min(count-1,n+1))}
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] font-bold text-foreground disabled:opacity-40">
        Próxima<ChevronRight size={14}/></button>
    </nav>
    <p className="shrink-0 text-[10px] text-muted-foreground">
      As descrições são registros informados pelo paciente. A confirmação do sistema não avalia o valor nutricional da refeição.
    </p>
  </div>;
}
