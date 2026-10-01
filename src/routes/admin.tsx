import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { team as initial, initials, patients, medications, protocols, type Member, type Role } from "@/lib/mock-data";
import { Btn, Field, IconBox, PageHeader, Panel, Tag } from "@/components/vigia/ui";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração — Vigia" },
      { name: "description", content: "Crie e gerencie contas de cuidadores, enfermeiros e profissionais de saúde." },
      { property: "og:title", content: "Administração — Vigia" },
      { property: "og:description", content: "Crie e gerencie contas de cuidadores, enfermeiros e profissionais de saúde." },
    ],
  }),
  component: Admin,
});

const roles: Role[] = ["Administrador", "Enfermeiro(a)", "Cuidador(a)", "Médico(a)", "Nutricionista", "Familiar"];

const permissions = [
  { label: "Registrar doses", roles: ["Administrador", "Enfermeiro(a)", "Cuidador(a)"] },
  { label: "Cadastrar medicamentos", roles: ["Administrador", "Enfermeiro(a)", "Médico(a)"] },
  { label: "Editar protocolos", roles: ["Administrador", "Médico(a)"] },
  { label: "Editar dietas", roles: ["Administrador", "Nutricionista"] },
  { label: "Gerenciar contas", roles: ["Administrador"] },
];

function Admin() {
  const [list, setList] = useState(initial);
  const [form, setForm] = useState({ name: "", email: "", role: "Cuidador(a)" as Role });

  const stats = [["Usuários", list.length], ["Pacientes", patients.length], ["Medicamentos", medications.length], ["Protocolos", protocols.length]];

  return (
    <>
      <PageHeader eyebrow="Área do administrador" title="Equipe e acessos" />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(([k, v], i) => (
          <Panel key={k} delay={i * 0.05}>
            <div className="label-mono text-muted-foreground">{k}</div>
            <div className="mt-1 font-display text-5xl">{v}</div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Contas" className="lg:col-span-2" delay={0.1}>
          <div className="divide-y divide-border">
            {list.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-4 py-3">
                <IconBox round tone={m.role === "Administrador" ? "primary" : "muted"}>{initials(m.name)}</IconBox>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{m.name}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{m.email} · {m.patients} paciente(s)</div>
                </div>
                <select className="field w-40" value={m.role}
                  onChange={(e) => setList((l) => l.map((x) => (x.id === m.id ? { ...x, role: e.target.value as Role } : x)))}>
                  {roles.map((r) => <option key={r}>{r}</option>)}
                </select>
                <button onClick={() => setList((l) => l.map((x) => (x.id === m.id ? { ...x, active: !x.active } : x)))}>
                  <Tag tone={m.active ? "success" : "muted"}>{m.active ? "Ativo" : "Inativo"}</Tag>
                </button>
                <Btn variant="danger" onClick={() => setList((l) => l.filter((x) => x.id !== m.id))}>Remover</Btn>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Criar conta" delay={0.15}>
            <form className="space-y-3" onSubmit={(e) => {
              e.preventDefault();
              if (!form.name.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) return;
              const m: Member = { ...form, id: crypto.randomUUID(), patients: 0, active: true };
              setList((l) => [m, ...l]);
              setForm({ name: "", email: "", role: "Cuidador(a)" });
            }}>
              <Field label="Nome"><input className="field" required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="E-mail"><input type="email" className="field" required maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label="Função"><select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>{roles.map((r) => <option key={r}>{r}</option>)}</select></Field>
              <Btn size="lg" type="submit" className="w-full">Enviar convite</Btn>
            </form>
          </Panel>

          <Panel title="Permissões" delay={0.2}>
            <div className="space-y-3">
              {permissions.map((p) => (
                <div key={p.label}>
                  <div className="text-sm font-semibold">{p.label}</div>
                  <div className="mt-1 font-mono text-[11px] text-muted-foreground">{p.roles.join(" · ")}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
