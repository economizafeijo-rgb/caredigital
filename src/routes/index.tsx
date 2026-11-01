import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClientHomeSummary } from "@/components/vigia/ClientHomeSummary";
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
  const [accessMode, setAccessMode] = useState<"loading" | "client" | "unlinked" | "public" | "admin">("loading");
  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) { setAccessMode("public"); return; }
      if ((data.user.email ?? "").trim().toLowerCase() === "francdenisbr@gmail.com") { setAccessMode("admin"); return; }
      const { data: links, error } = await (supabase as any).from("care_patient_access").select("patient_id").eq("user_id",data.user.id).limit(1);
      if (!active) return;
      if (!error && links?.length) { setAccessMode("client"); return; }
      const owned = await (supabase as any).from("care_patients").select("id").eq("owner_id", data.user.id).limit(1);
      if (active) setAccessMode(!owned.error && owned.data?.length ? "client" : "unlinked");
    };
    void check();
    const { data: listener } = supabase.auth.onAuthStateChange(() => { void check(); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  const canManage = accessMode === "admin";
  const now = useNow();
  const [doses, setDoses] = useState(initialDoses);
  const [snoozed, setSnoozed] = useState<Record<string, number>>({});
  const [doseFilter, setDoseFilter] = useState<"Todas" | "Pendentes" | "Concluídas">("Todas");
  const [patientFilter, setPatientFilter] = useState("Todos");
  const [lastConfirmed, setLastConfirmed] = useState<string | null>(null);

  const pending = doses.filter((d) => !d.done);
  const withSecs = now
    ? pending.map((d) => {
        const remaining = secondsUntil(now, d.time) + (snoozed[d.id] ?? 0) * 60;
        return { d, s: remaining < 0 ? remaining + 86400 : remaining, tomorrow: remaining < 0 };
      }).sort((a, b) => a.s - b.s)
    : [];
  const next = withSecs[0];
  const doneCount = doses.length - pending.length;
  const adherence = doses.length ? Math.round((doneCount / doses.length) * 100) : 0;
  const visibleDoses = doses.filter((d) => (patientFilter === "Todos" || d.patient === patientFilter) && (doseFilter === "Todas" || (doseFilter === "Pendentes" ? !d.done : !!d.done)));

  const confirm = (id: string) => {
    if (!canManage) return;
    const t = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setDoses((ds) => ds.map((d) => (d.id === id ? { ...d, done: t } : d)));
    setLastConfirmed(id);
  };

  if (accessMode === "loading") return <div role="status" className="rounded-2xl bg-white/80 p-8 text-sm text-muted-foreground">Verificando acesso ao seu painel…</div>;
  if (accessMode === "unlinked") return <section className="mx-auto max-w-3xl rounded-3xl border border-[#b8d2df] bg-white p-6"><h1 className="text-2xl font-bold">Área do cliente</h1><p className="mt-3 text-sm text-muted-foreground">Sua conta está conectada, mas nenhum prontuário foi localizado para este acesso. Solicite ao administrador a vinculação do seu cadastro.</p></section>;
  return (
    <>
      {accessMode === "client" && <ClientHomeSummary />}
      {accessMode !== "client" && !canManage && <div role="status" className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">Visualização pública: nenhuma informação pode ser alterada sem acesso de administrador. <Link to="/entrar" className="font-semibold text-primary underline">Entrar</Link></div>}
      {accessMode !== "client" && <div role="note" className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#abc8d7] bg-[#e0ecf3] px-4 py-3 text-xs text-[#25465c]"><strong>Visão demonstrativa</strong><span>Os indicadores desta página são ilustrativos. Para consultar o acompanhamento real, acesse o prontuário.</span></div>}
      {accessMode !== "client" && <>
      <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-[#9ac1d1]/30 bg-[#102f4d] bg-cover bg-center px-5 py-4 text-white shadow-[0_22px_65px_-32px_rgba(15,51,75,.75)] sm:px-7 sm:py-5 md:px-8 md:py-6" style={{ backgroundImage: "linear-gradient(105deg, rgba(12,38,62,.98) 0%, rgba(18,62,87,.95) 48%, rgba(21,86,106,.58) 100%), url('/images/caredigital-care-hero.webp')" }}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-16 -top-24 size-[360px] rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute -bottom-24 left-1/4 size-[300px] rounded-full bg-sky/20 blur-3xl" />
        </div>
        <div className="relative grid items-center gap-3 md:gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="animate-rise">
            <div className="label-mono text-sky-200/90">CAREDIGITAL · CUIDADO E TECNOLOGIA</div>
            <h1 className="mt-1 max-w-[16ch] text-balance font-display text-3xl leading-[1.02] tracking-tight sm:mt-2 sm:text-4xl md:text-5xl">
              Próximas doses,
              <br />
              sob controle.
            </h1>
            <p className="mt-2 hidden max-w-[54ch] text-pretty text-xs text-primary-foreground/75 sm:block sm:text-sm">
              Acompanhe a agenda, a hidratação e a evolução do cuidado em um único lugar, com informações organizadas e acesso ao prontuário.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
              <Link to="/prontuario"><Btn variant="primary">Abrir prontuário</Btn></Link>
              <Link to="/protocolos"><Btn variant="glass">Protocolos</Btn></Link>
              <Link to="/dietas"><Btn variant="glass">Alimentação</Btn></Link>
            </div>
          </div>
          <div className="animate-rise" style={{ animationDelay: "0.1s" }}>
            <div className="rounded-2xl border border-white/20 bg-[#123f59]/75 p-3 text-white shadow-xl backdrop-blur-xl md:p-4">
              <div className="flex items-center justify-between">
                <span className="label-mono text-primary-foreground/60">Próxima dose</span>
                <span className="font-mono text-[11px] text-primary-foreground/60">{next?.d.patient ?? "—"}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <div className={`font-display text-4xl leading-none tabular-nums md:text-5xl ${next && next.s < 0 ? "text-destructive" : ""}`}>
                  {next ? fmtDuration(Math.max(0, next.s)) : "--:--:--"}
                </div>
                <div className="pb-1">
                  <div className="text-sm font-semibold">{next?.d.name ?? "Tudo em dia"}</div>
                  <div className="font-mono text-[11px] text-primary-foreground/60">
                    {next ? `${next.d.route} · ${next.d.time} · ${next.tomorrow ? "amanhã" : "hoje"}` : ""}
                  </div>
                </div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-primary-foreground/15">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${adherence}%` }} />
              </div>
              {next && (
                <div className="mt-4 flex gap-2">
                  {canManage && <Btn variant="primary" onClick={() => confirm(next.d.id)}>Confirmar dose</Btn>}
                  {canManage && <Btn variant="glass" onClick={() => setSnoozed((s) => ({ ...s, [next.d.id]: (s[next.d.id] ?? 0) + 15 }))}>Adiar 15 min</Btn>}
                </div>
              )}
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[["Hoje", doses.length], ["Pendentes", pending.length], ["Adesão", `${adherence}%`]].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-primary-foreground/10 p-2.5">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-primary-foreground/50">{k}</div>
                    <div className="font-display text-2xl">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>



      <section className="mt-5 grid grid-cols-1 gap-4 md:mt-6 md:gap-5 lg:grid-cols-3">
        <Panel title="Doses de hoje" className="lg:col-span-2" delay={0.15}
          action={<span className="label-mono text-muted-foreground">{visibleDoses.length} exibidas</span>}>
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl bg-foreground/5 p-3">
            <label className="flex min-w-36 flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">Status
              <select className="field" value={doseFilter} onChange={(e) => setDoseFilter(e.target.value as typeof doseFilter)}>
                <option>Todas</option><option>Pendentes</option><option>Concluídas</option>
              </select>
            </label>
            <label className="flex min-w-36 flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">Paciente
              <select className="field" value={patientFilter} onChange={(e) => setPatientFilter(e.target.value)}>
                <option value="Todos">Todos os pacientes</option>
                {Array.from(new Set(doses.map((d) => d.patient))).map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            {(doseFilter !== "Todas" || patientFilter !== "Todos") && <Btn variant="ghost" onClick={() => { setDoseFilter("Todas"); setPatientFilter("Todos"); }}>Limpar filtros</Btn>}
          </div>
          {lastConfirmed && <div role="status" className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-success/30 bg-success/10 p-3 text-xs"><span>Dose confirmada nesta demonstração.</span><Btn variant="ghost" disabled={!canManage} onClick={() => { if (!canManage) return; setDoses((ds) => ds.map((d) => d.id === lastConfirmed ? { ...d, done: undefined } : d)); setLastConfirmed(null); }}>Desfazer</Btn></div>}
          <div className="divide-y divide-border">
            {visibleDoses.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma dose encontrada para os filtros selecionados.</p>}
            {visibleDoses.map((d) => {
              const s = now ? secondsUntil(now, d.time) + (snoozed[d.id] ?? 0) * 60 : null;
              return (
                <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-foreground/5 sm:flex-nowrap">
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
                      {canManage ? <Btn onClick={() => confirm(d.id)}>Confirmar</Btn> : <span title="Somente o administrador pode confirmar dados da demonstração" className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">Somente leitura</span>}
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
          action={canManage ? <Link to="/protocolos"><Btn>+ Novo</Btn></Link> : undefined}>
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

        <Panel title="Equipe" delay={0.3} action={canManage ? <Link to="/admin"><Btn>+ Conta</Btn></Link> : undefined}>
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
      </>}
    </>
  );
}
