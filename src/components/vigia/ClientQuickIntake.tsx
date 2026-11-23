import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Droplets, Plus, Save, UtensilsCrossed, X } from "lucide-react";
import { CareCategoryReport } from "./CareCategoryReport";
import { BarChart3 } from "lucide-react";
import { CareIntakePicker, CareIntakeIcon } from "./CareIntakePicker";
import { checkIntake } from "@/lib/hydration-need";
import { DrinkBoard } from "./DrinkBoard";
import { RecordOverview, type OverviewItem } from "./IntakeParts";
import { DrinkChoices } from "./DrinkChoices";
import { MealBoard } from "./MealBoard";
import { HowItWorks, drinkHowTo } from "./HowItWorks";
import {
  foodCategory,
  beverageCategory,
  isFoodKind,
  type IntakeKind,
  type FoodKind,
  type BeverageKind,
} from "@/lib/care-intake-categories";
import { parseFoodText, sumNutrients, measureUnit } from "@/lib/food-parser";
import { ingredientById } from "@/lib/nutrition-catalog";

/** Bebidas que fazem parte de uma refeição e podem ser registradas no prato. */
const MEAL_DRINK = /^(cafe|nescafe|nescau|achocolatado|ninho|leite|vitamina|cha_)/;
import { drinkGroups, drinkPresetFor, drinkPresets } from "@/lib/drink-presets";
import { supabase } from "@/integrations/supabase/client";

const mealTimes: { value: FoodKind; label: string }[] = [
  { value: "cafe_manha", label: "Café da manhã" },
  { value: "almoco", label: "Almoço" },
  { value: "jantar", label: "Jantar" },
  { value: "lanche", label: "Lanche" },
  { value: "ceia", label: "Ceia" },
];
/** Sugere a refeição pelo horário do Acre ("YYYY-MM-DDTHH:mm"). */
function suggestMealType(wallTime: string): FoodKind {
  const minutes = Number(wallTime.slice(11, 13)) * 60 + Number(wallTime.slice(14, 16));
  if (!Number.isFinite(minutes)) return "lanche";
  if (minutes >= 300 && minutes < 600) return "cafe_manha";
  if (minutes >= 600 && minutes < 690) return "lanche";
  if (minutes >= 690 && minutes < 900) return "almoco";
  if (minutes >= 900 && minutes < 1080) return "lanche";
  if (minutes >= 1080 && minutes < 1260) return "jantar";
  return "ceia";
}

type AskRequest = {
  lines: string[];
  when: string;
  needsMeal: boolean;
  initial: FoodKind;
  suggested: boolean;
};

