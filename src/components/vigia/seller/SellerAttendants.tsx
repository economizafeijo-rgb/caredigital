import { useState, type FormEvent } from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Headset,
  KeyRound,
  Pencil,
  RefreshCw,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import type { Vendor } from "@/lib/marketplace";
import { btn, inputCls, Panel } from "./shared";

export const MAX_ATTENDANTS = 2;

export type Attendant = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  role: string;
  created_at: string;
};

/** Senha forte e fácil de digitar (sem letras parecidas como l/1 e O/0). */
export function makePassword(len = 10): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

async function callAttendants(body: Record<string, unknown>): Promise<string | null> {
  const { data, error } = await (supabase as any).functions.invoke("store-attendants", { body });
  if (!error) return (data as { error?: string } | null)?.error ?? null;
  try {
    const res = (error as { context?: Response }).context;
    const json = res ? await res.json() : null;
    if (json?.error) return String(json.error);
  } catch {
    /* sem corpo */
  }
  return "Não foi possível falar com o servidor. Confira se a função store-attendants foi publicada.";
}

/** Contas de atendente: até 2 por loja, cada uma com o próprio login e as próprias conversas. */
export function SellerAttendants({
  vendor,
  rows,
  onChanged,
}: {
  vendor: Vendor;
  rows: Attendant[];
  onChanged: () => void;
}) {
  const { confirm } = useDialog();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(() => makePassword());
  const [show, setShow] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [access, setAccess] = useState<{ name: string; email: string; password: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const free = MAX_ATTENDANTS - rows.length;

  async function create(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setMsg({ ok: false, text: "Dê um nome para a atendente." });
    if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      return setMsg({ ok: false, text: "Informe o e-mail que ela vai usar para entrar." });
    if (password.length < 8)
      return setMsg({ ok: false, text: "A senha precisa de pelo menos 8 caracteres." });
    setBusy(true);
    setMsg(null);
    const err = await callAttendants({
      action: "create",
      vendorId: vendor.id,
      name: name.trim(),
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (err) return setMsg({ ok: false, text: err });
    setAccess({ name: name.trim(), email: email.trim().toLowerCase(), password });
    setCreating(false);
    setName("");
    setEmail("");
    setPassword(makePassword());
    onChanged();
  }

  async function rename(a: Attendant) {
    const next = draft.trim();
    setEditing(null);
    if (next.length < 2 || next === a.name) return;
    const { error } = await (supabase as any)
      .from("care_store_staff")
      .update({ name: next.slice(0, 40) })
      .eq("id", a.id);
    setMsg(
      error
        ? { ok: false, text: "Não foi possível trocar o nome." }
        : { ok: true, text: `Nome atualizado para ${next}.` },
    );
    onChanged();
  }

  async function resetPassword(a: Attendant) {
    const pwd = makePassword();
    if (
      !(await confirm(
        `Criar uma senha nova para ${a.name}?`,
        "Ela sai de todos os aparelhos e entra de novo com a senha nova.",
        false,
        "Gerar senha",
      ))
    )
      return;
    setBusy(true);
    const err = await callAttendants({
      action: "password",
      vendorId: vendor.id,
      staffId: a.id,
      password: pwd,
    });
    setBusy(false);
    if (err) return setMsg({ ok: false, text: err });
    setAccess({ name: a.name, email: a.email, password: pwd });
  }

  async function toggle(a: Attendant) {
    await (supabase as any).from("care_store_staff").update({ active: !a.active }).eq("id", a.id);
    onChanged();
  }

  async function remove(a: Attendant) {
    if (
      !(await confirm(
        `Remover ${a.name}?`,
        "Ela perde o acesso à loja na hora e a vaga fica livre para outra atendente.",
        true,
        "Remover",
      ))
    )
      return;
    await (supabase as any).from("care_store_staff").delete().eq("id", a.id);
    onChanged();
  }

  const accessText = access
    ? `Acesso de atendente · ${vendor.name}\nNome: ${access.name}\nEntrar em: ${window.location.origin}/entrar\nE-mail: ${access.email}\nSenha: ${access.password}`
    : "";

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Headset size={16} className="text-primary" /> Atendentes · {rows.length} de{" "}
          {MAX_ATTENDANTS}
        </span>
      }
    >
      <p className="px-4 pt-3 text-[13px] text-muted-foreground">
        Cada atendente entra com o próprio login, atende só os clientes que assumir e vende pelo
        painel de atendimento. Assim duas pessoas trabalham ao mesmo tempo sem uma travar a outra. A
        conta de atendente fica conectada em um aparelho por vez.
      </p>

      {access && (
        <div
          role="status"
          className="mx-4 mt-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm"
        >
          <div className="flex items-start gap-2">
            <KeyRound size={16} className="mt-0.5 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <strong className="block">Acesso de {access.name}</strong>
              <span className="block break-all text-[13px]">E-mail: {access.email}</span>
              <span className="block font-mono text-[13px]">Senha: {access.password}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Envie para a atendente agora. A senha não aparece de novo.
              </span>
            </div>
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setAccess(null)}
              className={btn.icon}
            >
              <X size={15} />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className={btn.ghost}
              onClick={() =>
                void navigator.clipboard?.writeText(accessText).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                })
              }
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copiado" : "Copiar acesso"}
            </button>
            <a
              className={btn.ghost}
              href={`https://wa.me/?text=${encodeURIComponent(accessText)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Enviar pelo WhatsApp
            </a>
          </div>
        </div>
      )}

      <ul className="grid gap-3 p-4 md:grid-cols-2">
        {rows.map((a, i) => (
          <li
            key={a.id}
            className={`rounded-2xl border p-3 ${a.active ? "border-border bg-card" : "border-dashed border-border bg-muted/40"}`}
          >
            <div className="flex items-center gap-3">
              <span
                className="grid size-11 shrink-0 place-items-center rounded-full text-base font-bold text-white"
                style={{ background: "var(--accent-store)" }}
              >
                {a.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Atendente {i + 1}
                </span>
                {editing === a.id ? (
                  <form
                    className="flex items-center gap-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void rename(a);
                    }}
                  >
                    <label className="sr-only" htmlFor={`att-name-${a.id}`}>
                      Nome da atendente
                    </label>
                    <input
                      id={`att-name-${a.id}`}
                      autoFocus
                      maxLength={40}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => void rename(a)}
                      className={`${inputCls} mt-0 h-8`}
                    />
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(a.id);
                      setDraft(a.name);
                    }}
                    className="flex max-w-full items-center gap-1.5 text-left"
                    title="Trocar o nome que os clientes veem"
                  >
                    <strong className="truncate text-[15px]">{a.name}</strong>
                    <Pencil size={13} className="shrink-0 text-muted-foreground" />
                  </button>
                )}
                <span className="block truncate text-xs text-muted-foreground">{a.email}</span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void toggle(a)}
                aria-pressed={a.active}
                className={`h-8 rounded-lg px-2.5 text-xs font-semibold ${a.active ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}
              >
                {a.active ? "Ativa" : "Suspensa"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void resetPassword(a)}
                className={`${btn.ghost} h-8 text-xs`}
              >
                <KeyRound size={13} /> Nova senha
              </button>
              <button
                type="button"
                aria-label={`Remover ${a.name}`}
                onClick={() => void remove(a)}
                className={`${btn.icon} ml-auto`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </li>
        ))}

        {free > 0 &&
          (creating ? (
            <li className="rounded-2xl border border-primary/40 bg-primary/5 p-3 md:col-span-1">
              <form onSubmit={(e) => void create(e)} className="grid gap-2.5">
                <strong className="text-sm">Nova atendente</strong>
                <label className="grid text-[13px] font-semibold">
                  Nome que os clientes veem
                  <input
                    className={inputCls}
                    value={name}
                    maxLength={40}
                    placeholder="Ex.: Ana · Atendimento"
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="grid text-[13px] font-semibold">
                  E-mail de acesso
                  <input
                    className={inputCls}
                    type="email"
                    autoComplete="off"
                    value={email}
                    placeholder="atendente@sualoja.com"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label className="grid text-[13px] font-semibold">
                  Senha
                  <span className="relative mt-1 flex items-center">
                    <input
                      className={`${inputCls} mt-0 pr-20 font-mono`}
                      type={show ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      minLength={8}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <span className="absolute right-1 flex">
                      <button
                        type="button"
                        aria-label={show ? "Esconder senha" : "Mostrar senha"}
                        onClick={() => setShow((v) => !v)}
                        className={btn.icon}
                      >
                        {show ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        aria-label="Gerar outra senha"
                        onClick={() => setPassword(makePassword())}
                        className={btn.icon}
                      >
                        <RefreshCw size={14} />
                      </button>
                    </span>
                  </span>
                </label>
                <div className="flex gap-2">
                  <button type="submit" disabled={busy} className={btn.primary}>
                    <UserPlus size={15} /> {busy ? "Criando…" : "Criar atendente"}
                  </button>
                  <button
                    type="button"
                    className={btn.ghost}
                    onClick={() => {
                      setCreating(false);
                      setMsg(null);
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </li>
          ) : (
            <li>
              <button
                type="button"
                onClick={() => {
                  setCreating(true);
                  setAccess(null);
                }}
                className="flex h-full min-h-[8.5rem] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border p-3 text-sm font-semibold text-muted-foreground transition hover:border-primary/50 hover:bg-primary/5 hover:text-foreground"
              >
                <UserPlus size={20} />
                Criar atendente
                <span className="text-xs font-normal">
                  {free === 1 ? "1 vaga livre" : `${free} vagas livres`}
                </span>
              </button>
            </li>
          ))}
      </ul>
      {msg && (
        <p
          role={msg.ok ? "status" : "alert"}
          className={`px-4 pb-3 text-sm ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}
        >
          {msg.text}
        </p>
      )}
    </Panel>
  );
}
