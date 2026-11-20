import { useState, type FormEvent } from "react";
import { Check, Copy, Download, ExternalLink, ImagePlus, Printer, ReceiptText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  centsToInput,
  money,
  parseMoney,
  PLANS,
  pct,
  type Invoice,
  type Vendor,
} from "@/lib/marketplace";
import {
  btn,
  downloadQrPng,
  downloadStoreCard,
  initialsOf,
  inputCls,
  Panel,
  printStorePoster,
  QrImage,
  shortStoreUrl,
  socialLinks,
} from "./shared";
import { uploadStoreImage } from "./SellerProducts";

const SWATCHES = [
  "#0e7a5f",
  "#1d4ed8",
  "#be123c",
  "#166534",
  "#4d7c0f",
  "#be185d",
  "#1e293b",
  "#b45309",
  "#7c3aed",
  "#0891b2",
];

/** Identidade, contato, entrega e divulgação da loja: logo, cor, endereço, WhatsApp, link e QR. */
export function SellerStore({
  vendor,
  invoices,
  onChanged,
}: {
  vendor: Vendor;
  invoices: Invoice[];
  onChanged: () => void;
}) {
  const [f, setF] = useState({
    name: vendor.name,
    description: vendor.description ?? "",
    phone: vendor.phone,
    city: vendor.city,
    address: vendor.address ?? "",
    hours: vendor.opening_hours ?? "",
    accent: vendor.accent_hex ?? "#0e7a5f",
    logo: vendor.logo_url ?? "",
    delivery: vendor.offers_delivery,
    pickup: vendor.offers_pickup,
    fee: centsToInput(vendor.delivery_fee_cents),
    free: centsToInput(vendor.free_delivery_from_cents),
    area: vendor.delivery_area ?? "",
    prep: String(vendor.prep_minutes ?? 30),
    deliv: String(vendor.delivery_minutes ?? 120),
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const url = shortStoreUrl(vendor.slug);
  const plan = PLANS[vendor.plan];

  async function save(e: FormEvent) {
    e.preventDefault();
    const digits = f.phone.replace(/\D/g, "");
    if (f.name.trim().length < 2) return setErr("Informe o nome da loja.");
    if (digits.length < 10 || digits.length > 13) return setErr("Informe o WhatsApp com DDD.");
    if (!f.delivery && !f.pickup) return setErr("Escolha pelo menos entrega ou retirada.");
    const fee = f.fee.trim() ? parseMoney(f.fee) : 0;
    const free = f.free.trim() ? parseMoney(f.free) : null;
    const prep = Number(f.prep);
    const deliv = Number(f.deliv);
    if (fee === null) return setErr("Taxa de entrega inválida.");
    if (!(prep >= 5 && prep <= 1440) || !(deliv >= 10 && deliv <= 10080))
      return setErr("Confira os prazos: preparo de 5 a 1440 min e entrega de 10 a 10080 min.");
    setErr("");
    const { error } = await (supabase as any)
      .from("care_store_vendors")
      .update({
        name: f.name.trim(),
        description: f.description.trim() || null,
        phone: f.phone.trim(),
        city: f.city.trim() || "Feijó",
        address: f.address.trim() || null,
        opening_hours: f.hours.trim() || null,
        accent_hex: f.accent,
        logo_url: f.logo || null,
        offers_delivery: f.delivery,
        offers_pickup: f.pickup,
        delivery_fee_cents: fee,
        free_delivery_from_cents: free,
        delivery_area: f.area.trim() || null,
        prep_minutes: prep,
        delivery_minutes: deliv,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vendor.id);
    if (error) return setErr("Não foi possível salvar. Tente de novo.");
    setMsg("Dados da loja salvos.");
    onChanged();
  }
  async function upload(file?: File) {
    if (!file) return;
    try {
      const link = await uploadStoreImage(vendor.id, file, "logo");
      setF((x) => ({ ...x, logo: link }));
      setErr("");
      setMsg("Logo enviada. Salve para aplicar.");
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setMsg(url);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <form onSubmit={save} className="grid content-start gap-4">
        <Panel title="Identidade">
          <div className="grid gap-4 p-4 sm:grid-cols-[auto_minmax(0,1fr)]">
            <div className="grid justify-items-center gap-2">
              <span
                className="grid size-24 place-items-center overflow-hidden rounded-2xl text-2xl font-black text-white shadow-md"
                style={{ background: f.accent }}
              >
                {f.logo ? (
                  <img
                    src={f.logo}
                    alt="Logo da loja"
                    className="size-full bg-white object-cover"
                  />
                ) : (
                  f.name
                    .split(/\s+/)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                )}
              </span>
              <label className={`${btn.ghost} cursor-pointer`}>
                <ImagePlus size={14} /> Logo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(e) => void upload(e.target.files?.[0])}
                />
              </label>
              {f.logo && (
                <button
                  type="button"
                  onClick={() => setF({ ...f, logo: "" })}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Remover logo
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-[13px] font-semibold sm:col-span-2">
                Nome da loja
                <input
                  className={inputCls}
                  value={f.name}
                  onChange={(e) => setF({ ...f, name: e.target.value })}
                  maxLength={80}
                />
              </label>
              <label className="text-[13px] font-semibold sm:col-span-2">
                Apresentação
                <textarea
                  className={`${inputCls} h-20 py-2`}
                  value={f.description}
                  onChange={(e) => setF({ ...f, description: e.target.value })}
                  maxLength={500}
                />
              </label>
              <fieldset className="sm:col-span-2">
                <legend className="text-[13px] font-semibold">Cor da loja</legend>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setF({ ...f, accent: c })}
                      aria-label={`Usar a cor ${c}`}
                      aria-pressed={f.accent === c}
                      className="grid size-8 place-items-center rounded-full ring-offset-2 ring-offset-card transition aria-pressed:ring-2"
                      style={{ background: c, ["--tw-ring-color" as string]: c }}
                    >
                      {f.accent === c && <Check size={14} className="text-white" />}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={f.accent}
                    onChange={(e) => setF({ ...f, accent: e.target.value })}
                    aria-label="Escolher outra cor"
                    className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
                  />
                </div>
              </fieldset>
            </div>
          </div>
        </Panel>
        <Panel title="Contato e endereço">
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <label className="text-[13px] font-semibold">
              WhatsApp com DDD
              <input
                className={inputCls}
                inputMode="tel"
                value={f.phone}
                onChange={(e) => setF({ ...f, phone: e.target.value })}
              />
            </label>
            <label className="text-[13px] font-semibold">
              Cidade
              <input
                className={inputCls}
                value={f.city}
                onChange={(e) => setF({ ...f, city: e.target.value })}
                maxLength={80}
              />
            </label>
            <label className="text-[13px] font-semibold sm:col-span-2">
              Endereço
              <input
                className={inputCls}
                value={f.address}
                onChange={(e) => setF({ ...f, address: e.target.value })}
                maxLength={200}
                placeholder="Rua, número e bairro"
              />
            </label>
            <label className="text-[13px] font-semibold sm:col-span-2">
              Horário de atendimento
              <input
                className={inputCls}
                value={f.hours}
                onChange={(e) => setF({ ...f, hours: e.target.value })}
                maxLength={120}
                placeholder="Seg a sáb · 8h às 18h"
              />
            </label>
          </div>
        </Panel>
        <Panel title="Entrega, retirada e prazos">
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-[13px] font-semibold">
              <input
                type="checkbox"
                checked={f.pickup}
                onChange={(e) => setF({ ...f, pickup: e.target.checked })}
                className="size-4"
              />{" "}
              Retirada na loja
            </label>
            <label className="flex items-center gap-2 text-[13px] font-semibold">
              <input
                type="checkbox"
                checked={f.delivery}
                onChange={(e) => setF({ ...f, delivery: e.target.checked })}
                className="size-4"
              />{" "}
              Entrega
            </label>
            <label className="text-[13px] font-semibold">
              Tempo de preparo (min)
              <input
                className={inputCls}
                inputMode="numeric"
                value={f.prep}
                onChange={(e) => setF({ ...f, prep: e.target.value.replace(/\D/g, "") })}
              />
            </label>
            <label className="text-[13px] font-semibold">
              Prazo de entrega (min)
              <input
                className={inputCls}
                inputMode="numeric"
                value={f.deliv}
                onChange={(e) => setF({ ...f, deliv: e.target.value.replace(/\D/g, "") })}
                disabled={!f.delivery}
              />
            </label>
            <label className="text-[13px] font-semibold">
              Taxa de entrega
              <input
                className={inputCls}
                inputMode="decimal"
                value={f.fee}
                onChange={(e) => setF({ ...f, fee: e.target.value })}
                disabled={!f.delivery}
                placeholder="0,00"
              />
            </label>
            <label className="text-[13px] font-semibold">
              Entrega grátis a partir de
              <input
                className={inputCls}
                inputMode="decimal"
                value={f.free}
                onChange={(e) => setF({ ...f, free: e.target.value })}
                disabled={!f.delivery}
                placeholder="Opcional"
              />
            </label>
            <label className="text-[13px] font-semibold sm:col-span-2">
              Área de entrega
              <input
                className={inputCls}
                value={f.area}
                onChange={(e) => setF({ ...f, area: e.target.value })}
                disabled={!f.delivery}
                maxLength={200}
                placeholder="Bairros ou cidades atendidas"
              />
            </label>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              O timer de cada pedido começa quando o pagamento é confirmado: preparo para retirada,
              prazo de entrega para entregas.
            </p>
          </div>
        </Panel>
        {(err || msg) && (
          <p
            role={err ? "alert" : "status"}
            className={`rounded-lg px-3 py-2 text-sm ${err ? "bg-rose-500/10 text-rose-700 dark:text-rose-300" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}
          >
            {err || msg}
          </p>
        )}
        <div className="flex justify-end">
          <button type="submit" className={btn.primary}>
            Salvar dados da loja
          </button>
        </div>
      </form>

      <div className="grid content-start gap-4">
        <Panel title="Divulgar a loja">
          <div className="grid justify-items-center gap-3 p-4">
            <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-border">
              <QrImage
                text={url}
                size={176}
                color="#0f172a"
                label={`QR Code da loja ${vendor.name}`}
                badge={{
                  initials: initialsOf(vendor.name),
                  color: vendor.accent_hex ?? "#0e7a5f",
                  logo: vendor.logo_url,
                }}
              />
            </div>
            <p className="w-full truncate rounded-lg bg-muted px-3 py-2 text-center font-mono text-xs">
              {url.replace("https://", "")}
            </p>
            <div className="grid w-full grid-cols-2 gap-2">
              <button type="button" onClick={() => void copy()} className={btn.ghost}>
                {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
                {copied ? "Copiado" : "Copiar link"}
              </button>
              <button
                type="button"
                onClick={() => void downloadStoreCard(vendor)}
                className={btn.ghost}
              >
                <Download size={14} /> Cartão stories
              </button>
              <button
                type="button"
                onClick={() => void downloadQrPng(url, `qr-${vendor.slug}.png`)}
                className={btn.ghost}
              >
                <Download size={14} /> Baixar QR
              </button>
              <button
                type="button"
                onClick={() => printStorePoster(vendor, url, vendor.accent_hex ?? "#0e7a5f")}
                className={btn.ghost}
              >
                <Printer size={14} /> Cartaz
              </button>
            </div>
            <div className="grid w-full grid-cols-4 gap-1.5">
              {socialLinks(vendor.name, url).map((l) => (
                <a
                  key={l.key}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-9 place-items-center rounded-lg text-[11.5px] font-bold text-white transition hover:brightness-110"
                  style={{ background: l.color }}
                >
                  {l.label}
                </a>
              ))}
            </div>
            <a
              href={`/loja?loja=${vendor.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${btn.primary} w-full`}
            >
              <ExternalLink size={14} /> Ver página pública
            </a>
          </div>
        </Panel>
        <Panel
          title={
            <span className="flex items-center gap-2">
              <ReceiptText size={15} /> Plano e contribuição
            </span>
          }
        >
          <div className="grid gap-2 p-4 text-[13px]">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Plano</span>
              <strong>{plan.label}</strong>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Mensalidade</span>
              <strong className="tabular-nums">{money(vendor.monthly_fee_cents)}</strong>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Contribuição por venda</span>
              <strong>{pct(vendor.commission_bps)}</strong>
            </p>
            <p className="text-xs leading-snug text-muted-foreground">
              A contribuição é descontada de cada venda paga e aparece no caixa. A NextVita fecha a
              cobrança no fim do mês.
            </p>
          </div>
          <ul className="divide-y divide-border border-t border-border text-[13px]">
            {invoices.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 px-4 py-2">
                <span>
                  {i.period.slice(5)}/{i.period.slice(0, 4)} · vence{" "}
                  {new Date(i.due_date + "T12:00").toLocaleDateString("pt-BR")}
                </span>
                <span className="flex items-center gap-2">
                  <strong className="tabular-nums">{money(i.total_due_cents)}</strong>
                  <span
                    className={`rounded-full px-1.5 text-[11px] font-semibold ${i.status === "pago" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}
                  >
                    {i.status}
                  </span>
                </span>
              </li>
            ))}
            {!invoices.length && (
              <li className="px-4 py-4 text-center text-xs text-muted-foreground">
                Nenhuma cobrança fechada ainda.
              </li>
            )}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
