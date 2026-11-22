import { useEffect, useMemo, useRef, useState } from "react";
import { NiceSelect } from "./NiceSelect";
import { CheckCircle2, Clock3, Droplets, Minus, Plus, Save, Search } from "lucide-react";
import { CareIntakeIcon } from "./CareIntakePicker";
import { drinkCards, drinkTone } from "./DrinkBoard";
import { beverageKinds, beverageCategory, type BeverageKind } from "@/lib/care-intake-categories";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import { parseFoodText, sumNutrients } from "@/lib/food-parser";
import { normalize } from "@/lib/food-search";

type Beverage = {
  id: string;
  kind: BeverageKind;
  name: string;
  amount_ml: number;
  notes: string;
  consumed_at: string;
};

const formatStamp = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Rio_Branco",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));

export function ClientBeverageTracker({
  patientId,
  ownerId,
  revision,
  onRecorded,
}: {
  patientId: string;
  ownerId: string;
  revision: number;
  onRecorded?: () => void;
}) {
  const dialog = useDialog();
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
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<"todas" | BeverageKind>("todas");
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [historyKind, setHistoryKind] = useState<"todos" | BeverageKind>("todos");
  const requestId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const result = await (supabase as any)
        .from("care_client_beverages")
        .select("id,kind,name,amount_ml,notes,consumed_at")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .order("consumed_at", { ascending: false })
        .limit(30);
      if (!active) return;
      if (result.error) setError("Não foi possível consultar as bebidas registradas.");
      else {
        setItems(result.data ?? []);
        setError("");
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [patientId, ownerId, revision, reload]);

  async function saveBeverage() {
    if (saving) return;
    const volume = Number(amount);
    if (kind !== "agua" && (name.trim().length < 2 || name.trim().length > 100)) {
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
    const label = (beverageCategory(kind)?.label ?? "bebida").toLowerCase();
    if (
      !(await dialog.confirm(
        "Confirmar registro?",
        kind === "agua"
          ? `Registrar ${volume} ml de água agora?`
          : `Registrar ${label}: ${name.trim()} (${volume} ml) agora?`,
        false,
        "Confirmar registro",
      ))
    )
      return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      // Water is part of the water-only goal, unlike teas, shakes or other drinks.
      // Use idempotent unscheduled water registration so it cannot be counted twice.
      const result =
        kind === "agua"
          ? await (supabase as any).rpc("care_log_unscheduled_intake", {
              p_patient_id: patientId,
              p_kind: "agua",
              p_description: "Água",
              p_amount_ml: volume,
              p_request_id: (requestId.current ??= crypto.randomUUID()),
            })
          : await (supabase as any).rpc("care_log_client_beverage", {
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
      setNotice(
        kind === "agua"
          ? `Água registrada às ${formatStamp(result.data)} (Acre). Sua meta diária foi atualizada; consulte Minha meta de água.`
          : `Consumo de ${(beverageCategory(kind)?.label ?? "bebida").toLowerCase()} registrado em ${formatStamp(result.data)} (Acre), no histórico de líquidos.`,
      );
      requestId.current = null;
      setPickedKey(null);
      setName("");
      setNotes("");
      setAmount("200");
      setReload((value) => value + 1);
      onRecorded?.();
    } catch {
      setError(
        "Não foi possível salvar o consumo. Confira a conexão e o prontuário antes de tentar novamente.",
      );
    } finally {
      setSaving(false);
    }
  }

  const ml = Math.max(0, Number(amount) || 0);
  const q = normalize(query);
  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const c of drinkCards) out[c.kind] = (out[c.kind] ?? 0) + 1;
    return out;
  }, []);
  // A busca varre TODAS as bebidas; a categoria só filtra a lista quando não há busca.
  const shown = useMemo(() => {
    if (q.length >= 2) {
      const tokens = q.split(" ");
      return drinkCards.filter((c) => {
        const hay = normalize(`${c.label} ${c.text}`).split(" ");
        return tokens.every((t) => hay.some((w) => w.startsWith(t)));
      });
    }
    return chip === "todas" ? drinkCards : drinkCards.filter((c) => c.kind === chip);
  }, [q, chip]);
  const tone = drinkTone[kind];
  const kcal = useMemo(
    () =>
      kind === "agua" || !name.trim()
        ? null
        : sumNutrients(parseFoodText(name, ml || null).map((f) => f.nutrients)).kcal,
    [kind, name, ml],
  );
  const pick = (card: (typeof drinkCards)[number]) => {
    setPickedKey(card.key);
    setKind(card.kind);
    setName(card.kind === "agua" ? card.label : card.text);
    setAmount(String(card.ml));
    setError("");
    setNotice("");
    requestId.current = null;
  };
  const clear = () => {
    setPickedKey(null);
    setName("");
    setAmount("200");
    setNotes("");
  };

  return (
    <section aria-label="Cadastro de chás e bebidas" className="space-y-3">
      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center bg-sky-500/10 text-sky-600 dark:text-sky-300">
              <Droplets size={18} />
            </span>
            <div className="min-w-0 leading-tight">
              <h3 className="text-sm font-bold text-foreground">Chás, bebidas, shakes e suplementos</h3>
              <p className="text-[11px] text-muted-foreground">
                Busque ou toque numa bebida e registre o consumo real (Acre).
              </p>
            </div>
            <label className="relative ml-auto block w-full min-w-[12rem] max-w-[20rem] flex-1">
              <span className="sr-only">Buscar bebida</span>
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar: água com limão, suco, café…"
                className="h-10 w-full border border-border bg-background/60 pl-8 pr-2 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>

          <div className="care-intake-choices flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            {[{ value: "todas" as const, label: "Todas", count: drinkCards.length }, ...beverageKinds.map((c) => ({ value: c.value, label: c.label, count: counts[c.value] ?? 0 }))].map((c) => {
              const on = q.length < 2 && chip === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setChip(c.value);
                    setQuery("");
                  }}
                  className={
                    "inline-flex h-8 shrink-0 items-center gap-1.5 border px-2.5 text-xs font-semibold transition active:scale-95 " +
                    (on
                      ? "border-transparent bg-foreground text-background"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground")
                  }
                >
                  {c.value !== "todas" && (
                    <span className="size-2" style={{ background: drinkTone[c.value] }} />
                  )}
                  {c.label}
                  <span className="text-[10px] tabular-nums opacity-70">{c.count}</span>
                </button>
              );
            })}
          </div>

          {shown.length ? (
            <ul className="grid max-h-[22rem] grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-2 overflow-y-auto overscroll-contain pr-1">
              {shown.map((card) => {
                const on = pickedKey === card.key;
                const tint = drinkTone[card.kind];
                return (
                  <li key={card.key}>
                    <button
                      type="button"
                      aria-pressed={on}
                      aria-label={`Escolher ${card.label}`}
                      onClick={() => pick(card)}
                      className={
                        "flex w-full items-center gap-2.5 border border-l-[3px] bg-card p-2 text-left transition duration-150 hover:bg-muted/50 active:scale-[.985] " +
                        (on ? "border-border" : "border-border")
                      }
                      style={
                        on
                          ? { borderLeftColor: tint, background: `color-mix(in srgb, ${tint} 10%, var(--card))` }
                          : undefined
                      }
                    >
                      <span
                        aria-hidden="true"
                        className="grid size-9 shrink-0 place-items-center"
                        style={{ background: `color-mix(in srgb, ${tint} 16%, transparent)`, color: tint }}
                      >
                        <CareIntakeIcon kind={card.kind} size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 block text-[13px] font-semibold leading-tight">
                          {card.label}
                        </span>
                        <span className="block text-[11px] tabular-nums text-muted-foreground">
                          {card.ml} ml
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="border border-dashed border-border p-4 text-sm text-muted-foreground">
              Nenhuma bebida da lista com esse nome.
              {q.length >= 2 && (
                <button
                  type="button"
                  onClick={() => {
                    setKind("outra");
                    setName(query.trim());
                    setPickedKey(null);
                  }}
                  className="mt-2 block border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-foreground hover:bg-primary/15"
                >
                  Usar “{query.trim()}” como bebida
                </button>
              )}
            </div>
          )}
        </div>

        <form
          aria-label="Sua bebida"
          className="flex min-w-0 flex-col gap-3 border border-border bg-card p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void saveBeverage();
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="flex items-center gap-2 text-sm font-bold">
              <span className="grid size-7 place-items-center text-white" style={{ background: tone }}>
                <CareIntakeIcon kind={kind} size={15} />
              </span>
              Sua bebida
            </h4>
            {(name.trim() || pickedKey) && (
              <button
                type="button"
                onClick={clear}
                className="h-7 px-2 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Limpar
              </button>
            )}
          </div>

          <label className="block text-xs font-semibold text-foreground">
            Nome da bebida
            <input
              className="field mt-1 w-full"
              type="text"
              maxLength={100}
              required
              readOnly={kind === "agua" && !!pickedKey}
              value={name}
              placeholder={beverageCategory(kind)?.example ?? "Descreva a bebida"}
              onChange={(event) => {
                setName(event.target.value);
                setPickedKey(null);
              }}
            />
          </label>

          <div>
            <span className="block text-xs font-semibold text-foreground">Volume</span>
            <div className="mt-1 flex items-center justify-center gap-3 bg-muted/40 p-2">
              <button
                type="button"
                aria-label="Menos 50 ml"
                onClick={() => setAmount(String(Math.max(10, ml - 50)))}
                className="grid size-10 place-items-center border border-border bg-card transition hover:bg-muted active:scale-90"
              >
                <Minus size={16} />
              </button>
              <label className="flex items-baseline gap-1">
                <span className="sr-only">Volume em ml</span>
                <input
                  type="number"
                  min={10}
                  max={1500}
                  step={1}
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-24 bg-transparent text-center text-3xl font-extrabold tabular-nums outline-none"
                />
                <span className="text-base font-semibold text-muted-foreground">ml</span>
              </label>
              <button
                type="button"
                aria-label="Mais 50 ml"
                onClick={() => setAmount(String(Math.min(1500, ml + 50)))}
                className="grid size-10 place-items-center border border-border bg-card transition hover:bg-muted active:scale-90"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {[100, 200, 300, 500].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={ml === value}
                  onClick={() => setAmount(String(value))}
                  className={
                    "border px-2 py-1.5 text-xs font-bold transition " +
                    (ml === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted")
                  }
                >
                  {value} ml
                </button>
              ))}
            </div>
          </div>

          {kind !== "agua" && (
            <label className="block text-xs font-semibold text-foreground">
              Observações (opcional)
              <input
                className="field mt-1 w-full"
                type="text"
                maxLength={300}
                value={notes}
                placeholder="Ex.: sem açúcar, temperatura ambiente"
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
          )}

          <p className="border border-border/70 bg-muted/30 px-2.5 py-2 text-xs">
            {kind === "agua" ? (
              <>
                <strong>0 kcal</strong> · entra na sua meta de água.
              </>
            ) : kcal !== null ? (
              <>
                <strong style={{ color: tone }}>{Math.round(kcal)} kcal</strong> estimadas para {ml} ml
                (valor aproximado).
              </>
            ) : (
              <span className="text-muted-foreground">Escolha uma bebida para ver as calorias.</span>
            )}
          </p>

          {error && (
            <p role="alert" className="border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="flex items-start gap-2 border border-success/30 bg-success/10 p-2 text-xs text-foreground">
              <CheckCircle2 size={15} className="shrink-0 text-success" />
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="nv-btn mt-auto w-full justify-center"
            style={{ ["--btn" as string]: tone }}
          >
            <Save size={16} /> {saving ? "Salvando…" : "Registrar bebida agora"}
          </button>
          <p className="text-[10px] leading-snug text-muted-foreground">
            Água entra na meta diária; não registre o mesmo copo na agenda. Chás, energéticos,
            suplementos líquidos e shakes ficam no histórico separado. Não é recomendação médica.
          </p>
        </form>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-foreground">Últimas bebidas registradas</h4>
          <NiceSelect
            ariaLabel="Filtrar bebidas por categoria"
            value={historyKind}
            onChange={(v) => setHistoryKind(v as "todos" | BeverageKind)}
            className="h-9 w-auto min-w-[11rem] text-xs"
            options={[
              { value: "todos", label: "Todas as categorias" },
              ...beverageKinds.map((choice) => ({
                value: choice.value,
                label: choice.label,
                hint: choice.hint,
              })),
            ]}
          />
        </div>
        {loading ? (
          <p className="text-xs text-muted-foreground">Carregando bebidas…</p>
        ) : items.filter((item) => historyKind === "todos" || item.kind === historyKind).length === 0 ? (
          <p className="border border-border p-3 text-xs text-muted-foreground">
            Nenhuma bebida nesta categoria. A água também aparece na aba Minha meta de água.
          </p>
        ) : (
          <ul className="grid max-h-[16rem] grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-1.5 overflow-y-auto overscroll-contain pr-1">
            {items
              .filter((item) => historyKind === "todos" || item.kind === historyKind)
              .map((item) => (
                <li
                  key={item.id}
                  className="flex min-w-0 items-center gap-2 border border-border bg-card p-2.5"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center"
                    style={{
                      background: `color-mix(in srgb, ${drinkTone[item.kind]} 16%, transparent)`,
                      color: drinkTone[item.kind],
                    }}
                  >
                    <CareIntakeIcon kind={item.kind} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {item.name} · {item.amount_ml} ml
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {beverageCategory(item.kind)?.label ?? "Bebida"}
                      {item.notes ? ` · ${item.notes}` : ""}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock3 size={11} />
                    {formatStamp(item.consumed_at)}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>
    </section>
  );
}
