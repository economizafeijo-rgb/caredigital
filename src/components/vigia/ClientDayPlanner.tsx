import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Activity, Check, ChevronRight, CircleSlash, Droplets, HeartPulse, Moon, Pill, Sparkles, Sun, Sunrise, Sunset, Undo2, UtensilsCrossed, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import { estimateNextHydration } from "@/lib/hydration-goal";
import { careReminderState, type ReminderTask } from "@/lib/care-reminders";
import { clientSectionHashes, type ClientSection } from "@/lib/client-pages";
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
  undo?: () => void;
  task?: PatientCare;
  /** Pode ser respondido como "não fiz" (com motivo). */
  skippable?: boolean;
};
const REASONS: [string, string][] = [["nao_consegui", "Não consegui"], ["esqueci", "Esqueci"], ["sem_produto", "Acabou / sem o produto"], ["mal_estar", "Mal-estar"], ["orientacao", "Orientação profissional"], ["dispensado", "Dispensar hoje"], ["outro", "Outro motivo"]];
const reasonLabel = (r: string) => REASONS.find(([k]) => k === r)?.[1] ?? "Não fiz";

const tz = "America/Rio_Branco";
const dayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
const at = (day: string, hhmm: string) => Date.parse(`${day}T${hhmm}:00-05:00`);
const hm = (ms: number) => new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(ms));
const hourOf = (ms: number) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(new Date(ms)));

