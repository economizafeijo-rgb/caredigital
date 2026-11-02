import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Coffee, Droplets, History, Pill, RotateCcw, Search, SlidersHorizontal, UtensilsCrossed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  assembleCareHistory, filterCareHistory, type HistoryEntry, type HistoryFilter,
  type HistoryGroup, type HistoryStatus, type HistorySources,
} from "@/lib/care-history";

const acreStamp=(value:string)=>new Intl.DateTimeFormat("pt-BR",{
  timeZone:"America/Rio_Branco",day:"2-digit",month:"2-digit",year:"numeric",
  hour:"2-digit",minute:"2-digit",
}).format(new Date(value));
const acreHour=(value:string)=>new Intl.DateTimeFormat("pt-BR",{
  timeZone:"America/Rio_Branco",hour:"2-digit",minute:"2-digit",
}).format(new Date(value));

const groups:{key:"todos"|HistoryGroup;label:string;icon:typeof History}[]=[
  {key:"todos",label:"Todos",icon:History},
  {key:"liquidos",label:"Líquidos",icon:Droplets},
  {key:"refeicoes",label:"Refeições",icon:UtensilsCrossed},
  {key:"cuidados",label:"Cuidados",icon:Pill},
  {key:"ajustes",label:"Ajustes",icon:SlidersHorizontal},
];
const subtypes:Record<HistoryGroup,{value:string;label:string}[]>={
  liquidos:[
    {value:"agua",label:"Água"},
    {value:"cha",label:"Chás"},
    {value:"suco",label:"Sucos"},
    {value:"cafe",label:"Café"},
    {value:"outra",label:"Outras bebidas"},
  ],
  refeicoes:[
    {value:"refeicao",label:"Refeições"},
    {value:"lanche",label:"Lanches e ceia"},
  ],
  cuidados:[
    {value:"medicacao",label:"Medicações"},
    {value:"observacao",label:"Observações"},
  ],
  ajustes:[
    {value:"reprogramacao",label:"Reprogramações"},
    {value:"correcao",label:"Correções"},
    {value:"exclusao",label:"Exclusões"},
  ],
};
const statusLabel:Record<HistoryStatus,string>={
  confirmado:"Confirmado",registrado:"Registrado",nao_confirmado:"Não confirmado",
  nao_bebi:"Não bebi",corrigido:"Corrigido",reprogramado:"Reprogramado",excluido:"Excluído"
};
const defaultFilters:HistoryFilter={
  group:"liquidos",subtype:"todos",status:"todos",period:"hoje",query:"",order:"recentes"
};
const pageSize=3;
const typeIcon=(entry:HistoryEntry)=>{
  if(entry.group==="liquidos")return entry.subtype==="cha"||entry.subtype==="cafe"?Coffee:Droplets;
  if(entry.group==="refeicoes")return UtensilsCrossed;
  if(entry.group==="ajustes")return SlidersHorizontal;
  if(entry.subtype==="medicacao")return Pill;
  return Activity;
};
const groupColors:Record<HistoryGroup,string>={
  liquidos:"border-sky-500/25 bg-sky-500/[.055] text-sky-700 dark:text-sky-300",
  refeicoes:"border-emerald-500/25 bg-emerald-500/[.055] text-emerald-700 dark:text-emerald-300",
  cuidados:"border-amber-500/25 bg-amber-500/[.045] text-amber-800 dark:text-amber-300",
  ajustes:"border-violet-500/25 bg-violet-500/[.045] text-violet-700 dark:text-violet-300",
};