/** Confirmação final: resume o registro e pergunta QUAL refeição é (sugerida pelo horário). */
function MealConfirm({
  request,
  onClose,
}: {
  request: AskRequest;
  onClose: (value: FoodKind | "ok" | null) => void;
}) {
  const [meal, setMeal] = useState<FoodKind>(request.initial);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/70 p-3 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose(null)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="meal-confirm-title"
        className="nv-pop w-full max-w-md border border-border bg-card p-4 text-card-foreground shadow-2xl"
      >
        <h2 id="meal-confirm-title" className="text-base font-bold">
          Confirmar registro?
        </h2>
        <ul className="mt-2 grid gap-1 text-sm">
          {request.lines.map((line) => (
            <li key={line} className="border-l-2 border-l-primary pl-2">
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-muted-foreground">{request.when} · horário do Acre</p>
        {request.needsMeal && (
          <div className="mt-3" role="group" aria-label="Qual refeição é esta?">
            <p className="text-xs font-bold">
              Qual refeição é esta?
              {request.suggested && (
                <span className="ml-1 font-normal text-muted-foreground">
                  (sugerida pelo horário)
                </span>
              )}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {mealTimes.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={m.value === meal}
                  onClick={() => setMeal(m.value)}
                  className={
                    "h-9 border px-3 text-xs font-semibold transition active:scale-95 " +
                    (m.value === meal
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground")
                  }
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
          <button type="button" className="nv-btn nv-btn-ghost px-4" onClick={() => onClose(null)}>
            Cancelar
          </button>
          <button
            type="button"
            className="nv-btn"
            autoFocus
            onClick={() => onClose(request.needsMeal ? meal : "ok")}
          >
            Confirmar registro
          </button>
        </div>
      </div>
    </div>
  );
}

type Draft = { kind: IntakeKind; description: string; portion: string; amount: string };

type Props = {
  patientId: string;
  onRecorded?: () => void;
  variant?: "home" | "panel";
  mode?: "all" | "water" | "food" | "drink";
  /** Increment to open the existing form from a dashboard card. */ openSignal?: number;
};
const zone = "America/Rio_Branco";
const formatTime = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: zone,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));

/** datetime-local does not carry a timezone; its displayed value is always Acre wall time. */
const acreInputValue = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
};

/** Registros avulsos não criam tarefas e não confirmam horários da programação. */
export function ClientQuickIntake({
  patientId,
  onRecorded,
  variant = "panel",
  mode = "all",
  openSignal = 0,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [kind, setKind] = useState<IntakeKind>("lanche");
  const [group, setGroup] = useState<"food" | "beverage">("food");
  const [portion, setPortion] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("200");
  const [consumedAt, setConsumedAt] = useState("");
  const [manualTime, setManualTime] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const requestId = useRef<string | null>(null);
  const drinkRequestId = useRef<string | null>(null);
  // Tipo da refeição escolhido pelo usuário; enquanto null, vale a sugestão pelo horário.
  const [mealChoice, setMealChoice] = useState<FoodKind | null>(null);
  const [ask, setAsk] = useState<{
    lines: string[];
    when: string;
    needsMeal: boolean;
    initial: FoodKind;
    suggested: boolean;
    resolve: (value: FoodKind | "ok" | null) => void;
  } | null>(null);
  const askConfirmation = (request: Omit<NonNullable<typeof ask>, "resolve">) =>
    new Promise<FoodKind | "ok" | null>((resolve) => setAsk({ ...request, resolve }));
  // Rascunho do outro grupo: trocar entre Alimentos e Bebidas nunca apaga o que já foi escolhido.
  const [stash, setStash] = useState<{ food?: Draft; beverage?: Draft }>({});
  const openedBySignal = useRef(0);

  const isFood = isFoodKind(kind);
  const isWater = kind === "agua";
  const option = foodCategory(kind) ?? beverageCategory(kind);
  const label = option?.label ?? "Consumo avulso";
  function openForm() {
    requestId.current = crypto.randomUUID();
    drinkRequestId.current = crypto.randomUUID();
    setStash({});
    setMealChoice(null);
    const initialGroup = mode === "water" || mode === "drink" ? "beverage" : "food";
    setGroup(initialGroup);
    setKind(
      mode === "water" ? "agua" : mode === "drink" ? "cha" : mode === "food" ? "almoco" : "lanche",
    );
    setDescription("");
    setPortion("");
    setAmount("200");
    setConsumedAt(acreInputValue());
    setManualTime(false);
    setError("");
    setNotice("");
    setOpen(true);
  }
  // A home card may open this same form without creating an extra intake
  // instance or bypassing the server's idempotent save/confirmation rules.
  useEffect(() => {
    if (openSignal > openedBySignal.current && patientId) {
      openedBySignal.current = openSignal;
      openForm();
    }
    // Only a new click signal opens the form; changing patient data alone cannot
    // reopen a form unexpectedly or duplicate an earlier registration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSignal, patientId]);

  function closeForm() {
    if (!saving) {
      setOpen(false);
      setError("");
      requestId.current = null;
      drinkRequestId.current = null;
    }
  }

  const live: Draft = { kind, description, portion, amount };
  const foodDraft = group === "food" ? live : stash.food;
  const drinkDraft = group === "beverage" ? live : stash.beverage;
  const mealType: FoodKind = mealChoice ?? suggestMealType(consumedAt || acreInputValue());
  const foodCount = (foodDraft?.description ?? "").split(/\s*,\s*/).filter(Boolean).length;
  const drinkSelected = !!drinkDraft?.description.trim();
  // Resumo consolidado do que está sendo montado: alimentos (um por linha) + bebida escolhida.
  const foodParsed = parseFoodText(foodDraft?.description ?? "");
  const drinkMl = Number(drinkDraft?.amount) || 0;
  const drinkParsed = drinkSelected ? parseFoodText(drinkDraft!.description, drinkMl || null) : [];
  const overviewItems: OverviewItem[] = [
    ...foodParsed.map((f, i) => ({
      key: `a${i}-${f.id}`,
      group: "food" as const,
      name: f.name.split(",")[0],
      detail: `${Math.round(f.grams)} ${measureUnit(f.id)}`,
      kcal: f.nutrients.kcal,
    })),
    ...(drinkSelected
      ? [
          {
            key: "bebida",
            group: "beverage" as const,
            name: drinkDraft!.description.trim(),
            detail: `${drinkMl} ml`,
            kcal: sumNutrients(drinkParsed.map((f) => f.nutrients)).kcal,
          },
        ]
      : []),
  ];
  // Itens escritos que o leitor não reconheceu ainda contam como item do registro.
  const unrecognized =
    foodCount > 0 && foodParsed.length === 0
      ? [
          {
            key: "livre",
            group: "food" as const,
            name: foodDraft!.description.trim(),
            detail: "texto livre",
            kcal: 0,
          },
        ]
      : [];
  const allItems = [...overviewItems, ...unrecognized];
  const combined = sumNutrients([
    ...foodParsed.map((f) => f.nutrients),
    ...drinkParsed.map((f) => f.nutrients),
  ]);
  const overview = allItems.length ? (
    <RecordOverview items={allItems} active={group} onOpen={switchGroup} totals={combined} />
  ) : undefined;
  const totals = allItems.length ? combined : undefined;
  const registerNote = allItems.length > 1 ? `${allItems.length} itens` : undefined;

  function switchGroup(next: "food" | "beverage") {
    if (next === group) return;
    const saved = stash[next];
    setStash((current) => ({ ...current, [group]: live }));
    setGroup(next);
    setKind(saved?.kind ?? (next === "food" ? "almoco" : "agua"));
    setDescription(saved?.description ?? "");
    setPortion(saved?.portion ?? "");
    setAmount(saved?.amount ?? "200");
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !requestId.current || !drinkRequestId.current) return;
    type Entry = {
      id: string;
      kind: IntakeKind;
      description: string;
      volume: number | null;
      summary: string;
    };
    const entries: Entry[] = [];
    // Alimentos escolhidos (qualquer refeição) viram um registro.
    if (foodDraft && foodDraft.description.trim()) {
      const text =
        foodDraft.description.trim() +
        (foodDraft.portion.trim() ? " · Porção: " + foodDraft.portion.trim() : "");
      if (foodDraft.description.trim().length < 3 || text.length > 1000) {
        setError("Descreva o alimento consumido (3 a 1.000 caracteres).");
        return;
      }
      // Alimentos e bebidas não se misturam: bebida digitada no prato vai para a aba Bebidas.
      // Exceção: café, leite, achocolatado, vitamina e chá acompanham a refeição (café da manhã, lanche).
      const stray = parseFoodText(foodDraft.description).filter(
        (f) => ingredientById.get(f.id)?.group === "bebidas" && !MEAL_DRINK.test(f.id),
      );
      if (stray.length) {
        setError(
          `“${stray.map((f) => f.name.split(",")[0]).join(", ")}” é bebida. Retire do prato e registre na aba Bebidas.`,
        );
        return;
      }
      entries.push({
        id: requestId.current,
        kind: mealType,
        description: text,
        volume: null,
        summary: `${(foodCategory(mealType)?.label ?? "refeição").toLowerCase()}: ${text}`,
      });
    }
    // A bebida escolhida (se houver) vira outro registro, junto com a refeição.
    const drinkIsWater = drinkDraft?.kind === "agua";
    if (drinkDraft && (drinkDraft.description.trim() || (group === "beverage" && drinkIsWater))) {
      const name = drinkIsWater ? "Água" : drinkDraft.description.trim();
      const ml = Number(drinkDraft.amount);
      if (!drinkIsWater && (name.length < 2 || name.length > 100)) {
        setError("Informe a bebida (2 a 100 caracteres).");
        return;
      }
      if (!Number.isInteger(ml) || ml < 10 || ml > 1500) {
        setError("Informe um volume entre 10 e 1.500 ml.");
        return;
      }
      entries.push({
        id: drinkRequestId.current,
        kind: drinkDraft.kind,
        description: name,
        volume: ml,
        summary: drinkIsWater
          ? `${ml} ml de água`
          : `${(beverageCategory(drinkDraft.kind)?.label ?? "bebida").toLowerCase()}: ${name} (${ml} ml)`,
      });
    }
    if (!entries.length) {
      setError(
        group === "food"
          ? "Descreva o alimento consumido (3 a 1.000 caracteres)."
          : "Informe a bebida (2 a 100 caracteres).",
      );
      return;
    }
    // Current-time entries use the database clock. Only manually selected times
    // are converted from Acre wall time and sent by the browser.
    const consumed = manualTime ? new Date(consumedAt + "-05:00") : null;
    if (manualTime && (!consumed || !Number.isFinite(consumed.getTime()))) {
      setError("Confira a data e a hora informadas no fuso do Acre (UTC−5).");
      return;
    }
    setError("");
    const when = manualTime ? `em ${consumedAt.replace("T", " às ")}` : "agora";
    const hasFood = entries.some((e) => e.id === requestId.current);
    const chosen = await askConfirmation({
      lines: entries.map((e) => e.summary),
      when,
      needsMeal: hasFood,
      initial: mealChoice ?? suggestMealType(consumedAt || acreInputValue()),
      suggested: mealChoice === null,
    });
    if (chosen === null) return;
    // O tipo da refeição é definido AQUI, na confirmação.
    if (hasFood && chosen !== "ok") {
      const food = entries.find((e) => e.id === requestId.current)!;
      food.kind = chosen;
      setMealChoice(chosen);
    }
    setSaving(true);
    try {
      let data: unknown = null;
      for (const entry of entries) {
        const { data: when, error: failure } = await (supabase as any).rpc(
          "care_log_unscheduled_intake",
          {
            p_patient_id: patientId,
            p_kind: entry.kind,
            p_description: entry.description,
            p_amount_ml: entry.volume,
            p_request_id: entry.id,
            p_consumed_at: consumed?.toISOString() ?? null,
          },
        );
        if (failure) throw failure;
        data = when;
      }
      if (typeof data !== "string" || !Number.isFinite(Date.parse(data))) {
        throw new Error("O servidor não confirmou o horário de registro.");
      }
      const effectiveConsumedAt = manualTime ? consumed!.toISOString() : data;
      const only = entries.length === 1 ? entries[0] : null;
      setNotice(
        only && only.kind === "agua"
          ? `Água registrada em ${formatTime(effectiveConsumedAt)} (Acre). Meta e histórico atualizados.`
          : entries.length > 1
            ? `Refeição e bebida registradas em ${formatTime(effectiveConsumedAt)} (Acre). Veja o histórico no prontuário.`
            : `Consumo (${(only ? (foodCategory(only.kind) ?? beverageCategory(only.kind))?.label : label)?.toLowerCase()}) registrado em ${formatTime(effectiveConsumedAt)} (Acre). Veja o histórico no prontuário.`,
      );
      setOpen(false);
      requestId.current = null;
      drinkRequestId.current = null;
      onRecorded?.();
    } catch (failure) {
      const detail =
        failure && typeof failure === "object" && "message" in failure
          ? String((failure as { message?: unknown }).message ?? "")
          : failure instanceof Error
            ? failure.message
            : "";
      const friendly = /future/i.test(detail)
        ? "O horário informado está no futuro no horário do Acre. Confira e tente novamente."
        : /last 7 days|older than 7 days/i.test(detail)
          ? "O horário informado ultrapassa o limite de 7 dias. Escolha uma data mais recente."
          : /Patient unavailable|Authentication required/i.test(detail)
            ? "Sua sessão ou o vínculo com o prontuário expirou. Entre novamente e tente salvar."
            : detail || "Confira sua conexão e tente novamente.";
      setError(`Não foi possível salvar. ${friendly}`);
      // Mantém o mesmo identificador para reenvios sem duplicar lançamentos.
    } finally {
      setSaving(false);
    }
  }

  const groupToggle =
    mode !== "water" ? (
      <div
        role="group"
        aria-label={
          mode === "all" ? "Selecionar tipo de consumo" : "Alternar entre alimentos e bebidas"
        }
        className="grid w-full shrink-0 grid-cols-2 gap-0.5 border border-border bg-muted/40 p-0.5"
      >
        <button
          type="button"
          aria-pressed={group === "food"}
          onClick={() => switchGroup("food")}
          className={
            "relative flex h-8 min-w-0 items-center justify-center gap-1 px-1.5 text-[11px] font-semibold transition " +
            (group === "food"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          <UtensilsCrossed size={14} /> Alimentos
          {foodCount > 0 && group !== "food" && (
            <span className="absolute -right-1 -top-1.5 grid h-4 min-w-4 place-items-center bg-amber-400 px-1 text-[10px] font-bold text-slate-900 shadow">
              {foodCount}
            </span>
          )}
        </button>
        <button
          type="button"
          aria-pressed={group === "beverage"}
          onClick={() => switchGroup("beverage")}
          className={
            "relative flex h-8 min-w-0 items-center justify-center gap-1 px-1.5 text-[11px] font-semibold transition " +
            (group === "beverage"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          <Droplets size={14} /> Bebidas
          {drinkSelected && group !== "beverage" && (
            <span className="absolute -right-1 -top-1.5 grid h-4 min-w-4 place-items-center bg-amber-400 px-1 text-[10px] font-bold text-slate-900 shadow">
              1
            </span>
          )}
        </button>
      </div>
    ) : null;

  return (
    <>
      {reportOpen && (
        <CareCategoryReport
          patientId={patientId}
          category={mode === "water" || mode === "drink" ? "hidratacao" : "refeicao"}
          onClose={() => setReportOpen(false)}
        />
      )}

      <button
        type="button"
        onClick={openForm}
        disabled={!patientId}
        className={
          variant === "home"
            ? "inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 border border-sky-300/40 bg-sky-300/15 px-2.5 text-[11px] font-bold text-primary-foreground transition hover:bg-sky-300/25 dark:text-sky-100 disabled:opacity-50"
            : mode === "water"
              ? "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 bg-sky-500 px-4 text-[13px] font-bold text-white shadow-lg shadow-sky-900/30 transition hover:bg-sky-400 active:scale-[.97] disabled:opacity-50"
              : mode === "drink"
                ? "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 bg-violet-500 px-4 text-[13px] font-bold text-white shadow-lg shadow-violet-900/30 transition hover:bg-violet-400 active:scale-[.97] disabled:opacity-50"
                : "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 bg-emerald-500 px-4 text-[13px] font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-400 active:scale-[.97] disabled:opacity-50"
        }
      >
        {mode === "water" || mode === "drink" ? (
          <Droplets size={16} />
        ) : mode === "food" ? (
          <UtensilsCrossed size={16} />
        ) : (
          <Plus size={16} />
        )}{" "}
        {mode === "water"
          ? "Registrar água"
          : mode === "food"
            ? "Registrar refeição"
            : mode === "drink"
              ? "Registrar bebida"
              : "Registrar consumo"}
      </button>
      {notice &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="status"
            className="fixed right-3 top-16 z-[151] flex max-w-sm items-start gap-2 border border-success/30 bg-card p-3 text-xs font-semibold text-foreground shadow-xl"
          >
            <CheckCircle2 size={17} className="shrink-0 text-success" />
            <span className="flex-1">{notice}</span>
            <button type="button" aria-label="Fechar aviso" onClick={() => setNotice("")}>
              <X size={16} />
            </button>
          </div>,
          document.body,
        )}
      {ask &&
        typeof document !== "undefined" &&
        createPortal(
          <MealConfirm
            request={ask}
            onClose={(value) => {
              ask.resolve(value);
              setAsk(null);
            }}
          />,
          document.body,
        )}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={
              "care-intake-modal-overlay fixed inset-0 z-[150] flex items-center justify-center overflow-hidden bg-slate-950/60 backdrop-blur-sm " +
              (mode !== "water" ? "p-2" : "p-3")
            }
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeForm();
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="quick-intake-title"
              className={
                "care-premium-intake-dialog care-intake-responsive-v2 care-intake-oneview flex max-h-[94dvh] w-full min-w-0 " +
                (mode === "water"
                  ? "max-w-[560px]"
                  : "h-full max-h-full max-w-[min(1400px,100%)]") +
                " flex-col overflow-hidden border border-border bg-card p-4 text-card-foreground shadow-2xl sm:p-5"
              }
            >
              <div className="care-premium-intake-header flex shrink-0 items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-9 place-items-center bg-primary/10 text-primary">
                    <CareIntakeIcon kind={kind} size={20} />
                  </span>
                  <div>
                    <h2 id="quick-intake-title" className="text-base font-bold">
                      {mode === "water"
                        ? "Registrar água"
                        : isFood
                          ? "Registrar refeição"
                          : "Registrar bebida"}
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      Informe o horário do consumo · fuso horário do Acre
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {mode !== "water" && (
                    <button
                      type="button"
                      onClick={() => setReportOpen(true)}
                      className="nv-btn nv-btn-ghost !min-h-9 px-3 text-xs"
                    >
                      <BarChart3 size={15} />{" "}
                      <span className="hidden sm:inline">Relatório diário, mensal e anual</span>
                      <span className="sm:hidden">Relatório</span>
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Fechar"
                    disabled={saving}
                    onClick={closeForm}
                    className="grid size-8 place-items-center border border-border"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <form
                className={
                  "care-intake-oneview-form mt-2 grid min-h-0 flex-1 content-start gap-3 overflow-y-auto overscroll-contain pr-1 " +
                  (mode === "water" ? "" : "")
                }
                onSubmit={(event) => void save(event)}
              >
                {isFood ? (
                  <MealBoard
                    kind={kind as FoodKind}
                    onKind={(selected) => {
                      setKind(selected);
                      if (mealTimes.some((m) => m.value === selected)) setMealChoice(selected);
                      setError("");
                    }}
                    description={description}
                    onDescription={setDescription}
                    portion={portion}
                    onPortion={setPortion}
                    consumedAt={consumedAt}
                    onConsumedAt={(value) => {
                      setConsumedAt(value);
                      setManualTime(true);
                    }}
                    error={error}
                    saving={saving}
                    onCancel={closeForm}
                    topSlot={groupToggle}
                    overview={overview}
                    totals={totals}
                    registerNote={registerNote}
                  />
                ) : mode !== "water" ? (
                  <DrinkBoard
                    kind={kind as BeverageKind}
                    onKind={(selected) => {
                      setKind(selected);
                      setError("");
                    }}
                    description={description}
                    onDescription={setDescription}
                    amount={amount}
                    onAmount={setAmount}
                    consumedAt={consumedAt}
                    onConsumedAt={(value) => {
                      setConsumedAt(value);
                      setManualTime(true);
                    }}
                    error={error}
                    saving={saving}
                    onCancel={closeForm}
                    topSlot={groupToggle}
                    overview={overview}
                    totals={totals}
                    registerNote={registerNote}
                  />
                ) : (
                  <>
                    <div className="grid min-w-0 content-start gap-2 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
                      {groupToggle}
                      {mode !== "water" && (
                        <div className="care-intake-picker-scroll care-intake-picker-visible min-w-0 border border-border/60 bg-muted/[.13] p-2">
                          {group === "food" ? (
                            <CareIntakePicker
                              group="food"
                              value={isFoodKind(kind) ? kind : "lanche"}
                              onChange={(selected: FoodKind) => {
                                setKind(selected);
                                setDescription("");
                                setPortion("");
                                setError("");
                              }}
                              compact
                            />
                          ) : (
                            <CareIntakePicker
                              group="beverage"
                              value={!isFoodKind(kind) ? (kind as BeverageKind) : "agua"}
                              onChange={(selected: BeverageKind) => {
                                setKind(selected);
                                setDescription("");
                                setPortion("");
                                setAmount(String(beverageCategory(selected)?.amount ?? 200));
                                setError("");
                              }}
                              compact
                            />
                          )}
                        </div>
                      )}
                      <p className="flex min-w-0 items-center gap-1.5 bg-primary/[.06] px-2.5 py-2 text-[11px] font-semibold text-foreground">
                        <CareIntakeIcon kind={kind} size={16} className="shrink-0 text-primary" />
                        <span className="min-w-0 flex-1">
                          {label}{" "}
                          <span className="font-normal text-muted-foreground">
                            · {option?.hint}
                          </span>
                        </span>
                      </p>
                    </div>
                    <div className="grid min-w-0 content-start gap-2 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
                      {!isWater && (
                        <div className="grid min-w-0 gap-2">
                          <label className="text-xs font-semibold">
                            Escolher bebida
                            <select
                              className="field mt-1 w-full"
                              aria-label="Escolher bebida da lista"
                              value={drinkPresetFor(kind, description)?.key ?? ""}
                              onChange={(event) => {
                                const preset = drinkPresets.find(
                                  (item) => item.key === event.target.value,
                                );
                                if (!preset) {
                                  setDescription("");
                                  return;
                                }
                                setKind(preset.kind);
                                setDescription(
                                  preset.text.charAt(0).toUpperCase() + preset.text.slice(1),
                                );
                                setAmount(String(preset.ml));
                                setError("");
                              }}
                            >
                              <option value="">Outra bebida (digitar abaixo)</option>
                              {drinkGroups.map((group) => (
                                <optgroup key={group} label={group}>
                                  {drinkPresets
                                    .filter((item) => item.group === group)
                                    .map((item) => (
                                      <option key={item.key} value={item.key}>
                                        {item.label}
                                      </option>
                                    ))}
                                </optgroup>
                              ))}
                            </select>
                          </label>
                          <DrinkChoices
                            kind={kind}
                            description={description}
                            kindLabel={beverageCategory(kind)?.label ?? "bebida"}
                            onPick={(preset) => {
                              setKind(preset.kind);
                              setDescription(preset.text);
                              setAmount(String(preset.ml));
                              setError("");
                            }}
                          />
                          <label className="text-xs font-semibold">
                            Nome da bebida
                            <input
                              type="text"
                              className="field mt-1 w-full"
                              maxLength={100}
                              value={description}
                              required
                              onChange={(event) => setDescription(event.target.value)}
                              placeholder={beverageCategory(kind)?.example ?? "Descreva a bebida"}
                            />
                          </label>
                        </div>
                      )}
                      {!isWater &&
                        (() => {
                          const foods = parseFoodText(
                            isFood ? `${portion} ${description}` : description,
                            isFood ? null : Number(amount),
                          );
                          if (!foods.length) return null;
                          const t = sumNutrients(foods.map((f) => f.nutrients));
                          return (
                            <div
                              className=" border border-emerald-500/30 bg-emerald-500/[.07] p-3 text-xs"
                              aria-live="polite"
                            >
                              <p className="font-bold text-emerald-800 dark:text-emerald-200">
                                Cálculo automático
                              </p>
                              <p className="mt-1 text-muted-foreground">
                                {foods
                                  .map(
                                    (f) =>
                                      `${f.name.split(",")[0]} ${f.grams} ${measureUnit(f.id)}`,
                                  )
                                  .join(" · ")}
                              </p>
                              <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
                                {[
                                  ["kcal", t.kcal, "text-orange-600"],
                                  ["Prot.", t.protein, "text-rose-600"],
                                  ["Carb.", t.carbs, "text-amber-600"],
                                  ["Gord.", t.fat, "text-violet-600"],
                                ].map(([l, v, c]) => (
                                  <span key={l as string} className=" bg-card px-1 py-1.5">
                                    <strong className={`block text-sm ${c}`}>
                                      {Math.round(v as number)}
                                      {l === "kcal" ? "" : "g"}
                                    </strong>
                                    {l}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      {isWater &&
                        (() => {
                          const ml = Math.max(0, Number(amount) || 0);
                          const cups: [number, string, number][] = [
                            [100, "Gole", 0.55],
                            [200, "Copo", 0.75],
                            [300, "Copo grande", 0.9],
                            [500, "Garrafa", 1],
                          ];
                          return (
                            <div className="grid gap-3">
                              <div
                                className="grid grid-cols-4 gap-2"
                                role="radiogroup"
                                aria-label="Volume"
                              >
                                {cups.map(([v, l, h]) => {
                                  const on = ml === v;
                                  return (
                                    <button
                                      key={v}
                                      type="button"
                                      role="radio"
                                      aria-checked={on}
                                      onClick={() => setAmount(String(v))}
                                      className={
                                        "group flex flex-col items-center gap-1 border p-2 pt-3 transition active:scale-95 " +
                                        (on
                                          ? "border-sky-500 bg-sky-500/10 shadow-[0_8px_24px_-12px_rgba(14,165,233,.8)]"
                                          : "border-border hover:border-sky-500/40 hover:bg-sky-500/[.05]")
                                      }
                                    >
                                      <svg
                                        viewBox="0 0 40 52"
                                        className="h-12 w-auto"
                                        aria-hidden="true"
                                      >
                                        {v === 500 ? (
                                          <path
                                            d="M15 4h10v6l4 5v33a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3V15l4-5z"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className="text-sky-500/70"
                                          />
                                        ) : (
                                          <path
                                            d={`M${8 + (1 - h) * 6} ${50 - 46 * h}h${24 - (1 - h) * 12}l-2.5 ${46 * h - 3}a3 3 0 0 1-3 3h-10a3 3 0 0 1-3-3z`}
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className="text-sky-500/70"
                                          />
                                        )}
                                        <clipPath id={"cup" + v}>
                                          {v === 500 ? (
                                            <path d="M15 4h10v6l4 5v33a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3V15l4-5z" />
                                          ) : (
                                            <path
                                              d={`M${8 + (1 - h) * 6} ${50 - 46 * h}h${24 - (1 - h) * 12}l-2.5 ${46 * h - 3}a3 3 0 0 1-3 3h-10a3 3 0 0 1-3-3z`}
                                            />
                                          )}
                                        </clipPath>
                                        <rect
                                          x="0"
                                          y={on ? 18 : 44}
                                          width="40"
                                          height="40"
                                          clipPath={`url(#cup${v})`}
                                          className="fill-sky-400 group-hover:fill-sky-300"
                                          style={{ transition: "y .5s ease, fill .2s" }}
                                        />
                                      </svg>
                                      <strong className="text-sm tabular-nums">{v} ml</strong>
                                      <span className="text-[10px] text-muted-foreground">{l}</span>
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="flex items-center justify-center gap-3 bg-sky-500/[.07] p-3">
                                <button
                                  type="button"
                                  aria-label="Menos 50 ml"
                                  onClick={() => setAmount(String(Math.max(10, ml - 50)))}
                                  className="grid size-11 place-items-center border border-border bg-card text-lg font-bold transition hover:bg-muted active:scale-90"
                                >
                                  −
                                </button>
                                <label className="flex items-baseline gap-1">
                                  <span className="sr-only">Quantidade consumida em ml</span>
                                  <input
                                    type="number"
                                    min={10}
                                    max={1500}
                                    step={10}
                                    required
                                    value={amount}
                                    onChange={(event) => setAmount(event.target.value)}
                                    className="w-28 bg-transparent text-center text-4xl font-extrabold tabular-nums outline-none"
                                  />
                                  <span className="text-lg font-semibold text-muted-foreground">
                                    ml
                                  </span>
                                </label>
                                <button
                                  type="button"
                                  aria-label="Mais 50 ml"
                                  onClick={() => setAmount(String(Math.min(1500, ml + 50)))}
                                  className="grid size-11 place-items-center border border-border bg-card text-lg font-bold transition hover:bg-muted active:scale-90"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      {!isFood && !isWater && (
                        <div aria-label="Volumes sugeridos" className="grid grid-cols-4 gap-1.5">
                          {[100, 200, 300, 500].map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setAmount(String(value))}
                              aria-pressed={amount === String(value)}
                              className={
                                " border px-2 py-2 text-xs font-bold transition " +
                                (amount === String(value)
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border hover:bg-muted")
                              }
                            >
                              {value} ml
                            </button>
                          ))}
                        </div>
                      )}
                      {!isFood && !isWater && (
                        <label className="text-xs font-semibold">
                          Quantidade consumida (ml)
                          <input
                            type="number"
                            min={10}
                            max={1500}
                            step={1}
                            required
                            className="field mt-1 w-full"
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                          />
                        </label>
                      )}
                      {!isFood && <HowItWorks>{drinkHowTo}</HowItWorks>}
                      {!isFood &&
                        (() => {
                          const check = checkIntake(Number(amount) || 0);
                          return check.message ? (
                            <p
                              role="status"
                              className={
                                " border p-2 text-xs " +
                                (check.level === "excess"
                                  ? "border-destructive/40 bg-destructive/5 text-destructive"
                                  : "border-amber-500/30 bg-amber-500/[.07]")
                              }
                            >
                              {check.message}
                            </p>
                          ) : null;
                        })()}
                      <div className="min-w-0 max-w-full overflow-hidden border border-border/70 bg-card/80 p-3 space-y-2 text-foreground">
                        <label className="block min-w-0 max-w-full text-xs font-semibold">
                          Data e hora do consumo · horário do Acre (UTC−5)
                          <input
                            type="datetime-local"
                            required
                            value={consumedAt}
                            onChange={(event) => {
                              setConsumedAt(event.target.value);
                              setManualTime(true);
                            }}
                            className="field care-intake-datetime mt-1 block w-full min-w-0 max-w-full"
                            style={{ boxSizing: "border-box", minWidth: 0, maxWidth: "100%" }}
                          />
                        </label>
                        <p className="text-[11px] text-muted-foreground">
                          Já vem com o horário atual. Altere só se o consumo foi em outro momento.
                        </p>
                      </div>
                      {!isWater && (
                        <p className="text-[11px] text-muted-foreground">
                          {isFood
                            ? "Escolha o tipo certo (Almoço, Jantar…) para conciliar com a sua programação."
                            : "Entra no total de líquidos do dia."}
                        </p>
                      )}
                      {error && (
                        <p
                          role="alert"
                          className=" border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive"
                        >
                          {error}
                        </p>
                      )}
                      <div
                        data-intake-actions
                        className="sticky bottom-0 z-10 -mx-1 grid grid-cols-2 gap-2 border-t border-border bg-card px-1 pb-1 pt-2.5 lg:col-span-full"
                      >
                        <button
                          type="button"
                          disabled={saving}
                          onClick={closeForm}
                          className=" border border-primary/30 bg-slate-950/75 px-3 py-2.5 text-xs font-semibold text-foreground disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="inline-flex items-center justify-center gap-1.5 bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground transition hover:bg-primary disabled:opacity-50"
                        >
                          <Save size={15} />
                          {saving ? "Salvando..." : "Registrar agora"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </form>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
