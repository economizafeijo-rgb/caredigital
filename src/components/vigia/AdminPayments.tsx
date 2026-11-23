import { useEffect, useState } from "react";
import {
  Banknote,
  CreditCard,
  KeyRound,
  QrCode,
  Receipt,
  Save,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";

type Settings = {
  pix_key: string | null;
  pix_holder: string | null;
  pix_city: string | null;
  accept_pix: boolean;
  accept_card: boolean;
  accept_boleto: boolean;
  accept_cash: boolean;
  default_commission_bps: number;
  fee_basico_cents: number;
  fee_vitrine_cents: number;
  fee_destaque_cents: number;
  due_day: number;
};
const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const toCents = (v: string) => {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
};

/** Sistema de pagamento: recebimento (PIX), formas aceitas, planos dos lojistas, comissão e vencimento. */
export function AdminPayments() {
  const dialog = useDialog();
  const [s, setS] = useState<Settings | null>(null);
  const [fees, setFees] = useState({ basico: "", vitrine: "", destaque: "", commission: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [billing, setBilling] = useState<{ open: number; paid: number; overdue: number } | null>(
    null,
  );
  const db = supabase as any;

  useEffect(() => {
    let active = true;
    void Promise.all([
      db.from("care_platform_settings").select("*").maybeSingle(),
      db.from("care_store_vendor_invoices").select("*").limit(500),
    ]).then(([r, inv]: any[]) => {
      if (!active) return;
      if (r.error || !r.data) {
        setError("Não foi possível carregar as configurações de pagamento.");
        return;
      }
      setS(r.data);
      setFees({
        basico: (r.data.fee_basico_cents / 100).toFixed(2).replace(".", ","),
        vitrine: (r.data.fee_vitrine_cents / 100).toFixed(2).replace(".", ","),
        destaque: (r.data.fee_destaque_cents / 100).toFixed(2).replace(".", ","),
        commission: (r.data.default_commission_bps / 100).toString().replace(".", ","),
      });
      const rows: any[] = inv.data ?? [];
      const amount = (x: any) => Number(x.total_due_cents ?? 0);
      const isPaid = (x: any) => x.status === "paid" || x.status === "pago" || Boolean(x.paid_at);
      const t = new Date().toISOString().slice(0, 10);
      setBilling({
        paid: rows.filter(isPaid).reduce((a, x) => a + amount(x), 0),
        open: rows.filter((x) => !isPaid(x)).reduce((a, x) => a + amount(x), 0),
        overdue: rows
          .filter((x) => !isPaid(x) && x.due_date && x.due_date < t)
          .reduce((a, x) => a + amount(x), 0),
      });
    });
    return () => {
      active = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!s) return;
    const basico = toCents(fees.basico),
      vitrine = toCents(fees.vitrine),
      destaque = toCents(fees.destaque);
    const commission = Math.round(Number(fees.commission.replace(",", ".")) * 100);
    if ([basico, vitrine, destaque].some((v) => !Number.isFinite(v))) {
      setError("Mensalidades: use valores em reais, como 29,90.");
      return;
    }
    if (!Number.isFinite(commission) || commission < 0 || commission > 5000) {
      setError("Comissão entre 0 e 50%.");
      return;
    }
    if (s.accept_pix && (!s.pix_key || s.pix_key.trim().length < 3)) {
      setError("Informe a chave PIX ou desative o PIX.");
      return;
    }
    if (!s.accept_pix && !s.accept_card && !s.accept_boleto && !s.accept_cash) {
      setError("Ative pelo menos uma forma de pagamento.");
      return;
    }
    if (
      !(await dialog.confirm(
        "Salvar configurações de pagamento?",
        `Mensalidades ${brl(basico)} / ${brl(vitrine)} / ${brl(destaque)}, comissão ${fees.commission}% e vencimento no dia ${s.due_day}. Vale para as próximas cobranças.`,
        false,
        "Salvar",
      ))
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    const res = await db
      .from("care_platform_settings")
      .update({
        pix_key: s.pix_key?.trim() || null,
        pix_holder: s.pix_holder?.trim() || null,
        pix_city: s.pix_city?.trim() || null,
        accept_pix: s.accept_pix,
        accept_card: s.accept_card,
        accept_boleto: s.accept_boleto,
        accept_cash: s.accept_cash,
        default_commission_bps: commission,
        fee_basico_cents: basico,
        fee_vitrine_cents: vitrine,
        fee_destaque_cents: destaque,
        due_day: s.due_day,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    setBusy(false);
    if (res.error) {
      setError(res.error.message || "Não foi possível salvar.");
      return;
    }
    setNotice("Configurações salvas.");
  }

  const set = (patch: Partial<Settings>) => setS((v) => (v ? { ...v, ...patch } : v));
  const field = "mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm";
  const methods: [keyof Settings, string, typeof QrCode][] = [
    ["accept_pix", "PIX", QrCode],
    ["accept_card", "Cartão", CreditCard],
    ["accept_boleto", "Boleto", Receipt],
    ["accept_cash", "Dinheiro na entrega", Banknote],
  ];
  return (
    <section
      aria-label="Sistema de pagamento"
      className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
    >
      <header className="flex flex-wrap items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-700 to-teal-700 text-white">
          <Wallet size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold leading-tight">Sistema de pagamento</h2>
          <p className="text-xs text-muted-foreground">
            Recebimento, formas aceitas, planos dos lojistas, comissão e vencimento.
          </p>
        </div>
      </header>
      {billing && (
        <dl className="grid grid-cols-3 overflow-hidden rounded-xl border border-border">
          {[
            ["Recebido", billing.paid, "text-emerald-600 dark:text-emerald-400"],
            ["Em aberto", billing.open, ""],
            ["Vencido", billing.overdue, billing.overdue ? "text-rose-600 dark:text-rose-400" : ""],
          ].map(([l, v, c], i) => (
            <div key={l as string} className={`px-3 py-2 ${i ? "border-l border-border" : ""}`}>
              <dt className="text-[11px] font-semibold text-muted-foreground">{l as string}</dt>
              <dd className={`text-lg font-extrabold tabular-nums ${c}`}>{brl(v as number)}</dd>
            </div>
          ))}
        </dl>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
        >
          {notice}
        </p>
      )}
      {!s ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <fieldset className="grid gap-3 rounded-xl border border-border p-3">
            <legend className="px-1 text-sm font-bold">Formas de pagamento aceitas</legend>
            <div className="grid grid-cols-2 gap-2">
              {methods.map(([key, label, Icon]) => (
                <label
                  key={key}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${s[key] ? "border-primary/50 bg-primary/[.06]" : "border-border hover:bg-muted/50"}`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(s[key])}
                    onChange={(e) => set({ [key]: e.target.checked } as Partial<Settings>)}
                  />
                  <Icon size={15} className="text-primary" /> {label}
                </label>
              ))}
            </div>
            <label className="text-xs font-semibold">
              Chave PIX
              <input
                value={s.pix_key ?? ""}
                maxLength={120}
                onChange={(e) => set({ pix_key: e.target.value })}
                className={field}
                placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold">
                Titular
                <input
                  value={s.pix_holder ?? ""}
                  maxLength={80}
                  onChange={(e) => set({ pix_holder: e.target.value })}
                  className={field}
                />
              </label>
              <label className="text-xs font-semibold">
                Cidade
                <input
                  value={s.pix_city ?? ""}
                  maxLength={60}
                  onChange={(e) => set({ pix_city: e.target.value })}
                  className={field}
                  placeholder="Feijó"
                />
              </label>
            </div>
            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-500" /> Chaves secretas
              de gateway (cartão/boleto) não ficam nesta tela: são guardadas como segredos do
              servidor.
            </p>
          </fieldset>
          <fieldset className="grid content-start gap-3 rounded-xl border border-border p-3">
            <legend className="px-1 text-sm font-bold">Planos dos lojistas</legend>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["basico", "Básico"],
                  ["vitrine", "Vitrine"],
                  ["destaque", "Destaque"],
                ] as const
              ).map(([k, l]) => (
                <label key={k} className="text-xs font-semibold">
                  {l} (R$/mês)
                  <input
                    inputMode="decimal"
                    value={fees[k]}
                    onChange={(e) => setFees((f) => ({ ...f, [k]: e.target.value }))}
                    className={field}
                  />
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold">
                Comissão padrão (%)
                <input
                  inputMode="decimal"
                  value={fees.commission}
                  onChange={(e) => setFees((f) => ({ ...f, commission: e.target.value }))}
                  className={field}
                />
              </label>
              <label className="text-xs font-semibold">
                Dia de vencimento
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={s.due_day}
                  onChange={(e) =>
                    set({
                      due_day: Math.min(28, Math.max(1, Math.round(Number(e.target.value) || 1))),
                    })
                  }
                  className={field}
                />
              </label>
            </div>
            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <KeyRound size={13} className="mt-0.5 shrink-0" /> A comissão de cada loja pode ser
              ajustada individualmente em Lojas.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="mt-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-[.98] disabled:opacity-50"
            >
              <Save size={15} /> {busy ? "Salvando…" : "Salvar configurações"}
            </button>
          </fieldset>
        </div>
      )}
    </section>
  );
}
