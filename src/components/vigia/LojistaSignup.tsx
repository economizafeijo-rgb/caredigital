import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { centsToInput, parseMoney, SEGMENTS, slugify, type Segment } from "@/lib/marketplace";
import { NiceSelect } from "./NiceSelect";

const field = "mt-1 block h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm";

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

  return (
    <form
      onSubmit={(e) => void submit(e)}
      aria-label="Cadastro da loja"
      className="grid gap-4 rounded-3xl border border-border bg-card p-5 shadow-card sm:p-7"
    >
      <header className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
          <Store size={24} />
        </span>
        <div>
          <h2 className="font-display text-2xl font-extrabold">Cadastre sua loja</h2>
          <p className="text-sm text-muted-foreground">
            Leva poucos minutos. A equipe NextVita aprova e libera a sua vitrine.
          </p>
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Nome da loja
          <input
            className={field}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Ex.: Academia Fit Moda"
          />
        </label>
        <div className="text-sm font-semibold">
          Segmento
          <NiceSelect
            className="mt-1 h-11"
            ariaLabel="Segmento"
            value={segment}
            onChange={(v) => setSegment(v as Segment)}
            options={SEGMENTS.map((s) => ({ value: s.key, label: s.label, hint: s.hint }))}
          />
        </div>
        <label className="text-sm font-semibold">
          WhatsApp da loja
          <input
            className={field}
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(68) 90000-0000"
          />
        </label>
        <label className="text-sm font-semibold">
          Cidade
          <input
            className={field}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={80}
          />
        </label>
        <label className="text-sm font-semibold sm:col-span-2">
          Endereço da loja (opcional)
          <input
            className={field}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={200}
            placeholder="Rua, número, bairro"
          />
        </label>
        <label className="text-sm font-semibold sm:col-span-2">
          Sobre a loja (opcional)
          <textarea
            className={`${field} h-24 py-2`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            placeholder="O que você vende e o que a sua loja tem de especial"
          />
        </label>
      </div>
      <fieldset className="grid gap-3 rounded-2xl bg-muted/50 p-4">
        <legend className="px-1 text-sm font-bold">Como o cliente recebe</legend>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={pickup}
            onChange={(e) => setPickup(e.target.checked)}
            className="size-5 accent-emerald-600"
          />{" "}
          Retirada na loja
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={delivery}
            onChange={(e) => setDelivery(e.target.checked)}
            className="size-5 accent-emerald-600"
          />{" "}
          Entrega (delivery)
        </label>
        {delivery && (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold">
              Taxa de entrega (R$)
              <input
                className={field}
                inputMode="decimal"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder={centsToInput(800)}
              />
            </label>
            <label className="text-xs font-semibold">
              Frete grátis a partir de (R$)
              <input
                className={field}
                inputMode="decimal"
                value={freeFrom}
                onChange={(e) => setFreeFrom(e.target.value)}
                placeholder="opcional"
              />
            </label>
            <label className="text-xs font-semibold">
              Área atendida
              <input
                className={field}
                value={area}
                onChange={(e) => setArea(e.target.value)}
                maxLength={200}
                placeholder="Ex.: Centro e bairros próximos"
              />
            </label>
          </div>
        )}
      </fieldset>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-lg font-extrabold text-white shadow-lg disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 className="animate-spin" size={20} /> Enviando…
          </>
        ) : (
          "Enviar minha loja para aprovação"
        )}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        Ao cadastrar, você concorda com a cobrança de mensalidade do plano e comissão sobre as
        vendas, conforme os planos exibidos.
      </p>
    </form>
  );
}
