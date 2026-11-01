import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Droplets, Dumbbell, Info, ShieldAlert } from "lucide-react";

const KEY = "caredigital-hydration-profile-v1";
type Profile = { age: string; weight: string; exercise: string; sweat: "low"|"normal"|"high"; objective: "recovery"|"muscle"; restrictions: boolean };
const defaultProfile:Profile={age:"",weight:"",exercise:"0",sweat:"normal",objective:"recovery",restrictions:false};
const round50=(n:number)=>Math.round(n/50)*50;
export function HydrationPersonalPlan({currentTarget,onApply}:{currentTarget:number;onApply:(n:number)=>void}){
 const [p,setP]=useState<Profile>(defaultProfile);
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{try{const data=window.localStorage.getItem(KEY);if(data)setP({...defaultProfile,...JSON.parse(data)});}catch{}setLoaded(true)},[]);
 useEffect(()=>{if(loaded)window.localStorage.setItem(KEY,JSON.stringify(p))},[p,loaded]);
 const change=(part:Partial<Profile>)=>setP(old=>({...old,...part}));
 const age=Number(p.age), weight=Number(p.weight), exercise=Number(p.exercise);
 const valid=Number.isFinite(age)&&age>=18&&age<=110&&Number.isFinite(weight)&&weight>=30&&weight<=250&&Number.isFinite(exercise)&&exercise>=0&&exercise<=480;
 const result=useMemo(()=>{
  if(!valid)return null;
  // Practical starting estimate for daily beverages, not a disease-specific formula or clinical prescription.
  const base=round50(weight*30);
  // Activity/sweat allowance is illustrative; individual sweat losses should take priority.
  const activity=exercise<=0?0:round50(Math.min(600,(exercise/60)*(p.sweat==="high"?550:p.sweat==="low"?250:400)));
  return {base,activity,total:base+activity,litres:((base+activity)/1000).toFixed(2).replace(".",",")};
 },[valid,weight,exercise,p.sweat]);
 const fraction=Math.min(100,Math.round(currentTarget?100*currentTarget/Math.max(1000,result?.total??2000):0));
 return <section className="rounded-2xl border border-border bg-card p-4 sm:p-5" aria-label="Calculadora pessoal de hidratação">
  <div className="flex flex-wrap items-center justify-between gap-2">
   <div><p className="flex items-center gap-2 text-base font-bold"><Droplets className="text-primary" size={19}/> Água para seu corpo e rotina</p><p className="mt-1 text-xs text-muted-foreground">Estimativa ajustável para adultos, incluindo treino e período de tratamento.</p></div>
   <span className="rounded-lg border border-border bg-muted px-2.5 py-1.5 text-[11px] text-muted-foreground">Dados salvos só neste navegador</span>
  </div>
  <div className="mt-4 grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
   <div className="mx-auto flex w-full max-w-[245px] items-center justify-center">
    <svg viewBox="0 0 260 260" role="img" aria-label="Ilustração de garrafa de água e nível de hidratação selecionado" className="h-auto w-full">
     <defs><linearGradient id="waterFill" x1="0" x2="0" y1="1" y2="0"><stop offset="0%" stopColor="#186c9f"/><stop offset="100%" stopColor="#60c3e5"/></linearGradient><clipPath id="bottleWater"><rect x="80" y="63" width="98" height="171" rx="26"/></clipPath></defs>
     <circle cx="129" cy="128" r="118" fill="currentColor" opacity=".035"/>
     <path d="M110 27h40v26l18 13c10 7 16 19 16 31v126c0 11-9 20-20 20h-68c-11 0-20-9-20-20V97c0-12 6-24 16-31l18-13z" fill="none" stroke="#5babc9" strokeWidth="5"/>
     <rect x="106" y="19" width="48" height="19" rx="6" fill="#417f9e"/>
     <g clipPath="url(#bottleWater)"><rect x="72" y={234-171*fraction/100} width="119" height={171*fraction/100+12} fill="url(#waterFill)"/><path d="M71 180Q100 169 132 179T192 179" stroke="#d9f6ff" strokeWidth="5" opacity=".65" fill="none"/></g>
     <path d="M104 90h52M104 132h52M104 174h52M104 216h52" stroke="#b1d5e4" strokeOpacity=".65" strokeWidth="2" strokeLinecap="round"/>
     <text x="130" y="143" fill="#163f5b" stroke="#ffffff" strokeWidth="3" paintOrder="stroke" fontSize="29" fontWeight="800" textAnchor="middle">{valid?result?.litres:"—"} L</text>
     <text x="130" y="159" fill="#ffffff" stroke="#1a5876" strokeWidth=".6" paintOrder="stroke" fontSize="10" fontWeight="600" textAnchor="middle">ESTIMATIVA</text>
     <circle cx="220" cy="63" r="25" fill="#c5e9f5"/><path d="M220 43c-7 10-13 17-13 24a13 13 0 0 0 26 0c0-7-6-14-13-24z" fill="#308fb7"/>
    </svg>
   </div>
   <div className="grid grid-cols-2 gap-2.5">
    <label className="text-xs font-semibold">Idade (anos)<input type="number" min={18} max={110} value={p.age} onChange={e=>change({age:e.target.value})} placeholder="Informar" className="field mt-1" /></label>
    <label className="text-xs font-semibold">Peso atual (kg)<input type="number" min={30} max={250} step=".5" value={p.weight} onChange={e=>change({weight:e.target.value})} placeholder="Informar" className="field mt-1" /></label>
    <label className="text-xs font-semibold">Treino hoje (min)<input type="number" min={0} max={480} step={10} value={p.exercise} onChange={e=>change({exercise:e.target.value})} className="field mt-1" /></label>
    <label className="text-xs font-semibold">Quanto suou?<select className="field mt-1" value={p.sweat} onChange={e=>change({sweat:e.target.value as Profile["sweat"]})}><option value="low">Pouco</option><option value="normal">Moderado</option><option value="high">Muito</option></select></label>
    <label className="col-span-2 text-xs font-semibold">Objetivo<select className="field mt-1" value={p.objective} onChange={e=>change({objective:e.target.value as Profile["objective"]})}><option value="recovery">Hidratação e recuperação</option><option value="muscle">Ganhar massa muscular</option></select></label>
    <label className="col-span-2 flex items-start gap-2 rounded-lg bg-muted/60 p-2.5 text-xs"><input type="checkbox" checked={p.restrictions} onChange={e=>change({restrictions:e.target.checked})} className="mt-0.5"/><span>Tenho orientação para limitar líquidos, doença renal/cardíaca ou retenção de líquidos.</span></label>
   </div>
  </div>
  {result&&!p.restrictions?<div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[11px] text-muted-foreground">Referência aproximada para bebidas no dia</p><p className="text-2xl font-bold tabular-nums">{result.litres} L <span className="text-sm font-normal text-muted-foreground">({result.total} ml)</span></p></div><button type="button" disabled={result.total>4500} onClick={()=>onApply(result.total)} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{result.total>4500?"Requer avaliação":"Usar como meta"}</button></div><p className="mt-2 text-xs text-muted-foreground">{result.base} ml de base estimada + {result.activity} ml de ajuste ilustrativo pelo exercício. Os alimentos também fornecem água. A meta não é uma obrigação de consumir esse volume. Valores acima de 4,5 L exigem avaliação individual antes da aplicação.</p></div>
   :<p className="mt-3 rounded-xl border border-border bg-muted/70 p-3 text-xs text-muted-foreground">{p.restrictions?"Não aplique o cálculo automático: peça ao profissional uma meta individualizada.":"Informe idade adulta e peso atual para gerar a estimativa; não presumimos dados do paciente."}</p>}
  <div className="mt-3 grid gap-2 sm:grid-cols-2">
   <div className="rounded-xl border border-border p-3"><div className="flex items-center gap-2 text-xs font-semibold"><Dumbbell size={16} className="text-primary"/> Ganho de massa muscular</div><p className="mt-1 text-xs text-muted-foreground">Ganhar músculo por si só não exige beber água a mais. Treino, suor, calor e alimentação são os fatores relevantes. Evite treinos intensos se estiver debilitado.</p></div>
   <div className="rounded-xl border border-border p-3"><div className="flex items-center gap-2 text-xs font-semibold"><Activity size={16} className="text-primary"/> Gastrite e H. pylori</div><p className="mt-1 text-xs text-muted-foreground">Distribua goles pequenos conforme tolerância, especialmente se sentir desconforto. Vômitos ou diarreia podem exigir orientação sobre reposição de líquidos e sais.</p></div>
  </div>
  <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground"><ShieldAlert size={16} className="mt-0.5 shrink-0 text-warning"/> Estimativa operacional de ~30 ml/kg de bebidas, mais ajuste ilustrativo de atividade (até 600 ml); não é fórmula clínica validada para gastrite, H. pylori ou hipertrofia, nem substitui avaliação. A necessidade real varia com sexo, idade, alimentação, temperatura e perdas pelo suor; evite ingerir grandes volumes rapidamente.</p>
  <p className="mt-1 text-[11px] text-muted-foreground">Referências: <a href="https://www.nationalacademies.org/read/10925/chapter/6" target="_blank" rel="noreferrer" className="underline">National Academies</a> · <a href="https://pubmed.ncbi.nlm.nih.gov/17277604/" target="_blank" rel="noreferrer" className="underline">ACSM</a>.</p>
 </section>;
}