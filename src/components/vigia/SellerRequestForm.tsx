import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { SEGMENTS } from "@/lib/marketplace";
import { submitSellerRequest } from "@/lib/admin-stores";
import { NiceSelect } from "./NiceSelect";

const field =
  "mt-1 block h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-normal";

/**
 * Quem quer vender na NextVita envia uma solicitação. A administração avalia,
 * cria a loja com o e-mail e a senha de acesso e coloca a loja no ar.
 */
export function SellerRequestForm() {
  const [f, setF] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    phone: "",
    segment: "outros",
    city: "Feijó",
    address: "",
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    if (f.phone.replace(/\D/g, "").length < 10)
      return setErr("Informe o WhatsApp com DDD, por exemplo 68 99999-0000.");
    setBusy(true);
    try {
      await submitSellerRequest(f);
      setSent(true);
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Não foi possível enviar agora.");
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <section className="grid place-items-center gap-3 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <CheckCircle2 size={36} className="text-emerald-600 dark:text-emerald-400" />
        <h2 className="text-xl font-extrabold">Solicitação enviada</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Nossa equipe vai avaliar e falar com você pelo WhatsApp ou e-mail informado. Quando a loja
          for aprovada, você recebe o e-mail e a senha para entrar no painel do lojista.
        </p>
      </section>
    );

  return (
    <section
      aria-labelledby="seller-request-title"
      className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-8"
    >
      <h2 id="seller-request-title" className="text-2xl font-extrabold tracking-tight">
        Quero vender na NextVita
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Conte um pouco sobre o seu negócio. A administração avalia cada pedido, monta a sua loja e
        envia o seu acesso. Não precisa criar conta agora.
      </p>
      <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-[13px] font-semibold">
          Nome da loja ou do negócio
          <input
            className={field}
            value={f.businessName}
            onChange={(e) => setF({ ...f, businessName: e.target.value })}
            maxLength={80}
            required
          />
        </label>
        <label className="text-[13px] font-semibold">
          Seu nome
          <input
            className={field}
            value={f.ownerName}
            onChange={(e) => setF({ ...f, ownerName: e.target.value })}
            maxLength={80}
            required
          />
        </label>
        <label className="text-[13px] font-semibold">
          E-mail
          <input
            type="email"
            className={field}
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })}
            required
          />
        </label>
        <label className="text-[13px] font-semibold">
          WhatsApp (com DDD)
          <input
            inputMode="tel"
            className={field}
            value={f.phone}
            onChange={(e) => setF({ ...f, phone: e.target.value })}
            placeholder="68 99999-0000"
            required
          />
        </label>
        <div className="text-[13px] font-semibold">
          O que você vende
          <NiceSelect
            className="mt-1"
            ariaLabel="Segmento"
            value={f.segment}
            onChange={(v) => setF({ ...f, segment: v })}
            options={SEGMENTS.map((s) => ({ value: s.key, label: s.label }))}
          />
        </div>
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
          Endereço da loja (opcional)
          <input
            className={field}
            value={f.address}
            onChange={(e) => setF({ ...f, address: e.target.value })}
            maxLength={200}
          />
        </label>
        <label className="text-[13px] font-semibold sm:col-span-2">
          Conte sobre os seus produtos (opcional)
          <textarea
            className="mt-1 block min-h-24 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-normal"
            value={f.message}
            onChange={(e) => setF({ ...f, message: e.target.value })}
            maxLength={1000}
          />
        </label>
        {err && (
          <p
            role="alert"
            className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-700 dark:text-rose-300 sm:col-span-2"
          >
            {err}
          </p>
        )}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-extrabold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Enviar solicitação
          </button>
        </div>
      </form>
    </section>
  );
}
