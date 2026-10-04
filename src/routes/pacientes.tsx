import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, UserRound, UserRoundPlus } from "lucide-react";
import { Btn, Field, IconBox, Modal, PageHeader, Panel, SelectField, Tag } from "@/components/vigia/ui";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { calculateBodyMetrics, clientGoals, clientTypes, type SexForReference } from "@/lib/health-metrics";
import { getProfessionalSession, isSupabaseConfigured, type ProfessionalProfile } from "@/lib/supabase-session";

export const Route = createFileRoute("/pacientes")({
  head: () => ({
    meta: [
      { title: "Clientes — DigitalCare" },
      { name: "description", content: "Cadastro profissional com medidas corporais, objetivos e acompanhamento de clientes." },
    ],
  }),
  component: Clientes,
});

type ClientRow = Tables<"care_clients">;
type ClientForm = {
  display_name: string;
  client_type: string;
  age_years: string;
  sex_for_reference: SexForReference;
  height_cm: string;
  weight_kg: string;
  goal: string;
  condition_summary: string;
  hydration_target_ml: string;
};

const emptyForm: ClientForm = {
  display_name: "", client_type: "patient", age_years: "", sex_for_reference: "unspecified",
  height_cm: "", weight_kg: "", goal: "maintenance", condition_summary: "", hydration_target_ml: "",
};

const sexOptions = [
  { value: "female", label: "Feminino" },
  { value: "male", label: "Masculino" },
  { value: "intersex", label: "Intersexo" },
  { value: "unspecified", label: "Prefere não informar" },
];

const goalLabel = (value: string) => clientGoals.find((goal) => goal.value === value)?.label ?? value;

function asNumber(value: string) { return value.trim() === "" ? null : Number(value); }
function formFromRow(row: ClientRow): ClientForm {
  return {
    display_name: row.display_name, client_type: row.client_type, age_years: row.age_years?.toString() ?? "",
    sex_for_reference: row.sex_for_reference as SexForReference, height_cm: row.height_cm?.toString() ?? "",
    weight_kg: row.weight_kg?.toString() ?? "", goal: row.goal, condition_summary: row.condition_summary,
    hydration_target_ml: row.hydration_target_ml?.toString() ?? "",
  };
}

