import { useEffect, useMemo, useState } from "react";
import { Droplets, CheckCircle2, AlertCircle, Save, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Task={id:string;patient_id:string;category:string;title:string;scheduled_at:string;completed_at:string|null};
type Drink={id:string;amount_ml:number;recorded_at:string};
type Response={task_id:string;recorded_at:string};
type Profile={sex:"male"|"female"|"unspecified";age:number;weight_kg:number;objective:"recovery"|"muscle"|"weight";activity_minutes:number;sweat:"low"|"normal"|"high";fluid_restriction:boolean;target_ml:number|null};
type Props={patientId:string;ownerId:string;tasks:Task[];revision:number;onConfirm:(task:Task)=>void};
const tz="America/Rio_Branco";
const defaultProfile:Profile={sex:"unspecified",age:0,weight_kg:0,objective:"recovery",activity_minutes:0,sweat:"normal",fluid_restriction:false,target_ml:null};
const round50=(value:number)=>Math.round(value/50)*50;
const time=(iso:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:tz,hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(iso));
const stamp=(iso:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:tz,day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date(iso));
const dateKey=(iso:string)=>new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(iso));
function WaterGlass({state}:{state:"pending"|"done"|"skipped"}){
 const color=state==="done"?"#16a085":state==="skipped"?"#b8c4ce":"#6dc9e7";
 return <svg viewBox="0 0 54 68" role="img" aria-label={state==="done"?"Copo confirmado":state==="skipped"?"Não bebeu neste horário":"Copo aguardando confirmação"} className="h-12 w-10 shrink-0">
  <path d="M8 6h38l-4.5 47a10 10 0 0 1-10 9h-9a10 10 0 0 1-10-9z" fill="#e8f8ff" stroke="#4d9dbe" strokeWidth="2.5"/>
  <path d="M12 30q15-5 30 0l-2 23a8 8 0 0 1-8 7H22a8 8 0 0 1-8-7z" fill={color} opacity={state==="skipped"?.25:.85}/>
  <path d="M13 23h28" stroke="#b6e1ee" strokeWidth="2" strokeLinecap="round"/>
  {state==="done"&&<g><circle cx="42" cy="13" r="10" fill="#0c946a"/><path d="m37 13 3.5 3.5 6-7" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></g>}
  {state==="skipped"&&<g><circle cx="42" cy="13" r="10" fill="#778899"/><path d="M38 13h8" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></g>}
 </svg>;
}
function estimate(profile:Profile){
 if(profile.age<18||profile.age>110||profile.weight_kg<30||profile.weight_kg>250||profile.activity_minutes<0||profile.activity_minutes>240)return null;
 const base=round50(profile.weight_kg*30);
 const activity=profile.activity_minutes===0?0:round50(Math.min(600,profile.activity_minutes/60*(profile.sweat==="high"?500:profile.sweat==="low"?250:350)));
 const target=base+activity;
 const reference=profile.sex==="male"?3000:profile.sex==="female"?2200:null;
 return {base,activity,target,reference,requiresReview:profile.fluid_restriction||profile.age>=75||target>4000};
}
export function ClientHydrationTab({patientId,ownerId,tasks,revision,onConfirm}:Props){
 const [profile,setProfile]=useState<Profile>(defaultProfile);
 const [configured,setConfigured]=useState(false);
 const [editing,setEditing]=useState(false);
 const [saving,setSaving]=useState(false);
 const [drinks,setDrinks]=useState<Drink[]>([]);
 const [notDrunk,setNotDrunk]=useState<Response[]>([]);
 const [action,setAction]=useState<string|null>(null);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [reload,setReload]=useState(0);
 const [loading,setLoading]=useState(true);
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
   else {setConfigured(false);setEditing(true)}
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
 const percent=goal?Math.min(100,Math.round(intake/goal*100)):0;
 const schedule=useMemo(()=>tasks.filter(item=>item.category==="hidratacao").sort((a,b)=>Date.parse(a.scheduled_at)-Date.parse(b.scheduled_at)),[tasks]);
 const portions=useMemo(()=>schedule.map((_,i)=>{
   if(!goal||!schedule.length)return 0;
   const unit=Math.floor(goal/schedule.length/50)*50;
   return i===schedule.length-1?goal-unit*(schedule.length-1):unit;
 }),[schedule,goal]);
 const skipped=new Map(notDrunk.map(item=>[item.task_id,item.recorded_at]));
 const next=schedule.find(item=>!item.completed_at&&!skipped.has(item.id));
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
 async function markNo(task:Task){
  if(action)return;
  setAction(task.id);setError("");setNotice("");
  const res=await (supabase as any).rpc("care_mark_water_not_drunk",{p_task_id:task.id});
  setAction(null);
  if(res.error){setError("Não foi possível registrar a resposta. Tente novamente.");return}
  setNotDrunk(prev=>[...prev.filter(t=>t.task_id!==task.id),{task_id:task.id,recorded_at:res.data}]);
  setNotice("Resposta 'Não bebi' salva no prontuário. Nenhum volume foi contabilizado.");
 }
 return <section className="space-y-3" aria-label="Programa personalizado de hidratação">
  <header className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="flex items-center gap-2 text-sm font-bold"><Droplets size={18} className="text-primary"/> Programa de hidratação</h3><p className="text-[11px] text-muted-foreground">Cálculo individual · copos ilustrados · registros reais</p></div><button type="button" onClick={()=>setEditing(v=>!v)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary"><SlidersHorizontal size={14}/> {editing?"Ocultar dados":"Meu perfil"}</button></header>
  {editing&&<div className="rounded-xl border border-border bg-muted/30 p-3">
   <p className="mb-2 text-xs font-semibold">Informações para estimar o consumo diário</p>
   <div className="grid grid-cols-2 gap-2">
     <label className="text-xs">Sexo para referência<select className="field mt-1" value={profile.sex} onChange={e=>update({sex:e.target.value as Profile["sex"]})}><option value="unspecified">Prefiro não informar</option><option value="male">Masculino</option><option value="female">Feminino</option></select></label>
     <label className="text-xs">Idade (anos)<input className="field mt-1" type="number" min="18" max="110" value={profile.age||""} onChange={e=>update({age:Number(e.target.value)})} placeholder="Informe"/></label>
     <label className="text-xs">Peso (kg)<input className="field mt-1" type="number" min="30" max="250" step=".5" value={profile.weight_kg||""} onChange={e=>update({weight_kg:Number(e.target.value)})} placeholder="Informe"/></label>
     <label className="text-xs">Objetivo<select className="field mt-1" value={profile.objective} onChange={e=>update({objective:e.target.value as Profile["objective"]})}><option value="recovery">Hidratação e recuperação</option><option value="muscle">Ganho de massa muscular</option><option value="weight">Controle do peso</option></select></label>
     <label className="text-xs">Treino (min/dia)<input className="field mt-1" type="number" min="0" max="240" value={profile.activity_minutes} onChange={e=>update({activity_minutes:Number(e.target.value)})}/></label>
     <label className="text-xs">Transpiração<select className="field mt-1" value={profile.sweat} onChange={e=>update({sweat:e.target.value as Profile["sweat"]})}><option value="low">Pouca</option><option value="normal">Moderada</option><option value="high">Intensa</option></select></label>
     <label className="col-span-2 flex gap-2 rounded-lg border border-border p-2 text-xs"><input type="checkbox" checked={profile.fluid_restriction} onChange={e=>update({fluid_restriction:e.target.checked})}/><span>Tenho restrição de líquidos, doença renal/cardíaca ou orientação profissional especial.</span></label>
   </div>
   {calculation?<div className="mt-2 rounded-lg bg-card p-2.5 text-xs"><strong>Estimativa: {calculation.target.toLocaleString("pt-BR")} ml/dia</strong><p className="mt-1 text-muted-foreground">{calculation.base} ml pela referência operacional de ~30 ml/kg + {calculation.activity} ml de ajuste ilustrativo ao treino. {calculation.reference?`Referência populacional de bebidas para este sexo: ~${calculation.reference} ml/dia.`:""} A idade e o objetivo orientam precauções; ganho muscular por si só não aumenta a meta.</p>{calculation.requiresReview&&<p className="mt-1 font-semibold text-amber-700 dark:text-amber-300"><AlertCircle size={13} className="mr-1 inline"/> Recomenda-se uma meta definida por profissional antes de aplicar o plano automático.</p>}</div>:<p className="mt-2 text-xs text-muted-foreground">Informe idade adulta e peso válido para calcular.</p>}
   <button type="button" disabled={!calculation||saving} onClick={()=>void saveProfile()} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50"><Save size={14}/>{saving?"Salvando…":"Salvar e gerar programa"}</button>
  </div>}
  <div className="grid grid-cols-3 gap-2">{[{label:"Meta",value:goal?`${goal} ml`:"A definir"},{label:"Bebido",value:`${intake} ml`},{label:"Restante",value:goal?`${Math.max(0,goal-intake)} ml`:"—"}].map(item=><div key={item.label} className="rounded-xl bg-muted p-2"><p className="text-[10px] text-muted-foreground">{item.label}</p><p className="mt-1 text-sm font-extrabold tabular-nums">{item.value}</p></div>)}</div>
  <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Progresso de hidratação" aria-valuemin={0} aria-valuemax={goal||1} aria-valuenow={intake}><div className="h-full rounded-full bg-sky-500" style={{width:percent+"%"}}/></div>
  {!planValid&&<p className="rounded-lg border border-amber-300/40 bg-amber-500/10 p-2 text-xs text-foreground">Configure seu perfil para gerar porções sugeridas. Os horários registrados continuam disponíveis, mas o sistema não inventa uma meta sem dados suficientes.</p>}
  {next&&<div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-2.5"><WaterGlass state="pending"/><div className="flex-1"><p className="text-[11px] font-semibold text-primary">Próximo horário</p><p className="text-sm font-bold">{time(next.scheduled_at)} · {next.title}</p></div></div>}
  <div className="max-h-[335px] space-y-2 overflow-y-auto pr-1">
   {schedule.map((task,i)=>{
    const answered=skipped.get(task.id);
    const status=task.completed_at?"done":answered?"skipped":"pending";
    return <article key={task.id} className={`flex items-center gap-2 rounded-xl border p-2.5 ${status==="done"?"border-emerald-500/40 bg-emerald-500/5":"border-border bg-card"}`}>
     <WaterGlass state={status}/>
     <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><strong className="text-xs">Previsto: {time(task.scheduled_at)}</strong>{goal>0&&<span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">~{portions[i]} ml</span>}</div><p className="mt-1 text-[11px] text-muted-foreground">{status==="done"?`Bebeu · registrado em ${stamp(task.completed_at!)}`:status==="skipped"?`Não bebeu · informado em ${stamp(answered!)}`:"Aguardando sua resposta"}</p></div>
     {status==="pending"&&<div className="flex shrink-0 flex-col gap-1"><button type="button" onClick={()=>onConfirm(task)} className="rounded-lg bg-primary px-2 py-1.5 text-[11px] font-bold text-primary-foreground">Bebi</button><button type="button" disabled={action===task.id} onClick={()=>void markNo(task)} className="rounded-lg border border-border px-2 py-1.5 text-[11px] font-medium text-foreground disabled:opacity-60">Não bebi</button></div>}
     {status==="skipped"&&<button type="button" onClick={()=>onConfirm(task)} className="rounded-lg border border-primary/30 px-2 py-2 text-[11px] font-semibold text-primary">Bebi depois</button>}
     {status==="done"&&<CheckCircle2 size={18} className="shrink-0 text-emerald-600"/>}
    </article>
   })}
   {!schedule.length&&<p className="rounded-lg border border-border p-3 text-xs text-muted-foreground">Não há horários de água cadastrados hoje. Peça ao administrador para configurar a agenda; as confirmações dependem de horários reais.</p>}
  </div>
  {loading&&<p className="text-xs text-muted-foreground">Carregando registros…</p>}
  {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}
  {notice&&<p role="status" className="text-xs text-emerald-700 dark:text-emerald-300">{notice}</p>}
  <p className="text-[11px] leading-relaxed text-muted-foreground">Estimativa para adultos, não prescrição clínica. O sexo informa uma referência populacional, não uma necessidade individual exata. Idade avançada, restrição de líquidos ou meta elevada exigem avaliação individual. A hidratação deve respeitar sede, refeições, calor, treino e tolerância à gastrite. Confirmações são gravadas no Supabase com horário do servidor; “Não bebi” não acrescenta água ao consumo. Evite compensações rápidas ou grandes volumes de uma vez.</p>
  <p className="text-[10px] text-muted-foreground">Referências: <a className="underline" href="https://www.nationalacademies.org/read/10925/chapter/6" target="_blank" rel="noreferrer">National Academies</a> · <a className="underline" href="https://pubmed.ncbi.nlm.nih.gov/17277604/" target="_blank" rel="noreferrer">ACSM</a>.</p>
 </section>;
}
