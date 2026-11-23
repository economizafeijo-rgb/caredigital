import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  ArrowLeft,
  CheckSquare,
  KeyRound,
  Loader2,
  Search,
  ShieldCheck,
  Square,
  Trash2,
} from "lucide-react";
import {
  CLOSE_REASONS,
  changeOwnerPass,
  deleteVendorHistory,
  getAdminBackup,
  getVendorHistory,
  listAdminBackup,
  listVendorHistory,
  ownerPassStatus,
  type ArchivedChat,
  type ArchivedChatDetail,
  type OwnerPassStatus,
} from "@/lib/chat-history";
import { useOwnerPasswordPrompt } from "./OwnerPasswordPrompt";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Rio_Branco",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Histórico de conversas encerradas.
 * - mode "vendor": loja (30 dias). Só o dono apaga, com a senha de exclusão.
 * - mode "admin": backup da plataforma (6 meses), inclusive o que a loja apagou. Só leitura.
 */
export function ChatHistoryPanel({
  vendorId,
  mode,
  owner = false,
}: {
  vendorId: string | null;
  mode: "vendor" | "admin";
  owner?: boolean;
}) {
  const [items, setItems] = useState<ArchivedChat[] | null>(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<ArchivedChatDetail | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const { ask, element } = useOwnerPasswordPrompt();

  const load = useCallback(async () => {
    setErr("");
    try {
      const rows =
        mode === "admin"
          ? await listAdminBackup(vendorId, q)
          : vendorId
            ? await listVendorHistory(vendorId, q)
            : [];
      setItems(rows ?? []);
    } catch (e) {
      setItems([]);
      setErr(e instanceof Error ? e.message : "Não foi possível carregar o histórico.");
    }
  }, [mode, vendorId, q]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), q ? 350 : 0);
    return () => window.clearTimeout(t);
  }, [load, q]);

  async function openChat(id: string) {
    setLoadingId(id);
    try {
      setOpen(mode === "admin" ? await getAdminBackup(id) : await getVendorHistory(id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível abrir a conversa.");
    } finally {
      setLoadingId(null);
    }
  }

  async function removeSelected(ids: string[]) {
    if (!vendorId || !ids.length) return;
    const ok = await ask({
      title:
        ids.length === 1
          ? "Apagar esta conversa do histórico?"
          : `Apagar ${ids.length} conversas do histórico?`,
      description:
        "Elas somem do histórico da loja. A plataforma guarda uma cópia de segurança por 6 meses.",
      confirmLabel: "Apagar",
      danger: true,
      action: async (pw) => {
        await deleteVendorHistory(vendorId, ids, pw);
      },
    });
    if (!ok) return;
    setPicked(new Set());
    setSelecting(false);
    if (open && ids.includes(open.id)) setOpen(null);
    void load();
  }

  const canDelete = mode === "vendor" && owner;
  const toggle = (id: string) =>
    setPicked((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="grid min-h-[30rem] flex-1 overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[20rem_minmax(0,1fr)]">
      {element}
      <aside
        className={`min-h-0 flex-col border-r border-border ${open ? "hidden lg:flex" : "flex"}`}
      >
        <div className="border-b border-border p-3">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Archive size={15} />
            {mode === "admin" ? "Backup de conversas" : "Histórico de conversas"}
            <span className="font-normal text-muted-foreground">· {items?.length ?? 0}</span>
          </p>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            {mode === "admin"
              ? "Cópia de segurança de todas as lojas, guardada por 6 meses."
              : "Conversas encerradas dos últimos 30 dias, salvas automaticamente."}
          </p>
          <label className="relative mt-2.5 block">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                mode === "admin" ? "Buscar loja, cliente ou texto" : "Buscar cliente ou texto"
              }
              aria-label="Buscar no histórico"
              className="h-9 w-full rounded-xl border border-border bg-surface pl-8 pr-3 text-[13px]"
            />
          </label>
          {canDelete && !!items?.length && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSelecting((v) => !v);
                  setPicked(new Set());
                }}
                className="font-semibold text-primary hover:underline"
              >
                {selecting ? "Cancelar" : "Selecionar"}
              </button>
              {selecting && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setPicked(
                        picked.size === items.length ? new Set() : new Set(items.map((i) => i.id)),
                      )
                    }
                    className="inline-flex items-center gap-1 font-semibold"
                  >
                    {picked.size === items.length ? (
                      <CheckSquare size={13} />
                    ) : (
                      <Square size={13} />
                    )}
                    Todas
                  </button>
                  <button
                    type="button"
                    disabled={!picked.size}
                    onClick={() => void removeSelected([...picked])}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 font-bold text-white disabled:opacity-40"
                  >
                    <Trash2 size={12} /> Apagar{picked.size ? ` (${picked.size})` : ""}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {items === null && (
            <li className="grid place-items-center py-16 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" />
            </li>
          )}
          {items?.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => (selecting ? toggle(c.id) : void openChat(c.id))}
                aria-current={open?.id === c.id ? "true" : undefined}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${open?.id === c.id ? "bg-muted" : "hover:bg-muted/50"}`}
              >
                {selecting && (
                  <span aria-hidden="true" className="mt-0.5 shrink-0 text-primary">
                    {picked.has(c.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <strong className="truncate text-[13px]">{c.customer_name || "Cliente"}</strong>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {when(c.closed_at)}
                    </span>
                  </span>
                  {mode === "admin" && c.vendor_name && (
                    <span className="block truncate text-[11.5px] font-semibold text-primary">
                      {c.vendor_name}
                    </span>
                  )}
                  <span className="block truncate text-xs text-muted-foreground">
                    {c.preview || `${c.message_count} mensagens`}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1 text-[10.5px]">
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">
                      {CLOSE_REASONS[c.close_reason ?? ""] ?? "Encerrado"}
                    </span>
                    {c.vendor_deleted_at && (
                      <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 font-semibold text-rose-700 dark:text-rose-300">
                        Apagada pela loja
                      </span>
                    )}
                  </span>
                </span>
                {loadingId === c.id && <Loader2 size={14} className="mt-1 animate-spin" />}
              </button>
            </li>
          ))}
          {items && !items.length && !err && (
            <li className="grid place-items-center gap-2 px-6 py-16 text-center text-sm text-muted-foreground">
              <Archive size={22} />
              {q
                ? "Nenhuma conversa encontrada."
                : "Quando um atendimento for encerrado, a conversa aparece aqui."}
            </li>
          )}
        </ul>
        {err && (
          <p
            role="alert"
            className="border-t border-border px-4 py-2 text-xs text-rose-600 dark:text-rose-300"
          >
            {err}
          </p>
        )}
        {mode === "vendor" && owner && vendorId && <OwnerPasswordCard vendorId={vendorId} />}
      </aside>
      <section className={`min-h-0 flex-col ${open ? "flex" : "hidden lg:flex"}`}>
        {open ? (
          <>
            <header className="flex items-center gap-3 border-b border-border px-4 py-3">
              <button
                type="button"
                onClick={() => setOpen(null)}
                aria-label="Voltar ao histórico"
                className="grid size-8 place-items-center rounded-lg hover:bg-muted lg:hidden"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {open.customer_name || "Cliente"}
                  {open.vendor_name ? (
                    <span className="font-normal text-muted-foreground"> · {open.vendor_name}</span>
                  ) : null}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {when(open.started_at)} até {when(open.closed_at)} ·{" "}
                  {CLOSE_REASONS[open.close_reason ?? ""] ?? "Encerrado"}
                </p>
              </div>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => void removeSelected([open.id])}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                >
                  <Trash2 size={13} /> Apagar
                </button>
              )}
            </header>
            {open.vendor_deleted_at && (
              <p className="border-b border-border bg-rose-500/10 px-4 py-2 text-xs text-rose-700 dark:text-rose-300">
                A loja apagou esta conversa em {when(open.vendor_deleted_at)}. Esta é a cópia de
                segurança.
              </p>
            )}
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
              {open.messages.map((m) =>
                m.is_system ? (
                  <p
                    key={m.id}
                    className="mx-auto w-fit rounded-full bg-muted px-3 py-1 text-center text-[11.5px] text-muted-foreground"
                  >
                    {m.body}
                  </p>
                ) : (
                  <div
                    key={m.id}
                    className={`flex ${m.from_vendor ? "justify-end" : "justify-start"}`}
                  >
                    <p
                      className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-snug ${m.deleted ? "border border-dashed border-border italic text-muted-foreground" : m.from_vendor ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted"}`}
                    >
                      {m.body}
                      <span
                        className={`mt-0.5 block text-right text-[11px] ${m.from_vendor && !m.deleted ? "opacity-70" : "text-muted-foreground"}`}
                      >
                        {m.from_vendor ? "Loja" : "Cliente"} · {when(m.created_at)}
                      </span>
                    </p>
                  </div>
                ),
              )}
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-6 text-center text-sm text-muted-foreground">
            Escolha uma conversa para ler.
          </div>
        )}
      </section>
    </div>
  );
}

