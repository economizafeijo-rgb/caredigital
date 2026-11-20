import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  FlaskConical,
  Link2,
  RefreshCw,
  Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";

type Row = { slug: string; name: string; email: string; exists: boolean; linked: boolean };

/** Lojas de teste: e-mails das contas de lojista, vínculo automático e transferência de qualquer loja por e-mail. */
export function AdminTestStores() {
  const { confirm } = useDialog();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [vendor, setVendor] = useState("");
  const [email, setEmail] = useState("");

  const load = useCallback(async () => {
    const db = supabase as any;
    const [{ data }, { data: vs }] = await Promise.all([
      db.rpc("care_store_admin_test_accounts_status"),
      db.from("care_store_vendors").select("id,name").order("name"),
    ]);
    setRows((data as Row[]) ?? []);
    setVendors(vs ?? []);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function link() {
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("care_store_admin_link_test_accounts");
    setBusy(false);
    if (error) {
      setMsg("Não foi possível vincular agora.");
      return;
    }
    const n = ((data as { linked: boolean }[]) ?? []).filter((r) => r.linked).length;
    setMsg(`${n} loja(s) vinculada(s) às contas de teste. Os lojistas de teste já podem entrar.`);
    void load();
  }
  async function transfer(e: FormEvent) {
    e.preventDefault();
    const name = vendors.find((v) => v.id === vendor)?.name;
    if (!vendor || !email.includes("@")) {
      setMsg("Escolha a loja e informe o e-mail do lojista.");
      return;
    }
    if (
      !(await confirm(
        `Transferir ${name}?`,
        `A loja passa a ser gerenciada pela conta ${email.trim()}. Quem tinha acesso antes deixa de ver o painel dela.`,
        false,
        "Transferir",
      ))
    )
      return;
    const { error } = await (supabase as any).rpc("care_store_admin_transfer_vendor", {
      p_vendor: vendor,
      p_email: email.trim(),
    });
    setMsg(
      error
        ? String(error.message).includes("User not found")
          ? "Nenhuma conta com esse e-mail. O lojista precisa se cadastrar primeiro."
          : "Não foi possível transferir."
        : `${name} transferida para ${email.trim()}.`,
    );
    if (!error) {
      setEmail("");
      void load();
    }
  }

  return (
    <section
      aria-label="Lojas de teste"
      className="grid gap-3 rounded-3xl border border-border bg-card/60 p-3 shadow-card sm:p-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
            <FlaskConical size={20} />
          </span>
          <div>
            <p className="text-[11px] font-bold text-primary">Testes</p>
            <h2 className="text-lg font-extrabold leading-tight">
              Lojas de teste e acesso dos lojistas
            </h2>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/lojista"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-amber-400 px-3 text-xs font-bold text-slate-950"
          >
            <ExternalLink size={14} /> Abrir painel das lojas
          </a>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-bold"
          >
            <RefreshCw size={14} /> Atualizar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void link()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            <Link2 size={14} /> Vincular contas criadas
          </button>
        </div>
      </header>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Crie cada conta pela tela{" "}
        <a href="/entrar?mode=signup" className="font-semibold text-primary underline">
          Entrar → Criar conta
        </a>{" "}
        com o e-mail abaixo e a senha que você escolher. Depois clique em{" "}
        <strong>Vincular contas criadas</strong>: a conta é confirmada e passa a abrir o painel da
        loja em <strong>/lojista</strong>. Enquanto não houver conta, a loja abre pelo seu login de
        administrador.
      </p>
      {msg && (
        <p role="status" className="rounded-lg bg-muted/60 p-2 text-xs">
          {msg}
        </p>
      )}
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {(rows ?? []).map((r) => (
          <li
            key={r.slug}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-[13px]"
          >
            {r.linked ? (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
            ) : (
              <Circle size={18} className="shrink-0 text-muted-foreground" />
            )}
            <span className="min-w-0 flex-1">
              <strong className="block truncate">{r.name}</strong>
              <span className="block truncate font-mono text-[11.5px] text-muted-foreground">
                {r.email}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {r.linked
                  ? "conta vinculada"
                  : r.exists
                    ? "conta criada · falta vincular"
                    : "conta ainda não criada"}
              </span>
            </span>
            <a
              href={`/loja?loja=${r.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir a loja ${r.name}`}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <ExternalLink size={14} />
            </a>
          </li>
        ))}
        {rows && !rows.length && (
          <li className="text-xs text-muted-foreground">Nenhuma loja de teste no banco.</li>
        )}
      </ul>
      <form
        onSubmit={transfer}
        className="grid gap-2 rounded-2xl border border-border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
      >
        <label className="text-[12px] font-semibold">
          Loja
          <select
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            className="mt-1 block h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm"
          >
            <option value="">Escolha…</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[12px] font-semibold">
          E-mail do lojista
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="mt-1 block h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm"
            placeholder="lojista@email.com"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-4 text-xs font-bold"
        >
          <Send size={14} /> Transferir loja
        </button>
      </form>
    </section>
  );
}
