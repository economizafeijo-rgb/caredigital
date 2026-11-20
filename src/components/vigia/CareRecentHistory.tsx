import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Droplets,
  History,
  Minus,
  Pencil,
  Plus,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { ingredientById } from "@/lib/nutrition-catalog";
import { measureUnit, nutrientsFor, parseFoodText } from "@/lib/food-parser";
import { useDialog } from "@/lib/dialog";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedLock } from "./AnimatedLock";
import { RecordInfo, type RecordInfoRow } from "./RecordInfo";

type Category = "hidratacao" | "refeicao" | "medicacao" | "resumo";
type RecordRow = {
  id: string;
  title: string;
  category: Category;
  at: string;
  detail: string;
  kind: "task" | "water" | "beverage" | "meal" | "reconstructed";
  /** id real da linha (sem prefixo) — habilita a exclusão quando o tipo permite. */
  rawId?: string;
  /** Valores atuais para o formulário de edição (somente água, bebida e refeição avulsa). */
  edit?: { name?: string; amount?: number; description?: string };
  info?: RecordInfoRow[];
  note?: string;
};
const catColor: Record<Category, string> = {
  hidratacao: "#0ea5e9",
  refeicao: "#10b981",
  medicacao: "#8b5cf6",
  resumo: "#64748b",
};
const n0 = (v: unknown, d = 0) => Number(v).toLocaleString("pt-BR", { maximumFractionDigits: d });
const timeOnly = (v: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Rio_Branco",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(v));
type Props = {
  patientId: string;
  ownerId: string;
  category: Category | "todos";
  onClose?: () => void;
  compact?: boolean;
  /** Abre a área do registro para editar. */
  onEdit?: (category: Category) => void;
  onChanged?: () => void;
};
const labels: Record<Category, string> = {
  hidratacao: "Hidratação",
  refeicao: "Alimentação",
  medicacao: "Medicação",
  resumo: "Resumo histórico",
};
const dateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Rio_Branco",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
export function CareRecentHistory({
  patientId,
  ownerId,
  category,
  onClose,
  compact = false,
  onEdit,
  onChanged,
}: Props) {
  const dialog = useDialog();
  const [reload, setReload] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    setShowAll(false);
  }, [category, patientId]);
  useEffect(() => {
    let active = true;
    setError("");
    const from = new Date(Date.now() - 30 * 86400000).toISOString();
    let q = (supabase as any)
      .from("care_daily_checklist")
      .select("id,title,category,scheduled_at,completed_at")
      .eq("patient_id", patientId)
      .eq("owner_id", ownerId)
      .not("completed_at", "is", null)
      .gte("completed_at", from)
      .order("completed_at", { ascending: false })
      .limit(80);
    if (category !== "todos") q = q.eq("category", category);
    const water = (supabase as any)
      .from("care_hydration")
      .select("id,task_id,amount_ml,recorded_at")
      .eq("patient_id", patientId)
      .eq("owner_id", ownerId)
      .gte("recorded_at", from)
      .order("recorded_at", { ascending: false })
      .limit(80);
    const beverages = (supabase as any)
      .from("care_client_beverages")
      .select("id,kind,name,amount_ml,consumed_at")
      .eq("patient_id", patientId)
      .eq("owner_id", ownerId)
      .gte("consumed_at", from)
      .order("consumed_at", { ascending: false })
      .limit(80);
    const meals = (supabase as any)
      .from("care_activity_log")
      .select("id,recorded_at,details")
      .eq("patient_id", patientId)
      .eq("owner_id", ownerId)
      .eq("source", "client_unscheduled_intake")
      .eq("event_type", "logged")
      .eq("category", "refeicao")
      .is("task_id", null)
      .gte("recorded_at", from)
      .order("recorded_at", { ascending: false })
      .limit(80);
    const mealLogs = (supabase as any)
      .from("care_nutrition_meal_logs")
      .select("id,meal_name,items,kcal,protein_g,recorded_at")
      .eq("patient_id", patientId)
      .eq("owner_id", ownerId)
      .gte("recorded_at", from)
      .order("recorded_at", { ascending: false })
      .limit(100);
    const foods = (supabase as any)
      .from("care_food_consumptions")
      .select("request_id,meal_group_id,grams,kcal,protein_g,carbs_g,fat_g")
      .eq("patient_id", patientId)
      .eq("owner_id", ownerId)
      .gte("recorded_at", from)
      .limit(500);
    const reconstructed = (supabase as any)
      .from("care_activity_log")
      .select("id,category,event_type,details,happened_at,scheduled_at,recorded_at")
      .eq("patient_id", patientId)
      .eq("owner_id", ownerId)
      .eq("source", "historical_reconstruction")
      .gte("recorded_at", from)
      .order("recorded_at", { ascending: false })
      .limit(100);
    void Promise.all([
      q,
      category === "medicacao" ? Promise.resolve({ data: [], error: null }) : water,
      category === "medicacao" ? Promise.resolve({ data: [], error: null }) : beverages,
      category === "hidratacao" || category === "medicacao"
        ? Promise.resolve({ data: [], error: null })
        : meals,
      category === "hidratacao" || category === "medicacao"
        ? Promise.resolve({ data: [], error: null })
        : mealLogs,
      reconstructed,
      category === "hidratacao" || category === "medicacao"
        ? Promise.resolve({ data: [], error: null })
        : foods,
    ])
      .then(
        ([
          tasksResult,
          waterResult,
          beverageResult,
          mealResult,
          mealLogsResult,
          reconstructedResult,
          foodResult,
        ]: any[]) => {
          const foodBy = new Map<
            string,
            { n: number; g: number; kcal: number; p: number; c: number; f: number }
          >();
          for (const f of foodResult?.data ?? []) {
            const k = f.request_id ?? f.meal_group_id;
            if (!k) continue;
            const c = foodBy.get(k) ?? { n: 0, g: 0, kcal: 0, p: 0, c: 0, f: 0 };
            c.n++;
            c.g += Number(f.grams) || 0;
            c.kcal += Number(f.kcal) || 0;
            c.p += Number(f.protein_g) || 0;
            c.c += Number(f.carbs_g) || 0;
            c.f += Number(f.fat_g) || 0;
            foodBy.set(k, c);
          }
          if (!active) return;
          setLoading(false);
          const failed = [
            tasksResult,
            waterResult,
            beverageResult,
            mealResult,
            mealLogsResult,
            reconstructedResult,
          ].filter((result) => result.error);
          if (failed.length)
            setError(
              "Algumas fontes não puderam ser consultadas. Os registros abaixo podem estar incompletos.",
            );
          const confirmed = (tasksResult.data ?? []).filter((r: any) =>
            ["hidratacao", "refeicao", "medicacao"].includes(r.category),
          );
          const taskIds = new Set(confirmed.map((r: any) => r.id));
          const all: RecordRow[] = [
            ...confirmed.map((r: any) => ({
              id: "task:" + r.id,
              title: r.title,
              category: r.category,
              at: r.completed_at,
              detail: "Cuidado confirmado",
              kind: "task" as const,
              info: [
                { label: "Tipo", value: "Cuidado da agenda" },
                ...(r.scheduled_at
                  ? [{ label: "Programado", value: timeOnly(r.scheduled_at) }]
                  : []),
                { label: "Confirmado", value: timeOnly(r.completed_at) },
              ],
            })),
            ...(waterResult.data ?? [])
              .filter((r: any) => !r.task_id || !taskIds.has(r.task_id))
              .map((r: any) => ({
                id: "water:" + r.id,
                rawId: String(r.id),
                edit: { amount: Number(r.amount_ml) },
                title: `Água · ${Number(r.amount_ml).toLocaleString("pt-BR")} ml`,
                category: "hidratacao" as const,
                at: r.recorded_at,
                detail: "Consumo registrado",
                kind: "water" as const,
                info: [
                  { label: "Consumido", value: "Água" },
                  { label: "Quantidade", value: `${n0(r.amount_ml)} ml` },
                  { label: "Origem", value: r.task_id ? "Cuidado da agenda" : "Registro avulso" },
                ],
              })),
            ...(beverageResult.data ?? []).map((r: any) => ({
              id: "beverage:" + r.id,
              rawId: String(r.id),
              edit: { name: String(r.name || r.kind || "Bebida"), amount: Number(r.amount_ml) },
              title: `${r.name || r.kind || "Bebida"} · ${Number(r.amount_ml).toLocaleString("pt-BR")} ml`,
              category: "hidratacao" as const,
              at: r.consumed_at,
              detail: "Bebida registrada",
              kind: "beverage" as const,
              info: [
                { label: "Consumido", value: r.name || r.kind || "Bebida" },
                { label: "Quantidade", value: `${n0(r.amount_ml)} ml` },
                ...(r.kind && r.name ? [{ label: "Tipo", value: r.kind }] : []),
              ],
            })),
            ...(mealResult.data ?? [])
              .filter((r: any) => !r.details?.superseded)
              .map((r: any) => ({
                id: "meal:" + r.id,
                rawId: String(r.id),
                edit: { description: String(r.details?.description ?? r.details?.title ?? "") },
                title: r.details?.title || r.details?.description || "Refeição registrada",
                category: "refeicao" as const,
                at: r.recorded_at,
                detail: "Registrado por você",
                kind: "meal" as const,
                ...(() => {
                  const d = r.details ?? {};
                  const desc = String(d.description ?? "");
                  const [what, portion] = desc.split(" · Porção: ");
                  const f = foodBy.get(d.request_id);
                  return {
                    info: [
                      { label: "Consumido", value: what || d.title || "Refeição" },
                      ...(portion
                        ? [{ label: /\d/.test(portion) ? "Porção" : "Refeição", value: portion }]
                        : []),
                      ...(() => {
                        const pf = parseFoodText(what || "");
                        if (pf.length > 0) {
                          const kcal = pf.reduce((a, x) => a + x.nutrients.kcal, 0);
                          // Se a descrição já traz as quantidades (ex.: "Arroz 450 g"), não repete a linha.
                          const hasQty = /\d\s*(g|ml)\b/i.test(what || "");
                          return [
                            ...(hasQty
                              ? []
                              : [
                                  {
                                    label: "Quantidade",
                                    value: pf
                                      .map(
                                        (x) =>
                                          `${x.name.split(",")[0]} ${n0(x.grams)} ${measureUnit(x.id)}`,
                                      )
                                      .join(" · "),
                                  },
                                ]),
                            ...(!(f && f.kcal > 0) && kcal > 0
                              ? [{ label: "Energia", value: `${n0(kcal)} kcal` }]
                              : []),
                          ];
                        }
                        return f && f.g > 0 ? [{ label: "Quantidade", value: `${n0(f.g)} g` }] : [];
                      })(),
                      ...(f && f.kcal > 0
                        ? [
                            { label: "Energia", value: `${n0(f.kcal)} kcal` },
                            {
                              label: "Macros",
                              value: `P ${n0(f.p)} g · C ${n0(f.c)} g · G ${n0(f.f)} g`,
                            },
                          ]
                        : []),
                    ],
                  };
                })(),
              })),
            ...(mealLogsResult.data ?? []).map((r: any) => ({
              id: "nutrition-meal:" + r.id,
              title: r.meal_name || "Refeição registrada",
              category: "refeicao" as const,
              at: r.recorded_at,
              detail: [
                Array.isArray(r.items) ? r.items.join(", ") : "",
                Number(r.kcal) > 0
                  ? Number(r.kcal).toLocaleString("pt-BR") + " kcal"
                  : "Valores nutricionais não informados",
              ]
                .filter(Boolean)
                .join(" · "),
              kind: "meal" as const,
              info: [
                { label: "Refeição", value: r.meal_name || "Refeição" },
                ...(Array.isArray(r.items) && r.items.length
                  ? [{ label: "Itens", value: r.items.join(", ") }]
                  : []),
                ...(Number(r.kcal) > 0 ? [{ label: "Energia", value: `${n0(r.kcal)} kcal` }] : []),
                ...(Number(r.protein_g) > 0
                  ? [{ label: "Proteína", value: `${n0(r.protein_g, 1)} g` }]
                  : []),
              ],
            })),
            ...(reconstructedResult.data ?? [])
              .filter((r: any) => {
                if (r.category !== "refeicao") return true;
                const date = new Date(
                  r.happened_at ?? r.scheduled_at ?? r.recorded_at,
                ).toLocaleDateString("en-CA", { timeZone: "America/Rio_Branco" });
                return !(mealLogsResult.data ?? []).some(
                  (meal: any) =>
                    new Date(meal.recorded_at).toLocaleDateString("en-CA", {
                      timeZone: "America/Rio_Branco",
                    }) === date,
                );
              })
              .map((r: any) => {
                const d = r.details ?? {};
                const evidence = String(d.evidence ?? "");
                const date = evidence.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                const time = String(d.local_time ?? "12:00");
                const reconstructedAt =
                  r.happened_at ??
                  (date
                    ? date[3] + "-" + date[2] + "-" + date[1] + "T" + time + ":00-05:00"
                    : (r.scheduled_at ?? r.recorded_at));
                const category: Category =
                  r.category === "hidratacao"
                    ? "hidratacao"
                    : r.category === "refeicao"
                      ? "refeicao"
                      : r.category === "resumo_diario"
                        ? "resumo"
                        : "medicacao";
                const titleByType: Record<string, string> = {
                  snapshot_dashboard: "Resumo do painel",
                  snapshot_metas: "Resumo das metas",
                  snapshot_tratamento: "Resumo do tratamento",
                  conferencia_confirmada: "Conferência de medicamento",
                  refeicao_confirmada: "Refeição reconstruída",
                  lanche_extra_registrado: "Lanche extra reconstruído",
                  cuidado_programado: "Cuidado programado na captura",
                  medicacao_programada: "Medicação programada na captura",
                  refeicao_programada: "Refeição programada na captura",
                  nao_bebi: "Não bebi água",
                };
                const detailByType: Record<string, string> = {
                  snapshot_dashboard: [
                    d.hydration_display,
                    d.hydration_ml != null ? String(d.hydration_ml) + " ml de água" : "",
                    d.hydration_progress ? String(d.hydration_progress) + " de hidratação" : "",
                    d.meals_confirmed ? String(d.meals_confirmed) + " refeições" : "",
                    d.care_items_completed ? String(d.care_items_completed) + " cuidados" : "",
                    d.medication_doses_confirmed
                      ? String(d.medication_doses_confirmed) + " doses"
                      : "",
                    d.completion_percent != null
                      ? String(d.completion_percent) + "% de conclusão"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" · "),
                  snapshot_metas: [
                    d.nutrition_kcal != null ? String(d.nutrition_kcal) + " kcal" : "",
                    d.protein_g != null ? String(d.protein_g) + " g de proteína" : "",
                    d.hydration_ml != null ? String(d.hydration_ml) + " ml de água" : "",
                  ]
                    .filter(Boolean)
                    .join(" · "),
                  snapshot_tratamento: [d.blister, d.progress, d.morning_dose, d.night_dose]
                    .filter(Boolean)
                    .join(" · "),
                  refeicao_confirmada: [d.meal, Array.isArray(d.items) ? d.items.join(", ") : ""]
                    .filter(Boolean)
                    .join(": "),
                  lanche_extra_registrado: [
                    d.meal,
                    Array.isArray(d.items) ? d.items.join(", ") : "",
                    d.quantity,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                };
                const detail = [
                  detailByType[r.event_type] ||
                    d.description ||
                    "Registro recuperado de captura histórica",
                  evidence,
                  d.status === "programado_na_captura"
                    ? "Programado na captura; execução não confirmada"
                    : "Registro reconstruído, não é um novo consumo",
                ]
                  .filter(Boolean)
                  .join(" · ");
                const title =
                  r.event_type === "refeicao_programada" || r.event_type === "nao_bebi"
                    ? d.description || titleByType[r.event_type]
                    : titleByType[r.event_type] || d.description || "Registro histórico recuperado";
                return {
                  id: "reconstructed:" + r.id,
                  title,
                  category,
                  at: reconstructedAt,
                  detail,
                  kind: "reconstructed" as const,
                  info: [{ label: "Origem", value: "Captura histórica" }],
                  note: detail,
                };
              }),
          ];
          setRows(
            all
              .filter((r) => category === "todos" || r.category === category)
              .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
              .slice(0, 120),
          );
        },
      )
      .catch(() => {
        if (active) {
          setLoading(false);
          setError("Não foi possível consultar o histórico.");
        }
      });

    return () => {
      active = false;
    };
  }, [patientId, ownerId, category, reload]);
  useEffect(() => {
    const on = () => setReload((n) => n + 1);
    window.addEventListener("nv-intake-changed", on);
    return () => window.removeEventListener("nv-intake-changed", on);
  }, []);
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const [fName, setFName] = useState("");
  const [fAmount, setFAmount] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fWhen, setFWhen] = useState("");
  const [fItems, setFItems] = useState<{ id: string; name: string }[]>([]);
  const [fQty, setFQty] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const itemKcal = (id: string, q: string) => {
    const it = ingredientById.get(id);
    const g = Number(q.replace(",", ".")) || 0;
    return it && g > 0 ? nutrientsFor(it, g).kcal : 0;
  };
  const acreLocal = (iso: string) => {
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
  };
  function openEdit(row: RecordRow) {
    setEditing(row);
    setFName(row.edit?.name ?? "");
    setFAmount(row.edit?.amount ? String(row.edit.amount) : "");
    setFDesc(row.edit?.description ?? "");
    setFWhen(acreLocal(row.at));
    const parsed = row.kind === "meal" ? parseFoodText(row.edit?.description ?? "") : [];
    setFItems(parsed.map((x) => ({ id: x.id, name: x.name.split(",")[0] })));
    setFQty(parsed.map((x) => String(Math.round(x.grams))));
  }
  async function saveEdit() {
    const row = editing;
    if (!row?.rawId) return;
    const when = Date.parse(`${fWhen}:00-05:00`);
    if (!Number.isFinite(when) || when > Date.now() + 120_000) {
      dialog.notify?.("Informe um horário válido que não esteja no futuro.", "danger");
      return;
    }
    const amount = Math.round(Number(fAmount.replace(",", ".")));
    if (row.kind !== "meal" && (!Number.isFinite(amount) || amount < 10 || amount > 1500)) {
      dialog.notify?.("Informe a quantidade entre 10 e 1.500 ml.", "danger");
      return;
    }
    if (row.kind === "beverage" && fName.trim().length < 2) {
      dialog.notify?.("Informe o nome da bebida.", "danger");
      return;
    }
    if (
      row.kind === "meal" &&
      fItems.length > 0 &&
      fQty.some((q) => !(Number(q.replace(",", ".")) >= 1 && Number(q.replace(",", ".")) <= 5000))
    ) {
      dialog.notify?.("Informe quantidades entre 1 e 5.000.", "danger");
      return;
    }
    if (row.kind === "meal" && fItems.length === 0 && fDesc.trim().length < 3) {
      dialog.notify?.("Descreva a refeição com pelo menos 3 letras.", "danger");
      return;
    }
    if (
      !(await dialog.confirm(
        "Salvar alterações?",
        `${row.title} será atualizado para ${new Date(when).toLocaleString("pt-BR", { timeZone: "America/Rio_Branco", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} e as métricas serão recalculadas.`,
        false,
        "Salvar",
      ))
    )
      return;
    setSaving(true);
    const { error: err } = await (supabase as any).rpc("care_update_intake_entry", {
      p_patient_id: patientId,
      p_entry_type: row.kind,
      p_entry_id: row.rawId,
      p_description:
        row.kind === "meal"
          ? fItems.length > 0
            ? fItems
                .map(
                  (it, i) =>
                    `${it.name} ${Number(fQty[i].replace(",", "."))} ${measureUnit(it.id)}`,
                )
                .join(", ")
            : fDesc.trim()
          : row.kind === "beverage"
            ? fName.trim()
            : null,
      p_amount_ml: row.kind === "meal" ? null : amount,
      p_consumed_at: new Date(when).toISOString(),
    });
    setSaving(false);
    if (err) {
      dialog.notify?.(err.message || "Não foi possível salvar a alteração.", "danger");
      return;
    }
    dialog.notify?.("Registro atualizado. Métricas recalculadas.");
    setEditing(null);
    setReload((n) => n + 1);
    onChanged?.();
    window.dispatchEvent(new Event("nv-intake-changed"));
  }
  async function remove(row: RecordRow) {
    if (!row.rawId || (row.kind !== "water" && row.kind !== "beverage" && row.kind !== "meal"))
      return;
    if (
      !(await dialog.confirm(
        "Excluir registro?",
        `${row.title} (${timeOnly(row.at)}) será apagado e as métricas do dia recalculadas. Não dá para desfazer.`,
        true,
        "Excluir",
      ))
    )
      return;
    setBusyId(row.id);
    const { error: err } = await (supabase as any).rpc("care_delete_intake_entry", {
      p_patient_id: patientId,
      p_entry_type: row.kind,
      p_entry_id: row.rawId,
    });
    setBusyId(null);
    if (err) {
      dialog.notify?.(err.message || "Não foi possível excluir o registro.", "danger");
      return;
    }
    dialog.notify?.("Registro excluído. Métricas recalculadas.");
    setReload((n) => n + 1);
    onChanged?.();
    window.dispatchEvent(new Event("nv-intake-changed"));
  }
  const initial = compact ? 7 : 5;
  const displayed = showAll ? rows : rows.slice(0, initial);
  return (
    <section
      className={compact ? "care-history-panel care-history-compact" : "care-history-panel"}
      aria-label={"Histórico recente de " + (category === "todos" ? "cuidados" : labels[category])}
    >
      <header className="care-history-head">
        <div>
          <span className="care-history-eyebrow">
            <History size={14} /> HISTÓRICO CONFIRMADO
          </span>
          {!compact && (
            <h4>
              {category === "todos"
                ? "Últimos cuidados realizados"
                : labels[category] + " · últimos registros"}
            </h4>
          )}
          <p>Cuidados confirmados e consumos registrados nos últimos 30 dias.</p>
        </div>
        {onClose && (
          <button
            type="button"
            className="care-history-close"
            onClick={onClose}
            aria-label="Fechar histórico"
          >
            <X size={17} />
          </button>
        )}
      </header>
      {loading ? (
        <p className="care-history-empty">Consultando registros…</p>
      ) : error && rows.length === 0 ? (
        <p role="alert" className="care-history-empty">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="care-history-empty">
          Nenhum registro encontrado neste período. Outros eventos podem estar disponíveis no
          prontuário completo.
        </p>
      ) : (
        <>
          {error && (
            <p role="alert" className="care-history-empty">
              {error}
            </p>
          )}
          <div className="care-history-list">
            {displayed.map((row) => (
              <div className="care-history-entry" key={row.id}>
                <span className="care-history-entry-icon">
                  <CheckCircle2 size={17} />
                </span>
                <div className="care-history-entry-copy">
                  <strong>{row.title}</strong>
                  <span>
                    {labels[row.category]} · {row.detail}
                  </span>
                </div>
                <time dateTime={row.at}>
                  <Clock3 size={12} />
                  {dateTime(row.at)}
                </time>
                <AnimatedLock size={14} label="Registro guardado no prontuário" />
                {row.rawId && row.edit && (
                  <button
                    type="button"
                    className="care-history-del"
                    onClick={() => openEdit(row)}
                    title="Editar registro"
                    aria-label={`Editar ${row.title}`}
                  >
                    <Pencil size={14} />
                  </button>
                )}
                {row.rawId && ["water", "beverage", "meal"].includes(row.kind) && (
                  <button
                    type="button"
                    className="care-history-del"
                    disabled={busyId === row.id}
                    onClick={() => void remove(row)}
                    title="Excluir registro"
                    aria-label={`Excluir ${row.title}`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <RecordInfo
                  title={row.title}
                  at={row.at}
                  category={labels[row.category]}
                  color={catColor[row.category]}
                  rows={row.info}
                  description={row.note}
                />
              </div>
            ))}
          </div>
          {rows.length > initial && (
            <button
              type="button"
              className="care-history-more"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Mostrar menos" : `Ver mais ${rows.length - initial} registros`}
            </button>
          )}
        </>
      )}
      {!compact && (
        <p className="care-history-footnote">
          Registros provenientes da agenda, hidratação, bebidas e refeições avulsas. Consulte o
          prontuário completo para detalhes adicionais.
        </p>
      )}
      {editing && (
        <div
          className="fixed inset-0 z-[150] grid place-items-center bg-slate-950/70 p-3 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && setEditing(null)}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-label="Editar registro"
            onSubmit={(e) => {
              e.preventDefault();
              void saveEdit();
            }}
            className="w-full max-w-md overflow-hidden border border-border bg-card text-foreground shadow-2xl"
          >
            <div className="h-1" style={{ background: catColor[editing.category] }} />
            <header className="flex items-start gap-3 px-5 pt-4">
              <span
                className="grid size-11 shrink-0 place-items-center border"
                style={{
                  color: catColor[editing.category],
                  borderColor: `${catColor[editing.category]}66`,
                  background: `${catColor[editing.category]}1a`,
                }}
              >
                {editing.kind === "meal" ? <Utensils size={20} /> : <Droplets size={20} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold leading-tight">Editar registro</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{editing.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Fechar"
                className="grid size-8 place-items-center text-muted-foreground hover:bg-muted"
              >
                <X size={16} />
              </button>
            </header>
            <div className="grid gap-4 px-5 py-4 text-xs font-semibold">
              {editing.kind === "beverage" && (
                <label>
                  Bebida
                  <input
                    value={fName}
                    onChange={(e) => setFName(e.target.value)}
                    maxLength={100}
                    className="field mt-1 h-10 w-full"
                  />
                </label>
              )}
              {editing.kind === "meal" ? (
                fItems.length > 0 ? (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span>Alimentos e quantidades</span>
                      <span className="tabular-nums text-primary">
                        {n0(fItems.reduce((a, it, i) => a + itemKcal(it.id, fQty[i] ?? ""), 0))}{" "}
                        kcal
                      </span>
                    </div>
                    <ul className="divide-y divide-border border border-border">
                      {fItems.map((it, i) => (
                        <li key={it.id + i} className="flex items-center gap-2 p-2">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">{it.name}</span>
                            <span className="text-[11px] font-normal tabular-nums text-muted-foreground">
                              {n0(itemKcal(it.id, fQty[i] ?? ""))} kcal
                            </span>
                          </span>
                          <button
                            type="button"
                            aria-label="Diminuir"
                            onClick={() =>
                              setFQty((q) =>
                                q.map((v, j) =>
                                  j === i
                                    ? String(Math.max(1, (Number(v.replace(",", ".")) || 0) - 10))
                                    : v,
                                ),
                              )
                            }
                            className="grid size-8 place-items-center border border-border hover:bg-muted"
                          >
                            <Minus size={13} />
                          </button>
                          <input
                            inputMode="decimal"
                            value={fQty[i] ?? ""}
                            onChange={(e) =>
                              setFQty((q) => q.map((v, j) => (j === i ? e.target.value : v)))
                            }
                            onFocus={(e) => e.currentTarget.select()}
                            aria-label={`Quantidade de ${it.name}`}
                            className="field h-8 w-16 text-center tabular-nums"
                          />
                          <button
                            type="button"
                            aria-label="Aumentar"
                            onClick={() =>
                              setFQty((q) =>
                                q.map((v, j) =>
                                  j === i ? String((Number(v.replace(",", ".")) || 0) + 10) : v,
                                ),
                              )
                            }
                            className="grid size-8 place-items-center border border-border hover:bg-muted"
                          >
                            <Plus size={13} />
                          </button>
                          <span className="w-6 text-[11px] font-normal text-muted-foreground">
                            {measureUnit(it.id)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1.5 font-normal text-muted-foreground">
                      As calorias e os nutrientes são recalculados com a nova quantidade.
                    </p>
                  </div>
                ) : (
                  <label>
                    Descrição
                    <textarea
                      value={fDesc}
                      onChange={(e) => setFDesc(e.target.value)}
                      maxLength={1000}
                      rows={3}
                      className="field mt-1 w-full p-2"
                    />
                    <span className="mt-1 block font-normal text-muted-foreground">
                      Dica: escreva a quantidade, como “Tapioca 80 g”, para o sistema calcular as
                      calorias.
                    </span>
                  </label>
                )
              ) : (
                <div>
                  <label htmlFor="edit-ml">Quantidade (ml)</label>
                  <div className="mt-1 flex">
                    <button
                      type="button"
                      aria-label="Diminuir"
                      onClick={() =>
                        setFAmount(
                          String(Math.max(10, (Number(fAmount.replace(",", ".")) || 0) - 50)),
                        )
                      }
                      className="grid h-10 w-10 place-items-center border border-border hover:bg-muted"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      id="edit-ml"
                      inputMode="numeric"
                      value={fAmount}
                      onChange={(e) => setFAmount(e.target.value)}
                      onFocus={(e) => e.currentTarget.select()}
                      className="field h-10 flex-1 text-center text-base tabular-nums"
                    />
                    <button
                      type="button"
                      aria-label="Aumentar"
                      onClick={() =>
                        setFAmount(
                          String(Math.min(1500, (Number(fAmount.replace(",", ".")) || 0) + 50)),
                        )
                      }
                      className="grid h-10 w-10 place-items-center border border-border hover:bg-muted"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[100, 200, 250, 300, 500].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setFAmount(String(v))}
                        className={`border px-2.5 py-1 text-[11px] hover:bg-muted ${Number(fAmount) === v ? "border-primary text-primary" : "border-border"}`}
                      >
                        {v} ml
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <label>
                Horário (Acre)
                <input
                  type="datetime-local"
                  value={fWhen}
                  max={acreLocal(new Date().toISOString())}
                  onChange={(e) => setFWhen(e.target.value)}
                  className="field mt-1 h-10 w-full"
                />
              </label>
            </div>
            <footer className="flex justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="h-10 px-4 text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-10 bg-primary px-6 text-xs font-bold text-primary-foreground transition hover:brightness-110 active:scale-[.97] disabled:opacity-60"
              >
                {saving ? "Salvando…" : "Salvar alterações"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}
