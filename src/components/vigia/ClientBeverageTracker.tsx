import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, Coffee, Droplets, Save } from "lucide-react";
import { CareIntakePicker, CareIntakeIcon } from "./CareIntakePicker";
import { beverageKinds,beverageCategory,type BeverageKind } from "@/lib/care-intake-categories";
import { supabase } from "@/integrations/supabase/client";

type Beverage = {
  id: string;
  kind: BeverageKind;
  name: string;
  amount_ml: number;
  notes: string;
  consumed_at: string;
};

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
  const [historyKind,setHistoryKind]=useState<"todos"|BeverageKind>("todos");
  const requestId=useRef<string|null>(null);

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
    if (kind!=="agua" && (name.trim().length < 2 || name.trim().length > 100)) {
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
      // Water is part of the water-only goal, unlike teas, shakes or other drinks.
      // Use idempotent unscheduled water registration so it cannot be counted twice.
      const result = kind==="agua"
        ? await (supabase as any).rpc("care_log_unscheduled_intake",{
            p_patient_id:patientId,p_kind:"agua",p_description:"Água",
            p_amount_ml:volume,p_request_id:(requestId.current??=crypto.randomUUID()),
          })
        : await (supabase as any).rpc("care_log_client_beverage",{
            p_patient_id:patientId,p_kind:kind,p_name:name.trim(),
            p_amount_ml:volume,p_notes:notes.trim(),
          });
      if (result.error) throw result.error;
      if (typeof result.data !== "string" || !Number.isFinite(Date.parse(result.data))) {
        throw new Error("Missing server timestamp");
      }
      setNotice(kind==="agua"?`Água registrada às ${formatStamp(result.data)} (Acre). Sua meta diária foi atualizada; consulte Minha meta de água.`:`Consumo de ${(beverageCategory(kind)?.label??"bebida").toLowerCase()} registrado em ${formatStamp(result.data)} (Acre), no histórico de líquidos.`);
      requestId.current=null;
      setName(""); setNotes(""); setAmount("200");
      setReload(value => value + 1);
      onRecorded?.();
    } catch {
      setError("Não foi possível salvar o consumo. Confira a conexão e o prontuário antes de tentar novamente.");
    } finally {
      setSaving(false);
    }
  }

  return <section aria-label="Cadastro de chás e bebidas" className="space-y-3">
    <header className="flex items-center gap-2">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-300"><Droplets size={20}/></span>
      <div>
        <h3 className="text-sm font-extrabold text-foreground">Chás, bebidas, shakes e suplementos</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Escolha a categoria pelo ícone e registre o consumo real (Acre).</p>
      </div>
    </header>
    <form className="space-y-2 rounded-xl border border-border bg-muted/25 p-3" onSubmit={event => { event.preventDefault(); void saveBeverage(); }}>
      <div className="care-intake-picker-scroll max-h-[220px] overflow-y-auto overscroll-contain rounded-xl border border-border/60 bg-card/55 p-2">
        <CareIntakePicker group="beverage" value={kind} compact onChange={value=>{
          setKind(value);setAmount(String(beverageCategory(value)?.amount??200));
          setName("");setError("");setNotice("");requestId.current=null;
        }}/>
      </div>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_112px] gap-2">
        <label className="min-w-0 text-xs font-semibold text-foreground">Nome da bebida
          <input className="field mt-1 w-full" type="text" maxLength={100} required={kind!=="agua"}
            disabled={kind==="agua"} value={kind==="agua"?"Água":name}
            placeholder={beverageCategory(kind)?.example??"Descreva a bebida"}
            onChange={event=>setName(event.target.value)}/>
        </label>
        <label className="text-xs font-semibold text-foreground">Volume (ml)
          <input className="field mt-1 w-full" type="number" min="10" max="1500" step="1" required
            value={amount} onChange={event => setAmount(event.target.value)}/>
        </label>
      </div>
      {kind!=="agua"&&<label className="block text-xs font-semibold text-foreground">Observações (opcional)
        <input className="field mt-1 w-full" type="text" maxLength={300} value={notes}
          placeholder="Ex.: sem açúcar, temperatura ambiente"
          onChange={event => setNotes(event.target.value)}/>
      </label>}
      <button type="submit" disabled={saving} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-60">
        <Save size={16}/> {saving ? "Salvando…" : "Registrar bebida agora"}
      </button>
      <p className="text-[10px] text-muted-foreground">Água entra na meta diária; não registre novamente o mesmo copo na agenda. Chás, energéticos, suplementos líquidos e shakes ficam no histórico separadamente. O registro não significa recomendação médica.</p>
    </form>
    {error && <p role="alert" className="rounded-lg border border-destructive/30 p-2 text-xs text-destructive">{error}</p>}
    {notice && <p role="status" className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 p-2 text-xs text-foreground"><CheckCircle2 size={15} className="shrink-0 text-success"/>{notice}</p>}
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-extrabold text-foreground">Últimas bebidas registradas</h4>
        <select aria-label="Filtrar bebidas por categoria" value={historyKind}
          onChange={e=>setHistoryKind(e.target.value as "todos"|BeverageKind)}
          className="max-w-[180px] rounded-lg border border-border bg-card px-2 py-1.5 text-[10px] font-semibold text-foreground">
          <option value="todos">Todas as categorias</option>
          {beverageKinds.map(choice=><option key={choice.value} value={choice.value}>{choice.label}</option>)}
        </select>
      </div>
      {loading ? <p className="text-xs text-muted-foreground">Carregando bebidas…</p>
        : items.filter(item=>historyKind==="todos"||item.kind===historyKind).length === 0 ? <p className="rounded-lg border border-border p-3 text-xs text-muted-foreground">Nenhuma bebida nesta categoria. A água também aparece na aba Minha meta de água.</p>
        : <div className="max-h-[255px] space-y-1.5 overflow-y-auto overscroll-contain pr-1">
          {items.filter(item=>historyKind==="todos"||item.kind===historyKind).map(item => <article key={item.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5">
            <CareIntakeIcon kind={item.kind} size={19} className="shrink-0 text-primary"/>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{item.name} · {item.amount_ml} ml</p>
              <p className="text-[10px] text-muted-foreground">{beverageCategory(item.kind)?.label ?? "Bebida"}{item.notes ? ` · ${item.notes}` : ""}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground"><Clock3 size={12}/>{formatStamp(item.consumed_at)}</span>
          </article>)}
        </div>}
    </div>
  </section>;
}
