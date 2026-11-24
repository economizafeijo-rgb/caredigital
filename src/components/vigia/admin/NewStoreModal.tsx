import { useEffect, useState, type FormEvent } from "react";
import { Copy, Loader2, RefreshCw, Store, X } from "lucide-react";
import { PLANS, SEGMENTS, money, pct, type PlanKey } from "@/lib/marketplace";
import { createVendor, slugify, type SellerRequest } from "@/lib/admin-stores";
import { NiceSelect } from "../NiceSelect";

const field =
  "mt-1 block h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm font-normal";

const genPassword = () => {
  const a = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint32Array(10);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => a[n % a.length]).join("");
};

/** Cadastro de loja pelo administrador: dados da loja, plano, situação e login do lojista. */
export function NewStoreModal({
  request,
  onClose,
  onCreated,
}: {
  request?: SellerRequest | null;
  onClose: () => void;
  onCreated: (vendorId: string) => void;
}) {
  const [f, setF] = useState({
    name: request?.business_name ?? "",
    slug: request ? slugify(request.business_name) : "",
    segment: request?.segment ?? "outros",
    city: request?.city ?? "Feijó",
    address: request?.address ?? "",
    phone: request?.phone ?? "",
    plan: "basico" as PlanKey,
    status: "ativo",
    ownerName: request?.owner_name ?? "",
    ownerEmail: request?.email ?? "",
    ownerPassword: genPassword(),
  });
  const [slugTouched, setSlugTouched] = useState(!!request);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ id: string; linked: boolean } | null>(null);

  useEffect(() => {
    if (!slugTouched) setF((cur) => ({ ...cur, slug: slugify(cur.name) }));
  }, [f.name, slugTouched]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [busy, onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    if (f.ownerEmail && f.ownerPassword.length < 6)
      return setErr("A senha de acesso precisa ter pelo menos 6 caracteres.");
    setBusy(true);
    try {
      const r = await createVendor({ ...f, requestId: request?.id ?? null });
      setDone({ id: r.id, linked: r.linked_existing });
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Não foi possível criar a loja.");
    } finally {
      setBusy(false);
    }
  }

  const credentials = `Loja: ${f.name}\nEndereço: ${typeof window !== "undefined" ? window.location.origin : ""}/${f.slug}\nPainel do lojista: ${typeof window !== "undefined" ? window.location.origin : ""}/lojista\nE-mail: ${f.ownerEmail}\nSenha: ${f.ownerPassword}`;

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-store-title"
        className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-card shadow-2xl ring-1 ring-white/10"
      >
        <header className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <Store size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="new-store-title" className="text-lg font-extrabold leading-tight">
              {request ? "Criar loja a partir da solicitação" : "Nova loja"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Você cadastra a loja, define o acesso do lojista e decide quando ela vai ao ar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Fechar"
            className="grid size-9 place-items-center rounded-full hover:bg-muted"
          >
            <X size={18} />
          </button>
        </header>

        {done ? (
          <div className="grid gap-4 overflow-y-auto p-5">
            <p className="rounded-2xl bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              Loja criada {f.status === "ativo" ? "e já no ar" : "como pendente (ainda fora do ar)"}
              .
              {done.linked
                ? " O e-mail já tinha conta: a loja foi vinculada a ela e a senha atual da conta foi mantida."
                : f.ownerEmail
                  ? " O login do lojista foi criado com o e-mail já confirmado."
                  : " A loja ficou na sua conta; crie o login depois, na ficha da loja."}
            </p>
            {f.ownerEmail && !done.linked && (
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-sm font-bold">Dados de acesso para enviar ao lojista</p>
                <pre className="mt-2 whitespace-pre-wrap break-all rounded-xl bg-muted/60 p-3 font-mono text-[12.5px]">
                  {credentials}
                </pre>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard?.writeText(credentials)}
                  className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold hover:bg-muted"
                >
                  <Copy size={14} /> Copiar dados de acesso
                </button>
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => onCreated(done.id)}
                className="h-10 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:brightness-110"
              >
                Abrir ficha da loja
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-5 overflow-y-auto p-5">
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
                Dados da loja
              </legend>
              <label className="text-[13px] font-semibold sm:col-span-2">
                Nome da loja
                <input
                  className={field}
                  value={f.name}
                  onChange={(e) => setF({ ...f, name: e.target.value })}
                  maxLength={80}
                  required
                  autoFocus
                />
              </label>
              <label className="text-[13px] font-semibold">
                Endereço no site
                <span className="mt-1 flex items-center rounded-xl border border-border bg-surface pl-3 text-sm">
                  <span className="text-muted-foreground">nextvita.life/</span>
                  <input
                    className="h-10 min-w-0 flex-1 bg-transparent pr-3 font-mono outline-none"
                    value={f.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setF({ ...f, slug: slugify(e.target.value) });
                    }}
                    required
                    aria-label="Endereço da loja no site"
                  />
                </span>
              </label>
              <div className="text-[13px] font-semibold">
                Segmento
                <NiceSelect
                  className="mt-1"
                  ariaLabel="Segmento"
                  value={f.segment}
                  onChange={(v) => setF({ ...f, segment: v })}
                  options={SEGMENTS.map((s) => ({ value: s.key, label: s.label }))}
                />
              </div>
              <label className="text-[13px] font-semibold">
                WhatsApp (com DDD)
                <input
                  className={field}
                  inputMode="tel"
                  value={f.phone}
                  onChange={(e) => setF({ ...f, phone: e.target.value })}
                  placeholder="68 99999-0000"
                  required
                />
              </label>
              <label className="text-[13px] font-semibold">
                Cidade
                <input
                  className={field}
                  value={f.city}
                  onChange={(e) => setF({ ...f, city: e.target.value })}
                  required
                />
              </label>
              <label className="text-[13px] font-semibold sm:col-span-2">
                Endereço (rua, bairro)
                <input
                  className={field}
                  value={f.address}
                  onChange={(e) => setF({ ...f, address: e.target.value })}
                  maxLength={200}
                />
              </label>
            </fieldset>

            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
                Plano e situação
              </legend>
              <div className="text-[13px] font-semibold">
                Plano
                <NiceSelect
                  className="mt-1"
                  ariaLabel="Plano"
                  value={f.plan}
                  onChange={(v) => setF({ ...f, plan: v as PlanKey })}
                  options={(Object.keys(PLANS) as PlanKey[]).map((k) => ({
                    value: k,
                    label: PLANS[k].label,
                    hint: `${money(PLANS[k].feeCents)}/mês + ${pct(PLANS[k].bps)}`,
                  }))}
                />
              </div>
              <div className="text-[13px] font-semibold">
                Situação inicial
                <NiceSelect
                  className="mt-1"
                  ariaLabel="Situação inicial"
                  value={f.status}
                  onChange={(v) => setF({ ...f, status: v })}
                  options={[
                    { value: "ativo", label: "Ativa", hint: "Já aparece no site" },
                    { value: "pendente", label: "Pendente", hint: "Fora do ar até você ativar" },
                  ]}
                />
              </div>
            </fieldset>

            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
                Login do lojista
              </legend>
              <label className="text-[13px] font-semibold">
                Nome do responsável
                <input
                  className={field}
                  value={f.ownerName}
                  onChange={(e) => setF({ ...f, ownerName: e.target.value })}
                />
              </label>
              <label className="text-[13px] font-semibold">
                E-mail de acesso
                <input
                  type="email"
                  className={field}
                  value={f.ownerEmail}
                  onChange={(e) => setF({ ...f, ownerEmail: e.target.value })}
                  placeholder="lojista@email.com"
                />
              </label>
              <label className="text-[13px] font-semibold sm:col-span-2">
                Senha de acesso
                <span className="mt-1 flex gap-2">
                  <input
                    className={`${field} mt-0 font-mono`}
                    value={f.ownerPassword}
                    onChange={(e) => setF({ ...f, ownerPassword: e.target.value })}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setF({ ...f, ownerPassword: genPassword() })}
                    className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold hover:bg-muted"
                  >
                    <RefreshCw size={14} /> Gerar
                  </button>
                </span>
                <span className="mt-1 block text-[11.5px] font-normal text-muted-foreground">
                  Deixe o e-mail vazio para criar o login depois. Se o e-mail já tiver conta, a loja
                  é vinculada a ela.
                </span>
              </label>
            </fieldset>

            {err && (
              <p
                role="alert"
                className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-700 dark:text-rose-300"
              >
                {err}
              </p>
            )}
            <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2 border-t border-border bg-card px-5 py-3">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="h-10 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
              >
                {busy && <Loader2 size={15} className="animate-spin" />}
                Criar loja
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
