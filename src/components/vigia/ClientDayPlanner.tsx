import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { RecordInfo } from "./RecordInfo";
import {
  Activity,
  Check,
  ChevronRight,
  CircleSlash,
  Pencil,
  Trash2,
  Droplets,
  HeartPulse,
  Moon,
  Pill,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Undo2,
  UtensilsCrossed,
  X,
  MoreHorizontal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import { mealKindOf } from "@/lib/day-plan";
import { careReminderState, type ReminderTask } from "@/lib/care-reminders";
import { clientSectionHashes, type ClientSection } from "@/lib/client-pages";
import { AnimatedLock } from "./AnimatedLock";
import { NextUpClock } from "./NextUpClock";

/**
 * Meu dia: uma linha do tempo com tudo o que o cliente planejou para hoje — doses de
 * remédio e suplemento, copos de água sugeridos, refeições, movimento, sono e os cuidados
 * programados pela equipe. Cada item mostra se já foi feito, se está na hora ou atrasado,
 * e traz a ação de um toque (Tomei, Bebi, Registrar).
 */
type PatientCare = ReminderTask & { patient_id: string };
type Kind = "med" | "supl" | "agua" | "refeicao" | "atividade" | "sono" | "cuidado";
type Status = "done" | "late" | "now" | "planned" | "skipped";
type Item = {
  id: string;
  kind: Kind;
  at: number;
  title: string;
  detail: string;
  status: Status;
  doneAt?: number;
  action?: { label: string; run: () => void };
  /** Alterar a quantidade consumida (antes de registrar ou depois de registrada). */
  edit?: () => void;
  /** Excluir o registro (com confirmação). */
  remove?: () => void;
  /** Texto do botão de editar (padrão: alterar a quantidade). */
  editLabel?: string;
  undo?: () => void;
  /** Adiar o horário (a refeição é reprogramada para mais tarde no mesmo dia). */
  postpone?: (minutes: number) => void;
  /** Cancelar a refeição de hoje (sem apetite), com confirmação. */
  cancel?: () => void;
  task?: PatientCare;
  /** Pode ser respondido como "não fiz" (com motivo). */
  skippable?: boolean;
};
const REASONS: [string, string][] = [
  ["nao_consegui", "Não consegui"],
  ["esqueci", "Esqueci"],
  ["sem_produto", "Acabou / sem o produto"],
  ["mal_estar", "Mal-estar"],
  ["orientacao", "Orientação profissional"],
  ["dispensado", "Dispensar hoje"],
  ["outro", "Outro motivo"],
];
const reasonLabel = (r: string) => REASONS.find(([k]) => k === r)?.[1] ?? "Não fiz";

const tz = "America/Rio_Branco";
const dayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
const at = (day: string, hhmm: string) => Date.parse(`${day}T${hhmm}:00-05:00`);
const hm = (ms: number) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
const hourOf = (ms: number) =>
  Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(
      new Date(ms),
    ),
  );

const KINDS: Record<
  Kind,
  {
    label: string;
    color: string;
    soft: string;
    icon: ComponentType<{ size?: number; className?: string }>;
    area: ClientSection;
  }
> = {
  med: {
    label: "Remédios",
    color: "#e11d48",
    soft: "bg-rose-500/12 text-rose-600 dark:text-rose-300",
    icon: Pill,
    area: "medicacao",
  },
  supl: {
    label: "Suplementos",
    color: "#7c3aed",
    soft: "bg-violet-500/12 text-violet-600 dark:text-violet-300",
    icon: Sparkles,
    area: "suplementos",
  },
  agua: {
    label: "Água",
    color: "#0284c7",
    soft: "bg-sky-500/12 text-sky-600 dark:text-sky-300",
    icon: Droplets,
    area: "hidratacao",
  },
  refeicao: {
    label: "Refeições",
    color: "#059669",
    soft: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
    icon: UtensilsCrossed,
    area: "alimentacao",
  },
  atividade: {
    label: "Movimento",
    color: "#ea580c",
    soft: "bg-orange-500/12 text-orange-600 dark:text-orange-300",
    icon: Activity,
    area: "atividade",
  },
  sono: {
    label: "Sono",
    color: "#4f46e5",
    soft: "bg-indigo-500/12 text-indigo-600 dark:text-indigo-300",
    icon: Moon,
    area: "sono",
  },
  cuidado: {
    label: "Equipe",
    color: "#0f766e",
    soft: "bg-teal-500/12 text-teal-600 dark:text-teal-300",
    icon: HeartPulse,
    area: "agenda",
  },
};
const PERIODS = [
  { id: "manha", label: "Manhã", icon: Sunrise, color: "#f59e0b", test: (h: number) => h < 12 },
  {
    id: "tarde",
    label: "Tarde",
    icon: Sun,
    color: "#38bdf8",
    test: (h: number) => h >= 12 && h < 18,
  },
  { id: "noite", label: "Noite", icon: Sunset, color: "#818cf8", test: (h: number) => h >= 18 },
] as const;
const go = (area: ClientSection) => {
  window.location.hash = clientSectionHashes[area];
};

type Raw = {
  water: any[];
  bev: any[];
  meds: any[];
  medIn: any[];
  sup: any[];
  supIn: any[];
  acts: any[];
  mlogs: any[];
  foods: any[];
  sleep: any[];
  resp: any[];
};

