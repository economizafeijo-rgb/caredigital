import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BadgeCheck, BarChart3, CalendarClock, Download, FileText, KeyRound, Pencil, Plus, Search, ShieldAlert,
  ShieldCheck, Trash2, UserPlus, Users, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Client = {
  id: string; full_name: string; birth_date: string | null; condition_notes: string | null; status: string | null;
  contact_email: string | null; phone?: string | null; weight_kg: number | null; height_cm: number | null; care_goal: string | null;
  license_plan?: string | null; license_status?: string | null; license_expires_on?: string | null; created_at?: string;
};
type Report = { total: number; done: number; meds: number; medsDone: number; waterMl: number; last: string | null };
const db = supabase as any;
const plans = { basico: "Básico", premium: "Premium", profissional: "Profissional" } as Record<string, string>;
const statusStyle: Record<string, string> = {
  ativa: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", teste: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  suspensa: "bg-amber-500/15 text-amber-700 dark:text-amber-300", expirada: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};
const goals = { equilibrio: "Manter peso", emagrecimento: "Emagrecimento", ganho_peso: "Ganhar peso", hipertrofia: "Hipertrofia" } as Record<string, string>;
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
export const effectiveLicense = (c: Pick<Client, "license_status" | "license_expires_on">) =>
  c.license_status === "ativa" && c.license_expires_on && c.license_expires_on < today() ? "expirada" : (c.license_status ?? "ativa");

export function AdminClientManager({ ownerId }: { ownerId: string }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [licenseColumns, setLicenseColumns] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("todos");
  const [editing, setEditing] = useState<Partial<Client> | null>(null);
  const [report, setReport] = useState<{ client: Client; data: Report | null } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    void (async () => {
      const full = await db.from("care_patients").select("id,full_name,birth_date,condition_notes,status,contact_email,phone,weight_kg,height_cm,care_goal,license_plan,license_status,license_expires_on,created_at").eq("owner_id", ownerId).order("created_at", { ascending: false });
      if (!full.error) { setLicenseColumns(true); setClients(full.data ?? []); return; }
      const basic = await db.from("care_patients").select("id,full_name,birth_date,condition_notes,status,contact_email,weight_kg,height_cm,care_goal,created_at").eq("owner_id", ownerId).order("created_at", { ascending: false });
      setLicenseColumns(false); setClients(basic.data ?? []);
    })();
  }, [ownerId, reload]);

  const stats = useMemo(() => {
    const lic = clients.map(effectiveLicense);
    return { total: clients.length, ativa: lic.filter(s => s === "ativa").length, teste: lic.filter(s => s === "teste").length,
      alerta: lic.filter(s => s === "suspensa" || s === "expirada").length,
      vencendo: clients.filter(c => c.license_expires_on && c.license_expires_on >= today() && c.license_expires_on <= plusDays(7)).length };
  }, [clients]);
  const shown = clients.filter(c => (filter === "todos" || effectiveLicense(c) === filter)
    && (!query.trim() || `${c.full_name} ${c.contact_email ?? ""} ${c.phone ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())));

  async function save() {
    if (!editing) return;
    const name = (editing.full_name ?? "").trim();
    if (name.length < 3) return setMessage({ ok: false, text: "Informe o nome completo do cliente." });
    const num = (v: unknown) => v === "" || v === null || v === undefined ? null : Number(v);
    const row: Record<string, unknown> = {
      full_name: name, birth_date: editing.birth_date || null, condition_notes: editing.condition_notes?.trim() || null,
      contact_email: editing.contact_email?.trim().toLowerCase() || null, weight_kg: num(editing.weight_kg), height_cm: num(editing.height_cm),
      care_goal: editing.care_goal || null,
    };
    if (licenseColumns) Object.assign(row, { phone: editing.phone?.trim() || null, license_plan: editing.license_plan ?? "basico",
      license_status: editing.license_status ?? "ativa", license_expires_on: editing.license_expires_on || null });
    const result = editing.id ? await db.from("care_patients").update(row).eq("id", editing.id).eq("owner_id", ownerId)
      : await db.from("care_patients").insert({ ...row, owner_id: ownerId });
    if (result.error) return setMessage({ ok: false, text: "Não foi possível salvar: " + result.error.message });
    setMessage({ ok: true, text: editing.id ? `Cadastro de ${name} atualizado.` : `${name} cadastrado com sucesso.` });
    setEditing(null); setReload(v => v + 1);
  }

  async function setLicense(client: Client, status: string, days?: number) {
    if (!licenseColumns) return setMessage({ ok: false, text: "Aplique a migração de licenças (20261112180000) para gerenciar licenças." });
    const patch: Record<string, unknown> = { license_status: status };
    if (days) patch.license_expires_on = plusDays(days);
    const result = await db.from("care_patients").update(patch).eq("id", client.id).eq("owner_id", ownerId);
    if (result.error) return setMessage({ ok: false, text: "Falha ao atualizar a licença." });
    setMessage({ ok: true, text: `Licença de ${client.full_name}: ${status}${days ? ` até ${patch.license_expires_on}` : ""}.` });
    setReload(v => v + 1);
  }

  async function extend(client: Client, days: number) {
    if (!licenseColumns) return setMessage({ ok: false, text: "Aplique a migração de licenças (20261112180000) para gerenciar licenças." });
    const base = client.license_expires_on && client.license_expires_on > today() ? client.license_expires_on : today();
    const until = new Date(Date.parse(base + "T12:00:00Z") + days * 86_400_000).toISOString().slice(0, 10);
    const result = await db.from("care_patients").update({ license_expires_on: until, ...(days > 0 ? { license_status: "ativa" } : {}) }).eq("id", client.id).eq("owner_id", ownerId);
    if (result.error) return setMessage({ ok: false, text: "Falha ao ajustar o tempo da licença." });
    setMessage({ ok: true, text: `Licença de ${client.full_name} válida até ${until.split("-").reverse().join("/")}.` });
    setReload(v => v + 1);
  }

  async function remove(client: Client) {
    const typed = window.prompt(`Excluir definitivamente ${client.full_name} e todos os registros? Digite EXCLUIR para confirmar.`);
    if (typed !== "EXCLUIR") return;
    const result = await db.from("care_patients").delete().eq("id", client.id).eq("owner_id", ownerId);
    if (result.error) return setMessage({ ok: false, text: "Não foi possível excluir: " + result.error.message });
    setMessage({ ok: true, text: `${client.full_name} excluído.` }); setReload(v => v + 1);
  }

  async function openReport(client: Client) {
    setReport({ client, data: null });
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const [tasks, water] = await Promise.all([
      db.from("care_daily_checklist").select("category,completed_at,scheduled_at").eq("patient_id", client.id).gte("scheduled_at", since).lt("scheduled_at", new Date().toISOString()).limit(2000),
      db.from("care_hydration").select("amount_ml,recorded_at").eq("patient_id", client.id).gte("recorded_at", since).limit(2000),
    ]);
    const rows = tasks.data ?? [];
    const meds = rows.filter((t: any) => t.category === "medicacao");
    const stamps = [...rows.map((t: any) => t.completed_at), ...(water.data ?? []).map((w: any) => w.recorded_at)].filter(Boolean).sort();
    setReport({ client, data: { total: rows.length, done: rows.filter((t: any) => t.completed_at).length, meds: meds.length,
      medsDone: meds.filter((t: any) => t.completed_at).length, waterMl: (water.data ?? []).reduce((s: number, w: any) => s + Number(w.amount_ml), 0), last: stamps.at(-1) ?? null } });
  }

  function exportCsv() {
    const header = ["Nome", "E-mail", "Telefone", "Nascimento", "Objetivo", "Plano", "Licença", "Validade", "Cadastro"];
    const lines = clients.map(c => [c.full_name, c.contact_email, c.phone, c.birth_date, goals[c.care_goal ?? ""] ?? c.care_goal, plans[c.license_plan ?? ""] ?? "", effectiveLicense(c), c.license_expires_on, c.created_at?.slice(0, 10)]
      .map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";"));
    const blob = new Blob(["﻿" + [header.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `clientes-caredigital-${today()}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  const pct = (a: number, b: number) => b ? Math.round(a / b * 100) : 0;
  const input = "mt-1 block h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm";
  return <section className="mt-6 flex flex-col gap-4" aria-label="Gestão de clientes">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[{ label: "Clientes", value: stats.total, icon: Users, g: "from-indigo-600 to-blue-500" }, { label: "Licenças ativas", value: stats.ativa, icon: BadgeCheck, g: "from-emerald-600 to-teal-500" },
        { label: "Vencem em 7 dias", value: stats.vencendo, icon: CalendarClock, g: "from-amber-500 to-orange-500" }, { label: "Suspensas/expiradas", value: stats.alerta, icon: ShieldAlert, g: "from-rose-600 to-pink-500" }]
        .map(({ label, value, icon: Icon, g }) => <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <span className={`grid size-10 place-items-center rounded-xl bg-gradient-to-br text-white ${g}`}><Icon size={19}/></span>
          <p className="mt-3 text-sm font-semibold text-muted-foreground">{label}</p><p className="text-3xl font-extrabold tabular-nums">{value}</p>
        </div>)}
    </div>

    <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto flex items-center gap-2 text-xl font-bold"><Users size={22} className="text-indigo-500"/> Clientes</h2>
        <button type="button" onClick={exportCsv} className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-bold hover:border-indigo-500 hover:text-indigo-600"><Download size={17}/> Exportar CSV</button>
        <button type="button" onClick={() => setEditing({ license_plan: "basico", license_status: "teste", license_expires_on: plusDays(14) })} className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 px-5 text-sm font-bold text-white shadow-sm hover:brightness-110"><UserPlus size={17}/> Novo cliente</button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <label className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nome, e-mail ou telefone" className="h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm"/></label>
        <div role="group" aria-label="Filtrar por licença" className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
          {["todos", "ativa", "teste", "suspensa", "expirada"].map(key => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}
            className={`h-9 rounded-lg px-3 text-sm font-semibold capitalize ${filter === key ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{key}</button>)}
        </div>
      </div>
      {!licenseColumns && <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-sm">Gestão de licenças indisponível até aplicar a migração <code>20261112180000_care_patient_licenses.sql</code>.</p>}
      {message && <p role="status" className={`mt-3 rounded-xl px-3 py-2 text-sm font-medium ${message.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 text-destructive"}`}>{message.text}</p>}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="py-2">Cliente</th><th>Objetivo</th><th>Plano</th><th>Licença</th><th>Validade</th><th className="text-right">Ações</th></tr></thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum cliente encontrado.</td></tr>}
            {shown.map(c => { const lic = effectiveLicense(c); return <tr key={c.id} className="border-t border-border">
              <td className="py-3"><div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 font-bold text-white">{c.full_name.slice(0, 1).toUpperCase()}</span>
                <span className="min-w-0"><strong className="block truncate">{c.full_name}</strong><span className="block truncate text-xs text-muted-foreground">{c.contact_email ?? "sem e-mail"}{c.phone ? ` · ${c.phone}` : ""}</span></span></div></td>
              <td>{goals[c.care_goal ?? ""] ?? "—"}</td>
              <td>{plans[c.license_plan ?? ""] ?? "—"}</td>
              <td><span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusStyle[lic] ?? "bg-muted"}`}>{lic}</span></td>
              <td className="tabular-nums">{c.license_expires_on ? <>{c.license_expires_on.split("-").reverse().join("/")}<span className="block text-xs text-muted-foreground">{(() => { const d = Math.round((Date.parse(c.license_expires_on + "T00:00:00Z") - Date.parse(today() + "T00:00:00Z")) / 86_400_000); return d < 0 ? `vencida há ${-d} dia(s)` : d === 0 ? "vence hoje" : `${d} dia(s) restantes`; })()}</span></> : "Sem validade"}</td>
              <td><div className="flex justify-end gap-1.5">
                <button type="button" title="Relatório" onClick={() => void openReport(c)} className="grid size-9 place-items-center rounded-lg border border-border hover:border-indigo-500 hover:text-indigo-600"><BarChart3 size={16}/></button>
                <button type="button" title="Editar" onClick={() => setEditing(c)} className="grid size-9 place-items-center rounded-lg border border-border hover:border-indigo-500 hover:text-indigo-600"><Pencil size={16}/></button>
                {lic === "ativa"
                  ? <button type="button" title="Suspender licença" onClick={() => void setLicense(c, "suspensa")} className="grid size-9 place-items-center rounded-lg border border-border hover:border-amber-500 hover:text-amber-600"><ShieldAlert size={16}/></button>
                  : <button type="button" title="Reativar licença" onClick={() => void setLicense(c, "ativa")} className="inline-flex h-9 items-center gap-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 px-2.5 text-xs font-bold text-white"><KeyRound size={14}/> Ativar</button>}
                <select aria-label="Adicionar tempo à licença" value="" onChange={e => { const d = Number(e.target.value); if (d) void extend(c, d); }}
                  className="h-9 rounded-lg border border-border bg-surface px-2 text-xs font-bold"><option value="">+ Tempo</option>{durations.map(([d, l]) => <option key={d} value={d}>+{l}</option>)}<option value="-7">−7 dias</option></select>
                <button type="button" title="Excluir" onClick={() => void remove(c)} className="grid size-9 place-items-center rounded-lg border border-border text-destructive hover:bg-destructive/10"><Trash2 size={16}/></button>
              </div></td>
            </tr>; })}
          </tbody>
        </table>
      </div>
    </div>

    <LicenseKeyPanel ownerId={ownerId} clients={clients}/>

    {editing && <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Cadastro do cliente">
      <div className="w-full max-w-2xl rounded-3xl bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-xl font-bold">{editing.id ? <Pencil size={20}/> : <Plus size={20}/>}{editing.id ? "Editar cliente" : "Novo cliente"}</h3>
          <button type="button" onClick={() => setEditing(null)} aria-label="Fechar" className="grid size-9 place-items-center rounded-lg hover:bg-muted"><X size={18}/></button></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm font-semibold">
          <label className="sm:col-span-2">Nome completo<input className={input} value={editing.full_name ?? ""} onChange={e => setEditing({ ...editing, full_name: e.target.value })}/></label>
          <label>E-mail de acesso<input type="email" className={input} value={editing.contact_email ?? ""} onChange={e => setEditing({ ...editing, contact_email: e.target.value })}/></label>
          <label>Telefone<input className={input} value={editing.phone ?? ""} onChange={e => setEditing({ ...editing, phone: e.target.value })} disabled={!licenseColumns}/></label>
          <label>Nascimento<input type="date" className={input} value={editing.birth_date ?? ""} onChange={e => setEditing({ ...editing, birth_date: e.target.value })}/></label>
          <label>Objetivo<select className={input} value={editing.care_goal ?? ""} onChange={e => setEditing({ ...editing, care_goal: e.target.value })}><option value="">—</option>{Object.entries(goals).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>Peso (kg)<input inputMode="decimal" className={input} value={editing.weight_kg ?? ""} onChange={e => setEditing({ ...editing, weight_kg: e.target.value as unknown as number })}/></label>
          <label>Altura (cm)<input inputMode="numeric" className={input} value={editing.height_cm ?? ""} onChange={e => setEditing({ ...editing, height_cm: e.target.value as unknown as number })}/></label>
          {licenseColumns && <>
            <label>Plano<select className={input} value={editing.license_plan ?? "basico"} onChange={e => setEditing({ ...editing, license_plan: e.target.value })}>{Object.entries(plans).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label>Situação da licença<select className={input} value={editing.license_status ?? "ativa"} onChange={e => setEditing({ ...editing, license_status: e.target.value })}>{["ativa", "teste", "suspensa", "expirada"].map(s => <option key={s}>{s}</option>)}</select></label>
            <label className="sm:col-span-2">Validade da licença
              <div className="mt-1 flex flex-wrap gap-2"><input type="date" className="h-11 flex-1 rounded-xl border border-border bg-surface px-3" value={editing.license_expires_on ?? ""} onChange={e => setEditing({ ...editing, license_expires_on: e.target.value })}/>
                {[7, 30, 90, 180, 365].map(d => <button key={d} type="button" onClick={() => setEditing({ ...editing, license_expires_on: plusDays(d), license_status: "ativa" })} className="h-11 rounded-xl border border-border px-3 font-bold hover:border-emerald-500 hover:text-emerald-600">+{d === 365 ? "1 ano" : d === 180 ? "6 meses" : `${d} dias`}</button>)}</div></label>
          </>}
          <label className="sm:col-span-2">Observações clínicas<textarea rows={3} className="mt-1 block w-full rounded-xl border border-border bg-surface p-3" value={editing.condition_notes ?? ""} onChange={e => setEditing({ ...editing, condition_notes: e.target.value })}/></label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setEditing(null)} className="h-11 rounded-xl border border-border px-5 text-sm font-bold">Cancelar</button>
          <button type="button" onClick={() => void save()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 px-6 text-sm font-bold text-white shadow-sm hover:brightness-110"><ShieldCheck size={17}/> Salvar cadastro</button>
        </div>
      </div>
    </div>}

    {report && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Relatório do cliente">
      <div className="w-full max-w-lg rounded-3xl bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-xl font-bold"><FileText size={20} className="text-indigo-500"/> Relatório · 30 dias</h3>
          <button type="button" onClick={() => setReport(null)} aria-label="Fechar" className="grid size-9 place-items-center rounded-lg hover:bg-muted"><X size={18}/></button></div>
        <p className="mt-1 text-sm text-muted-foreground">{report.client.full_name}</p>
        {!report.data ? <div className="mt-4 h-40 animate-pulse rounded-2xl bg-muted"/> : <div className="mt-4 grid grid-cols-2 gap-3">
          {[["Cuidados concluídos", `${pct(report.data.done, report.data.total)}%`, `${report.data.done} de ${report.data.total}`, "from-indigo-600 to-blue-500"],
            ["Adesão à medicação", `${pct(report.data.medsDone, report.data.meds)}%`, `${report.data.medsDone} de ${report.data.meds} doses`, "from-rose-600 to-pink-500"],
            ["Água registrada", `${(report.data.waterMl / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L`, `média ${Math.round(report.data.waterMl / 30)} ml/dia`, "from-sky-600 to-cyan-500"],
            ["Último registro", report.data.last ? new Date(report.data.last).toLocaleDateString("pt-BR") : "—", report.data.last ? new Date(report.data.last).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "sem atividade", "from-emerald-600 to-teal-500"]]
            .map(([l, v, n, g]) => <div key={l} className="rounded-2xl bg-muted/50 p-4"><span className={`block h-1.5 w-10 rounded-full bg-gradient-to-r ${g}`}/><p className="mt-2 text-xs font-semibold text-muted-foreground">{l}</p><p className="text-2xl font-extrabold">{v}</p><p className="text-xs text-muted-foreground">{n}</p></div>)}
        </div>}
        <Link to="/prontuario" className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 text-sm font-bold text-white">Abrir prontuário completo</Link>
      </div>
    </div>}
  </section>;
}

type LicenseKey = { code: string; plan: string; days: number; patient_id: string | null; note: string | null; created_at: string; redeemed_at: string | null; redeemed_patient_id: string | null; revoked: boolean };
const durations = [[7, "7 dias"], [15, "15 dias"], [30, "30 dias"], [90, "3 meses"], [180, "6 meses"], [365, "1 ano"], [730, "2 anos"]] as const;
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateLicenseCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, b => alphabet[b % alphabet.length]).join("");
  return `CARE-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

export function LicenseKeyPanel({ ownerId, clients }: { ownerId: string; clients: { id: string; full_name: string }[] }) {
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [available, setAvailable] = useState(true);
  const [plan, setPlan] = useState("premium");
  const [days, setDays] = useState(30);
  const [qty, setQty] = useState(1);
  const [patient, setPatient] = useState("");
  const [note, setNote] = useState("");
  const [fresh, setFresh] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    void db.from("care_license_keys").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(100)
      .then((r: any) => { setAvailable(!r.error); setKeys(r.data ?? []); });
  }, [ownerId, reload]);
  const nameOf = (id: string | null) => clients.find(c => c.id === id)?.full_name ?? "—";
  async function generate() {
    const codes = Array.from({ length: Math.min(20, Math.max(1, qty)) }, generateLicenseCode);
    const r = await db.from("care_license_keys").insert(codes.map(code => ({ code, owner_id: ownerId, plan, days, patient_id: patient || null, note: note.trim() || null })));
    if (r.error) return setMsg("Não foi possível gerar: " + r.error.message);
    setFresh(codes); setMsg(`${codes.length} código(s) gerado(s). Envie ao cliente para ativar em Meu painel.`); setReload(v => v + 1);
  }
  async function revoke(code: string) {
    if (!window.confirm(`Revogar o código ${code}?`)) return;
    await db.from("care_license_keys").update({ revoked: true }).eq("code", code).eq("owner_id", ownerId); setReload(v => v + 1);
  }
  const copy = (text: string) => { void navigator.clipboard?.writeText(text); setMsg(`Copiado: ${text}`); };
  const field = "mt-1 block h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm";
  return <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
    <h2 className="flex items-center gap-2 text-xl font-bold"><KeyRound size={22} className="text-emerald-500"/> Gerar licenças</h2>
    <p className="text-sm text-muted-foreground">O cliente digita o código no painel e a licença é ativada na hora. Se já houver dias restantes, eles são somados.</p>
    {!available ? <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-sm">Aplique a migração <code>20261112190000_care_license_keys.sql</code> para gerar códigos.</p> : <>
      <div className="mt-4 grid gap-3 text-sm font-semibold sm:grid-cols-2 lg:grid-cols-5">
        <label>Plano<select className={field} value={plan} onChange={e => setPlan(e.target.value)}>{Object.entries(plans).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label>Duração<select className={field} value={days} onChange={e => setDays(Number(e.target.value))}>{durations.map(([d, l]) => <option key={d} value={d}>{l}</option>)}</select></label>
        <label>Quantidade<input type="number" min={1} max={20} className={field} value={qty} onChange={e => setQty(Number(e.target.value))}/></label>
        <label>Exclusivo para<select className={field} value={patient} onChange={e => setPatient(e.target.value)}><option value="">Qualquer cliente</option>{clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}</select></label>
        <label>Observação<input className={field} value={note} maxLength={120} onChange={e => setNote(e.target.value)} placeholder="Ex.: renovação anual"/></label>
      </div>
      <button type="button" onClick={() => void generate()} className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 text-sm font-bold text-white shadow-sm hover:brightness-110"><KeyRound size={17}/> Gerar código{qty > 1 ? "s" : ""}</button>
      {msg && <p role="status" className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">{msg}</p>}
      {fresh.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{fresh.map(c => <button key={c} type="button" onClick={() => copy(c)} className="rounded-xl border-2 border-dashed border-emerald-500 px-4 py-2 font-mono text-base font-bold tracking-wider hover:bg-emerald-500/10" title="Copiar">{c}</button>)}</div>}
      <div className="mt-4 max-h-80 overflow-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="sticky top-0 bg-card text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="py-2">Código</th><th>Plano</th><th>Duração</th><th>Cliente</th><th>Situação</th><th/></tr></thead>
          <tbody>{keys.map(k => { const state = k.revoked ? "revogado" : k.redeemed_at ? "usado" : "disponível";
            return <tr key={k.code} className="border-t border-border">
              <td className="py-2.5 font-mono font-bold">{k.code}</td><td>{plans[k.plan]}</td><td>{k.days} dias</td>
              <td>{k.redeemed_patient_id ? nameOf(k.redeemed_patient_id) : k.patient_id ? `Para ${nameOf(k.patient_id)}` : "Qualquer"}</td>
              <td><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${state === "disponível" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : state === "usado" ? "bg-sky-500/15 text-sky-700 dark:text-sky-300" : "bg-muted text-muted-foreground"}`}>{state}{k.redeemed_at ? ` em ${new Date(k.redeemed_at).toLocaleDateString("pt-BR")}` : ""}</span></td>
              <td className="text-right">{state === "disponível" && <><button type="button" onClick={() => copy(k.code)} className="h-9 rounded-lg border border-border px-3 text-xs font-bold hover:border-emerald-500">Copiar</button>{" "}
                <button type="button" onClick={() => void revoke(k.code)} className="h-9 rounded-lg border border-border px-3 text-xs font-bold text-destructive hover:bg-destructive/10">Revogar</button></>}</td>
            </tr>; })}
            {keys.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Nenhum código gerado ainda.</td></tr>}</tbody>
        </table>
      </div>
    </>}
  </div>;
}