export function PatientActivityHistory({patientId,ownerId,revision}:{
  patientId:string;ownerId:string;revision:number;
}){
  const [items,setItems]=useState<HistoryEntry[]>([]);
  const [filters,setFilters]=useState<HistoryFilter>(defaultFilters);
  const [page,setPage]=useState(0);
  const [expanded,setExpanded]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [problem,setProblem]=useState("");
  const [partial,setPartial]=useState(false);

  useEffect(()=>{
    let live=true;
    setLoading(true);
    const load=async()=>{
      const db=supabase as any;
      // Scope every source to this authorized patient and its owner.
      // Fixed 30-day retrieval window; the day/period selectors only narrow it.
      const since=new Date(Date.now()-31*86400000).toISOString();
      const [tasks,water,meals,drinks,observations,audit,responses]=await Promise.all([
        db.from("care_daily_checklist").select("id,category,title,scheduled_at,completed_at")
          .eq("patient_id",patientId).eq("owner_id",ownerId)
          .gte("scheduled_at",since).order("scheduled_at",{ascending:false}).limit(400),
        db.from("care_hydration").select("id,task_id,amount_ml,recorded_at")
          .eq("patient_id",patientId).eq("owner_id",ownerId)
          .gte("recorded_at",since).order("recorded_at",{ascending:false}).limit(300),
        db.from("care_meal_details").select("task_id,description")
          .eq("patient_id",patientId).eq("owner_id",ownerId).limit(400),
        db.from("care_client_beverages").select("id,kind,name,amount_ml,notes,consumed_at")
          .eq("patient_id",patientId).eq("owner_id",ownerId)
          .gte("consumed_at",since).order("consumed_at",{ascending:false}).limit(250),
        db.from("care_observations").select("id,observation_type,notes,recorded_at")
          .eq("patient_id",patientId).eq("owner_id",ownerId)
          .gte("recorded_at",since).order("recorded_at",{ascending:false}).limit(200),
        db.from("care_activity_log").select("id,task_id,category,event_type,source,details,scheduled_at,happened_at,recorded_at")
          .eq("patient_id",patientId).eq("owner_id",ownerId)
          .gte("recorded_at",since).order("recorded_at",{ascending:false}).limit(500),
        db.from("care_hydration_responses").select("task_id,response,recorded_at")
          .eq("patient_id",patientId).eq("owner_id",ownerId)
          .gte("recorded_at",since).order("recorded_at",{ascending:false}).limit(250)
      ]);
      if(!live)return;
      if(tasks.error){
        setProblem("Não foi possível consultar o prontuário. Verifique a conexão e o acesso à conta.");
        setItems([]);
        setLoading(false);
        return;
      }
      const responsesList=[water,meals,drinks,observations,audit,responses];
      setPartial(responsesList.some(result=>Boolean(result.error)));
      const raw:HistorySources={
        checklist:tasks.data??[],water:water.data??[],meals:meals.data??[],
        drinks:drinks.data??[],observations:observations.data??[],
        audit:audit.data??[],responses:responses.data??[]
      };
      try{
        setItems(assembleCareHistory(raw));
        setProblem("");
      }catch{
        setProblem("Não foi possível organizar os registros. Atualize a página.");
      }finally{
        setLoading(false);
      }
    };
    void load();
    return()=>{live=false};
  },[patientId,ownerId,revision]);

  function setFilter(update:Partial<HistoryFilter>){
    setFilters(current=>({...current,...update}));
    setPage(0);
    setExpanded(null);
  }
  function setGroup(group:"todos"|HistoryGroup){
    setFilter({group,subtype:"todos",status:"todos"});
  }
  const filtered=useMemo(()=>filterCareHistory(items,filters),[items,filters]);
  const dayItems=useMemo(()=>filterCareHistory(items,{...defaultFilters,period:filters.period}),[items,filters.period]);
  const pageCount=Math.max(1,Math.ceil(filtered.length/pageSize));
  const currentPage=Math.min(page,pageCount-1);
  const shown=filtered.slice(currentPage*pageSize,(currentPage+1)*pageSize);
  const availableTypes=filters.group==="todos"
    ? []:subtypes[filters.group].filter(type=>dayItems.some(item=>item.group===filters.group&&item.subtype===type.value));
  const availableStatus=Array.from(new Set(dayItems.filter(item=>filters.group==="todos"||item.group===filters.group).map(item=>item.status)));
  const isFiltered=filters.group!=="todos"||filters.subtype!=="todos"||filters.status!=="todos"||filters.period!=="hoje"||Boolean(filters.query)||filters.order!=="recentes";

  return <section aria-label="Histórico de consumos e cuidados" className="patient-history-panel flex min-h-0 w-full flex-col gap-2">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[11px] font-medium leading-snug text-muted-foreground">Consumos, refeições e cuidados organizados por categoria. Horários do Acre.</p>
      </div>
      <span className="shrink-0 rounded-lg bg-muted px-2 py-1 text-[10px] font-bold tabular-nums text-foreground">{filtered.length} registros</span>
    </div>
    <div className="grid grid-cols-3 gap-1 sm:grid-cols-5" role="group" aria-label="Filtrar histórico por categoria">
      {groups.map(group=>{
        const Icon=group.icon;
        const count=dayItems.filter(item=>group.key==="todos"||item.group===group.key).length;
        const active=filters.group===group.key;
        return <button key={group.key} type="button" aria-pressed={active} onClick={()=>setGroup(group.key)}
          className={"flex min-w-0 items-center justify-center gap-1 rounded-lg border px-1.5 py-2 text-[10px] font-bold transition-colors "+
            (active?"border-primary bg-primary text-primary-foreground shadow-sm":"border-border bg-muted/25 text-foreground hover:bg-muted/60")}>
          <Icon size={13} className="shrink-0" aria-hidden="true"/>
          <span className="truncate">{group.label}</span>
          <span className={"rounded-full px-1 text-[9px] tabular-nums "+(active?"bg-white/20":"bg-muted")}>{count}</span>
        </button>;
      })}
    </div>

    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
      <label className="relative col-span-2 sm:col-span-3">
        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"/>
        <input type="search" value={filters.query} onChange={event=>setFilter({query:event.target.value})}
          placeholder="Buscar alimento, bebida, volume ou cuidado…"
          aria-label="Buscar nos registros" className="field h-9 w-full min-w-0 pl-8 text-xs"/>
      </label>
      <label className="flex min-w-0 flex-col gap-0.5 text-[10px] font-semibold text-muted-foreground">
        <span>Período</span>
        <select className="field h-8 w-full min-w-0 text-[11px]" value={filters.period}
          onChange={event=>setFilter({period:event.target.value as HistoryFilter["period"],subtype:"todos",status:"todos"})}>
          <option value="hoje">Hoje</option><option value="7d">Últimos 7 dias</option><option value="30d">Últimos 30 dias</option>
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-0.5 text-[10px] font-semibold text-muted-foreground">
        <span>Tipo</span>
        <select className="field h-8 w-full min-w-0 text-[11px]" disabled={filters.group==="todos"}
          value={filters.subtype} onChange={event=>setFilter({subtype:event.target.value})}>
          <option value="todos">Todos os tipos</option>
          {availableTypes.map(type=><option key={type.value} value={type.value}>{type.label}</option>)}
        </select>
      </label>
      <label className="col-span-2 flex min-w-0 flex-col gap-0.5 text-[10px] font-semibold text-muted-foreground sm:col-span-1">
        <span>Situação</span>
        <select className="field h-8 w-full min-w-0 text-[11px]" value={filters.status}
          onChange={event=>setFilter({status:event.target.value as HistoryFilter["status"]})}>
          <option value="todos">Todas as situações</option>
          {availableStatus.map(status=><option key={status} value={status}>{statusLabel[status]}</option>)}
        </select>
      </label>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-[10px] text-muted-foreground">{filters.group==="ajustes"?"Ajustes automáticos não são consumos.":"Registros sem confirmação não comprovam ausência do cuidado."}</p>
      <div className="flex shrink-0 items-center gap-1.5">
        <button type="button" onClick={()=>setFilter({order:filters.order==="recentes"?"antigos":"recentes"})}
          title="Alternar ordem cronológica" className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-semibold text-foreground">
          <CalendarDays size={12}/>{filters.order==="recentes"?"Recentes":"Antigos"}
        </button>
        {isFiltered&&<button type="button" onClick={()=>{setFilters(defaultFilters);setPage(0);setExpanded(null);}}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-semibold text-foreground"><RotateCcw size={12}/>Limpar</button>}
      </div>
    </div>

    {partial&&<p role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">Algumas fontes não responderam. A lista pode estar incompleta.</p>}
    {problem&&<p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">{problem}</p>}
    <div className="min-h-0 space-y-1.5">
      {loading?<p role="status" className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">Consultando os registros…</p>:
        shown.map(event=>{
          const Icon=typeIcon(event);
          const active=expanded===event.id;
          return <article key={event.id} className={"min-w-0 overflow-hidden rounded-xl border "+groupColors[event.group]}>
            <button type="button" aria-expanded={active} onClick={()=>setExpanded(active?null:event.id)}
              className="flex w-full min-w-0 items-center gap-2 px-2.5 py-2 text-left transition hover:bg-background/25">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-background/60"><Icon size={16}/></span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-xs font-extrabold text-foreground">{event.title}</strong>
                <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                  {acreStamp(event.occurredAt)} · {statusLabel[event.status]}
                  {event.automatic?" · Automático":""}
                </span>
              </span>
              <ChevronDown size={15} className={"shrink-0 text-muted-foreground transition-transform "+(active?"rotate-180":"")}/>
            </button>
            {active&&<div className="space-y-1.5 border-t border-border/50 bg-background/40 px-3 py-2 text-[11px] leading-relaxed text-foreground">
              {event.description&&<p className="break-words">{event.description}</p>}
              {event.scheduledAt&&<p className="text-muted-foreground"><Clock3 size={12} className="mr-1 inline"/>Previsto: {acreStamp(event.scheduledAt)}</p>}
              <p className="text-muted-foreground">{event.status==="nao_confirmado"?"Horário previsto (sem confirmação)":"Registrado em"}: {acreStamp(event.occurredAt)}</p>
            </div>}
          </article>;
        })}
      {!loading&&!problem&&shown.length===0&&<div className="rounded-xl border border-dashed border-border p-4 text-center">
        <Search size={17} className="mx-auto text-muted-foreground"/>
        <p className="mt-1 text-xs font-semibold text-foreground">Nenhum registro para estes filtros</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Altere o período, a categoria ou a busca.</p>
        {isFiltered&&<button type="button" onClick={()=>{setFilters(defaultFilters);setPage(0);}}
          className="mt-2 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-bold text-primary">Limpar filtros</button>}
      </div>}
    </div>
    {pageCount>1&&!loading&&<nav aria-label="Páginas do histórico" className="flex shrink-0 items-center justify-between gap-2 border-t border-border/60 pt-2">
      <button type="button" disabled={currentPage===0} onClick={()=>{setPage(n=>Math.max(0,n-1));setExpanded(null);}}
        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[11px] font-semibold text-foreground disabled:opacity-35"><ChevronLeft size={13}/>Anterior</button>
      <span className="text-[10px] font-medium tabular-nums text-muted-foreground">Página {currentPage+1} de {pageCount}</span>
      <button type="button" disabled={currentPage===pageCount-1} onClick={()=>{setPage(n=>Math.min(pageCount-1,n+1));setExpanded(null);}}
        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[11px] font-semibold text-foreground disabled:opacity-35">Próxima<ChevronRight size={13}/></button>
    </nav>}
    <p className="text-[9px] leading-tight text-muted-foreground">Consulta dos últimos 30 dias. Data e hora reais do sistema, fuso do Acre. Ajustes de agenda são eventos administrativos, não consumos.</p>
  </section>;
}
