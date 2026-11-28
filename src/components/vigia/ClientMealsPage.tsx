import { DailyNutritionPanel, useDailyNutrition, type DailyNutrition } from "./DailyNutritionPanel";
import { measureUnit, sumNutrients, type Nutrients } from "@/lib/food-parser";
import { createPortal } from "react-dom";
import { usePlatformStart } from "@/lib/platform-start";
import { DayLookup } from "./DayLookup";
import { DayDetailDialog } from "./DayDetailDialog";
import { NutritionGuardPanel } from "./NutritionGuard";
import { Fold } from "./Fold";
import { MealMacroBars, NutritionDayChart, NutritionHero } from "./NutritionHero";
import { useEffect, useMemo, useState } from "react";
import { MealEditDialog, canEditMeal, mealIsLocked, useMealActions } from "./MealEditDialog";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  Info,
  Lock,
  Pencil,
  Search,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ClientQuickIntake } from "./ClientQuickIntake";
import { getCareIntakeIcon } from "./CareIntakePicker";
import type { FoodKind } from "@/lib/care-intake-categories";
import { careReminderState, reminderClock, type ReminderTask } from "@/lib/care-reminders";
type PatientCare = ReminderTask & { patient_id: string };

type Props = {
  patientId: string;
  ownerId: string;
  meals: PatientCare[];
  resolved?: Record<string, string>;
  revision: number;
  now?: number;
  onView: (task: PatientCare) => void;
  onConfirm: (task: PatientCare) => void;
  onDelete: (task: PatientCare) => void;
  onRecorded: () => void;
};

type MealDetail = { task_id: string; description: string; recorded_at: string | null };
type UnscheduledMeal = {
  id: string;
  happened_at: string;
  details: { kind?: string; title?: string; description?: string } | null;
};
const foodKinds = new Set([
  "refeicao",
  "lanche",
  "fruta",
  "cafe_manha",
  "almoco",
  "jantar",
  "ceia",
  "sobremesa",
  "salada",
  "sopa",
]);
const PAGE_SIZE = 4;
const mealKind = (title: string): FoodKind => {
  if (/café da manhã|cafe da manha/i.test(title)) return "cafe_manha";
  if (/almoço|almoco/i.test(title)) return "almoco";
  if (/jantar/i.test(title)) return "jantar";
  if (/ceia/i.test(title)) return "ceia";
  if (/lanche|colação|colacao/i.test(title)) return "lanche";
  if (/fruta/i.test(title)) return "fruta";
  if (/salada/i.test(title)) return "salada";
  if (/sopa|caldo/i.test(title)) return "sopa";
  if (/sobremesa/i.test(title)) return "sobremesa";
  return "refeicao";
};
const foodIcon = (title: string) => getCareIntakeIcon(mealKind(title)) ?? UtensilsCrossed;

