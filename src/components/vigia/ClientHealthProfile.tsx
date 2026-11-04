import { useEffect, useState } from "react";
import { Activity, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ClientBodyHistory } from "./ClientBodyHistory";

type Props={
 patientId:string;ownerId:string;
 initial:{weight:number|null;height:number|null;age:number|null;objective:string|null;protein:number|null;carbs:number|null;fat:number|null;kcal:number|null};
 onSaved:()=>void;onClose:()=>void;
};
const goals=[
 ["equilibrio","Alimentação equilibrada"],
 ["emagrecimento","Controle de peso"],
 ["ganho_peso","Ganho de peso"],
 ["hipertrofia","Hipertrofia"]
];
export function ClientHealthProfile({patientId,ownerId,initial,onSaved,onClose}:Props){
 const [weight,setWeight]=useState(initial.weight?.toString()??"");
 const [age,setAge]=useState(initial.age?.toString()??"");
 const [objective,setObjective]=useState(goals.some(([v])=>v===initial.objective)?initial.objective!:"equilibrio");
 const [protein,setProtein]=useState(initial.protein?.toString()??"");
 const [carbs,setCarbs]=useState(initial.carbs?.toString()??"");
 const [fat,setFat]=useState(initial.fat?.toString()??"");
 const [kcal,setKcal]=useState(initial.kcal?.toString()??"");
 const previewProtein=Number(protein.replace(",","."))||null;
 const previewCarbs=Number(carbs.replace(",","."))||null;
 const previewFat=Number(fat.replace(",","."))||null;
 const previewCalories=Number(kcal.replace(",","."))||null;
 const previewTotal=previewProtein!==null&&previewCarbs!==null&&previewFat!==null
  ?Math.round(previewProtein*4+previewCarbs*4+previewFat*9):null;
 const previewDifference=previewTotal!==null&&previewCalories!==null?previewTotal-previewCalories:null;
 const [saving,setSaving]=useState(false);
 const [confirmMismatch,setConfirmMismatch]=useState(false);
 const [message,setMessage]=useState("");
 useEffect(()=>{setWeight(initial.weight?.toString()??"");setAge(initial.age?.toString()??"");setObjective(goals.some(([v])=>v===initial.objective)?initial.objective!:"equilibrio");setProtein(initial.protein?.toString()??"");setCarbs(initial.carbs?.toString()??"");setFat(initial.fat?.toString()??"");setKcal(initial.kcal?.toString()??"")},[initial.weight,initial.age,initial.objective,initial.protein,initial.carbs,initial.fat,initial.kcal]);
 const parse=(s:string,min:number,max:number)=>{
  if(!s.trim())return null;
  const n=Number(s.replace(",","."));
  if(!Number.isFinite(n)||n<min||n>max)throw Error("Confira os valores informados. Alguns estão fora do intervalo permitido.");
  return n;
 };
 async function save(){
  if(saving)return;
  setMessage("");
  let kg:number|null,years:number|null,p:number|null,c:number|null,f:number|null,k:number|null;
  try{
   kg=parse(weight,30,300);years=parse(age,18,120);
   p=parse(protein,1,500);c=parse(carbs,1,1200);f=parse(fat,1,350);k=parse(kcal,500,7000);
  }catch(e){setMessage(e instanceof Error?e.message:"Revise os dados.");return;}
  if(kg===null){setMessage("Informe o peso atual para atualizar seu perfil.");return;}
  if(k!==null&&p!==null&&c!==null&&f!==null&&Math.abs(p*4+c*4+f*9-k)>100&&!confirmMismatch){
   setConfirmMismatch(true);
   setMessage("As metas energéticas não coincidem. Confira os valores e clique novamente em Confirmar e salvar, se desejar mantê-los.");
   return;
  }
  setSaving(true);
  try{
   const auth=await supabase.auth.getUser();
   if(auth.error||!auth.data.user)throw Error("Faça login para salvar suas informações.");
   const db=supabase as any;
   const existing=await db.from("care_nutrition_preferences").select("avoided_ingredients,gastritis_sensitive").eq("patient_id",patientId).eq("owner_id",ownerId).maybeSingle();
   if(existing.error)throw Error("Não foi possível consultar as preferências atuais.");
   const nutrition=await db.from("care_nutrition_preferences").upsert({
    patient_id:patientId,owner_id:ownerId,updated_by:auth.data.user.id,updated_at:new Date().toISOString(),
    objective,weight_kg:kg,target_protein_g:p,target_carbs_g:c,target_fat_g:f,target_kcal:k,
    avoided_ingredients:existing.data?.avoided_ingredients??[],
    gastritis_sensitive:existing.data?.gastritis_sensitive??false
   },{onConflict:"patient_id"});
   if(nutrition.error)throw Error("Não foi possível salvar as metas nutricionais: "+nutrition.error.message);
   // Update an existing hydration profile without replacing its individual water prescription.
   const hydration=await db.from("care_hydration_profiles").select("patient_id").eq("patient_id",patientId).eq("owner_id",ownerId).maybeSingle();
   if(hydration.error)throw Error("Metas nutricionais salvas, mas não foi possível consultar a hidratação.");
   if(hydration.data){
    const patch:Record<string,number>={};
    if(kg!==null)patch.weight_kg=kg;
    if(years!==null)patch.age=years;
    const updated=Object.keys(patch).length?await db.from("care_hydration_profiles").update(patch).eq("patient_id",patientId).eq("owner_id",ownerId):{error:null};
    if(updated.error)throw Error("Metas nutricionais salvas, mas idade e peso da hidratação não foram atualizados.");
   }else if(years!==null){
    setMessage("Metas salvas. Para registrar a idade, configure também o perfil de hidratação.");
    onSaved();return;
   }
   setMessage("Perfil atualizado. Indicadores recalculados.");
   onSaved();
  }catch(e){setMessage(e instanceof Error?e.message:"Falha ao salvar.");}
  finally{setSaving(false);}
 }
 const input=(label:string,value:string,set:(v:string)=>void,placeholder:string)=>(
  <label className="min-w-0 text-xs font-semibold text-slate-100">{label}
   <input inputMode="decimal" value={value} onChange={e=>{set(e.target.value);setConfirmMismatch(false);}} placeholder={placeholder}
    className="mt-1 block min-h-10 w-full min-w-0 max-w-full rounded-lg border border-white/20 bg-slate-900/70 px-3 text-base text-white outline-offset-2 focus:border-teal-300"/>
  </label>);
 return <section className="care-health-profile relative z-20 min-w-0 rounded-2xl border border-teal-300/35 bg-[#12313c] p-4 text-white shadow-xl" aria-label="Meu perfil de saúde">
  <div className="mb-3 flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="flex items-center gap-2 text-lg font-extrabold"><Activity size={19}/> Meu Perfil de Saúde</h3><p className="mt-1 text-xs text-slate-300">Dados usados nos indicadores da homepage. Metas personalizadas têm prioridade sobre estimativas.</p></div><button type="button" onClick={onClose} aria-label="Fechar perfil" className="shrink-0 rounded-lg border border-white/20 p-2"><X size={17}/></button></div>
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
   {input("Peso atual (kg)",weight,setWeight,"Ex.: 75")}
   <label className="text-xs font-semibold text-slate-100">Altura cadastrada (cm)<div className="mt-1 flex min-h-10 items-center rounded-lg border border-white/15 bg-slate-900/40 px-3 text-sm">{initial.height??"Não informada"}</div><small className="text-slate-300">Alteração pelo cadastro do prontuário.</small></label>
   {input("Idade (anos)",age,setAge,"Ex.: 30")}
   <label className="text-xs font-semibold text-slate-100">Objetivo alimentar<select value={objective} onChange={e=>{setObjective(e.target.value);setConfirmMismatch(false);}} className="mt-1 block min-h-10 w-full min-w-0 rounded-lg border border-white/20 bg-slate-900 px-2 text-base text-white">{goals.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
   {input("Meta de proteína (g/dia) · opcional",protein,setProtein,"Automática")}
   {input("Meta de carboidratos (g/dia) · opcional",carbs,setCarbs,"Automática")}
   {input("Meta de gorduras (g/dia) · opcional",fat,setFat,"Automática")}
   {input("Meta energética (kcal/dia) · opcional",kcal,setKcal,"Não definida")}
  </div>
  <div className="mt-3 rounded-xl border border-white/15 bg-slate-950/35 p-3" aria-label="Conferência das metas nutricionais">
   <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">Conferência das metas</strong><span className="text-xs text-slate-300">{previewTotal!==null?previewTotal.toLocaleString("pt-BR")+" kcal pelos macros":"Preencha os três macros para calcular a energia"}</span></div>
   {previewTotal!==null&&<div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-700" role="img" aria-label="Distribuição das calorias entre proteínas, carboidratos e gorduras">
    <span style={{width:(previewProtein!*4/previewTotal*100)+"%",background:"#8ce8df"}}/>
    <span style={{width:(previewCarbs!*4/previewTotal*100)+"%",background:"#f7d38b"}}/>
    <span style={{width:(previewFat!*9/previewTotal*100)+"%",background:"#c5b3f6"}}/>
   </div>}
   {previewDifference!==null&&Math.abs(previewDifference)>100&&<p role="status" className="mt-2 rounded-lg border border-amber-300/40 bg-amber-400/10 p-2 text-xs text-amber-100">A soma dos macros está {Math.abs(previewDifference).toLocaleString("pt-BR")} kcal {previewDifference>0?"acima":"abaixo"} da meta energética. Confira antes de salvar.</p>}
   <p className="mt-2 text-xs text-slate-300">Prévia calculada a partir das metas digitadas; não representa consumo real.</p>
  </div>
  <p className="mt-3 text-xs leading-relaxed text-slate-300">Campos de metas vazios usam referências educativas. Metas calóricas e restrições de líquidos exigem avaliação individual. A altura e a prescrição de água permanecem sob controle do prontuário.</p>
  {message&&<p role="status" className="mt-3 rounded-lg border border-teal-300/25 bg-slate-900/50 p-2 text-xs">{message}</p>}
  <ClientBodyHistory patientId={patientId} ownerId={ownerId} currentWeight={initial.weight} height={initial.height}/>
  <div className="mt-3 flex flex-wrap justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-white/25 px-4 py-2 text-sm">Fechar</button><button type="button" disabled={saving} onClick={()=>void save()} className="inline-flex items-center gap-2 rounded-lg bg-teal-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"><Save size={15}/>{saving?"Salvando…":confirmMismatch?"Confirmar e salvar":"Salvar perfil"}</button></div>
 </section>;
}
