import { useState } from "react";
import { Flag, Loader2, X } from "lucide-react";
import { useDialog } from "@/lib/dialog";
import {
  MAX_GOAL_KG,
  MIN_GOAL_KG,
  healthyWeightRange,
  parseGoalKg,
  saveWeightGoal,
} from "@/lib/weight-goal";

const nf = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

type Props = {
  patientId: string;
  ownerId: string;
  current: number | null;
  lastWeight: number | null;
  heightCm: number | null;
  onClose: () => void;
};

/** Edita a meta de peso. Ao salvar, todo o sistema recarrega a partir do evento global. */
export function WeightGoalEditor({
  patientId,
  ownerId,
  current,
  lastWeight,
  heightCm,
  onClose,
}: Props) {
  const dialog = useDialog();
  const [value, setValue] = useState(current ? String(current).replace(".", ",") : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const range = healthyWeightRange(heightCm);
  const parsed = parseGoalKg(value);
  const diff = parsed !== null && lastWeight ? lastWeight - parsed : null;

  async function persist(kg: number | null) {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await saveWeightGoal(patientId, ownerId, kg);
      dialog.notify(
        kg === null ? "Meta de peso removida." : `Meta atualizada para ${nf(kg)} kg.`,
        "success",
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar a meta.");
    } finally {
      setSaving(false);
    }
  }

  const suggestions = range ? [range.max, Math.round(((range.min + range.max) / 2) * 10) / 10] : [];

  return (
    <section
      className="border border-border bg-card p-3 shadow-card"
      aria-label="Ajustar meta de peso"
    >
      <div className="flex items-center gap-2">
        <Flag size={16} className="text-[#a78bfa]" />
        <h3 className="font-display text-sm font-bold">Meta de peso</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="ml-auto grid size-8 place-items-center text-muted-foreground hover:bg-muted"
        >
          <X size={16} />
        </button>
      </div>
      <form
        className="mt-2 flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (parsed === null) {
            setError(`Informe um peso entre ${MIN_GOAL_KG} e ${MAX_GOAL_KG} kg.`);
            return;
          }
          void persist(parsed);
        }}
      >
        <label className="grid gap-1 text-[11px] font-semibold text-muted-foreground">
          Peso desejado (kg)
          <input
            inputMode="decimal"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError("");
            }}
            placeholder="Ex.: 80,0"
            className="h-11 w-36 border border-border bg-background px-3 text-base font-bold tabular-nums text-foreground"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center gap-2 bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          Salvar meta
        </button>
        {current !== null && (
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              const ok = await dialog.confirm(
                "Remover meta de peso?",
                "Os gráficos e indicadores deixam de mostrar a linha da meta.",
                true,
                "Remover",
              );
              if (ok) void persist(null);
            }}
            className="h-11 border border-border px-3 text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            Remover
          </button>
        )}
      </form>
      {diff !== null && Math.abs(diff) >= 0.1 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {diff > 0 ? `Faltam ${nf(diff)} kg para perder` : `Faltam ${nf(-diff)} kg para ganhar`} a
          partir do peso atual ({nf(lastWeight as number)} kg).
        </p>
      )}
      {range && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>
            Faixa saudável para {Math.round(heightCm as number)} cm: {nf(range.min)} a{" "}
            {nf(range.max)} kg.
          </span>
          {suggestions.map((kg) => (
            <button
              key={kg}
              type="button"
              onClick={() => {
                setValue(String(kg).replace(".", ","));
                setError("");
              }}
              className="border border-border px-2 py-1 font-semibold text-foreground hover:bg-muted"
            >
              {nf(kg)} kg
            </button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
