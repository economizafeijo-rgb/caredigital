import { useEffect, useState, type FormEvent } from "react";
import { Bike, Check, Loader2, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { centsToInput, parseMoney, SEGMENTS, slugify, type Segment } from "@/lib/marketplace";
import { NiceSelect } from "./NiceSelect";

const field =
  "mt-1 block h-9 w-full rounded-none border border-border bg-surface px-2.5 text-sm outline-none transition-colors focus:border-[#0a7f78] focus:ring-1 focus:ring-[#0a7f78]/40";
const lab = "block text-[11px] font-semibold text-muted-foreground";

/** Cadastro da loja: fica "pendente" até o administrador aprovar. Plano, comissão e selo são definidos só pela plataforma. */
export function LojistaSignup({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [segment, setSegment] = useState<Segment>("suplementos");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Feijó");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [delivery, setDelivery] = useState(false);
  const [pickup, setPickup] = useState(true);
  const [fee, setFee] = useState("");
  const [freeFrom, setFreeFrom] = useState("");
  const [area, setArea] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Preenche com o que a pessoa informou no cadastro de parceiro.
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const md = data.user?.user_metadata ?? {};
      const p = md.partner ?? {};
      if (p.business_name) setName((v) => v || p.business_name);
      if (p.segment && SEGMENTS.some((s) => s.key === p.segment)) setSegment(p.segment as Segment);
      if (p.city && p.city !== "Outra") setCity(p.city);
      if (md.phone) setPhone((v) => v || md.phone);
    });
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (name.trim().length < 2) return setError("Informe o nome da loja.");
    if (phone.replace(/\D/g, "").length < 10) return setError("Informe o WhatsApp com DDD.");
    if (!delivery && !pickup) return setError("Escolha pelo menos uma forma: entrega ou retirada.");
    const feeCents = delivery ? (fee.trim() ? parseMoney(fee) : 0) : 0;
    const freeCents = delivery && freeFrom.trim() ? parseMoney(freeFrom) : null;
    if (feeCents === null || (delivery && freeFrom.trim() && freeCents === null))
      return setError("Confira os valores de frete.");
    setBusy(true);
    setError("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setBusy(false);
      return setError("Entre na sua conta para cadastrar a loja.");
    }
    const base = slugify(name) || "loja";
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 5)}`;
      const { error: err } = await (supabase as any).from("care_store_vendors").insert({
        owner_id: auth.user.id,
        name: name.trim(),
        slug,
        segment,
        description: description.trim() || null,
        phone: phone.trim(),
        city: city.trim() || "Feijó",
        address: address.trim() || null,
        offers_delivery: delivery,
        offers_pickup: pickup,
        delivery_fee_cents: feeCents,
        free_delivery_from_cents: freeCents,
        delivery_area: delivery ? area.trim() || null : null,
      });
      if (!err) {
        setBusy(false);
        onCreated();
        return;
      }
      if (err.code !== "23505") {
        setBusy(false);
        return setError("Não foi possível cadastrar agora. Tente novamente em instantes.");
      }
    }
    setBusy(false);
    setError("Já existe uma loja com esse nome. Acrescente o bairro ou a cidade ao nome.");
  }

  const chip = (on: boolean) =>
    `flex h-9 cursor-pointer items-center gap-2 border px-2.5 text-xs font-semibold transition-colors ${
      on
        ? "border-[#0a7f78] bg-[#0a7f78]/10 text-foreground"
        : "border-border bg-surface text-muted-foreground"
    }`;

  return (
    <form
      onSubmit={(e) => void submit(e)}
      aria-label="Cadastro da loja"
      className="nv-scan mx-auto grid w-full max-w-3xl gap-3 border border-border bg-card p-3.5 shadow-card"
      style={{ ["--ca" as string]: "#0a7f78" }}
    >
      <header className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center bg-gradient-to-br from-emerald-700 to-teal-700 text-white">
          <Store size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-base font-extrabold leading-tight">Cadastre sua loja</h2>
          <p className="text-xs text-muted-foreground">
            Leva poucos minutos. A equipe NextVita aprova e libera a sua vitrine.
          </p>
        </div>
      </header>
      <div className="grid gap-2.5 sm:grid-cols-6">
        <label className={`${lab} sm:col-span-3`}>
          Nome da loja
          <input
            className={field}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Ex.: Academia Fit Moda"
          />
        </label>
        <div className={`${lab} sm:col-span-3`}>
          Segmento
          <NiceSelect
            className="mt-1 h-9"
            ariaLabel="Segmento"
            value={segment}
            onChange={(v) => setSegment(v as Segment)}
            options={SEGMENTS.map((s) => ({ value: s.key, label: s.label, hint: s.hint }))}
          />
        </div>
        <label className={`${lab} sm:col-span-2`}>
          WhatsApp da loja
          <input
            className={field}
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(68) 90000-0000"
          />
        </label>
        <label className={`${lab} sm:col-span-2`}>
          Cidade
          <input
            className={field}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={80}
          />
        </label>
        <label className={`${lab} sm:col-span-2`}>
          Endereço (opcional)
          <input
            className={field}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={200}
            placeholder="Rua, número, bairro"
          />
        </label>
        <label className={`${lab} sm:col-span-6`}>
          Sobre a loja (opcional)
          <textarea
            className={`${field} h-14 resize-none py-1.5`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            placeholder="O que você vende e o que a sua loja tem de especial"
          />
        </label>
      </div>
      <fieldset className="grid gap-2 border border-border bg-muted/40 p-2.5">
        <legend className="px-1 text-xs font-bold">Como o cliente recebe</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className={chip(pickup)}>
            <input
              type="checkbox"
              checked={pickup}
              onChange={(e) => setPickup(e.target.checked)}
              className="sr-only"
            />
            <span
              className={`grid size-4 place-items-center border ${pickup ? "border-[#0a7f78] bg-[#0a7f78] text-white" : "border-border"}`}
            >
              {pickup && <Check size={11} />}
            </span>
            <Store size={14} /> Retirada na loja
          </label>
          <label className={chip(delivery)}>
            <input
              type="checkbox"
              checked={delivery}
              onChange={(e) => setDelivery(e.target.checked)}
              className="sr-only"
            />
            <span
              className={`grid size-4 place-items-center border ${delivery ? "border-[#0a7f78] bg-[#0a7f78] text-white" : "border-border"}`}
            >
              {delivery && <Check size={11} />}
            </span>
            <Bike size={14} /> Entrega (delivery)
          </label>
        </div>
        {delivery && (
          <div className="grid gap-2.5 sm:grid-cols-3">
            <label className={lab}>
              Taxa de entrega (R$)
              <input
                className={field}
                inputMode="decimal"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder={centsToInput(800)}
              />
            </label>
            <label className={lab}>
              Frete grátis a partir de (R$)
              <input
                className={field}
                inputMode="decimal"
                value={freeFrom}
                onChange={(e) => setFreeFrom(e.target.value)}
                placeholder="opcional"
              />
            </label>
            <label className={lab}>
              Área atendida
              <input
                className={field}
                value={area}
                onChange={(e) => setArea(e.target.value)}
                maxLength={200}
                placeholder="Ex.: Centro e bairros"
              />
            </label>
          </div>
        )}
      </fieldset>
      {error && (
        <p
          role="alert"
          className="border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive"
        >
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-muted-foreground sm:max-w-[26rem]">
          Ao cadastrar, você concorda com a mensalidade do plano e a comissão sobre as vendas,
          conforme os planos exibidos.
        </p>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 bg-gradient-to-r from-emerald-700 to-teal-700 px-5 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 className="animate-spin" size={16} /> Enviando…
            </>
          ) : (
            "Enviar para aprovação"
          )}
        </button>
      </div>
    </form>
  );
}
