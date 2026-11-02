import { CalendarDays, CheckCircle2, ChevronRight, Clock3, Droplets, Pill, Sparkles, Utensils } from "lucide-react";
import { canConfirmCare, careScheduleLabel } from "@/lib/care-schedule";

export type CareTimelineTask = {
  id:string; patient_id:string; title:string; category:string;
  scheduled_at:string; completed_at:string|null;
};
type Props = {
  tasks:CareTimelineTask[];
  onConfirm:(task:CareTimelineTask)=>void;
  onDetails?:(task:CareTimelineTask)=>void;
  now?:number;
};

const timezone = "America/Rio_Branco";
const at = (iso:string) => new Intl.DateTimeFormat("pt-BR", {
  timeZone:timezone,hour:"2-digit",minute:"2-digit",hour12:false,
}).format(new Date(iso));

type Kind = "hidratacao" | "refeicao" | "suplementacao" | "medicacao" | "outro";
export const careTimelineKind = (task:CareTimelineTask):Kind => {
  if (/(suplement|vitamina|creatina|whey|ômega|omega|minerais|magnésio|magnesio)/i.test(task.title)) return "suplementacao";
  if (task.category === "hidratacao" || task.category === "refeicao" || task.category === "medicacao") return task.category;
  return "outro";
};
const kindStyle = {
  hidratacao:{label:"Hidratação",icon:Droplets,classes:"border-sky-500/30 bg-sky-500/[.075] hover:bg-sky-500/15",iconClass:"text-sky-600 dark:text-sky-300",color:"bg-sky-500"},
  refeicao:{label:"Refeição",icon:Utensils,classes:"border-emerald-500/30 bg-emerald-500/[.075] hover:bg-emerald-500/15",iconClass:"text-emerald-600 dark:text-emerald-300",color:"bg-emerald-500"},
  suplementacao:{label:"Suplementação",icon:Sparkles,classes:"border-violet-500/30 bg-violet-500/[.075] hover:bg-violet-500/15",iconClass:"text-violet-600 dark:text-violet-300",color:"bg-violet-500"},
  medicacao:{label:"Medicação",icon:Pill,classes:"border-amber-500/30 bg-amber-500/[.075] hover:bg-amber-500/15",iconClass:"text-amber-700 dark:text-amber-300",color:"bg-amber-500"},
  outro:{label:"Cuidado",icon:Clock3,classes:"border-border bg-muted/40 hover:bg-muted/65",iconClass:"text-muted-foreground",color:"bg-muted-foreground"},
} as const;

/**
 * A faixa prioriza os horários que AINDA VÃO OCORRER; registros antigos
 * não podem ocultar o próximo cuidado. Diversifica as categorias quando
 * há tarefas cadastradas, sem inventar uma suplementação inexistente.
 */
export function pickCareTimelineItems(tasks:CareTimelineTask[], now:number, limit=3) {
  const sorted=[...tasks].filter(task=>Number.isFinite(Date.parse(task.scheduled_at)))
    .sort((a,b)=>Date.parse(a.scheduled_at)-Date.parse(b.scheduled_at));
  const future=sorted.filter(task=>!task.completed_at && Date.parse(task.scheduled_at)>=now);
  const overdue=sorted.filter(task=>!task.completed_at && Date.parse(task.scheduled_at)<now).reverse();
  const completed=sorted.filter(task=>Boolean(task.completed_at))
    .sort((a,b)=>Date.parse(b.completed_at!)-Date.parse(a.completed_at!));
  const picked:CareTimelineTask[]=[];
  if(future.length){
    picked.push(future[0]);
    const chosenKinds=new Set<Kind>([careTimelineKind(future[0])]);
    for(const task of future.slice(1)){
      if(picked.length>=limit)break;
      const kind=careTimelineKind(task);
      if(!chosenKinds.has(kind)){picked.push(task);chosenKinds.add(kind);}
    }
    for(const task of future){if(picked.length>=limit)break;if(!picked.some(item=>item.id===task.id))picked.push(task);}
  }
  for(const task of overdue){if(picked.length>=limit)break;if(!picked.some(item=>item.id===task.id))picked.push(task);}
  for(const task of completed){if(picked.length>=limit)break;if(!picked.some(item=>item.id===task.id))picked.push(task);}
  return picked.sort((a,b)=>Date.parse(a.scheduled_at)-Date.parse(b.scheduled_at));
}

