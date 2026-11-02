/** Patient history presentation only. No database record is modified here. */
export type HistoryGroup = "liquidos" | "refeicoes" | "cuidados" | "ajustes";
export type HistoryStatus = "confirmado" | "registrado" | "nao_confirmado" | "nao_bebi" | "corrigido" | "reprogramado" | "excluido" | "meta_atingida" | "meta_nao_atingida";
export type HistoryEntry = {
  id: string;
  group: HistoryGroup;
  subtype: string;
  status: HistoryStatus;
  title: string;
  description?: string;
  scheduledAt?: string;
  occurredAt: string;
  amountMl?: number;
  automatic?: boolean;
};
export type ChecklistRow = { id:string; category:string; title:string; scheduled_at:string; completed_at:string|null };
export type WaterRow = { id:string; task_id:string|null; amount_ml:number; recorded_at:string };
export type MealRow = { task_id:string; description:string };
export type DrinkRow = {id:string;kind:string;name:string;amount_ml:number;notes?:string|null;consumed_at:string};
export type ObservationRow = {id:string;observation_type:string;notes:string|null;recorded_at:string};
export type AuditRow = {
  id:string;category:string;event_type:string;source:string|null;
  details:Record<string,unknown>|null;task_id?:string|null;
  scheduled_at:string|null;happened_at:string|null;recorded_at:string;
};
export type WaterResponseRow={task_id:string;response:string;recorded_at:string};
export type DailyHydrationGoalRow={goal_date:string;target_ml:number;consumed_ml:number;status:"em_andamento"|"atingida"|"nao_atingida";closed_at:string|null;updated_at:string};
export type HistorySources = {
  checklist:ChecklistRow[];
  water:WaterRow[];
  meals:MealRow[];
  drinks:DrinkRow[];
  observations:ObservationRow[];
  audit:AuditRow[];
  responses:WaterResponseRow[];
  dailyGoals?:DailyHydrationGoalRow[];
};

const acreFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone:"America/Rio_Branco",year:"numeric",month:"2-digit",day:"2-digit"
});
export const acreDay=(timestamp:string)=>acreFormatter.format(new Date(timestamp));
const text=(value:unknown,fallback="")=>typeof value==="string"&&value.trim()?value.trim():fallback;
const quantity=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)?value:undefined;
const clock=(iso:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Rio_Branco",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(iso));
const drinkType=(kind:string)=>kind==="agua"?"agua":kind==="cha"?"cha":kind==="suco"?"suco":kind==="cafe"?"cafe":"outra";
const groupOf=(category:string):HistoryGroup=>category==="hidratacao"?"liquidos":category==="refeicao"?"refeicoes":"cuidados";
const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();

export function assembleCareHistory(sources:HistorySources,now=Date.now()):HistoryEntry[]{
  const events:HistoryEntry[]=[];
  const checklist=new Map(sources.checklist.map(row=>[row.id,row]));
  const waterByTask=new Map(sources.water.filter(item=>item.task_id).map(item=>[item.task_id!,item]));
  const mealByTask=new Map(sources.meals.map(item=>[item.task_id,item]));
  const skipByTask=new Map(sources.responses.filter(item=>item.response==="not_drunk").map(item=>[item.task_id,item]));
  const today=acreDay(new Date(now).toISOString());

  for(const task of sources.checklist){
    const water=waterByTask.get(task.id);
    const description=mealByTask.get(task.id)?.description;
    const group=groupOf(task.category);
    const isWater=task.category==="hidratacao";
    const skipped=skipByTask.get(task.id);
    if(task.completed_at){
      events.push({
        id:"task-"+task.id,group,subtype:isWater?"agua":task.category==="refeicao"?/lanche|ceia/i.test(task.title)?"lanche":"refeicao":task.category,
        status:"confirmado",
        title:isWater&&water?"Água · "+water.amount_ml+" ml":task.title,
        description:description||(isWater?(water?"Consumo de água confirmado na agenda.":"Hidratação confirmada; volume não vinculado ao registro."):"Confirmação registrada no sistema."),
        amountMl:isWater?water?.amount_ml:undefined,
        scheduledAt:task.scheduled_at,occurredAt:task.completed_at
      });
    } else if(skipped){
      events.push({id:"skip-"+task.id,group:"liquidos",subtype:"agua",status:"nao_bebi",
        title:"Água · não bebi",description:"Resposta registrada para o horário previsto.",
        scheduledAt:task.scheduled_at,occurredAt:skipped.recorded_at});
    } else if(acreDay(task.scheduled_at)<today){
      events.push({
        id:"pending-"+task.id,group,subtype:isWater?"agua":task.category==="refeicao"?/lanche|ceia/i.test(task.title)?"lanche":"refeicao":task.category,
        status:"nao_confirmado",title:task.title,
        description:"Sem confirmação registrada para esse horário. Isso não comprova que o cuidado deixou de acontecer.",
        scheduledAt:task.scheduled_at,occurredAt:task.scheduled_at
      });
    }
  }
  for(const water of sources.water){
    // Task-linked hydration appears once, enriched with the actual ml above.
    if(water.task_id&&checklist.has(water.task_id))continue;
    events.push({id:"water-"+water.id,group:"liquidos",subtype:"agua",status:"registrado",
      title:"Água · "+water.amount_ml+" ml",
      description:water.task_id?"Consumo de água associado a uma confirmação anterior.":"Água registrada fora da programação.",
      amountMl:water.amount_ml,occurredAt:water.recorded_at});
  }
  for(const drink of sources.drinks){
    const kind=drinkType(drink.kind);
    const label=kind==="cha"?"Chá":kind==="suco"?"Suco":kind==="cafe"?"Café":kind==="agua"?"Água":"Bebida";
    events.push({id:"drink-"+drink.id,group:"liquidos",subtype:kind,status:"registrado",
      title:label+" · "+drink.amount_ml+" ml",
      description:[text(drink.name),text(drink.notes)].filter(Boolean).join(" · "),
      amountMl:drink.amount_ml,occurredAt:drink.consumed_at});
  }
  for(const obs of sources.observations){
    events.push({id:"observation-"+obs.id,group:"cuidados",subtype:"observacao",status:"registrado",
      title:text(obs.observation_type,"Observação"),description:text(obs.notes),
      occurredAt:obs.recorded_at});
  }

  // One outcome per Acre date. In-progress goals do not appear as failures.
  for(const day of sources.dailyGoals??[]){
    if(day.status==="em_andamento")continue;
    const reached=day.status==="atingida";
    const rest=Math.max(0,day.target_ml-day.consumed_ml);
    const formattedDate=day.goal_date.split("-").reverse().join("/");
    events.push({
      id:"goal-"+day.goal_date,group:"liquidos",subtype:"meta_diaria",
      status:reached?"meta_atingida":"meta_nao_atingida",
      title:reached?"Meta diária de água atingida":"Meta diária de água não atingida",
      description:`${day.consumed_ml.toLocaleString("pt-BR")} de ${day.target_ml.toLocaleString("pt-BR")} ml · ${formattedDate}${reached?" · meta alcançada":` · faltaram ${rest.toLocaleString("pt-BR")} ml`}. A janela diária encerra às 23h (Acre).`,
      occurredAt:day.closed_at??day.updated_at,
    });
  }

  const reflow=new Map<string,{events:AuditRow[];category:string;recordedAt:string}>();
  for(const item of sources.audit){
    const details=item.details??{};
    const kind=text(details.kind);
    if(item.event_type==="confirmed")continue; // Already represented by checklist.
    if(item.source==="client_unscheduled_intake"){
      if(kind!=="refeicao"&&kind!=="lanche")continue; // Water and drinks come from their source tables.
      events.push({id:"manual-meal-"+item.id,group:"refeicoes",subtype:kind,status:"registrado",
        title:kind==="lanche"?"Lanche extra":"Refeição extra",
        description:text(details.description,"Alimentos informados pelo paciente"),
        occurredAt:item.recorded_at});
      continue;
    }
    if(item.event_type==="rescheduled"){
      const key=item.source+"|"+item.category+"|"+item.recorded_at.slice(0,19);
      const batch=reflow.get(key);
      if(batch)batch.events.push(item);
      else reflow.set(key,{events:[item],category:item.category,recordedAt:item.recorded_at});
      continue;
    }
    if(item.event_type==="water_volume_corrected"){
      events.push({id:"correction-"+item.id,group:"ajustes",subtype:"correcao",status:"corrigido",
        title:"Volume de água corrigido",
        description:String(details.previous_ml??"—")+" ml → "+String(details.corrected_ml??"—")+" ml. O horário original foi preservado.",
        occurredAt:item.recorded_at,automatic:false});
      continue;
    }
    if(item.event_type==="deleted"){
      events.push({id:"deletion-"+item.id,group:"ajustes",subtype:"exclusao",status:"excluido",
        title:"Refeição excluída",description:text(details.title,"Exclusão registrada no prontuário."),
        occurredAt:item.recorded_at});
      continue;
    }
    if(item.event_type==="patient_report"){
      events.push({id:"report-"+item.id,group:"cuidados",subtype:"medicacao",status:"registrado",
        title:"Relato de medicação",description:"Informação relatada pelo paciente; não equivale à confirmação de dose.",
        occurredAt:item.recorded_at,scheduledAt:item.scheduled_at??undefined});
      continue;
    }
    events.push({id:"audit-"+item.id,group:groupOf(item.category),subtype:item.category,status:"registrado",
      title:text(details.title,"Registro de "+(item.category==="hidratacao"?"hidratação":item.category==="refeicao"?"refeição":"cuidado")),
      description:"Evento do prontuário: "+text(item.event_type,"registro"),
      occurredAt:item.recorded_at,scheduledAt:item.scheduled_at??undefined});
  }
  for(const [key,batch] of reflow){
    const count=batch.events.length;
    const name=batch.category==="hidratacao"?"hidratação":batch.category==="refeicao"?"refeições":"cuidados";
    const before=batch.events.map(item=>text(item.details?.previous_scheduled_at)).filter(Boolean);
    const after=batch.events.map(item=>text(item.details?.next_scheduled_at)).filter(Boolean);
    const sample=before[0]&&after[0]?" Exemplo: "+clock(before[0])+" → "+clock(after[0])+".":"";
    events.push({id:"reschedule-"+key,group:"ajustes",subtype:"reprogramacao",status:"reprogramado",
      title:count+" "+(count===1?"horário ajustado":"horários ajustados")+" · "+name,
      description:"Reorganização automática da agenda, não é novo consumo."+sample,
      occurredAt:batch.recordedAt,automatic:true});
  }
  return events.sort((a,b)=>Date.parse(b.occurredAt)-Date.parse(a.occurredAt));
}

export type HistoryPeriod="hoje"|"7d"|"30d";
export type HistoryFilter={
  group:"todos"|HistoryGroup;subtype:string;status:"todos"|HistoryStatus;
  period:HistoryPeriod;query:string;order:"recentes"|"antigos";
};
export function filterCareHistory(items:HistoryEntry[],f:HistoryFilter,now=Date.now()){
  const currentDay=acreDay(new Date(now).toISOString());
  const cutoff=now-(f.period==="7d"?7:30)*86400000;
  const term=normalize(f.query.trim());
  return items.filter(item=>{
    if(f.group!=="todos"&&item.group!==f.group)return false;
    if(f.subtype!=="todos"&&item.subtype!==f.subtype)return false;
    if(f.status!=="todos"&&item.status!==f.status)return false;
    if(f.period==="hoje"&&acreDay(item.occurredAt)!==currentDay)return false;
    if(f.period!=="hoje"&&Date.parse(item.occurredAt)<cutoff)return false;
    if(term&&!normalize([item.title,item.description??"",item.subtype,item.status].join(" ")).includes(term))return false;
    return true;
  }).sort((a,b)=>f.order==="antigos"
    ?Date.parse(a.occurredAt)-Date.parse(b.occurredAt)
    :Date.parse(b.occurredAt)-Date.parse(a.occurredAt));
}
