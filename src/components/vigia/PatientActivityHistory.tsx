import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Coffee, Droplets, History, Info, Pencil, Pill, RotateCcw, Search, SlidersHorizontal, UtensilsCrossed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { acreCalendarDay } from "@/lib/hydration-goal";
import { CareTaskRecordModal, type CareTaskRecord } from "./CareTaskRecordModal";
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
    {value:"meta_diaria",label:"Metas diárias"},
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
  nao_bebi:"Não bebi",corrigido:"Corrigido",reprogramado:"Reprogramado",excluido:"Excluído",
  meta_atingida:"Meta atingida",meta_nao_atingida:"Meta não atingida"
};
const defaultFilters:HistoryFilter={
  group:"todos",subtype:"todos",status:"todos",period:"hoje",query:"",order:"recentes"
};
const pageSize=5;
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

export function PatientActivityHistory({patientId,ownerId,revision,onRecordChanged}:{
  patientId:string;ownerId:string;revision:number;onRecordChanged?:()=>void;
}){
  const [items,setItems]=useState<HistoryEntry[]>([]);
  const [filters,setFilters]=useState<HistoryFilter>(defaultFilters);
  const [page,setPage]=useState(0);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [showMobileDetail,setShowMobileDetail]=useState(false);
  const [editingTask,setEditingTask]=useState<CareTaskRecord|null>(null);
  const [reload,setReload]=useState(0);
  const [filtersOpen,setFiltersOpen]=useState(true);
  const [loading,setLoading]=useState(true);
  const [problem,setProblem]=useState("");
  const [partial,setPartial]=useState(false);
  const [missingSources,setMissingSources]=useState<string[]>([]);

  useEffect(()=>{
    let live=true;
    setLoading(true);
    const load=async()=>{
      const db=supabase as any;
      // Scope every source to this authorized patient and its owner.
      // Fixed 30-day retrieval window; the day/period selectors only narrow it.
      const since=new Date(Date.now()-31*86400000).toISOString();
      // Reconcile the 23h result before reading the dated daily-history snapshots.
      const sync=await db.rpc("care_sync_hydration_goal",{p_patient_id:patientId});
      if(!live)return;
      const [tasks,water,meals,drinks,observations,audit,responses,dailyGoals]=await Promise.all([
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
          .gte("recorded_at",since).order("recorded_at",{ascending:false}).limit(250),
        db.from("care_hydration_daily_goals").select("goal_date,target_ml,consumed_ml,status,closed_at,updated_at")
          .eq("patient_id",patientId).eq("owner_id",ownerId)
          .gte("goal_date",acreCalendarDay(Date.now()-31*86400000))
          .order("goal_date",{ascending:false}).limit(90)
      ]);
      if(!live)return;
      if(tasks.error){
        setProblem("Não foi possível consultar o prontuário. Verifique a conexão e o acesso à conta.");
        setItems([]);
        setLoading(false);
        return;
      }
      const responsesList=[water,meals,drinks,observations,audit,responses,dailyGoals,sync];
      const sourceLabels=["água","alimentos","bebidas","observações","eventos","respostas","metas","sincronização"];
      const failed=responsesList.flatMap((response,index)=>response.error?[sourceLabels[index]]:[]);
      setMissingSources(failed);
      setPartial(failed.length>0);
      const raw:HistorySources={
        checklist:tasks.data??[],water:water.data??[],meals:meals.data??[],
        drinks:drinks.data??[],observations:observations.data??[],
        audit:audit.data??[],responses:responses.data??[],dailyGoals:dailyGoals.data??[]
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
  },[patientId,ownerId,revision,reload]);

  function setFilter(update:Partial<HistoryFilter>){
    setFilters(current=>({...current,...update}));
    setPage(0);
    setSelectedId(null);
    setShowMobileDetail(false);
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
  const selected=shown.find(entry=>entry.id===selectedId)??shown[0]??null;
  const selectedIcon=selected?typeIcon(selected):History;
  const SelectedIcon=selectedIcon;
  const editableTask:CareTaskRecord|null=
    selected?.group==="liquidos"&&selected.subtype==="agua"&&selected.status==="confirmado"
    &&selected.taskId&&selected.scheduledAt
    ? {id:selected.taskId,title:"Verificar hidratação",category:"hidratacao",
       scheduled_at:selected.scheduledAt,completed_at:selected.occurredAt}
    : null;
  function showAllHistory(){
    setFilters({...defaultFilters,period:"30d"});
    setPage(0);
    setSelectedId(null);
    setShowMobileDetail(false);
  }
  function changePage(next:number){
    setPage(Math.max(0,Math.min(pageCount-1,next)));
    setSelectedId(null);
    setShowMobileDetail(false);
  }
  function clearFilters(){
    setFilters(defaultFilters);
    setPage(0);
    setSelectedId(null);
    setShowMobileDetail(false);
  }


  return <section aria-label="Histórico de consumos e cuidados"
    className="patient-history-workspace flex h-full min-h-0 min-w-0 flex-col gap-2 overflow-hidden text-foreground">
    <header className="patient-history-header flex shrink-0 flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <History size={21} className="shrink-0 text-primary" aria-hidden="true"/>
        <div className="min-w-0">
          <h2 className="truncate text-base font-extrabold tracking-tight sm:text-lg">Histórico e prontuário</h2>
          <p className="truncate text-[10px] text-muted-foreground sm:text-xs">Consumos, refeições e cuidados · fuso do Acre</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button type="button" aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(value=>!value)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 text-[10px] font-semibold text-foreground hover:bg-muted">
          <SlidersHorizontal size={14}/>{filtersOpen?"Recolher filtros":"Exibir filtros"}
        </button>
        <span className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[10px] font-semibold tabular-nums">{dayItems.length} registros</span>
      </div>
    </header>

    <div className="patient-history-categories grid shrink-0 min-w-0 grid-cols-5 gap-1.5" role="group" aria-label="Filtrar histórico por categoria">
      {groups.map(group=>{
        const Icon=group.icon;
        const count=dayItems.filter(item=>group.key==="todos"||item.group===group.key).length;
        const active=filters.group===group.key;
        return <button key={group.key} type="button" aria-pressed={active} onClick={()=>setGroup(group.key)}
          className={"flex min-w-0 items-center justify-center gap-1.5 rounded-xl border px-1.5 py-2.5 text-[10px] font-bold transition-colors sm:text-xs "+
            (active?"border-primary/70 bg-primary text-primary-foreground shadow-sm":"border-border bg-muted/30 text-foreground hover:border-primary/40 hover:bg-muted/70")}>
          <Icon size={15} className="shrink-0" aria-hidden="true"/>
          <span className="truncate">{group.label}</span>
          <span className={"hidden rounded-full px-1.5 text-[9px] tabular-nums sm:inline "+(active?"bg-white/20":"bg-background/70")}>{count}</span>
        </button>;
      })}
    </div>

    {filtersOpen&&<div className="patient-history-controls grid shrink-0 min-w-0 gap-2">
      <label className="relative block min-w-0">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
        <input type="search" value={filters.query} onChange={event=>setFilter({query:event.target.value})}
          placeholder="Buscar alimento, bebida, volume ou cuidado…"
          aria-label="Buscar nos registros"
          className="h-10 w-full min-w-0 rounded-xl border border-border bg-muted/30 pl-9 pr-3 text-xs text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"/>
      </label>
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="flex min-w-0 flex-col gap-1 text-[10px] font-semibold text-muted-foreground">
          <span>Período</span>
          <select className="h-9 w-full min-w-0 rounded-lg border border-border bg-card px-2 text-xs font-semibold text-foreground"
            value={filters.period} onChange={event=>setFilter({period:event.target.value as HistoryFilter["period"],subtype:"todos",status:"todos"})}>
            <option value="hoje">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-[10px] font-semibold text-muted-foreground">
          <span>Tipo</span>
          <select className="h-9 w-full min-w-0 rounded-lg border border-border bg-card px-2 text-xs font-semibold text-foreground disabled:opacity-50"
            disabled={filters.group==="todos"}
            value={filters.subtype} onChange={event=>setFilter({subtype:event.target.value})}>
            <option value="todos">Todos os tipos</option>
            {availableTypes.map(type=><option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-[10px] font-semibold text-muted-foreground">
          <span>Situação</span>
          <select className="h-9 w-full min-w-0 rounded-lg border border-border bg-card px-2 text-xs font-semibold text-foreground"
            value={filters.status} onChange={event=>setFilter({status:event.target.value as HistoryFilter["status"]})}>
            <option value="todos">Todas as situações</option>
            {availableStatus.map(status=><option key={status} value={status}>{statusLabel[status]}</option>)}
          </select>
        </label>
        <div className="flex min-w-0 items-end gap-1">
          <button type="button" onClick={()=>setFilter({order:filters.order==="recentes"?"antigos":"recentes"})}
            title="Alternar ordem dos registros"
            className="flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-card px-2 text-[11px] font-semibold text-foreground hover:bg-muted/60">
            <CalendarDays size={14}/><span className="truncate">{filters.order==="recentes"?"Recentes":"Antigos"}</span>
          </button>
          {isFiltered&&<button type="button" onClick={clearFilters} title="Limpar filtros"
            aria-label="Limpar todos os filtros"
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"><RotateCcw size={15}/></button>}
        </div>
      </div>
    </div>}

    <div className="patient-history-content grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,.92fr)_minmax(0,1.08fr)]">
      <section aria-label="Lista de registros"
        className={"patient-history-list flex min-h-0 min-w-0 flex-col rounded-2xl border border-border bg-muted/[.18] p-2.5 sm:p-3 "+(showMobileDetail?"hidden lg:flex":"flex")}>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-1 border-b border-border/70 pb-2">
          <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-bold"><History size={16} className="text-primary"/> Registros <span className="text-xs font-semibold text-muted-foreground">({filtered.length})</span></h3>
          <span className="text-[10px] text-muted-foreground">Selecione para consultar</span>
        </div>
        {partial&&<details className="mt-2 shrink-0 rounded-lg border border-amber-500/25 bg-amber-500/[.055] px-2.5 py-1.5 text-[10px] text-foreground">
          <summary className="flex cursor-pointer items-center gap-1.5 font-semibold"><Info size={13} className="text-amber-700 dark:text-amber-300"/> Fontes parciais · verificar</summary>
          <p className="mt-1 text-muted-foreground">Alguns dados podem estar ausentes: {missingSources.join(", ")}.</p>
          <button type="button" onClick={()=>setReload(value=>value+1)} className="mt-1.5 rounded-md border border-border bg-card px-2 py-1 font-semibold">Atualizar consulta</button>
        </details>}
        {problem&&<p role="alert" className="mt-2 shrink-0 rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">{problem}</p>}
        <div className="patient-history-list-scroll mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1" aria-live="polite">
          {loading?<div role="status" className="rounded-xl border border-border bg-muted/25 p-4 text-xs text-muted-foreground">Carregando o histórico…</div>:
            shown.map(entry=>{
              const Icon=typeIcon(entry);
              const active=selected?.id===entry.id;
              const color=entry.group==="liquidos"?"bg-sky-500/15 text-sky-700 dark:text-sky-300":
                entry.group==="refeicoes"?"bg-emerald-500/15 text-emerald-700 dark:text-emerald-300":
                entry.group==="ajustes"?"bg-violet-500/15 text-violet-700 dark:text-violet-300":
                "bg-amber-500/15 text-amber-800 dark:text-amber-300";
              return <button key={entry.id} type="button" aria-pressed={active}
                onClick={()=>{setSelectedId(entry.id);setShowMobileDetail(true);}}
                className={"group flex w-full min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary "+
                  (active?"border-primary/70 bg-primary/[.095] shadow-[inset_0_0_0_1px_hsl(var(--primary)/.18)]":
                  "border-border bg-card/80 hover:border-primary/40 hover:bg-primary/[.04]")}>
                <span className={"grid size-10 shrink-0 place-items-center rounded-xl "+color}><Icon size={20}/></span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[13px] font-extrabold text-foreground">{entry.title}</strong>
                  <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                    {entry.group==="liquidos"?"Líquidos":entry.group==="refeicoes"?"Refeições":entry.group==="ajustes"?"Ajustes":"Cuidados"} · {statusLabel[entry.status]} às {acreHour(entry.occurredAt)}
                  </span>
                </span>
                <ChevronRight size={17} className="shrink-0 text-muted-foreground group-hover:text-primary"/>
              </button>;
            })}
          {!loading&&!problem&&!shown.length&&<div className="rounded-xl border border-dashed border-border px-3 py-5 text-center">
            <Search size={20} className="mx-auto text-muted-foreground"/>
            <p className="mt-1 text-xs font-bold">Nenhum registro encontrado</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Altere a categoria, o período ou a busca.</p>
            <button type="button" onClick={clearFilters} className="mt-2 rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary">Limpar filtros</button>
          </div>}
        </div>
        <nav aria-label="Páginas do histórico" className="mt-2 flex shrink-0 items-center justify-between gap-1.5 border-t border-border/70 pt-2">
          <button type="button" disabled={currentPage===0} onClick={()=>changePage(currentPage-1)}
            className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-border bg-card px-2 text-[11px] font-semibold disabled:opacity-35"><ChevronLeft size={14}/>Anterior</button>
          <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">Página {currentPage+1} de {pageCount}</span>
          <button type="button" disabled={currentPage>=pageCount-1} onClick={()=>changePage(currentPage+1)}
            className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-border bg-card px-2 text-[11px] font-semibold disabled:opacity-35">Próxima<ChevronRight size={14}/></button>
        </nav>
      </section>

      <section aria-label="Detalhes do registro selecionado" className={"patient-history-detail flex min-h-0 min-w-0 flex-col rounded-2xl border border-border bg-card/90 p-3 sm:p-4 "+(showMobileDetail?"flex":"hidden lg:flex")}>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={()=>setShowMobileDetail(false)}
            className="grid size-8 shrink-0 place-items-center rounded-lg border border-border text-foreground lg:hidden" aria-label="Voltar aos registros"><ChevronLeft size={17}/></button>
          <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Detalhes do registro</h3>
        </div>
        {selected?<>
          <div className="mt-2 flex min-w-0 shrink-0 items-center gap-3 border-b border-border/60 pb-3">
            <span className={"grid size-12 shrink-0 place-items-center rounded-xl "+
              (selected.group==="liquidos"?"bg-sky-500/15 text-sky-700 dark:text-sky-300":selected.group==="refeicoes"?"bg-emerald-500/15 text-emerald-700 dark:text-emerald-300":selected.group==="ajustes"?"bg-violet-500/15 text-violet-700 dark:text-violet-300":"bg-amber-500/15 text-amber-800 dark:text-amber-300")}>
              <SelectedIcon size={25}/>
            </span>
            <div className="min-w-0">
              <h4 className="break-words text-base font-extrabold text-foreground sm:text-lg">{selected.title}</h4>
              <p className="text-[11px] text-muted-foreground">{acreStamp(selected.occurredAt)} · Horário do Acre</p>
            </div>
          </div>
          <div className="patient-history-detail-scroll mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">
            <dl className="grid grid-cols-2 gap-2">
              <div className="min-w-0 rounded-xl border border-border bg-muted/25 p-2.5">
                <dt className="text-[10px] font-semibold text-muted-foreground">Categoria</dt>
                <dd className="mt-1.5 break-words text-xs font-extrabold text-foreground">{selected.group==="liquidos"?"Líquidos":selected.group==="refeicoes"?"Refeições":selected.group==="ajustes"?"Ajustes":"Cuidados"}</dd>
              </div>
              <div className="min-w-0 rounded-xl border border-border bg-muted/25 p-2.5">
                <dt className="text-[10px] font-semibold text-muted-foreground">Situação</dt>
                <dd className={"mt-1.5 inline-flex max-w-full items-center gap-1 break-words rounded-full px-2 py-1 text-[11px] font-bold "+
                  (selected.status==="confirmado"||selected.status==="meta_atingida"?"bg-emerald-500/15 text-emerald-700 dark:text-emerald-300":
                    selected.status==="nao_confirmado"||selected.status==="nao_bebi"||selected.status==="meta_nao_atingida"?"bg-amber-500/15 text-amber-700 dark:text-amber-300":"bg-primary/10 text-primary")}>
                    {(selected.status==="confirmado"||selected.status==="meta_atingida")&&<CheckCircle2 size={13}/>}
                    {statusLabel[selected.status]}
                </dd>
              </div>
              <div className="min-w-0 rounded-xl border border-border bg-muted/25 p-2.5">
                <dt className="text-[10px] font-semibold text-muted-foreground">Horário previsto</dt>
                <dd className="mt-1.5 break-words text-xs font-semibold tabular-nums text-foreground">
                  {selected.scheduledAt?acreStamp(selected.scheduledAt):"Não programado"}
                </dd>
              </div>
              <div className="min-w-0 rounded-xl border border-border bg-muted/25 p-2.5">
                <dt className="text-[10px] font-semibold text-muted-foreground">{selected.status==="nao_confirmado"?"Confirmação":"Horário registrado"}</dt>
                <dd className="mt-1.5 break-words text-xs font-semibold tabular-nums text-foreground">
                  {selected.status==="nao_confirmado"?"Não confirmada":acreStamp(selected.occurredAt)}
                </dd>
              </div>
            </dl>
            <div className="rounded-xl border border-border bg-muted/25 p-3">
              <h5 className="text-[11px] font-semibold text-muted-foreground">Descrição / Observações</h5>
              <p className="mt-1 break-words text-xs leading-relaxed text-foreground">{selected.description||"Sem observações adicionais registradas."}</p>
              {typeof selected.amountMl==="number"&&<p className="mt-1 text-xs font-bold text-sky-700 dark:text-sky-300">Quantidade: {selected.amountMl} ml</p>}
            </div>
            {selected.automatic&&<p className="flex items-start gap-1.5 text-[10px] text-muted-foreground"><Info size={14} className="shrink-0"/>Ajuste automático da programação, não equivale a um novo consumo.</p>}
          </div>
          <div className="mt-3 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-3">
            <button type="button" onClick={showAllHistory}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-primary/50 bg-primary/5 px-3 text-[11px] font-bold text-foreground hover:bg-primary/10">
              <History size={15}/>Ver histórico completo
            </button>
            {editableTask?<button type="button" onClick={()=>setEditingTask(editableTask)}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-[11px] font-bold text-primary-foreground hover:opacity-90">
              <Pencil size={15}/>Editar registro
            </button>:<span className="text-[10px] text-muted-foreground">Registro disponível para consulta</span>}
          </div>
        </>:<div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
          <History size={25}/>
          <p className="text-xs font-semibold">Selecione um registro na lista para ver seus detalhes.</p>
        </div>}
      </section>
    </div>
    <p className="shrink-0 text-[10px] leading-tight text-muted-foreground">
      Últimos 30 dias · Horários reais no Acre · Ajustes automáticos não representam consumo.
    </p>
    <CareTaskRecordModal task={editingTask} onClose={()=>setEditingTask(null)}
      onSaved={()=>{setReload(value=>value+1);onRecordChanged?.();}}/>
  </section>;
}
