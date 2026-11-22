import { WaterGauge } from "./WaterGauge";
import { HowItWorks, hydrationHowTo } from "./HowItWorks";
import { hydrationNeed } from "@/lib/hydration-need";
import { useEffect, useMemo, useRef, useState } from "react";
import { NiceSelect } from "./NiceSelect";
import {
  Droplets,
  CheckCircle2,
  AlertCircle,
  Save,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import { ClientQuickIntake } from "./ClientQuickIntake";
import { NextUpClock } from "./NextUpClock";
import { openOnboarding } from "./ClientOnboarding";
import { HydrationEntries } from "./HydrationEntries";
import { HydrationDayChart } from "./HydrationDayChart";
import { WATER_LAST_RECOMMENDED_HOUR } from "@/lib/nutrition-science";
import { CareTaskRecordModal } from "./CareTaskRecordModal";
import {
  acreCalendarDay,
  acreHour,
  estimateNextHydration,
  hydrationGoalNotice,
  type HydrationGoalSnapshot,
} from "@/lib/hydration-goal";
import {
  canConfirmCare,
  careScheduleBlockMessage,
  careScheduleLabel,
  getCareScheduleState,
} from "@/lib/care-schedule";

type Task = {
  id: string;
  patient_id: string;
  category: string;
  title: string;
  scheduled_at: string;
  completed_at: string | null;
};
type Drink = { id: string; amount_ml: number; recorded_at: string; kind?: string; name?: string };
type Response = { task_id: string; recorded_at: string };
type Profile = {
  sex: "male" | "female" | "unspecified";
  age: number;
  weight_kg: number;
  objective: "recovery" | "muscle" | "weight";
  activity_minutes: number;
  sweat: "low" | "normal" | "high";
  fluid_restriction: boolean;
  target_ml: number | null;
};
type Props = {
  patientId: string;
  ownerId: string;
  tasks: Task[];
  revision: number;
  onConfirm: (task: Task) => void;
  onRecorded: () => void;
};
const tz = "America/Rio_Branco";
const defaultProfile: Profile = {
  sex: "unspecified",
  age: 0,
  weight_kg: 0,
  objective: "recovery",
  activity_minutes: 0,
  sweat: "normal",
  fluid_restriction: false,
  target_ml: null,
};
const round50 = (value: number) => Math.round(value / 50) * 50;
const time = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
const dateKey = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
function estimate(profile: Profile, trainedMinutesToday: number) {
  const need = hydrationNeed({
    sex: profile.sex,
    age: profile.age,
    weightKg: profile.weight_kg,
    // Dia normal: sem reposição de suor. Só conta o treino registrado hoje (máx. 240 min).
    activityMinutes: Math.min(240, Math.max(0, Math.round(trainedMinutesToday))),
    sweat: profile.sweat,
    fluidRestriction: profile.fluid_restriction,
  });
  if (!need) return null;
  return {
    base: need.base,
    activity: need.activity,
    target: need.target,
    band: need.band,
    notes: need.notes,
    reviewReasons: need.reviewReasons,
    requiresReview: need.requiresReview,
  };
}
export function ClientHydrationTab({
  patientId,
  ownerId,
  tasks,
  revision,
  onConfirm,
  onRecorded,
}: Props) {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [configured, setConfigured] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const dialog = useDialog();
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [otherDrinks, setOtherDrinks] = useState<Drink[]>([]);
  const [suggestedByTask, setSuggestedByTask] = useState<
    Record<string, { suggested_ml: number; reason: string; remaining_ml: number }>
  >({});
  const [volumeByTask, setVolumeByTask] = useState<Record<string, number>>({});
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [page, setPage] = useState(0);
  const [notDrunk, setNotDrunk] = useState<Response[]>([]);
  const [action, setAction] = useState<string | null>(null);
  const [correctingTaskId, setCorrectingTaskId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [trainedToday, setTrainedToday] = useState(0);
  const [dailyGoal, setDailyGoal] = useState<HydrationGoalSnapshot | null>(null);
  const lastDeadlineRefresh = useRef<string>("");
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  // Força a leitura final do servidor quando muda a data do Acre (o dia fecha à meia-noite).
  useEffect(() => {
    const day = acreCalendarDay(clock);
    const changed = Boolean(dailyGoal && dailyGoal.goal_date !== day);
    if (changed && lastDeadlineRefresh.current !== day) {
      lastDeadlineRefresh.current = day;
      setReload((v) => v + 1);
    }
  }, [clock, dailyGoal?.goal_date, dailyGoal?.status]);
  const update = (change: Partial<Profile>) => setProfile((prev) => ({ ...prev, ...change }));
  useEffect(() => {
    let active = true;
    void (async () => {
      const now = dateKey(new Date().toISOString());
      const start = new Date(now + "T00:00:00-05:00");
      const end = new Date(start.getTime() + 86400000);
      const db = supabase as any;
      const [saved, water, responses, goalSummary, recommended, beverages] = await Promise.all([
        db
          .from("care_hydration_profiles")
          .select("sex,age,weight_kg,objective,activity_minutes,sweat,fluid_restriction,target_ml")
          .eq("patient_id", patientId)
          .maybeSingle(),
        db
          .from("care_hydration")
          .select("id,amount_ml,recorded_at")
          .eq("patient_id", patientId)
          .eq("owner_id", ownerId)
          .gte("recorded_at", start.toISOString())
          .lt("recorded_at", end.toISOString())
          .order("recorded_at", { ascending: true })
          .limit(200),
        db
          .from("care_hydration_responses")
          .select("task_id,recorded_at")
          .eq("patient_id", patientId)
          .eq("owner_id", ownerId)
          .limit(100),
        db.rpc("care_sync_hydration_goal", { p_patient_id: patientId }),
        db
          .from("care_hydration_suggested_portions")
          .select("task_id,suggested_ml,reason,remaining_ml")
          .eq("patient_id", patientId)
          .eq("owner_id", ownerId)
          .limit(120),
        db
          .from("care_client_beverages")
          .select("id,kind,name,amount_ml,consumed_at")
          .eq("patient_id", patientId)
          .eq("owner_id", ownerId)
          .gte("consumed_at", start.toISOString())
          .lt("consumed_at", end.toISOString())
          .order("consumed_at", { ascending: true })
          .limit(200),
      ]);
      const activityToday = await db
        .from("care_activity_log")
        .select("details")
        .eq("patient_id", patientId)
        .eq("category", "atividade")
        .gte("happened_at", start.toISOString())
        .lt("happened_at", end.toISOString())
        .limit(50);
      if (!active) return;
      setTrainedToday(
        activityToday.error
          ? 0
          : (activityToday.data ?? []).reduce(
              (total: number, row: { details?: { duration_minutes?: unknown } }) =>
                total + (Number(row.details?.duration_minutes) || 0),
              0,
            ),
      );
      if (saved.error || water.error || responses.error || goalSummary.error)
        setError(
          "Não foi possível consultar todos os registros de hidratação ou o fechamento da meta. Confira as permissões.",
        );
      else setError("");
      if (saved.data) {
        setProfile({ ...defaultProfile, ...saved.data });
        setConfigured(true);
      } else {
        setConfigured(false);
        setEditing(false);
      }
      setDailyGoal(goalSummary.error ? null : (goalSummary.data as HydrationGoalSnapshot));
      setDrinks(water.data ?? []);
      setOtherDrinks(
        beverages.error
          ? []
          : (beverages.data ?? []).map(
              (row: {
                id: string;
                kind: string;
                name: string;
                amount_ml: number;
                consumed_at: string;
              }) => ({
                id: row.id,
                amount_ml: row.amount_ml,
                recorded_at: row.consumed_at,
                kind: row.kind,
                name: row.name,
              }),
            ),
      );
      setNotDrunk(responses.data ?? []);
      if (recommended.error) {
        setSuggestedByTask({});
        setNotice("Sugestões dinâmicas de volume indisponíveis; confira a meta e os registros.");
      } else
        setSuggestedByTask(
          Object.fromEntries(
            (recommended.data ?? []).map(
              (row: {
                task_id: string;
                suggested_ml: number;
                reason: string;
                remaining_ml: number;
              }) => [
                row.task_id,
                {
                  suggested_ml: Number(row.suggested_ml),
                  reason: row.reason,
                  remaining_ml: Number(row.remaining_ml),
                },
              ],
            ),
          ),
        );
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [patientId, ownerId, revision, reload]);
  const calculation = useMemo(() => estimate(profile, trainedToday), [profile, trainedToday]);
  // A meta acompanha o dia: dia normal = base; dia de treino = base + reposição do suor registrado hoje.
  const syncedTarget = useRef<string>("");
  useEffect(() => {
    if (loading || !configured || !calculation || calculation.requiresReview) return;
    if (profile.fluid_restriction || !profile.target_ml || calculation.target === profile.target_ml)
      return;
    const key = `${acreCalendarDay(Date.now())}:${calculation.target}`;
    if (syncedTarget.current === key) return;
    syncedTarget.current = key;
    void (async () => {
      const result = await (supabase as any)
        .from("care_hydration_profiles")
        .update({ target_ml: calculation.target, updated_at: new Date().toISOString() })
        .eq("patient_id", patientId);
      if (!result.error) {
        setProfile((prev) => ({ ...prev, target_ml: calculation.target }));
        setReload((n) => n + 1);
      }
    })();
  }, [loading, configured, calculation, profile.fluid_restriction, profile.target_ml, patientId]);
  const planValid = Boolean(configured && profile.target_ml && !profile.fluid_restriction);
  const goal = dailyGoal?.target_ml ?? (planValid ? profile.target_ml! : 0);
  // Horário ideal para concluir a água (orientação: líquidos em volume 3 h antes de dormir). Os registros não são limitados.
  const cutoffUtc = Date.parse(
    acreCalendarDay(clock) + `T${String(WATER_LAST_RECOMMENDED_HOUR).padStart(2, "0")}:00:00-05:00`,
  );
  // A meta do servidor soma só água; sucos, chás e outras bebidas também contam para os líquidos do dia.
  const waterOnly = Math.max(
    dailyGoal?.consumed_ml ?? 0,
    drinks.reduce((total, item) => total + Number(item.amount_ml), 0),
  );
  const intake = waterOnly + otherDrinks.reduce((total, item) => total + Number(item.amount_ml), 0);
  const goalSummary = hydrationGoalNotice(dailyGoal, clock);
  const dayClosed = acreHour(clock) >= WATER_LAST_RECOMMENDED_HOUR; // passou o horário ideal: só deixa de sugerir novos horários
  const remaining = goal ? Math.max(0, goal - intake) : 0;
  const percent = goal ? Math.min(100, Math.round((intake / goal) * 100)) : 0;
  const schedule = useMemo(
    () =>
      tasks
        .filter((item) => item.category === "hidratacao")
        .sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at)),
    [tasks],
  );
  const skipped = useMemo(
    () => new Map(notDrunk.map((item) => [item.task_id, item.recorded_at])),
    [notDrunk],
  );
  // Apenas os lembretes futuros recebem novos volumes sugeridos. Histórico e
  // tarefas já confirmadas permanecem intactos; consumo avulso abate o restante.
  const portions = useMemo(() => {
    const values = Array<number>(schedule.length).fill(0);
    if (!goal || remaining < 10 || dayClosed) return values;
    const upcoming = schedule
      .map((task, index) => ({ task, index }))
      .filter(
        ({ task }) =>
          !task.completed_at &&
          !skipped.has(task.id) &&
          Date.parse(task.scheduled_at) > clock &&
          Date.parse(task.scheduled_at) < cutoffUtc,
      );
    if (!upcoming.length) return values;
    let left = remaining;
    upcoming.forEach(({ index }, position) => {
      const slotsLeft = upcoming.length - position;
      const suggestion = Math.min(350, Math.max(0, Math.round(left / slotsLeft / 10) * 10));
      values[index] = suggestion >= 10 ? suggestion : 0;
      left = Math.max(0, left - values[index]);
    });
    return values;
  }, [schedule, goal, remaining, skipped, clock, dayClosed, cutoffUtc]);
  const fmtCountdown = (ms: number) => {
    const sec = Math.max(0, Math.ceil(ms / 1000));
    return [Math.floor(sec / 3600), Math.floor((sec % 3600) / 60), sec % 60]
      .map((v) => String(v).padStart(2, "0"))
      .join(":");
  };
  const next =
    dayClosed || remaining === 0
      ? undefined
      : (schedule.find(
          (item) =>
            !item.completed_at &&
            !skipped.has(item.id) &&
            Date.parse(item.scheduled_at) >= clock &&
            Date.parse(item.scheduled_at) < cutoffUtc,
        ) ??
        (dayClosed
          ? undefined
          : schedule.find(
              (item) =>
                !item.completed_at &&
                !skipped.has(item.id) &&
                getCareScheduleState(item, clock) === "available" &&
                Date.parse(item.scheduled_at) < cutoffUtc,
            )));
  // Último líquido registrado (água ou outra bebida) define o ponto de partida.
  const lastWater = useMemo(
    () =>
      [...drinks, ...otherDrinks]
        .sort((a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at))
        .at(-1) ?? null,
    [drinks, otherDrinks],
  );
  const nextPlan =
    goal > 0 && !dayClosed
      ? estimateNextHydration({
          remainingMl: remaining,
          lastIntakeAt: lastWater ? Date.parse(lastWater.recorded_at) : null,
          lastAmountMl: lastWater ? Number(lastWater.amount_ml) : 0,
          now: clock,
          cutoff: cutoffUtc,
          recent: [...drinks, ...otherDrinks].map((d) => ({
            at: Date.parse(d.recorded_at),
            ml: Number(d.amount_ml) || 0,
          })),
        })
      : null;
  const nextHydrationAt = nextPlan?.at ?? null;
  const nextHydrationLabel = nextPlan
    ? nextPlan.at <= clock
      ? "Agora"
      : time(new Date(nextPlan.at).toISOString())
    : "Após registro";
  const pageSize = 3;
  const pageCount = Math.max(1, Math.ceil(schedule.length / pageSize));
  const activePage = Math.min(page, pageCount - 1);
  const pageTasks = schedule.slice(activePage * pageSize, (activePage + 1) * pageSize);
  useEffect(() => {
    const upcomingIndex = schedule.findIndex(
      (task) =>
        !task.completed_at && !skipped.has(task.id) && Date.parse(task.scheduled_at) >= Date.now(),
    );
    const fallbackIndex = schedule.findIndex((task) => !task.completed_at && !skipped.has(task.id));
    const index =
      upcomingIndex >= 0
        ? upcomingIndex
        : fallbackIndex >= 0
          ? fallbackIndex
          : Math.max(0, schedule.length - 1);
    setPage(Math.floor(index / 3));
  }, [patientId, revision, schedule.length]);
  async function saveProfile() {
    if (!calculation || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    const target = calculation.requiresReview ? null : calculation.target;
    const data = {
      ...profile,
      patient_id: patientId,
      owner_id: ownerId,
      target_ml: target,
      updated_at: new Date().toISOString(),
    };
    const result = await (supabase as any)
      .from("care_hydration_profiles")
      .upsert(data, { onConflict: "patient_id" });
    setSaving(false);
    if (result.error) {
      setError("Não foi possível salvar o perfil no prontuário.");
      return;
    }
    setProfile({ ...profile, target_ml: target });
    setConfigured(true);
    setEditing(false);
    setNotice(
      target
        ? "Programa personalizado salvo."
        : "Perfil salvo; solicite uma meta individual ao profissional de saúde.",
    );
    setReload((n) => n + 1);
  }
  async function confirmGlass(task: Task, volume: number) {
    if (action) return;
    if (!canConfirmCare(task)) {
      setError(careScheduleBlockMessage(task));
      return;
    }
    if (!Number.isFinite(volume) || volume < 10 || volume > 1500) {
      setError("Informe um volume real entre 10 e 1500 ml.");
      return;
    }
    setAction(task.id);
    setError("");
    setNotice("");
    const res = await (supabase as any).rpc("care_record_water_decision", {
      p_task_id: task.id,
      p_decision: "drank",
      p_amount_ml: volume,
    });
    setAction(null);
    if (res.error || res.data?.decision !== "drank") {
      setError(
        /Care window not started|Care window expired/i.test(res.error?.message ?? "")
          ? careScheduleBlockMessage(task)
          : `Não foi possível verificar o registro: ${res.error?.message ?? "consulte o prontuário antes de tentar novamente"}`,
      );
      onRecorded();
      return;
    }
    setNotice(
      `${volume} ml de água registrados com a hora real do servidor. ${skipped.has(task.id) ? "Resposta anterior corrigida. " : ""}O acompanhamento será atualizado.`,
    );
    setCorrectingTaskId(null);
    onRecorded();
    setReload((n) => n + 1);
  }
  async function quickDrink(ml: number) {
    if (action) return;
    if (
      !(await dialog.confirm(
        "Confirmar registro?",
        `Registrar ${ml} ml de água agora?`,
        false,
        "Confirmar registro",
      ))
    )
      return;
    setAction("quick");
    setError("");
    setNotice("");
    const res = await (supabase as any).rpc("care_log_unscheduled_intake", {
      p_patient_id: patientId,
      p_kind: "agua",
      p_description: "Água",
      p_amount_ml: ml,
      p_request_id: crypto.randomUUID(),
      p_consumed_at: null,
    });
    setAction(null);
    if (res.error) {
      setError("Não foi possível registrar a água. Tente novamente.");
      return;
    }
    setNotice(`${ml} ml de água registrados. Próximo horário recalculado automaticamente.`);
    setReload((n) => n + 1);
    onRecorded();
  }
  async function markNo(task: Task) {
    if (action) return;
    if (!canConfirmCare(task)) {
      setError(careScheduleBlockMessage(task));
      return;
    }
    setAction(task.id);
    setError("");
    setNotice("");
    const res = await (supabase as any).rpc("care_record_water_decision", {
      p_task_id: task.id,
      p_decision: "not_drunk",
      p_amount_ml: null,
    });
    setAction(null);
    if (res.error || res.data?.decision !== "not_drunk") {
      setError(
        /Care window not started|Care window expired/i.test(res.error?.message ?? "")
          ? careScheduleBlockMessage(task)
          : `Não foi possível confirmar a resposta: ${res.error?.message ?? "consulte o prontuário antes de repetir"}`,
      );
      return;
    }
    setNotDrunk((prev) => [
      ...prev.filter((t) => t.task_id !== task.id),
      { task_id: task.id, recorded_at: res.data.recorded_at },
    ]);
    setNotice(
      "Resposta “Não bebi” registrada com o horário real. Nenhum volume foi contabilizado.",
    );
    onRecorded();
    setReload((n) => n + 1);
  }
  async function undoNo(task: Task) {
    if (action) return;
    setAction(task.id);
    setError("");
    setNotice("");
    const res = await (supabase as any).rpc("care_record_water_decision", {
      p_task_id: task.id,
      p_decision: "reset_not_drunk",
      p_amount_ml: null,
    });
    setAction(null);
    if (res.error || res.data?.decision !== "reset_not_drunk") {
      setError(
        `Não foi possível verificar a correção: ${res.error?.message ?? "consulte o prontuário"}`,
      );
      return;
    }
    setNotDrunk((prev) => prev.filter((t) => t.task_id !== task.id));
    setCorrectingTaskId(null);
    setNotice("Resposta anterior desfeita; este horário está novamente sem confirmação.");
    onRecorded();
    setReload((n) => n + 1);
  }
  return (
    <section
      className="care-premium-hydration care-hydration-responsive flex min-h-0 w-full min-w-0 flex-col gap-2"
      aria-label="Programa personalizado de hidratação"
    >
      <header className="nv-dark relative isolate overflow-hidden rounded-xl bg-gradient-to-br from-[#04263a] via-[#06374f] to-[#0b5f7a] p-2.5 text-white shadow-card sm:px-3.5 sm:py-3">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 -z-10 size-72 rounded-full bg-cyan-300/15 blur-3xl"
        />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-16 w-full opacity-30"
          viewBox="0 0 400 40"
          preserveAspectRatio="none"
        >
          <path
            className="nv-hydro-wave"
            d="M0 20 Q 50 5 100 20 T 200 20 T 300 20 T 400 20 T 500 20 T 600 20 V40 H0Z"
            fill="#38bdf8"
          />
        </svg>
        <div className="grid items-center gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
          <div className="flex items-center gap-3">
            <WaterGauge percent={percent} className="size-[4.5rem] shrink-0 sm:size-20" />
            <div className="min-w-0 lg:hidden">
              <p className="text-2xl font-extrabold tabular-nums">
                {(intake / 1000).toFixed(2).replace(".", ",")} L
              </p>
              <p className="text-sm text-white/75">
                {goal ? `de ${(goal / 1000).toFixed(1).replace(".", ",")} L` : "meta a definir"}
              </p>
            </div>
          </div>

          <div className="min-w-0">
            <p className="hidden text-2xl font-extrabold tabular-nums lg:block">
              {(intake / 1000).toFixed(2).replace(".", ",")} L
              <span className="ml-2 text-base font-semibold text-white/65">
                {goal ? `de ${(goal / 1000).toFixed(1).replace(".", ",")} L` : "meta a definir"}
              </span>
            </p>
            <p className="text-[13px] text-white/80">
              {remaining === 0 && goal
                ? "Meta de hoje atingida. Ótimo trabalho!"
                : goal
                  ? `Faltam ${remaining.toLocaleString("pt-BR")} ml para a meta de hoje.`
                  : "Defina sua meta para receber sugestões de horário."}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {[150, 250, 500].map((ml) => (
                <button
                  key={ml}
                  type="button"
                  disabled={Boolean(action)}
                  onClick={() => void quickDrink(ml)}
                  className="nv-water-chip group relative inline-flex h-8 items-center gap-1.5 overflow-hidden rounded-lg bg-white px-2.5 text-xs font-bold text-sky-900 shadow-lg shadow-sky-950/30 transition active:scale-95 disabled:opacity-60"
                >
                  <span className="grid size-5 place-items-center rounded-full bg-sky-100 text-sky-600 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110">
                    <Droplets size={14} />
                  </span>
                  +{ml} ml
                </button>
              ))}
              <span className="[&_button]:!h-8 [&_button]:!rounded-lg [&_button]:!border [&_button]:!border-white/25 [&_button]:!bg-white/10 [&_button]:!px-2.5 [&_button]:!text-xs [&_button]:!text-white [&_button]:!shadow-none [&_button]:backdrop-blur hover:[&_button]:!bg-white/20">
                <ClientQuickIntake
                  patientId={patientId}
                  mode="water"
                  onRecorded={() => {
                    setReload((n) => n + 1);
                    onRecorded();
                  }}
                />
              </span>
              <span className="[&_button]:!h-8 [&_button]:!rounded-lg [&_button]:!border [&_button]:!border-white/25 [&_button]:!bg-white/10 [&_button]:!px-2.5 [&_button]:!text-xs [&_button]:!text-white [&_button]:!shadow-none [&_button]:backdrop-blur hover:[&_button]:!bg-white/20">
                <ClientQuickIntake
                  patientId={patientId}
                  mode="drink"
                  onRecorded={() => {
                    setReload((n) => n + 1);
                    onRecorded();
                  }}
                />
              </span>
              <button
                type="button"
                aria-expanded={editing}
                aria-label={editing ? "Fechar ajuste da meta" : "Ajustar meta"}
                title={editing ? "Fechar ajuste da meta" : "Ajustar meta"}
                onClick={() => setEditing((value) => !value)}
                className={`grid size-8 place-items-center rounded-lg border border-white/25 backdrop-blur transition hover:bg-white/20 ${editing ? "bg-white text-sky-900" : "bg-white/10 text-white"}`}
              >
                <SlidersHorizontal size={17} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 lg:w-60 lg:grid-cols-1">
            <NextUpClock
              compact
              className="col-span-2 lg:col-span-1"
              alertKey="agua"
              title="Próximo copo"
              color="#22d3ee"
              target={
                remaining === 0 ||
                dayClosed ||
                !nextPlan ||
                !nextHydrationAt ||
                nextHydrationAt > cutoffUtc
                  ? null
                  : nextHydrationAt
              }
              from={lastWater ? Date.parse(lastWater.recorded_at) : null}
              detail={nextPlan ? `~${nextPlan.suggestedMl} ml` : undefined}
              emptyText={
                remaining === 0 && goal
                  ? "Meta atingida"
                  : dayClosed
                    ? `Ideal beber até as ${WATER_LAST_RECOMMENDED_HOUR}h`
                    : "Registre quando beber"
              }
              actionLabel={nextPlan ? `Bebi ${nextPlan.suggestedMl} ml` : "Registrar"}
              onAction={nextPlan ? () => void quickDrink(nextPlan.suggestedMl) : undefined}
            />
          </div>
        </div>
      </header>
      <HowItWorks>{hydrationHowTo}</HowItWorks>
      {editing && (
        <div className="rounded-xl border border-border bg-muted/30 p-2.5">
          <p className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
            Perfil para estimar a meta diária
            <button
              type="button"
              onClick={openOnboarding}
              className="rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10"
            >
              Sexo, idade e peso vêm do cadastro · alterar
            </button>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px]">
              Sexo para referência
              <NiceSelect
                className="mt-1"
                ariaLabel="Sexo para referência"
                disabled
                value={profile.sex}
                onChange={(v) => update({ sex: v as Profile["sex"] })}
                options={[
                  { value: "unspecified", label: "Prefiro não informar" },
                  { value: "male", label: "Masculino" },
                  { value: "female", label: "Feminino" },
                ]}
              />
            </label>
            <label className="text-[11px]">
              Idade (anos)
              <input
                className="field mt-1"
                type="number"
                min="18"
                max="110"
                value={profile.age || ""}
                onChange={(e) => update({ age: Number(e.target.value) })}
                placeholder="Do cadastro"
                disabled
                title="Vem do seu cadastro"
              />
            </label>
            <label className="text-[11px]">
              Peso (kg)
              <input
                className="field mt-1"
                type="number"
                min="30"
                max="250"
                step=".5"
                value={profile.weight_kg || ""}
                onChange={(e) => update({ weight_kg: Number(e.target.value) })}
                placeholder="Do cadastro"
                disabled
                title="Vem do seu cadastro"
              />
            </label>
            <label className="text-[11px]">
              Objetivo
              <NiceSelect
                className="mt-1"
                ariaLabel="Objetivo"
                value={profile.objective}
                onChange={(v) => update({ objective: v as Profile["objective"] })}
                options={[
                  { value: "recovery", label: "Hidratação e recuperação" },
                  { value: "muscle", label: "Ganho de massa muscular" },
                  { value: "weight", label: "Controle do peso" },
                ]}
              />
            </label>
            <label className="text-[11px]">
              Treino habitual (min)
              <input
                className="field mt-1"
                type="number"
                min="0"
                max="240"
                value={profile.activity_minutes}
                onChange={(e) => update({ activity_minutes: Number(e.target.value) })}
              />
            </label>
            <label className="text-[11px]">
              Transpiração
              <NiceSelect
                className="mt-1"
                ariaLabel="Transpiração"
                value={profile.sweat}
                onChange={(v) => update({ sweat: v as Profile["sweat"] })}
                options={[
                  { value: "low", label: "Pouca" },
                  { value: "normal", label: "Moderada" },
                  { value: "high", label: "Intensa" },
                ]}
              />
            </label>
            <label className="col-span-2 flex gap-2 rounded-lg border border-border p-2 text-xs">
              <input
                type="checkbox"
                checked={profile.fluid_restriction}
                onChange={(e) => update({ fluid_restriction: e.target.checked })}
              />
              <span>Tenho restrição de líquidos ou orientação profissional especial.</span>
            </label>
          </div>
          {calculation ? (
            <p className="mt-2 rounded-lg bg-card p-2 text-[11px]">
              <strong>Estimativa: {calculation.target.toLocaleString("pt-BR")} ml/dia.</strong> Base
              de 30 ml/kg ({calculation.base.toLocaleString("pt-BR")} ml), mantida na faixa de
              referência por sexo ({calculation.band.min.toLocaleString("pt-BR")} a{" "}
              {calculation.band.max.toLocaleString("pt-BR")} ml; EFSA 2010 e National Academies
              2004)
              {calculation.activity > 0
                ? `, mais ${calculation.activity.toLocaleString("pt-BR")} ml para repor o suor do treino de hoje (${trainedToday} min registrados)`
                : ""}
              . Dia normal: só a base. Dia de treino: a reposição do suor entra automaticamente
              quando você registra a atividade, sem passar de 500 ml por hora. O objetivo não muda a
              quantidade de água.
              {calculation.requiresReview && (
                <span className="mt-1 block font-semibold text-amber-700 dark:text-amber-300">
                  <AlertCircle size={12} className="mr-1 inline" />
                  Meta individual deve ser avaliada por profissional (
                  {calculation.reviewReasons.join("; ")}).
                </span>
              )}
              {calculation.notes.map((note) => (
                <span key={note} className="mt-1 block text-muted-foreground">
                  {note}
                </span>
              ))}
              <span className="mt-1 block text-muted-foreground">
                Ritmo seguro: 200 a 300 ml por vez, em média até 500 ml por hora. Os rins eliminam
                cerca de 0,8 a 1 L por hora; passar disso acumula água no corpo.
              </span>
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Informe idade e peso válidos para estimar o consumo.
            </p>
          )}
          <button
            type="button"
            disabled={!calculation || saving}
            onClick={() => void saveProfile()}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? "Salvando…" : "Salvar meta"}
          </button>
        </div>
      )}
      <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <HydrationDayChart
          entries={[
            ...drinks.map((d) => ({ ...d, source: "water" as const })),
            ...otherDrinks.map((d) => ({ ...d, source: "beverage" as const })),
          ]}
          goal={goal}
          nowMs={clock}
          lastHour={WATER_LAST_RECOMMENDED_HOUR}
          note={!loading && dailyGoal && dailyGoal.status !== "sem_meta" ? goalSummary : null}
        />
        {drinks.length + otherDrinks.length > 0 ? (
          <HydrationEntries
            patientId={patientId}
            water={drinks}
            beverages={otherDrinks}
            goal={goal}
            onChanged={() => setReload((v) => v + 1)}
          />
        ) : (
          <div className="grid place-items-center rounded-2xl border border-dashed border-sky-500/30 bg-sky-500/[.04] p-4 text-center">
            <span>
              <Droplets className="mx-auto mb-2 text-sky-500" size={26} />
              <strong className="block text-sm">Nenhum registro hoje</strong>
              <span className="text-xs text-muted-foreground">
                Use +150, +250 ou +500 ml acima para começar.
              </span>
            </span>
          </div>
        )}
      </div>
      {!planValid && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg border border-amber-300/30 bg-amber-500/5 px-2 py-1.5 text-left text-[11px] text-foreground"
        >
          Defina uma meta em <strong>Ajustar meta</strong> para calcular volumes sugeridos. Os
          registros reais continuam disponíveis.
        </button>
      )}
      {!loading && !dailyGoal && goal > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Meta do dia (24 h). O resumo automático não está disponível no momento.
        </p>
      )}
      {schedule.length > 0 && (
        <div className="rounded-xl border border-border bg-card/70 p-2.5">
          <div className="mb-2 flex min-w-0 items-center justify-between gap-2 border-b border-border/70 pb-2">
            <div>
              <h4 className="text-xs font-bold text-foreground">Horários programados</h4>
              <p className="text-[11px] text-muted-foreground">
                Toque em um registro confirmado para consultar ou corrigir
              </p>
            </div>
            <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[11px] font-semibold tabular-nums text-foreground">
              {schedule.length} horários
            </span>
          </div>
          <div className="space-y-1.5">
            {pageTasks.map((task) => {
              const i = schedule.findIndex((item) => item.id === task.id);
              const answered = skipped.get(task.id);
              const status = task.completed_at
                ? "done"
                : answered
                  ? "skipped"
                  : getCareScheduleState(task, clock) === "missed"
                    ? "missed"
                    : "pending";
              const available = canConfirmCare(task, clock);
              const correcting = correctingTaskId === task.id;
              const backend = suggestedByTask[task.id];
              const suggested = backend?.suggested_ml ?? (portions[i] || 0);
              const defaultVolume = volumeByTask[task.id] ?? (suggested > 0 ? suggested : 200);
              return (
                <article
                  key={task.id}
                  className={`care-premium-hydration-event flex min-w-0 flex-col gap-1.5 rounded-lg border px-2 py-1.5 ${status === "done" ? "border-emerald-500/25 bg-emerald-500/[.055]" : status === "skipped" ? "border-amber-500/30 bg-amber-500/[.04]" : "border-border/75 bg-muted/25"}`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`grid size-7 shrink-0 place-items-center rounded-lg ${status === "done" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-sky-500/10 text-sky-600 dark:text-sky-300"}`}
                    >
                      {status === "done" ? <CheckCircle2 size={16} /> : <Droplets size={16} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1 text-[11px] font-bold text-foreground">
                        <span className="tabular-nums">{time(task.scheduled_at)}</span>
                        <span>· Água</span>
                        {suggested > 0 && !task.completed_at && (
                          <span className="rounded bg-sky-500/10 px-1 text-[11px] text-sky-700 dark:text-sky-300">
                            ~{suggested} ml
                          </span>
                        )}
                      </p>
                      {backend?.reason === "restante_supera_capacidade" && !task.completed_at && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-300">
                          Meta restante exige fracionamento adicional; não tente beber tudo de uma
                          vez.
                        </p>
                      )}
                      <p className="truncate text-[11px] text-muted-foreground">
                        {status === "done"
                          ? `Bebi · confirmado em ${time(task.completed_at!)}`
                          : status === "skipped"
                            ? `Não bebi · resposta às ${time(answered!)}`
                            : available
                              ? "Informe se bebeu ou não bebeu"
                              : `Programado · disponível a partir de ${time(task.scheduled_at)}`}
                      </p>
                    </div>
                    {status === "done" ? (
                      <button
                        type="button"
                        onClick={() => setDetailTask(task)}
                        title="Consultar e corrigir volume"
                        className="shrink-0 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
                      >
                        Ver registro
                      </button>
                    ) : status === "skipped" ? (
                      <button
                        type="button"
                        disabled={Boolean(action)}
                        onClick={() => setCorrectingTaskId(correcting ? null : task.id)}
                        className="shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[11px] font-bold text-foreground disabled:opacity-50"
                      >
                        {correcting ? "Fechar" : "Corrigir"}
                      </button>
                    ) : available ? (
                      <span className="shrink-0 rounded-md bg-sky-500/10 px-2 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                        Responder
                      </span>
                    ) : (
                      <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                        Aguardando
                      </span>
                    )}
                  </div>
                  {((available && !answered) || correcting) && status !== "done" && (
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5 pl-0 sm:pl-9">
                      <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span>Volume</span>
                        <input
                          aria-label={`Volume de água às ${time(task.scheduled_at)} em ml`}
                          type="number"
                          min={10}
                          max={1500}
                          step={10}
                          value={defaultVolume}
                          onChange={(e) =>
                            setVolumeByTask((prev) => ({
                              ...prev,
                              [task.id]: Number(e.target.value),
                            }))
                          }
                          className="h-8 w-[65px] rounded-md border border-border bg-background px-1.5 text-center text-[11px] font-semibold text-foreground"
                        />
                        <span>ml</span>
                      </label>
                      <button
                        type="button"
                        disabled={Boolean(action)}
                        onClick={() => void confirmGlass(task, defaultVolume)}
                        className="h-8 rounded-lg bg-primary px-2.5 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
                      >
                        {action === task.id ? "Salvando…" : "Bebi"}
                      </button>
                      {correcting ? (
                        <button
                          type="button"
                          disabled={Boolean(action)}
                          onClick={() => void undoNo(task)}
                          className="h-8 rounded-lg border border-border px-2 text-[11px] font-semibold text-foreground disabled:opacity-50"
                        >
                          Desfazer “Não bebi”
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={Boolean(action)}
                          onClick={() => void markNo(task)}
                          className="h-8 rounded-lg border border-border px-2.5 text-[11px] font-semibold text-foreground disabled:opacity-50"
                        >
                          Não bebi
                        </button>
                      )}
                    </div>
                  )}
                  {!available && !task.completed_at && !answered && (
                    <p className="text-[11px] text-muted-foreground sm:pl-9">
                      Se bebeu antes deste horário, use “Registrar água” para salvar agora sem
                      antecipar a programação.
                    </p>
                  )}
                </article>
              );
            })}
            {!pageTasks.length && (
              <p className="rounded-lg bg-muted/30 p-2 text-xs text-muted-foreground">
                Nenhum horário de hidratação programado. Você ainda pode usar{" "}
                <strong>Registrar água</strong>.
              </p>
            )}
          </div>
          {pageCount > 1 && (
            <nav
              aria-label="Páginas dos horários de hidratação"
              className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2"
            >
              <button
                type="button"
                disabled={activePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-[11px] font-semibold text-foreground disabled:opacity-35"
              >
                <ChevronLeft size={13} /> Anterior
              </button>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                Página {activePage + 1} de {pageCount}
              </span>
              <button
                type="button"
                disabled={activePage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-[11px] font-semibold text-foreground disabled:opacity-35"
              >
                Próxima <ChevronRight size={13} />
              </button>
            </nav>
          )}
        </div>
      )}
      {loading && drinks.length === 0 && (
        <p role="status" className="text-[11px] text-muted-foreground">
          Carregando registros de água…
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/5 p-2 text-xs text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          {notice}
        </p>
      )}
      <details className="group rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5 text-[11px] text-muted-foreground">
        <summary className="flex cursor-pointer items-center gap-1.5 font-semibold text-foreground">
          <Info size={13} /> Orientações e referências
        </summary>
        <p className="mt-2 leading-relaxed">
          Você pode registrar água a qualquer hora: todo registro do dia (00h às 24h, horário do
          Acre) conta na meta e aparece no relatório. A referência de líquidos segue a EFSA (2010):
          cerca de 2,0 L para homens e 1,6 L para mulheres adultos, menos para crianças, pois ~20%
          da água vem dos alimentos. Não há um horário de relógio único: o ideal é beber ao longo do
          dia e reduzir líquidos de 2 a 4 horas antes de dormir (padrão: concluir até as 20h) para
          evitar despertares para urinar. A necessidade varia com peso, idade, atividade física,
          calor e orientação médica; a meta é estimativa, não obrigação. Evite grandes volumes de
          uma só vez e respeite qualquer restrição prescrita.
        </p>
        <p className="mt-1">
          Referências:{" "}
          <a
            className="underline"
            href="https://www.nationalacademies.org/read/10925/chapter/6"
            target="_blank"
            rel="noreferrer"
          >
            National Academies
          </a>{" "}
          ·{" "}
          <a
            className="underline"
            href="https://pubmed.ncbi.nlm.nih.gov/17277604/"
            target="_blank"
            rel="noreferrer"
          >
            ACSM
          </a>
          .
        </p>
      </details>
      <CareTaskRecordModal
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onSaved={() => {
          setReload((value) => value + 1);
          onRecorded();
        }}
      />
    </section>
  );
}
