import { useMemo, useState } from "react";
import { Check, Droplets, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { acreDateAtTime, acreDateKey, ACRE_TIME_ZONE } from "@/lib/acre-time";
import { beverageKinds, beverageCategory, isBeverageKind } from "@/lib/care-intake-categories";
import { beverageNutrients } from "@/lib/beverage-nutrients";
import { NiceSelect } from "./NiceSelect";
import { RecordInfo } from "./RecordInfo";
import { useDialog } from "@/lib/dialog";

export type WaterEntry = {
  id: string;
  amount_ml: number;
  recorded_at: string;
  kind?: string;
  name?: string;
};
type Entry = WaterEntry & { source: "water" | "beverage" };
const hhmm = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: ACRE_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
const ml = (v: number) => `${Math.round(v).toLocaleString("pt-BR")} ml`;

/** Registros de hoje em lista compacta, com detalhes, editar e excluir sempre à vista. */
export function HydrationEntries({
  patientId,
  water,
  beverages,
  goal,
  onChanged,
}: {
  patientId: string;
  water: WaterEntry[];
  beverages: WaterEntry[];
  goal: number;
  onChanged: () => void;
}) {
  const dialog = useDialog();
  const entries = useMemo<Entry[]>(
    () =>
      [
        ...water.map((e) => ({ ...e, source: "water" as const })),
        ...beverages.map((e) => ({ ...e, source: "beverage" as const })),
      ].sort((a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at)),
    [water, beverages],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState("");
  const [name, setName] = useState("");
  const [when, setWhen] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const total = entries.reduce((sum, e) => sum + Number(e.amount_ml), 0);
  if (entries.length === 0) return null;

  function startEdit(e: Entry) {
    setEditing(e.id);
    setSelected(e.id);
    setAmount(String(Math.round(Number(e.amount_ml))));
    setWhen(hhmm(e.recorded_at));
    setKind(e.source === "beverage" && e.kind && isBeverageKind(e.kind) ? e.kind : "outra");
    setName(e.name ?? "");
    setError("");
    setConfirmId(null);
  }
  async function save(e: Entry) {
    const value = Math.round(Number(amount.replace(",", ".")));
    if (!Number.isFinite(value) || value < 1 || value > 5000) {
      setError("Informe um volume entre 1 e 5000 ml.");
      return;
    }
    if (e.source === "beverage" && (name.trim().length < 2 || name.trim().length > 100)) {
      setError("Informe o nome da bebida (2 a 100 caracteres).");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(when)) {
      setError("Informe o horário (hh:mm).");
      return;
    }
    const at = acreDateAtTime(acreDateKey(e.recorded_at), when);
    if (at.getTime() > Date.now() + 60_000) {
      setError("O horário não pode estar no futuro.");
      return;
    }
    const what =
      e.source === "beverage"
        ? `${beverageCategory(kind)?.label ?? "Bebida"}: ${name.trim()}, ${value} ml`
        : `${value} ml de água`;
    if (
      !(await dialog.confirm(
        "Salvar alteração?",
        `Alterar este registro para ${what} às ${when}?`,
        false,
        "Salvar alteração",
      ))
    )
      return;
    setBusy(true);
    setError("");
    const { error: err } =
      e.source === "water"
        ? await (supabase as any).rpc("care_update_intake_entry", {
            p_patient_id: patientId,
            p_entry_type: "water",
            p_entry_id: e.id,
            p_description: null,
            p_amount_ml: value,
            p_consumed_at: at.toISOString(),
          })
        : await (supabase as any).rpc("care_update_client_beverage", {
            p_patient_id: patientId,
            p_entry_id: e.id,
            p_kind: kind,
            p_name: name.trim(),
            p_amount_ml: value,
            p_consumed_at: at.toISOString(),
          });
    setBusy(false);
    if (err) {
      setError(err.message || "Não foi possível salvar a alteração.");
      return;
    }
    setEditing(null);
    dialog.notify?.("Registro alterado com sucesso.");
    onChanged();
  }
  async function remove(e: Entry) {
    const what =
      e.source === "beverage"
        ? `${e.name || "bebida"} (${Math.round(Number(e.amount_ml))} ml)`
        : `${Math.round(Number(e.amount_ml))} ml de água`;
    if (
      !(await dialog.confirm(
        "Excluir definitivamente?",
        `${what} às ${hhmm(e.recorded_at)} será apagado e o total do dia recalculado. Não dá para desfazer.`,
        true,
        "Excluir",
      ))
    )
      return;
    setBusy(true);
    setError("");
    const { error: err } = await (supabase as any).rpc("care_delete_intake_entry", {
      p_patient_id: patientId,
      p_entry_type: e.source,
      p_entry_id: e.id,
    });
    setBusy(false);
    if (err) {
      setError(err.message || "Não foi possível excluir o registro.");
      return;
    }
    setConfirmId(null);
    setSelected(null);
    dialog.notify?.("Registro excluído. Total do dia recalculado.");
    onChanged();
  }

  return (
    <section
      className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-border bg-card p-3 sm:p-4"
      aria-label="Registros de hoje"
    >
      <header className="mb-2 flex items-baseline justify-between gap-2">
        <strong className="text-sm font-bold">Registros de hoje</strong>
        <span className="text-xs text-muted-foreground tabular-nums">
          {entries.length} · {ml(total)}
        </span>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {error}
        </p>
      )}
      <ul
        className="-mr-1 grid max-h-[248px] gap-1 overflow-y-auto pr-1 [scrollbar-width:thin]"
        aria-label="Meus registros de hoje"
      >
        {[...entries].reverse().map((e) => (
          <li
            key={e.id}
            className={`group rounded-xl border px-2 py-1.5 transition-colors ${selected === e.id ? "border-primary/40 bg-primary/[.05]" : "border-transparent hover:border-border hover:bg-muted/40"}`}
          >
            {editing === e.id ? (
              <div className="grid gap-2">
                {e.source === "beverage" && (
                  <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr]">
                    <label className="text-[11px] font-semibold">
                      Tipo de líquido
                      <NiceSelect
                        className="mt-0.5"
                        ariaLabel="Tipo de líquido"
                        value={kind}
                        onChange={setKind}
                        options={beverageKinds
                          .filter((k) => k.value !== "agua")
                          .map((k) => ({ value: k.value, label: k.label, hint: k.hint }))}
                      />
                    </label>
                    <label className="text-[11px] font-semibold">
                      Nome / descrição
                      <input
                        value={name}
                        onChange={(ev) => setName(ev.target.value)}
                        maxLength={100}
                        placeholder={beverageCategory(kind)?.example ?? "Descreva a bebida"}
                        className="mt-0.5 block h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm"
                      />
                    </label>
                    {/* Nutrientes são recalculados pelo nome; sem alimento conhecido, usa a estimativa do tipo. */}
                  </div>
                )}
                <div className="flex flex-wrap items-end gap-2">
                  <label className="text-[11px] font-semibold">
                    Volume (ml)
                    <input
                      inputMode="numeric"
                      value={amount}
                      onChange={(ev) => setAmount(ev.target.value)}
                      className="mt-0.5 block h-10 w-24 rounded-lg border border-border bg-surface px-2 text-sm"
                    />
                  </label>
                  <label className="text-[11px] font-semibold">
                    Horário
                    <input
                      type="time"
                      value={when}
                      onChange={(ev) => setWhen(ev.target.value)}
                      className="mt-0.5 block h-10 rounded-lg border border-border bg-surface px-2 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void save(e)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white disabled:opacity-60"
                  >
                    <Check size={15} /> {busy ? "Salvando…" : "Salvar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold"
                  >
                    <X size={15} /> Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(e.id)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-lg ${e.source === "water" ? "bg-sky-500/12 text-sky-600 dark:text-sky-300" : "bg-violet-500/12 text-violet-600 dark:text-violet-300"}`}
                  >
                    <Droplets size={15} />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-[13px] leading-tight tabular-nums">
                      {ml(Number(e.amount_ml))}
                    </strong>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {hhmm(e.recorded_at)} ·{" "}
                      {e.source === "water"
                        ? "Água"
                        : (e.name ? `${e.name} · ` : "") +
                          (beverageCategory(e.kind ?? "outra")?.label ?? "Bebida")}
                      {e.source === "beverage" && isBeverageKind(e.kind ?? "")
                        ? ` · ~${beverageNutrients(e.kind as any, Number(e.amount_ml)).kcal} kcal`
                        : ""}
                    </span>
                  </span>
                </button>
                {confirmId === e.id ? (
                  <span className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(e)}
                      className="h-9 rounded-lg bg-rose-600 px-3 text-xs font-bold text-white disabled:opacity-60"
                    >
                      {busy ? "Excluindo…" : "Confirmar exclusão"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="h-9 rounded-lg border border-border px-2.5 text-xs font-semibold"
                    >
                      Voltar
                    </button>
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1">
                    <RecordInfo
                      title={
                        e.source === "water"
                          ? `Água · ${ml(Number(e.amount_ml))}`
                          : `${e.name || beverageCategory(e.kind ?? "outra")?.label || "Bebida"} · ${ml(Number(e.amount_ml))}`
                      }
                      at={e.recorded_at}
                      category={e.source === "water" ? "Hidratação" : "Bebida"}
                      color={e.source === "water" ? "#0ea5e9" : "#8b5cf6"}
                      rows={[
                        {
                          label: "Consumido",
                          value:
                            e.source === "water"
                              ? "Água"
                              : e.name || beverageCategory(e.kind ?? "outra")?.label || "Bebida",
                        },
                        ...(e.source === "beverage"
                          ? [
                              {
                                label: "Tipo",
                                value: beverageCategory(e.kind ?? "outra")?.label ?? "Bebida",
                              },
                            ]
                          : []),
                        { label: "Quantidade", value: ml(Number(e.amount_ml)) },
                        ...(e.source === "beverage" && isBeverageKind(e.kind ?? "")
                          ? (() => {
                              const n = beverageNutrients(e.kind as any, Number(e.amount_ml));
                              return [
                                { label: "Energia", value: `~${n.kcal} kcal` },
                                {
                                  label: "Macros",
                                  value: `P ${n.protein} g · C ${n.carbs} g · G ${n.fat} g`,
                                },
                              ];
                            })()
                          : []),
                        {
                          label: "Da meta do dia",
                          value:
                            goal > 0 ? `${Math.round((Number(e.amount_ml) / goal) * 100)}%` : "—",
                        },
                      ]}
                    />
                    <button
                      type="button"
                      onClick={() => startEdit(e)}
                      aria-label={`Editar registro de ${ml(Number(e.amount_ml))} às ${hhmm(e.recorded_at)}`}
                      title="Editar"
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(null);
                        setError("");
                        void remove(e);
                      }}
                      aria-label={`Excluir registro de ${ml(Number(e.amount_ml))} às ${hhmm(e.recorded_at)}`}
                      title="Excluir"
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
