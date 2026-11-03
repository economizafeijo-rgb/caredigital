import { useEffect, useMemo, useRef, useState } from "react";
import { Droplets, CheckCircle2, AlertCircle, Save, SlidersHorizontal, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ClientQuickIntake } from "./ClientQuickIntake";
import { CareTaskRecordModal } from "./CareTaskRecordModal";
import { acreCalendarDay, acreHour, hydrationGoalNotice, type HydrationGoalSnapshot } from "@/lib/hydration-goal";
import {canConfirmCare,careScheduleBlockMessage,careScheduleLabel,getCareScheduleState} from "@/lib/care-schedule";

type Task={id:string;patient_id:string;category:string;title:string;scheduled_at:string;completed_at:string|null};
type Drink={id:string;amount_ml:number;recorded_at:string};
type Response={task_id:string;recorded_at:string};
type Profile={sex:"male"|"female"|"unspecified";age:number;weight_kg:number;objective:"recovery"|"muscle"|"weight";activity_minutes:number;sweat:"low"|"normal"|"high";fluid_restriction:boolean;target_ml:number|null};
type Props={patientId:string;ownerId:string;tasks:Task[];revision:number;onConfirm:(task:Task)=>void;onRecorded:()=>void};
const tz="America/Rio_Branco";
const defaultProfile:Profile={sex:"unspecified",age:0,weight_kg:0,objective:"recovery",activity_minutes:0,sweat:"normal",fluid_restriction:false,target_ml:null};
const round50=(value:number)=>Math.round(value/50)*50;
const time=(iso:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:tz,hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(iso));
const dateKey=(iso:string)=>new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(iso));
function estimate(profile:Profile){
 if(profile.age<18||profile.age>110||profile.weight_kg<30||profile.weight_kg>250||profile.activity_minutes<0||profile.activity_minutes>240)return null;
 const base=round50(profile.weight_kg*30);
 const activity=profile.activity_minutes===0?0:round50(Math.min(600,profile.activity_minutes/60*(profile.sweat==="high"?500:profile.sweat==="low"?250:350)));
 const target=base+activity;
 const reference=profile.sex==="male"?3000:profile.sex==="female"?2200:null;
 return {base,activity,target,reference,requiresReview:profile.fluid_restriction||profile.age>=75||target>4000};
}
export function ClientHydrationTab({patientId,ownerId,tasks,revision,onConfirm,onRecorded}:Props){
 const [profile,setProfile]=useState<Profile>(defaultProfile);
 const [configured,setConfigured]=useState(false);
 const [editing,setEditing]=useState(false);
 const [saving,setSaving]=useState(false);
 const [drinks,setDrinks]=useState<Drink[]>([]);
 const [suggestedByTask,setSuggestedByTask]=useState<Record<string,{suggested_ml:number;reason:string;remaining_ml:number}>>({});
 const [volumeByTask,setVolumeByTask]=useState<Record<string,number>>({});
 const [detailTask,setDetailTask]=useState<Task|null>(null);
 const [page,setPage]=useState(0);
 const [notDrunk,setNotDrunk]=useState<Response[]>([]);
 const [action,setAction]=useState<string|null>(null);
 const [correctingTaskId,setCorrectingTaskId]=useState<string|null>(null);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [reload,setReload]=useState(0);
 const [loading,setLoading]=useState(true);
 const [dailyGoal,setDailyGoal]=useState<HydrationGoalSnapshot|null>(null);
 const lastDeadlineRefresh=useRef<string>("");
 const [clock,setClock]=useState(()=>Date.now());
 useEffect(()=>{const timer=window.setInterval(()=>setClock(Date.now()),1000);return()=>window.clearInterval(timer)},[]);
 // Force a final server read when the 23:00 deadline passes or the Acre date changes.
 useEffect(()=>{
   const day=acreCalendarDay(clock);
   const changed=Boolean(dailyGoal&&dailyGoal.goal_date!==day);
   const passed=Boolean(dailyGoal&&dailyGoal.goal_date===day&&dailyGoal.status==="em_andamento"&&acreHour(clock)>=23);
   if((changed||passed)&&lastDeadlineRefresh.current!==day){
      lastDeadlineRefresh.current=day;setReload(v=>v+1);
   }
 },[clock,dailyGoal?.goal_date,dailyGoal?.status]);
 const update=(change:Partial<Profile>)=>setProfile(prev=>({...prev,...change}));
 useEffect(()=>{let active=true;setLoading(true);
  void (async()=>{
   const now=dateKey(new Date().toISOString());
   const start=new Date(now+"T00:00:00-05:00");
   const end=new Date(start.getTime()+86400000);
   const db=supabase as any;
   const [saved,water,responses,goalSummary,recommended]=await Promise.all([
    db.from("care_hydration_profiles").select("sex,age,weight_kg,objective,activity_minutes,sweat,fluid_restriction,target_ml").eq("patient_id",patientId).maybeSingle(),
    db.from("care_hydration").select("id,amount_ml,recorded_at").eq("patient_id",patientId).eq("owner_id",ownerId).gte("recorded_at",start.toISOString()).lt("recorded_at",end.toISOString()).order("recorded_at",{ascending:true}).limit(200),
    db.from("care_hydration_responses").select("task_id,recorded_at").eq("patient_id",patientId).eq("owner_id",ownerId).limit(100),
    db.rpc("care_sync_hydration_goal",{p_patient_id:patientId}),
    db.from("care_hydration_suggested_portions")
      .select("task_id,suggested_ml,reason,remaining_ml")
      .eq("patient_id",patientId).eq("owner_id",ownerId).limit(120)
   ]);
   if(!active)return;
   if(saved.error||water.error||responses.error||goalSummary.error)setError("Não foi possível consultar todos os registros de hidratação ou o fechamento da meta. Confira as permissões.");
   else setError("");
   if(saved.data){setProfile({...defaultProfile,...saved.data});setConfigured(true)}
   else {setConfigured(false);setEditing(false)}
   setDailyGoal(goalSummary.error?null:goalSummary.data as HydrationGoalSnapshot);
   setDrinks(water.data??[]);
   setNotDrunk(responses.data??[]);
   if(recommended.error){setSuggestedByTask({});setNotice("Sugestões dinâmicas de volume indisponíveis; confira a meta e os registros.");}
   else setSuggestedByTask(Object.fromEntries((recommended.data??[]).map((row:{task_id:string;suggested_ml:number;reason:string;remaining_ml:number})=>
     [row.task_id,{suggested_ml:Number(row.suggested_ml),reason:row.reason,remaining_ml:Number(row.remaining_ml)}])));
   setLoading(false);
  })();
  return()=>{active=false};
 },[patientId,ownerId,revision,reload]);
 const calculation=useMemo(()=>estimate(profile),[profile]);
 const planValid=Boolean(configured&&profile.target_ml&&!profile.fluid_restriction);
 const goal=dailyGoal?.target_ml??(planValid?profile.target_ml!:0);
 const cutoffUtc=Date.parse(acreCalendarDay(clock)+"T23:00:00-05:00");
 const intake=dailyGoal?.consumed_ml??drinks.filter(item=>Date.parse(item.recorded_at)<cutoffUtc).reduce((total,item)=>total+Number(item.amount_ml),0);
 const goalSummary=hydrationGoalNotice(dailyGoal,clock);
 const dayClosed=acreHour(clock)>=23;
 const remaining=goal?Math.max(0,goal-intake):0;
 const percent=goal?Math.min(100,Math.round(intake/goal*100)):0;
 const schedule=useMemo(()=>tasks.filter(item=>item.category==="hidratacao").sort((a,b)=>Date.parse(a.scheduled_at)-Date.parse(b.scheduled_at)),[tasks]);
 const skipped=useMemo(()=>new Map(notDrunk.map(item=>[item.task_id,item.recorded_at])),[notDrunk]);
 // Apenas os lembretes futuros recebem novos volumes sugeridos. Histórico e
 // tarefas já confirmadas permanecem intactos; consumo avulso abate o restante.
 const portions=useMemo(()=>{
   const values=Array<number>(schedule.length).fill(0);
   if(!goal||remaining<10||dayClosed)return values;
   const upcoming=schedule.map((task,index)=>({task,index}))
     .filter(({task})=>!task.completed_at&&!skipped.has(task.id)&&Date.parse(task.scheduled_at)>clock&&Date.parse(task.scheduled_at)<cutoffUtc);
   if(!upcoming.length)return values;
   let left=remaining;
   upcoming.forEach(({index},position)=>{
     const slotsLeft=upcoming.length-position;
     const suggestion=Math.min(350,Math.max(0,Math.round((left/slotsLeft)/10)*10));
     values[index]=suggestion>=10?suggestion:0;
     left=Math.max(0,left-values[index]);
   });
   return values;
 },[schedule,goal,remaining,skipped,clock,dayClosed,cutoffUtc]);
 const fmtCountdown=(ms:number)=>{const sec=Math.max(0,Math.ceil(ms/1000));return [Math.floor(sec/3600),Math.floor(sec%3600/60),sec%60].map(v=>String(v).padStart(2,"0")).join(":");};
 const next=dayClosed||remaining===0?undefined:
   schedule.find(item=>!item.completed_at&&!skipped.has(item.id)&&Date.parse(item.scheduled_at)>=clock&&Date.parse(item.scheduled_at)<cutoffUtc)
   ?? (dayClosed?undefined:schedule.find(item=>!item.completed_at&&!skipped.has(item.id)&&getCareScheduleState(item,clock)==="available"&&Date.parse(item.scheduled_at)<cutoffUtc));
 const pageSize=3;
 const pageCount=Math.max(1,Math.ceil(schedule.length/pageSize));
 const activePage=Math.min(page,pageCount-1);
 const pageTasks=schedule.slice(activePage*pageSize,(activePage+1)*pageSize);
 useEffect(()=>{
   const upcomingIndex=schedule.findIndex(task=>!task.completed_at&&!skipped.has(task.id)&&Date.parse(task.scheduled_at)>=Date.now());
   const fallbackIndex=schedule.findIndex(task=>!task.completed_at&&!skipped.has(task.id));
   const index=upcomingIndex>=0?upcomingIndex:fallbackIndex>=0?fallbackIndex:Math.max(0,schedule.length-1);
   setPage(Math.floor(index/3));
 },[patientId,revision,schedule.length]);
 async function saveProfile(){
  if(!calculation||saving)return;
  setSaving(true);setError("");setNotice("");
  const target=calculation.requiresReview?null:calculation.target;
  const data={...profile,patient_id:patientId,owner_id:ownerId,target_ml:target,updated_at:new Date().toISOString()};
  const result=await (supabase as any).from("care_hydration_profiles").upsert(data,{onConflict:"patient_id"});
  setSaving(false);
  if(result.error){setError("Não foi possível salvar o perfil no prontuário.");return}
  setProfile({...profile,target_ml:target});setConfigured(true);setEditing(false);
  setNotice(target?"Programa personalizado salvo.":"Perfil salvo; solicite uma meta individual ao profissional de saúde.");
  setReload(n=>n+1);
 }
 async function confirmGlass(task:Task,volume:number){
  if(action)return;
  if(!canConfirmCare(task)){setError(careScheduleBlockMessage(task));return}
  if(!Number.isFinite(volume)||volume<10||volume>1500){setError("Informe um volume real entre 10 e 1500 ml.");return}
  setAction(task.id);setError("");setNotice("");
  const res=await (supabase as any).rpc("care_record_water_decision",{p_task_id:task.id,p_decision:"drank",p_amount_ml:volume});
  setAction(null);
  if(res.error||res.data?.decision!=="drank"){setError(/Care window not started|Care window expired/i.test(res.error?.message??"")?careScheduleBlockMessage(task):`Não foi possível verificar o registro: ${res.error?.message??"consulte o prontuário antes de tentar novamente"}`);onRecorded();return}
  setNotice(`${volume} ml de água registrados com a hora real do servidor. ${skipped.has(task.id)?"Resposta anterior corrigida. ":""}O acompanhamento será atualizado.`);
  setCorrectingTaskId(null);
  onRecorded();
  setReload(n=>n+1);
 }
 async function markNo(task:Task){
  if(action)return;
  if(!canConfirmCare(task)){setError(careScheduleBlockMessage(task));return}
  setAction(task.id);setError("");setNotice("");
  const res=await (supabase as any).rpc("care_record_water_decision",{p_task_id:task.id,p_decision:"not_drunk",p_amount_ml:null});
  setAction(null);
  if(res.error||res.data?.decision!=="not_drunk"){setError(/Care window not started|Care window expired/i.test(res.error?.message??"")?careScheduleBlockMessage(task):`Não foi possível confirmar a resposta: ${res.error?.message??"consulte o prontuário antes de repetir"}`);return}
  setNotDrunk(prev=>[...prev.filter(t=>t.task_id!==task.id),{task_id:task.id,recorded_at:res.data.recorded_at}]);
  setNotice("Resposta “Não bebi” registrada com o horário real. Nenhum volume foi contabilizado.");
  onRecorded();setReload(n=>n+1);
 }
 async function undoNo(task:Task){
  if(action)return;
  setAction(task.id);setError("");setNotice("");
  const res=await (supabase as any).rpc("care_record_water_decision",{p_task_id:task.id,p_decision:"reset_not_drunk",p_amount_ml:null});
  setAction(null);
  if(res.error||res.data?.decision!=="reset_not_drunk"){setError(`Não foi possível verificar a correção: ${res.error?.message??"consulte o prontuário"}`);return}
  setNotDrunk(prev=>prev.filter(t=>t.task_id!==task.id));
  setCorrectingTaskId(null);
  setNotice("Resposta anterior desfeita; este horário está novamente sem confirmação.");
  onRecorded();setReload(n=>n+1);
 }
 return <section className="flex min-h-0 w-full min-w-0 flex-col gap-2" aria-label="Programa personalizado de hidratação">
  <header className="flex flex-wrap items-center justify-between gap-2">
    <div className="min-w-0">
      <h3 className="flex items-center gap-1.5 text-sm font-extrabold"><Droplets size={18} className="text-sky-600 dark:text-sky-300"/> Minha hidratação</h3>
      <p className="text-[10px] text-muted-foreground">Meta diária até 23h · horário do Acre · água registrada</p>
    </div>
    <div className="flex flex-wrap items-center gap-1.5">
      <ClientQuickIntake patientId={patientId} mode="water" onRecorded={()=>{setReload(n=>n+1);onRecorded();}}/>
      <button type="button" aria-expanded={editing} onClick={()=>setEditing(value=>!value)}
        className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-2.5 text-[11px] font-semibold text-foreground hover:bg-muted">
        <SlidersHorizontal size={14}/>{editing?"Fechar perfil":"Ajustar meta"}
      </button>
    </div>
  </header>
  {editing&&<div className="rounded-xl border border-border bg-muted/30 p-2.5">
    <p className="mb-2 text-xs font-bold">Perfil para estimar a meta diária</p>
    <div className="grid grid-cols-2 gap-2">
      <label className="text-[11px]">Sexo para referência<select className="field mt-1" value={profile.sex} onChange={e=>update({sex:e.target.value as Profile["sex"]})}><option value="unspecified">Prefiro não informar</option><option value="male">Masculino</option><option value="female">Feminino</option></select></label>
      <label className="text-[11px]">Idade (anos)<input className="field mt-1" type="number" min="18" max="110" value={profile.age||""} onChange={e=>update({age:Number(e.target.value)})} placeholder="Informe"/></label>
      <label className="text-[11px]">Peso (kg)<input className="field mt-1" type="number" min="30" max="250" step=".5" value={profile.weight_kg||""} onChange={e=>update({weight_kg:Number(e.target.value)})} placeholder="Informe"/></label>
      <label className="text-[11px]">Objetivo<select className="field mt-1" value={profile.objective} onChange={e=>update({objective:e.target.value as Profile["objective"]})}><option value="recovery">Hidratação e recuperação</option><option value="muscle">Ganho de massa muscular</option><option value="weight">Controle do peso</option></select></label>
      <label className="text-[11px]">Treino (min/dia)<input className="field mt-1" type="number" min="0" max="240" value={profile.activity_minutes} onChange={e=>update({activity_minutes:Number(e.target.value)})}/></label>
      <label className="text-[11px]">Transpiração<select className="field mt-1" value={profile.sweat} onChange={e=>update({sweat:e.target.value as Profile["sweat"]})}><option value="low">Pouca</option><option value="normal">Moderada</option><option value="high">Intensa</option></select></label>
      <label className="col-span-2 flex gap-2 rounded-lg border border-border p-2 text-xs"><input type="checkbox" checked={profile.fluid_restriction} onChange={e=>update({fluid_restriction:e.target.checked})}/><span>Tenho restrição de líquidos ou orientação profissional especial.</span></label>
    </div>
    {calculation
      ? <p className="mt-2 rounded-lg bg-card p-2 text-[11px]"><strong>Estimativa: {calculation.target.toLocaleString("pt-BR")} ml/dia.</strong> Referência de aproximadamente 30 ml/kg com ajuste ilustrativo à atividade.
        {calculation.requiresReview&&<span className="mt-1 block font-semibold text-amber-700 dark:text-amber-300"><AlertCircle size={12} className="mr-1 inline"/>Meta individual deve ser avaliada por profissional.</span>}
        {calculation.reference&&<span className="block text-muted-foreground">Referência populacional: {calculation.reference} ml/dia.</span>}
        </p>
      : <p className="mt-2 text-[11px] text-muted-foreground">Informe idade e peso válidos para estimar o consumo.</p>}
    <button type="button" disabled={!calculation||saving} onClick={()=>void saveProfile()}
      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"><Save size={14}/>{saving?"Salvando…":"Salvar meta"}</button>
  </div>}
  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
    {[
      {label:"Meta diária",value:goal?`${goal.toLocaleString("pt-BR")} ml`:"A definir"},
      {label:"Consumido",value:`${intake.toLocaleString("pt-BR")} ml`},
      {label:"Restante",value:goal?`${remaining.toLocaleString("pt-BR")} ml`:"—"},
      {label:"Próxima água",value:dayClosed?"Encerrado":remaining===0?"Meta atingida":next?time(next.scheduled_at):"Até 23h"}
    ].map(item=><div key={item.label} className="min-w-0 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-2">
      <p className="truncate text-[10px] font-medium text-muted-foreground">{item.label}</p>
      <p className="mt-0.5 truncate text-sm font-extrabold tabular-nums text-foreground">{item.value}</p>
    </div>)}
  </div>
  {next&&remaining>0&&!dayClosed&&<p aria-live="off" className="rounded-lg border border-sky-500/20 bg-sky-500/[.05] px-2.5 py-2 text-[11px] font-semibold">Próxima verificação de água em <strong className="font-mono tabular-nums">{fmtCountdown(Date.parse(next.scheduled_at)-clock)}</strong> · horário recalculado automaticamente após cada consumo, quando necessário.</p>}
  <div className="flex items-center gap-2.5">
    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar"
      aria-label="Progresso da meta de hidratação" aria-valuemin={0} aria-valuemax={goal||1} aria-valuenow={goal?Math.min(intake,goal):0}>
      <div className="h-full rounded-full bg-sky-500 transition-[width]" style={{width:percent+"%"}}/>
    </div>
    <span className="shrink-0 text-[11px] font-bold tabular-nums text-foreground">{goal?`${percent}%`:"Meta pendente"}</span>
  </div>
  {!planValid&&<button type="button" onClick={()=>setEditing(true)} className="rounded-lg border border-amber-300/30 bg-amber-500/5 px-2 py-1.5 text-left text-[11px] text-foreground">Defina uma meta em <strong>Ajustar meta</strong> para calcular volumes sugeridos. Os registros reais continuam disponíveis.</button>}
  {!loading&&dailyGoal&&dailyGoal.status!=="sem_meta"&&<div role="status" aria-live="polite" className={`flex items-start gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] leading-snug ${goalSummary.kind==="met"?"border-emerald-500/25 bg-emerald-500/[.045] text-foreground":goalSummary.kind==="missed"?"border-amber-500/25 bg-amber-500/[.04] text-foreground":"border-border/70 bg-muted/25 text-foreground"}`}>
    {goalSummary.kind==="met"?<CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300"/>:<Info size={14} className="mt-0.5 shrink-0 text-muted-foreground"/>}
    <div><strong className="block text-[11px] font-bold">{goalSummary.title}</strong><p className="mt-0.5 text-[10px] text-muted-foreground">{goalSummary.message}</p></div>
  </div>}
  {!loading&&!dailyGoal&&goal>0&&<p className="text-[10px] text-muted-foreground">Meta até 23h (Acre). O resumo automático não está disponível no momento.</p>}
  <div className="rounded-xl border border-border bg-card/70 p-2.5">
    <div className="mb-2 flex min-w-0 items-center justify-between gap-2 border-b border-border/70 pb-2">
      <div>
        <h4 className="text-xs font-extrabold text-foreground">Horários e registros</h4>
        <p className="text-[10px] text-muted-foreground">Toque em um registro confirmado para consultar ou corrigir</p>
      </div>
      <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[10px] font-semibold tabular-nums text-foreground">{schedule.length} horários</span>
    </div>
    <div className="space-y-1.5">
      {pageTasks.map(task=>{
        const i=schedule.findIndex(item=>item.id===task.id);
        const answered=skipped.get(task.id);
        const status=task.completed_at?"done":answered?"skipped":getCareScheduleState(task,clock)==="missed"?"missed":"pending";
        const available=canConfirmCare(task,clock);
        const correcting=correctingTaskId===task.id;
        const backend=suggestedByTask[task.id];
        const suggested=backend?.suggested_ml??(portions[i]||0);
        const defaultVolume=volumeByTask[task.id]??(suggested>0?suggested:200);
        return <article key={task.id} className={`flex min-w-0 flex-col gap-1.5 rounded-lg border px-2 py-1.5 ${status==="done"?"border-emerald-500/25 bg-emerald-500/[.055]":status==="skipped"?"border-amber-500/30 bg-amber-500/[.04]":"border-border/75 bg-muted/25"}`}>
          <div className="flex min-w-0 items-center gap-2"><span className={`grid size-7 shrink-0 place-items-center rounded-lg ${status==="done"?"bg-emerald-500/10 text-emerald-600 dark:text-emerald-300":"bg-sky-500/10 text-sky-600 dark:text-sky-300"}`}>{status==="done"?<CheckCircle2 size={16}/>:<Droplets size={16}/>}</span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-1 text-[11px] font-bold text-foreground"><span className="tabular-nums">{time(task.scheduled_at)}</span><span>· Água</span>{suggested>0&&!task.completed_at&&<span className="rounded bg-sky-500/10 px-1 text-[10px] text-sky-700 dark:text-sky-300">~{suggested} ml</span>}</p>
            {backend?.reason==="restante_supera_capacidade"&&!task.completed_at&&<p className="text-[10px] text-amber-700 dark:text-amber-300">Meta restante exige fracionamento adicional; não tente beber tudo de uma vez.</p>}
            <p className="truncate text-[10px] text-muted-foreground">{status==="done"?`Bebi · confirmado em ${time(task.completed_at!)}`:status==="skipped"?`Não bebi · resposta às ${time(answered!)}`:available?"Informe se bebeu ou não bebeu":`Programado · disponível a partir de ${time(task.scheduled_at)}`}</p>
          </div>
          {status==="done"?<button type="button" onClick={()=>setDetailTask(task)} title="Consultar e corrigir volume" className="shrink-0 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300">Ver registro</button>
           :status==="skipped"?<button type="button" disabled={Boolean(action)} onClick={()=>setCorrectingTaskId(correcting?null:task.id)}
             className="shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[11px] font-bold text-foreground disabled:opacity-50">{correcting?"Fechar":"Corrigir"}</button>
           :available?<span className="shrink-0 rounded-md bg-sky-500/10 px-2 py-1 text-[10px] font-semibold text-sky-700 dark:text-sky-300">Responder</span>
           :<span className="shrink-0 text-[10px] font-medium text-muted-foreground">Aguardando</span>}
          </div>
          {((available&&!answered)||correcting)&&status!=="done"&&<div className="flex min-w-0 flex-wrap items-center gap-1.5 pl-0 sm:pl-9">
             <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
               <span>Volume</span><input aria-label={`Volume de água às ${time(task.scheduled_at)} em ml`}
                 type="number" min={10} max={1500} step={10}
                 value={defaultVolume} onChange={e=>setVolumeByTask(prev=>({...prev,[task.id]:Number(e.target.value)}))}
                 className="h-8 w-[65px] rounded-md border border-border bg-background px-1.5 text-center text-[11px] font-semibold text-foreground"/>
               <span>ml</span>
             </label>
             <button type="button" disabled={Boolean(action)} onClick={()=>void confirmGlass(task,defaultVolume)}
               className="h-8 rounded-lg bg-primary px-2.5 text-[11px] font-bold text-primary-foreground disabled:opacity-50">{action===task.id?"Salvando…":"Bebi"}</button>
             {correcting?<button type="button" disabled={Boolean(action)} onClick={()=>void undoNo(task)}
               className="h-8 rounded-lg border border-border px-2 text-[11px] font-semibold text-foreground disabled:opacity-50">Desfazer “Não bebi”</button>
               :<button type="button" disabled={Boolean(action)} onClick={()=>void markNo(task)}
               className="h-8 rounded-lg border border-border px-2.5 text-[11px] font-semibold text-foreground disabled:opacity-50">Não bebi</button>}
          </div>}
          {!available&&!task.completed_at&&!answered&&<p className="text-[10px] text-muted-foreground sm:pl-9">Se bebeu antes deste horário, use “Registrar água” para salvar agora sem antecipar a programação.</p>}
        </article>;
      })}
      {!pageTasks.length&&<p className="rounded-lg bg-muted/30 p-2 text-xs text-muted-foreground">Nenhum horário de hidratação programado. Você ainda pode usar <strong>Registrar água</strong>.</p>}
    </div>
    {pageCount>1&&<nav aria-label="Páginas dos horários de hidratação" className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
      <button type="button" disabled={activePage===0} onClick={()=>setPage(p=>Math.max(0,p-1))}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-[11px] font-semibold text-foreground disabled:opacity-35"><ChevronLeft size={13}/> Anterior</button>
      <span className="text-[10px] tabular-nums text-muted-foreground">Página {activePage+1} de {pageCount}</span>
      <button type="button" disabled={activePage>=pageCount-1} onClick={()=>setPage(p=>Math.min(pageCount-1,p+1))}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-[11px] font-semibold text-foreground disabled:opacity-35">Próxima <ChevronRight size={13}/></button>
    </nav>}
  </div>
  {loading&&<p role="status" className="text-[11px] text-muted-foreground">Atualizando registros de água…</p>}
  {error&&<p role="alert" className="rounded-lg bg-destructive/5 p-2 text-xs text-destructive">{error}</p>}
  {notice&&<p role="status" className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{notice}</p>}
  <details className="group rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5 text-[10px] text-muted-foreground">
    <summary className="flex cursor-pointer items-center gap-1.5 font-semibold text-foreground"><Info size={13}/> Orientações e referências</summary>
    <p className="mt-2 leading-relaxed">A meta é avaliada às 23h (Acre) e considera somente registros de água feitos entre 00h e 23h. Consumos depois das 23h continuam no prontuário, mas não alteram o resultado já encerrado. A necessidade de água varia conforme peso, idade, atividade física, temperatura e orientações médicas. A meta é estimativa, não obrigação. Evite grandes volumes de uma só vez e respeite qualquer restrição prescrita.</p>
    <p className="mt-1">Referências: <a className="underline" href="https://www.nationalacademies.org/read/10925/chapter/6" target="_blank" rel="noreferrer">National Academies</a> · <a className="underline" href="https://pubmed.ncbi.nlm.nih.gov/17277604/" target="_blank" rel="noreferrer">ACSM</a>.</p>
  </details>
  <CareTaskRecordModal task={detailTask} onClose={()=>setDetailTask(null)} onSaved={()=>{setReload(value=>value+1);onRecorded();}}/>
 </section>;
}
