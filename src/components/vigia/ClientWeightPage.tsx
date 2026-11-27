import type { ReactNode } from "react";
import { HowItWorks, weightHowTo } from "./HowItWorks";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  CalendarDays,
  Check,
  Flag,
  Lock,
  LockOpen,
  Minus,
  Pencil,
  Plus,
  Ruler,
  Scale,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { acreDateKey } from "@/lib/acre-time";
import { useDialog } from "@/lib/dialog";
import { weightGuidance } from "@/lib/nutrition-science";
import { DayDetailDialog } from "./DayDetailDialog";
import { WeightEvolutionChart, WeightVariationPanel } from "./WeightCharts";
import { WeightLossPlan } from "./WeightLossPlan";
import { NumberDial } from "./NumberDial";
import { signed } from "@/lib/weight-variation";

type Point = { id: string; recorded_on: string; weight_kg: number; height_cm: number };
type Props = {
  patientId: string;
  ownerId: string;
  heightCm: number | null;
  currentWeight: number | null;
  ageYears?: number | null;
  onRecorded?: () => void;
};
type Range = "30" | "90" | "365" | "all";

const nf = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const shortDate = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
const longDate = (iso: string) => iso.split("-").reverse().join("/");
const bmiOf = (kg: number, cm: number) => kg / (cm / 100) ** 2;
/** Tempo em que a edição dos registros fica liberada depois da confirmação. */
const UNLOCK_SECONDS = 60;

export function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Abaixo do peso", color: "#38bdf8" };
  if (bmi < 25) return { label: "Peso adequado", color: "#10b981" };
  if (bmi < 30) return { label: "Sobrepeso", color: "#f59e0b" };
  if (bmi < 35) return { label: "Obesidade grau I", color: "#f97316" };
  if (bmi < 40) return { label: "Obesidade grau II", color: "#ef4444" };
  return { label: "Obesidade grau III", color: "#b91c1c" };
}

/** Média móvel simples dos últimos `size` registros. */
export function movingAverage(values: number[], size = 7): number[] {
  return values.map((_, index) => {
    const slice = values.slice(Math.max(0, index - size + 1), index + 1);
    return slice.reduce((total, value) => total + value, 0) / slice.length;
  });
}

