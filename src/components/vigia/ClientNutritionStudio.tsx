import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BookOpen, Calculator, ClipboardList, HeartPulse, Leaf, RotateCcw, Save, Search, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
 ingredientById,ingredients,mealSlots,menuForDay,nutritionSources,proteinRange,recipeFits,
 recipeTotals,recipeTriggers,recipes,triggerNames,
 type Goal,type Ingredient,type MealTime,type Recipe
} from "@/lib/nutrition-catalog";
import { ClientFoodMacroLibrary,type MacroTargets } from "./ClientFoodMacroLibrary";
import "./nutrition-studio.css";

type Props={patientId:string;ownerId:string;onLogged?:()=>void};
type View="cardapio"|"receitas"|"alimentos"|"proteina";
const goalOptions:{value:Goal;label:string;description:string}[]=[
 {value:"equilibrio",label:"Alimentação equilibrada",description:"Variedade de refeições e alimentos in natura"},
 {value:"emagrecimento",label:"Controle de peso",description:"Opções de refeições variadas; sem restrição extrema"},
 {value:"ganho_peso",label:"Ganho de peso",description:"Refeições regulares e boas fontes de energia"},
 {value:"hipertrofia",label:"Hipertrofia",description:"Distribuição de proteínas ao longo do dia"}
];
const timeLabels:Record<MealTime,string>={cafe:"Café da manhã",almoco:"Almoço",jantar:"Jantar",lanche:"Lanche"};
const viewOptions:{key:View;label:string}[]=[
 {key:"alimentos",label:"Registrar refeições"},{key:"cardapio",label:"Planejamento"},{key:"receitas",label:"Receitas"},{key:"proteina",label:"Metas e proteína"}
];
const week=["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
const safeNumber=(n:number)=>n.toLocaleString("pt-BR",{maximumFractionDigits:1});
const norm=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR");
const navButton=(selected:boolean)=>"rounded-lg px-3 py-2 text-xs font-bold transition-colors "+(selected?"bg-primary text-primary-foreground shadow":"text-muted-foreground hover:bg-muted");
export function ClientNutritionStudio({patientId,ownerId,onLogged}:Props){
 const [view,setView]=useState<View>("alimentos");
 const [goal,setGoal]=useState<Goal>("equilibrio");
 const [sensitive,setSensitive]=useState(false);
 const [avoided,setAvoided]=useState<string[]>([]);
 const [weight,setWeight]=useState("");
 const [macroTargets,setMacroTargets]=useState<MacroTargets>({protein:"",carbs:"",fat:"",kcal:""});
 const [mealFilter,setMealFilter]=useState<"todos"|MealTime>("todos");
 const [search,setSearch]=useState("");
 const [foodGroup,setFoodGroup]=useState<"todos"|Ingredient["group"]>("todos");
 const [day,setDay]=useState(0);
 const [rotation,setRotation]=useState(0);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [saving,setSaving]=useState(false);
 const [loaded,setLoaded]=useState(false);
 const [notice,setNotice]=useState("");
 const [loadError,setLoadError]=useState("");
 const [showAvoid,setShowAvoid]=useState(false);

 useEffect(()=>{
   let alive=true;
   void (async()=>{
     const r=await (supabase as any).from("care_nutrition_preferences")
       .select("objective,gastritis_sensitive,avoided_ingredients,weight_kg,target_protein_g,target_carbs_g,target_fat_g,target_kcal")
       .eq("patient_id",patientId).eq("owner_id",ownerId).maybeSingle();
     if(!alive)return;
     if(r.error)setLoadError("Preferências não carregadas. É possível consultar receitas, mas o salvamento exige a atualização do banco de dados.");
     else if(r.data){
       if(goalOptions.some(o=>o.value===r.data.objective))setGoal(r.data.objective as Goal);
       setSensitive(Boolean(r.data.gastritis_sensitive));
       setAvoided((Array.isArray(r.data.avoided_ingredients)?r.data.avoided_ingredients:[]).filter((id:unknown)=>typeof id==="string" && ingredientById.has(id)));
       if(Number.isFinite(Number(r.data.weight_kg))&&r.data.weight_kg!==null)setWeight(String(r.data.weight_kg));
       setMacroTargets({protein:r.data.target_protein_g==null?"":String(r.data.target_protein_g),
         carbs:r.data.target_carbs_g==null?"":String(r.data.target_carbs_g),
         fat:r.data.target_fat_g==null?"":String(r.data.target_fat_g),
         kcal:r.data.target_kcal==null?"":String(r.data.target_kcal)});
     }
     setLoaded(true);
   })();
   return()=>{alive=false};
 },[patientId,ownerId]);

 const filteredRecipes=useMemo(()=>recipes.filter(r=>
   recipeFits(r,goal,sensitive,avoided)&&
   (mealFilter==="todos"||r.slot===mealFilter)&&
   (!search.trim()||norm(r.title+" "+r.description+" "+r.ingredients.map(([id])=>ingredientById.get(id)?.name??"").join(" ")).includes(norm(search.trim())))
 ),[goal,sensitive,avoided,mealFilter,search]);
 const selectableRecipes=useMemo(()=>recipes.filter(r=>recipeFits(r,goal,sensitive,avoided)),[goal,sensitive,avoided]);
 const plan=useMemo(()=>menuForDay(day,selectableRecipes,rotation,goal),[day,selectableRecipes,rotation,goal]);
 const planNutrition=plan.reduce((acc,{recipe})=>{
  if(recipe){const info=recipeTotals(recipe);acc.protein+=info.protein;acc.kcal+=info.kcal;}
  return acc;
 },{protein:0,kcal:0});
 const visibleFoods=useMemo(()=>ingredients.filter(f=>
  (foodGroup==="todos"||f.group===foodGroup)&&
  (!search.trim()||norm(f.name).includes(norm(search.trim())))
 ),[foodGroup,search]);
 const chosen=recipes.find(r=>r.id===selectedId)||null;
 const protein=proteinRange(Number(weight.replace(",",".")),goal);
 const selectedGoal=goalOptions.find(o=>o.value===goal)!;
 const triggers=(r:Recipe)=>recipeTriggers(r).map(flag=>triggerNames[flag]);
 function openRecipe(recipe:Recipe){setSelectedId(recipe.id);setNotice("");}
 function chooseView(key:View){setView(key);setSelectedId(null);setSearch("");setMealFilter("todos");}
 async function save(){
   if(!patientId||!ownerId||saving)return;
   const kg=weight.trim()?Number(weight.replace(",",".")):null;
   if(kg!==null&&(!Number.isFinite(kg)||kg<30||kg>300)){setNotice("Informe peso entre 30 e 300 kg, ou deixe em branco.");return;}
   const limits:Record<keyof MacroTargets,[number,number]>={protein:[1,500],carbs:[1,1200],fat:[1,350],kcal:[500,7000]};
   const values=Object.fromEntries((Object.keys(limits) as (keyof MacroTargets)[]).map(key=>{
     const raw=macroTargets[key].trim();
     return [key,raw?Number(raw.replace(",",".")):null];
   })) as Record<keyof MacroTargets,number|null>;
   for(const key of Object.keys(limits) as (keyof MacroTargets)[]){
     const n=values[key];const [min,max]=limits[key];
     if(n!==null&&(!Number.isFinite(n)||n<min||n>max)){
       setNotice("Revise a meta de "+key+": intervalo aceito "+min+"–"+max+".");return;
     }
   }
   setSaving(true);setNotice("");
   try{
     const {data:user,error:authError}=await supabase.auth.getUser();
     if(authError||!user.user)throw new Error("Entre novamente para salvar suas preferências.");
     const r=await (supabase as any).from("care_nutrition_preferences").upsert({
       patient_id:patientId,owner_id:ownerId,objective:goal,gastritis_sensitive:sensitive,
       avoided_ingredients:avoided,weight_kg:kg,
       target_protein_g:values.protein,target_carbs_g:values.carbs,
       target_fat_g:values.fat,target_kcal:values.kcal,updated_by:user.user.id,
       updated_at:new Date().toISOString()
     },{onConflict:"patient_id"}).select("patient_id").single();
     if(r.error||r.data?.patient_id!==patientId)throw new Error(r.error?.message??"O banco não confirmou o salvamento.");
     setNotice("Preferências atualizadas no prontuário privado deste paciente.");
     setLoadError("");
   }catch(e){setNotice(e instanceof Error?"Não foi possível salvar: "+e.message:"Não foi possível salvar.");}
   finally{setSaving(false);}
 }
 const isIgnored=(item:Ingredient)=>avoided.includes(item.id);
 const sourceLink=(url:string,title:string)=><a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline decoration-primary/35 underline-offset-2">{title}</a>;
 return <section className="nutrition-studio care-nutrition-responsive flex h-full min-h-0 min-w-0 flex-col gap-2 text-foreground" aria-label="Cardápios e dietas com orientação educativa">
   <header className="nutrition-studio-toolbar flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/[.08] to-sky-500/[.05] px-3 py-2.5">
     <div className="flex min-w-0 items-center gap-2"><Leaf size={20} className="shrink-0 text-emerald-600 dark:text-emerald-300"/>
       <div><h3 className="text-sm font-extrabold">Central de Nutrição</h3><p className="text-[10px] text-muted-foreground">Seu hub alimentar · registre refeições, acompanhe metas e organize seu cardápio</p></div>
     </div>
     <button type="button" disabled={!loaded||saving} onClick={()=>void save()}
       className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[11px] font-extrabold text-primary-foreground disabled:opacity-50"><Save size={14}/>{saving?"Salvando…":"Salvar preferências"}</button>
   </header>

   <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Acesso rápido à nutrição">
     {[{key:"alimentos" as View,title:"Diário alimentar",description:"Porções e consumo",icon:"🥗"},{key:"cardapio" as View,title:"Plano semanal",description:"Organize 7 dias",icon:"📅"},{key:"receitas" as View,title:"Receitas",description:"Ideias e combinações",icon:"🍲"},{key:"proteina" as View,title:"Metas nutricionais",description:"Cálculo e objetivos",icon:"📊"}].map(item=><button type="button" key={item.key} onClick={()=>chooseView(item.key)} aria-pressed={view===item.key} className={"min-w-0 rounded-xl border p-3 text-left transition-colors "+(view===item.key?"border-emerald-500/60 bg-emerald-500/10 shadow-sm":"border-border bg-card hover:bg-muted/60")}>
       <span className="text-xl" aria-hidden="true">{item.icon}</span><strong className="mt-1 block text-xs sm:text-sm">{item.title}</strong><span className="block text-[10px] text-muted-foreground">{item.description}</span>
     </button>)}
   </div>
   <div className="nutrition-studio-filters grid shrink-0 grid-cols-1 gap-2 rounded-xl border border-border bg-muted/25 p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
     <label className="min-w-0 text-[10px] font-bold">Objetivo alimentar
       <select value={goal} onChange={e=>{setGoal(e.target.value as Goal);setSelectedId(null);}} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground">
        {goalOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
       </select>
     </label>
     <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold">
       <input type="checkbox" className="size-4 accent-emerald-600" checked={sensitive} onChange={e=>{setSensitive(e.target.checked);setSelectedId(null);}}/>
       <span>Modo gastrite / estômago sensível <small className="block font-normal text-muted-foreground">Reduz opções com gatilhos frequentes; não garante tolerância</small></span>
     </label>
     <button type="button" onClick={()=>setShowAvoid(v=>!v)} aria-expanded={showAvoid} className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold hover:bg-muted">
       Excluir ingredientes ({avoided.length})
     </button>
   </div>
   {showAvoid&&<div className="nutrition-studio-avoid max-h-24 shrink-0 overflow-y-auto rounded-xl border border-border bg-card p-2" aria-label="Alimentos que não quero nas receitas">
      <div className="flex flex-wrap gap-1">{ingredients.map(f=><button key={f.id} type="button" aria-pressed={isIgnored(f)}
       onClick={()=>{setAvoided(old=>old.includes(f.id)?old.filter(x=>x!==f.id):[...old,f.id]);setSelectedId(null);}}
       className={"rounded-full border px-2 py-1 text-[10px] font-semibold "+(isIgnored(f)?"border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-200":"border-border text-muted-foreground hover:bg-muted")}>{isIgnored(f)?"× ":""}{f.name}</button>)}</div>
   </div>}
   <nav className="nutrition-studio-tabs flex shrink-0 flex-wrap gap-1 rounded-xl border border-border bg-card p-1" aria-label="Ferramentas de alimentação">
    {viewOptions.map(o=><button key={o.key} type="button" aria-current={view===o.key?"page":undefined} onClick={()=>chooseView(o.key)} className={"min-w-0 flex-1 "+navButton(view===o.key)}>{o.label}</button>)}
   </nav>
   {(notice||loadError)&&<p role="status" className="shrink-0 rounded-lg border border-amber-500/20 bg-amber-500/[.06] px-3 py-2 text-[11px]">{notice||loadError}</p>}
   {sensitive&&<p className="shrink-0 rounded-lg border border-amber-500/20 bg-amber-500/[.06] px-3 py-2 text-[10px] leading-snug text-foreground"><ShieldAlert size={13} className="mr-1 inline text-amber-600"/> Gastrite e H. pylori: refeições não substituem tratamento. Evite seus gatilhos pessoais; acidez, cafeína, fritura e excesso de gordura podem incomodar. Feijão, aveia e laticínios dependem da tolerância individual.</p>}
   <div className={"nutrition-studio-body grid min-h-0 flex-1 gap-2 "+(view==="alimentos"?"lg:grid-cols-1":"lg:grid-cols-[minmax(0,1.25fr)_minmax(250px,.75fr)]")}>
     <div className={"nutrition-studio-primary min-h-0 min-w-0 overscroll-contain rounded-xl border border-border bg-card/80 p-3 "+(view==="alimentos"?"overflow-hidden":"overflow-y-auto")}>
       {view==="cardapio"&&<>
         <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="flex items-center gap-1.5 text-sm font-extrabold"><ClipboardList size={16} className="text-primary"/> Sugestões para 7 dias</h4><p className="mt-0.5 text-[10px] text-muted-foreground">{selectedGoal.description}. As porções são exemplos, não uma prescrição.</p></div>
           <button type="button" onClick={()=>{setRotation(n=>n+1);setSelectedId(null);}} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-[11px] font-bold hover:bg-muted"><RotateCcw size={14}/> Variar menu</button>
         </div>
         <div className="mt-3 grid grid-cols-7 gap-1">{week.map((label,i)=><button type="button" key={label} onClick={()=>{setDay(i);setSelectedId(null);}} aria-pressed={day===i}
          className={"rounded-lg border py-2 text-[11px] font-extrabold "+(day===i?"border-primary bg-primary text-primary-foreground":"border-border bg-muted/35 text-foreground hover:bg-muted")}>{label}</button>)}</div>
         {selectableRecipes.length===0?<p className="mt-3 rounded-xl border border-dashed border-border p-4 text-xs">Nenhuma receita disponível com todas as restrições selecionadas. Revise os filtros ou procure orientação nutricional.</p>:
         <div className="mt-3 grid gap-2 sm:grid-cols-2">{plan.map(({slot,recipe})=>recipe?<button type="button" key={slot.id} onClick={()=>openRecipe(recipe)}
          className={"nutrition-studio-meal rounded-xl border p-3 text-left transition hover:border-primary/55 hover:bg-primary/[.035] "+(chosen?.id===recipe.id?"border-primary bg-primary/[.08]":"border-border bg-background/60")}>
          <span className="block text-[10px] font-bold uppercase tracking-wide text-primary">{slot.label}</span>
          <strong className="mt-1 block text-xs font-extrabold">{recipe.title}</strong>
          <small className="mt-2 block text-[10px] text-muted-foreground">{recipeTotals(recipe).protein.toLocaleString("pt-BR")} g de proteína estimada · {recipe.minutes} min</small>
         </button>:<div key={slot.id} className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">{slot.label}: nenhuma opção adequada aos filtros.</div>)}</div>}
         <p className="mt-3 text-[11px] text-muted-foreground">Soma ilustrativa das 4 sugestões: <strong className="text-foreground">{safeNumber(planNutrition.protein)} g de proteína</strong> e cerca de <strong className="text-foreground">{safeNumber(planNutrition.kcal)} kcal</strong>. Pode não suprir as necessidades diárias; faltam possíveis outras refeições e ajustes de porção.</p>
       </>}
       {view==="receitas"&&<>
         <h4 className="text-sm font-extrabold">Receitas e combinações filtradas</h4>
         <div className="mt-2 flex flex-wrap gap-2">
           <input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar banana, frango, macaxeira…" aria-label="Buscar receitas"
             className="h-9 min-w-[140px] flex-1 rounded-lg border border-border bg-background px-3 text-xs"/>
           <select value={mealFilter} onChange={e=>setMealFilter(e.target.value as typeof mealFilter)} aria-label="Tipo de refeição"
             className="h-9 rounded-lg border border-border bg-background px-2 text-xs">
             <option value="todos">Todas as refeições</option>{mealSlots.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
           </select>
         </div>
         <p className="mt-2 text-[10px] text-muted-foreground">{filteredRecipes.length} receitas compatíveis com os filtros escolhidos. Compatível não significa comprovadamente tolerado.</p>
         <div className="mt-2 grid gap-2 sm:grid-cols-2">{filteredRecipes.map(r=>{
          const totals=recipeTotals(r);
          return <button type="button" key={r.id} onClick={()=>openRecipe(r)}
            className={"rounded-xl border p-3 text-left hover:border-primary/50 "+(chosen?.id===r.id?"border-primary bg-primary/[.08]":"border-border bg-background/60")}>
             <span className="text-[10px] font-bold uppercase text-primary">{timeLabels[r.slot]} · {r.minutes} min</span>
             <strong className="mt-1 block text-xs font-extrabold">{r.title}</strong>
             <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{r.description}</p>
             <span className="mt-2 block text-[10px] font-semibold">{safeNumber(totals.protein)} g proteína · ~{totals.kcal} kcal</span>
          </button>;
         })}</div>
         {!filteredRecipes.length&&<p className="mt-3 rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">Não há receitas com esses filtros. Revise restrições ou consulte profissional de nutrição.</p>}
       </>}
       {view==="alimentos"&&<ClientFoodMacroLibrary patientId={patientId} ownerId={ownerId}
         goal={goal} weight={weight} sensitive={sensitive} avoided={avoided}
         targets={macroTargets} onTargetsChange={setMacroTargets} onLogged={onLogged}/>}
       {view==="proteina"&&<div className="space-y-3">
         <h4 className="flex items-center gap-2 text-sm font-extrabold"><Calculator size={17} className="text-primary"/> Calculadora de proteína por peso</h4>
         <p className="text-xs text-muted-foreground">Estimativa educativa para adultos, com objetivo alimentar selecionado acima. Não se aplica automaticamente a crianças, gestantes ou pessoas com doença renal/hepática, restrição proteica ou dieta clínica.</p>
         <label className="block text-xs font-bold">Peso corporal (kg)
           <input value={weight} onChange={e=>setWeight(e.target.value)} inputMode="decimal" type="text" placeholder="Ex.: 70"
             className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" aria-label="Peso corporal em quilogramas"/>
         </label>
         {protein?<div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[.075] p-4">
           <p className="text-xs font-semibold">Faixa indicativa para {selectedGoal.label.toLowerCase()}</p>
           <strong className="mt-1 block text-2xl font-extrabold tabular-nums">{protein.low}–{protein.high} g/dia</strong>
           <p className="mt-1 text-xs text-muted-foreground">{protein.perKg[0]}–{protein.perKg[1]} g por kg ao dia · distribuídos entre refeições</p>
           <p className="mt-2 text-[11px]">Exemplo de distribuição em 4 refeições: ~{Math.round(protein.low/4)}–{Math.round(protein.high/4)} g por refeição. Não é obrigação consumir doses iguais.</p>
         </div>:<p className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">Informe um peso válido entre 30 e 300 kg para calcular.</p>}
         <p className="text-xs text-muted-foreground">Para adultos saudáveis sem treino, referência de ~0,8 g/kg/dia; para praticantes de exercícios, a ISSN descreve 1,4–2,0 g/kg/dia. As outras faixas são estimativas orientativas, não prescrição individual.</p>
         <button type="button" onClick={()=>chooseView("alimentos")} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Calcular porções de alimentos e macros</button>
       </div>}
     </div>
     {view!=="alimentos"&&<aside className="nutrition-studio-side min-h-0 min-w-0 overflow-y-auto overscroll-contain rounded-xl border border-border bg-muted/[.24] p-3">
       {chosen?<div>
         <button type="button" onClick={()=>setSelectedId(null)} className="text-[11px] font-semibold text-primary underline">Voltar às sugestões</button>
         <h4 className="mt-2 text-base font-extrabold">{chosen.title}</h4>
         <p className="mt-1 text-[11px] text-muted-foreground">{chosen.description}</p>
         <div className="mt-2 flex flex-wrap gap-1.5"><span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">{safeNumber(recipeTotals(chosen).protein)} g proteína estimada</span><span className="rounded-lg bg-muted px-2 py-1 text-[10px] font-bold">~{recipeTotals(chosen).kcal} kcal</span><span className="rounded-lg bg-muted px-2 py-1 text-[10px] font-bold">{chosen.minutes} minutos</span></div>
         <h5 className="mt-4 text-xs font-extrabold">Ingredientes (porção ilustrativa)</h5>
         <ul className="mt-1 space-y-1">{chosen.ingredients.map(([id,grams])=><li key={id} className="flex justify-between gap-2 border-b border-border/50 py-1 text-[11px]"><span>{ingredientById.get(id)?.name??id}</span><strong className="shrink-0 tabular-nums">{grams} g</strong></li>)}</ul>
         <h5 className="mt-3 text-xs font-extrabold">Preparo</h5>
         <ol className="mt-1 list-inside list-decimal space-y-1 text-[11px] leading-relaxed">{chosen.steps.map((step,i)=><li key={i}>{step}</li>)}</ol>
         {triggers(chosen).length>0&&<p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/[.06] p-2 text-[10px]"><AlertTriangle size={12} className="mr-1 inline"/> Verifique tolerância a: {triggers(chosen).join(", ")}.</p>}
         <p className="mt-3 text-[10px] text-muted-foreground">Valores aproximados, dependentes de marcas, preparo e porção. Se houver sintomas, ajuste com seu nutricionista.</p>
       </div>:<div>
         <div className="flex items-center gap-2"><HeartPulse size={19} className="text-emerald-600 dark:text-emerald-300"/><h4 className="text-sm font-extrabold">Seu planejamento</h4></div>
         <p className="mt-2 text-xs text-muted-foreground">{selectedGoal.description}.</p>
         <div className="mt-3 rounded-xl border border-border bg-card p-3">
           <p className="text-[11px] font-bold">Proteína diária estimada</p>
           <div className="mt-1 text-lg font-extrabold tabular-nums">{protein?`${protein.low}–${protein.high} g`:"Informe seu peso"}</div>
           <button type="button" onClick={()=>chooseView("proteina")} className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary underline"><Calculator size={13}/> Abrir calculadora</button>
         </div>
         <p className="mt-3 text-[11px] font-bold">Preferências de segurança</p>
         <p className="mt-1 text-[11px] text-muted-foreground">{sensitive?"Modo estômago sensível ativado":"Sem filtro digestivo ativado"} · {avoided.length} ingredientes excluídos.</p>
         <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/[.06] p-2.5 text-[10px] leading-relaxed"><ShieldAlert size={13} className="mr-1 inline"/> Nenhum cardápio garante não causar sintomas. Para gastrite associada a H. pylori, a alimentação apoia o conforto, mas não substitui diagnóstico nem antibióticos prescritos.</p>
       </div>}
       <div className="mt-4 border-t border-border pt-3"><p className="flex items-center gap-1.5 text-xs font-extrabold"><BookOpen size={14} className="text-primary"/> Fontes e metodologia</p>
         <div className="mt-2 space-y-1.5">{nutritionSources.map(item=><p key={item.url} className="text-[10px] leading-snug">{sourceLink(item.url,item.title)}</p>)}</div>
         <p className="mt-2 text-[10px] text-muted-foreground">Catálogo editorial local; não faz busca médica automática nem verifica continuamente o conteúdo externo. Informações revisáveis por profissional.</p>
       </div>
     </aside>}
   </div>
 </section>;
}
