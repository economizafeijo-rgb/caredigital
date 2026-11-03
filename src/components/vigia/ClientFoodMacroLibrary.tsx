import { useEffect,useMemo,useRef,useState } from "react";
import { AlertTriangle,Calculator,CheckCircle2,ChevronLeft,ChevronRight,ClipboardCheck,Droplets,RefreshCw,Search,Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { foodMacroLabels,gramsForMacro,ingredients,portionNutrition,proteinRange,
  type FoodMacro,type Goal,type Ingredient } from "@/lib/nutrition-catalog";

export type MacroTargets={protein:string;carbs:string;fat:string;kcal:string};
type FoodLog={id:string;food_id:string;grams:number;protein_g:number;carbs_g:number;fat_g:number;kcal:number;recorded_at:string};
type Props={
 patientId:string;ownerId:string;goal:Goal;weight:string;sensitive:boolean;avoided:string[];
 targets:MacroTargets;onTargetsChange:(next:MacroTargets)=>void;onLogged?:()=>void;
};
const acre="America/Rio_Branco";
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:acre,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const stamp=(iso:string)=>new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:acre}).format(new Date(iso));
const format=(n:number)=>n.toLocaleString("pt-BR",{maximumFractionDigits:1});
const numeric=(v:unknown):number|null=>v===null||v===undefined||v===""?null:Number(v);
const parsePositive=(value:string):number|null=>{
 if(!value.trim())return null;
 const n=Number(value.replace(",","."));
 return Number.isFinite(n)&&n>0?n:null;
};
const MACROS:FoodMacro[]=["protein","carbs","fat","kcal"];
const groups=[{id:"todos",label:"Todos"},{id:"frutas",label:"Frutas"},{id:"cereais",label:"Cereais/raízes"},
 {id:"proteinas",label:"Proteínas"},{id:"legumes",label:"Verduras"},{id:"bebidas",label:"Bebidas"}] as const;