export function ClientDayPlanner({
  patientId,
  ownerId,
  waterTarget,
  tasks,
  resolved = {},
  now,
  onView,
  onConfirm,
  revision = 0,
  onRecorded,
}: {
  patientId: string;
  ownerId: string;
  waterTarget: number | null;
  tasks: PatientCare[];
  resolved?: Record<string, string>;
  now: number;
  onView: (task: PatientCare) => void;
  onConfirm: (task: PatientCare) => void;
  revision?: number;
  onRecorded?: () => void;
}) {
  const dialog = useDialog();
  const [raw, setRaw] = useState<Raw | null>(null);
  const [reload, setReload] = useState(0);
  const [filter, setFilter] = useState<Kind | "todos">("todos");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [sheet, setSheet] = useState<Item | null>(null);
  const day = dayKey();
  async function saveSkip(item: Item, reason: string, note: string) {
    setBusy(item.id);
    setError("");
    const { error: err } = await (supabase as any).from("care_day_item_responses").insert({
      patient_id: patientId,
      owner_id: ownerId,
      day,
      item_key: item.id,
      kind: item.kind,
      reason,
      note: note.trim() || null,
    });
    setBusy(null);
    if (err) {
      setError(err.message || "Não foi possível salvar a resposta.");
      return;
    }
    setSheet(null);
    refresh();
  }

  useEffect(() => {
    let active = true;
    const db = supabase as any;
    const from = new Date(day + "T00:00:00-05:00").toISOString();
    const safe = (q: any) =>
      Promise.resolve(q).then(
        (r: any) => r?.data ?? [],
        () => [],
      );
    let qs: Promise<any[]>[];
    try {
      qs = [
        safe(
          db
            .from("care_hydration")
            .select("id,amount_ml,recorded_at")
            .eq("patient_id", patientId)
            .gte("recorded_at", from)
            .order("recorded_at"),
        ),
        safe(
          db
            .from("care_client_beverages")
            .select("id,name,amount_ml,consumed_at")
            .eq("patient_id", patientId)
            .gte("consumed_at", from),
        ),
        safe(
          db
            .from("care_client_medications")
            .select("id,name,dose,times,active")
            .eq("patient_id", patientId)
            .eq("owner_id", ownerId),
        ),
        safe(
          db
            .from("care_client_medication_intakes")
            .select("medication_id,slot,taken_at")
            .eq("patient_id", patientId)
            .eq("taken_on", day),
        ),
        safe(
          db
            .from("care_supplement_plans")
            .select("id,name,dose,unit,times,active")
            .eq("patient_id", patientId)
            .eq("owner_id", ownerId),
        ),
        safe(
          db
            .from("care_supplement_intakes")
            .select("plan_id,slot,taken_at")
            .eq("patient_id", patientId)
            .eq("taken_on", day),
        ),
        safe(
          db
            .from("care_activity_log")
            .select("id,category,happened_at,recorded_at,details,request_id,source")
            .eq("patient_id", patientId)
            .in("category", ["refeicao", "atividade"])
            .in("event_type", ["confirmed", "logged"])
            .gte("recorded_at", from),
        ),
        safe(
          db
            .from("care_nutrition_meal_logs")
            .select("id,meal_name,items,recorded_at")
            .eq("patient_id", patientId)
            .gte("recorded_at", from),
        ),
        safe(
          db
            .from("care_food_consumptions")
            .select("id,food_id,grams,recorded_at,meal_group_id,request_id")
            .eq("patient_id", patientId)
            .gte("recorded_at", from),
        ),
        safe(
          db
            .from("care_sleep_logs")
            .select("id,bed_at,wake_at,sleep_date")
            .eq("patient_id", patientId)
            .order("sleep_date", { ascending: false })
            .limit(7),
        ),
        safe(
          db
            .from("care_day_item_responses")
            .select("item_key,reason,note,created_at")
            .eq("patient_id", patientId)
            .eq("day", day),
        ),
      ];
    } catch {
      setRaw({
        water: [],
        bev: [],
        meds: [],
        medIn: [],
        sup: [],
        supIn: [],
        acts: [],
        mlogs: [],
        foods: [],
        sleep: [],
        resp: [],
      });
      return () => {
        active = false;
      };
    }
    void Promise.all(qs).then(
      ([water, bev, meds, medIn, sup, supIn, acts, mlogs, foods, sleep, resp]) => {
        if (active)
          setRaw({ water, bev, meds, medIn, sup, supIn, acts, mlogs, foods, sleep, resp });
      },
    );
    return () => {
      active = false;
    };
  }, [patientId, ownerId, day, reload, revision]);

  useEffect(() => {
    const bump = () => {
      setReload((n) => n + 1);
      onRecorded?.();
    };
    window.addEventListener("nv-intake-changed", bump);
    return () => window.removeEventListener("nv-intake-changed", bump);
  }, [onRecorded]);
  // Sincroniza com o que foi registrado em qualquer área: ao voltar para a aba, a cada 20 s
  // e quando o banco avisa de uma mudança nas tabelas do dia.
  useEffect(() => {
    if (!patientId) return;
    const bump = () => setReload((n) => n + 1);
    const onVis = () => document.visibilityState === "visible" && bump();
    const timer = window.setInterval(
      () => document.visibilityState === "visible" && bump(),
      20_000,
    );
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", bump);
    window.addEventListener("hashchange", bump);
    let channel: any = null;
    try {
      const sb = supabase as any;
      channel = sb.channel(`meu-dia-${patientId}`);
      for (const table of [
        "care_activity_log",
        "care_nutrition_meal_logs",
        "care_food_consumptions",
        "care_hydration",
        "care_client_beverages",
        "care_client_medication_intakes",
        "care_supplement_intakes",
        "care_sleep_logs",
      ])
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `patient_id=eq.${patientId}` },
          bump,
        );
      channel.subscribe();
    } catch {
      /* sem tempo real: a atualização periódica cobre */
    }
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", bump);
      window.removeEventListener("hashchange", bump);
      try {
        if (channel) (supabase as any).removeChannel(channel);
      } catch {
        /* ok */
      }
    };
  }, [patientId]);
  const refresh = () => {
    setReload((n) => n + 1);
    onRecorded?.();
  };
  async function askAmount(current: number): Promise<number | null> {
    const answer = await dialog.prompt(
      "Quantidade consumida",
      "Informe quantos ml foram consumidos (de 10 a 2.000).",
      String(current),
    );
    if (answer === null) return null;
    const value = Math.round(
      Number(
        String(answer)
          .replace(",", ".")
          .replace(/[^\d.]/g, ""),
      ),
    );
    if (!Number.isFinite(value) || value < 10 || value > 2000) {
      dialog.notify?.("Informe uma quantidade entre 10 e 2.000 ml.", "danger");
      return null;
    }
    return value;
  }
  async function run(
    id: string,
    ask: [string, string, string],
    fn: () => Promise<{ error?: { message?: string } | null }>,
    success = "Registro salvo com sucesso.",
  ) {
    if (busy) return;
    if (!(await dialog.confirm(ask[0], ask[1], false, ask[2]))) return;
    setBusy(id);
    setError("");
    const res = await fn().catch((e) => ({ error: { message: String(e?.message ?? e) } }));
    setBusy(null);
    if (res?.error) {
      setError(res.error.message || "Não foi possível registrar. Tente novamente.");
      return;
    }
    dialog.notify?.(success);
    refresh();
  }

  const items = useMemo<Item[]>(() => {
    if (!raw) return [];
    const db = supabase as any;
    const out: Item[] = [];
    const stateOf = (ms: number, done: boolean, window = 60): Status =>
      done
        ? "done"
        : ms < now - window * 60_000
          ? "late"
          : ms <= now + 15 * 60_000
            ? "now"
            : "planned";

    // Remédios e suplementos: uma linha por dose
    const dose = (
      kind: "med" | "supl",
      plans: any[],
      taken: any[],
      idKey: "medication_id" | "plan_id",
    ) => {
      for (const p of plans.filter((x) => x.active !== false))
        for (const t of (p.times ?? []) as string[]) {
          const ms = at(day, t);
          const hit = taken.find((x) => x[idKey] === p.id && x.slot === t);
          const label = kind === "med" ? `${p.name}` : `${p.name}`;
          const detail =
            kind === "med" ? p.dose || "dose" : `${p.dose ?? ""} ${p.unit ?? ""}`.trim() || "dose";
          const table =
            kind === "med" ? "care_client_medication_intakes" : "care_supplement_intakes";
          const id = `${kind}-${p.id}-${t}`;
          out.push({
            id,
            kind,
            at: ms,
            title: label,
            detail,
            status: stateOf(ms, Boolean(hit)),
            skippable: !hit,
            doneAt: hit?.taken_at ? Date.parse(hit.taken_at) : undefined,
            action: hit
              ? undefined
              : {
                  label: "Tomei",
                  run: () =>
                    void run(
                      id,
                      [
                        "Confirmar dose?",
                        `Registrar ${label} (${detail}) das ${t} como tomado agora?`,
                        "Tomei",
                      ],
                      () =>
                        kind === "med"
                          ? db.from(table).upsert(
                              {
                                medication_id: p.id,
                                patient_id: patientId,
                                owner_id: ownerId,
                                taken_on: day,
                                slot: t,
                              },
                              {
                                onConflict: "medication_id,taken_on,slot",
                                ignoreDuplicates: true,
                              },
                            )
                          : db.from(table).insert({
                              plan_id: p.id,
                              patient_id: patientId,
                              owner_id: ownerId,
                              taken_on: day,
                              slot: t,
                            }),
                    ),
                },
            undo: hit
              ? () =>
                  void run(
                    id,
                    ["Desfazer dose?", `Marcar ${label} das ${t} como não tomado?`, "Desfazer"],
                    () => db.from(table).delete().eq(idKey, p.id).eq("taken_on", day).eq("slot", t),
                  )
              : undefined,
          });
        }
    };
    dose("med", raw.meds, raw.medIn, "medication_id");
    dose("supl", raw.sup, raw.supIn, "plan_id");

    // Água: registros feitos + próximos copos sugeridos até as 19h
    const drinks = [
      ...raw.water.map((r) => ({
        id: r.id,
        t: Date.parse(r.recorded_at),
        ml: Number(r.amount_ml),
        name: "Água",
        src: "water" as const,
      })),
      ...raw.bev.map((r) => ({
        id: r.id,
        t: Date.parse(r.consumed_at),
        ml: Number(r.amount_ml),
        name: r.name || "Bebida",
        src: "beverage" as const,
      })),
    ].sort((a, b) => a.t - b.t);
    for (const d of drinks)
      out.push({
        id: `agua-${d.id}`,
        kind: "agua",
        at: d.t,
        title: `${d.name} · ${d.ml} ml`,
        detail: "registrado",
        status: "done",
        doneAt: d.t,
        remove: () =>
          void run(
            `agua-del-${d.id}`,
            [
              "Excluir registro?",
              `${d.name} · ${d.ml} ml (${hm(d.t)}) será apagado e as métricas do dia recalculadas. Não dá para desfazer.`,
              "Excluir",
            ],
            () =>
              db.rpc("care_delete_intake_entry", {
                p_patient_id: patientId,
                p_entry_type: d.src,
                p_entry_id: d.id,
              }),
            "Registro excluído. Métricas recalculadas.",
          ),
        edit: () =>
          void askAmount(d.ml).then((value) => {
            if (value === null || value === d.ml) return;
            void run(
              `agua-${d.id}`,
              [
                "Salvar alteração?",
                `Alterar ${d.name} de ${d.ml} ml para ${value} ml?`,
                "Salvar alteração",
              ],
              () =>
                db.rpc("care_update_intake_entry", {
                  p_patient_id: patientId,
                  p_entry_type: d.src,
                  p_entry_id: d.id,
                  p_description: d.src === "beverage" ? d.name : null,
                  p_amount_ml: value,
                  p_consumed_at: new Date(d.t).toISOString(),
                }),
              "Quantidade alterada com sucesso.",
            );
          }),
      });
    // Refeições: cada horário típico é "feito" se houver registro até 90 min dele
    const seen = new Set<string>();
    const meals = raw.acts
      .filter(
        (r) =>
          r.category === "refeicao" &&
          r.source !== "client_nutrition_library" &&
          (!r.request_id || (!seen.has(r.request_id) && seen.add(r.request_id))),
      )
      .map((r) => ({
        id: r.id as string,
        t: Date.parse(r.happened_at ?? r.recorded_at),
        text: String(r.details?.description || r.details?.title || "Refeição"),
        kind:
          mealKindOf(r.details?.kind) ||
          mealKindOf(r.details?.title, r.details?.description, r.details?.meal_name),
        src: "act" as "act" | "log" | "food",
        foodIds: [] as string[],
        groupId: null as string | null,
      }));
    // Refeições registradas pela área de alimentação também contam para o horário previsto
    const mealKind = (name: string) => mealKindOf(name);
    for (const r of raw.mlogs) {
      const t = Date.parse(r.recorded_at);
      if (meals.some((m) => Math.abs(m.t - t) < 3 * 60_000)) continue;
      const list = Array.isArray(r.items) ? r.items.join(", ") : "";
      meals.push({
        id: String(r.id),
        t,
        text: list || String(r.meal_name || "Refeição"),
        kind: mealKind(String(r.meal_name ?? "")) || mealKindOf(list),
        src: "log",
        foodIds: [],
        groupId: null,
      });
    }
    // Refeições montadas na biblioteca alimentar: porções do mesmo pedido formam uma refeição só.
    const groups = new Map<string, any[]>();
    for (const r of raw.foods) {
      const key = String(r.meal_group_id ?? r.request_id ?? r.id);
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }
    for (const [key, rows] of groups) {
      const t = Math.min(...rows.map((r) => Date.parse(r.recorded_at)));
      if (meals.some((m) => m.src !== "food" && Math.abs(m.t - t) < 3 * 60_000)) continue;
      const names = rows
        .map((r) => String(r.food_id ?? "").replace(/_/g, " "))
        .filter(Boolean)
        .join(", ");
      meals.push({
        id: `food-${key}`,
        t,
        text: names || "Alimentos da biblioteca",
        kind: mealKindOf(names),
        src: "food",
        foodIds: rows.map((r) => String(r.id)),
        groupId: rows[0].meal_group_id ? String(rows[0].meal_group_id) : null,
      });
    }
    meals.sort((a, b) => a.t - b.t);
    const rawFoodGrams = (id: string) => raw.foods.find((r) => String(r.id) === id)?.grams ?? 100;
    const editMeal = (m: (typeof meals)[number], label: string) => async () => {
      if (m.src === "food") {
        if (m.foodIds.length !== 1) {
          dialog.notify?.(
            "Esta refeição tem vários alimentos: ajuste cada porção na área Alimentação.",
            "info",
          );
          return;
        }
        const raw = await dialog.prompt(
          "Editar porção",
          "Informe a nova quantidade (de 1 a 2.000).",
          String(Math.round(Number(rawFoodGrams(m.foodIds[0])))),
        );
        const grams = Number(String(raw ?? "").replace(",", "."));
        if (raw === null) return;
        if (!Number.isFinite(grams) || grams < 1 || grams > 2000) {
          dialog.notify?.("Informe entre 1 e 2.000.", "danger");
          return;
        }
        void run(
          `meal-edit-${m.id}`,
          ["Salvar alteração?", `Alterar a porção de ${m.text} para ${grams}?`, "Salvar alteração"],
          () =>
            db.rpc("care_update_food_portion", {
              p_entry_id: m.foodIds[0],
              p_grams: grams,
              p_verified: true,
            }),
          "Porção alterada. Métricas recalculadas.",
        );
        return;
      }
      const text = await dialog.prompt(
        "O que foi consumido?",
        `Ajuste a descrição de ${label}.`,
        m.text,
      );
      if (text === null || text.trim().length < 3) return;
      const when = await dialog.prompt(
        "Horário da refeição",
        "Informe o horário em que comeu (HH:MM).",
        hm(m.t),
      );
      const mt = when?.match(/^\s*(\d{1,2})[:h](\d{2})\s*$/);
      if (!mt || Number(mt[1]) > 23 || Number(mt[2]) > 59) {
        if (when !== null) dialog.notify?.("Horário inválido. Use o formato HH:MM.", "danger");
        return;
      }
      const iso = new Date(at(day, `${mt[1].padStart(2, "0")}:${mt[2]}`)).toISOString();
      void run(
        `meal-edit-${m.id}`,
        [
          "Salvar alteração?",
          `${label} será atualizada para ${mt[1].padStart(2, "0")}:${mt[2]}.`,
          "Salvar alteração",
        ],
        () =>
          m.src === "act"
            ? db.rpc("care_update_intake_entry", {
                p_patient_id: patientId,
                p_entry_type: "meal",
                p_entry_id: m.id,
                p_description: text.trim(),
                p_amount_ml: null,
                p_consumed_at: iso,
              })
            : db.from("care_nutrition_meal_logs").update({ recorded_at: iso }).eq("id", m.id),
        "Refeição alterada. Métricas recalculadas.",
      );
    };
    const removeMeal = (m: (typeof meals)[number], label: string) => () =>
      void run(
        `meal-del-${m.id}`,
        [
          "Excluir registro?",
          `${label} (${hm(m.t)}) será apagada e as métricas do dia recalculadas. Não dá para desfazer.`,
          "Excluir",
        ],
        async () => {
          if (m.src === "food") {
            if (m.groupId)
              return db.rpc("care_delete_food_meal", { p_group_id: m.groupId, p_verified: true });
            for (const id of m.foodIds) {
              const r = await db.rpc("care_delete_food_portion", {
                p_entry_id: id,
                p_verified: true,
              });
              if (r.error) return r;
            }
            return { error: null };
          }
          return m.src === "act"
            ? db.rpc("care_delete_intake_entry", {
                p_patient_id: patientId,
                p_entry_type: "meal",
                p_entry_id: m.id,
              })
            : db.from("care_nutrition_meal_logs").delete().eq("id", m.id);
        },
        "Registro excluído de todas as áreas.",
      );
    const KIND_LABEL: Record<string, string> = {
      cafe_manha: "Café da manhã",
      almoco: "Almoço",
      jantar: "Jantar",
      lanche: "Lanche",
    };
    // Só entram refeições que foram realmente registradas (agenda, Alimentação ou biblioteca).
    for (const m of meals) {
      const label = KIND_LABEL[m.kind] ?? "Refeição";
      out.push({
        id: `meal-${m.id}`,
        kind: "refeicao",
        at: m.t,
        title: label,
        detail: m.text,
        status: "done",
        doneAt: m.t,
        edit: editMeal(m, label),
        editLabel: m.src === "food" ? "Alterar a porção" : "Alterar descrição e horário",
        remove: removeMeal(m, label),
      });
    }

    // Movimento
    const moves = raw.acts.filter((r) => r.category === "atividade");
    for (const m of moves)
      out.push({
        id: `act-${m.id}`,
        kind: "atividade",
        at: Date.parse(m.happened_at ?? m.recorded_at),
        title: m.details?.title || "Atividade física",
        detail: `${Number(m.details?.duration_minutes) || 0} min`,
        status: "done",
      });
    // Sono: só as noites realmente registradas (acordou hoje).
    for (const l of raw.sleep) {
      const woke = Date.parse(l.wake_at);
      if (
        !Number.isFinite(woke) ||
        new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(woke)) !== day
      )
        continue;
      const hrs = (woke - Date.parse(l.bed_at)) / 3_600_000;
      out.push({
        id: `sleep-${l.id}`,
        kind: "sono",
        at: woke,
        title: `Sono · ${Math.floor(hrs)} h ${String(Math.round((hrs % 1) * 60)).padStart(2, "0")} min`,
        detail: `dormiu às ${hm(Date.parse(l.bed_at))} · acordou às ${hm(woke)}`,
        status: "done",
        doneAt: woke,
      });
    }

    // Cuidados programados pela equipe
    for (const task of tasks) {
      const st = careReminderState(task, now);
      const ms = Date.parse(task.scheduled_at);
      out.push({
        id: `task-${task.id}`,
        kind: "cuidado",
        at: ms,
        title: task.title,
        detail: "programado pela equipe",
        task,
        status: task.completed_at
          ? "done"
          : resolved[task.id]
            ? "skipped"
            : st === "due"
              ? "now"
              : st === "unconfirmed"
                ? "late"
                : "planned",
        doneAt: task.completed_at ? Date.parse(task.completed_at) : undefined,
        action:
          !task.completed_at && !resolved[task.id] && st === "due"
            ? { label: "Confirmar", run: () => onConfirm(task) }
            : undefined,
      });
    }
    // Respostas "não fiz": o item sai das pendências e mostra o motivo
    for (const r of raw.resp) {
      const it = out.find((i) => i.id === r.item_key);
      if (!it || it.status === "done") continue;
      it.status = "skipped";
      it.detail = reasonLabel(r.reason) + (r.note ? ` · ${r.note}` : "");
      it.action = undefined;
      it.edit = undefined;
      it.remove = undefined;
      it.skippable = false;
      it.undo = () =>
        void run(
          it.id,
          ["Desfazer resposta?", `${it.title} volta para a lista de pendências.`, "Desfazer"],
          () =>
            db
              .from("care_day_item_responses")
              .delete()
              .eq("patient_id", patientId)
              .eq("day", day)
              .eq("item_key", it.id),
        );
    }
    return out.sort((a, b) => a.at - b.at);
  }, [raw, now, day, waterTarget, tasks, resolved, patientId, ownerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const c = Object.fromEntries(Object.keys(KINDS).map((k) => [k, 0])) as Record<Kind, number>;
    for (const i of items) c[i.kind]++;
    return c;
  }, [items]);
  const matching = items.filter((i) => filter === "todos" || i.kind === filter);
  const visible = matching;
  const actionable = items.filter(
    (i) =>
      i.kind !== "sono" &&
      i.status !== "skipped" &&
      (i.status === "done" || i.status === "late" || i.at <= now),
  );
  const doneCount = actionable.filter((i) => i.status === "done").length;
  const pct = actionable.length ? Math.round((doneCount / actionable.length) * 100) : 0;
  const late = items.filter((i) => i.status === "late").length;
  const nowCount = items.filter((i) => i.status === "now").length;
  // O relógio só aponta o que foi programado de verdade (remédios, suplementos, cuidados da equipe).
  const next =
    items.find(
      (i) =>
        (i.kind === "med" || i.kind === "supl" || i.kind === "cuidado") &&
        i.status !== "done" &&
        i.status !== "skipped" &&
        i.at >= now - 15 * 60_000,
    ) ?? null;
  const prevDone = [...items].reverse().find((i) => i.status === "done" && i.at <= now);
  const left = items.filter((i) => i.status === "planned").length;

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label="Meu dia">
      <header className="nv-dark nv-scan relative isolate overflow-hidden border border-indigo-400/30 p-2.5 text-white shadow-card sm:px-3">
        <div className="grid items-center gap-4 lg:grid-cols-[auto_minmax(0,1fr)_26rem]">
          <div className="flex items-center gap-3">
            <div
              className="relative size-16 shrink-0"
              role="img"
              aria-label={`${pct}% do que estava previsto até agora foi feito`}
            >
              <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#ffffff22" strokeWidth="11" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="url(#nv-day-ring)"
                  strokeWidth="11"
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray={`${pct} 100`}
                  className="nv-ring-draw"
                  style={{ transition: "stroke-dasharray .8s ease" }}
                />
                <defs>
                  <linearGradient id="nv-day-ring" x1="0" y1="0" x2="1" y2="1">
                    <stop stopColor="#f0abfc" />
                    <stop offset="1" stopColor="#facc15" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute inset-0 grid place-items-center text-center leading-none">
                <span>
                  <strong className="block text-base font-extrabold tabular-nums">{pct}%</strong>
                  <span className="text-[9px] text-white/70">em dia</span>
                </span>
              </span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">
              {actionable.length
                ? `${doneCount} de ${actionable.length} itens previstos até agora já foram feitos`
                : "Seu dia começa com o primeiro item da linha do tempo"}
            </p>
            {left > 0 && (
              <p className="text-xs text-white/70">
                {left} {left === 1 ? "item ainda pela frente" : "itens ainda pela frente"} hoje
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1.5 bg-emerald-400/20 px-2 py-0.5 text-emerald-200">
                <Check size={13} /> {doneCount} feitos
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 ${nowCount ? "bg-amber-300 text-amber-950" : "bg-amber-400/15 text-amber-200"}`}
              >
                {nowCount ? <i className="size-1.5 rounded-full bg-amber-950 nv-live" /> : null}
                {nowCount} na hora
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 ${late ? "bg-rose-500 text-white" : "bg-rose-400/15 text-rose-200"}`}
              >
                {late} atrasados
              </span>
            </div>
          </div>
          <NextUpClock
            alertKey={next ? next.kind : "dia"}
            title={next ? `Próximo · ${KINDS[next.kind].label}` : "Próximo item"}
            color="#f0abfc"
            target={next ? Math.max(next.at, now - 1) : null}
            from={prevDone?.at ?? null}
            detail={next ? `${next.title}` : undefined}
            emptyText="Tudo feito por hoje"
            actionLabel={next?.action?.label}
            onAction={next?.action?.run}
            onEdit={next?.edit}
            onPostpone={next?.postpone}
            onCancel={next?.cancel}
          />
        </div>
      </header>

      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Filtrar por tipo"
      >
        <FilterChip
          on={filter === "todos"}
          onClick={() => setFilter("todos")}
          color="#7c3aed"
          label="Tudo"
          count={items.length}
        />
        {(Object.keys(KINDS) as Kind[])
          .filter((k) => counts[k] > 0)
          .map((k) => (
            <FilterChip
              key={k}
              on={filter === k}
              onClick={() => setFilter(filter === k ? "todos" : k)}
              color={KINDS[k].color}
              label={KINDS[k].label}
              count={counts[k]}
              icon={KINDS[k].icon}
            />
          ))}
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {error}
        </p>
      )}

      {!raw ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-64 animate-pulse bg-muted/60" />
          ))}
        </div>
      ) : (
        <div className="grid min-w-0 gap-3 md:grid-cols-3">
          {PERIODS.map((p) => {
            const list = visible.filter((i) => p.test(hourOf(i.at)));
            const isNow = p.test(hourOf(now));
            const done = list.filter((i) => i.status === "done").length;
            const nowIdx = isNow ? list.findIndex((i) => i.at > now) : -1;
            return (
              <section
                key={p.id}
                className={`flex min-w-0 flex-col border border-border bg-card p-2.5 shadow-card ${isNow ? "ring-1 ring-inset" : ""}`}
                style={{
                  ["--ca" as string]: p.color,
                  ...(isNow ? { ["--tw-ring-color" as string]: `${p.color}88` } : {}),
                }}
                aria-label={p.label}
              >
                <header className="mb-1.5 flex items-center gap-2 px-1">
                  <p.icon size={15} style={{ color: p.color }} />
                  <strong className="text-sm">{p.label}</strong>
                  {isNow && (
                    <span
                      className="px-1.5 py-0.5 text-[11px] font-bold text-slate-950"
                      style={{ background: p.color }}
                    >
                      agora
                    </span>
                  )}
                  <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                    {done}/{list.length}
                  </span>
                </header>
                <div className="mb-2 h-1 overflow-hidden bg-muted">
                  <i
                    className="block h-full transition-[width] duration-700"
                    style={{
                      background: p.color,
                      width: `${list.length ? (done / list.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                {list.length === 0 ? (
                  <p className="grid flex-1 place-items-center rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                    Nada registrado neste período.
                  </p>
                ) : (
                  <ol className="relative -mx-1 grid max-h-[calc(100dvh-25rem)] min-h-[16rem] content-start gap-px overflow-y-auto overflow-x-hidden px-1 [scrollbar-gutter:stable] [scrollbar-width:thin]">
                    {list.map((i, idx) => (
                      <li key={i.id} className="contents">
                        {idx === nowIdx && <NowLine now={now} />}
                        <Row item={i} busy={busy === i.id} onView={onView} onResolve={setSheet} />
                      </li>
                    ))}
                    {isNow && nowIdx === -1 && (
                      <li className="contents">
                        <NowLine now={now} />
                      </li>
                    )}
                  </ol>
                )}
              </section>
            );
          })}
        </div>
      )}
      {sheet && (
        <ResolveSheet
          item={sheet}
          busy={busy === sheet.id}
          onClose={() => setSheet(null)}
          onSkip={(r, n) => void saveSkip(sheet, r, n)}
        />
      )}
      <p className="text-[11px] text-muted-foreground">
        Só aparece o que foi programado (remédios, suplementos e cuidados da equipe) e o que você
        registrou de verdade em cada área. Toque num item para abrir a área dele.
      </p>
    </section>
  );
}

function FilterChip({
  on,
  onClick,
  color,
  label,
  count,
  icon: Icon,
}: {
  on: boolean;
  onClick: () => void;
  color: string;
  label: string;
  count: number;
  icon?: ComponentType<{ size?: number }>;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 border px-3 text-xs font-semibold transition active:scale-95 ${on ? "border-transparent text-white shadow-sm" : "border-border bg-card text-foreground hover:bg-muted"}`}
      style={on ? { background: color } : undefined}
    >
      {Icon ? (
        <span style={on ? undefined : { color }}>
          <Icon size={13} />
        </span>
      ) : (
        <i className="size-2" style={{ background: on ? "#fff" : color }} />
      )}
      {label}
      <span
        className={`rounded-full px-1.5 text-[11px] tabular-nums ${on ? "bg-white/25" : "bg-muted text-muted-foreground"}`}
      >
        {count}
      </span>
    </button>
  );
}

function NowLine({ now }: { now: number }) {
  return (
    <div
      className="relative flex items-center gap-2 overflow-hidden py-1 pl-[1.05rem]"
      aria-label={`Agora, ${hm(now)}`}
    >
      <span className="relative z-10 grid size-3 place-items-center">
        <i className="absolute size-3 rounded-full bg-fuchsia-500/40 nv-evo-ping" />
        <i className="size-2 rounded-full bg-fuchsia-500" />
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-fuchsia-500 to-transparent" />
      <span className="text-[11px] font-bold tabular-nums text-fuchsia-600 dark:text-fuchsia-300">
        agora · {hm(now)}
      </span>
    </div>
  );
}

function RowMenu({ children, label }: { children: ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const place = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const w = menu.current?.offsetWidth ?? 200;
    const h = menu.current?.offsetHeight ?? 120;
    const left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8));
    const below = r.bottom + 4;
    const top = below + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 4) : below;
    setPos({ top, left });
  };
  useLayoutEffect(() => {
    if (open) place();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!btn.current?.contains(t) && !menu.current?.contains(t)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);
  return (
    <span className="relative shrink-0">
      <button
        ref={btn}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title="Mais ações"
        onClick={() => setOpen((o) => !o)}
        className={`grid size-7 place-items-center border text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95 ${open ? "border-foreground/30 bg-muted text-foreground" : "border-transparent"}`}
      >
        <MoreHorizontal size={15} />
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            onClick={() => setOpen(false)}
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
            className="nv-fade-in fixed z-[10002] grid w-max min-w-[12rem] max-w-[calc(100vw-1rem)] whitespace-nowrap border border-border bg-card p-1 text-xs shadow-pop"
          >
            {children}
          </div>,
          document.body,
        )}
    </span>
  );
}
const menuBtn =
  "flex h-8 items-center gap-2 px-2.5 text-left font-semibold text-foreground transition hover:bg-muted disabled:opacity-50";

