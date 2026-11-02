import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, Coffee, Droplets, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type BeverageKind = "cha" | "agua" | "suco" | "cafe" | "outra";
type Beverage = {
  id: string;
  kind: BeverageKind;
  name: string;
  amount_ml: number;
  notes: string;
  consumed_at: string;
};

const kinds: {value: BeverageKind; label: string}[] = [
  { value: "cha", label: "Chá" },
  { value: "agua", label: "Água" },
  { value: "suco", label: "Suco" },
  { value: "cafe", label: "Café" },
  { value: "outra", label: "Outra bebida" },
];

const formatStamp = (iso: string) => new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Rio_Branco",
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
}).format(new Date(iso));

export function ClientBeverageTracker({
  patientId, ownerId, revision, onRecorded,
}: {
  patientId: string;
  ownerId: string;
  revision: number;
  onRecorded?: () => void;
}) {
  const [kind, setKind] = useState<BeverageKind>("cha");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("200");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Beverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      const result = await (supabase as any).from("care_client_beverages")
        .select("id,kind,name,amount_ml,notes,consumed_at")
        .eq("patient_id", patientId).eq("owner_id", ownerId)
        .order("consumed_at", { ascending: false }).limit(30);
      if (!active) return;
      if (result.error) setError("Não foi possível consultar as bebidas registradas.");
      else { setItems(result.data ?? []); setError(""); }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [patientId, ownerId, revision, reload]);

  async function saveBeverage() {
    if (saving) return;
    const volume = Number(amount);
    if (name.trim().length < 2 || name.trim().length > 100) {
      setError("Informe o nome da bebida (entre 2 e 100 caracteres).");
      return;
    }
    if (!Number.isInteger(volume) || volume < 10 || volume > 1500) {
      setError("Informe uma quantidade válida de 10 a 1.500 ml.");
      return;
    }
    if (notes.length > 300) {
      setError("As observações devem ter no máximo 300 caracteres.");
      return;
    }
    setSaving(true);
    setError(""); setNotice("");
    try {
      const result = await (supabase as any).rpc("care_log_client_beverage", {
        p_patient_id: patientId,
        p_kind: kind,
        p_name: name.trim(),
        p_amount_ml: volume,
        p_notes: notes.trim(),
      });
      if (result.error) throw result.error;
      if (typeof result.data !== "string" || !Number.isFinite(Date.parse(result.data))) {
        throw new Error("Missing server timestamp");
      }
      setNotice(`Bebida registrada no seu prontuário em ${formatStamp(result.data)} (Acre).`);
      setName(""); setNotes(""); setAmount("200");
      setReload(value => value + 1);
      onRecorded?.();
    } catch {
      setError("Não foi possível salvar a bebida. Confira sua conexão e o acesso ao seu prontuário.");
    } finally {
      setSaving(false);
    }
  }

  return <section aria-label="Cadastro de chás e bebidas" className="space-y-3">
    <header>
      <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
        <Coffee size={18} className="text-primary"/> Meus chás e bebidas
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Cadastre o que realmente bebeu. O sistema registra a data e a hora do servidor no seu acompanhamento.
      </p>
    </header>
    <form className="space-y-2 rounded-xl border border-border bg-muted/25 p-3" onSubmit={event => { event.preventDefault(); void saveBeverage(); }}>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-semibold text-foreground">Tipo de bebida
          <select className="field mt-1 w-full" value={kind} onChange={event => setKind(event.target.value as BeverageKind)}>
            {kinds.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-foreground">Quantidade (ml)
          <input className="field mt-1 w-full" type="number" min="10" max="1500" step="1" required
            value={amount} onChange={event => setAmount(event.target.value)}/>
        </label>
      </div>
      <label className="block text-xs font-semibold text-foreground">Nome do chá ou da bebida
        <input className="field mt-1 w-full" type="text" maxLength={100} required value={name}
          placeholder={kind === "cha" ? "Ex.: chá de camomila" : "Ex.: suco de maçã"}
          onChange={event => setName(event.target.value)}/>
      </label>
      <label className="block text-xs font-semibold text-foreground">Observações (opcional)
        <input className="field mt-1 w-full" type="text" maxLength={300} value={notes}
          placeholder="Ex.: sem açúcar, temperatura ambiente"
          onChange={event => setNotes(event.target.value)}/>
      </label>
      <button type="submit" disabled={saving} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-60">
        <Save size={16}/> {saving ? "Salvando…" : "Registrar bebida agora"}
      </button>
      <p className="text-[10px] text-muted-foreground">O registro indica consumo declarado pelo cliente, não recomendação médica. As bebidas não alteram automaticamente a meta do programa de água.</p>
    </form>
    {error && <p role="alert" className="rounded-lg border border-destructive/30 p-2 text-xs text-destructive">{error}</p>}
    {notice && <p role="status" className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 p-2 text-xs text-foreground"><CheckCircle2 size={15} className="shrink-0 text-success"/>{notice}</p>}
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-extrabold text-foreground">Bebidas registradas</h4>
        <span className="text-[10px] text-muted-foreground">Últimos 30 registros</span>
      </div>
      {loading ? <p className="text-xs text-muted-foreground">Carregando bebidas…</p>
        : items.length === 0 ? <p className="rounded-lg border border-border p-3 text-xs text-muted-foreground">Nenhuma bebida registrada ainda.</p>
        : <div className="space-y-1.5">
          {items.map(item => <article key={item.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5">
            <Droplets size={17} className="shrink-0 text-primary"/>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{item.name} · {item.amount_ml} ml</p>
              <p className="text-[10px] text-muted-foreground">{kinds.find(option => option.value === item.kind)?.label ?? "Bebida"}{item.notes ? ` · ${item.notes}` : ""}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground"><Clock3 size={12}/>{formatStamp(item.consumed_at)}</span>
          </article>)}
        </div>}
    </div>
  </section>;
}