export function ClientFoodMacroLibrary({patientId,ownerId,goal,weight,sensitive,avoided,targets,onTargetsChange,onLogged}:Props){
 const [foods,setFoods]=useState<Ingredient[]>(ingredients);
 const [logs,setLogs]=useState<FoodLog[]>([]);
 const [sourceError,setSourceError]=useState("");
 const [refresh,setRefresh]=useState(0);
 const [search,setSearch]=useState("");
 const [group,setGroup]=useState<string>("todos");
 const [page,setPage]=useState(0);
 const [selected,setSelected]=useState("frango");
 const [portion,setPortion]=useState("100");
 const [macro,setMacro]=useState<FoodMacro>("protein");
 const [desired,setDesired]=useState("30");
 const [useRemaining,setUseRemaining]=useState(true);
 const [saving,setSaving]=useState(false);
 const [notice,setNotice]=useState("");
 const [toDelete,setToDelete]=useState<FoodLog|null>(null);
 const requestId=useRef<string|null>(null);
 const pageSize=8;

 useEffect(()=>{
  let active=true;
  const load=async()=>{
   const day=today();
   const from=new Date(day+"T00:00:00-05:00");
   const until=new Date(from.getTime()+86_400_000);
   const [lib,consumed]=await Promise.all([
    (supabase as any).from("care_food_catalog")
      .select("id,name,food_group,kcal,protein_g,carbs_g,fat_g,fiber_g,provenance,note,flags")
      .order("name",{ascending:true}).limit(500),
    (supabase as any).from("care_food_consumptions")
      .select("id,food_id,grams,kcal,protein_g,carbs_g,fat_g,recorded_at")
      .eq("patient_id",patientId).eq("owner_id",ownerId)
      .gte("recorded_at",from.toISOString()).lt("recorded_at",until.toISOString())
      .order("recorded_at",{ascending:false}).limit(250),
   ]);
   if(!active)return;
   if(lib.error){
     setSourceError("A biblioteca do servidor não respondeu. Mostrando catálogo editorial local.");
     setFoods(ingredients);
   }else{
     setSourceError("");
     const rows=(lib.data??[]).map((r:any):Ingredient=>({
       id:r.id,name:r.name,group:r.food_group,
       protein:numeric(r.protein_g),carbs:numeric(r.carbs_g),
       fat:numeric(r.fat_g),fiber:numeric(r.fiber_g),kcal:numeric(r.kcal),
       note:r.note||undefined,flags:Array.isArray(r.flags)?r.flags:[],
       provenance:String(r.provenance).startsWith("TACO")?"TACO":String(r.provenance).startsWith("Rótulo")?"rotulo":"estimativa",
     }));
     setFoods(rows.length?rows:ingredients);
   }
   if(consumed.error){
    setNotice("Não foi possível consultar os macros consumidos hoje. Nenhum valor será presumido.");
    setLogs([]);
   }else{
    setLogs((consumed.data??[]).map((r:any)=>({
      id:r.id,food_id:r.food_id,grams:Number(r.grams),kcal:Number(r.kcal),
      protein_g:Number(r.protein_g),carbs_g:Number(r.carbs_g),fat_g:Number(r.fat_g),recorded_at:r.recorded_at,
    })));
   }
  };
  void load();
  return()=>{active=false};
 },[patientId,ownerId,refresh]);
 useEffect(()=>{
  if(!patientId)return;
  const channel=supabase.channel("care-nutrition-library-"+patientId)
   .on("postgres_changes",{event:"*",schema:"public",table:"care_food_consumptions",
     filter:"patient_id=eq."+patientId},()=>setRefresh(v=>v+1)).subscribe();
  return()=>{void supabase.removeChannel(channel);};
 },[patientId]);
 const filtered=useMemo(()=>foods.filter(f=>
  (group==="todos"||f.group===group)&&
  (!search.trim()||f.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
     .includes(search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()))
 ),[foods,group,search]);
 const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
 const shown=filtered.slice(Math.min(page,pages-1)*pageSize,(Math.min(page,pages-1)+1)*pageSize);
 const food=foods.find(f=>f.id===selected)||foods[0]||null;
 const enteredGrams=parsePositive(portion);
 const perPortion=food&&enteredGrams?portionNutrition(food,enteredGrams):null;
 const totals=useMemo(()=>logs.reduce((acc,l)=>{
  acc.protein+=l.protein_g;acc.carbs+=l.carbs_g;acc.fat+=l.fat_g;acc.kcal+=l.kcal;
  return acc;
 },{protein:0,carbs:0,fat:0,kcal:0}),[logs]);
 const proteinEstimate=proteinRange(Number(weight.replace(",",".")),goal);
 const currentTarget=(m:FoodMacro)=>{
  const override=parsePositive(targets[m]);
  return override??(m==="protein"?proteinEstimate?.low??null:null);
 };
 const target=currentTarget(macro);
 const needed=useRemaining&&target!==null?Math.max(0,target-totals[macro]):parsePositive(desired);
 const neededGrams=food&&needed!==null?gramsForMacro(food,macro,needed):null;
 const warnings=food?.flags??[];
 const contraindicated=Boolean(food&&avoided.includes(food.id));
 const simpleWarning=Boolean(sensitive&&warnings.some(w=>["acido","gorduroso","cafeina","frito","picante"].includes(w)));
 const labels={protein:"Proteínas",carbs:"Carboidratos",fat:"Gorduras",kcal:"Calorias"};
 async function recordFood(){
  if(!food||saving)return;
  if(food.protein===null||food.carbs===null||food.fat===null||food.kcal===null){
   setNotice("Dados nutricionais indisponíveis. Informe os valores do rótulo antes de usar para metas.");return;
  }
  if(!enteredGrams||enteredGrams<1||enteredGrams>2000){
   setNotice("Informe uma porção entre 1 g e 2.000 g.");return;
  }
  setSaving(true);setNotice("");
  try{
   const result=await (supabase as any).rpc("care_log_food_portion",{
     p_patient_id:patientId,p_food_id:food.id,p_grams:enteredGrams,
     p_request_id:(requestId.current??=crypto.randomUUID()),
   });
   if(result.error||!result.data?.id)throw new Error(result.error?.message??"Registro não verificado.");
   requestId.current=null;
   setNotice("Consumo registrado às "+stamp(result.data.recorded_at)+" (Acre). Metas e próximos lembretes recalculados.");
   setRefresh(v=>v+1);onLogged?.();
  }catch(err){setNotice("Falha ao registrar: "+(err instanceof Error?err.message:"consulte o prontuário antes de repetir."));}
  finally{setSaving(false);}
 }
 async function deleteFood(){
  if(!toDelete||saving)return;
  setSaving(true);setNotice("");
  const res=await (supabase as any).rpc("care_delete_food_portion",{p_entry_id:toDelete.id,p_verified:true});
  setSaving(false);setToDelete(null);
  if(res.error||res.data?.deleted_id!==toDelete.id){
   setNotice("Não foi possível remover o registro. Nenhuma alteração confirmada.");return;
  }
  setNotice("Registro removido do cálculo nutricional e auditado no prontuário.");
  setRefresh(v=>v+1);onLogged?.();
 }
 const changeTarget=(key:FoodMacro,value:string)=>onTargetsChange({...targets,[key]:value});
 return <div className="care-food-macro-library care-macro-responsive flex h-full min-h-0 min-w-0 flex-col gap-2" aria-label="Biblioteca de alimentos e calculadora de macros">
  <div className="grid shrink-0 grid-cols-2 gap-1.5 sm:grid-cols-4">
   {MACROS.map(key=>{
    const total=totals[key],daily=currentTarget(key);
    const percentage=daily?Math.min(100,Math.round(100*total/daily)):0;
    return <div key={key} className="min-w-0 rounded-xl border border-border bg-muted/40 p-2.5">
     <span className="block truncate text-[10px] font-bold text-muted-foreground">{labels[key]} hoje</span>
     <strong className="mt-0.5 block text-base font-extrabold tabular-nums">{format(total)}{key==="kcal"?" kcal":" g"}</strong>
     <span className="block text-[10px] text-muted-foreground">{daily?"meta "+format(daily)+(key==="kcal"?" kcal":" g"):"meta não definida"}</span>
     <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full bg-emerald-500" style={{width:percentage+"%"}}/></span>
    </div>;
   })}
  </div>
  <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[minmax(0,1.12fr)_minmax(300px,.88fr)]">
   <section className="min-h-0 min-w-0 overflow-y-auto rounded-xl border border-border bg-card/70 p-3">
    <div className="flex items-center justify-between gap-2">
     <div><h4 className="text-sm font-extrabold">Biblioteca de alimentos e nutrientes</h4><p className="text-[10px] text-muted-foreground">Valores aproximados por 100 g da porção comestível e preparo especificado</p></div>
     <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">{foods.length} alimentos</span>
    </div>
    {sourceError&&<p role="status" className="mt-1 text-[10px] text-amber-600">{sourceError}</p>}
    <div className="mt-2 flex flex-wrap gap-1.5">
     <label className="relative flex min-w-[150px] flex-1"><Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground"/><input
       value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} type="search"
       placeholder="Buscar banana, macaxeira, frango…" aria-label="Buscar na biblioteca"
       className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-xs"/></label>
     <select className="h-9 rounded-lg border border-border bg-background px-2 text-xs" value={group}
       onChange={e=>{setGroup(e.target.value);setPage(0);}} aria-label="Filtrar grupo alimentar">
       {groups.map(g=><option value={g.id} key={g.id}>{g.label}</option>)}
     </select>
    </div>
    <div className="mt-2 space-y-1.5">{shown.map(f=>{
     const chosen=food?.id===f.id;
     return <button type="button" key={f.id} onClick={()=>{setSelected(f.id);requestId.current=null;setNotice("");}}
       aria-pressed={chosen}
       className={"w-full rounded-lg border p-2.5 text-left transition "+(chosen?"border-emerald-500/70 bg-emerald-500/[.09]":"border-border bg-background/45 hover:border-primary/35")}>
        <span className="block text-xs font-extrabold">{f.name}</span>
        <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
         <span>P {f.protein===null?"—":format(f.protein)+" g"}</span>
         <span>C {f.carbs===null?"—":format(f.carbs)+" g"}</span>
         <span>G {f.fat===null?"—":format(f.fat)+" g"}</span>
         <span>{f.kcal===null?"Rótulo necessário":format(f.kcal)+" kcal"}</span>
        </span>
       </button>;
    })}</div>
    {!shown.length&&<p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">Nenhum alimento encontrado.</p>}
    <nav className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[11px]" aria-label="Páginas da biblioteca">
     <button type="button" disabled={page===0} onClick={()=>setPage(v=>Math.max(0,v-1))} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 font-semibold disabled:opacity-40"><ChevronLeft size={14}/>Anterior</button>
     <span className="tabular-nums text-muted-foreground">Página {Math.min(page,pages-1)+1} de {pages}</span>
     <button type="button" disabled={page>=pages-1} onClick={()=>setPage(v=>Math.min(pages-1,v+1))} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 font-semibold disabled:opacity-40">Próxima<ChevronRight size={14}/></button>
    </nav>
   </section>
   <section className="min-h-0 min-w-0 overflow-y-auto rounded-xl border border-border bg-card/70 p-3">
    <h4 className="flex items-center gap-1.5 text-sm font-extrabold"><Calculator size={17} className="text-primary"/> Calculadora de alimentos e macronutrientes</h4>
    <p className="mt-1 text-[10px] text-muted-foreground">Selecione um alimento na biblioteca e descubra quantos gramas forneceriam a quantidade desejada de um nutriente.</p>
    {food&&<>
     <h5 className="mt-3 text-xs font-extrabold">{food.name}</h5>
     <p className="text-[10px] text-muted-foreground">{food.provenance==="TACO"?"Referência TACO/UNICAMP":food.provenance==="rotulo"?"Rótulo obrigatório":"Estimativa editorial"} · por 100 g</p>
     <div className="mt-2 grid grid-cols-4 gap-1 rounded-xl border border-border bg-muted/35 p-2">
      {MACROS.map(key=><div key={key} className="min-w-0 text-center">
       <small className="block truncate text-[9px] text-muted-foreground">{foodMacroLabels[key]}</small>
       <strong className="block text-[12px] font-extrabold tabular-nums">{food[key]===null?"—":format(food[key]!)}</strong>
       <small className="block text-[9px] text-muted-foreground">{key==="kcal"?"kcal":"g"}</small>
      </div>)}
     </div>
     <div className="mt-3 grid grid-cols-2 gap-2">
      <label className="text-[11px] font-bold">Nutriente
       <select value={macro} onChange={e=>setMacro(e.target.value as FoodMacro)} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-xs">
        {MACROS.map(k=><option value={k} key={k}>{foodMacroLabels[k]}</option>)}
       </select>
      </label>
      <label className="text-[11px] font-bold">Quantidade da porção (g)
       <input type="number" min={1} max={2000} step={5} value={portion}
         onChange={e=>{setPortion(e.target.value);requestId.current=null;}} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-xs"/>
      </label>
     </div>
     {perPortion&&<p className="mt-1 rounded-lg bg-muted/45 px-2 py-1.5 text-[10px]">
       Esta porção tem cerca de <strong>{format(perPortion.protein??0)} g P</strong>, <strong>{format(perPortion.carbs??0)} g C</strong>, <strong>{format(perPortion.fat??0)} g G</strong> e <strong>{format(perPortion.kcal??0)} kcal</strong>.
     </p>}
     <div className="mt-3 flex items-center gap-2">
      <input id="macro-target-remaining" type="checkbox" checked={useRemaining} onChange={e=>setUseRemaining(e.target.checked)} className="size-4 accent-emerald-600"/>
      <label htmlFor="macro-target-remaining" className="text-[11px]">Calcular pelo restante da meta diária</label>
     </div>
     {useRemaining&&target===null&&<p className="mt-1 text-[10px] text-amber-600">Defina uma meta diária abaixo ou use o cálculo por quantidade avulsa.</p>}
     {!useRemaining&&<label className="mt-2 block text-[11px] font-bold">Quantidade adicional desejada ({macro==="kcal"?"kcal":"g"})
      <input type="number" min=".1" max="10000" step="1" value={desired} onChange={e=>setDesired(e.target.value)}
       className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-xs"/>
     </label>}
     <div className="mt-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[.075] p-3" aria-live="polite">
      <p className="text-[10px] font-bold text-muted-foreground">{useRemaining?"Restante da meta":"Nutriente desejado"}</p>
      <strong className="block text-xl font-extrabold tabular-nums">{needed===null?"Meta não definida":format(needed)+(macro==="kcal"?" kcal":" g")}</strong>
      <p className="mt-1 text-[11px] font-semibold">
       {neededGrams===null?"Não calculável para este alimento (valor ausente ou zero).":
        neededGrams===0?"Meta informada já atingida.":"Seriam aproximadamente "+format(neededGrams)+" g de "+food.name+"."}
      </p>
      {neededGrams!==null&&neededGrams>600&&<p className="mt-1 text-[10px] text-amber-700 dark:text-amber-300"><AlertTriangle size={12} className="mr-1 inline"/> Porção alta. Não tente atingir toda a meta por um único alimento; varie as fontes.</p>}
     </div>
     {(simpleWarning||contraindicated)&&<p className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/[.06] p-2 text-[10px]">
      <AlertTriangle size={12} className="mr-1 inline"/>{contraindicated?"Alimento marcado como evitado. ":""}{simpleWarning?"Pode desencadear desconforto no estômago; avalie sua tolerância.":""}
     </p>}
     <button type="button" disabled={saving||!enteredGrams||enteredGrams>2000||!perPortion||food.protein===null||food.carbs===null||food.fat===null||food.kcal===null}
       onClick={()=>void recordFood()}
       className="mt-2 flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50">
       <ClipboardCheck size={15}/>{saving?"Registrando…":"Registrar este alimento consumido"}
     </button>
     <p className="mt-1 text-[10px] text-muted-foreground">Registra apenas o alimento realmente consumido com horário do servidor, sem confirmar automaticamente uma refeição programada.</p>
    </>}
    <h5 className="mt-3 text-xs font-extrabold">Suas metas diárias de macros</h5>
    <div className="mt-1 grid grid-cols-2 gap-2">
     {MACROS.map(key=><label key={key} className="text-[10px] font-bold">{foodMacroLabels[key]} ({key==="kcal"?"kcal":"g"})
      <input type="number" step=".1" min={1} max={key==="kcal"?7000:key==="fat"?350:key==="protein"?500:1200}
       placeholder={key==="protein"&&proteinEstimate?"Sugerida: "+proteinEstimate.low:"Definir"}
       value={targets[key]} onChange={e=>changeTarget(key,e.target.value)}
       className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-xs"/>
     </label>)}
    </div>
    <p className="mt-1 text-[10px] text-muted-foreground">Use o botão <strong>Salvar preferências</strong> acima para guardar as metas. Apenas proteína tem uma faixa orientativa derivada do peso; calorias, carboidratos e gorduras precisam ser definidos individualmente.</p>
   </section>
  </div>
  <div className="shrink-0 rounded-lg border border-border bg-muted/25 px-3 py-2">
    <div className="flex items-center justify-between gap-1"><strong className="text-[11px]">Alimentos estruturados registrados hoje</strong><span className="text-[10px] text-muted-foreground">{logs.length} registros</span></div>
    <div className="mt-1 flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">{logs.length?logs.slice(0,12).map(log=><div key={log.id} className="flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-[10px]">
     <span>{foods.find(f=>f.id===log.food_id)?.name??log.food_id} · {format(log.grams)} g · {stamp(log.recorded_at)}</span>
     <button type="button" aria-label="Remover consumo" onClick={()=>setToDelete(log)} className="text-destructive"><Trash2 size={12}/></button>
    </div>):<span className="text-[10px] text-muted-foreground">Nenhum alimento com porção em gramas registrado pela biblioteca hoje.</span>}</div>
    <p className="mt-1 text-[10px] text-muted-foreground">Refeições registradas apenas em texto não são convertidas em macros para evitar valores inventados.</p>
  </div>
  {notice&&<p role="status" className="shrink-0 rounded-lg border border-sky-500/25 bg-sky-500/[.05] p-2 text-[11px]">{notice}</p>}
  {toDelete&&<div className="fixed inset-0 z-[11000] grid place-items-center bg-slate-950/70 p-4" role="presentation">
   <section role="dialog" aria-modal="true" aria-label="Excluir registro alimentar" className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
    <h4 className="text-base font-extrabold">Excluir consumo registrado?</h4>
    <p className="mt-2 text-xs text-muted-foreground">Esse alimento será retirado dos totais nutricionais de hoje. A exclusão será anotada no histórico. Não desfaz automaticamente alterações anteriores de horário.</p>
    <div className="mt-4 flex gap-2"><button type="button" onClick={()=>setToDelete(null)} disabled={saving} className="flex-1 rounded-lg border border-border p-2 text-xs font-bold">Cancelar</button>
     <button type="button" onClick={()=>void deleteFood()} disabled={saving} className="flex-1 rounded-lg bg-destructive p-2 text-xs font-bold text-destructive-foreground">{saving?"Excluindo…":"Confirmar exclusão"}</button></div>
   </section>
  </div>}
 </div>;
}
