import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Clock3, Droplets, Pencil, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { canConfirmCare, careScheduleLabel } from "@/lib/care-schedule";

export type CareTaskRecord = {
  id: string;
  title: string;
  category: string;
  scheduled_at: string;
  completed_at: string | null;
};

type TaskDetails = {
  task_id: string;
  title: string;
  category: string;
  scheduled_at: string;
  completed_at: string | null;
  description: string | null;
  amount_ml: number | null;
  water_entry_id: string | null;
  last_corrected_at: string | null;
  can_edit_water: boolean;
};

type Props = {
  task: CareTaskRecord | null;
  onClose: () => void;
  onSaved?: () => void;
  onConfirm?: (task: CareTaskRecord) => void;
};

const stamp = (date: string) => new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Rio_Branco",
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
}).format(new Date(date));

const label = (category: string) =>
  category === "hidratacao" ? "Hidratação" :
  category === "refeicao" ? "Refeição" :
  category === "medicacao" ? "Medicação" : "Cuidado";

export function CareTaskRecordModal({ task, onClose, onSaved, onConfirm }: Props) {
  const [details, setDetails] = useState<TaskDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!task) {
      setDetails(null);
      setEditing(false);
      setError("");
      setSuccess("");
      return;
    }
    let active = true;
    setLoading(true);
    setEditing(false);
    setError("");
    setSuccess("");
    setDetails(null);
    void (async () => {
      const response = await (supabase as any).rpc("care_get_task_record", { p_task_id: task.id });
      if (!active) return;
      if (response.error) {
        setError("Não foi possível consultar o registro: " + response.error.message);
      } else if (response.data && response.data.task_id === task.id) {
        setDetails(response.data as TaskDetails);
        setAmount(String(response.data.amount_ml ?? ""));
      } else {
        setError("Registro não encontrado no prontuário.");
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [task?.id]);

  if (!task || typeof document === "undefined") return null;

  async function saveCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!task || !details?.can_edit_water || saving) return;
    const volume = Number(amount);
    if (!Number.isInteger(volume) || volume < 10 || volume > 1500) {
      setError("Informe uma quantidade entre 10 e 1.500 ml.");
      return;
    }
    if (volume === details.amount_ml) {
      setEditing(false);
      setError("");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await (supabase as any).rpc("care_correct_water_quantity", {
        p_task_id: task.id,
        p_new_amount_ml: volume,
      });
      if (response.error) throw response.error;
      if (response.data?.amount_ml !== volume) {
        throw new Error("O servidor não confirmou a alteração; consulte novamente o registro.");
      }
      setDetails(old => old ? {
        ...old,
        amount_ml: response.data.amount_ml,
        last_corrected_at: response.data.corrected_at,
      } : old);
      setEditing(false);
      setSuccess(`Quantidade corrigida de ${response.data.previous_ml} para ${volume} ml. O horário original foi preservado. Total do dia: ${response.data.daily_total_ml} ml.`);
      onSaved?.();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível corrigir o registro.");
    } finally {
      setSaving(false);
    }
  }

  const row = (title: string, value: string) =>
    <div className="rounded-xl bg-muted/60 px-3 py-2">
      <dt className="text-[11px] font-medium text-muted-foreground">{title}</dt>
      <dd className="mt-0.5 break-words text-xs font-bold text-foreground">{value}</dd>
    </div>;

  const canConfirm = Boolean(!task.completed_at && onConfirm && canConfirmCare(task));

  return createPortal(
    <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-slate-950/75 p-2 backdrop-blur-sm sm:p-4"
      onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="care-task-record-title"
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-md flex-col overflow-y-auto rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-2xl sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Detalhes do registro · {label(task.category)}</p>
            <h2 id="care-task-record-title" className="mt-1 text-base font-extrabold">{task.title}</h2>
          </div>
          <button type="button" aria-label="Fechar detalhes" disabled={saving} onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-lg border border-border hover:bg-muted disabled:opacity-50">
            <X size={17}/>
          </button>
        </div>

        {loading ? <p role="status" className="mt-3 text-xs text-muted-foreground">Consultando o prontuário…</p> :
          details && <dl className="mt-3 grid gap-2">
            {row("Horário previsto (Acre)", stamp(details.scheduled_at))}
            {row("Situação", details.completed_at ? "Confirmado" : careScheduleLabel(details))}
            {details.completed_at && row("Confirmação registrada em (Acre)", stamp(details.completed_at))}
            {details.category === "refeicao" && row("Alimentos informados", details.description || "Sem descrição detalhada registrada")}
            {details.category === "hidratacao" && details.completed_at && row(
              "Quantidade registrada",
              details.amount_ml === null ? "Volume não localizado — consulte o responsável" : `${details.amount_ml} ml`
            )}
            {details.last_corrected_at && row("Última correção (Acre)", stamp(details.last_corrected_at))}
          </dl>}

        {details?.can_edit_water && !editing && <button type="button" onClick={() => { setEditing(true); setError(""); setSuccess(""); }}
          className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 text-xs font-extrabold text-primary hover:bg-primary/15">
          <Pencil size={15}/> Corrigir quantidade de água
        </button>}

        {editing && details?.can_edit_water && <form className="mt-3 rounded-xl border border-primary/30 bg-muted/20 p-3" onSubmit={event => void saveCorrection(event)}>
          <label className="block text-xs font-bold">Quantidade correta (ml)
            <input type="number" inputMode="numeric" min={10} max={1500} step={1} required
              value={amount} onChange={event => setAmount(event.target.value)}
              className="field mt-1 w-full" autoFocus/>
          </label>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Somente os ml serão alterados. Data e hora originais permanecerão iguais, e o histórico da correção será preservado.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" disabled={saving} onClick={() => { setEditing(false); setAmount(String(details.amount_ml ?? "")); setError(""); }}
              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60">
              {saving ? "Salvando…" : "Salvar correção"}
            </button>
          </div>
        </form>}

        {success && <p role="status" className="mt-3 flex items-start gap-1.5 rounded-lg border border-success/30 bg-success/10 p-2 text-xs text-foreground">
          <CheckCircle2 size={16} className="shrink-0 text-success"/>{success}
        </p>}
        {error && <p role="alert" className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">{error}</p>}
        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          {details?.completed_at ? <><CheckCircle2 size={14}/> Registro confirmado; consulta não altera o consumo.</> :
            <><Clock3 size={14}/> Este cuidado ainda não foi confirmado.</>}
        </div>
        {!editing && <div className="mt-3 grid gap-2" style={{gridTemplateColumns:canConfirm?"1fr 1fr":"1fr"}}>
          <button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-border px-3 py-2.5 text-xs font-semibold">Fechar</button>
          {canConfirm && onConfirm && <button type="button" onClick={() => { onClose(); onConfirm(task); }}
            className="rounded-lg bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground">Confirmar agora</button>}
        </div>}
      </section>
    </div>, document.body
  );
}
