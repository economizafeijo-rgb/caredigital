import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { doses as initialDoses, patients, protocols, team, initials } from "@/lib/mock-data";
import { Btn, IconBox, Panel, Tag, fmtDuration, kindTone, secondsUntil, useNow } from "@/components/vigia/ui";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel — Vigia" },
      { name: "description", content: "Próximas doses, timer programável e visão geral dos pacientes." },
      { property: "og:title", content: "Painel — Vigia" },
      { property: "og:description", content: "Próximas doses, timer programável e visão geral dos pacientes." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const now = useNow();
  const [doses, setDoses] = useState(initialDoses);
  const [snoozed, setSnoozed] = useState<Record<string, number>>({});

  const pending = doses.filter((d) => !d.done);
  const withSecs = now
    ? pending.map((d) => ({ d, s: secondsUntil(now, d.time) + (snoozed[d.id] ?? 0) * 60 })).sort((a, b) => a.s - b.s)
    : [];
  const next = withSecs.find((x) => x.s > -1800) ?? withSecs[0];
  const doneCount = doses.length - pending.length;
  const adherence = Math.round((doneCount / doses.length) * 100);

  const confirm = (id: string) => {
    const t = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setDoses((ds) => ds.map((d) => (d.id === id ? { ...d, done: t } : d)));
  };

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-foreground p-8 text-primary-foreground md:p-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-16 -top-24 size-[360px] rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute -bottom-24 left-1/4 size-[300px] rounded-full bg-sky/20 blur-3xl" />
          <div className="absolute inset-y-0 w-24 animate-sweep bg-primary-foreground/10" />
        </div>
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="animate-rise">
            <div className="label-mono text-primary-foreground/60">Painel do cuidador</div>
            <h1 className="mt-4 text-balance font-display text-5xl leading-[0.95] tracking-tight md:text-6xl">
              Próximas doses,
              <br />
              sob controle.
            </h1>
            <p className="mt-4 max-w-[46ch] text-pretty text-primary-foreground/70">
              Timer programável, protocolos por doença e dietas — tudo em um prontuário que não deixa nada passar.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/protocolos"><Btn variant="primary" size="lg">Ver protocolos digestivos</Btn></Link>
              <Link to="/dietas"><Btn variant="glass" size="lg">Ver dietas</Btn></Link>
              <Link to="/nutricao-esportiva"><Btn variant="glass" size="lg">Nutrição esportiva</Btn></Link>
            </div>
          </div>
          <div className="animate-rise" style={{ animationDelay: "0.1s" }}>
            <div className="rounded-2xl bg-primary-foreground/10 p-6 ring-1 ring-primary-foreground/15 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="label-mono text-primary-foreground/60">Próxima dose</span>
                <span className="font-mono text-[11px] text-primary-foreground/60">{next?.d.patient ?? "—"}</span>
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-4">
                <div className={`font-display text-6xl leading-none tabular-nums ${next && next.s < 0 ? "text-destructive" : ""}`}>
                  {next ? (next.s < 0 ? "-" : "") + fmtDuration(Math.abs(next.s)) : "--:--:--"}
                </div>
                <div className="pb-1">
                  <div className="text-sm font-semibold">{next?.d.name ?? "Tudo em dia"}</div>
                  <div className="font-mono text-[11px] text-primary-foreground/60">
                    {next ? `${next.d.route} · ${next.d.time}` : ""}
                  </div>
                </div>
              </div>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-primary-foreground/15">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${adherence}%` }} />
              </div>
              {next && (
                <div className="mt-4 flex gap-2">
                  <Btn variant="primary" onClick={() => confirm(next.d.id)}>Confirmar dose</Btn>
                  <Btn variant="glass" onClick={() => setSnoozed((s) => ({ ...s, [next.d.id]: (s[next.d.id] ?? 0) + 15 }))}>Adiar 15 min</Btn>
                </div>
              )}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[["Hoje", doses.length], ["Pendentes", pending.length], ["Adesão", `${adherence}%`]].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-primary-foreground/10 p-3">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-primary-foreground/50">{k}</div>
                    <div className="font-display text-2xl">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <Panel title="Doses de hoje" className="lg:col-span-2" delay={0.15}
          action={<span className="label-mono text-muted-foreground">{doses.length} programadas</span>}>
          <div className="divide-y divide-border">
            {doses.map((d) => {
              const s = now ? secondsUntil(now, d.time) + (snoozed[d.id] ?? 0) * 60 : null;
              return (
                <div key={d.id} className="flex items-center gap-4 py-3">
                  <IconBox tone={kindTone(d.kind)}>{d.name[0]}</IconBox>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{d.name}</div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">{d.route} · {d.time} · {d.patient}</div>
                  </div>
                  {d.done ? (
                    <>
                      <div className="hidden font-mono text-[11px] text-muted-foreground sm:block">feito {d.done}</div>
                      <Tag tone="success">Feito</Tag>
                    </>
                  ) : (
                    <>
                      <div className={`hidden font-mono text-[11px] tabular-nums sm:block ${s !== null && s < 0 ? "text-destructive" : "text-primary"}`}>
                        {s === null ? "--:--:--" : s < 0 ? `atrasado ${fmtDuration(-s)}` : fmtDuration(s)}
                      </div>
                      <Btn onClick={() => confirm(d.id)}>Confirmar</Btn>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Pacientes" delay={0.2} action={<Link to="/pacientes" className="label-mono text-muted-foreground hover:text-foreground">Ver todos</Link>}>
          <div className="space-y-2">
            {patients.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${i === 0 ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-foreground/5"}`}>
                <IconBox round tone={i === 0 ? "primary" : "muted"}>{initials(p.name)}</IconBox>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{p.condition} · {p.age}a</div>
                </div>
                <span className={`size-2 rounded-full ${p.status === "Crítico" ? "bg-destructive" : p.status === "Atenção" ? "bg-warning" : "bg-success"}`} />
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Protocolos ativos" className="lg:col-span-2" delay={0.25}
          action={<Link to="/protocolos"><Btn>+ Novo</Btn></Link>}>
          <div className="grid gap-3 sm:grid-cols-2">
            {protocols.map((p) => (
              <div key={p.id} className="rounded-xl bg-foreground/5 p-4">
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{p.type}</div>
                <div className="mt-1 text-sm font-semibold">{p.name}</div>
                <div className="mt-3 font-mono text-[11px] text-muted-foreground">{p.steps.length} etapas · {p.patients} paciente(s)</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Equipe" delay={0.3} action={<Link to="/admin"><Btn>+ Conta</Btn></Link>}>
          <div className="space-y-3">
            {team.slice(0, 4).map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <IconBox round tone="muted">{initials(m.name)}</IconBox>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{m.name}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{m.role}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </>
  );
}