function Clientes() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!isSupabaseConfigured()) { setMessage("Conecte o projeto Supabase e aplique a migração de gestão de clientes."); setLoading(false); return; }
      try {
        const session = await getProfessionalSession();
        if (!session.user || !session.profile) { setMessage("Entre com uma conta da equipe para acessar os cadastros protegidos."); setLoading(false); return; }
        if (!session.profile.is_active) { setMessage("Esta conta está suspensa. Fale com o administrador da plataforma."); setLoading(false); return; }
        const { data, error } = await supabase.from("care_clients").select("*").order("updated_at", { ascending: false });
        if (error) throw error;
        if (active) { setProfile(session.profile); setClients(data ?? []); }
      } catch { if (active) setMessage("Não foi possível carregar os clientes. Verifique sua sessão e as políticas de acesso do banco."); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => clients.filter((client) =>
    `${client.display_name} ${client.condition_summary} ${client.goal}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  ), [clients, search]);

  const openNew = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (client: ClientRow) => { setEditingId(client.id); setForm(formFromRow(client)); setDialogOpen(true); };

  const saveClient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;
    setSaving(true); setMessage("");
    const data = {
      display_name: form.display_name.trim(),
      client_type: form.client_type,
      age_years: asNumber(form.age_years),
      sex_for_reference: form.sex_for_reference,
      height_cm: asNumber(form.height_cm),
      weight_kg: asNumber(form.weight_kg),
      goal: form.goal,
      condition_summary: form.condition_summary.trim(),
      hydration_target_ml: asNumber(form.hydration_target_ml),
    };
    const result = editingId
      ? await supabase.from("care_clients").update(data).eq("id", editingId).select().single()
      : await supabase.from("care_clients").insert({ ...data, assigned_professional_id: profile.user_id, created_by: profile.user_id }).select().single();
    setSaving(false);
    if (result.error) { setMessage(`Não foi possível salvar. ${result.error.message}`); return; }
    setClients((list) => editingId ? list.map((item) => item.id === editingId ? result.data : item) : [result.data, ...list]);
    setDialogOpen(false); setMessage(editingId ? "Cadastro atualizado no banco com segurança." : "Cliente cadastrado e salvo no banco.");
  };

  const removeClient = async (client: ClientRow) => {
    if (!window.confirm(`Remover o cadastro de ${client.display_name}?`)) return;
    const { error } = await supabase.from("care_clients").delete().eq("id", client.id);
    if (error) { setMessage("Não foi possível remover este cadastro."); return; }
    setClients((list) => list.filter((item) => item.id !== client.id));
    setMessage("Cadastro removido.");
  };

  return <>
    <PageHeader eyebrow="Espaço de acompanhamento profissional" title="Clientes">
      <label className="relative min-w-48 flex-1 sm:flex-none"><span className="sr-only">Buscar cliente</span><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input className="field pl-9" placeholder="Buscar cliente…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      {profile?.is_active && <Btn size="lg" onClick={openNew}><Plus size={17} /> Novo cadastro</Btn>}
    </PageHeader>

    {message && <div role="status" className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">{message}{!profile && isSupabaseConfigured() && <Link to="/entrar" className="ml-2 font-semibold text-primary underline underline-offset-4">Entrar</Link>}</div>}
    {loading && <Panel><p className="text-sm text-muted-foreground">Carregando cadastros protegidos…</p></Panel>}
    {!loading && profile && <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground"><UserRound size={15} />{profile.role === "platform_admin" ? "Visão de administrador: todos os profissionais" : `Atribuídos a ${profile.display_name}`}<span className="ml-auto">{filtered.length} cadastro(s)</span></div>}

    {!loading && profile && filtered.length === 0 && <Panel title="Sua lista está pronta"><p className="text-sm text-muted-foreground">{clients.length ? "Nenhum resultado para esta busca." : "Cadastre uma pessoa para acompanhar medidas, objetivo e orientações individuais."}</p>{clients.length === 0 && <Btn size="lg" onClick={openNew} className="mt-4"><UserRoundPlus size={16} /> Cadastrar primeiro cliente</Btn>}</Panel>}

    <div className="grid gap-3 md:grid-cols-2">
      {filtered.map((client) => {
        const metrics = calculateBodyMetrics({ ageYears: client.age_years, heightCm: client.height_cm, weightKg: client.weight_kg, sex: client.sex_for_reference as SexForReference });
        const clientType = clientTypes.find((type) => type.value === client.client_type)?.label ?? "Cliente";
        return <Panel key={client.id}>
          <div className="flex items-start gap-3"><IconBox round tone="primary">{client.display_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</IconBox><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="truncate font-display text-2xl tracking-tight">{client.display_name}</h2><Tag tone={client.client_type === "fitness" ? "primary" : "muted"}>{clientType}</Tag></div><p className="mt-1 text-xs text-muted-foreground">{client.age_years ? `${client.age_years} anos` : "Idade não informada"} · {goalLabel(client.goal)}</p></div></div>
          <dl className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-foreground/5 p-3"><dt className="label-mono text-[9px] text-muted-foreground">Altura</dt><dd className="mt-1 text-sm font-semibold">{client.height_cm ? `${client.height_cm} cm` : "—"}</dd></div>
            <div className="rounded-lg bg-foreground/5 p-3"><dt className="label-mono text-[9px] text-muted-foreground">Peso</dt><dd className="mt-1 text-sm font-semibold">{client.weight_kg ? `${client.weight_kg} kg` : "—"}</dd></div>
            <div className="rounded-lg bg-foreground/5 p-3"><dt className="label-mono text-[9px] text-muted-foreground">IMC* adulto</dt><dd className="mt-1 text-sm font-semibold">{metrics.bmi ?? "—"}</dd></div>
          </dl>
          {metrics.bmiLabel && <p className="mt-2 text-xs text-muted-foreground">{metrics.bmiLabel} · ferramenta de triagem, não diagnóstico.</p>}
          {metrics.waterReferenceMl && <p className="mt-2 text-xs text-muted-foreground">Referência populacional de água total: {(metrics.waterReferenceMl / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L/dia, incluindo alimentos e outras bebidas. Não é uma meta individual de água pura.</p>}
          {client.hydration_target_ml && <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 rounded-full bg-sky" />Meta de água definida pela equipe: {client.hydration_target_ml.toLocaleString("pt-BR")} ml/dia</p>}
          {client.condition_summary && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{client.condition_summary}</p>}
          <div className="mt-4 flex flex-wrap gap-2"><Btn variant="ghost" onClick={() => openEdit(client)}><Pencil size={14} /> Editar ficha</Btn><Btn variant="danger" onClick={() => void removeClient(client)}>Remover</Btn></div>
        </Panel>;
      })}
    </div>

    <p className="mt-5 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-muted-foreground">* IMC é calculado apenas para adultos a partir de 20 anos e serve como triagem, não mede diretamente gordura corporal nem substitui avaliação profissional. Para crianças e adolescentes, gestação, atletas e condições clínicas, a interpretação deve ser individualizada. <a href="https://www.cdc.gov/bmi/faq/" target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">CDC · limites do IMC</a>. Referências populacionais de água total variam por sexo, idade, clima e atividade; não são prescrições de água pura nem dependem apenas do objetivo físico. <a href="https://www.nationalacademies.org/read/10925/chapter/2" target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">National Academies</a>.</p>

    <Modal open={dialogOpen} onClose={() => setDialogOpen(false)} title={editingId ? "Editar cadastro" : "Novo cliente"}>
      <form className="max-h-[78vh] space-y-4 overflow-y-auto pr-1" onSubmit={(event) => void saveClient(event)}>
        <Field label="Nome da pessoa"><input className="field" required maxLength={120} value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo de acompanhamento"><SelectField value={form.client_type} onValueChange={(client_type) => setForm({ ...form, client_type })} options={[...clientTypes]} /></Field>
          <Field label="Objetivo atual"><SelectField value={form.goal} onValueChange={(goal) => setForm({ ...form, goal })} options={[...clientGoals]} /></Field>
          <Field label="Idade (anos)"><input type="number" min="0" max="130" inputMode="numeric" className="field" placeholder="Ex.: 34" value={form.age_years} onChange={(event) => setForm({ ...form, age_years: event.target.value })} /></Field>
          <Field label="Referência demográfica"><SelectField value={form.sex_for_reference} onValueChange={(sex_for_reference) => setForm({ ...form, sex_for_reference: sex_for_reference as SexForReference })} options={sexOptions} /></Field>
          <Field label="Altura (cm)"><input type="number" min="80" max="250" step="0.1" inputMode="decimal" className="field" placeholder="Ex.: 168" value={form.height_cm} onChange={(event) => setForm({ ...form, height_cm: event.target.value })} /></Field>
          <Field label="Peso (kg)"><input type="number" min="20" max="400" step="0.1" inputMode="decimal" className="field" placeholder="Ex.: 72,5" value={form.weight_kg} onChange={(event) => setForm({ ...form, weight_kg: event.target.value })} /></Field>
        </div>
        <Field label="Condição ou observações relevantes (opcional)"><textarea rows={3} maxLength={1000} className="field" value={form.condition_summary} onChange={(event) => setForm({ ...form, condition_summary: event.target.value })} /></Field>
        <Field label="Meta diária de água definida pela equipe (ml, opcional)"><input type="number" min="250" max="6000" step="50" inputMode="numeric" className="field" placeholder="Deixe em branco até avaliar" value={form.hydration_target_ml} onChange={(event) => setForm({ ...form, hydration_target_ml: event.target.value })} /></Field>
        <p className="rounded-lg bg-foreground/5 p-3 text-xs leading-relaxed text-muted-foreground">O objetivo ajuda a organizar o acompanhamento; não gera dieta, diagnóstico, dose ou meta de hidratação automática. A meta de água deve ser individualizada, especialmente em doença renal ou cardíaca, gestação, uso de medicamentos e exercício no calor.</p>
        <div className="flex justify-end gap-2"><Btn type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Btn><Btn type="submit" size="lg" disabled={saving}>{saving ? "Salvando…" : "Salvar ficha"}</Btn></div>
      </form>
    </Modal>
  </>;
}