function Row({
  item,
  busy,
  onView,
  onResolve,
}: {
  item: Item;
  busy: boolean;
  onView: (t: PatientCare) => void;
  onResolve: (i: Item) => void;
}) {
  const canSkip = item.skippable && (item.status === "late" || item.status === "now");
  const k = KINDS[item.kind];
  const Icon = k.icon;
  const done = item.status === "done";
  const skipped = item.status === "skipped";
  const open = () => (item.task ? onView(item.task) : go(k.area));
  const [showInfo, setShowInfo] = useState(false);
  const statusText =
    item.status === "done"
      ? "Registrado"
      : item.status === "skipped"
        ? "Marcado como não feito"
        : item.status === "late"
          ? "Atrasado"
          : item.status === "now"
            ? "Na hora"
            : "Programado";
  const hot = item.status === "now" || item.status === "late";
  const hasMenu = Boolean(canSkip || item.edit || item.remove || item.undo);
  const chip =
    item.status === "late"
      ? { t: "Atrasado", c: "bg-rose-500/15 text-rose-600 dark:text-rose-300" }
      : item.status === "now"
        ? { t: "Na hora", c: "bg-amber-400/20 text-amber-700 dark:text-amber-300" }
        : skipped
          ? { t: "Não fiz", c: "bg-slate-500/15 text-slate-600 dark:text-slate-300" }
          : null;
  const primary = item.action
    ? item.status === "late" && item.skippable
      ? { label: "Resolver", run: () => onResolve(item) }
      : { label: item.action.label, run: item.action.run }
    : null;
  return (
    <div
      className={`group relative grid min-w-0 grid-cols-[2.6rem_1.9rem_minmax(0,1fr)_auto] items-center gap-x-2 border-l-2 px-1.5 py-1.5 transition-colors ${item.status === "now" ? "border-l-amber-400 bg-amber-400/10" : item.status === "late" ? "border-l-rose-500 bg-rose-500/[.06]" : done ? "border-l-emerald-500/60" : "border-l-transparent hover:bg-muted/50"}`}
    >
      <span
        className="font-mono text-xs font-bold tabular-nums"
        style={{ color: done ? undefined : k.color }}
      >
        <span className={done ? "text-muted-foreground" : ""}>{hm(item.at)}</span>
      </span>
      <span
        className={`grid size-[1.9rem] place-items-center ${done ? "bg-emerald-700 text-white" : k.soft}`}
      >
        {done ? <Check size={15} className="nv-check" /> : <Icon size={15} />}
      </span>
      <button
        type="button"
        onClick={() => setShowInfo((v) => !v)}
        aria-expanded={showInfo}
        className="min-w-0 text-left"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <strong
            className={`truncate text-[13px] leading-tight ${done ? "text-muted-foreground line-through decoration-muted-foreground/40" : ""}`}
          >
            {item.title}
          </strong>
        </span>
        <span className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
          {chip && (
            <span className={`mr-1.5 inline-block px-1.5 py-px text-[10px] font-bold ${chip.c}`}>
              {chip.t}
            </span>
          )}
          {done && item.doneAt && Math.abs(item.doneAt - item.at) > 60_000
            ? `feito às ${hm(item.doneAt)} · `
            : ""}
          {item.detail}
        </span>
      </button>
      <span className="flex items-center gap-1">
        <RecordInfo
          title={item.title}
          at={new Date(item.doneAt ?? item.at).toISOString()}
          category={k.label}
          color={k.color}
          description={item.detail || undefined}
          className="!size-6 !rounded-none"
          rows={[
            { label: "Situação", value: statusText },
            ...(done && item.doneAt && Math.abs(item.doneAt - item.at) > 60_000
              ? [{ label: "Previsto para", value: hm(item.at) }]
              : []),
            ...(item.task ? [{ label: "Origem", value: "Programado pela equipe" }] : []),
          ]}
        />
        {(done || skipped) && (
          <AnimatedLock size={14} label={done ? "Registrado" : "Respondido: não fiz"} />
        )}
        {primary && (
          <button
            type="button"
            disabled={busy}
            onClick={primary.run}
            className={`h-7 shrink-0 px-2.5 text-[11px] font-bold transition active:scale-95 disabled:opacity-50 ${hot ? "text-white shadow-sm" : "border border-border bg-card text-foreground hover:bg-muted"}`}
            style={hot ? { background: k.color } : undefined}
          >
            {busy ? "…" : primary.label}
          </button>
        )}
        {hasMenu && (
          <RowMenu label={`Mais ações: ${item.title}`}>
            {item.edit && (
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={item.edit}
                className={menuBtn}
              >
                <Pencil size={13} /> {item.editLabel ?? "Alterar a quantidade"}
              </button>
            )}
            {canSkip && (
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={() => onResolve(item)}
                className={menuBtn}
              >
                <CircleSlash size={13} /> Não fiz
              </button>
            )}
            {item.undo && (
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={item.undo}
                className={menuBtn}
              >
                <Undo2 size={13} /> Desfazer
              </button>
            )}
            {item.remove && (
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={item.remove}
                className={`${menuBtn} !text-rose-600 dark:!text-rose-300`}
              >
                <Trash2 size={13} /> Excluir registro
              </button>
            )}
          </RowMenu>
        )}
        {!primary && !hasMenu && !done && !skipped && (
          <ChevronRight size={14} className="text-muted-foreground/50" />
        )}
      </span>
      {showInfo && (
        <div className="nv-fade-in col-span-full mt-1.5 grid gap-1.5 border border-border bg-muted/40 p-2.5 text-[12px]">
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
            <dt className="text-muted-foreground">Situação</dt>
            <dd className="font-semibold">{statusText}</dd>
            <dt className="text-muted-foreground">Área</dt>
            <dd className="font-semibold">{k.label}</dd>
            <dt className="text-muted-foreground">
              {item.status === "done" ? "Registro" : "Horário"}
            </dt>
            <dd className="font-semibold tabular-nums">
              {item.status === "done" && item.doneAt
                ? `${hm(item.doneAt)}${Math.abs(item.doneAt - item.at) > 60_000 ? ` (previsto ${hm(item.at)})` : ""}`
                : hm(item.at)}
            </dd>
            {item.detail && (
              <>
                <dt className="text-muted-foreground">Detalhes</dt>
                <dd className="break-words">{item.detail}</dd>
              </>
            )}
            {item.task && (
              <>
                <dt className="text-muted-foreground">Origem</dt>
                <dd>Programado pela equipe</dd>
              </>
            )}
          </dl>
          <div className="flex justify-end gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setShowInfo(false)}
              className="h-7 border border-border bg-card px-2.5 text-[11px] font-semibold hover:bg-muted"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={open}
              className="inline-flex h-7 items-center gap-1 bg-primary px-2.5 text-[11px] font-bold text-primary-foreground"
            >
              Abrir {k.label.toLowerCase()} <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResolveSheet({
  item,
  busy,
  onClose,
  onSkip,
}: {
  item: Item;
  busy: boolean;
  onClose: () => void;
  onSkip: (reason: string, note: string) => void;
}) {
  const k = KINDS[item.kind];
  const Icon = k.icon;
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [step, setStep] = useState<"choose" | "confirm">("choose");
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[11000] grid place-items-end bg-slate-950/60 p-3 backdrop-blur-sm sm:place-items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`O que aconteceu com ${item.title}?`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="nv-pop w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        <header
          className="flex items-center gap-3 p-4 text-white"
          style={{
            background: `linear-gradient(135deg, ${k.color}, color-mix(in oklab, ${k.color} 55%, #0f172a))`,
          }}
        >
          <span className="grid size-10 place-items-center rounded-xl bg-white/20">
            <Icon size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-white/80">
              {k.label} · {hm(item.at)}
              {item.status === "late" ? " · atrasado" : ""}
            </p>
            <h3 className="truncate text-base font-extrabold">{item.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-8 place-items-center rounded-lg bg-white/15 hover:bg-white/25"
          >
            <X size={16} />
          </button>
        </header>
        {step === "choose" ? (
          <div className="grid gap-3 p-4">
            {item.action && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onClose();
                  item.action!.run();
                }}
                className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/[.07] p-3 text-left transition hover:bg-emerald-500/[.12] active:scale-[.99]"
              >
                <span className="grid size-9 place-items-center rounded-xl bg-emerald-700 text-white">
                  <Check size={17} />
                </span>
                <span className="min-w-0">
                  <strong className="block text-sm">
                    {item.kind === "med" || item.kind === "supl" ? "Tomei" : "Fiz"} — registrar
                    agora
                  </strong>
                  <span className="text-xs text-muted-foreground">
                    Fica registrado com a hora real; você confirma na próxima tela.
                  </span>
                </span>
              </button>
            )}
            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                Não fiz — o que aconteceu?
              </p>
              <div className="flex flex-wrap gap-1.5">
                {REASONS.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={reason === key}
                    onClick={() => setReason(key)}
                    className={`h-8 rounded-full border px-3 text-xs font-semibold transition active:scale-95 ${reason === key ? "border-transparent bg-rose-600 text-white shadow-sm" : "border-border bg-card hover:border-rose-400/50 hover:bg-rose-500/5"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="mt-2 block text-xs font-semibold text-muted-foreground">
                Observação (opcional)
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 280))}
                  maxLength={280}
                  placeholder="Ex.: estava sem fome, remédio acabou…"
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-xl border border-border text-sm font-semibold hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!reason}
                onClick={() => setStep("confirm")}
                className="h-10 rounded-xl bg-rose-600 text-sm font-bold text-white shadow-sm transition hover:bg-rose-500 active:scale-95 disabled:opacity-40"
              >
                Continuar
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 p-4">
            <p className="text-sm">
              Confirmar que <strong>{item.title}</strong> das {hm(item.at)}{" "}
              <strong>não foi feito</strong>?
            </p>
            <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
              Motivo: <strong className="text-foreground">{reasonLabel(reason!)}</strong>
              {note.trim() ? ` · ${note.trim()}` : ""}. O item sai das pendências de hoje e fica no
              seu histórico. Dá para desfazer depois.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="h-10 rounded-xl border border-border text-sm font-semibold hover:bg-muted"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onSkip(reason!, note)}
                className="h-10 rounded-xl bg-rose-600 text-sm font-bold text-white shadow-sm transition hover:bg-rose-500 active:scale-95 disabled:opacity-50"
              >
                {busy ? "Salvando…" : "Confirmar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
