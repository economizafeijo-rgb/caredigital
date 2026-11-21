import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Download, Mail, MapPin, Phone, Plus, Search, Trash2, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import type { Vendor } from "@/lib/marketplace";
import { btn, inputCls, Panel } from "./shared";

type Client = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  address: string | null;
  notes: string | null;
  updated_at?: string | null;
};

type Draft = {
  id: string;
  name: string;
  phone: string;
  email: string;
  document: string;
  address: string;
  notes: string;
};
const EMPTY: Draft = {
  id: "",
  name: "",
  phone: "",
  email: "",
  document: "",
  address: "",
  notes: "",
};

const digits = (v: string) => v.replace(/\D/g, "");

function maskPhone(v: string) {
  const d = digits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function maskCpf(v: string) {
  const d = digits(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

const validCpf = (v: string) => {
  const d = digits(v);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  for (let t = 9; t < 11; t++) {
    let sum = 0;
    for (let i = 0; i < t; i++) sum += Number(d[i]) * (t + 1 - i);
    const check = ((sum * 10) % 11) % 10;
    if (check !== Number(d[t])) return false;
  }
  return true;
};

const waLink = (phone: string) => {
  const d = digits(phone);
  return d ? `https://wa.me/${d.startsWith("55") ? d : `55${d}`}` : null;
};

/** Clientes da loja: cadastro, busca, edição e exportação. Usa a mesma base de contatos do cadastro geral. */
export function SellerClients({
  vendor,
  readOnly = false,
}: {
  vendor: Vendor;
  readOnly?: boolean;
}) {
  const [rows, setRows] = useState<Client[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const { confirm } = useDialog();

  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("care_store_contacts")
      .select("id,name,phone,email,document,address,notes,updated_at")
      .eq("vendor_id", vendor.id)
      .eq("kind", "cliente")
      .order("name")
      .limit(2000);
    setRows(data ?? []);
  }, [vendor.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    const qd = digits(q);
    return rows.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (qd && digits(c.phone ?? "").includes(qd)) ||
        (qd && digits(c.document ?? "").includes(qd)),
    );
  }, [rows, query]);

  function openNew() {
    setErr("");
    setDraft({ ...EMPTY });
  }

  function openEdit(c: Client) {
    setErr("");
    setDraft({
      id: c.id,
      name: c.name,
      phone: c.phone ? maskPhone(c.phone) : "",
      email: c.email ?? "",
      document: c.document ? maskCpf(c.document) : "",
      address: c.address ?? "",
      notes: c.notes ?? "",
    });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft || readOnly) return;
    const name = draft.name.trim();
    if (name.length < 2) return setErr("Informe o nome completo do cliente.");
    if (draft.phone && digits(draft.phone).length < 10)
      return setErr("Telefone incompleto. Use DDD e número.");
    if (draft.email && !/^\S+@\S+\.\S+$/.test(draft.email.trim()))
      return setErr("E-mail inválido.");
    if (draft.document && !validCpf(draft.document))
      return setErr("CPF inválido. Confira os 11 números.");

    const row = {
      kind: "cliente",
      name,
      phone: digits(draft.phone) || null,
      email: draft.email.trim().toLowerCase() || null,
      document: digits(draft.document) || null,
      address: draft.address.trim() || null,
      notes: draft.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    setSaving(true);
    const db = (supabase as any).from("care_store_contacts");
    const { error } = draft.id
      ? await db.update(row).eq("id", draft.id)
      : await db.insert({ ...row, vendor_id: vendor.id });
    setSaving(false);
    if (error) return setErr("Não foi possível salvar. Tente novamente em instantes.");
    setDraft(null);
    setErr("");
    void load();
  }

  async function remove() {
    if (!draft?.id || readOnly) return;
    if (
      !(await confirm(
        `Excluir ${draft.name || "este cliente"}?`,
        "O cadastro é removido. Pedidos já feitos continuam no histórico.",
        true,
        "Excluir",
      ))
    )
      return;
    const { error } = await (supabase as any)
      .from("care_store_contacts")
      .delete()
      .eq("id", draft.id);
    if (error) return setErr("Não foi possível excluir.");
    setDraft(null);
    void load();
  }

  function exportCsv() {
    const head = ["Nome", "Telefone", "E-mail", "CPF", "Endereço", "Observações"];
    const lines = rows.map((c) =>
      [
        c.name,
        c.phone ? maskPhone(c.phone) : "",
        c.email ?? "",
        c.document ? maskCpf(c.document) : "",
        c.address ?? "",
        c.notes ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";"),
    );
    const blob = new Blob(["﻿" + [head.join(";"), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes-${vendor.slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const withPhone = rows.filter((c) => c.phone).length;
  const withEmail = rows.filter((c) => c.email).length;

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Clientes cadastrados", value: rows.length },
          { label: "Com telefone", value: withPhone },
          { label: "Com e-mail", value: withEmail },
          { label: "Resultados da busca", value: shown.length },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground">{k.label}</p>
            <p className="mt-2 font-display text-2xl font-extrabold tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel
          title="Carteira de clientes"
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportCsv}
                disabled={!rows.length}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold transition hover:bg-muted disabled:opacity-50"
              >
                <Download size={13} /> Exportar
              </button>
              {!readOnly && (
                <button
                  type="button"
                  onClick={openNew}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white"
                  style={{ background: "var(--accent-store)" }}
                >
                  <Plus size={13} /> Novo cliente
                </button>
              )}
            </div>
          }
        >
          <div className="border-b border-border p-3">
            <label className="relative block">
              <span className="sr-only">Buscar cliente</span>
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                className={`${inputCls} pl-9`}
                placeholder="Buscar por nome, telefone, e-mail ou CPF"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          <ul className="max-h-[32rem] divide-y divide-border overflow-y-auto">
            {shown.map((c) => {
              const on = draft?.id === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    aria-current={on ? "true" : undefined}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/50 ${on ? "bg-muted/60" : ""}`}
                  >
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
                      style={{ background: "var(--accent-store)" }}
                    >
                      {c.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm">{c.name}</strong>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[c.phone && maskPhone(c.phone), c.email].filter(Boolean).join(" · ") ||
                          "Sem contato cadastrado"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {!shown.length && (
              <li className="px-4 py-14 text-center text-sm text-muted-foreground">
                {rows.length
                  ? "Nenhum cliente encontrado com essa busca."
                  : "Nenhum cliente cadastrado ainda. Cadastre o primeiro ao lado."}
              </li>
            )}
          </ul>
        </Panel>

        <Panel
          title={draft ? (draft.id ? "Editar cliente" : "Novo cliente") : "Detalhes do cliente"}
        >
          {!draft && (
            <div className="grid place-items-center gap-3 px-6 py-14 text-center text-sm text-muted-foreground">
              <UserRound size={28} aria-hidden="true" />
              <p>Escolha um cliente na lista para ver ou editar, ou cadastre um novo.</p>
              {!readOnly && (
                <button type="button" onClick={openNew} className={btn.primary}>
                  <Plus size={15} /> Cadastrar cliente
                </button>
              )}
            </div>
          )}
          {draft && (
            <form onSubmit={(e) => void save(e)} className="grid gap-4 p-5" noValidate>
              <fieldset disabled={readOnly || saving} className="grid gap-4">
                <label className="grid gap-1.5 text-[13px] font-semibold">
                  Nome completo <span className="text-rose-600">*</span>
                  <input
                    className={inputCls}
                    value={draft.name}
                    maxLength={120}
                    autoComplete="off"
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-[13px] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Phone size={13} /> Telefone / WhatsApp
                    </span>
                    <input
                      className={inputCls}
                      inputMode="tel"
                      placeholder="(68) 99999-9999"
                      value={draft.phone}
                      onChange={(e) => setDraft({ ...draft, phone: maskPhone(e.target.value) })}
                    />
                  </label>
                  <label className="grid gap-1.5 text-[13px] font-semibold">
                    CPF
                    <input
                      className={inputCls}
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      value={draft.document}
                      onChange={(e) => setDraft({ ...draft, document: maskCpf(e.target.value) })}
                    />
                  </label>
                </div>
                <label className="grid gap-1.5 text-[13px] font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Mail size={13} /> E-mail
                  </span>
                  <input
                    className={inputCls}
                    type="email"
                    autoComplete="off"
                    value={draft.email}
                    onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  />
                </label>
                <label className="grid gap-1.5 text-[13px] font-semibold">
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} /> Endereço de entrega
                  </span>
                  <input
                    className={inputCls}
                    maxLength={200}
                    value={draft.address}
                    onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                  />
                </label>
                <label className="grid gap-1.5 text-[13px] font-semibold">
                  Observações
                  <textarea
                    className={`${inputCls} min-h-24 py-2`}
                    maxLength={600}
                    value={draft.notes}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  />
                </label>
              </fieldset>

              {err && (
                <p role="alert" className="text-sm text-rose-600">
                  {err}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                {draft.phone && waLink(draft.phone) && (
                  <a
                    href={waLink(draft.phone)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3.5 text-sm font-semibold transition hover:bg-muted"
                  >
                    WhatsApp
                  </a>
                )}
                <span className="flex-1" />
                {!readOnly && draft.id && (
                  <button
                    type="button"
                    onClick={() => void remove()}
                    className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-500/10"
                  >
                    <Trash2 size={15} /> Excluir
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDraft(null);
                    setErr("");
                  }}
                  className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-semibold transition hover:bg-muted"
                >
                  Fechar
                </button>
                {!readOnly && (
                  <button type="submit" disabled={saving} className={btn.primary}>
                    {saving ? "Salvando…" : "Salvar cliente"}
                  </button>
                )}
              </div>
              {readOnly && (
                <p className="text-xs text-muted-foreground">
                  Seu acesso é somente para visualizar. Peça ao dono para alterar cadastros.
                </p>
              )}
            </form>
          )}
        </Panel>
      </div>
    </div>
  );
}
