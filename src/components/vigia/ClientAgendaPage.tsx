import { useMemo, useState } from "react";
import {
  CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Droplets,
  Filter, Moon, Pill, Search, Sparkles, Sun, Sunrise, UtensilsCrossed,
} from "lucide-react";
import { CareTimer, toneForCategory } from "./CareTimer";
import { careReminderState, reminderClock, type ReminderTask } from "@/lib/care-reminders";
type PatientCare = ReminderTask & {patient_id:string};

type Props = {
  tasks: PatientCare[];
  resolved?: Record<string,string>;
  now?: number;
  onView: (task: PatientCare)=>void;
  onConfirm: (task: PatientCare)=>void;
};
type StatusFilter = "todos" | "confirmados" | "pendentes" | "resolvidos" | "futuros";
const MAX_ITEMS=6;
const fields=[
  {id:"todos",label:"Todas as atividades",icon:CalendarClock},
  {id:"medicacao",label:"Medicações",icon:Pill},
  {id:"hidratacao",label:"Hidratação",icon:Droplets},
  {id:"refeicao",label:"Refeições",icon:UtensilsCrossed},
  {id:"outro",label:"Suplementação",icon:Sparkles},
] as const;
const styles:Record<string,string>={
  medicacao:"care-agenda-medicine",
  hidratacao:"care-agenda-water",
  refeicao:"care-agenda-meals",
  outro:"care-agenda-supplements",
};
const IconFor:Record<string,typeof Pill>={
  medicacao:Pill,hidratacao:Droplets,refeicao:UtensilsCrossed,outro:Sparkles,
};