/** Senha de exclusão do dono: padrão 000000, pode ser trocada uma única vez. */
function OwnerPasswordCard({ vendorId }: { vendorId: string }) {
  const [st, setSt] = useState<OwnerPassStatus | null>(null);
  const [editing, setEditing] = useState(false);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [askTroca, setAskTroca] = useState(false);
  const refresh = useCallback(() => {
    void ownerPassStatus(vendorId).then(setSt, () => setSt(null));
  }, [vendorId]);
  useEffect(refresh, [refresh]);

  if (!st?.is_owner) return null;

  async function save() {
    setMsg(null);
    if (!/^\d{6}$/.test(next))
      return setMsg({ ok: false, text: "A nova senha precisa ter 6 números." });
    if (next !== again)
      return setMsg({ ok: false, text: "A confirmação não é igual à nova senha." });
    setAskTroca(true);
  }

  async function trocar() {
    setAskTroca(false);
    setBusy(true);
    try {
      await changeOwnerPass(vendorId, cur, next);
      setMsg({ ok: true, text: "Senha trocada. Guarde-a em lugar seguro." });
      setEditing(false);
      setCur("");
      setNext("");
      setAgain("");
      refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Não foi possível trocar." });
    } finally {
      setBusy(false);
    }
  }

  const pin =
    "h-9 w-full rounded-lg border border-border bg-surface px-3 text-center font-mono tracking-[0.3em]";
  const onlyDigits = (v: string) => v.replace(/\D/g, "").slice(0, 6);

  return (
    <div className="border-t border-border bg-muted/30 p-3 text-xs">
      <p className="flex items-center gap-1.5 font-bold">
        <ShieldCheck size={14} className="text-primary" /> Senha de exclusão
      </p>
      <p className="mt-0.5 text-muted-foreground">
        {st.is_default
          ? "Ainda é a senha padrão 000000. Recomendamos trocar."
          : "Senha personalizada ativa."}{" "}
        {st.can_change
          ? "Você pode trocá-la uma única vez."
          : "Já foi trocada. Para trocar de novo, peça ao administrador."}
      </p>
      {st.can_change && !editing && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 font-semibold hover:bg-muted"
        >
          <KeyRound size={13} /> Trocar senha
        </button>
      )}
      {editing && (
        <div className="mt-2 grid gap-1.5">
          <input
            className={pin}
            type="password"
            inputMode="numeric"
            placeholder="Senha atual"
            value={cur}
            onChange={(e) => setCur(onlyDigits(e.target.value))}
            aria-label="Senha atual"
          />
          <input
            className={pin}
            type="password"
            inputMode="numeric"
            placeholder="Nova senha"
            value={next}
            onChange={(e) => setNext(onlyDigits(e.target.value))}
            aria-label="Nova senha"
          />
          <input
            className={pin}
            type="password"
            inputMode="numeric"
            placeholder="Repita a nova"
            value={again}
            onChange={(e) => setAgain(onlyDigits(e.target.value))}
            aria-label="Repita a nova senha"
          />
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-8 rounded-lg border border-border font-semibold hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy || cur.length !== 6 || next.length !== 6 || again.length !== 6}
              onClick={() => void save()}
              className="h-8 rounded-lg bg-primary font-bold text-primary-foreground disabled:opacity-45"
            >
              {busy ? "Salvando…" : "Salvar"}
            </button>
            <AlertDialog open={askTroca} onOpenChange={setAskTroca}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Trocar a senha de exclusão?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você só pode trocar a senha uma vez. Depois disso, apenas o administrador da
                    plataforma pode resetá-la.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void trocar()}>Trocar senha</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
      {msg && (
        <p
          role="status"
          className={`mt-1.5 font-semibold ${msg.ok ? "text-emerald-700 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
