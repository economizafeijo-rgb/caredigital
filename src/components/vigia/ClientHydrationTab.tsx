import { useEffect, useMemo, useState } from "react";
import { Droplets, CheckCircle2, AlertCircle, Save, SlidersHorizontal, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ClientQuickIntake } from "./ClientQuickIntake";
import { CareTaskRecordModal } from "./CareTaskRecordModal";
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
 const [volumeByTask,setVolumeByTask]=useState<Record<string,number>>({});
 const [detailTask,setDetailTask]=useState<Task|null>(null);
 const [page,setPage]=useState(0);
 const [notDrunk,setNotDrunk]=useState<Response[]>([]);
 const [action,setAction]=useState<string|null>(null);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [reload,setReload]=useState(0);
 const [loading,setLoading]=useState(true);
 const [clock,setClock]=useState(()=>Date.now());
 useEffect(()=>{const timer=window.setInterval(()=>setClock(Date.now()),10000);return()=>window.clearInterval(timer)},[]);
 const update=(change:Partial<Profile>)=>setProfile(prev=>({...prev,...change}));
 useEffect(()=>{let active=true;setLoading(true);
  void (async()=>{
   const now=dateKey(new Date().toISOString());
   const start=new Date(now+"T00:00:00-05:00");
   const end=new Date(start.getTime()+86400000);
   const db=supabase as any;
   const [saved,water,responses]=await Promise.all([
    db.from("care_hydration_profiles").select("sex,age,weight_kg,objective,activity_minutes,sweat,fluid_restriction,target_ml").eq("patient_id",patientId).maybeSingle(),
    db.from("care_hydration").select("id,amount_ml,recorded_at").eq("patient_id",patientId).eq("owner_id",ownerId).gte("recorded_at",start.toISOString()).lt("recorded_at",end.toISOString()).order("recorded_at",{ascending:true}).limit(200),
    db.from("care_hydration_responses").select("task_id,recorded_at").eq("patient_id",patientId).eq("owner_id",ownerId).limit(100)
   ]);
   if(!active)return;
   if(saved.error||water.error||responses.error)setError("Não foi possível consultar todos os registros de hidratação. Confira as permissões.");
   else setError("");
   if(saved.data){setProfile({...defaultProfile,...saved.data});setConfigured(true)}
   else {setConfigured(false);setEditing(false)}
   setDrinks(water.data??[]);
   setNotDrunk(responses.data??[]);
   setLoading(false);
  })();
  return()=>{active=false};
 },[patientId,ownerId,revision,reload]);
 const calculation=useMemo(()=>estimate(profile),[profile]);
 const planValid=Boolean(configured&&profile.target_ml&&!profile.fluid_restriction);
 const goal=planValid?profile.target_ml!:0;
 const intake=drinks.reduce((total,item)=>total+Number(item.amount_ml),0);
 const remaining=goal?Math.max(0,goal-intake):0;
 const percent=goal?Math.min(100,Math.round(intake/goal*100)):0;
 const schedule=useMemo(()=>tasks.filter(item=>item.category==="hidratacao").sort((a,b)=>Date.parse(a.scheduled_at)-Date.parse(b.scheduled_at)),[tasks]);
 const skipped=useMemo(()=>new Map(notDrunk.map(item=>[item.task_id,item.recorded_at])),[notDrunk]);
 // Apenas os lembretes futuros recebem novos volumes sugeridos. Histórico e
 // tarefas já confirmadas permanecem intactos; consumo avulso abate o restante.
 const portions=useMemo(()=>{
   const values=Array<number>(schedule.length).fill(0);
   if(!goal||remaining<10)return values;
   const upcoming=schedule.map((task,index)=>({task,index}))
     .filter(({task})=>!task.completed_at&&!skipped.has(task.id)&&Date.parse(task.scheduled_at)>clock);
   if(!upcoming.length)return values;
   let left=remaining;
   upcoming.forEach(({index},position)=>{
     const slotsLeft=upcoming.length-position;
     const suggestion=Math.min(1500,Math.max(0,Math.round((left/slotsLeft)/10)*10));
     values[index]=suggestion>=10?suggestion:0;
     left=Math.max(0,left-values[index]);
   });
   return values;
 },[schedule,goal,remaining,skipped,clock]);
 const next=schedule.find(item=>!item.completed_at&&!skipped.has(item.id)&&Date.parse(item.scheduled_at)>=clock) ?? schedule.find(item=>!item.completed_at&&!skipped.has(item.id)&&getCareScheduleState(item,clock)==="available");
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
  const res=await (supabase as any).rpc("care_confirm_task",{p_task_id:task.id,p_water_ml:volume});
  setAction(null);
  if(res.error){setError(/Care window not started|Care window expired/i.test(res.error.message??"")?careScheduleBlockMessage(task):"Não foi possível confirmar a água. Confira sua conexão ou tente novamente.");onRecorded();return}
  setNotice(`Copo de ${volume} ml registrado com a hora real do servidor. Os próximos horários de água podem ser recalculados.`);
  onRecorded();
  setReload(n=>n+1);
 }
 async function markNo(task:Task){
  if(action)return;
  if(!canConfirmCare(task)){setError(careScheduleBlockMessage(task));return}
  setAction(task.id);setError("");setNotice("");
  const res=await (supabase as any).rpc("care_mark_water_not_drunk",{p_task_id:task.id});
  setAction(null);
  if(res.error){setError(/Care window not started|Care window expired/i.test(res.error.message??"")?careScheduleBlockMessage(task):"Não foi possível registrar a resposta. Tente novamente.");return}
  setNotDrunk(prev=>[...prev.filter(t=>t.task_id!==task.id),{task_id:task.id,recorded_at:res.data}]);
  setNotice("Resposta 'Não bebi' salva no prontuário. Nenhum volume foi contabilizado.");
 }
 return <section className="flex min-h-0 w-full min-w-0 flex-col gap-2" aria-label="Programa personalizado de hidratação">
  <header className="flex flex-wrap items-center justify-between gap-2">
    <div className="min-w-0">
      <h3 className="flex items-center gap-1.5 text-sm font-extrabold"><Droplets size={18} className="text-sky-600 dark:text-sky-300"/> Minha hidratação</h3>
      <p className="text-[10px] text-muted-foreground">Consumo real · horário do Acre · acompanhamento diário</p>
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
      {label:"Próxima água",value:next?time(next.scheduled_at):"Sem pendência"}
    ].map(item=><div key={item.label} className="min-w-0 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-2">
      <p className="truncate text-[10px] font-medium text-muted-foreground">{item.label}</p>
      <p className="mt-0.5 truncate text-sm font-extrabold tabular-nums text-foreground">{item.value}</p>
    </div>)}
  </div>
  <div className="flex items-center gap-2.5">
    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar"
      aria-label="Progresso da meta de hidratação" aria-valuemin={0} aria-valuemax={goal||1} aria-valuenow={goal?Math.min(intake,goal):0}>
      <div className="h-full rounded-full bg-sky-500 transition-[width]" style={{width:percent+"%"}}/>
    </div>
    <span className="shrink-0 text-[11px] font-bold tabular-nums text-foreground">{goal?`${percent}%`:"Meta pendente"}</span>
  </div>
  {!planValid&&<button type="button" onClick={()=>setEditing(true)} className="rounded-lg border border-amber-300/30 bg-amber-500/5 px-2 py-1.5 text-left text-[11px] text-foreground">Defina uma meta em <strong>Ajustar meta</strong> para calcular volumes sugeridos. Os registros reais continuam disponíveis.</button>}
  {goal>0&&<p className="text-[10px] text-muted-foreground">{remaining===0?"Meta estimada atingida; não é necessário beber apenas para cumprir avisos.":`Restam ${remaining.toLocaleString("pt-BR")} ml. As porções sugeridas se ajustam aos próximos horários ainda pendentes.`}</p>}
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
        const available=canConfirmCare(task,clock)&&!answered;
        const suggested=portions[i]||0;
        const defaultVolume=volumeByTask[task.id]??(suggested>0?suggested:200);
        return <article key={task.id} className={`flex min-w-0 items-center gap-2 rounded-lg border px-2 py-1.5 ${status==="done"?"border-emerald-500/25 bg-emerald-500/[.055]":"border-border/75 bg-muted/25"}`}>
          <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${status==="done"?"bg-emerald-500/10 text-emerald-600 dark:text-emerald-300":"bg-sky-500/10 text-sky-600 dark:text-sky-300"}`}>{status==="done"?<CheckCircle2 size={16}/>:<Droplets size={16}/>}</span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-1 text-[11px] font-bold text-foreground"><span className="tabular-nums">{time(task.scheduled_at)}</span><span>· Água</span>{suggested>0&&!task.completed_at&&<span className="rounded bg-sky-500/10 px-1 text-[10px] text-sky-700 dark:text-sky-300">~{suggested} ml</span>}</p>
            <p className="truncate text-[10px] text-muted-foreground">{status==="done"?`Confirmado em ${time(task.completed_at!)}`:status==="skipped"?`Não bebi · ${time(answered!)}`:status==="missed"?"Não confirmado":available?"Disponível para confirmar":"Programado"}</p>
          </div>
          {status==="done"?<button type="button" onClick={()=>setDetailTask(task)} title="Consultar e corrigir volume" className="shrink-0 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300">Ver registro</button>
           :status==="skipped"?<span className="text-[10px] text-muted-foreground">Não bebi</span>
           :available?<div className="flex max-w-[168px] shrink-0 flex-wrap items-center justify-end gap-1">
             <input aria-label={`Volume de água às ${time(task.scheduled_at)} em ml`} type="number" min={10} max={1500} step={10}
               value={defaultVolume} onChange={e=>setVolumeByTask(prev=>({...prev,[task.id]:Number(e.target.value)}))}
               className="w-[58px] rounded-md border border-border bg-background px-1 py-1.5 text-center text-[11px] text-foreground"/>
             <button type="button" disabled={Boolean(action)} onClick={()=>void confirmGlass(task,defaultVolume)}
               className="rounded-md bg-primary px-2 py-1.5 text-[10px] font-bold text-primary-foreground disabled:opacity-50">Confirmar</button>
             <button type="button" disabled={Boolean(action)} onClick={()=>void markNo(task)}
               className="rounded-md border border-border px-2 py-1 text-[10px] text-foreground disabled:opacity-50">Não bebi</button>
           </div>:<span className="shrink-0 text-[10px] text-muted-foreground">Aguardando</span>}
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
    <p className="mt-2 leading-relaxed">A necessidade de água varia conforme peso, idade, atividade física, temperatura e orientações médicas. A meta é estimativa, não obrigação. Evite grandes volumes de uma só vez e respeite qualquer restrição prescrita.</p>
    <p className="mt-1">Referências: <a className="underline" href="https://www.nationalacademies.org/read/10925/chapter/6" target="_blank" rel="noreferrer">National Academies</a> · <a className="underline" href="https://pubmed.ncbi.nlm.nih.gov/17277604/" target="_blank" rel="noreferrer">ACSM</a>.</p>
  </details>
  <CareTaskRecordModal task={detailTask} onClose={()=>setDetailTask(null)} onSaved={()=>{setReload(value=>value+1);onRecorded();}}/>
 </section>;
}