function StatCard({
  icon: Icon,
  label,
  value,
  note,
  color,
}: {
  icon: typeof Scale;
  label: string;
  value: string;
  note: string;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-2.5 border border-border bg-card p-2.5 shadow-card transition hover:-translate-y-px"
      style={{ ["--ca" as string]: color }}
    >
      <span
        className="grid size-10 shrink-0 place-items-center"
        style={{ background: `${color}26`, color }}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[11px] font-semibold text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-extrabold tabular-nums tracking-tight">{value}</p>
        <p className="truncate text-[10px] text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}

export function ClientWeightPage({
  patientId,
  ownerId,
  heightCm,
  currentWeight,
  ageYears = null,
  onRecorded,
  explorer = null,
}: Props & { explorer?: ReactNode }) {
  const [points, setPoints] = useState<Point[]>([]);
  const [target, setTarget] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [range, setRange] = useState<Range>("90");
  const [date, setDate] = useState(() => acreDateKey());
  const [weight, setWeight] = useState(
    currentWeight ? String(currentWeight).replace(".", ",") : "",
  );
  const [height, setHeight] = useState(heightCm ? String(heightCm) : "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [listMessage, setListMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [reload, setReload] = useState(0);
  const dialog = useDialog();
  // Cadeado: os registros salvos só podem ser editados ou excluídos depois de uma confirmação,
  // e voltam a ficar bloqueados sozinhos.
  const [unlockedUntil, setUnlockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [editing, setEditing] = useState<{ id: string; weight: string; height: string } | null>(
    null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailDay, setDetailDay] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const unlocked = unlockedUntil !== null && now < unlockedUntil;
  const secondsLeft =
    unlocked && unlockedUntil !== null ? Math.max(0, Math.ceil((unlockedUntil - now) / 1000)) : 0;

  useEffect(() => {
    if (unlockedUntil === null) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= unlockedUntil) {
        setUnlockedUntil(null);
        setEditing(null);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [unlockedUntil]);

  useEffect(() => {
    if (!highlightId) return;
    const timer = window.setTimeout(() => setHighlightId(null), 5000);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  useEffect(() => {
    let active = true;
    const db = supabase as any;
    void Promise.all([
      db
        .from("care_body_measurements")
        .select("id,recorded_on,weight_kg,height_cm")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .order("recorded_on", { ascending: true })
        .limit(730),
      db
        .from("care_nutrition_preferences")
        .select("*")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .maybeSingle(),
    ]).then(
      ([rows, prefs]: any[]) => {
        if (!active) return;
        if (rows.error) setUnavailable(true);
        else {
          setUnavailable(false);
          const list = (rows.data ?? []).map((row: Point) => ({
            ...row,
            weight_kg: Number(row.weight_kg),
            height_cm: Number(row.height_cm),
          }));
          // O peso informado no primeiro cadastro fica no perfil; entra no histórico como ponto inicial para ser contabilizado.
          const initialKg = Number(prefs.data?.weight_kg);
          const createdIso = prefs.data?.created_at ?? prefs.data?.updated_at;
          const knownHeight =
            Number(heightCm) || list.find((row: Point) => row.height_cm > 0)?.height_cm || 0;
          if (
            Number.isFinite(initialKg) &&
            initialKg >= 20 &&
            initialKg <= 350 &&
            createdIso &&
            knownHeight > 0
          ) {
            const day = acreDateKey(createdIso);
            if (!list.some((row: Point) => row.recorded_on <= day))
              list.unshift({
                id: "initial",
                recorded_on: day,
                weight_kg: initialKg,
                height_cm: knownHeight,
              });
          }
          setPoints(list);
          const lastHeight = list.at(-1)?.height_cm;
          if (!heightCm && lastHeight) setHeight((previous) => previous || String(lastHeight));
        }
        const goal = Number(prefs.data?.target_weight_kg);
        setTarget(Number.isFinite(goal) && goal > 0 ? goal : null);
        setLoaded(true);
      },
      () => {
        if (active) {
          setUnavailable(true);
          setLoaded(true);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [patientId, ownerId, heightCm, reload]);

  async function save() {
    if (saving) return;
    const kg = Number(weight.replace(",", "."));
    const cm = Number(height.replace(",", "."));
    if (!Number.isFinite(kg) || kg < 20 || kg > 350) {
      setMessage({ ok: false, text: "Informe um peso entre 20 e 350 kg." });
      return;
    }
    if (!Number.isFinite(cm) || cm < 100 || cm > 230) {
      setMessage({ ok: false, text: "Informe a altura entre 100 e 230 cm." });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > acreDateKey()) {
      setMessage({ ok: false, text: "Escolha uma data válida que não esteja no futuro." });
      return;
    }
    // Inserir nunca sobrescreve: uma data já registrada fica protegida pelo cadeado.
    const existing = points.find((point) => point.recorded_on === date);
    if (existing) {
      blockDuplicate(existing);
      return;
    }
    if (
      !(await dialog.confirm(
        "Confirmar registro de peso?",
        `Registrar ${nf(kg)} kg (altura ${nf(cm, 0)} cm) em ${longDate(date)}?`,
        false,
        "Confirmar registro",
      ))
    )
      return;
    setSaving(true);
    setMessage(null);
    const auth = await supabase.auth.getUser();
    if (!auth.data.user) {
      setSaving(false);
      setMessage({ ok: false, text: "Entre na sua conta para registrar o peso." });
      return;
    }
    const result = await (supabase as any).from("care_body_measurements").insert({
      patient_id: patientId,
      owner_id: ownerId,
      recorded_by: auth.data.user.id,
      recorded_on: date,
      weight_kg: kg,
      height_cm: cm,
    });
    setSaving(false);
    if (result.error) {
      if (result.error.code === "23505") {
        setReload((value) => value + 1);
        setMessage({
          ok: false,
          text: `Já existe um registro em ${longDate(date)}. Libere a edição com o cadeado para corrigi-lo.`,
        });
        return;
      }
      setMessage({
        ok: false,
        text: "Não foi possível salvar. Verifique sua conexão e permissões.",
      });
      return;
    }
    setMessage({ ok: true, text: `${nf(kg)} kg inseridos em ${longDate(date)}.` });
    setReload((value) => value + 1);
    onRecorded?.();
  }

  function blockDuplicate(existing: Point) {
    setHighlightId(existing.id);
    setMessage({
      ok: false,
      text: `Já existe um registro em ${longDate(existing.recorded_on)} (${nf(existing.weight_kg)} kg). Registros salvos ficam protegidos: libere a edição com o cadeado em “Registros” para corrigir o valor.`,
    });
  }

  function lockNow() {
    setUnlockedUntil(null);
    setEditing(null);
  }

  async function requestUnlock() {
    const ok = await dialog.confirm(
      "Liberar a edição dos registros?",
      `Os registros de peso ficam protegidos contra alterações acidentais. Ao continuar, você poderá corrigir ou excluir registros por ${UNLOCK_SECONDS} segundos.`,
    );
    if (!ok) return;
    const current = Date.now();
    setNow(current);
    setUnlockedUntil(current + UNLOCK_SECONDS * 1000);
    setListMessage(null);
  }

  async function saveEdit() {
    if (!editing || busyId || !unlocked) return;
    const kg = Number(editing.weight.replace(",", "."));
    const cm = Number(editing.height.replace(",", "."));
    if (!Number.isFinite(kg) || kg < 20 || kg > 350) {
      setListMessage({ ok: false, text: "Informe um peso entre 20 e 350 kg." });
      return;
    }
    if (!Number.isFinite(cm) || cm < 100 || cm > 230) {
      setListMessage({ ok: false, text: "Informe a altura entre 100 e 230 cm." });
      return;
    }
    const target = points.find((point) => point.id === editing.id);
    if (
      !(await dialog.confirm(
        "Salvar alteração?",
        `Alterar o registro${target ? ` de ${longDate(target.recorded_on)}` : ""} para ${nf(kg)} kg (altura ${nf(cm, 0)} cm)?`,
        false,
        "Salvar alteração",
      ))
    )
      return;
    setBusyId(editing.id);
    setListMessage(null);
    const auth = await supabase.auth.getUser();
    if (!auth.data.user) {
      setBusyId(null);
      setListMessage({ ok: false, text: "Entre na sua conta para alterar o registro." });
      return;
    }
    const result = await (supabase as any)
      .from("care_body_measurements")
      .update({ weight_kg: kg, height_cm: cm, recorded_by: auth.data.user.id })
      .eq("id", editing.id)
      .eq("patient_id", patientId)
      .eq("owner_id", ownerId)
      .select("id");
    setBusyId(null);
    if (result.error || !result.data?.length) {
      setListMessage({
        ok: false,
        text: "Não foi possível alterar o registro. Verifique sua conexão e permissões.",
      });
      return;
    }
    setListMessage({ ok: true, text: "Registro alterado. A edição foi bloqueada novamente." });
    lockNow();
    setReload((value) => value + 1);
    onRecorded?.();
  }

  async function removePoint(point: Point) {
    if (busyId || !unlocked) return;
    const ok = await dialog.confirm(
      "Excluir registro de peso?",
      `O registro de ${nf(point.weight_kg)} kg em ${longDate(point.recorded_on)} será removido definitivamente.`,
      true,
    );
    if (!ok) return;
    setBusyId(point.id);
    setListMessage(null);
    const result = await (supabase as any)
      .from("care_body_measurements")
      .delete()
      .eq("id", point.id)
      .eq("patient_id", patientId)
      .eq("owner_id", ownerId)
      .select("id");
    setBusyId(null);
    if (result.error || !result.data?.length) {
      setListMessage({
        ok: false,
        text: "Não foi possível excluir o registro. Verifique sua conexão e permissões.",
      });
      return;
    }
    setListMessage({
      ok: true,
      text: `Registro de ${longDate(point.recorded_on)} excluído. A edição foi bloqueada novamente.`,
    });
    lockNow();
    setReload((value) => value + 1);
    onRecorded?.();
  }

  const filtered = useMemo(() => {
    if (range === "all") return points;
    const since = acreDateKey(new Date(Date.now() - Number(range) * 86_400_000));
    return points.filter((point) => point.recorded_on >= since);
  }, [points, range]);

  const chart = useMemo(() => {
    const avg = movingAverage(filtered.map((point) => point.weight_kg));
    return filtered.map((point, index) => ({
      date: point.recorded_on,
      label: shortDate(point.recorded_on),
      weight: point.weight_kg,
      average: Number(avg[index].toFixed(2)),
      bmi: Number(bmiOf(point.weight_kg, point.height_cm).toFixed(1)),
      delta:
        index > 0 ? Number((point.weight_kg - filtered[index - 1].weight_kg).toFixed(2)) : null,
    }));
  }, [filtered]);

  const changes = useMemo(
    () =>
      filtered
        .slice(1)
        .map((point, index) => ({
          date: point.recorded_on,
          label: shortDate(point.recorded_on),
          delta: Number((point.weight_kg - filtered[index].weight_kg).toFixed(2)),
        }))
        .slice(-14),
    [filtered],
  );

  const last = points.at(-1);
  const first = filtered[0];
  const refHeight = Number(height.replace(",", ".")) || last?.height_cm || heightCm || 0;
  const lastKg = last?.weight_kg ?? null;
  const bmi = last && refHeight ? bmiOf(last.weight_kg, refHeight) : null;
  const category = bmi ? bmiCategory(bmi) : null;
  const weeks =
    first && last
      ? (Date.parse(last.recorded_on) - Date.parse(first.recorded_on)) / 604_800_000
      : 0;
  const guidance = weightGuidance({
    ageYears,
    heightCm: refHeight || null,
    weightKg: last?.weight_kg ?? null,
    trendKgPerWeek: first && last && weeks >= 1 ? (last.weight_kg - first.weight_kg) / weeks : null,
  });
  const delta = last && first && first.id !== last.id ? last.weight_kg - first.weight_kg : null;
  const healthyMin = refHeight ? 18.5 * (refHeight / 100) ** 2 : null;
  const healthyMax = refHeight ? 24.9 * (refHeight / 100) ** 2 : null;
  const toTarget = last && target ? last.weight_kg - target : null;
  const values = chart.flatMap((point) => [point.weight]).concat(target ? [target] : []);
  const yMin = values.length ? Math.floor(Math.min(...values) - 2) : 0;
  const yMax = values.length ? Math.ceil(Math.max(...values) + 2) : 100;
  const bmiPercent = bmi ? Math.min(100, Math.max(0, ((bmi - 15) / (40 - 15)) * 100)) : 0;
  const ranges: { key: Range; label: string }[] = [
    { key: "30", label: "30 dias" },
    { key: "90", label: "3 meses" },
    { key: "365", label: "1 ano" },
    { key: "all", label: "Tudo" },
  ];

  if (loaded && unavailable)
    return (
      <p role="status" className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
        O histórico de peso ainda não está disponível neste ambiente. Verifique se a migração{" "}
        <code>care_body_measurements</code> foi aplicada.
      </p>
    );

  return (
    <div className="flex flex-col gap-2.5" aria-label="Registro e evolução do peso">
      <WeightLossPlan patientId={patientId} currentWeight={last?.weight_kg ?? currentWeight} />
      <HowItWorks>{weightHowTo}</HowItWorks>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard
          icon={Scale}
          label="Peso atual"
          color="#e879f9"
          value={last ? `${nf(last.weight_kg)} kg` : "—"}
          note={last ? `Registrado em ${longDate(last.recorded_on)}` : "Faça o primeiro registro"}
        />
        <StatCard
          icon={
            delta !== null && delta < 0
              ? TrendingDown
              : delta !== null && delta > 0
                ? TrendingUp
                : Minus
          }
          label="Variação no período"
          color={delta !== null && delta < 0 ? "#34d399" : "#fbbf24"}
          value={delta !== null ? `${signed(delta)} kg` : "—"}
          note={first ? `Desde ${longDate(first.recorded_on)}` : "Sem registros no período"}
        />
        <StatCard
          icon={Activity}
          label="IMC"
          color="#38bdf8"
          value={bmi ? nf(bmi) : "—"}
          note={category?.label ?? "Informe peso e altura"}
        />
        <StatCard
          icon={Flag}
          label="Meta de peso"
          color="#a78bfa"
          value={target ? `${nf(target)} kg` : "—"}
          note={
            toTarget !== null
              ? Math.abs(toTarget) < 0.1
                ? "Meta alcançada!"
                : `${nf(Math.abs(toTarget))} kg ${toTarget > 0 ? "acima" : "abaixo"} da meta`
              : "Defina em Meu perfil › nutrição"
          }
        />
      </div>

      {explorer}
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <aside className="contents">
          <section
            className="border border-border bg-card p-3.5 shadow-card"
            aria-label="Inserir peso"
            data-register-target="Inserir peso"
          >
            <h3 className="flex items-center gap-2 font-display text-base font-bold">
              <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white">
                <Plus size={16} />
              </span>
              Inserir peso
            </h3>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
              <label className="text-xs font-semibold">
                Data
                <span className="relative mt-1 block">
                  <CalendarDays
                    size={15}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="date"
                    max={acreDateKey()}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="block h-10 w-full border border-border bg-surface pl-8 pr-2 text-sm"
                  />
                </span>
              </label>
              <div className="grid gap-4 sm:col-span-3 sm:grid-cols-2">
                <NumberDial
                  label="Peso"
                  unit="kg"
                  value={weight}
                  onChange={setWeight}
                  min={20}
                  max={300}
                  step={0.1}
                  digits={1}
                  color="#e879f9"
                  fallback={lastKg ?? 70}
                  quick={[-1, -0.5, -0.1, 0.1, 0.5, 1]}
                  hint={lastKg ? `último: ${nf(lastKg)} kg` : undefined}
                />
                <NumberDial
                  label="Altura"
                  unit="cm"
                  value={height}
                  onChange={setHeight}
                  min={100}
                  max={230}
                  step={1}
                  digits={0}
                  color="#38bdf8"
                  fallback={refHeight || 170}
                  quick={[-5, -1, 1, 5]}
                />
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="inline-flex h-10 items-center justify-center gap-2 bg-gradient-to-r from-fuchsia-600 to-pink-500 text-sm font-bold text-white shadow-sm transition hover:brightness-110 active:scale-[.98] disabled:opacity-60 sm:col-span-3"
              >
                <Scale size={16} />
                {saving ? "Salvando…" : "Inserir registro"}
              </button>
              <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground sm:col-span-3">
                <Lock size={12} className="mt-0.5 shrink-0" />
                Um registro por dia. Inserir nunca substitui um valor já salvo: para corrigir,
                libere a edição com o cadeado em “Registros”.
              </p>
              {message && (
                <p
                  role="status"
                  className={`rounded-lg px-2.5 py-2 text-xs font-medium ${message.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 text-destructive"}`}
                >
                  {message.text}
                </p>
              )}
            </div>
          </section>

          <section
            className="border border-border bg-card p-3.5 shadow-card"
            aria-label="Classificação do IMC"
          >
            <h3 className="font-display text-sm font-bold">Classificação do IMC</h3>
            <div className="relative mt-3 h-3 rounded-full bg-gradient-to-r from-sky-400 via-emerald-500 via-40% to-red-600">
              {bmi && (
                <span
                  className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-md"
                  style={{ left: `${bmiPercent}%`, background: category?.color }}
                />
              )}
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
              <span>15</span>
              <span>18,5</span>
              <span>25</span>
              <span>30</span>
              <span>40</span>
            </div>
            <p className="mt-2 text-xs">
              {bmi ? (
                <>
                  IMC <strong>{nf(bmi)}</strong> ·{" "}
                  <strong style={{ color: guidance.adultBmi ? category?.color : undefined }}>
                    {guidance.adultBmi ? category?.label : "avaliar por percentil de idade"}
                  </strong>
                  {guidance.healthyRangeKg
                    ? ` · faixa adequada: ${nf(guidance.healthyRangeKg[0])}–${nf(guidance.healthyRangeKg[1])} kg · peso de referência: ${nf(22 * (refHeight / 100) ** 2)} kg`
                    : ""}
                </>
              ) : (
                "Registre peso e altura para calcular."
              )}
            </p>
            <p
              className={`mt-1 text-[11px] ${guidance.pace === "fast_loss" || guidance.pace === "fast_gain" ? "font-semibold text-amber-600" : "text-muted-foreground"}`}
            >
              {guidance.message} Não substitui avaliação profissional.
            </p>
          </section>
        </aside>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <WeightVariationPanel
          points={filtered.map((point) => ({ date: point.recorded_on, kg: point.weight_kg }))}
          onPick={setDetailDay}
        />
        <section
          className="border border-border bg-card p-3.5 shadow-card"
          aria-label="Registros de peso"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-bold">Registros</h3>
              <p className="text-[11px] text-muted-foreground">
                {unlocked
                  ? "Edição liberada: corrija ou exclua um registro."
                  : "Protegidos por cadeado contra alterações acidentais."}
              </p>
            </div>
            <button
              type="button"
              aria-pressed={unlocked}
              onClick={() => {
                if (unlocked) lockNow();
                else void requestUnlock();
              }}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition ${unlocked ? "bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/40 dark:text-amber-300" : "bg-muted text-foreground hover:bg-muted/70"}`}
            >
              {unlocked ? <LockOpen size={14} /> : <Lock size={14} />}
              {unlocked ? `Liberado · ${secondsLeft}s · Bloquear` : "Bloqueado · Liberar edição"}
            </button>
          </div>
          <div className="mt-2 max-h-[260px] overflow-y-auto">
            {points.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Nenhum registro ainda.
              </p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-card text-muted-foreground">
                  <tr>
                    <th className="py-1.5">Data</th>
                    <th>Peso</th>
                    <th>Variação</th>
                    <th>IMC</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {points
                    .slice()
                    .reverse()
                    .slice(0, 60)
                    .map((point, index, list) => {
                      const previous = list[index + 1];
                      const diff = previous ? point.weight_kg - previous.weight_kg : null;
                      const pointBmi = bmiOf(point.weight_kg, point.height_cm);
                      const label = longDate(point.recorded_on);
                      const busy = busyId === point.id;
                      if (editing?.id === point.id) {
                        return (
                          <tr key={point.id} className="border-t border-border bg-amber-500/5">
                            <td colSpan={5} className="py-2">
                              <div className="flex flex-wrap items-end gap-2">
                                <span className="pb-2 text-xs font-semibold">{label}</span>
                                <label className="text-[11px] font-semibold">
                                  Peso (kg)
                                  <input
                                    inputMode="decimal"
                                    aria-label={`Novo peso de ${label}`}
                                    value={editing.weight}
                                    onChange={(event) =>
                                      setEditing({ ...editing, weight: event.target.value })
                                    }
                                    className="mt-0.5 block h-9 w-24 rounded-lg border border-border bg-surface px-2 text-sm"
                                  />
                                </label>
                                <label className="text-[11px] font-semibold">
                                  Altura (cm)
                                  <input
                                    inputMode="numeric"
                                    aria-label={`Nova altura de ${label}`}
                                    value={editing.height}
                                    onChange={(event) =>
                                      setEditing({ ...editing, height: event.target.value })
                                    }
                                    className="mt-0.5 block h-9 w-24 rounded-lg border border-border bg-surface px-2 text-sm"
                                  />
                                </label>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void saveEdit()}
                                  className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white disabled:opacity-60"
                                >
                                  <Check size={14} />
                                  {busy ? "Salvando…" : "Salvar alteração"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditing(null)}
                                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold"
                                >
                                  <X size={14} />
                                  Cancelar
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr
                          key={point.id}
                          className={`border-t border-border ${highlightId === point.id ? "bg-fuchsia-500/10 ring-1 ring-fuchsia-500/40" : ""}`}
                        >
                          <td className="py-1.5">
                            <span className="inline-flex items-center gap-1">
                              {!unlocked && (
                                <Lock
                                  size={11}
                                  aria-hidden="true"
                                  className="text-muted-foreground"
                                />
                              )}
                              {label}
                              {point.id === "initial" && (
                                <span className="rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[11px] font-bold text-sky-700 dark:text-sky-300">
                                  1º cadastro
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="font-semibold tabular-nums">{nf(point.weight_kg)} kg</td>
                          <td
                            className={`tabular-nums ${diff === null ? "text-muted-foreground" : diff <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"}`}
                          >
                            {diff === null ? "—" : signed(diff)}
                          </td>
                          <td>
                            <span
                              className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold text-white"
                              style={{ background: bmiCategory(pointBmi).color }}
                            >
                              {nf(pointBmi)}
                            </span>
                          </td>
                          <td className="text-right">
                            <span className="inline-flex gap-1">
                              <button
                                type="button"
                                disabled={!unlocked || busy || point.id === "initial"}
                                aria-label={`Editar registro de ${label}`}
                                title={
                                  unlocked ? "Editar" : "Bloqueado: libere a edição com o cadeado"
                                }
                                onClick={() =>
                                  setEditing({
                                    id: point.id,
                                    weight: String(point.weight_kg).replace(".", ","),
                                    height: String(point.height_cm).replace(".", ","),
                                  })
                                }
                                className="grid size-8 place-items-center rounded-lg border border-border text-foreground transition enabled:hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                disabled={!unlocked || busy || point.id === "initial"}
                                aria-label={`Excluir registro de ${label}`}
                                title={
                                  unlocked ? "Excluir" : "Bloqueado: libere a edição com o cadeado"
                                }
                                onClick={() => void removePoint(point)}
                                className="grid size-8 place-items-center rounded-lg border border-border text-destructive transition enabled:hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Trash2 size={14} />
                              </button>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>
          {listMessage && (
            <p
              role="status"
              className={`mt-2 rounded-lg px-2.5 py-2 text-xs font-medium ${listMessage.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 text-destructive"}`}
            >
              {listMessage.text}
            </p>
          )}
        </section>
      </div>
      <DayDetailDialog
        patientId={patientId}
        ownerId={ownerId}
        focus="peso"
        day={detailDay}
        onClose={() => setDetailDay(null)}
      />
    </div>
  );
}
