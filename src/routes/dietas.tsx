import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { diets, medications } from "@/lib/mock-data";
import { Btn, IconBox, PageHeader, Panel, Tag } from "@/components/vigia/ui";

export const Route = createFileRoute("/dietas")({
  head: () => ({
    meta: [
      { title: "Dietas e suplementos — Vigia" },
      { name: "description", content: "Planos alimentares, regimes, hidratação e suplementação dos pacientes." },
      { property: "og:title", content: "Dietas e suplementos — Vigia" },
      { property: "og:description", content: "Planos alimentares, regimes, hidratação e suplementação dos pacientes." },
    ],
  }),
  component: Dietas,
});

function Dietas() {
  const [active, setActive] = useState(diets[0]!.id);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [water, setWater] = useState(3);
  const diet = diets.find((d) => d.id === active)!;
  const supplements = medications.filter((m) => m.kind === "Suplemento");
  const eaten = diet.meals.filter((m) => checked[diet.id + m.time]).reduce((a, m) => a + m.kcal, 0);

  return (
    <>
      <PageHeader eyebrow="Alimentação, regime e suplementos" title="Dietas">
        {diets.map((d) => <Btn key={d.id} variant={active === d.id ? "dark" : "ghost"} onClick={() => setActive(d.id)}>{d.name}</Btn>)}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Refeições do dia" className="lg:col-span-2" action={<Tag tone="primary">{diet.goal}</Tag>}>
          <div className="divide-y divide-border">
            {diet.meals.map((m) => {
              const k = diet.id + m.time;
              return (
                <label key={k} className="flex cursor-pointer items-center gap-4 py-3">
                  <input type="checkbox" className="size-4 accent-primary" checked={!!checked[k]} onChange={() => setChecked((c) => ({ ...c, [k]: !c[k] }))} />
                  <span className="w-14 font-mono text-sm text-primary">{m.time}</span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-semibold ${checked[k] ? "text-muted-foreground line-through" : ""}`}>{m.name}</div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">{m.items}</div>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">{m.kcal} kcal</span>
                </label>
              );
            })}
          </div>
        </Panel>

        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-foreground p-6 text-primary-foreground animate-rise">
            <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/30 blur-3xl" />
            <div className="relative">
              <div className="label-mono text-primary-foreground/60">Calorias consumidas</div>
              <div className="mt-2 font-display text-6xl tabular-nums leading-none">{eaten}<span className="text-2xl text-primary-foreground/50"> / {diet.kcal}</span></div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-primary-foreground/15">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (eaten / diet.kcal) * 100)}%` }} />
              </div>
              <div className="mt-6 label-mono text-primary-foreground/60">Hidratação · meta {diet.water}</div>
              <div className="mt-2 flex gap-1.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <button key={i} onClick={() => setWater(i + 1)} aria-label={`${i + 1} copos`}
                    className={`h-8 flex-1 rounded-md transition-colors ${i < water ? "bg-primary" : "bg-primary-foreground/15"}`} />
                ))}
              </div>
              <div className="mt-2 font-mono text-[11px] text-primary-foreground/60">{water} de 8 copos (250ml)</div>
            </div>
          </div>

          <Panel title="Suplementos" delay={0.1}>
            <div className="space-y-3">
              {supplements.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <IconBox tone="warning">{s.name[0]}</IconBox>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{s.name} {s.dose}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{s.times.join(" · ")} · {s.notes}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
