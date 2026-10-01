import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { patients as initial, protocols, diets, team, initials, type Patient } from "@/lib/mock-data";
import { Btn, Field, IconBox, Modal, PageHeader, Panel, Tag } from "@/components/vigia/ui";

export const Route = createFileRoute("/pacientes")({
  head: () => ({
    meta: [
      { title: "Pacientes — Vigia" },
      { name: "description", content: "Cadastro de pacientes, condições, protocolos e cuidadores responsáveis." },
      { property: "og:title", content: "Pacientes — Vigia" },
      { property: "og:description", content: "Cadastro de pacientes, condições, protocolos e cuidadores responsáveis." },
    ],
  }),
  component: Pacientes,
});

const statusTone = { Estável: "success", Atenção: "warning", Crítico: "destructive" } as const;

function Pacientes() {
  const [list, setList] = useState(initial);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<Patient, "id">>({
    name: "", age: 60, condition: "", protocol: protocols[0].name, diet: diets[0].name, caregiver: team[2].name, status: "Estável",
  });

  const filtered = list.filter((p) => (p.name + p.condition).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader eyebrow="Pessoas sob cuidado" title="Pacientes">
        <input className="field w-56" placeholder="Buscar paciente…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Btn size="lg" onClick={() => setOpen(true)}>+ Novo paciente</Btn>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2">
        {filtered.map((p, i) => (
          <Panel key={p.id} delay={i * 0.05}>
            <div className="flex items-start gap-4">
              <IconBox round tone="primary">{initials(p.name)}</IconBox>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-2xl tracking-tight">{p.name}</h3>
                  <Tag tone={statusTone[p.status]}>{p.status}</Tag>
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">{p.condition} · {p.age} anos</div>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-2">
              {[["Protocolo", p.protocol], ["Dieta", p.diet], ["Cuidador", p.caregiver]].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-foreground/5 p-3">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{k}</dt>
                  <dd className="mt-1 truncate text-sm font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex gap-2">
              <Btn variant="ghost">Ver prontuário</Btn>
              <Btn variant="danger" onClick={() => setList((l) => l.filter((x) => x.id !== p.id))}>Remover</Btn>
            </div>
          </Panel>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo paciente">
        <form
          className="grid grid-cols-2 gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) return;
            setList((l) => [{ ...form, id: crypto.randomUUID() }, ...l]);
            setOpen(false);
          }}
        >
          <div className="col-span-2"><Field label="Nome completo"><input className="field" required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field></div>
          <Field label="Idade"><input type="number" min={0} max={130} className="field" value={form.age} onChange={(e) => setForm({ ...form, age: +e.target.value })} /></Field>
          <Field label="Condição"><input className="field" maxLength={80} value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} /></Field>
          <Field label="Protocolo"><select className="field" value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value })}>{protocols.map((p) => <option key={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Dieta"><select className="field" value={form.diet} onChange={(e) => setForm({ ...form, diet: e.target.value })}>{diets.map((d) => <option key={d.id}>{d.name}</option>)}</select></Field>
          <Field label="Cuidador"><select className="field" value={form.caregiver} onChange={(e) => setForm({ ...form, caregiver: e.target.value })}>{team.map((m) => <option key={m.id}>{m.name}</option>)}</select></Field>
          <Field label="Status"><select className="field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Patient["status"] })}><option>Estável</option><option>Atenção</option><option>Crítico</option></select></Field>
          <div className="col-span-2 flex justify-end"><Btn size="lg" type="submit">Salvar paciente</Btn></div>
        </form>
      </Modal>
    </>
  );
}
