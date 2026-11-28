import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Lock, Minus, Plus, Search, Trash2, Utensils, X } from "lucide-react";
import { useDialog } from "@/lib/dialog";
import { ensureUnlocked, isRecordLocked } from "@/lib/record-lock";
import { ingredientById } from "@/lib/nutrition-catalog";
import { measureUnit, nutrientsFor, parseFoodText } from "@/lib/food-parser";
import { searchFoods } from "@/lib/food-search";
import { acreDateKey } from "@/lib/acre-time";
import { supabase } from "@/integrations/supabase/client";

export type EditableMeal = {
  at: string;
  text: string;
  entryId?: string;
  foods: { id: string; name: string; grams: number }[];
};

type Item = { id: string; name: string; qty: string };

const n0 = (v: number) => Math.round(v).toLocaleString("pt-BR");
const qtyOf = (q: string) => Number(q.replace(",", ".")) || 0;

/** Data e hora do Acre no formato do campo datetime-local. */
function acreLocal(iso: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Rio_Branco",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Só refeições avulsas (com identificador) podem ser editadas ou excluídas aqui. */
export const canEditMeal = (e: { entryId?: string }) => Boolean(e.entryId);
export const mealIsLocked = (e: { at: string }) => isRecordLocked(e.at);

/** Pede a senha (se passou de 24 h), confirma e exclui a refeição. Devolve true se excluiu. */
export function useMealActions(patientId: string, onChanged: () => void) {
  const dialog = useDialog();
  async function remove(meal: EditableMeal): Promise<boolean> {
    if (!meal.entryId) return false;
    if (!(await ensureUnlocked(meal.at, dialog.prompt, dialog.notify))) return false;
    const ok = await dialog.confirm(
      "Excluir refeição?",
      "A refeição será apagada e as métricas do dia recalculadas. Não dá para desfazer.",
      true,
      "Excluir",
    );
    if (!ok) return false;
    const { error } = await (supabase as any).rpc("care_delete_intake_entry", {
      p_patient_id: patientId,
      p_entry_type: "meal",
      p_entry_id: meal.entryId,
    });
    if (error) {
      dialog.notify?.(error.message || "Não foi possível excluir a refeição.", "danger");
      return false;
    }
    dialog.notify?.("Refeição excluída. Métricas recalculadas.");
    onChanged();
    return true;
  }
  async function startEdit(meal: EditableMeal): Promise<boolean> {
    return ensureUnlocked(meal.at, dialog.prompt, dialog.notify);
  }
  return { remove, startEdit };
}

/** Edição de uma refeição: alimentos (inserir, remover), quantidades, data e hora. */
export function MealEditDialog({
  meal,
  patientId,
  onClose,
  onSaved,
}: {
  meal: EditableMeal;
  patientId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useDialog();
  const [items, setItems] = useState<Item[]>(
    meal.foods.map((f) => ({
      id: f.id,
      name: f.name.split(",")[0],
      qty: String(Math.round(f.grams)),
    })),
  );
  const [desc, setDesc] = useState(meal.text);
  const [when, setWhen] = useState(acreLocal(meal.at));
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const structured = items.length > 0 || meal.foods.length > 0;
  const hits = useMemo(
    () => (query.trim().length >= 2 ? searchFoods(query, 6).items : []),
    [query],
  );
  const totalKcal = items.reduce((sum, it) => {
    const ing = ingredientById.get(it.id);
    return sum + (ing && qtyOf(it.qty) > 0 ? nutrientsFor(ing, qtyOf(it.qty)).kcal : 0);
  }, 0);

  function addFood(text: string) {
    const parsed = parseFoodText(text)[0];
    if (!parsed) {
      dialog.notify?.("Alimento não reconhecido. Tente outro nome.", "danger");
      return;
    }
    if (items.some((it) => it.id === parsed.id)) {
      dialog.notify?.("Esse alimento já está na refeição. Ajuste a quantidade dele.", "info");
      return;
    }
    setItems((list) => [
      ...list,
      { id: parsed.id, name: parsed.name.split(",")[0], qty: String(Math.round(parsed.grams)) },
    ]);
    setQuery("");
  }

  async function removeItem(index: number) {
    if (items.length <= 1) {
      dialog.notify?.(
        "A refeição precisa de pelo menos um alimento. Para apagar tudo, use Excluir refeição.",
        "info",
      );
      return;
    }
    const ok = await dialog.confirm(
      "Remover alimento?",
      `${items[index].name} sai desta refeição quando você salvar as alterações.`,
      true,
      "Remover",
    );
    if (ok) setItems((list) => list.filter((_, i) => i !== index));
  }

  async function save() {
    const time = Date.parse(`${when}:00-05:00`);
    if (!Number.isFinite(time) || time > Date.now() + 120_000) {
      dialog.notify?.(
        "Informe uma data e um horário válidos, que não estejam no futuro.",
        "danger",
      );
      return;
    }
    if (time < Date.now() - 7 * 86_400_000) {
      dialog.notify?.("O limite para mudar a data é de 7 dias atrás.", "danger");
      return;
    }
    if (structured && items.some((it) => !(qtyOf(it.qty) >= 1 && qtyOf(it.qty) <= 5000))) {
      dialog.notify?.("Informe quantidades entre 1 e 5.000.", "danger");
      return;
    }
    if (!structured && desc.trim().length < 3) {
      dialog.notify?.("Descreva a refeição com pelo menos 3 letras.", "danger");
      return;
    }
    const day = (iso: string) => acreLocal(iso).slice(0, 10);
    const moved = day(new Date(time).toISOString()) !== day(meal.at);
    const ok = await dialog.confirm(
      "Salvar alterações?",
      `A refeição ficará em ${new Date(time).toLocaleString("pt-BR", { timeZone: "America/Rio_Branco", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}${moved ? " (outro dia)" : ""} e as métricas serão recalculadas.`,
      false,
      "Salvar",
    );
    if (!ok) return;
    setSaving(true);
    const { error } = await (supabase as any).rpc("care_update_intake_entry", {
      p_patient_id: patientId,
      p_entry_type: "meal",
      p_entry_id: meal.entryId,
      p_description: structured
        ? items.map((it) => `${it.name} ${qtyOf(it.qty)} ${measureUnit(it.id)}`).join(", ")
        : desc.trim(),
      p_amount_ml: null,
      p_consumed_at: new Date(time).toISOString(),
    });
    setSaving(false);
    if (error) {
      dialog.notify?.(error.message || "Não foi possível salvar a alteração.", "danger");
      return;
    }
    dialog.notify?.("Refeição atualizada. Métricas recalculadas.");
    onSaved();
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-[150] grid place-items-center bg-black/65 p-3 backdrop-blur-[2px]">
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Editar refeição"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden border border-border bg-card text-card-foreground shadow-2xl"
      >
        <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <span className="grid size-9 shrink-0 place-items-center bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
            <Utensils size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold leading-tight">Editar refeição</p>
            {structured && (
              <p className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                {n0(totalKcal)} kcal com as quantidades atuais
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="grid size-8 place-items-center text-muted-foreground hover:bg-muted"
          >
            <X size={16} />
          </button>
        </header>
        <div className="grid min-h-0 gap-3 overflow-y-auto px-4 py-3 text-xs font-semibold">
          {structured ? (
            <>
              <ul className="divide-y divide-border border border-border">
                {items.map((it, i) => {
                  const ing = ingredientById.get(it.id);
                  const kcal = ing && qtyOf(it.qty) > 0 ? nutrientsFor(ing, qtyOf(it.qty)).kcal : 0;
                  const step = (d: number) =>
                    setItems((list) =>
                      list.map((x, j) =>
                        j === i ? { ...x, qty: String(Math.max(1, qtyOf(x.qty) + d)) } : x,
                      ),
                    );
                  return (
                    <li key={it.id} className="flex items-center gap-1.5 p-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold">{it.name}</span>
                        <span className="text-[11px] font-normal tabular-nums text-muted-foreground">
                          {n0(kcal)} kcal
                        </span>
                      </span>
                      <button
                        type="button"
                        aria-label={`Diminuir ${it.name}`}
                        onClick={() => step(-10)}
                        className="grid size-8 place-items-center border border-border hover:bg-muted"
                      >
                        <Minus size={13} />
                      </button>
                      <input
                        inputMode="decimal"
                        value={it.qty}
                        onChange={(e) =>
                          setItems((list) =>
                            list.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)),
                          )
                        }
                        onFocus={(e) => e.currentTarget.select()}
                        aria-label={`Quantidade de ${it.name}`}
                        className="field h-8 w-14 text-center tabular-nums"
                      />
                      <button
                        type="button"
                        aria-label={`Aumentar ${it.name}`}
                        onClick={() => step(10)}
                        className="grid size-8 place-items-center border border-border hover:bg-muted"
                      >
                        <Plus size={13} />
                      </button>
                      <span className="w-5 text-[11px] font-normal text-muted-foreground">
                        {measureUnit(it.id)}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remover ${it.name}`}
                        onClick={() => void removeItem(i)}
                        className="grid size-8 place-items-center border border-destructive/25 text-destructive hover:bg-destructive/5"
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div>
                <label className="relative block">
                  <span className="sr-only">Inserir alimento</span>
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-2.5 top-3 text-muted-foreground"
                  />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Inserir alimento: pizza, arroz, banana…"
                    className="field h-10 w-full !pl-8"
                  />
                </label>
                {hits.length > 0 && (
                  <ul className="mt-1 divide-y divide-border border border-border">
                    {hits.map((h) => (
                      <li key={h.label}>
                        <button
                          type="button"
                          onClick={() => addFood(h.text)}
                          className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-[13px] font-semibold hover:bg-muted"
                        >
                          <span className="min-w-0 truncate">{h.label}</span>
                          <Plus size={14} className="shrink-0 text-primary" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <label>
              Descrição
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                maxLength={1000}
                rows={3}
                className="field mt-1 w-full p-2"
              />
              <span className="mt-1 block font-normal text-muted-foreground">
                Dica: escreva a quantidade, como “Tapioca 80 g”, para o sistema calcular as
                calorias.
              </span>
            </label>
          )}
          <label>
            Data e horário (Acre)
            <input
              type="datetime-local"
              value={when}
              min={acreLocal(new Date(Date.now() - 7 * 86_400_000).toISOString())}
              max={acreLocal(new Date().toISOString())}
              onChange={(e) => setWhen(e.target.value)}
              className="field mt-1 h-10 w-full"
            />
            <span className="mt-1 block font-normal text-muted-foreground">
              Hoje no Acre: {acreDateKey().split("-").reverse().join("/")}. É possível voltar até 7
              dias.
            </span>
          </label>
          {mealIsLocked(meal) && (
            <p className="flex items-center gap-1.5 font-normal text-muted-foreground">
              <Lock size={12} /> Registro com mais de 24 h, liberado por senha.
            </p>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t border-border bg-muted/30 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 text-xs font-semibold text-muted-foreground hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-10 bg-primary px-5 text-xs font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Salvar alterações"}
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
