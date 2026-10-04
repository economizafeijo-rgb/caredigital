import { useEffect, useMemo, useState } from "react";
import { loadSportsGoalPlans, loadSportsSupplements, type SportsGoalPlan, type SportsSupplement } from "@/lib/digestive-protocols";
import { Field, Panel, Tag } from "@/components/vigia/ui";

const goalLabels: Record<string, string> = {
  hipertrofia: "Hipertrofia",
  emagrecimento: "Emagrecimento",
  "ganho-de-peso": "Aumento de peso",
};

export function SportsNutritionLibrary() {
  const [plans, setPlans] = useState<SportsGoalPlan[]>([]);
  const [supplements, setSupplements] = useState<SportsSupplement[]>([]);
  const [goal, setGoal] = useState("hipertrofia");
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadSportsGoalPlans(), loadSportsSupplements()])
      .then(([loadedPlans, loadedSupplements]) => {
        if (cancelled) return;
        setPlans(loadedPlans);
        setSupplements(loadedSupplements);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível carregar a área de nutrição esportiva.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const activePlan = useMemo(() => plans.find((plan) => plan.goal_key === goal), [plans, goal]);
  const kg = Number(weight.replace(",", "."));
  const protein = Number.isFinite(kg) && kg > 0 && kg <= 300
    ? { min: Math.round(kg * 1.4), max: Math.round(kg * 2) }
    : null;

  return (
    <div>
      <p className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">Suplementos são opcionais. Os resultados dependem principalmente de alimentação, treino, sono e consistência. Conteúdo educativo para adultos; não substitui nutricionista ou médico.</p>

      {loading && <p className="rounded-xl bg-foreground/5 p-4 text-sm text-muted-foreground">Carregando planos e suplementos do banco de dados…</p>}
      {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm">{error}</p>}

      {!loading && !error && <>
        <div className="grid gap-3 sm:grid-cols-3" aria-label="Escolher objetivo">
          {Object.entries(goalLabels).map(([key, label]) => <button key={key} type="button" onClick={() => setGoal(key)} aria-pressed={goal === key}
            className={`rounded-xl p-4 text-left transition-colors ${goal === key ? "bg-foreground text-primary-foreground" : "bg-foreground/5 hover:bg-foreground/10"}`}>
            <div className="label-mono opacity-70">Objetivo</div><div className="mt-1 font-display text-2xl">{label}</div>
          </button>)}
        </div>

        {activePlan && <>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
            <Panel title={activePlan.name}>
              <p className="text-sm leading-relaxed text-muted-foreground">{activePlan.summary}</p>
              <h3 className="mt-5 label-mono text-muted-foreground">Focos do plano</h3>
              <ul className="mt-2 space-y-2">{activePlan.priorities.map((item) => <li key={item} className="flex gap-2 text-sm leading-relaxed"><span className="text-primary">•</span><span>{item}</span></li>)}</ul>
              <h3 className="mt-5 label-mono text-muted-foreground">Alimentos para combinar</h3>
              <div className="mt-2 flex flex-wrap gap-2">{activePlan.foods.map((food) => <Tag key={food} tone="muted">{food}</Tag>)}</div>
              <p className="mt-5 rounded-xl bg-warning/10 p-3 text-xs leading-relaxed">{activePlan.note}</p>
              <div className="mt-4 flex flex-wrap gap-3">{activePlan.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary underline underline-offset-4">{source.label}</a>)}</div>
            </Panel>

            <Panel title="Estimativa de proteína pelo peso">
              <Field label="Peso corporal em kg">
                <input type="number" inputMode="decimal" min="1" max="300" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="Ex.: 70" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              </Field>
              {protein ? <div className="mt-4 rounded-xl bg-primary/10 p-4"><div className="label-mono text-primary">Faixa geral diária para adultos que treinam</div><div className="mt-1 font-display text-4xl">{protein.min}–{protein.max} <span className="text-lg">g/dia</span></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Cálculo educativo de 1,4–2,0 g/kg/dia. Some alimentos e suplementos. A meta apropriada varia conforme treino, idade, saúde e objetivo. Não é uma meta clínica individual.</p></div>
                : <p className="mt-4 rounded-xl bg-foreground/5 p-4 text-sm text-muted-foreground">Informe seu peso para visualizar a faixa estimada.</p>}
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Doença renal/hepática, gravidez, amamentação, idade abaixo de 18 anos ou condição clínica: não use este cálculo para definir a dieta; procure profissional.</p>
            </Panel>
          </div>

          <Panel className="mt-5" title="Cardápio exemplo com horários">
            <p className="mb-4 text-sm text-muted-foreground">Cinco momentos sugeridos. Os horários podem mudar para se adequar ao sono, trabalho, treino e fome; ajuste porções com nutricionista.</p>
            <ol className="divide-y divide-border rounded-xl border border-border/70">
              {activePlan.meals.map((meal) => <li key={`${meal.time}-${meal.name}`} className="flex items-start gap-4 p-4"><time className="min-w-14 rounded-lg bg-primary/10 px-2 py-1 text-center font-mono text-sm font-semibold text-primary">{meal.time}</time><div><h3 className="text-sm font-semibold">{meal.name}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{meal.items}</p></div></li>)}
            </ol>
          </Panel>
        </>}

        <section className="mt-10" aria-labelledby="sports-supplements-title">
          <div className="mb-4"><div className="label-mono text-muted-foreground">Guia de uso responsável</div><h2 id="sports-supplements-title" className="mt-2 font-display text-3xl tracking-tight md:text-4xl">Suplementos: função, evidência e uso</h2><p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground">As quantidades abaixo são referências gerais quando há evidência. Para vitaminas, maca e BCAA, dose universal para hipertrofia ou perda de peso não está estabelecida.</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            {supplements.map((item) => <Panel key={item.id}>
              <div className="flex flex-wrap items-center justify-between gap-2"><Tag tone={item.id === "creatina-monohidratada" ? "success" : "muted"}>{item.category}</Tag><span className="label-mono text-muted-foreground">{item.name}</span></div>
              <p className="mt-4 text-sm leading-relaxed">{item.purpose}</p>
              <div className="mt-3 rounded-lg bg-primary/5 p-3"><div className="label-mono text-primary">Evidência</div><p className="mt-1 text-xs leading-relaxed">{item.evidence}</p></div>
              <dl className="mt-4 space-y-3 text-sm"><div><dt className="font-semibold">Quando considerar</dt><dd className="mt-0.5 leading-relaxed text-muted-foreground">{item.use_case}</dd></div><div><dt className="font-semibold">Quantidade de referência</dt><dd className="mt-0.5 leading-relaxed text-muted-foreground">{item.common_dose}</dd></div><div><dt className="font-semibold">Horário</dt><dd className="mt-0.5 leading-relaxed text-muted-foreground">{item.timing}</dd></div><div><dt className="font-semibold">Cuidados</dt><dd className="mt-0.5 leading-relaxed text-muted-foreground">{item.cautions}</dd></div></dl>
              <div className="mt-4 flex flex-wrap gap-3">{item.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary underline underline-offset-4">Fonte: {source.label}</a>)}</div>
            </Panel>)}
          </div>
        </section>
        <p className="mt-6 rounded-xl border border-border bg-foreground/5 p-4 text-xs leading-relaxed text-muted-foreground">Qualidade do produto: confira composição, lote, regularização e procedência. Atletas sujeitos a controle antidopagem podem conferir produtos com certificação independente, como <a href="https://www.nsfsport.com/certified-products/" target="_blank" rel="noreferrer" className="font-semibold text-primary underline underline-offset-4">NSF Certified for Sport</a>. Suplementos não tratam doenças nem substituem prescrição.</p>
      </>}
    </div>
  );
}
