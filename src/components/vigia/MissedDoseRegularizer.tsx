import { useState } from "react";
import { CalendarCheck2, History, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Permite ao paciente confirmar, de uma vez, doses passadas que esqueceu de registrar. */
export function MissedDoseRegularizer({ patientId, onDone }: { patientId: string; onDone: () => void }) {
  const [since, setSince] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  async function run() {
    if (busy) return;
    if (!window.confirm("Confirmar todas as doses passadas sem registro como tomadas no horário programado? Use apenas se você realmente tomou essas doses.")) return;
    setBusy(true); setResult(null);
    const { data, error } = await (supabase as any).rpc("care_confirm_missed_medication", { p_patient_id: patientId, p_since: since || null });
    setBusy(false);
    if (error) {
      setResult({ ok: false, text: /function|does not exist|schema cache/i.test(error.message ?? "")
        ? "A atualização do banco ainda não foi aplicada. Aplique a migração mais recente do projeto e tente novamente."
        : "Não foi possível regularizar agora. Tente novamente." });
      return;
    }
    setResult({ ok: true, text: Number(data) > 0 ? `${data} dose(s) confirmada(s) nos horários programados e marcadas como registro retroativo.` : "Não há doses pendentes de confirmação." });
    onDone();
  }
  return <section className="mb-4 rounded-3xl border border-rose-500/25 bg-gradient-to-br from-rose-500/[.07] to-pink-500/[.04] p-4" aria-label="Regularizar doses esquecidas">
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1">
        <h3 className="flex items-center gap-2 text-base font-bold"><History size={18} className="text-rose-600"/> Esqueceu de confirmar doses?</h3>
        <p className="mt-1 text-sm text-muted-foreground">Confirme de uma vez as doses já tomadas desde o início do tratamento (ou a partir de uma data). Elas ficam registradas no horário programado e identificadas como retroativas.</p>
      </div>
      <label className="text-sm font-semibold">A partir de (opcional)
        <input type="date" value={since} onChange={event => setSince(event.target.value)} className="mt-1 block h-11 rounded-xl border border-border bg-surface px-3"/></label>
      <button type="button" disabled={busy} onClick={() => void run()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 px-5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60">
        {busy ? <Loader2 size={17} className="animate-spin"/> : <CalendarCheck2 size={17}/>} Regularizar doses
      </button>
    </div>
    {result && <p role="status" className={`mt-3 rounded-xl px-3 py-2 text-sm font-medium ${result.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 text-destructive"}`}>{result.text}</p>}
  </section>;
}