export function ClientMealsPage({
  patientId,
  ownerId,
  meals,
  resolved = {},
  revision,
  now = Date.now(),
  onView,
  onConfirm,
  onDelete,
  onRecorded,
}: Props) {
  const nutrition = useDailyNutrition(patientId, ownerId, revision);
  const platformStart = usePlatformStart(patientId, ownerId);
  const [lookupDay, setLookupDay] = useState<string | null>(null);
  const [intakeSignal, setIntakeSignal] = useState(0);
  const [details, setDetails] = useState<MealDetail[]>([]);
  const [detailsError, setDetailsError] = useState(false);
  const [extraMeals, setExtraMeals] = useState<UnscheduledMeal[]>([]);
  const [extraError, setExtraError] = useState(false);
  const [filter, setFilter] = useState<"todos" | "confirmados" | "pendentes">("todos");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (!patientId || !ownerId) return;
    let active = true;
    void (async () => {
      const result = await (supabase as any)
        .from("care_meal_details")
        .select("task_id,description,recorded_at")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .limit(120);
      if (active) {
        setDetails(result.error ? [] : (result.data ?? []));
        setDetailsError(Boolean(result.error));
      }
    })();
    return () => {
      active = false;
    };
  }, [patientId, ownerId, revision]);
  useEffect(() => {
    if (!patientId || !ownerId) {
      setExtraMeals([]);
      return;
    }
    let active = true;
    void (async () => {
      const day = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Rio_Branco",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(now));
      const start = new Date(day + "T00:00:00-05:00").toISOString();
      const end = new Date(new Date(day + "T00:00:00-05:00").getTime() + 86400000).toISOString();
      const result = await (supabase as any)
        .from("care_activity_log")
        .select("id,happened_at,details")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .eq("category", "refeicao")
        .eq("event_type", "logged")
        .eq("source", "client_unscheduled_intake")
        .gte("happened_at", start)
        .lt("happened_at", end)
        .order("happened_at", { ascending: false })
        .limit(100);
      if (active) {
        setExtraMeals(
          result.error
            ? []
            : (result.data ?? []).filter((entry: UnscheduledMeal) =>
                foodKinds.has(entry.details?.kind ?? ""),
              ),
        );
        setExtraError(Boolean(result.error));
      }
    })();
    return () => {
      active = false;
    };
  }, [
    patientId,
    ownerId,
    revision,
    now &&
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Rio_Branco",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(now)),
  ]);
  const byTask = useMemo(() => new Map(details.map((m) => [m.task_id, m])), [details]);
  const confirmed = meals.filter((m) => Boolean(m.completed_at)).length;
  const pending = meals.filter((meal) => !meal.completed_at && !resolved[meal.id]).length;
  const filtered = useMemo(
    () =>
      meals
        .filter((meal) => {
          if (filter === "confirmados" && !meal.completed_at) return false;
          if (filter === "pendentes" && meal.completed_at) return false;
          const mealDetail = byTask.get(meal.id);
          const haystack = (meal.title + " " + (mealDetail?.description ?? "")).toLocaleLowerCase(
            "pt-BR",
          );
          return !query.trim() || haystack.includes(query.trim().toLocaleLowerCase("pt-BR"));
        })
        .sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at)),
    [meals, byTask, filter, query],
  );
  const filteredExtras = extraMeals.filter((entry) => {
    if (filter === "pendentes") return false;
    const search = (entry.details?.title ?? "") + " " + (entry.details?.description ?? "");
    return (
      !query.trim() ||
      search.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"))
    );
  });
  const count = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, count - 1);
  const visible = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  function setStatus(value: typeof filter) {
    setFilter(value);
    setPage(0);
  }

  return (
    <div className="care-page-meals care-premium-meals care-meals-responsive flex min-w-0 flex-col gap-3 pb-2">
      <NutritionHero
        data={nutrition}
        onRegister={() => setIntakeSignal((v) => v + 1)}
        actions={
          <ClientQuickIntake
            patientId={patientId}
            mode="food"
            openSignal={intakeSignal}
            onRecorded={onRecorded}
          />
        }
      />
      {/* Refeições já realizadas hoje, em destaque logo abaixo da meta. */}
      <MealsDoneToday data={nutrition} />
      <DayLookup min={platformStart} onPick={setLookupDay} label="Ver refeições de outro dia" />
      <DayDetailDialog
        patientId={patientId}
        ownerId={ownerId}
        day={lookupDay}
        minDay={platformStart}
        onClose={() => setLookupDay(null)}
      />
      <NutritionGuardPanel data={nutrition} />
      <Fold
        title="Detalhes nutricionais e registros do dia"
        icon={UtensilsCrossed}
        color="#d97706"
        defaultOpen={false}
        info="Todos os alimentos e bebidas do dia, com fibras, vitaminas, minerais e opções para editar ou excluir."
      >
        <div className="p-3 pt-1">
          <DailyNutritionPanel data={nutrition} hideSummary />
        </div>
      </Fold>
      {/* Refeições programadas pela equipe: só aparece quando existem (os registros avulsos já estão no painel acima). */}
      {meals.length > 0 && (
        <>
          <div className="flex shrink-0 items-end justify-between gap-2 pt-1">
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <UtensilsCrossed size={17} className="text-emerald-600 dark:text-emerald-300" />{" "}
              Refeições programadas
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {meals.length} programadas pela equipe
            </span>
          </div>
          <div className="care-page-meals-filters flex shrink-0 flex-wrap items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1  border border-border bg-muted/35 p-1">
              {(
                [
                  { key: "todos", label: "Todas" },
                  { key: "confirmados", label: "Confirmadas" },
                  { key: "pendentes", label: "Não confirmadas" },
                ] as const
              ).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={filter === option.key}
                  onClick={() => setStatus(option.key)}
                  className={
                    "min-w-0 flex-1  px-2 py-2 text-[11px] font-bold transition-colors sm:text-xs " +
                    (filter === option.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-card")
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="relative block w-full min-w-[180px] flex-1 sm:max-w-[260px]">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                aria-label="Buscar refeição ou alimento"
                className="h-10 w-full  border border-border bg-card pl-8 pr-3 text-xs text-foreground"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Buscar alimento ou refeição…"
              />
            </label>
          </div>
          {detailsError && (
            <div
              role="status"
              className="shrink-0  border border-amber-500/30 bg-amber-500/[.065] px-3 py-2 text-[11px] text-foreground"
            >
              A agenda foi carregada, mas as descrições das refeições não estão disponíveis no
              momento.
            </div>
          )}
          <div className="care-page-meals-list">
            {false && filteredExtras.length > 0 && (
              <section
                className="mb-3"
                aria-label="Refeições e lanches registrados fora da programação"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-foreground">Consumos registrados hoje</h4>
                  <span className=" bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    {filteredExtras.length} registros avulsos
                  </span>
                </div>
                <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2">
                  {filteredExtras.map((entry) => {
                    const Icon = foodIcon(entry.details?.title ?? "Refeição");
                    return (
                      <article
                        key={entry.id}
                        className="flex min-w-0 items-start gap-3  border border-emerald-500/25 bg-emerald-500/[.055] p-3"
                      >
                        <span className="grid size-10 shrink-0 place-items-center  bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          <Icon size={20} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-bold text-foreground">
                            {entry.details?.title ?? "Consumo avulso"}
                          </h5>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {reminderClock(entry.happened_at)} · Registrado fora da programação
                          </p>
                          <p className="mt-1 break-words text-xs text-foreground">
                            {entry.details?.description ?? "Descrição não informada"}
                          </p>
                        </div>
                        <CheckCircle2 size={17} className="shrink-0 text-emerald-600" />
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
            {extraError && (
              <p
                role="status"
                className="mb-2  border border-amber-500/25 p-2 text-xs text-muted-foreground"
              >
                Não foi possível carregar os consumos avulsos. Consulte o histórico completo.
              </p>
            )}
            <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2">
              {visible.map((meal) => {
                const Icon = foodIcon(meal.title);
                const detail = byTask.get(meal.id);
                const status = careReminderState(meal, now);
                const confirmedMeal = Boolean(meal.completed_at);
                const response = resolved[meal.id];
                return (
                  <article
                    key={meal.id}
                    data-food-category={mealKind(meal.title)}
                    className={
                      "care-meal-record care-premium-meal-card flex min-w-0 flex-col gap-2  border p-3 " +
                      (confirmedMeal
                        ? "border-emerald-500/25 bg-emerald-500/[.05]"
                        : "border-border bg-card/90")
                    }
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <span className="grid size-10 shrink-0 place-items-center  bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        <Icon size={20} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold leading-snug text-foreground">
                          {meal.title}
                        </h4>
                        <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                          <Clock3 size={12} className="mr-1 inline" />
                          {reminderClock(meal.scheduled_at)} · Horário programado
                        </p>
                      </div>
                      {confirmedMeal && (
                        <CheckCircle2
                          size={18}
                          className="shrink-0 text-emerald-600 dark:text-emerald-300"
                        />
                      )}
                    </div>
                    <div className="min-h-[40px]  border border-border/50 bg-background/50 px-3 py-2">
                      {confirmedMeal && detail?.description ? (
                        <p className="line-clamp-3 break-words text-[11px] leading-snug text-foreground">
                          {detail.description}
                        </p>
                      ) : confirmedMeal ? (
                        <p className="text-[11px] text-muted-foreground">
                          Refeição confirmada; descrição não informada.
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          Aguardando o registro dos alimentos consumidos.
                        </p>
                      )}
                    </div>
                    <div className="flex min-h-8 flex-wrap items-center justify-between gap-1.5 border-t border-border/60 pt-2">
                      <span
                        className={
                          "text-[11px] font-semibold " +
                          (confirmedMeal
                            ? "text-emerald-700 dark:text-emerald-300"
                            : status === "unconfirmed"
                              ? "text-amber-700 dark:text-amber-300"
                              : "text-muted-foreground")
                        }
                      >
                        {confirmedMeal
                          ? "Confirmada às " + reminderClock(meal.completed_at!)
                          : response === "cancelado"
                            ? "Cancelada · resposta registrada"
                            : response === "nao_cumprido"
                              ? "Não comi · resposta registrada"
                              : status === "unconfirmed"
                                ? "Sem confirmação no prazo"
                                : status === "due"
                                  ? "Disponível para registrar"
                                  : "Aguardando horário"}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => onView(meal)}
                          className=" border border-border bg-background px-2.5 py-1.5 text-[11px] font-bold text-foreground"
                        >
                          Ver detalhes
                        </button>
                        {!confirmedMeal && !response && status !== "waiting" && (
                          <button
                            type="button"
                            onClick={() => onConfirm(meal)}
                            className=" bg-primary px-2.5 py-1.5 text-[11px] font-bold text-primary-foreground"
                          >
                            Registrar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDelete(meal)}
                          title="Excluir com confirmação e registro de auditoria"
                          aria-label={"Excluir " + meal.title}
                          className=" border border-destructive/25 px-2 py-1.5 text-destructive hover:bg-destructive/5"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            {!visible.length && (
              <div className=" border border-dashed border-border p-5 text-center">
                <CalendarDays size={18} className="mx-auto text-muted-foreground" />
                <p className="mt-1 text-xs text-muted-foreground">
                  Nenhuma refeição registrada ainda. Use “Registrar refeição” quando fizer sua
                  refeição.
                </p>
              </div>
            )}
          </div>
          <nav
            aria-label="Paginação das refeições"
            className="flex shrink-0 items-center justify-between gap-2 border-t border-border/60 pt-2"
          >
            <button
              type="button"
              disabled={current === 0}
              onClick={() => setPage((n) => Math.max(0, n - 1))}
              className="inline-flex h-8 items-center gap-1  border border-border px-2 text-[11px] font-bold text-foreground disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              Anterior
            </button>
            <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
              Página {current + 1} de {count}
            </span>
            <button
              type="button"
              disabled={current === count - 1}
              onClick={() => setPage((n) => Math.min(count - 1, n + 1))}
              className="inline-flex h-8 items-center gap-1  border border-border px-2 text-[11px] font-bold text-foreground disabled:opacity-40"
            >
              Próxima
              <ChevronRight size={14} />
            </button>
          </nav>
        </>
      )}
      {/* Área secundária: métricas e gráficos, recolhidos para não competir com o registro. */}
      <Fold
        title="Métricas e gráficos do dia"
        icon={BarChart3}
        color="#0d9488"
        defaultOpen={false}
        info="Evolução das calorias e dos nutrientes ao longo do dia, e a contribuição de cada refeição."
      >
        <div className="grid min-w-0 content-start gap-3 p-3 pt-1">
          <NutritionDayChart data={nutrition} />
          <MealMacroBars data={nutrition} />
        </div>
      </Fold>
      <p className="shrink-0 text-[11px] text-muted-foreground">
        As descrições são registros informados pelo paciente. A confirmação do sistema não avalia o
        valor nutricional da refeição.
      </p>
    </div>
  );
}

type MealEntry = DailyNutrition["entries"][number];
const g1 = (v: number) => (Math.round(v * 10) / 10).toLocaleString("pt-BR");
const mealNutrients = (e: MealEntry): Nutrients =>
  e.direct ?? sumNutrients(e.foods.map((f) => f.nutrients));
const MACRO_ROWS = [
  { key: "protein", label: "Proteína", color: "#ec4899" },
  { key: "carbs", label: "Carboidrato", color: "#f59e0b" },
  { key: "fat", label: "Gordura", color: "#8b5cf6" },
] as const;

/** Cartões das refeições realizadas hoje (sem bebidas): hover resume, clique detalha. */
function MealsDoneToday({ data }: { data: DailyNutrition }) {
  const [open, setOpen] = useState<MealEntry | null>(null);
  const [editing, setEditing] = useState<MealEntry | null>(null);
  const actions = useMealActions(data.patientId, data.refresh);
  const meals = useMemo(
    () =>
      data.entries
        .filter((e) => e.entryType !== "beverage")
        .slice()
        .sort((a, b) => a.at.localeCompare(b.at)),
    [data.entries],
  );
  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!meals.length) {
    return (
      <p className="border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
        Nenhuma refeição registrada hoje. Toque em “Registrar refeição” para começar.
      </p>
    );
  }
  return (
    <section aria-label="Refeições realizadas hoje" className="grid min-w-0 gap-2">
      <h3 className="flex items-center justify-between text-sm font-bold">
        <span>Refeições realizadas hoje</span>
        <span className="text-[11px] font-semibold text-muted-foreground">
          {meals.length} registro(s)
        </span>
      </h3>
      <ul className="grid min-w-0 grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
        {meals.map((e) => {
          const n = mealNutrients(e);
          const Icon = foodIcon(e.text || e.source);
          const names = e.foods.map((f) => f.name.split(",")[0]).join(", ") || e.text || e.source;
          return (
            <li key={e.entryId ?? e.at + e.text} className="group relative min-w-0">
              <button
                type="button"
                onClick={() => setOpen(e)}
                aria-haspopup="dialog"
                className="flex w-full min-w-0 items-center gap-2.5 border border-emerald-500/30 bg-emerald-500/[.07] px-2.5 py-2 text-left transition hover:border-emerald-400/60 hover:bg-emerald-500/[.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
              >
                <span className="grid size-8 shrink-0 place-items-center bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold text-muted-foreground">
                    {reminderClock(e.at)} · {e.source}
                  </span>
                  <span className="line-clamp-1 break-words text-[13px] font-bold text-foreground">
                    {names}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {Math.round(n.kcal)} <span className="text-[10px] font-semibold">kcal</span>
                </span>
              </button>
              {/* Resumo ao apontar o mouse (computador) ou focar com o teclado. */}
              <div
                role="tooltip"
                className="pointer-events-none invisible absolute left-0 top-full z-30 mt-1 w-[min(22rem,92vw)] translate-y-1 border border-border bg-popover p-2.5 text-popover-foreground opacity-0 shadow-xl transition duration-150 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 max-md:hidden"
              >
                <p className="flex items-baseline justify-between gap-2 text-[11px] font-semibold text-muted-foreground">
                  <span>
                    {reminderClock(e.at)} · {e.source}
                  </span>
                  <span className="tabular-nums">
                    <b className="text-sm text-foreground">{Math.round(n.kcal)}</b> kcal
                  </span>
                </p>
                <ul className="mt-1.5 grid gap-0.5 text-xs">
                  {(e.foods.length ? e.foods : []).slice(0, 8).map((f, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">{f.name.split(",")[0]}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {Math.round(f.grams)} {measureUnit(f.id)} · {Math.round(f.nutrients.kcal)}{" "}
                        kcal
                      </span>
                    </li>
                  ))}
                  {!e.foods.length && <li className="text-muted-foreground">{e.text}</li>}
                  {e.foods.length > 8 && (
                    <li className="text-muted-foreground">+{e.foods.length - 8} itens</li>
                  )}
                </ul>
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 border-t border-border/60 pt-1.5 text-[11px] font-semibold tabular-nums">
                  {MACRO_ROWS.map((m) => (
                    <span key={m.key} style={{ color: m.color }}>
                      {m.label.slice(0, 1)} {g1(n[m.key])} g
                    </span>
                  ))}
                  <span className="text-muted-foreground">Fibras {g1(n.fiber)} g</span>
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">Clique para ver detalhes</p>
              </div>
            </li>
          );
        })}
      </ul>
      {open && (
        <MealDetailCard
          entry={open}
          onClose={() => setOpen(null)}
          onEdit={async () => {
            if (await actions.startEdit(open)) {
              setEditing(open);
              setOpen(null);
            }
          }}
          onDelete={async () => {
            if (await actions.remove(open)) setOpen(null);
          }}
        />
      )}
      {editing && (
        <MealEditDialog
          meal={editing}
          patientId={data.patientId}
          onClose={() => setEditing(null)}
          onSaved={data.refresh}
        />
      )}
    </section>
  );
}

/** Cartão detalhado e compacto de uma refeição: macros, micronutrientes e cada alimento. */
function MealDetailCard({
  entry,
  onClose,
  onEdit,
  onDelete,
}: {
  entry: MealEntry;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const n = mealNutrients(entry);
  const Icon = foodIcon(entry.text || entry.source);
  const macroKcal = n.protein * 4 + n.carbs * 4 + n.fat * 9 || 1;
  const micros = [
    ["Fibras", n.fiber, "g"],
    ["Vit. C", n.vitC, "mg"],
    ["Vit. A", n.vitA, "mcg"],
    ["Cálcio", n.calcium, "mg"],
    ["Ferro", n.iron, "mg"],
    ["Potássio", n.potassium, "mg"],
  ] as const;
  return createPortal(
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-3 backdrop-blur-[2px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes da refeição"
        style={{ maxWidth: 440, width: "100%" }}
        className="flex max-h-[88vh] min-w-0 flex-col overflow-hidden border border-border bg-card text-card-foreground shadow-2xl"
      >
        <header className="flex items-center gap-2.5 bg-gradient-to-br from-[#052e1f] to-[#0a4a33] p-3 text-white">
          <span className="grid size-9 shrink-0 place-items-center bg-white/10">
            <Icon size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-white/70">
              {reminderClock(entry.at)} · {entry.source}
            </p>
            <p className="text-xl font-extrabold leading-tight tabular-nums">
              {Math.round(n.kcal)} <span className="text-xs font-semibold text-white/70">kcal</span>
            </p>
          </div>
          <button
            type="button"
            autoFocus
            aria-label="Fechar"
            onClick={onClose}
            className="grid size-8 place-items-center border border-white/25 hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </header>
        <div className="grid min-h-0 gap-3 overflow-y-auto p-3">
          <div>
            <div className="flex h-2 overflow-hidden bg-muted">
              {MACRO_ROWS.map((m) => (
                <i
                  key={m.key}
                  style={{
                    width: `${(n[m.key] * (m.key === "fat" ? 9 : 4) * 100) / macroKcal}%`,
                    background: m.color,
                  }}
                />
              ))}
            </div>
            <ul className="mt-2 grid grid-cols-3 gap-1.5">
              {MACRO_ROWS.map((m) => (
                <li
                  key={m.key}
                  className="border px-2 py-1.5"
                  style={{ borderColor: `${m.color}66`, background: `${m.color}14` }}
                >
                  <span className="block text-[11px] font-bold" style={{ color: m.color }}>
                    {m.label}
                  </span>
                  <b className="text-sm tabular-nums">{g1(n[m.key])} g</b>
                </li>
              ))}
            </ul>
          </div>
          <ul className="grid grid-cols-3 gap-px bg-border text-[11px]">
            {micros.map(([label, v, unit]) => (
              <li key={label} className="bg-card px-2 py-1">
                <span className="block text-muted-foreground">{label}</span>
                <b className="tabular-nums">
                  {g1(v)} {unit}
                </b>
              </li>
            ))}
          </ul>
          <div>
            <h4 className="mb-1 text-xs font-bold">
              {entry.foods.length || 1}{" "}
              {entry.foods.length === 1 || !entry.foods.length ? "item" : "itens"} consumidos
            </h4>
            {entry.foods.length ? (
              <ul className="divide-y divide-border/60 border border-border text-xs">
                {entry.foods.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 px-2 py-1.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{f.name.split(",")[0]}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {Math.round(f.grams)} {measureUnit(f.id)} · P {g1(f.nutrients.protein)} · C{" "}
                        {g1(f.nutrients.carbs)} · G {g1(f.nutrients.fat)}
                      </span>
                    </span>
                    <b className="shrink-0 tabular-nums">{Math.round(f.nutrients.kcal)} kcal</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="border border-border px-2 py-1.5 text-xs">{entry.text}</p>
            )}
          </div>
          {canEditMeal(entry) && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 border border-border text-xs font-bold hover:bg-muted"
              >
                {mealIsLocked(entry) ? <Lock size={13} /> : <Pencil size={13} />} Editar
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 border border-destructive/30 text-xs font-bold text-destructive hover:bg-destructive/5"
              >
                {mealIsLocked(entry) ? <Lock size={13} /> : <Trash2 size={13} />} Excluir
              </button>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">
            Valores estimados pela tabela nutricional do NextVita.
            {canEditMeal(entry)
              ? " Registros com mais de 24 h pedem senha para alterar."
              : " Refeições da agenda se ajustam na agenda."}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
