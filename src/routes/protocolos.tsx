import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { protocols as initial, type Protocol } from "@/lib/mock-data";
import { Btn, Field, Modal, PageHeader, Panel, SelectField, Tag, type ToneKey } from "@/components/vigia/ui";
import { DigestiveProtocolLibrary } from "@/components/vigia/DigestiveProtocolLibrary";

export const Route = createFileRoute("/protocolos")({
  head: () => ({
    meta: [
      { title: "Protocolos — Vigia" },
      { name: "description", content: "Protocolos de tratamento por doença, dieta e suplementação." },
      { property: "og:title", content: "Protocolos — Vigia" },
      { property: "og:description", content: "Protocolos de tratamento por doença, dieta e suplementação." },
    ],
  }),
  component: Protocolos,
});

const typeTone: Record<Protocol["type"], ToneKey> = { Doença: "destructive", Tratamento: "primary", Dieta: "success", Suplementação: "warning" };

function Protocolos() {
  const [list, setList] = useState(initial);
  const [selected, setSelected] = useState(initial[0]!.id);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Doença" as Protocol["type"], summary: "", steps: "" });
  const current = list.find((p) => p.id === selected) ?? list[0];

  return (
    <>
      <PageHeader eyebrow="Doenças, tratamentos e dietas" title="Protocolos">
        <Btn size="lg" onClick={() => setOpen(true)}>+ Novo protocolo</Btn>
      </PageHeader>

      <DigestiveProtocolLibrary />

      <div className="mb-5 mt-12">
        <div className="label-mono text-muted-foreground">Área de demonstração do prontuário</div>
        <h2 className="mt-2 font-display text-3xl tracking-tight md:text-4xl">Protocolos da equipe</h2>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Biblioteca">
          <div className="space-y-2">
            {list.map((p) => (
              <button key={p.id} onClick={() => setSelected(p.id)}
                className={`w-full rounded-xl p-4 text-left transition-colors ${p.id === current?.id ? "bg-primary/10 ring-1 ring-primary/20" : "bg-foreground/5 hover:bg-foreground/10"}`}>
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{p.type}</div>
                <div className="mt-1 text-sm font-semibold">{p.name}</div>
                <div className="mt-2 font-mono text-[11px] text-muted-foreground">{p.steps.length} etapas · {p.patients} paciente(s)</div>
              </button>
            ))}
          </div>
        </Panel>

        {current && (
          <Panel className="lg:col-span-2" delay={0.1}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Tag tone={typeTone[current.type]}>{current.type}</Tag>
                <h2 className="mt-3 font-display text-3xl tracking-tight md:text-4xl">{current.name}</h2>
                <p className="mt-2 max-w-[60ch] text-muted-foreground">{current.summary}</p>
              </div>
              <Btn variant="danger" onClick={() => { setList((l) => l.filter((x) => x.id !== current.id)); setSelected(list[0]?.id ?? ""); }}>Excluir</Btn>
            </div>
            <ol className="mt-6 space-y-3">
              {current.steps.map((s, i) => (
                <li key={i} className="flex items-center gap-4 rounded-xl bg-foreground/5 p-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground font-display text-primary-foreground">{i + 1}</span>
                  <span className="text-sm font-medium">{s}</span>
                </li>
              ))}
            </ol>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[["Etapas", current.steps.length], ["Medicações", current.meds], ["Pacientes", current.patients]].map(([k, v]) => (
                <div key={k} className="rounded-xl ring-1 ring-border p-4">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
                  <div className="font-display text-3xl">{v}</div>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo protocolo">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim()) return;
          const steps = form.steps.split("\n").map((s) => s.trim()).filter(Boolean);
          const p: Protocol = { id: crypto.randomUUID(), name: form.name, type: form.type, summary: form.summary, steps, meds: 0, patients: 0 };
          setList((l) => [p, ...l]); setSelected(p.id); setOpen(false);
          setForm({ name: "", type: "Doença", summary: "", steps: "" });
        }}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome"><input className="field" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Tipo"><SelectField value={form.type} onValueChange={(type) => setForm({ ...form, type: type as Protocol["type"] })} options={Object.keys(typeTone).map((type) => ({ value: type, label: type }))} /></Field>
          </div>
          <Field label="Resumo"><input className="field" maxLength={200} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field>
          <Field label="Etapas (uma por linha)"><textarea rows={5} className="field" maxLength={2000} value={form.steps} onChange={(e) => setForm({ ...form, steps: e.target.value })} /></Field>
          <div className="flex justify-end"><Btn size="lg" type="submit">Salvar protocolo</Btn></div>
        </form>
      </Modal>
    </>
  );
}