export function ClientTodayTimeline({tasks,onConfirm,onDetails,now=Date.now()}:Props) {
  const selected=pickCareTimelineItems(tasks,now);
  const next=tasks.filter(task=>!task.completed_at && Date.parse(task.scheduled_at)>=now)
    .sort((a,b)=>Date.parse(a.scheduled_at)-Date.parse(b.scheduled_at))[0];
  const supplementScheduled=tasks.some(task=>careTimelineKind(task)==="suplementacao");

  return <section className="care-timeline care-timeline-highlight relative shrink-0 overflow-hidden rounded-2xl border px-2.5 py-2 sm:px-3" aria-label="Próximos horários de cuidados">
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="care-timeline-heading flex w-[125px] shrink-0 items-center gap-2 border-r border-teal-700/20 pr-2 sm:w-[174px] dark:border-teal-200/20">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-teal-700 text-white shadow-sm shadow-teal-950/20 dark:bg-teal-300 dark:text-teal-950"><CalendarDays size={17}/></span>
        <span className="min-w-0"><strong className="block text-[12px] font-black text-teal-950 dark:text-teal-50">Próximos cuidados</strong><small className="block text-[10px] font-medium leading-tight text-teal-800/80 dark:text-teal-100/75"><span title={supplementScheduled?"Suplementação cadastrada na agenda":"Nenhuma suplementação cadastrada hoje"}>Água · Refeições · Suplementos</span></small></span>
      </div>
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-1.5 sm:grid-cols-3">
        {selected.map(task=>{
          const kind=careTimelineKind(task);
          const config=kindStyle[kind];
          const Icon=config.icon;
          const completed=Boolean(task.completed_at);
          const upcoming=task.id===next?.id;
          const past=Date.parse(task.scheduled_at)<now;
          const available=["hidratacao","refeicao","medicacao"].includes(task.category)&&canConfirmCare(task,now);
          const status=completed?"Confirmado":upcoming?"Próximo":past?(available?"Pendente · registrar":"Não confirmado"):"Programado";
          const statusClass=completed?"text-emerald-700 dark:text-emerald-300":upcoming?"text-primary font-bold":past?"text-amber-700 dark:text-amber-300":"text-muted-foreground";
          return <button key={task.id} type="button" data-next={upcoming?"true":undefined} onClick={()=>onDetails?onDetails(task):available?onConfirm(task):undefined}
            aria-label={`${config.label} às ${at(task.scheduled_at)}. ${status}. Abrir detalhes.`}
            title={`${task.title} · ${careScheduleLabel(task,now)}`}
            className={`care-timeline-item group relative flex min-w-0 items-center gap-2 rounded-xl border px-2 py-1.5 text-left shadow-sm transition duration-150 hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 ${config.classes} ${upcoming?"care-timeline-next ring-1 ring-teal-600/40 dark:ring-teal-200/45":""}`}>
            <span className={`absolute bottom-1.5 left-0.5 top-1.5 w-[3px] rounded-full ${config.color}`} aria-hidden="true"/>
            <span className={`care-timeline-item-icon grid size-8 shrink-0 place-items-center rounded-lg bg-background/65 ${config.iconClass}`}><Icon size={17}/></span>
            <span className="min-w-0 flex-1">
              <span className="care-timeline-item-title block truncate text-[12px] font-extrabold tabular-nums text-foreground">{at(task.scheduled_at)} · {config.label}</span>
              <span className={`care-timeline-item-status block truncate text-[10px] ${statusClass}`}>{status}{!completed && !upcoming && !past?" · "+task.title:""}</span>
            </span>
            {completed?<CheckCircle2 size={15} className="shrink-0 text-emerald-600 dark:text-emerald-300"/>:<ChevronRight size={15} className={`shrink-0 ${upcoming?"text-primary":"text-muted-foreground"}`}/>}
          </button>;
        })}
        {!selected.length&&<p className="col-span-full py-2 text-xs text-muted-foreground">Nenhum horário de hidratação, refeição ou outro cuidado programado para hoje.</p>}
      </div>
    </div>
  </section>;
}
