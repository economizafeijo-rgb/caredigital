import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calculator, Search, Utensils, Target, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/biblioteca-alimentar")({ component: BibliotecaAlimentar });
type Food = { id:string; name:string; food_group:string; kcal:number; protein_g:number; carbs_g:number; fat_g:number; fiber_g:number; provenance:string|null; note:string|null };
type Goals = { target_kcal:number|null;target_protein_g:number|null;target_carbs_g:number|null;target_fat_g:number|null;weight_kg:number|null };
const n=(value:unknown)=>Number(value)||0;
const fmt=(value:number)=>value.toLocaleString("pt-BR",{maximumFractionDigits:1});
function BibliotecaAlimentar(){
 const [foods,setFoods]=useState<Food[]>([]);
 const [goals,setGoals]=useState<Goals|null>(null);
 const [patientId,setPatientId]=useState<string|null>(null);
 const [consumed,setConsumed]=useState<{kcal:number;protein_g:number;carbs_g:number;fat_g:number}[]>([]);
 const [saving,setSaving]=useState(false);
 const [feedback,setFeedback]=useState("");
 const [search,setSearch]=useState("");
 const [group,setGroup]=useState("Todos");
 const [selected,setSelected]=useState<string>("");
 const [grams,setGrams]=useState(100);
 const [nutrient,setNutrient]=useState<"protein_g"|"carbs_g"|"fat_g"|"kcal">("protein_g");
 const [target,setTarget]=useState(30);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{let active=true;(async()=>{
  const {data:user}=await supabase.auth.getUser();
  const catalog=await (supabase as any).from("care_food_catalog").select("id,name,food_group,kcal,protein_g,carbs_g,fat_g,fiber_g,provenance,note").order("name").limit(1000);
  if(!active)return;
  if(catalog.error)setError("Não foi possível carregar o catálogo. Verifique o acesso aos dados nutricionais.");
  else {setFoods(catalog.data??[]);setSelected(catalog.data?.[0]?.id??"");}
  if(user.user){
   const grant=await (supabase as any).from("care_patient_access").select("patient_id").eq("user_id",user.user.id).limit(1);
   const own=await (supabase as any).from("care_patients").select("id").eq("owner_id",user.user.id).limit(1);
   const patientId=grant.data?.[0]?.patient_id??own.data?.[0]?.id;
   if(active)setPatientId(patientId??null);
   if(patientId){const preferences=await (supabase as any).from("care_nutrition_preferences").select("target_kcal,target_protein_g,target_carbs_g,target_fat_g,weight_kg").eq("patient_id",patientId).maybeSingle();if(active&&!preferences.error)setGoals(preferences.data);
    const start=new Date();start.setHours(0,0,0,0);
    const end=new Date(start);end.setDate(end.getDate()+1);
    const logs=await (supabase as any).from("care_food_consumptions").select("kcal,protein_g,carbs_g,fat_g").eq("patient_id",patientId).gte("recorded_at",start.toISOString()).lt("recorded_at",end.toISOString());
    if(active&&!logs.error)setConsumed(logs.data??[]);}
  }
  if(active)setLoading(false);
 })();return()=>{active=false}},[]);
 const groups=useMemo(()=>["Todos",...Array.from(new Set(foods.map(f=>f.food_group).filter(Boolean)))],[foods]);
 const filtered=useMemo(()=>foods.filter(f=>(group==="Todos"||f.food_group===group)&&f.name.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))),[foods,group,search]);
 const food=foods.find(f=>f.id===selected);
 const factor=Math.max(0,grams)/100;
 const nutrients=[{key:"kcal",label:"Calorias",unit:"kcal"},{key:"protein_g",label:"Proteínas",unit:"g"},{key:"carbs_g",label:"Carboidratos",unit:"g"},{key:"fat_g",label:"Gorduras",unit:"g"},{key:"fiber_g",label:"Fibras",unit:"g"}] as const;
 const unit=nutrient==="kcal"?"kcal":"g";
 const per100=food?n(food[nutrient]):0;
 const required=per100>0?target/per100*100:null;
 const totals=consumed.reduce((acc,x)=>({kcal:acc.kcal+n(x.kcal),protein_g:acc.protein_g+n(x.protein_g),carbs_g:acc.carbs_g+n(x.carbs_g),fat_g:acc.fat_g+n(x.fat_g)}),{kcal:0,protein_g:0,carbs_g:0,fat_g:0});
 async function registerPortion(){
  if(!food||!patientId||!Number.isFinite(grams)||grams<=0||grams>10000)return;
  setSaving(true);setFeedback("");
  const requestId=crypto.randomUUID();
  const {error:saveError}=await (supabase as any).rpc("care_log_food_portion",{p_patient_id:patientId,p_food_id:food.id,p_grams:grams,p_request_id:requestId});
  if(saveError){setFeedback("Não foi possível registrar a porção: "+saveError.message);setSaving(false);return;}
  const start=new Date();start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);
  const logs=await (supabase as any).from("care_food_consumptions").select("kcal,protein_g,carbs_g,fat_g").eq("patient_id",patientId).gte("recorded_at",start.toISOString()).lt("recorded_at",end.toISOString());
  if(!logs.error)setConsumed(logs.data??[]);
  setFeedback("Porção registrada no histórico alimentar.");setSaving(false);
 }
 const goalEntries=[{label:"Energia",value:goals?.target_kcal,unit:"kcal"},{label:"Proteína",value:goals?.target_protein_g,unit:"g"},{label:"Carboidratos",value:goals?.target_carbs_g,unit:"g"},{label:"Gorduras",value:goals?.target_fat_g,unit:"g"}];
 return <section className="mx-auto flex h-full max-w-6xl flex-col gap-4 pb-8 text-foreground" aria-label="Biblioteca alimentar">
  <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
   <div className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-3 text-primary"><BookOpen size={24}/></span><div><p className="text-xs font-bold uppercase tracking-widest text-primary">CareDigital · Nutrição</p><h1 className="text-xl font-extrabold sm:text-2xl">Biblioteca alimentar e calculadora</h1><p className="text-xs text-muted-foreground">Composição por 100 g · ajuste por porção · metas individuais</p></div></div>
   <Link to="/" className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold"><ArrowLeft size={15}/> Voltar</Link>
  </header>
  {error&&<p role="alert" className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
   <article className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm">
    <div className="mb-3 flex items-center gap-2 font-extrabold"><Search size={18} className="text-primary"/> Consultar alimentos <span className="ml-auto text-xs font-normal text-muted-foreground">{filtered.length} itens</span></div>
    <input aria-label="Pesquisar alimento" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar: arroz, frango, banana..." className="field mb-2 w-full"/>
    <select aria-label="Grupo alimentar" value={group} onChange={e=>setGroup(e.target.value)} className="field mb-3 w-full">{groups.map(g=><option key={g}>{g}</option>)}</select>
    <div className="max-h-[min(45dvh,430px)] space-y-1 overflow-y-auto pr-1">
     {loading?<p className="p-4 text-sm text-muted-foreground">Carregando alimentos...</p>:filtered.length===0?<p className="p-4 text-sm text-muted-foreground">Nenhum alimento encontrado.</p>:filtered.map(f=><button type="button" key={f.id} onClick={()=>{setSelected(f.id);setGrams(100)}} className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${selected===f.id?"border-primary bg-primary/10":"border-transparent hover:border-border hover:bg-muted/50"}`}><span className="min-w-0"><strong className="block text-sm">{f.name}</strong><span className="text-[11px] text-muted-foreground">{f.food_group||"Alimento"} · {fmt(n(f.protein_g))} g proteína/100 g</span></span><span className="shrink-0 text-sm font-extrabold text-primary">{fmt(n(f.kcal))} kcal</span></button>)}
    </div>
   </article>
   <div className="grid min-w-0 content-start gap-4">
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
     <h2 className="mb-2 flex items-center gap-2 font-extrabold"><Utensils size={18} className="text-primary"/> Composição da porção</h2>
     {food?<><h3 className="text-lg font-extrabold">{food.name}</h3><p className="mb-3 text-xs text-muted-foreground">Valores proporcionais aos dados cadastrados por 100 g.</p>
      <label className="mb-3 block text-xs font-bold">Quantidade consumida (gramas)<input type="number" min="1" max="10000" value={grams} onChange={e=>setGrams(Math.max(0,Number(e.target.value)))} className="field mt-1 w-full"/></label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{nutrients.map(v=><div key={v.key} className="rounded-xl bg-muted/50 p-3"><p className="text-[11px] text-muted-foreground">{v.label}</p><strong className="text-lg">{fmt(n(food[v.key])*factor)} <span className="text-xs">{v.unit}</span></strong></div>)}</div>
      {patientId&&<button type="button" onClick={()=>void registerPortion()} disabled={saving||grams<=0||grams>10000} className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving?"Registrando...":"Registrar porção no histórico"}</button>}
      {feedback&&<p role="status" className="mt-2 text-xs">{feedback}</p>}
      <p className="mt-3 text-[11px] text-muted-foreground">Fonte informada: {food.provenance||"não especificada"}. {food.note||""}</p>
     </>:<p className="text-sm text-muted-foreground">Selecione um alimento no catálogo.</p>}
    </article>
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
     <h2 className="mb-3 flex items-center gap-2 font-extrabold"><Calculator size={18} className="text-primary"/> Calculadora de quantidade necessária</h2>
     <div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold">Nutriente<select className="field mt-1 w-full" value={nutrient} onChange={e=>setNutrient(e.target.value as typeof nutrient)}><option value="protein_g">Proteínas</option><option value="carbs_g">Carboidratos</option><option value="fat_g">Gorduras</option><option value="kcal">Calorias</option></select></label><label className="text-xs font-bold">Meta nesta porção ({unit})<input type="number" min="0" value={target} onChange={e=>setTarget(Math.max(0,Number(e.target.value)))} className="field mt-1 w-full"/></label></div>
     <div className="mt-3 rounded-xl bg-primary/10 p-4"><p className="text-xs font-semibold">Quantidade estimada de {food?.name||"alimento"}</p><strong className="text-2xl font-extrabold text-primary">{required===null?"Não calculável":fmt(required)+" g"}</strong><p className="mt-1 text-xs text-muted-foreground">Para fornecer {fmt(target)} {unit} de {nutrient==="kcal"?"energia":nutrient==="protein_g"?"proteínas":nutrient==="carbs_g"?"carboidratos":"gorduras"}.</p></div>
    </article>
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
     <h2 className="mb-3 flex items-center gap-2 font-extrabold"><Target size={18} className="text-primary"/> Metas nutricionais do cliente</h2>
     {goals?<><div className="grid grid-cols-2 gap-2">{goalEntries.map((x,i)=><div key={x.label} className="rounded-xl border border-border p-3"><p className="text-xs text-muted-foreground">{x.label}</p><strong>{x.value==null?"Não definida":fmt(n(x.value))+" "+x.unit}</strong><p className="mt-1 text-xs text-muted-foreground">Consumido hoje: {fmt(i===0?totals.kcal:i===1?totals.protein_g:i===2?totals.carbs_g:totals.fat_g)} {x.unit}</p>{x.value!=null&&n(x.value)>0&&<><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:Math.min(100,(i===0?totals.kcal:i===1?totals.protein_g:i===2?totals.carbs_g:totals.fat_g)/n(x.value)*100)+"%"}}/></div><p className="mt-1 text-[11px] text-muted-foreground">Restante: {fmt(Math.max(0,n(x.value)-(i===0?totals.kcal:i===1?totals.protein_g:i===2?totals.carbs_g:totals.fat_g)))} {x.unit}</p></>}</div>)}</div><p className="mt-2 text-xs text-muted-foreground">Peso cadastrado: {goals.weight_kg?fmt(n(goals.weight_kg))+" kg":"não informado"}. Metas configuradas no prontuário, não prescritas automaticamente.</p></>:<p className="text-sm text-muted-foreground">Entre com uma conta de cliente vinculada e configure as metas nutricionais no prontuário para consultar seus objetivos aqui.</p>}
    </article>
   </div>
  </div>
  <p className="text-xs text-muted-foreground">Vitaminas e minerais: ainda não disponíveis na base nutricional atual. Não exibimos valores não verificados. Os cálculos são estimativas alimentares e não substituem orientação nutricional individual.</p>
 </section>;
}
