import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Ban,
  KeyRound,
  LogOut,
  Loader2,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import { money } from "@/lib/marketplace";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  confirmed: boolean;
  suspended: boolean;
  is_admin: boolean;
  is_vendor_owner: boolean;
  has_patients: boolean;
};

type Detail = {
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    created_at: string;
    updated_at: string | null;
    last_sign_in_at: string | null;
    confirmed: boolean;
    suspended: boolean;
    provider: string | null;
    account_type: string | null;
    is_admin: boolean;
  };
  vendors: { id: string; name: string; slug: string; status: string; city: string }[];
  staff: { vendor: string; role: string; active: boolean }[];
  patients_count: number;
  orders_count: number;
  orders_total_cents: number;
  devices: number;
  sessions: number;
  last_orders: {
    id: string;
    created_at: string;
    total_cents: number;
    status: string;
    vendor_id: string | null;
  }[];
};

const TZ = "America/Rio_Branco";
const fmt = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", {
        timeZone: TZ,
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Nunca";
const PAGE = 50;
const field =
  "mt-1 block h-10 w-full rounded-lg border border-border bg-surface px-2.5 text-sm font-normal";

/** Usuários cadastrados na plataforma: lista, ficha e ações do administrador. */
export function AdminUsers() {
  const { confirm } = useDialog();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({ name: "", email: "", phone: "" });
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  const loadList = useCallback(async (q: string, offset: number) => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("care_admin_list_users", {
      p_search: q || null,
      p_limit: PAGE,
      p_offset: offset,
    });
    setLoading(false);
    if (error) return setErr("Não foi possível carregar os usuários.");
    const list = (data ?? []) as UserRow[];
    setRows((prev) => (offset === 0 ? list : [...prev, ...list]));
    setHasMore(list.length === PAGE);
  }, []);

  useEffect(() => {
    void loadList(query, 0);
  }, [query, loadList]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    const { data, error } = await (supabase as any).rpc("care_admin_user_detail", { p_user: id });
    setDetailLoading(false);
    if (error) return setErr("Não foi possível abrir a ficha deste usuário.");
    setDetail(data as Detail);
  }, []);

  function open(id: string) {
    setSelected(id);
    setDetail(null);
    setEditing(false);
    setShowPwd(false);
    setConfirmEmail("");
    setErr("");
    setOk("");
    void loadDetail(id);
  }

  function close() {
    setSelected(null);
    setDetail(null);
  }

  useEffect(() => {
    if (!selected) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [selected]);

  /** Executa uma ação do administrador, recarrega a lista e a ficha e mostra o resultado. */
  async function act(
    key: string,
    fn: () => Promise<{ error: unknown }>,
    done: string,
    fail: (m: string) => string,
  ) {
    setBusy(key);
    setErr("");
    setOk("");
    const { error } = await fn();
    setBusy("");
    if (error) return setErr(fail(String((error as { message?: string }).message ?? "")));
    setOk(done);
    if (selected) void loadDetail(selected);
    void loadList(query, 0);
    return true;
  }

  const rpcMsg = (m: string) =>
    m.includes("já está em uso")
      ? "Este e-mail já está em uso por outra conta."
      : m.includes("administrador")
        ? "Esta ação não é permitida na conta do administrador."
        : m.includes("Nome")
          ? "Nome deve ter de 2 a 80 caracteres."
          : m.includes("Email")
            ? "E-mail inválido."
            : m.includes("Password")
              ? "A senha deve ter de 6 a 72 caracteres."
              : "Não foi possível concluir a ação.";

  function startEdit() {
    if (!detail) return;
    setEdit({
      name: detail.user.name ?? "",
      email: detail.user.email,
      phone: detail.user.phone ?? "",
    });
    setEditing(true);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const done = await act(
      "edit",
      () =>
        (supabase as any).rpc("care_admin_update_user", {
          p_user: selected,
          p_name: edit.name,
          p_email: edit.email,
          p_phone: edit.phone,
        }),
      "Cadastro atualizado.",
      rpcMsg,
    );
    if (done) setEditing(false);
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const done = await act(
      "pwd",
      () =>
        (supabase as any).rpc("care_admin_set_user_password", {
          p_user: selected,
          p_password: pwd,
        }),
      "Senha redefinida. As sessões abertas foram encerradas.",
      rpcMsg,
    );
    if (done) {
      setPwd("");
      setShowPwd(false);
    }
  }

  async function toggleSuspended() {
    if (!detail || !selected) return;
    const next = !detail.user.suspended;
    const yes = await confirm(
      next ? "Suspender acesso?" : "Reativar acesso?",
      next
        ? `${detail.user.email} não consegue entrar até ser reativado. As sessões abertas são encerradas.`
        : `${detail.user.email} volta a conseguir entrar.`,
      next,
      next ? "Suspender" : "Reativar",
    );
    if (!yes) return;
    void act(
      "suspend",
      () =>
        (supabase as any).rpc("care_admin_set_user_suspended", {
          p_user: selected,
          p_suspended: next,
        }),
      next ? "Acesso suspenso." : "Acesso reativado.",
      rpcMsg,
    );
  }

  async function endSessions() {
    if (!detail || !selected) return;
    const yes = await confirm(
      "Encerrar sessões?",
      `${detail.user.email} precisará entrar de novo em todos os aparelhos.`,
      false,
      "Encerrar",
    );
    if (!yes) return;
    void act(
      "sessions",
      () => (supabase as any).rpc("care_admin_end_user_sessions", { p_user: selected }),
      "Sessões encerradas.",
      rpcMsg,
    );
  }

  async function removeAccount() {
    if (!detail || !selected) return;
    const yes = await confirm(
      "Excluir conta?",
      `A conta ${detail.user.email} será apagada de forma definitiva. Isso não pode ser desfeito.`,
      true,
      "Excluir",
    );
    if (!yes) return;
    const done = await act(
      "delete",
      () =>
        (supabase as any).rpc("care_admin_delete_user", {
          p_user: selected,
          p_confirm_email: confirmEmail,
        }),
      "Conta excluída.",
      (m) =>
        m.includes("dona de loja")
          ? "Esta conta é dona de loja. Transfira a loja antes de excluir."
          : m.includes("vinculados")
            ? "A conta tem pacientes, pedidos ou histórico. Use Suspender para bloquear o acesso."
            : m.includes("não confere")
              ? "O e-mail digitado não confere."
              : rpcMsg(m),
    );
    if (done) close();
  }

  const isAdminAccount = !!detail?.user.is_admin;
  const btn =
    "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted disabled:opacity-50";

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search.trim());
          }}
          className="flex w-full max-w-md gap-2"
        >
          <label className="relative flex-1">
            <span className="sr-only">Buscar usuário por nome ou e-mail</span>
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              className={`${field} mt-0 pl-9`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome ou e-mail"
            />
          </label>
          <button
            type="submit"
            className="h-10 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted"
          >
            Buscar
          </button>
        </form>
        <p className="text-xs text-muted-foreground">{rows.length} usuário(s) carregados</p>
      </div>

      {(err || ok) && (
        <p
          role={err ? "alert" : "status"}
          className={`rounded-lg p-2.5 text-sm ${err ? "bg-rose-500/10 text-rose-700 dark:text-rose-300" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}
        >
          {err || ok}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] gap-3 border-b border-border px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground md:grid">
          <span>Usuário</span>
          <span>Cadastro · último acesso</span>
          <span>Situação</span>
          <span className="sr-only">Abrir</span>
        </div>
        {loading && !rows.length ? (
          <div className="grid place-items-center py-16 text-muted-foreground">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : !rows.length ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            Nenhum usuário encontrado.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => open(r.id)}
                  className="grid w-full gap-2 px-4 py-3 text-left transition hover:bg-muted/60 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] md:items-center md:gap-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{r.name || "Sem nome"}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.email}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Cadastro {fmt(r.created_at)}
                    <span className="block">Último acesso: {fmt(r.last_sign_in_at)}</span>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {r.is_admin && <Tag tone="violet">Administrador</Tag>}
                    {r.is_vendor_owner && <Tag tone="emerald">Lojista</Tag>}
                    {r.has_patients && <Tag tone="sky">Cliente</Tag>}
                    {!r.confirmed && <Tag tone="amber">E-mail não confirmado</Tag>}
                    {r.suspended && <Tag tone="rose">Suspenso</Tag>}
                  </span>
                  <span className="text-xs font-bold text-primary md:text-right">Ver ficha →</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => void loadList(query, rows.length)}
          disabled={loading}
          className="mx-auto h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50"
        >
          {loading ? "Carregando…" : "Carregar mais"}
        </button>
      )}

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ficha do usuário"
          className="fixed inset-0 z-[90] flex justify-end bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <aside className="nv-fade-in flex h-full w-full max-w-xl flex-col overflow-y-auto bg-card shadow-2xl">
            <header className="flex items-start justify-between gap-3 border-b border-border p-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground">Ficha do usuário</p>
                <h2 className="truncate text-lg font-extrabold">
                  {detail?.user.name || detail?.user.email || "Carregando…"}
                </h2>
                {detail && (
                  <p className="truncate text-sm text-muted-foreground">{detail.user.email}</p>
                )}
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Fechar"
                className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-muted"
              >
                <X size={17} />
              </button>
            </header>

            {(err || ok) && (
              <p
                role={err ? "alert" : "status"}
                className={`mx-5 mt-4 rounded-lg p-2.5 text-sm ${err ? "bg-rose-500/10 text-rose-700 dark:text-rose-300" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}
              >
                {err || ok}
              </p>
            )}

            {detailLoading || !detail ? (
              <div className="grid place-items-center py-20 text-muted-foreground">
                <Loader2 className="animate-spin" size={20} />
              </div>
            ) : (
              <div className="grid gap-5 p-5">
                <div className="flex flex-wrap gap-1.5">
                  {detail.user.is_admin && <Tag tone="violet">Administrador da plataforma</Tag>}
                  {detail.vendors.length > 0 && <Tag tone="emerald">Lojista</Tag>}
                  {detail.patients_count > 0 && <Tag tone="sky">Cliente</Tag>}
                  {detail.user.suspended ? (
                    <Tag tone="rose">Acesso suspenso</Tag>
                  ) : (
                    <Tag tone="emerald">Acesso liberado</Tag>
                  )}
                  {!detail.user.confirmed && <Tag tone="amber">E-mail não confirmado</Tag>}
                </div>

                <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border p-4 text-sm">
                  <Info label="Cadastro" value={fmt(detail.user.created_at)} />
                  <Info label="Último acesso" value={fmt(detail.user.last_sign_in_at)} />
                  <Info label="Telefone" value={detail.user.phone || "—"} />
                  <Info label="Alterado em" value={fmt(detail.user.updated_at)} />
                  <Info label="Entrada por" value={detail.user.provider || "—"} />
                  <Info label="Tipo de conta" value={detail.user.account_type || "—"} />
                  <Info label="Sessões abertas" value={String(detail.sessions)} />
                  <Info label="Aparelhos de loja" value={String(detail.devices)} />
                  <Info label="Pacientes cadastrados" value={String(detail.patients_count)} />
                  <Info
                    label="Pedidos"
                    value={`${detail.orders_count} · ${money(detail.orders_total_cents)}`}
                  />
                </dl>

                {detail.vendors.length > 0 && (
                  <section aria-label="Lojas do usuário" className="grid gap-2">
                    <h3 className="text-sm font-bold">Lojas que possui</h3>
                    <ul className="grid gap-1.5 text-sm">
                      {detail.vendors.map((v) => (
                        <li
                          key={v.id}
                          className="flex items-center justify-between rounded-lg bg-muted px-3 py-2"
                        >
                          <span className="font-semibold">{v.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {v.status} · {v.city}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {detail.staff.length > 0 && (
                  <section aria-label="Funções na loja" className="grid gap-2">
                    <h3 className="text-sm font-bold">Funcionário em</h3>
                    <ul className="grid gap-1.5 text-sm">
                      {detail.staff.map((s, i) => (
                        <li key={i} className="flex justify-between rounded-lg bg-muted px-3 py-2">
                          <span>{s.vendor}</span>
                          <span className="text-xs text-muted-foreground">
                            {s.role}
                            {s.active ? "" : " · inativo"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {detail.last_orders.length > 0 && (
                  <section aria-label="Últimos pedidos" className="grid gap-2">
                    <h3 className="text-sm font-bold">Últimos pedidos</h3>
                    <ul className="grid gap-1.5 text-xs">
                      {detail.last_orders.map((o) => (
                        <li
                          key={o.id}
                          className="flex justify-between rounded-lg bg-muted px-3 py-2"
                        >
                          <span>
                            {fmt(o.created_at)} · {o.status}
                          </span>
                          <span className="font-bold tabular-nums">{money(o.total_cents)}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {isAdminAccount ? (
                  <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
                    <ShieldCheck size={14} className="mr-1 inline" aria-hidden="true" />
                    Conta do administrador: ações de suspender, senha e exclusão ficam bloqueadas
                    aqui.
                  </p>
                ) : (
                  <section aria-label="Ações" className="grid gap-3">
                    <h3 className="text-sm font-bold">Ações</h3>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={btn} onClick={startEdit} disabled={!!busy}>
                        <Pencil size={14} /> Editar cadastro
                      </button>
                      <button
                        type="button"
                        className={btn}
                        onClick={() => setShowPwd((v) => !v)}
                        disabled={!!busy}
                      >
                        <KeyRound size={14} /> Redefinir senha
                      </button>
                      <button type="button" className={btn} onClick={endSessions} disabled={!!busy}>
                        <LogOut size={14} /> Encerrar sessões
                      </button>
                      <button
                        type="button"
                        className={btn}
                        onClick={toggleSuspended}
                        disabled={!!busy}
                      >
                        <Ban size={14} />{" "}
                        {detail.user.suspended ? "Reativar acesso" : "Suspender acesso"}
                      </button>
                    </div>

                    {editing && (
                      <form
                        onSubmit={saveEdit}
                        className="grid gap-3 rounded-xl border border-border p-4"
                      >
                        <label className="text-[13px] font-semibold">
                          Nome
                          <input
                            className={field}
                            value={edit.name}
                            onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                            maxLength={80}
                            required
                          />
                        </label>
                        <label className="text-[13px] font-semibold">
                          E-mail
                          <input
                            type="email"
                            className={field}
                            value={edit.email}
                            onChange={(e) => setEdit({ ...edit, email: e.target.value })}
                            required
                          />
                        </label>
                        <label className="text-[13px] font-semibold">
                          Telefone
                          <input
                            className={field}
                            value={edit.phone}
                            onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
                            inputMode="tel"
                          />
                        </label>
                        <div className="flex justify-end gap-2">
                          <button type="button" className={btn} onClick={() => setEditing(false)}>
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={busy === "edit"}
                            className="h-9 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50"
                          >
                            {busy === "edit" ? "Salvando…" : "Salvar cadastro"}
                          </button>
                        </div>
                      </form>
                    )}

                    {showPwd && (
                      <form
                        onSubmit={savePassword}
                        className="grid gap-3 rounded-xl border border-border p-4"
                      >
                        <label className="text-[13px] font-semibold">
                          Nova senha (mínimo 6 caracteres)
                          <input
                            type="password"
                            className={field}
                            value={pwd}
                            onChange={(e) => setPwd(e.target.value)}
                            minLength={6}
                            maxLength={72}
                            autoComplete="new-password"
                            required
                          />
                        </label>
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={busy === "pwd"}
                            className="h-9 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50"
                          >
                            {busy === "pwd" ? "Salvando…" : "Definir nova senha"}
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="grid gap-2 rounded-xl border border-rose-500/30 p-4">
                      <h4 className="text-sm font-bold text-rose-700 dark:text-rose-300">
                        Excluir conta
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Apaga a conta de forma definitiva. Só funciona sem loja e sem dados
                        vinculados. Para digitar o e-mail de confirmação:
                      </p>
                      <input
                        className={field}
                        value={confirmEmail}
                        onChange={(e) => setConfirmEmail(e.target.value)}
                        placeholder={detail.user.email}
                        aria-label="Digite o e-mail para confirmar"
                      />
                      <button
                        type="button"
                        onClick={removeAccount}
                        disabled={!!busy || confirmEmail.trim().toLowerCase() !== detail.user.email}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40"
                      >
                        <Trash2 size={14} /> {busy === "delete" ? "Excluindo…" : "Excluir conta"}
                      </button>
                    </div>
                  </section>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="truncate font-semibold">{value}</dd>
    </div>
  );
}

const TONES = {
  violet: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  sky: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  rose: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
} as const;

function Tag({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${TONES[tone]}`}>
      {children}
    </span>
  );
}
