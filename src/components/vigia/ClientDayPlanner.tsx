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
import { estimateNextHydration } from "@/lib/hydration-goal";
import { mealKindOf, waterCutoff } from "@/lib/day-plan";
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
  /** Sugestão do sistema (horário típico, copo, sono): nunca fica "atrasada" nem pesa no percentual. */
  suggested?: boolean;
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
const MEALS: [string, string][] = [
  ["07:00", "Café da manhã"],
  ["10:00", "Lanche da manhã"],
  ["12:30", "Almoço"],
  ["15:30", "Lanche da tarde"],
  ["19:00", "Jantar"],
];
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
  const [allWater, setAllWater] = useState(false);
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
            .select("id,category,happened_at,recorded_at,details,request_id")
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
            .from("care_sleep_logs")
            .select("bed_at")
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
        sleep: [],
        resp: [],
      });
      return () => {
        active = false;
      };
    }
    void Promise.all(qs).then(([water, bev, meds, medIn, sup, supIn, acts, mlogs, sleep, resp]) => {
      if (active) setRaw({ water, bev, meds, medIn, sup, supIn, acts, mlogs, sleep, resp });
    });
    return () => {
      active = false;
    };
  }, [patientId, ownerId, day, reload, revision]);

  async function saveSkipConfirmed(item: Item) {
    if (
      !(await dialog.confirm(
        "Cancelar refeição de hoje?",
        `${item.title} sai das pendências e fica registrada como "sem apetite". Você pode desfazer depois.`,
        false,
        "Cancelar refeição",
      ))
    )
      return;
    await saveSkip(item, "dispensado", "Sem apetite");
    dialog.notify?.(`${item.title} cancelada para hoje.`, "info");
  }
  const postKey = `nv-postpone-${patientId}-${day}`;
  const [post, setPost] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem(postKey) ?? "{}");
    } catch {
      return {};
    }
  });
  function postponeMeal(item: Item, minutes: number) {
    void (async () => {
      const to = Math.max(Date.now(), item.at) + minutes * 60_000;
      const label = minutes >= 60 ? `${minutes / 60} h` : `${minutes} min`;
      if (
        !(await dialog.confirm(
          "Adiar refeição?",
          `O horário de ${item.title} passa para ${hm(to)} (daqui a ${label}). O lembrete volta nessa hora.`,
          false,
          "Adiar",
        ))
      )
        return;
      const next = { ...post, [item.id]: to };
      setPost(next);
      try {
        localStorage.setItem(postKey, JSON.stringify(next));
      } catch {
        /* sem armazenamento */
      }
      dialog.notify?.(`${item.title} adiada para ${hm(to)}.`, "info");
    })();
  }
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
    const target = waterTarget ?? 0;
    if (target > 0) {
      let remaining = Math.max(0, target - drinks.reduce((s, d) => s + d.ml, 0));
      let last = drinks.at(-1) ?? null;
      let cursor = now;
      const cutoff = waterCutoff(day);
      const recent = drinks.map((d) => ({ at: d.t, ml: d.ml }));
      for (let i = 0; i < 10 && remaining >= 10; i++) {
        const next = estimateNextHydration({
          remainingMl: remaining,
          lastIntakeAt: last?.t ?? null,
          lastAmountMl: last?.ml ?? 0,
          now: cursor,
          cutoff,
          recent,
        });
        if (!next) break;
        const id = `agua-plan-${i}`;
        const ml = next.suggestedMl;
        out.push({
          id,
          kind: "agua",
          at: next.at,
          title: `Copo de água · ~${ml} ml`,
          detail: i === 0 ? "próximo copo sugerido" : "sugestão para bater a meta",
          status: i === 0 && next.at <= now + 15 * 60_000 ? "now" : "planned",
          edit:
            i === 0
              ? () =>
                  void askAmount(ml).then((value) => {
                    if (value === null) return;
                    void run(
                      id,
                      [
                        "Confirmar registro?",
                        `Registrar ${value} ml de água agora?`,
                        "Confirmar registro",
                      ],
                      () =>
                        db.rpc("care_log_unscheduled_intake", {
                          p_patient_id: patientId,
                          p_kind: "agua",
                          p_description: "Água",
                          p_amount_ml: value,
                          p_request_id: crypto.randomUUID(),
                          p_consumed_at: null,
                        }),
                      `${value} ml de água registrados.`,
                    );
                  })
              : undefined,
          action:
            i === 0
              ? {
                  label: `Bebi ${ml} ml`,
                  run: () =>
                    void run(
                      id,
                      [
                        "Confirmar registro?",
                        `Registrar ${ml} ml de água agora?`,
                        "Confirmar registro",
                      ],
                      () =>
                        db.rpc("care_log_unscheduled_intake", {
                          p_patient_id: patientId,
                          p_kind: "agua",
                          p_description: "Água",
                          p_amount_ml: ml,
                          p_request_id: crypto.randomUUID(),
                          p_consumed_at: null,
                        }),
                    ),
                }
              : undefined,
        });
        remaining -= ml;
        recent.push({ at: next.at, ml });
        last = { t: next.at, ml } as any;
        cursor = next.at + 1;
        if (next.at >= cutoff) break;
      }
    }

    // Refeições: cada horário típico é "feito" se houver registro até 90 min dele
    const seen = new Set<string>();
    const meals = raw.acts
      .filter(
        (r) =>
          r.category === "refeicao" &&
          (!r.request_id || (!seen.has(r.request_id) && seen.add(r.request_id))),
      )
      .map((r) => ({
        id: r.id as string,
        t: Date.parse(r.happened_at ?? r.recorded_at),
        text: String(r.details?.description || r.details?.title || "Refeição"),
        kind:
          mealKindOf(r.details?.kind) ||
          mealKindOf(r.details?.title, r.details?.description, r.details?.meal_name),
        src: "act" as "act" | "log",
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
      });
    }
    meals.sort((a, b) => a.t - b.t);
    const editMeal = (m: (typeof meals)[number], label: string) => async () => {
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
        () =>
          m.src === "act"
            ? db.rpc("care_delete_intake_entry", {
                p_patient_id: patientId,
                p_entry_type: "meal",
                p_entry_id: m.id,
              })
            : db.from("care_nutrition_meal_logs").delete().eq("id", m.id),
        "Registro excluído. Métricas recalculadas.",
      );
    const used = new Set<string>();
    // O tipo escolhido ao registrar (café da manhã, almoço, jantar, lanche) vale mais que o horário:
    // quem registra o café às 9h40 ou o almoço atrasado também resolve o item certo do dia.
    const SLOT_KIND: Record<string, string[]> = {
      "07:00": ["cafe_manha"],
      "10:00": ["lanche"],
      "12:30": ["almoco"],
      "15:30": ["lanche"],
      "19:00": ["jantar"],
    };
    const byKind = new Map<string, string>();
    for (const [t] of MEALS) {
      const kinds = SLOT_KIND[t] ?? [];
      const nearest = meals
        .filter((m) => !used.has(m.id) && kinds.includes(m.kind))
        .sort((x, y) => Math.abs(x.t - at(day, t)) - Math.abs(y.t - at(day, t)))[0];
      const taken = nearest && [...byKind.values()].includes(nearest.id);
      if (nearest && !taken) byKind.set(t, nearest.id);
    }
    for (const [t, label] of MEALS) {
      const ms = at(day, t);
      const kindHit = meals.find((m) => m.id === byKind.get(t));
      const hit =
        kindHit ??
        meals
          .filter(
            (m) =>
              !used.has(m.id) &&
              ![...byKind.values()].includes(m.id) &&
              // refeição com tipo definido só vale no horário do seu tipo
              (!m.kind ||
                !Object.values(SLOT_KIND).flat().includes(m.kind) ||
                m.kind === "lanche") &&
              Math.abs(m.t - ms) <= 150 * 60_000,
          )
          .sort((x, y) => Math.abs(x.t - ms) - Math.abs(y.t - ms))[0];
      if (hit) used.add(hit.id);
      const moved = !hit && post[`meal-${t}`] ? post[`meal-${t}`] : null;
      const when = moved ?? ms;
      const mealItem: Item = {
        id: `meal-${t}`,
        kind: "refeicao",
        at: when,
        title: label,
        detail: hit ? hit.text : moved ? `adiada para ${hm(moved)}` : "registre o que comer",
        status: stateOf(when, Boolean(hit), 90),
        doneAt: hit?.t,
        skippable: !hit,
        action: hit ? undefined : { label: "Registrar", run: () => go("alimentacao") },
      };
      if (hit) {
        mealItem.edit = editMeal(hit, label);
        mealItem.editLabel = "Alterar descrição e horário";
        mealItem.remove = removeMeal(hit, label);
      }
      if (!hit) {
        mealItem.editLabel = "Alterar o horário";
        mealItem.edit = () =>
          void (async () => {
            const v = await dialog.prompt(
              "Horário previsto",
              `Novo horário para ${label} (HH:MM).`,
              hm(mealItem.at),
            );
            const mt = v?.match(/^\s*(\d{1,2})[:h](\d{2})\s*$/);
            if (!mt || Number(mt[1]) > 23 || Number(mt[2]) > 59) {
              if (v !== null) dialog.notify?.("Horário inválido. Use o formato HH:MM.", "danger");
              return;
            }
            const to = at(day, `${mt[1].padStart(2, "0")}:${mt[2]}`);
            const next = { ...post, [mealItem.id]: to };
            setPost(next);
            try {
              localStorage.setItem(postKey, JSON.stringify(next));
            } catch {
              /* sem armazenamento */
            }
            dialog.notify?.(`${label} reprogramada para ${hm(to)}.`, "info");
          })();
        mealItem.postpone = (min) => postponeMeal(mealItem, min);
        mealItem.cancel = () => void saveSkipConfirmed(mealItem);
      }
      out.push(mealItem);
    }
    for (const m of meals.filter((m) => !used.has(m.id)))
      out.push({
        id: `meal-x-${m.id}`,
        kind: "refeicao",
        at: m.t,
        title: "Refeição extra",
        detail: m.text,
        status: "done",
        doneAt: m.t,
        edit: editMeal(m, "Refeição extra"),
        editLabel: "Alterar descrição e horário",
        remove: removeMeal(m, "Refeição extra"),
      });

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
    if (!moves.length)
      out.push({
        id: "act-plan",
        kind: "atividade",
        at: at(day, "17:30"),
        title: "30 min de movimento",
        detail: "caminhada, treino ou alongamento",
        status: stateOf(at(day, "17:30"), false, 180),
        skippable: true,
        action: { label: "Registrar", run: () => go("atividade") },
      });

    // Sono: média dos últimos horários de deitar (ou 22h30)
    const mins = raw.sleep.map((l) => {
      const d = new Date(Date.parse(l.bed_at) - 5 * 3_600_000);
      let m = d.getUTCHours() * 60 + d.getUTCMinutes();
      if (m < 720) m += 1440;
      return m;
    });
    const avg = mins.length
      ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length)
      : 22 * 60 + 30;
    const bed = Math.min(Date.parse(day + "T00:00:00-05:00") + avg * 60_000, at(day, "23:45"));
    out.push({
      id: "sleep-wind",
      kind: "sono",
      at: bed - 30 * 60_000,
      title: "Desacelerar",
      detail: "telas de lado, luz baixa",
      status: bed - 30 * 60_000 <= now ? (bed <= now ? "done" : "now") : "planned",
    });
    out.push({
      id: "sleep-bed",
      kind: "sono",
      at: bed,
      title: "Hora de dormir",
      detail: mins.length ? "sua média das últimas noites" : "sugestão para 7–9 h de sono",
      status: bed <= now + 15 * 60_000 ? "now" : "planned",
      action: { label: "Sono", run: () => go("sono") },
    });

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
    // Só o que foi programado (remédios, suplementos, cuidados da equipe) vira obrigação.
    // Refeições em horário típico, copos de água, movimento e sono são sugestões do sistema.
    for (const i of out)
      if (
        i.status !== "done" &&
        (i.id.startsWith("meal-") ||
          i.id.startsWith("agua-plan-") ||
          i.id === "act-plan" ||
          i.id.startsWith("sleep-"))
      ) {
        i.suggested = true;
        if (i.status === "late") i.status = "planned";
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
  }, [raw, now, day, waterTarget, tasks, resolved, patientId, ownerId, post]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const c = Object.fromEntries(Object.keys(KINDS).map((k) => [k, 0])) as Record<Kind, number>;
    for (const i of items) c[i.kind]++;
    return c;
  }, [items]);
  const matching = items.filter((i) => filter === "todos" || i.kind === filter);
  // Copos sugeridos: mostra só os 2 próximos e junta o resto numa linha expansível.
  const isPlan = (i: Item) => i.id.startsWith("agua-plan-");
  const planned = matching.filter(isPlan);
  const hiddenPlan = allWater ? [] : planned.slice(2);
  const hiddenIds = new Set(hiddenPlan.map((i) => i.id));
  const visible = matching.filter((i) => !hiddenIds.has(i.id));
  const lastPlanAt = planned.at(-1)?.at ?? 0;
  const actionable = items.filter(
    (i) =>
      i.kind !== "sono" &&
      !(i.suggested && i.status !== "done") &&
      i.status !== "skipped" &&
      (i.status === "done" || i.status === "late" || i.at <= now),
  );
  const doneCount = actionable.filter((i) => i.status === "done").length;
  const pct = actionable.length ? Math.round((doneCount / actionable.length) * 100) : 0;
  const late = items.filter((i) => i.status === "late").length;
  const nowCount = items.filter((i) => i.status === "now").length;
  const next =
    items.find((i) => i.status !== "done" && i.status !== "skipped" && i.at >= now - 15 * 60_000) ??
    null;
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
                {list.length === 0 &&
                !(hiddenPlan.length > 0 && p.test(hourOf(hiddenPlan[0].at))) ? (
                  <p className="grid flex-1 place-items-center rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                    Nada planejado neste período.
                  </p>
                ) : (
                  <ol className="relative -mx-1 grid max-h-[calc(100dvh-25rem)] min-h-[16rem] gap-px overflow-y-auto px-1 [scrollbar-width:thin]">
                    {list.map((i, idx) => (
                      <li key={i.id} className="contents">
                        {idx === nowIdx && <NowLine now={now} />}
                        <Row item={i} busy={busy === i.id} onView={onView} onResolve={setSheet} />
                      </li>
                    ))}
                    {hiddenPlan.length > 0 && p.test(hourOf(hiddenPlan[0].at)) && (
                      <li className="contents">
                        <button
                          type="button"
                          onClick={() => setAllWater(true)}
                          className="mt-1 flex h-8 items-center gap-2 border border-dashed border-sky-500/40 bg-sky-500/5 px-2.5 text-left text-[11px] font-semibold text-sky-700 transition hover:bg-sky-500/10 dark:text-sky-300"
                        >
                          <Droplets size={13} />+ {hiddenPlan.length}{" "}
                          {hiddenPlan.length === 1 ? "copo" : "copos"} até as {hm(lastPlanAt)}
                          <span className="ml-auto font-normal opacity-70">ver todos</span>
                        </button>
                      </li>
                    )}
                    {allWater && p.test(hourOf(planned[2]?.at ?? 0)) && planned.length > 2 && (
                      <li className="contents">
                        <button
                          type="button"
                          onClick={() => setAllWater(false)}
                          className="mt-1 flex h-7 items-center justify-center text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                        >
                          Recolher copos sugeridos
                        </button>
                      </li>
                    )}
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
        A linha do tempo é montada com o que você cadastrou: remédios e suplementos com horário, sua
        meta de água, as refeições do dia, movimento e sono. Toque num item para abrir a área dele.
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
      className="relative flex items-center gap-2 py-0.5 pl-[1.05rem]"
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
  const hot = item.status === "now" || item.status === "late";
  const hasMenu = Boolean(canSkip || item.edit || item.remove || item.undo);
  const chip =
    item.status === "late"
      ? { t: "Atrasado", c: "bg-rose-500/15 text-rose-600 dark:text-rose-300" }
      : item.status === "now"
        ? { t: "Na hora", c: "bg-amber-400/20 text-amber-700 dark:text-amber-300" }
        : skipped
          ? { t: "Não fiz", c: "bg-slate-500/15 text-slate-600 dark:text-slate-300" }
          : item.suggested && !done
            ? { t: "Sugestão", c: "bg-slate-500/10 text-slate-500 dark:text-slate-400" }
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
        className={`grid size-[1.9rem] place-items-center ${done ? "bg-emerald-500 text-white" : k.soft}`}
      >
        {done ? <Check size={15} className="nv-check" /> : <Icon size={15} />}
      </span>
      <button type="button" onClick={open} title={`Abrir ${k.label}`} className="min-w-0 text-left">
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
                <span className="grid size-9 place-items-center rounded-xl bg-emerald-500 text-white">
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
