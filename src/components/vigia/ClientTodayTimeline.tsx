import { CalendarDays, CheckCircle2, Clock3, Droplets, Pill, Utensils } from "lucide-react";
import { canConfirmCare, careScheduleLabel, getCareScheduleState } from "@/lib/care-schedule";

export type CareTimelineTask = {
  id:string; patient_id:string; title:string; category:string; scheduled_at:string; completed_at:string|null;
};

type Props = {tasks:CareTimelineTask[]; onConfirm:(task:CareTimelineTask)=>void; onDetails?:(task:CareTimelineTask)=>void; now?: number};

const timezone="America/Rio_Branco";
const at=(iso:string)=>new Intl.DateTimeFormat("pt-BR",{
  timeZone:timezone,hour:"2-digit",minute:"2-digit",hour12:false,
}).format(new Date(iso));

const category = {
  medicacao:{label:"Medicação", icon:Pill},
  hidratacao:{label:"Hidratação", icon:Droplets},
  refeicao:{label:"Refeição", icon:Utensils},
} as const;

export function ClientTodayTimeline({tasks,onConfirm,onDetails,now=Date.now()}:Props) {
  const sorted=[...tasks].sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at));
  const done=sorted.filter(task=>Boolean(task.completed_at));
  const open=sorted.filter(task=>!task.completed_at);
  const selected=[
    ...done.slice(-1),
    ...open.slice(0,3-(done.length?1:0)),
  ];
  if(selected.length<3) {
    const ids=new Set(selected.map(task=>task.id));
    for(const task of sorted) {
      if(selected.length>=3)break;
      if(!ids.has(task.id)){selected.push(task);ids.add(task.id)}
    }
  }
  return <section className="care-timeline shrink-0 rounded-2xl border border-border bg-muted/35 px-3 py-2 sm:px-4" aria-label="Rotina de cuidados de hoje">
    <div className="flex min-w-0 items-center gap-3">
      <div className="care-timeline-heading flex shrink-0 items-center gap-2 border-r border-border pr-3 sm:pr-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CalendarDays size={19}/></span>
        <span className="hidden lg:block"><strong className="block text-sm font-extrabold text-foreground">Rotina de hoje</strong><small className="block text-[10px] text-muted-foreground">Cuidados programados</small></span>
      </div>
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
        {selected.map(task=>{
          const ItemIcon=category[task.category as keyof typeof category]?.icon??Clock3;
          const title=category[task.category as keyof typeof category]?.label??"Cuidado";
          const complete=Boolean(task.completed_at);
          const state=getCareScheduleState(task,now);
          const available=canConfirmCare(task,now);
          return <button type="button" key={task.id}
              onClick={()=>onDetails?onDetails(task):available?onConfirm(task):undefined}
              aria-label={complete?`${title} confirmado às ${at(task.completed_at!)}`:`${title} previsto para ${at(task.scheduled_at)}: ${careScheduleLabel(task,now)}`}
              className={`care-timeline-item group flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 ${complete?"border-success/30 bg-success/10":state==="missed"?"border-border bg-muted/65 opacity-70":available?"border-border bg-card hover:border-primary/45 hover:bg-primary/5":"border-border bg-card"}`}>
              <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${complete?"bg-success/10 text-success":"bg-primary/10 text-primary"}`}><ItemIcon size={17}/></span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-xs font-bold tabular-nums text-foreground">{complete?at(task.completed_at!):at(task.scheduled_at)} · {title}</strong>
                <span className="block truncate text-[10px] text-muted-foreground">{complete?"Registrado no prontuário":available?task.title:careScheduleLabel(task,now)}</span>
              </span>
              {complete&&<CheckCircle2 size={16} className="shrink-0 text-success"/>}
          </button>
        })}
        {!selected.length&&<p className="col-span-full py-2 text-xs text-muted-foreground">Ainda não há atividades programadas para hoje.</p>}
      </div>
    </div>
  </section>;
}