const KINDS: Record<Kind, { label: string; color: string; soft: string; icon: ComponentType<{ size?: number; className?: string }>; area: ClientSection }> = {
  med: { label: "Remédios", color: "#e11d48", soft: "bg-rose-500/12 text-rose-600 dark:text-rose-300", icon: Pill, area: "medicacao" },
  supl: { label: "Suplementos", color: "#7c3aed", soft: "bg-violet-500/12 text-violet-600 dark:text-violet-300", icon: Sparkles, area: "suplementos" },
  agua: { label: "Água", color: "#0284c7", soft: "bg-sky-500/12 text-sky-600 dark:text-sky-300", icon: Droplets, area: "hidratacao" },
  refeicao: { label: "Refeições", color: "#059669", soft: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300", icon: UtensilsCrossed, area: "alimentacao" },
  atividade: { label: "Movimento", color: "#ea580c", soft: "bg-orange-500/12 text-orange-600 dark:text-orange-300", icon: Activity, area: "atividade" },
  sono: { label: "Sono", color: "#4f46e5", soft: "bg-indigo-500/12 text-indigo-600 dark:text-indigo-300", icon: Moon, area: "sono" },
  cuidado: { label: "Equipe", color: "#0f766e", soft: "bg-teal-500/12 text-teal-600 dark:text-teal-300", icon: HeartPulse, area: "agenda" },
};
const MEALS: [string, string][] = [["07:00", "Café da manhã"], ["10:00", "Lanche da manhã"], ["12:30", "Almoço"], ["15:30", "Lanche da tarde"], ["19:00", "Jantar"]];
const PERIODS = [
  { id: "manha", label: "Manhã", icon: Sunrise, test: (h: number) => h < 12 },
  { id: "tarde", label: "Tarde", icon: Sun, test: (h: number) => h >= 12 && h < 18 },
  { id: "noite", label: "Noite", icon: Sunset, test: (h: number) => h >= 18 },
] as const;
const go = (area: ClientSection) => { window.location.hash = clientSectionHashes[area]; };

type Raw = { water: any[]; bev: any[]; meds: any[]; medIn: any[]; sup: any[]; supIn: any[]; acts: any[]; sleep: any[]; resp: any[] };

export function ClientDayPlanner({ patientId, ownerId, waterTarget, tasks, resolved = {}, now, onView, onConfirm, revision = 0, onRecorded }: {
  patientId: string; ownerId: string; waterTarget: number | null; tasks: PatientCare[]; resolved?: Record<string, string>; now: number;
  onView: (task: PatientCare) => void; onConfirm: (task: PatientCare) => void; revision?: number; onRecorded?: () => void;
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
    setBusy(item.id); setError("");
    const { error: err } = await (supabase as any).from("care_day_item_responses").insert({
      patient_id: patientId, owner_id: ownerId, day, item_key: item.id, kind: item.kind, reason, note: note.trim() || null,
    });
    setBusy(null);
    if (err) { setError(err.message || "Não foi possível salvar a resposta."); return; }
    setSheet(null); refresh();
  }

  useEffect(() => {
    let active = true;
    const db = supabase as any;
    const from = new Date(day + "T00:00:00-05:00").toISOString();
    const safe = (q: any) => Promise.resolve(q).then((r: any) => r?.data ?? [], () => []);
    let qs: Promise<any[]>[];
    try {
      qs = [
        safe(db.from("care_hydration").select("id,amount_ml,recorded_at").eq("patient_id", patientId).gte("recorded_at", from).order("recorded_at")),
        safe(db.from("care_client_beverages").select("id,name,amount_ml,consumed_at").eq("patient_id", patientId).gte("consumed_at", from)),
        safe(db.from("care_client_medications").select("id,name,dose,times,active").eq("patient_id", patientId).eq("owner_id", ownerId)),
        safe(db.from("care_client_medication_intakes").select("medication_id,slot,taken_at").eq("patient_id", patientId).eq("taken_on", day)),
        safe(db.from("care_supplement_plans").select("id,name,dose,unit,times,active").eq("patient_id", patientId).eq("owner_id", ownerId)),
        safe(db.from("care_supplement_intakes").select("plan_id,slot,taken_at").eq("patient_id", patientId).eq("taken_on", day)),
        safe(db.from("care_activity_log").select("id,category,happened_at,recorded_at,details,request_id").eq("patient_id", patientId).in("category", ["refeicao", "atividade"]).in("event_type", ["confirmed", "logged"]).gte("recorded_at", from)),
        safe(db.from("care_sleep_logs").select("bed_at").eq("patient_id", patientId).order("sleep_date", { ascending: false }).limit(7)),
        safe(db.from("care_day_item_responses").select("item_key,reason,note,created_at").eq("patient_id", patientId).eq("day", day)),
      ];
    } catch { setRaw({ water: [], bev: [], meds: [], medIn: [], sup: [], supIn: [], acts: [], sleep: [], resp: [] }); return () => { active = false; }; }
    void Promise.all(qs).then(([water, bev, meds, medIn, sup, supIn, acts, sleep, resp]) => { if (active) setRaw({ water, bev, meds, medIn, sup, supIn, acts, sleep, resp }); });
    return () => { active = false; };
  }, [patientId, ownerId, day, reload, revision]);

  const refresh = () => { setReload((n) => n + 1); onRecorded?.(); };
  async function run(id: string, ask: [string, string, string], fn: () => Promise<{ error?: { message?: string } | null }>) {
    if (busy) return;
    if (!(await dialog.confirm(ask[0], ask[1], false, ask[2]))) return;
    setBusy(id); setError("");
    const res = await fn().catch((e) => ({ error: { message: String(e?.message ?? e) } }));
    setBusy(null);
    if (res?.error) { setError(res.error.message || "Não foi possível registrar. Tente novamente."); return; }
    refresh();
  }

  const items = useMemo<Item[]>(() => {
    if (!raw) return [];
    const db = supabase as any;
    const out: Item[] = [];
    const stateOf = (ms: number, done: boolean, window = 60): Status => done ? "done" : ms < now - window * 60_000 ? "late" : ms <= now + 15 * 60_000 ? "now" : "planned";

    // Remédios e suplementos: uma linha por dose
    const dose = (kind: "med" | "supl", plans: any[], taken: any[], idKey: "medication_id" | "plan_id") => {
      for (const p of plans.filter((x) => x.active !== false)) for (const t of (p.times ?? []) as string[]) {
        const ms = at(day, t);
        const hit = taken.find((x) => x[idKey] === p.id && x.slot === t);
        const label = kind === "med" ? `${p.name}` : `${p.name}`;
        const detail = kind === "med" ? p.dose || "dose" : `${p.dose ?? ""} ${p.unit ?? ""}`.trim() || "dose";
        const table = kind === "med" ? "care_client_medication_intakes" : "care_supplement_intakes";
        const id = `${kind}-${p.id}-${t}`;
        out.push({
          id, kind, at: ms, title: label, detail, status: stateOf(ms, Boolean(hit)), skippable: !hit, doneAt: hit?.taken_at ? Date.parse(hit.taken_at) : undefined,
          action: hit ? undefined : { label: "Tomei", run: () => void run(id, ["Confirmar dose?", `Registrar ${label} (${detail}) das ${t} como tomado agora?`, "Tomei"],
            () => kind === "med"
              ? db.from(table).upsert({ medication_id: p.id, patient_id: patientId, owner_id: ownerId, taken_on: day, slot: t }, { onConflict: "medication_id,taken_on,slot", ignoreDuplicates: true })
              : db.from(table).insert({ plan_id: p.id, patient_id: patientId, owner_id: ownerId, taken_on: day, slot: t })) },
          undo: hit ? () => void run(id, ["Desfazer dose?", `Marcar ${label} das ${t} como não tomado?`, "Desfazer"], () => db.from(table).delete().eq(idKey, p.id).eq("taken_on", day).eq("slot", t)) : undefined,
        });
      }
    };
    dose("med", raw.meds, raw.medIn, "medication_id");
    dose("supl", raw.sup, raw.supIn, "plan_id");

    // Água: registros feitos + próximos copos sugeridos até as 19h
    const drinks = [...raw.water.map((r) => ({ id: r.id, t: Date.parse(r.recorded_at), ml: Number(r.amount_ml), name: "Água" })), ...raw.bev.map((r) => ({ id: r.id, t: Date.parse(r.consumed_at), ml: Number(r.amount_ml), name: r.name || "Bebida" }))].sort((a, b) => a.t - b.t);
    for (const d of drinks) out.push({ id: `agua-${d.id}`, kind: "agua", at: d.t, title: `${d.name} · ${d.ml} ml`, detail: "registrado", status: "done", doneAt: d.t });
    const target = waterTarget ?? 0;
    if (target > 0) {
      let remaining = Math.max(0, target - drinks.reduce((s, d) => s + d.ml, 0));
      let last = drinks.at(-1) ?? null;
      let cursor = now;
      for (let i = 0; i < 10 && remaining >= 10; i++) {
        const next = estimateNextHydration({ remainingMl: remaining, lastIntakeAt: last?.t ?? null, lastAmountMl: last?.ml ?? 0, now: cursor, cutoff: at(day, "19:00") });
        if (!next) break;
        const id = `agua-plan-${i}`;
        const ml = next.suggestedMl;
        out.push({ id, kind: "agua", at: next.at, title: `Copo de água · ~${ml} ml`, detail: i === 0 ? "próximo copo sugerido" : "sugestão para bater a meta", status: i === 0 && next.at <= now + 15 * 60_000 ? "now" : "planned",
          action: i === 0 ? { label: `Bebi ${ml} ml`, run: () => void run(id, ["Confirmar registro?", `Registrar ${ml} ml de água agora?`, "Confirmar registro"],
            () => db.rpc("care_log_unscheduled_intake", { p_patient_id: patientId, p_kind: "agua", p_description: "Água", p_amount_ml: ml, p_request_id: crypto.randomUUID(), p_consumed_at: null })) } : undefined });
        remaining -= ml; last = { t: next.at, ml } as any; cursor = next.at + 1;
        if (next.at >= at(day, "19:00")) break;
      }
    }

    // Refeições: cada horário típico é "feito" se houver registro até 90 min dele
    const seen = new Set<string>();
    const meals = raw.acts.filter((r) => r.category === "refeicao" && (!r.request_id || !seen.has(r.request_id) && seen.add(r.request_id)))
      .map((r) => ({ id: r.id, t: Date.parse(r.happened_at ?? r.recorded_at), text: String(r.details?.description || r.details?.title || "Refeição") })).sort((a, b) => a.t - b.t);
    const used = new Set<string>();
    for (const [t, label] of MEALS) {
      const ms = at(day, t);
      const hit = meals.find((m) => !used.has(m.id) && Math.abs(m.t - ms) <= 90 * 60_000);
      if (hit) used.add(hit.id);
      out.push({ id: `meal-${t}`, kind: "refeicao", at: ms, title: label, detail: hit ? hit.text : "registre o que comer", status: stateOf(ms, Boolean(hit), 90), doneAt: hit?.t, skippable: !hit,
        action: hit ? undefined : { label: "Registrar", run: () => go("alimentacao") } });
    }
    for (const m of meals.filter((m) => !used.has(m.id))) out.push({ id: `meal-x-${m.id}`, kind: "refeicao", at: m.t, title: "Refeição extra", detail: m.text, status: "done", doneAt: m.t });

    // Movimento
    const moves = raw.acts.filter((r) => r.category === "atividade");
    for (const m of moves) out.push({ id: `act-${m.id}`, kind: "atividade", at: Date.parse(m.happened_at ?? m.recorded_at), title: m.details?.title || "Atividade física", detail: `${Number(m.details?.duration_minutes) || 0} min`, status: "done" });
    if (!moves.length) out.push({ id: "act-plan", kind: "atividade", at: at(day, "17:30"), title: "30 min de movimento", detail: "caminhada, treino ou alongamento", status: stateOf(at(day, "17:30"), false, 180), skippable: true, action: { label: "Registrar", run: () => go("atividade") } });

    // Sono: média dos últimos horários de deitar (ou 22h30)
    const mins = raw.sleep.map((l) => { const d = new Date(Date.parse(l.bed_at) - 5 * 3_600_000); let m = d.getUTCHours() * 60 + d.getUTCMinutes(); if (m < 720) m += 1440; return m; });
    const avg = mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : 22 * 60 + 30;
    const bed = Math.min(Date.parse(day + "T00:00:00-05:00") + avg * 60_000, at(day, "23:45"));
    out.push({ id: "sleep-wind", kind: "sono", at: bed - 30 * 60_000, title: "Desacelerar", detail: "telas de lado, luz baixa", status: bed - 30 * 60_000 <= now ? (bed <= now ? "done" : "now") : "planned" });
    out.push({ id: "sleep-bed", kind: "sono", at: bed, title: "Hora de dormir", detail: mins.length ? "sua média das últimas noites" : "sugestão para 7–9 h de sono", status: bed <= now + 15 * 60_000 ? "now" : "planned", action: { label: "Sono", run: () => go("sono") } });

    // Cuidados programados pela equipe
    for (const task of tasks) {
      const st = careReminderState(task, now);
      const ms = Date.parse(task.scheduled_at);
      out.push({ id: `task-${task.id}`, kind: "cuidado", at: ms, title: task.title, detail: "programado pela equipe", task,
        status: task.completed_at ? "done" : resolved[task.id] ? "skipped" : st === "due" ? "now" : st === "unconfirmed" ? "late" : "planned",
        doneAt: task.completed_at ? Date.parse(task.completed_at) : undefined,
        action: !task.completed_at && !resolved[task.id] && st === "due" ? { label: "Confirmar", run: () => onConfirm(task) } : undefined });
    }
    // Respostas "não fiz": o item sai das pendências e mostra o motivo
    for (const r of raw.resp) {
      const it = out.find((i) => i.id === r.item_key);
      if (!it || it.status === "done") continue;
      it.status = "skipped";
      it.detail = reasonLabel(r.reason) + (r.note ? ` · ${r.note}` : "");
      it.action = undefined;
      it.skippable = false;
      it.undo = () => void run(it.id, ["Desfazer resposta?", `${it.title} volta para a lista de pendências.`, "Desfazer"],
        () => db.from("care_day_item_responses").delete().eq("patient_id", patientId).eq("day", day).eq("item_key", it.id));
    }
    return out.sort((a, b) => a.at - b.at);
  }, [raw, now, day, waterTarget, tasks, resolved, patientId, ownerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const c = Object.fromEntries(Object.keys(KINDS).map((k) => [k, 0])) as Record<Kind, number>;
    for (const i of items) c[i.kind]++;
    return c;
  }, [items]);
  const visible = items.filter((i) => filter === "todos" || i.kind === filter);
  const actionable = items.filter((i) => i.kind !== "sono" && i.status !== "skipped" && (i.status === "done" || i.status === "late" || i.at <= now));
  const doneCount = actionable.filter((i) => i.status === "done").length;
  const pct = actionable.length ? Math.round((doneCount / actionable.length) * 100) : 0;
  const late = items.filter((i) => i.status === "late").length;
  const nowCount = items.filter((i) => i.status === "now").length;
  const next = items.find((i) => i.status !== "done" && i.status !== "skipped" && i.at >= now - 15 * 60_000) ?? null;
  const prevDone = [...items].reverse().find((i) => i.status === "done" && i.at <= now);
  const left = items.filter((i) => i.status === "planned").length;

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label="Meu dia">
      <header className="nv-dark relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-[#2e1065] via-[#4c1d95] to-[#86198f] p-3.5 text-white shadow-card sm:p-4">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 -z-10 size-64 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="grid items-center gap-4 lg:grid-cols-[auto_minmax(0,1fr)_17rem]">
          <div className="flex items-center gap-4">
            <div className="relative size-24 shrink-0" role="img" aria-label={`${pct}% do que estava previsto até agora foi feito`}>
              <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#ffffff22" strokeWidth="10" />
                <circle cx="60" cy="60" r="52" fill="none" stroke="url(#nv-day-ring)" strokeWidth="10" strokeLinecap="round" pathLength={100} strokeDasharray={`${pct} 100`} className="nv-ring-draw" style={{ transition: "stroke-dasharray .8s ease" }} />
                <defs><linearGradient id="nv-day-ring" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f0abfc" /><stop offset="1" stopColor="#facc15" /></linearGradient></defs>
              </svg>
              <span className="absolute inset-0 grid place-items-center text-center leading-none"><span><strong className="block text-2xl font-extrabold tabular-nums">{pct}%</strong><span className="text-[10px] text-white/75">em dia</span></span></span>
            </div>
            <div className="min-w-0 lg:hidden"><p className="text-xl font-extrabold">Meu dia</p><p className="text-xs text-white/75">{doneCount} de {actionable.length} feitos até agora</p></div>
          </div>
          <div className="min-w-0">
            <p className="hidden text-2xl font-extrabold lg:block">Meu dia</p>
            <p className="text-sm text-white/80">{actionable.length ? `${doneCount} de ${actionable.length} itens previstos até agora já foram feitos.` : "Seu dia começa com o primeiro item da linha do tempo."} {left > 0 && `${left} ainda pela frente.`}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5 text-[12px] font-semibold">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1"><Check size={13} /> {doneCount} feitos</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${nowCount ? "bg-amber-300 text-amber-950" : "bg-white/12"}`}>{nowCount ? <i className="size-1.5 rounded-full bg-amber-950 nv-live" /> : null}{nowCount} na hora</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${late ? "bg-rose-500 text-white" : "bg-white/12"}`}>{late} atrasados</span>
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
          />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por tipo">
        <FilterChip on={filter === "todos"} onClick={() => setFilter("todos")} color="#7c3aed" label="Tudo" count={items.length} />
        {(Object.keys(KINDS) as Kind[]).filter((k) => counts[k] > 0).map((k) => (
          <FilterChip key={k} on={filter === k} onClick={() => setFilter(filter === k ? "todos" : k)} color={KINDS[k].color} label={KINDS[k].label} count={counts[k]} icon={KINDS[k].icon} />
        ))}
      </div>
      {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

      {!raw ? (
        <div className="grid gap-3 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted/60" />)}</div>
      ) : (
        <div className="grid min-w-0 gap-3 md:grid-cols-3">
          {PERIODS.map((p) => {
            const list = visible.filter((i) => p.test(hourOf(i.at)));
            const isNow = p.test(hourOf(now));
            const done = list.filter((i) => i.status === "done").length;
            const nowIdx = isNow ? list.findIndex((i) => i.at > now) : -1;
            return (
              <section key={p.id} className={`flex min-w-0 flex-col rounded-2xl border p-2.5 ${isNow ? "border-violet-500/35 bg-violet-500/[.04]" : "border-border bg-card"}`} aria-label={p.label}>
                <header className="mb-1.5 flex items-center gap-2 px-1">
                  <p.icon size={15} className={isNow ? "text-violet-500" : "text-muted-foreground"} />
                  <strong className="text-sm">{p.label}</strong>
                  {isNow && <span className="rounded-full bg-violet-500 px-1.5 py-0.5 text-[10px] font-bold text-white">agora</span>}
                  <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{done}/{list.length}</span>
                </header>
                <div className="mb-2 h-1 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-[width] duration-700" style={{ width: `${list.length ? (done / list.length) * 100 : 0}%` }} /></div>
                {list.length === 0 ? (
                  <p className="grid flex-1 place-items-center rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">Nada planejado neste período.</p>
                ) : (
                  <ol className="relative grid gap-1 before:absolute before:bottom-3 before:left-[1.4rem] before:top-3 before:w-px before:bg-border">
                    {list.map((i, idx) => (
                      <li key={i.id} className="contents">
                        {idx === nowIdx && <NowLine now={now} />}
                        <Row item={i} busy={busy === i.id} onView={onView} onResolve={setSheet} />
                      </li>
                    ))}
                    {isNow && nowIdx === -1 && <li className="contents"><NowLine now={now} /></li>}
                  </ol>
                )}
              </section>
            );
          })}
        </div>
      )}
      {sheet && <ResolveSheet item={sheet} busy={busy === sheet.id} onClose={() => setSheet(null)} onSkip={(r, n) => void saveSkip(sheet, r, n)} />}
      <p className="text-[11px] text-muted-foreground">
        A linha do tempo é montada com o que você cadastrou: remédios e suplementos com horário, sua meta de água, as refeições do dia, movimento e sono.
        Toque num item para abrir a área dele.
      </p>
    </section>
  );
}

