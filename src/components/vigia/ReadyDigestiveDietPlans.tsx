import { useEffect, useMemo, useState } from "react";
import { loadDietPlans, type DietPlan } from "@/lib/digestive-protocols";
import { Panel, Tag } from "@/components/vigia/ui";

export function ReadyDigestiveDietPlans() {
  const [plans, setPlans] = useState<DietPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCondition, setActiveCondition] = useState("");
  const [activePlanId, setActivePlanId] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    loadDietPlans()
      .then((rows) => {
        if (cancelled) return;
        setPlans(rows);
        const initialPlan = rows.find((plan) => plan.id === "plano-gastrite") ?? rows[0];
        setActiveCondition(initialPlan?.condition_key ?? "");
        setActivePlanId(initialPlan?.id ?? "");
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível carregar os cardápios.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const groups = useMemo(() => {
    const byCondition = new Map<string, DietPlan[]>();
    for (const plan of plans) {
      const group = byCondition.get(plan.condition_key) ?? [];
      group.push(plan);
      byCondition.set(plan.condition_key, group);
    }
    return [...byCondition.entries()].map(([conditionKey, variants]) => ({
      conditionKey,
      plans: variants.sort((a, b) => a.variant - b.variant),
    }));
  }, [plans]);
  const activeGroup = groups.find((group) => group.conditionKey === activeCondition);
  const activePlan = activeGroup?.plans.find((plan) => plan.id === activePlanId) ?? activeGroup?.plans[0];
  const doneCount = activePlan?.meals.filter((meal) => checked[`${activePlan.id}:${meal.time}`]).length ?? 0;

  return (
    <section aria-labelledby="ready-diet-plans-title">
      <div>
        <div className="label-mono text-muted-foreground">Cardápios do dia · ativos no banco de dados</div>
        <h2 id="ready-diet-plans-title" className="mt-2 font-display text-4xl tracking-tight">Dietas prontas para organizar o dia</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">Cada condição tem três combinações de cardápio. Escolha uma condição e depois compare as opções A, B e C, cada uma com cinco horários e alimentos diferentes. As refeições são exemplos para adultos; quantidades devem ser individualizadas.</p>
      </div>

      {loading && <p className="mt-5 rounded-xl bg-foreground/5 p-4 text-sm text-muted-foreground">Carregando cardápios públicos…</p>}
      {!loading && error && <p role="alert" className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm">{error}</p>}
      {!loading && !error && plans.length === 0 && <p className="mt-5 rounded-xl bg-foreground/5 p-4 text-sm text-muted-foreground">Nenhum cardápio ativo está disponível.</p>}

      {plans.length > 0 && <>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="Escolher condição digestiva">
          {groups.map((group) => {
            const first = group.plans[0]!;
            const selected = group.conditionKey === activeCondition;
            return <button key={group.conditionKey} type="button" onClick={() => { setActiveCondition(group.conditionKey); setActivePlanId(first.id); }} aria-pressed={selected}
              className={`rounded-xl p-4 text-left transition-colors ${selected ? "bg-primary/10 ring-1 ring-primary/40" : "bg-foreground/5 hover:bg-foreground/10"}`}>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{first.category} · {group.plans.length} opções</div>
              <div className="mt-1 text-sm font-semibold leading-snug">{first.name}</div>
              <div className="mt-2 text-xs leading-relaxed text-muted-foreground">{first.goal}</div>
            </button>;
          })}
        </div>

        {activePlan && <Panel className="mt-5" delay={0.1}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2"><Tag tone="primary">{activePlan.category}</Tag><span className="text-xs text-muted-foreground">5 horários sugeridos · ajuste à sua rotina</span></div>
            <span className="font-mono text-xs text-muted-foreground">{doneCount}/{activePlan.meals.length} refeições marcadas</span>
          </div>
          <h3 className="mt-3 font-display text-3xl tracking-tight">{activePlan.name}</h3>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground">{activePlan.summary}</p>

          <div className="mt-5 flex flex-wrap items-center gap-2" aria-label="Escolher combinação de refeições">
            <span className="mr-1 label-mono text-muted-foreground">Outras combinações</span>
            {activeGroup?.plans.map((plan) => <button key={plan.id} type="button" onClick={() => setActivePlanId(plan.id)} aria-pressed={plan.id === activePlan.id}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${plan.id === activePlan.id ? "bg-foreground text-primary-foreground" : "bg-foreground/5 hover:bg-foreground/10"}`}>
              {plan.variant_label}
            </button>)}
          </div>

          <ol className="mt-5 divide-y divide-border rounded-xl border border-border/70">
            {activePlan.meals.map((meal) => {
              const key = `${activePlan.id}:${meal.time}`;
              const isChecked = !!checked[key];
              return <li key={key}>
                <label className={`flex cursor-pointer items-start gap-4 p-4 transition-colors ${isChecked ? "bg-success/5" : "hover:bg-foreground/5"}`}>
                  <input type="checkbox" className="mt-1 size-4 shrink-0 accent-primary" checked={isChecked} onChange={() => setChecked((state) => ({ ...state, [key]: !state[key] }))} />
                  <time className="min-w-14 rounded-lg bg-primary/10 px-2 py-1 text-center font-mono text-sm font-semibold text-primary">{meal.time}</time>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-semibold ${isChecked ? "text-muted-foreground line-through" : ""}`}>{meal.name}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{meal.items}</span>
                  </span>
                  {isChecked && <span className="font-mono text-[10px] uppercase text-success">Feita</span>}
                </label>
              </li>;
            })}
          </ol>

          <div className="mt-5 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm leading-relaxed"><strong className="block">Cuidados</strong><span className="mt-1 block text-muted-foreground">{activePlan.caution}</span></div>
          <div className="mt-5">
            <h4 className="label-mono">Fontes clínicas</h4>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">{activePlan.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline-offset-4 hover:underline">{source.label} ↗</a></li>)}</ul>
          </div>
        </Panel>}
      </>}
    </section>
  );
}
