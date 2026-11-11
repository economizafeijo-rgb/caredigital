import { useEffect, useMemo, useState } from "react";
import { Activity, Droplets, Flame, Scale, Wheat, Beef, TrendingUp, Clock3 } from "lucide-react";
import { ClientBodyHistory } from "./ClientBodyHistory";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  heightCm: number | null;
  weightKg: number | null;
  waterTarget: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  kcal: number | null;
  patientId?: string;
  ownerId?: string;
  revision?: number;
  full?: boolean;
};
type DailyValue={date:string;value:number};
const numberPt = (value: number | null, digits = 0) =>
  value == null || !Number.isFinite(value) || value <= 0
    ? "—"
    : value.toLocaleString("pt-BR", { maximumFractionDigits: digits });

function TrendPanel({title,subtitle,values,unit,icon:Icon}:{title:string;subtitle:string;values:DailyValue[];unit:string;icon:typeof Activity}){
  const valid=values.filter(point=>Number.isFinite(point.value));
  const max=Math.max(1,...valid.map(point=>point.value));
  const min=Math.min(0,...valid.map(point=>point.value));
  const points=valid.map((point,index)=>`${valid.length===1?50:5+index*90/(valid.length-1)},${90-(point.value-min)/Math.max(1,max-min)*75}`).join(" ");
  return <section className="rounded-xl border border-border bg-card p-3">
    <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><Icon size={16}/></span><div><h4 className="text-xs font-bold">{title}</h4><p className="text-[11px] text-muted-foreground">{subtitle}</p></div></div>
    {valid.length>=2?<svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Gráfico de ${title.toLowerCase()}`} className="mt-3 h-20 w-full overflow-visible rounded-lg bg-muted/35"><polyline points={points} fill="none" stroke="currentColor" className="text-primary" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round"/>{valid.map((point,index)=><circle key={point.date} cx={valid.length===1?50:5+index*90/(valid.length-1)} cy={90-(point.value-min)/Math.max(1,max-min)*75} r="1.8" fill="currentColor" className="text-primary"/>)}</svg>:<p className="mt-3 rounded-lg bg-muted/35 p-4 text-center text-[11px] text-muted-foreground">Ainda não há registros suficientes para formar uma tendência.</p>}
    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground"><span>{valid[0]?.date??"—"}</span><strong className="text-foreground">{valid.length?numberPt(valid[valid.length-1].value,1)+" "+unit:"Sem dados"}</strong><span>{valid[valid.length-1]?.date??"—"}</span></div>
  </section>;
}

export function ClientOverviewIndicators({ heightCm, weightKg, waterTarget, protein, carbs, fat, kcal, patientId, ownerId, revision=0, full=false }: Props) {
  const [waterHistory,setWaterHistory]=useState<DailyValue[]>([]);
  const [activityHistory,setActivityHistory]=useState<DailyValue[]>([]);
  const [historyLoading,setHistoryLoading]=useState(false);
  const [historyError,setHistoryError]=useState("");
  const bmi = heightCm && heightCm > 0 && weightKg && weightKg > 0
    ? weightKg / ((heightCm / 100) ** 2)
    : null;
  const bmiLabel = bmi == null ? "Dados incompletos"
    : bmi < 18.5 ? "Abaixo da faixa de referência"
    : bmi < 25 ? "Faixa de referência"
    : bmi < 30 ? "Acima da faixa de referência"
    : "Faixa elevada";
  const items = [
    { key: "bmi", label: "IMC", value: numberPt(bmi, 1), unit: "", note: bmiLabel, icon: Scale, detail: "O IMC é uma relação entre peso e altura. É um indicador de triagem e não substitui avaliação clínica individual." },
    { key: "water", label: "Água por dia", value: numberPt(waterTarget), unit: "ml", note: waterTarget ? "Meta cadastrada" : "Meta não disponível", icon: Droplets, detail: "Meta diária apresentada conforme o objetivo de hidratação disponível no prontuário. Restrições de líquidos devem seguir a orientação profissional." },
    { key: "protein", label: "Proteínas", value: numberPt(protein), unit: "g", note: protein ? "Meta diária" : "Não definida", icon: Beef, detail: "Meta nutricional cadastrada para proteínas. Não é uma recomendação nova nem uma prescrição gerada por esta tela." },
    { key: "carbs", label: "Carboidratos", value: numberPt(carbs), unit: "g", note: carbs ? "Meta diária" : "Não definida", icon: Wheat, detail: "Meta nutricional cadastrada para carboidratos. Consulte os detalhes do perfil para entender a distribuição individual." },
    { key: "fat", label: "Gorduras", value: numberPt(fat), unit: "g", note: fat ? "Meta diária" : "Não definida", icon: Activity, detail: "Meta nutricional cadastrada para gorduras. O valor é exibido como consta no perfil." },
    { key: "energy", label: "Energia", value: numberPt(kcal), unit: "kcal", note: kcal ? "Meta diária" : "Não definida", icon: Flame, detail: "Meta energética diária cadastrada. A tela não recalcula nem altera esse objetivo." },
  ];

  useEffect(()=>{
    if(!full||!patientId||!ownerId){setWaterHistory([]);setActivityHistory([]);return;}
    let active=true;
    setHistoryLoading(true);setHistoryError("");
    const since=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Rio_Branco",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(Date.now()-6*86400000));
    void Promise.all([
      (supabase as any).from("care_hydration_daily_goals").select("goal_date,consumed_ml")
        .eq("patient_id",patientId).eq("owner_id",ownerId).gte("goal_date",since).order("goal_date",{ascending:true}).limit(7),
      (supabase as any).from("care_activity_log").select("happened_at,details")
        .eq("patient_id",patientId).eq("owner_id",ownerId).eq("category","atividade")
        .eq("event_type","logged").gte("happened_at",new Date(Date.now()-6*86400000).toISOString())
        .order("happened_at",{ascending:true}).limit(300)
    ]).then(([water,activity])=>{
      if(!active)return;
      if(water.error||activity.error){setHistoryError("Alguns históricos ainda não estão disponíveis. Confira as migrações do banco.");}
      const waterMap=new Map<string,number>();
      for(const row of water.data??[])waterMap.set(row.goal_date,Number(row.consumed_ml)||0);
      setWaterHistory(Array.from({length:7},(_,index)=>{
        const date=new Date(Date.now()-(6-index)*86400000);
        const key=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Rio_Branco",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
        return waterMap.has(key)?{date:key.slice(5).split("-").reverse().join("/"),value:waterMap.get(key)!}:null;
      }).filter((point):point is DailyValue=>point!==null));
      const activityMap=new Map<string,number>();
      for(const row of activity.data??[]){
        const key=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Rio_Branco",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(row.happened_at));
        const minutes=Number(row.details?.duration_minutes)||0;
        activityMap.set(key,(activityMap.get(key)??0)+minutes);
      }
      setActivityHistory(Array.from({length:7},(_,index)=>{
        const date=new Date(Date.now()-(6-index)*86400000);
        const key=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Rio_Branco",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
        return {date:key.slice(5).split("-").reverse().join("/"),value:activityMap.get(key)??0};
      }));
    }).catch(()=>{if(active)setHistoryError("Não foi possível carregar os históricos de evolução.");})
      .finally(()=>{if(active)setHistoryLoading(false);});
    return()=>{active=false;};
  },[full,patientId,ownerId,revision]);

  return <section className="care-overview-indicators" aria-label="Indicadores de saúde">
    <div className="care-overview-section-heading">
      <div><span className="care-overview-eyebrow">SEUS INDICADORES</span><h3>Saúde e nutrição</h3></div>
      <span className="care-overview-heading-note">{full?"Evolução registrada":"Dados do perfil"}</span>
    </div>
    <div className="care-overview-indicator-grid">
      {items.map(item => {
        const Icon = item.icon;
        return <details key={item.key} className="care-overview-indicator">
          <summary>
            <span className="care-overview-indicator-icon"><Icon size={15}/></span>
            <span className="care-overview-indicator-copy"><span>{item.label}</span><strong>{item.value}<small>{item.unit}</small></strong><em>{item.note}</em></span>
          </summary>
          <p>{item.detail}</p>
        </details>;
      })}
    </div>
    {full&&<div className="mt-3 space-y-3">
      <div className="flex items-center gap-2"><TrendingUp size={17} className="text-primary"/><div><h3 className="text-sm font-bold">Evolução e histórico</h3><p className="text-[11px] text-muted-foreground">Gráficos baseados somente em registros reais do prontuário · últimos 7 dias</p></div></div>
      {historyLoading?<p className="rounded-lg bg-muted/40 p-4 text-center text-xs text-muted-foreground">Carregando indicadores históricos…</p>:<div className="grid gap-2 md:grid-cols-2"><TrendPanel title="Consumo de água" subtitle="Volume registrado por dia" values={waterHistory} unit="ml" icon={Droplets}/><TrendPanel title="Atividade física" subtitle="Minutos registrados por dia" values={activityHistory} unit="min" icon={Clock3}/></div>}
      {historyError&&<p role="status" className="text-xs text-amber-600">{historyError}</p>}
      {patientId&&ownerId&&<ClientBodyHistory patientId={patientId} ownerId={ownerId} currentWeight={weightKg} height={heightCm}/>}
    </div>}
  </section>;
}