export function ClientAgendaPage({tasks,resolved={},now=Date.now(),onView,onConfirm}:Props){
  const [category,setCategory]=useState<string>("todos");
  const [status,setStatus]=useState<StatusFilter>("todos");
  const [query,setQuery]=useState("");
  const [page,setPage]=useState(0);
  const confirmed=tasks.filter(task=>Boolean(task.completed_at)).length;
  const available=tasks.filter(task=>!resolved[task.id]&&careReminderState(task,now)==="due").length;
  const late=tasks.filter(task=>!resolved[task.id]&&careReminderState(task,now)==="unconfirmed").length;
  const filtered=useMemo(()=>tasks
    .filter(task=>category==="todos"||task.category===category)
    .filter(task=>{
      const state=careReminderState(task,now);
      const answered=Boolean(resolved[task.id]);
      return status==="todos"||
        status==="confirmados"&&state==="confirmed"||
        status==="resolvidos"&&answered||
        status==="pendentes"&&!answered&&(state==="due"||state==="unconfirmed")||
        status==="futuros"&&!answered&&state==="waiting";
    })
    .filter(task=>!query.trim()||task.title.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")))
    .sort((a,b)=>Date.parse(a.scheduled_at)-Date.parse(b.scheduled_at)),[tasks,resolved,category,status,query,now]);
  const pages=Math.max(1,Math.ceil(filtered.length/MAX_ITEMS));
  const current=Math.min(page,pages-1);
  const displayed=filtered.slice(current*MAX_ITEMS,(current+1)*MAX_ITEMS);
  function changeCategory(newCategory:string){setCategory(newCategory);setPage(0);}
  function changeStatus(newStatus:StatusFilter){setStatus(newStatus);setPage(0);}

  const nextTask=tasks.filter(task=>!task.completed_at&&!resolved[task.id]&&Date.parse(task.scheduled_at)>=now-15*60_000).sort((a,b)=>Date.parse(a.scheduled_at)-Date.parse(b.scheduled_at))[0];
  const hourOf=(iso:string)=>Number(new Intl.DateTimeFormat("en-GB",{timeZone:"America/Rio_Branco",hour:"2-digit",hourCycle:"h23"}).format(new Date(iso)));
  const periods=[{label:"Manhã",icon:Sunrise,from:0,to:12,color:"from-amber-400 to-orange-500"},{label:"Tarde",icon:Sun,from:12,to:18,color:"from-sky-500 to-indigo-500"},{label:"Noite",icon:Moon,from:18,to:24,color:"from-violet-600 to-fuchsia-500"}]
    .map(period=>{const list=tasks.filter(task=>{const h=hourOf(task.scheduled_at);return h>=period.from&&h<period.to;});return {...period,total:list.length,done:list.filter(task=>task.completed_at).length};});
  const dayPct=tasks.length?Math.round(confirmed/tasks.length*100):0;
  return <div className="care-page-agenda care-premium-agenda flex h-full min-h-0 min-w-0 flex-col gap-3">
    <div className="grid shrink-0 gap-3 lg:grid-cols-[1.2fr_1fr]">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-950 via-indigo-900 to-fuchsia-800 p-5 text-white shadow-card" aria-label="Próximo cuidado da agenda">
        <img src="/images/painel-agenda.webp" alt="" aria-hidden="true" className="absolute inset-0 -z-0 h-full w-full object-cover opacity-15 mix-blend-luminosity"/>
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-white/70">Próximo da agenda</p>
          <div className="mt-3">{nextTask
            ? <CareTimer target={Date.parse(nextTask.scheduled_at)} title={nextTask.title} subtitle={fields.find(field=>field.id===nextTask.category)?.label??"Cuidado"} tone={toneForCategory(nextTask.category)} dark/>
            : <p className="py-4 text-base text-white/85">Nenhum cuidado pendente. Seu dia está em dia!</p>}</div>
          {nextTask&&<div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={()=>onConfirm(nextTask)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-violet-900 shadow-sm hover:bg-white/90"><CheckCircle2 size={18}/> Confirmar agora</button>
            <button type="button" onClick={()=>onView(nextTask)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur hover:bg-white/20">Ver detalhes</button>
          </div>}
        </div>
      </section>
      <section className="rounded-3xl border border-border bg-card p-5 shadow-card" aria-label="Progresso do dia">
        <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Seu dia</h3><span className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 py-1 text-sm font-bold text-white">{dayPct}%</span></div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[["Confirmados",confirmed,"text-emerald-600"],["Agora",available,"text-sky-600"],["Atrasados",late,"text-amber-600"]].map(([label,value,tone])=><div key={label as string} className="rounded-2xl bg-muted/60 p-3"><strong className={`block text-2xl font-extrabold tabular-nums ${tone}`}>{value}</strong><span className="text-xs font-semibold text-muted-foreground">{label}</span></div>)}
        </div>
        <ul className="mt-3 grid gap-2">{periods.map(period=>{const Icon=period.icon;const pct=period.total?Math.round(period.done/period.total*100):0;return <li key={period.label} className="flex items-center gap-3">
          <span className={`grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white ${period.color}`}><Icon size={17}/></span>
          <span className="min-w-0 flex-1"><span className="flex justify-between text-sm font-semibold"><span>{period.label}</span><span className="tabular-nums text-muted-foreground">{period.done}/{period.total}</span></span>
            <span className="mt-1 block h-2 overflow-hidden rounded-full bg-muted"><i className={`block h-full rounded-full bg-gradient-to-r ${period.color}`} style={{width:pct+"%"}}/></span></span>
        </li>;})}</ul>
      </section>
    </div>
    <div className="care-page-agenda-insights grid shrink-0 grid-cols-3 gap-2">
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[.075] px-3 py-2">
        <span className="block text-[11px] font-semibold text-muted-foreground">Confirmados</span>
        <strong className="mt-1 block text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{confirmed}</strong>
      </div>
      <div className="rounded-xl border border-sky-500/25 bg-sky-500/[.065] px-3 py-2">
        <span className="block text-[11px] font-semibold text-muted-foreground">No horário</span>
        <strong className="mt-1 block text-lg font-bold tabular-nums text-sky-700 dark:text-sky-300">{available}</strong>
      </div>
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/[.065] px-3 py-2">
        <span className="block text-[11px] font-semibold text-muted-foreground">Sem confirmação</span>
        <strong className="mt-1 block text-lg font-bold tabular-nums text-amber-700 dark:text-amber-300">{late}</strong>
      </div>
    </div>

    <div className="care-page-agenda-filters flex shrink-0 flex-col gap-2">
      <div role="group" aria-label="Filtrar agenda por tipo" className="care-page-agenda-categories flex min-w-0 gap-1.5 overflow-x-auto pb-0.5">
        {fields.map(field=>{
          const Icon=field.icon;
          const selected=category===field.id;
          const count=field.id==="todos"?tasks.length:tasks.filter(t=>t.category===field.id).length;
          return <button key={field.id} type="button" aria-pressed={selected} onClick={()=>changeCategory(field.id)}
            className={"inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-[11px] font-bold transition-colors "+(selected?
              "border-primary bg-primary text-primary-foreground":"border-border bg-muted/35 text-foreground hover:bg-muted/70")}>
            <Icon size={14}/>{field.label}<span className={"rounded-full px-1.5 py-0.5 text-[11px] tabular-nums "+(selected?"bg-muted":"bg-background/70")}>{count}</span>
          </button>;
        })}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(120px,.4fr)] gap-2">
        <label className="relative min-w-0">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input aria-label="Pesquisar cuidado programado" type="search" value={query}
            onChange={e=>{setQuery(e.target.value);setPage(0);}}
            placeholder="Buscar por atividade ou medicamento..."
            className="h-9 w-full min-w-0 rounded-lg border border-border bg-background pl-9 pr-3 text-xs text-foreground"/>
        </label>
        <label className="relative min-w-0">
          <Filter size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <select aria-label="Filtrar agenda por situação" value={status}
            onChange={e=>changeStatus(e.target.value as StatusFilter)}
            className="h-9 w-full min-w-0 rounded-lg border border-border bg-background pl-6 pr-1 text-[11px] font-semibold text-foreground">
            <option value="todos">Todas</option>
            <option value="confirmados">Confirmados</option>
            <option value="pendentes">Sem resposta</option>
            <option value="resolvidos">Já respondidos</option>
            <option value="futuros">Programados</option>
          </select>
        </label>
      </div>
    </div>

    <div className="care-page-agenda-content min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {displayed.map(task=>{
          const Icon=IconFor[task.category]??CalendarClock;
          const state=careReminderState(task,now);
          const done=state==="confirmed";
          const response=resolved[task.id];
          const answered=Boolean(response);
          const lateState=state==="unconfirmed";
          const canAct=!answered&&(state==="due"||lateState);
          return <article key={task.id}
            className={"care-agenda-row care-premium-agenda-event flex min-w-0 flex-col rounded-2xl border p-3 "+(styles[task.category]??"care-agenda-other")}>
            <button type="button" onClick={()=>onView(task)} aria-label={"Consultar "+task.title}
              className="flex min-w-0 flex-1 items-start gap-2.5 text-left">
              <span className="care-agenda-row-icon grid size-9 shrink-0 place-items-center rounded-xl bg-background/70">
                <Icon size={18}/>
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-xs font-bold leading-snug text-foreground">{task.title}</strong>
                <span className="mt-0.5 block text-[11px] font-semibold tabular-nums text-foreground">
                  <Clock3 size={12} className="mr-1 inline"/>{reminderClock(task.scheduled_at)}
                </span>
              </span>
              {done?<CheckCircle2 size={17} className="shrink-0 text-emerald-600 dark:text-emerald-300"/>:
                <ChevronRight size={15} className="shrink-0 text-muted-foreground"/>}
            </button>
            <div className="mt-2 flex min-h-7 items-center justify-between gap-2 border-t border-current/10 pt-2">
              <span className={"min-w-0 truncate text-[11px] font-semibold "+(done?"text-emerald-700 dark:text-emerald-300":
                answered?"text-emerald-700 dark:text-emerald-300":
                lateState?"text-amber-700 dark:text-amber-300":"text-muted-foreground")}>
                {done?"Confirmado às "+reminderClock(task.completed_at!):
                  response==="cancelado"?"Cancelado · resposta registrada":
                  response==="nao_cumprido"?"Não realizado · resposta registrada":
                  response==="nao_bebi"?"Não bebi · resposta registrada":
                  lateState?"Sem confirmação após 10 min":state==="due"?"Aguardando confirmação":"Programado"}
              </span>
              {!done&&canAct&&<button type="button" onClick={()=>onConfirm(task)}
                className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-bold text-primary-foreground">
                Registrar
              </button>}
            </div>
          </article>;
        })}
      </div>
      {!displayed.length&&<div className="rounded-2xl border border-dashed border-border bg-muted/25 p-6 text-center text-xs text-muted-foreground">
        Nenhuma atividade encontrada. Altere os filtros ou consulte outra categoria.
      </div>}
    </div>
    <nav className="flex shrink-0 items-center justify-between gap-2 border-t border-border/60 pt-2"
      aria-label="Paginação da agenda">
      <button type="button" disabled={current===0} onClick={()=>setPage(v=>Math.max(0,v-1))}
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] font-bold text-foreground disabled:opacity-35">
        <ChevronLeft size={14}/>Anterior</button>
      <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
        {filtered.length} registros · Página {current+1} de {pages}
      </span>
      <button type="button" disabled={current>=pages-1} onClick={()=>setPage(v=>Math.min(pages-1,v+1))}
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] font-bold text-foreground disabled:opacity-35">
        Próxima<ChevronRight size={14}/></button>
    </nav>
    <p className="shrink-0 text-[11px] leading-tight text-muted-foreground">
      Não confirmado significa ausência de registro, não prova que o cuidado deixou de ocorrer. Medicação: não dobre doses.
    </p>
  </div>;
}
