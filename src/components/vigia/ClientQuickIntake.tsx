import { useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Droplets, Plus, Save, Utensils, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type IntakeKind = "refeicao" | "lanche" | "agua" | "cha" | "suco" | "cafe" | "outra";
type Props = { patientId: string; onRecorded?: () => void; variant?: "home" | "panel" };

const choices: { value: IntakeKind; label: string }[] = [
  { value: "refeicao", label: "Refeição extra" },
  { value: "lanche", label: "Lanche extra" },
  { value: "agua", label: "Água" },
  { value: "cha", label: "Chá" },
  { value: "suco", label: "Suco" },
  { value: "cafe", label: "Café" },
  { value: "outra", label: "Outro líquido" },
];
const zone = "America/Rio_Branco";
const formatTime = (date: string) => new Intl.DateTimeFormat("pt-BR", {
  timeZone: zone, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
}).format(new Date(date));

/** Registros avulsos não criam tarefas e não confirmam horários da programação. */
export function ClientQuickIntake({ patientId, onRecorded, variant = "panel" }: Props) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<IntakeKind>("lanche");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("200");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const requestId = useRef<string | null>(null);

  const isFood = kind === "refeicao" || kind === "lanche";
  const isWater = kind === "agua";
  const label = choices.find(option => option.value === kind)?.label ?? "Consumo avulso";

  function openForm() {
    requestId.current = crypto.randomUUID();
    setKind("lanche");
    setDescription("");
    setAmount("200");
    setError("");
    setNotice("");
    setOpen(true);
  }
  function closeForm() {
    if (!saving) {
      setOpen(false);
      setError("");
      requestId.current = null;
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !requestId.current) return;
    const volume = isFood ? null : Number(amount);
    if (!isWater && (description.trim().length < (isFood ? 3 : 2) || description.trim().length > (isFood ? 1000 : 100))) {
      setError(isFood ? "Descreva o alimento consumido (3 a 1.000 caracteres)." : "Informe a bebida (2 a 100 caracteres).");
      return;
    }
    if (!isFood && (volume === null || !Number.isInteger(volume) || volume < 10 || volume > 1500)) {
      setError("Informe um volume entre 10 e 1.500 ml.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const { data, error: failure } = await (supabase as any).rpc("care_log_unscheduled_intake", {
        p_patient_id: patientId,
        p_kind: kind,
        p_description: isWater ? "Água" : description.trim(),
        p_amount_ml: volume,
        p_request_id: requestId.current,
      });
      if (failure) throw failure;
      if (typeof data !== "string" || !Number.isFinite(Date.parse(data))) {
        throw new Error("O servidor não confirmou o horário de registro.");
      }
      setNotice(`${label} registrado em ${formatTime(data)} (Acre). Veja o histórico no prontuário.`);
      setOpen(false);
      requestId.current = null;
      onRecorded?.();
    } catch (failure) {
      setError(failure instanceof Error
        ? `Não foi possível salvar. ${failure.message}`
        : "Não foi possível salvar. Confira a conexão e tente novamente.");
      // Mantém o mesmo identificador para reenvios sem duplicar lançamentos.
    } finally {
      setSaving(false);
    }
  }

  return <>
    <button type="button" onClick={openForm} disabled={!patientId}
      className={variant === "home"
        ? "inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-sky-300/40 bg-sky-300/15 px-2.5 text-[11px] font-bold text-sky-100 transition hover:bg-sky-300/25 disabled:opacity-50"
        : "inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"}>
      <Plus size={16}/> Registrar consumo
    </button>
    {notice && typeof document !== "undefined" && createPortal(
      <div role="status" className="fixed right-3 top-16 z-[151] flex max-w-sm items-start gap-2 rounded-xl border border-success/30 bg-card p-3 text-xs font-semibold text-foreground shadow-xl">
        <CheckCircle2 size={17} className="shrink-0 text-success"/>
        <span className="flex-1">{notice}</span>
        <button type="button" aria-label="Fechar aviso" onClick={() => setNotice("")}><X size={16}/></button>
      </div>, document.body
    )}
    {open && typeof document !== "undefined" && createPortal(
      <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm"
        onMouseDown={event => { if (event.target === event.currentTarget) closeForm(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="quick-intake-title"
          className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-y-auto rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl sm:p-5">
          <div className="flex shrink-0 items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                {isFood ? <Utensils size={19}/> : <Droplets size={19}/>}
              </span>
              <div>
                <h2 id="quick-intake-title" className="text-base font-extrabold">Registro avulso</h2>
                <p className="text-[11px] text-muted-foreground">Fora da programação</p>
              </div>
            </div>
            <button type="button" aria-label="Fechar" disabled={saving} onClick={closeForm}
              className="grid size-8 place-items-center rounded-lg border border-border"><X size={18}/></button>
          </div>
          <form className="mt-3 grid gap-3" onSubmit={event => void save(event)}>
            <label className="text-xs font-semibold">O que deseja registrar?
              <select className="field mt-1 w-full" value={kind}
                onChange={event => { setKind(event.target.value as IntakeKind); setError(""); }}>
                {choices.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            {!isWater && (isFood
              ? <label className="text-xs font-semibold">O que você comeu?
                  <textarea rows={3} required maxLength={1000} value={description}
                    onChange={event => setDescription(event.target.value)}
                    placeholder="Ex.: banana com aveia, pão, frutas, almoço..."
                    className="field mt-1 w-full resize-none"/>
                </label>
              : <label className="text-xs font-semibold">Nome da bebida
                  <input type="text" className="field mt-1 w-full" maxLength={100}
                    value={description} required onChange={event => setDescription(event.target.value)}
                    placeholder={kind === "cha" ? "Ex.: chá de camomila" : "Ex.: suco natural"}/>
                </label>
            )}
            {!isFood && <label className="text-xs font-semibold">Quantidade consumida (ml)
                <input type="number" min={10} max={1500} step={1} required
                  className="field mt-1 w-full" value={amount}
                  onChange={event => setAmount(event.target.value)}/>
              </label>}
            <p className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              O horário real do registro será salvo automaticamente (Acre).
              Este consumo avulso não confirma nem substitui uma tarefa programada.
              Água entra no total hídrico; outras bebidas ficam no histórico de líquidos.
            </p>
            {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">{error}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={saving} onClick={closeForm}
                className="rounded-lg border border-border px-3 py-2.5 text-xs font-semibold disabled:opacity-50">Cancelar</button>
              <button type="submit" disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-xs font-extrabold text-primary-foreground disabled:opacity-50">
                <Save size={15}/>{saving ? "Salvando..." : "Registrar agora"}
              </button>
            </div>
          </form>
        </section>
      </div>, document.body
    )}
  </>;
}
