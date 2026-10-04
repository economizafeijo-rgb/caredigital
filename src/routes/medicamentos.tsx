import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { medications as initial, type Medication } from "@/lib/mock-data";
import { Btn, Field, IconBox, PageHeader, Panel, SelectField, Tag, fmtDuration, kindTone, useNow } from "@/components/vigia/ui";

export const Route = createFileRoute("/medicamentos")({
  head: () => ({
    meta: [
      { title: "Medicamentos — Vigia" },
      { name: "description", content: "Cadastro de remédios, naturais e suplementos com horários e timer programável." },
      { property: "og:title", content: "Medicamentos — Vigia" },
      { property: "og:description", content: "Cadastro de remédios, naturais e suplementos com horários e timer programável." },
    ],
  }),
  component: Medicamentos,
});

const kinds = ["Todos", "Medicamento", "Natural", "Suplemento"] as const;

function Medicamentos() {
  const [list, setList] = useState(initial);
  const [filter, setFilter] = useState<(typeof kinds)[number]>("Todos");
  const [form, setForm] = useState({ name: "", dose: "", route: "Via oral", kind: "Medicamento" as Medication["kind"], times: "08:00", stock: 30, notes: "" });

  const shown = list.filter((m) => filter === "Todos" || m.kind === filter);

  return (
    <>
      <PageHeader eyebrow="Remédios, naturais e suplementos" title="Medicamentos">
        {kinds.map((k) => (
          <Btn key={k} variant={filter === k ? "dark" : "ghost"} onClick={() => setFilter(k)}>{k}</Btn>
        ))}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Cadastrados" className="lg:col-span-2" action={<span className="label-mono text-muted-foreground">{shown.length} itens</span>}>
          <div className="divide-y divide-border">
            {shown.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-4 py-4">
                <IconBox tone={kindTone(m.kind)}>{m.name[0]}</IconBox>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{m.name} {m.dose}</span>
                    <Tag tone={kindTone(m.kind)}>{m.kind}</Tag>
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground">{m.route} · {m.notes}</div>
                </div>
                <div className="flex gap-1">
                  {m.times.map((t) => <span key={t} className="rounded-md bg-foreground/5 px-2 py-1 font-mono text-[11px]">{t}</span>)}
                </div>
                <Tag tone={m.stock < 7 ? "destructive" : "muted"}>{m.stock} un.</Tag>
                <Btn variant="danger" onClick={() => setList((l) => l.filter((x) => x.id !== m.id))}>Excluir</Btn>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Cadastrar" delay={0.1}>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.name.trim()) return;
                const times = form.times.split(",").map((t) => t.trim()).filter((t) => /^\d{2}:\d{2}$/.test(t));
                setList((l) => [{ ...form, id: crypto.randomUUID(), times }, ...l]);
                setForm({ ...form, name: "", dose: "", notes: "" });
              }}
            >
              <Field label="Nome"><input className="field" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Dose"><input className="field" maxLength={30} placeholder="500mg" value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} /></Field>
                <Field label="Tipo"><SelectField value={form.kind} onValueChange={(kind) => setForm({ ...form, kind: kind as Medication["kind"] })} options={["Medicamento", "Natural", "Suplemento"].map((value) => ({ value, label: value }))} /></Field>
                <Field label="Via"><SelectField value={form.route} onValueChange={(route) => setForm({ ...form, route })} options={["Via oral", "Sublingual", "Injetável", "Tópica", "Inalatória"].map((value) => ({ value, label: value }))} /></Field>
                <Field label="Estoque"><input type="number" min={0} className="field" value={form.stock} onChange={(e) => setForm({ ...form, stock: +e.target.value })} /></Field>
              </div>
              <Field label="Horários (separe por vírgula)"><input className="field font-mono" placeholder="08:00, 20:00" value={form.times} onChange={(e) => setForm({ ...form, times: e.target.value })} /></Field>
              <Field label="Observações"><input className="field" maxLength={140} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
              <Btn size="lg" type="submit" className="w-full">Salvar</Btn>
            </form>
          </Panel>
          <TimerPanel />
        </div>
      </div>
    </>
  );
}

function TimerPanel() {
  const now = useNow(250);
  const [minutes, setMinutes] = useState(30);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [label, setLabel] = useState("Próxima dose");
  const remaining = endAt && now ? Math.max(0, Math.round((endAt - now.getTime()) / 1000)) : minutes * 60;
  const finished = endAt !== null && remaining === 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-foreground p-6 text-primary-foreground animate-rise">
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/30 blur-3xl" />
      <div className="relative">
        <div className="label-mono text-primary-foreground/60">Timer programável</div>
        <input value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} className="mt-2 w-full bg-transparent text-sm font-semibold outline-none" />
        <div className={`mt-3 font-display text-6xl tabular-nums leading-none ${finished ? "animate-softpulse text-primary" : ""}`}>{fmtDuration(remaining)}</div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[5, 15, 30, 60, 120].map((m) => (
            <Btn key={m} variant={minutes === m ? "primary" : "glass"} onClick={() => { setMinutes(m); setEndAt(null); }}>{m < 60 ? `${m}m` : `${m / 60}h`}</Btn>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Btn variant="primary" size="lg" className="flex-1" onClick={() => setEndAt(Date.now() + minutes * 60000)}>{endAt ? "Reiniciar" : "Iniciar"}</Btn>
          <Btn variant="glass" size="lg" onClick={() => setEndAt(null)}>Parar</Btn>
        </div>
        {finished && <div className="mt-3 label-mono text-primary">Hora de: {label}</div>}
      </div>
    </div>
  );
}