function FilterChip({ on, onClick, color, label, count, icon: Icon }: { on: boolean; onClick: () => void; color: string; label: string; count: number; icon?: ComponentType<{ size?: number }> }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition active:scale-95 ${on ? "border-transparent text-white shadow-sm" : "border-border bg-card text-foreground hover:bg-muted"}`}
      style={on ? { background: color } : undefined}>
      {Icon ? <span style={on ? undefined : { color }}><Icon size={13} /></span> : <i className="size-2 rounded-full" style={{ background: on ? "#fff" : color }} />}
      {label}
      <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${on ? "bg-white/25" : "bg-muted text-muted-foreground"}`}>{count}</span>
    </button>
  );
}

function NowLine({ now }: { now: number }) {
  return (
    <div className="relative flex items-center gap-2 py-0.5 pl-[1.05rem]" aria-label={`Agora, ${hm(now)}`}>
      <span className="relative z-10 grid size-3 place-items-center"><i className="absolute size-3 rounded-full bg-fuchsia-500/40 nv-evo-ping" /><i className="size-2 rounded-full bg-fuchsia-500" /></span>
      <span className="h-px flex-1 bg-gradient-to-r from-fuchsia-500 to-transparent" />
      <span className="text-[10px] font-bold tabular-nums text-fuchsia-600 dark:text-fuchsia-300">agora · {hm(now)}</span>
    </div>
  );
}

