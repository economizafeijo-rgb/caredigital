import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clock3, Droplets, GlassWater, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHydration } from "./HydrationTracker";

type Task = { id:string; patient_id:string; category:string; title:string; scheduled_at:string; completed_at:string|null };
type Drink = { id:string; amount_ml:number; recorded_at:string };
type Props = { patientId:string; ownerId:string; tasks:Task[]; revision:number; onConfirm:(task:Task)=>void };
const tz="America/Rio_Branco";
const dateKey=(iso:string)=>new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(iso));
const hhmm=(iso:string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:tz,hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(iso));
function acreDayBounds(){
 const today=dateKey(new Date().toISOString());
 const start=new Date(today+"T00:00:00-05:00");
 return {start:start.toISOString(),end:new Date(start.getTime()+86400000).toISOString()};
}
export function ClientHydrationTab({patientId,ownerId,tasks,revision,onConfirm}:Props){
 const {data,ready}=useHydration();
 const [drinks,setDrinks]=useState<Drink[]>([]);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 useEffect(()=>{let alive=true;setLoading(true);
   void (async()=>{
     const {start,end}=acreDayBounds();
     const result=await (supabase as any).from("care_hydration").select("id,amount_ml,recorded_at")
       .eq("owner_id",ownerId).eq("patient_id",patientId)
       .gte("recorded_at",start).lt("recorded_at",end)
       .order("recorded_at",{ascending:true}).limit(200);
     if(!alive)return;
     if(result.error){setError("Não foi possível consultar o consumo registrado no prontuário.");setDrinks([]);}
     else {setError("");setDrinks(result.data??[]);}
     setLoading(false);
   })();return()=>{alive=false};},[patientId,ownerId,revision]);
 const intake=drinks.reduce((n,d)=>n+d.amount_ml,0);
 const goal=ready?data.targetMl:2000;
 const remaining=Math.max(0,goal-intake);
 const percent=goal>0?Math.min(100,Math.round(intake/goal*100)):0;
 const hydrationTasks=useMemo(()=>tasks.filter(t=>t.category==="hidratacao").sort((a,b)=>Date.parse(a.scheduled_at)-Date.parse(b.scheduled_at)),[tasks]);
 const next=hydrationTasks.find(t=>!t.completed_at);
 return <section className="space-y-3" aria-label="Minha hidratação guiada">
   <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="flex items-center gap-2 text-sm font-bold"><Droplets size={18} className="text-primary"/> Minha hidratação</h4><p className="text-[11px] text-muted-foreground">Acompanhamento do dia, com registros reais do prontuário.</p></div><Link to="/hidratacao" className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-xs font-semibold text-primary"><Settings2 size={14}/> Ajustar meta</Link></div>
   <div className="grid grid-cols-3 gap-2">
     <div className="rounded-xl bg-muted p-2.5"><p className="text-[10px] text-muted-foreground">Meta</p><p className="text-base font-extrabold tabular-nums">{goal} <span className="text-[10px] font-normal">ml</span></p></div>
     <div className="rounded-xl bg-muted p-2.5"><p className="text-[10px] text-muted-foreground">Registrado</p><p className="text-base font-extrabold tabular-nums text-success">{intake} <span className="text-[10px] font-normal">ml</span></p></div>
     <div className="rounded-xl bg-muted p-2.5"><p className="text-[10px] text-muted-foreground">Restante</p><p className="text-base font-extrabold tabular-nums">{remaining} <span className="text-[10px] font-normal">ml</span></p></div>
   </div>
   <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Progresso da hidratação" aria-valuenow={intake} aria-valuemin={0} aria-valuemax={goal}><div className="h-full rounded-full bg-sky-500 transition-all" style={{width:percent+"%"}}/></div>
   <p className="text-[11px] text-muted-foreground">Meta configurada neste navegador; volume consumido consultado diretamente no prontuário. Não são somados registros locais para evitar duplicações.</p>
   {next&&<div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3"><Clock3 className="shrink-0 text-primary" size={19}/><div className="min-w-0 flex-1"><p className="text-[11px] font-bold text-primary">Próximo lembrete</p><p className="text-xs font-semibold">{hhmm(next.scheduled_at)} · {next.title}</p></div><button type="button" className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground" onClick={()=>onConfirm(next)}>Registrar</button></div>}
   <div className="space-y-2"><h5 className="text-xs font-bold">Roteiro de hoje</h5>
     <div className="max-h-[330px] space-y-2 overflow-y-auto pr-1">{hydrationTasks.map(t=><div key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-2.5">
       <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-300">{t.completed_at?<CheckCircle2 size={19}/>:<GlassWater size={19}/>}</div>
       <div className="min-w-0 flex-1"><p className="text-xs font-bold">{hhmm(t.scheduled_at)} · {t.title}</p><p className="text-[11px] text-muted-foreground">{t.completed_at?"Tomada confirmada no prontuário":"Pendente · confirme o volume realmente consumido"}</p></div>
       {!t.completed_at&&<button type="button" className="rounded-lg border border-primary/40 px-2.5 py-2 text-[11px] font-semibold text-primary" onClick={()=>onConfirm(t)}>Confirmar</button>}
     </div>)}
     {!hydrationTasks.length&&<div className="rounded-xl border border-border p-3 text-xs text-muted-foreground">Ainda não há horários de água vinculados à agenda do cliente. <Link to="/hidratacao" className="font-semibold text-primary underline">Ver o cronograma de lembretes</Link>.</div>}</div>
   </div>
   {drinks.length>0&&<details className="rounded-xl border border-border p-3"><summary className="cursor-pointer text-xs font-semibold">Registros realizados hoje ({drinks.length})</summary><ol className="mt-2 max-h-36 space-y-1 overflow-y-auto">{drinks.map(d=><li key={d.id} className="flex justify-between gap-2 text-xs text-muted-foreground"><time>{hhmm(d.recorded_at)}</time><strong>{d.amount_ml} ml</strong></li>)}</ol></details>}
   {loading&&<p className="text-xs text-muted-foreground">Consultando consumo…</p>}
   {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}
   <p className="text-[11px] leading-relaxed text-muted-foreground">Durante o tratamento gastrointestinal, prefira pequenos goles conforme tolerância. Não compense atrasos bebendo grandes volumes de uma vez.</p>
 </section>;
}
