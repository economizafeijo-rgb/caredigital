import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { acreDateKey } from "@/lib/acre-time";

type Point={id:string;recorded_on:string;weight_kg:number;height_cm:number};
type Props={patientId:string;ownerId:string;currentWeight:number|null;height:number|null};
export function ClientBodyHistory({patientId,ownerId,currentWeight,height}:Props){
 const [points,setPoints]=useState<Point[]>([]);
 const [date,setDate]=useState(()=>acreDateKey());
 const [weight,setWeight]=useState(currentWeight?.toString()??"");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [unavailable,setUnavailable]=useState(false);
 const [message,setMessage]=useState("");
 const reload=async()=>{
  const r=await (supabase as any).from("care_body_measurements").select("id,recorded_on,weight_kg,height_cm")
   .eq("patient_id",patientId).eq("owner_id",ownerId).order("recorded_on",{ascending:true}).limit(180);
  if(r.error){setUnavailable(true);setMessage("O histórico ainda não está disponível neste ambiente. A migração do banco precisa ser aplicada.");}
  else{setUnavailable(false);setPoints(r.data??[]);}
  setLoading(false);
 };
 useEffect(()=>{void reload();},[patientId,ownerId]);
 const save=async()=>{
  const kg=Number(weight.replace(",","."));
  if(!Number.isFinite(kg)||kg<20||kg>350||height===null||height<100||height>230){setMessage("Informe um peso válido e confirme que a altura está cadastrada no prontuário.");return;}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>acreDateKey()){setMessage("Selecione uma data válida que não esteja no futuro.");return;}
  setSaving(true);setMessage("");
  const auth=await supabase.auth.getUser();
  if(!auth.data.user){setMessage("Entre na sua conta para registrar a evolução.");setSaving(false);return;}
  const r=await (supabase as any).from("care_body_measurements").upsert({
   patient_id:patientId,owner_id:ownerId,recorded_by:auth.data.user.id,
   recorded_on:date,weight_kg:kg,height_cm:height
  },{onConflict:"patient_id,recorded_on"});
  if(r.error)setMessage("Não foi possível registrar a medição. Verifique as permissões ou a configuração do histórico.");
  else{setMessage("Medição registrada com sucesso.");await reload();}
  setSaving(false);
 };
 const first=points[0],last=points[points.length-1];
 const delta=first&&last&&first.id!==last.id?Number(last.weight_kg)-Number(first.weight_kg):null;
 const min=points.length?Math.min(...points.map(p=>Number(p.weight_kg))):0;
 const max=points.length?Math.max(...points.map(p=>Number(p.weight_kg))):0;
 const coords=points.map((p,i)=>`${points.length===1?50:5+i*90/(points.length-1)},${90-(Number(p.weight_kg)-min)/(Math.max(1,max-min))*75}`).join(" ");
 return <section className="mt-3 rounded-xl border border-white/20 bg-slate-950/35 p-3" aria-label="Histórico de evolução corporal">
  <div className="flex flex-wrap items-baseline justify-between gap-2"><h4 className="text-sm font-bold">Histórico de peso e IMC</h4><span className="text-xs text-slate-300">{points.length} registros{delta!==null?` · ${delta>0?"+":""}${delta.toFixed(1).replace(".",",")} kg desde o primeiro`:""}</span></div>
  {loading?<p className="mt-2 text-xs">Carregando histórico…</p>:unavailable?<p className="mt-2 text-xs text-amber-200" role="status">{message}</p>:<>
   {points.length>=2?<svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Linha de evolução do peso corporal ao longo dos registros" className="mt-3 h-24 w-full overflow-visible rounded-lg bg-slate-900/60"><polyline points={coords} fill="none" stroke="#8ce8df" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round"/>{points.map((p,i)=><circle key={p.id} cx={points.length===1?50:5+i*90/(points.length-1)} cy={90-(Number(p.weight_kg)-min)/Math.max(1,max-min)*75} r="1.6" fill="#fff"/>)}</svg>:<p className="mt-2 text-xs text-slate-300">Registre pelo menos duas medições para visualizar o gráfico.</p>}
   {last&&<p className="mt-2 text-xs text-slate-300">Última medição: {Number(last.weight_kg).toLocaleString("pt-BR")} kg em {last.recorded_on.split("-").reverse().join("/")} · IMC {(Number(last.weight_kg)/((Number(last.height_cm)/100)**2)).toFixed(1).replace(".",",")}</p>}
   {points.length>0&&<div className="mt-3 overflow-x-auto rounded-lg border border-white/15" aria-label="Últimas medições registradas">
    <table className="w-full min-w-[320px] text-left text-xs">
     <thead className="bg-white/10 text-slate-200"><tr><th className="px-3 py-2">Data</th><th className="px-3 py-2">Peso</th><th className="px-3 py-2">IMC</th></tr></thead>
     <tbody>{points.slice(-5).reverse().map(p=><tr key={p.id} className="border-t border-white/10"><td className="px-3 py-2">{p.recorded_on.split("-").reverse().join("/")}</td><td className="px-3 py-2 font-semibold">{Number(p.weight_kg).toLocaleString("pt-BR")} kg</td><td className="px-3 py-2">{(Number(p.weight_kg)/((Number(p.height_cm)/100)**2)).toFixed(1).replace(".",",")}</td></tr>)}</tbody>
    </table>
   </div>}
   <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
    <label className="text-xs">Data<input type="date" max={acreDateKey()} value={date} onChange={e=>setDate(e.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-white/20 bg-slate-900 px-2 text-base text-white"/></label>
    <label className="text-xs">Peso (kg)<input inputMode="decimal" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="Ex.: 75,5" className="mt-1 block min-h-10 w-full rounded-lg border border-white/20 bg-slate-900 px-2 text-base text-white"/></label>
    <button type="button" disabled={saving} onClick={()=>void save()} className="self-end rounded-lg bg-teal-300 px-3 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50">{saving?"Salvando…":"Registrar"}</button>
   </div>
   {message&&<p className="mt-2 text-xs" role="status">{message}</p>}
  </>}
 </section>;
}
