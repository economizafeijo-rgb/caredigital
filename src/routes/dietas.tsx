import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { diets, medications } from "@/lib/mock-data";
import { loadDigestiveProtocols, type DigestiveProtocol } from "@/lib/digestive-protocols";
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
  const [protocols, setProtocols] = useState<DigestiveProtocol[]>([]);
  const [protocolsLoading, setProtocolsLoading] = useState(true);
  const [protocolsError, setProtocolsError] = useState("");
  const [protocolFilter, setProtocolFilter] = useState("Todas");
  const [selectedProtocolId, setSelectedProtocolId] = useState("");
  const diet = diets.find((d) => d.id === active)!;
  const visibleProtocols = protocolFilter === "Todas"
    ? protocols
    : protocols.filter((protocol) => protocol.category === protocolFilter);
  const selectedProtocol = protocols.find((protocol) => protocol.id === selectedProtocolId) ?? visibleProtocols[0];
  const supplements = medications.filter((m) => m.kind === "Suplemento");
  const eaten = diet.meals.filter((m) => checked[diet.id + m.time]).reduce((a, m) => a + m.kcal, 0);

  useEffect(() => {
    let cancelled = false;
    loadDigestiveProtocols()
      .then((rows) => {
        if (cancelled) return;
        setProtocols(rows);
        setSelectedProtocolId(rows[0]?.id ?? "");
        setProtocolsError("");
      })
      .catch((error: unknown) => {
        if (!cancelled) setProtocolsError(error instanceof Error ? error.message : "Erro ao carregar protocolos.");
      })
      .finally(() => {
        if (!cancelled) setProtocolsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

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

      <section className="mt-10" aria-labelledby="digestive-protocols-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="label-mono text-muted-foreground">Biblioteca clínica · fontes abertas</div>
            <h2 id="digestive-protocols-title" className="mt-2 font-display text-4xl tracking-tight">Protocolos digestivos</h2>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Filtrar protocolos por área">
            {["Todas", "Estômago", "Intestino", "Intolerância"].map((category) => (
              <Btn key={category} variant={protocolFilter === category ? "dark" : "ghost"} onClick={() => setProtocolFilter(category)}>
                {category}
              </Btn>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm leading-relaxed">
          Material educativo para apoiar a conversa com a equipe de saúde; não é diagnóstico nem prescrição individual. Para gastrite, a dieta geralmente não trata a causa: priorize avaliação clínica e gatilhos comprovados para cada pessoa.
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <div className="space-y-2">
            {protocolsLoading && <p className="rounded-xl bg-foreground/5 p-4 text-sm text-muted-foreground">Carregando protocolos do banco de dados…</p>}
            {!protocolsLoading && protocolsError && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm">{protocolsError}</p>}
            {!protocolsLoading && !protocolsError && visibleProtocols.length === 0 && <p className="rounded-xl bg-foreground/5 p-4 text-sm text-muted-foreground">Nenhum protocolo encontrado para este filtro.</p>}
            {visibleProtocols.map((protocol) => (
              <button key={protocol.id} onClick={() => setSelectedProtocolId(protocol.id)}
                aria-pressed={selectedProtocolId === protocol.id}
                className={`w-full rounded-xl p-4 text-left transition-colors ${selectedProtocolId === protocol.id ? "bg-primary/10 ring-1 ring-primary/30" : "bg-foreground/5 hover:bg-foreground/10"}`}>
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{protocol.category}</div>
                <div className="mt-1 text-sm font-semibold">{protocol.name}</div>
                <div className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{protocol.summary}</div>
              </button>
            ))}
          </div>

          {selectedProtocol && <Panel className="lg:col-span-2" delay={0.1}>
            <Tag tone="primary">{selectedProtocol.category}</Tag>
            <h3 className="mt-3 font-display text-3xl tracking-tight">{selectedProtocol.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{selectedProtocol.summary}</p>
            <h4 className="mt-6 label-mono">Como aplicar com segurança</h4>
            <ol className="mt-3 space-y-3">
              {selectedProtocol.guidance.map((item, index) => (
                <li key={item} className="flex items-start gap-3 rounded-xl bg-foreground/5 p-3 text-sm leading-relaxed">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-foreground font-mono text-xs text-primary-foreground">{index + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
            <div className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm leading-relaxed">
              <strong className="block text-foreground">Limites e cuidados</strong>
              <span className="mt-1 block text-muted-foreground">{selectedProtocol.caution}</span>
            </div>
            <div className="mt-5">
              <h4 className="label-mono">Fontes consultadas</h4>
              <ul className="mt-2 space-y-2">
                {selectedProtocol.sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                      {source.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>}
        </div>

        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          Procure atendimento imediato diante de vômito com sangue ou aspecto de borra de café, fezes negras, desmaio ou dor intensa. Protocolos de restrição alimentar devem ter objetivo e prazo definidos e, quando possível, acompanhamento de nutricionista.
        </p>
      </section>
    </>
  );
}