function Row({ item, busy, onView, onResolve }: { item: Item; busy: boolean; onView: (t: PatientCare) => void; onResolve: (i: Item) => void }) {
  const canSkip = item.skippable && (item.status === "late" || item.status === "now");
  const k = KINDS[item.kind];
  const Icon = k.icon;
  const done = item.status === "done";
  const open = () => (item.task ? onView(item.task) : go(k.area));
  return (
    <div className={`group relative flex min-w-0 items-center gap-2 rounded-xl px-1.5 py-1.5 transition-colors ${item.status === "now" ? "bg-amber-400/10 ring-1 ring-amber-400/40" : item.status === "late" ? "bg-rose-500/[.06]" : "hover:bg-muted/50"}`}>
      <button type="button" onClick={open} className="flex min-w-0 flex-1 items-center gap-2 text-left" title={`Abrir ${k.label}`}>
        <span className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-lg ring-4 ring-card transition-transform group-hover:scale-105 ${done ? "bg-emerald-500 text-white" : k.soft}`}>
          {done ? <Check size={15} className="nv-check" /> : <Icon size={15} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5">
            <span className="shrink-0 text-[11px] font-bold tabular-nums" style={{ color: k.color }}>{hm(item.at)}</span>
            <strong className={`truncate text-[13px] leading-tight ${done ? "text-muted-foreground line-through decoration-muted-foreground/40" : ""}`}>{item.title}</strong>
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {item.status === "late" ? <b className="font-semibold text-rose-600 dark:text-rose-400">atrasado · </b> : item.status === "now" ? <b className="font-semibold text-amber-600 dark:text-amber-300">na hora · </b> : item.status === "skipped" ? <b className="font-semibold text-slate-500">não fiz · </b> : null}
            {done && item.doneAt && Math.abs(item.doneAt - item.at) > 60_000 ? `feito às ${hm(item.doneAt)} · ` : ""}{item.detail}
          </span>
        </span>
      </button>
      {canSkip && (
        <button type="button" disabled={busy} onClick={() => onResolve(item)} title="Não fiz" aria-label={`Não fiz: ${item.title}`}
          className="grid size-7 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-rose-400/50 hover:bg-rose-500/10 hover:text-rose-600 active:scale-95 disabled:opacity-50">
          <CircleSlash size={13} />
        </button>
      )}
      {item.action ? (
        <button type="button" disabled={busy} onClick={item.status === "late" && item.skippable ? () => onResolve(item) : item.action.run}
          className={`h-7 shrink-0 rounded-lg px-2.5 text-[11px] font-bold transition active:scale-95 disabled:opacity-50 ${item.status === "now" || item.status === "late" ? "text-white shadow-sm" : "border border-border bg-card text-foreground hover:bg-muted"}`}
          style={item.status === "now" || item.status === "late" ? { background: k.color } : undefined}>
          {busy ? "…" : item.status === "late" && item.skippable ? "Resolver" : item.action.label}
        </button>
      ) : item.undo ? (
        <button type="button" disabled={busy} onClick={item.undo} title="Desfazer" aria-label={`Desfazer ${item.title}`} className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100">
          <Undo2 size={13} />
        </button>
      ) : (
        <ChevronRight size={14} className="shrink-0 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
      )}
    </div>
  );
}

function ResolveSheet({ item, busy, onClose, onSkip }: { item: Item; busy: boolean; onClose: () => void; onSkip: (reason: string, note: string) => void }) {
  const k = KINDS[item.kind];
  const Icon = k.icon;
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [step, setStep] = useState<"choose" | "confirm">("choose");
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[11000] grid place-items-end bg-slate-950/60 p-3 backdrop-blur-sm sm:place-items-center" role="dialog" aria-modal="true" aria-label={`O que aconteceu com ${item.title}?`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="nv-pop w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        <header className="flex items-center gap-3 p-4 text-white" style={{ background: `linear-gradient(135deg, ${k.color}, color-mix(in oklab, ${k.color} 55%, #0f172a))` }}>
          <span className="grid size-10 place-items-center rounded-xl bg-white/20"><Icon size={19} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-white/80">{k.label} · {hm(item.at)}{item.status === "late" ? " · atrasado" : ""}</p>
            <h3 className="truncate text-base font-extrabold">{item.title}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="grid size-8 place-items-center rounded-lg bg-white/15 hover:bg-white/25"><X size={16} /></button>
        </header>
        {step === "choose" ? (
          <div className="grid gap-3 p-4">
            {item.action && (
              <button type="button" disabled={busy} onClick={() => { onClose(); item.action!.run(); }}
                className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/[.07] p-3 text-left transition hover:bg-emerald-500/[.12] active:scale-[.99]">
                <span className="grid size-9 place-items-center rounded-xl bg-emerald-500 text-white"><Check size={17} /></span>
                <span className="min-w-0"><strong className="block text-sm">{item.kind === "med" || item.kind === "supl" ? "Tomei" : "Fiz"} — registrar agora</strong><span className="text-xs text-muted-foreground">Fica registrado com a hora real; você confirma na próxima tela.</span></span>
              </button>
            )}
            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Não fiz — o que aconteceu?</p>
              <div className="flex flex-wrap gap-1.5">
                {REASONS.map(([key, label]) => (
                  <button key={key} type="button" aria-pressed={reason === key} onClick={() => setReason(key)}
                    className={`h-8 rounded-full border px-3 text-xs font-semibold transition active:scale-95 ${reason === key ? "border-transparent bg-rose-600 text-white shadow-sm" : "border-border bg-card hover:border-rose-400/50 hover:bg-rose-500/5"}`}>{label}</button>
                ))}
              </div>
              <label className="mt-2 block text-xs font-semibold text-muted-foreground">Observação (opcional)
                <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 280))} maxLength={280} placeholder="Ex.: estava sem fome, remédio acabou…" className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={onClose} className="h-10 rounded-xl border border-border text-sm font-semibold hover:bg-muted">Cancelar</button>
              <button type="button" disabled={!reason} onClick={() => setStep("confirm")} className="h-10 rounded-xl bg-rose-600 text-sm font-bold text-white shadow-sm transition hover:bg-rose-500 active:scale-95 disabled:opacity-40">Continuar</button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 p-4">
            <p className="text-sm">Confirmar que <strong>{item.title}</strong> das {hm(item.at)} <strong>não foi feito</strong>?</p>
            <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">Motivo: <strong className="text-foreground">{reasonLabel(reason!)}</strong>{note.trim() ? ` · ${note.trim()}` : ""}. O item sai das pendências de hoje e fica no seu histórico. Dá para desfazer depois.</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setStep("choose")} className="h-10 rounded-xl border border-border text-sm font-semibold hover:bg-muted">Voltar</button>
              <button type="button" disabled={busy} onClick={() => onSkip(reason!, note)} className="h-10 rounded-xl bg-rose-600 text-sm font-bold text-white shadow-sm transition hover:bg-rose-500 active:scale-95 disabled:opacity-50">{busy ? "Salvando…" : "Confirmar"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
