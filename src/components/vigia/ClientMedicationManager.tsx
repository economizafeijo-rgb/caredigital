import { Retractable } from "./Retractable";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { NiceSelect } from "./NiceSelect";
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  History,
  Pencil,
  Pill,
  Plus,
  Search,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { MissedDoseRegularizer } from "./MissedDoseRegularizer";
import { supabase } from "@/integrations/supabase/client";
import { acreDateKey } from "@/lib/acre-time";
import { RecordInfo } from "./RecordInfo";
import { NextUpClock } from "./NextUpClock";
import { ExportPlanButton } from "./ExportPlanButton";

export type ClientMedication = {
  id: string;
  name: string;
  category: string;
  dose: string;
  times: string[];
  instructions: string | null;
  active: boolean;
};
type Intake = { medication_id: string; taken_on: string; slot: string; taken_at?: string | null };
type LibraryMed = { name: string; dose: string; times: string[]; use: string; tip: string };
type Category = { key: string; label: string; image: string; gradient: string; meds: LibraryMed[] };

/** Biblioteca educativa: apresentações comuns no Brasil. A dose e o horário corretos são os da receita. */
export const medicationLibrary: Category[] = [
  {
    key: "dor",
    label: "Dor e febre",
    image: "/images/med-dor.webp",
    gradient: "from-rose-600 to-orange-500",
    meds: [
      {
        name: "Dipirona",
        dose: "500 mg",
        times: ["08:00", "14:00", "20:00"],
        use: "Dor e febre",
        tip: "Respeite o intervalo mínimo de 6 horas.",
      },
      {
        name: "Paracetamol",
        dose: "750 mg",
        times: ["08:00", "16:00", "00:00"],
        use: "Dor e febre",
        tip: "Não ultrapasse a dose diária indicada; cuidado com o fígado.",
      },
      {
        name: "Ibuprofeno",
        dose: "400 mg",
        times: ["08:00", "16:00"],
        use: "Dor e inflamação",
        tip: "Tome após as refeições para proteger o estômago.",
      },
    ],
  },
  {
    key: "estomago",
    label: "Estômago e digestão",
    image: "/images/med-estomago.webp",
    gradient: "from-emerald-600 to-teal-500",
    meds: [
      {
        name: "Omeprazol",
        dose: "20 mg",
        times: ["07:00"],
        use: "Gastrite e refluxo",
        tip: "Em jejum, 30 minutos antes do café da manhã.",
      },
      {
        name: "Lansoprazol",
        dose: "30 mg",
        times: ["07:00"],
        use: "Gastrite e úlcera",
        tip: "Em jejum, antes do café da manhã.",
      },
      {
        name: "Domperidona",
        dose: "10 mg",
        times: ["07:30", "11:30", "18:30"],
        use: "Náusea e digestão lenta",
        tip: "15 a 30 minutos antes das refeições.",
      },
    ],
  },
  {
    key: "coracao",
    label: "Pressão e coração",
    image: "/images/med-coracao.webp",
    gradient: "from-sky-600 to-indigo-500",
    meds: [
      {
        name: "Losartana",
        dose: "50 mg",
        times: ["08:00"],
        use: "Pressão alta",
        tip: "Tome sempre no mesmo horário.",
      },
      {
        name: "Hidroclorotiazida",
        dose: "25 mg",
        times: ["08:00"],
        use: "Pressão alta (diurético)",
        tip: "Prefira pela manhã para não interromper o sono.",
      },
      {
        name: "Sinvastatina",
        dose: "20 mg",
        times: ["21:00"],
        use: "Colesterol",
        tip: "Costuma ser tomada à noite.",
      },
    ],
  },
  {
    key: "diabetes",
    label: "Diabetes",
    image: "/images/caredigital-medicamentos.webp",
    gradient: "from-violet-600 to-fuchsia-500",
    meds: [
      {
        name: "Metformina",
        dose: "850 mg",
        times: ["08:00", "20:00"],
        use: "Diabetes tipo 2",
        tip: "Junto ou logo após as refeições.",
      },
      {
        name: "Glibenclamida",
        dose: "5 mg",
        times: ["07:30"],
        use: "Diabetes tipo 2",
        tip: "Antes do café da manhã; não pule refeições.",
      },
    ],
  },
  {
    key: "alergia",
    label: "Alergia e respiração",
    image: "/images/med-alergia.webp",
    gradient: "from-amber-500 to-orange-500",
    meds: [
      {
        name: "Loratadina",
        dose: "10 mg",
        times: ["08:00"],
        use: "Alergia e rinite",
        tip: "Uma vez ao dia; causa pouca sonolência.",
      },
      {
        name: "Dexclorfeniramina",
        dose: "2 mg",
        times: ["08:00", "16:00", "22:00"],
        use: "Alergia",
        tip: "Pode dar sono: evite dirigir.",
      },
    ],
  },
  {
    key: "antibiotico",
    label: "Antibióticos",
    image: "/images/med-antibiotico.webp",
    gradient: "from-pink-600 to-rose-500",
    meds: [
      {
        name: "Amoxicilina",
        dose: "500 mg",
        times: ["06:00", "14:00", "22:00"],
        use: "Infecções bacterianas",
        tip: "Complete todos os dias do tratamento, mesmo se melhorar.",
      },
      {
        name: "Azitromicina",
        dose: "500 mg",
        times: ["08:00"],
        use: "Infecções bacterianas",
        tip: "Uma vez ao dia, pelo número de dias da receita.",
      },
    ],
  },
];
const categoryOf = (key: string) => medicationLibrary.find((c) => c.key === key);

const localKey = (id: string, kind: string) => `caredigital-medications-${kind}-${id}`;
const readLocal = <T,>(key: string): T[] => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
};
const writeLocal = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* indisponível */
  }
};

/** Valida e normaliza o cadastro; devolve a mensagem de erro ou os dados prontos. */
export function validateMedication(
  draft: Partial<ClientMedication>,
): { error: string } | { value: Omit<ClientMedication, "id"> } {
  const name = (draft.name ?? "").trim(),
    dose = (draft.dose ?? "").trim();
  const times = Array.from(
    new Set((draft.times ?? []).filter((t) => /^\d{2}:\d{2}$/.test(t))),
  ).sort();
  if (name.length < 2) return { error: "Informe o nome do medicamento." };
  if (!dose) return { error: "Informe a dose (ex.: 500 mg, 1 comprimido)." };
  if (!times.length) return { error: "Adicione pelo menos um horário." };
  if (times.length > 8) return { error: "Use no máximo 8 horários por dia." };
  return {
    value: {
      name,
      dose,
      times,
      category: draft.category ?? "outros",
      instructions: draft.instructions?.trim() || null,
      active: draft.active ?? true,
    },
  };
}

function ConfirmDialog({
  title,
  children,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-2xl">
        <div
          className={`flex items-center gap-3 p-5 text-white ${danger ? "bg-gradient-to-r from-rose-600 to-red-500" : "bg-gradient-to-r from-rose-600 to-pink-500"}`}
        >
          {danger ? <AlertTriangle size={26} /> : <CheckCircle2 size={26} />}
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <div className="p-5 text-sm">
          {children}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-11 rounded-xl border border-border px-5 text-sm font-bold hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              autoFocus
              onClick={onConfirm}
              className={`h-11 rounded-xl px-5 text-sm font-bold text-white shadow-sm hover:brightness-110 ${danger ? "bg-red-600" : "bg-gradient-to-r from-rose-600 to-pink-500"}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdherenceRing({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div
      className="relative size-16 shrink-0"
      role="img"
      aria-label={`${done} de ${total} doses tomadas`}
    >
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" stroke="#ffffff1f" strokeWidth="12" />
        {total > 0 &&
          Array.from({ length: total }, (_, i) => {
            const seg = 100 / total,
              gap = total > 1 ? Math.min(3, seg * 0.25) : 0;
            return (
              <circle
                key={i}
                cx="60"
                cy="60"
                r="52"
                fill="none"
                pathLength={100}
                strokeWidth="12"
                strokeLinecap="butt"
                stroke={i < done ? "#fff" : "#ffffff30"}
                strokeDasharray={`${seg - gap} ${100 - seg + gap}`}
                strokeDashoffset={-i * seg}
                className="nv-dot-in"
                style={{ animationDelay: `${i * 70}ms`, transition: "stroke .5s" }}
              />
            );
          })}
      </svg>
      <span className="absolute inset-0 grid place-items-center text-center leading-none">
        <span>
          <strong className="block text-base font-extrabold tabular-nums">{pct}%</strong>
          <span className="text-[9px] text-white/70">adesão</span>
        </span>
      </span>
    </div>
  );
}

type Dose = { med: ClientMedication; slot: string; at: number; taken: boolean };
/** Linha do dia com cada dose no seu horário: verde tomada, âmbar atrasada, rosa a tomar. */
function DoseTimeline({
  doses,
  onPick,
  bare = false,
}: {
  doses: Dose[];
  onPick: (d: Dose) => void;
  bare?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const now = Date.now();
  const dayStart = doses.length
    ? doses[0].at -
      (Number(doses[0].slot.slice(0, 2)) * 60 + Number(doses[0].slot.slice(3))) * 60_000
    : now;
  const pos = (t: number) => Math.min(100, Math.max(0, ((t - dayStart) / 86_400_000) * 100));
  const lanes = new Map<string, number>();
  const placed = doses.map((d) => {
    const k = d.slot;
    const l = lanes.get(k) ?? 0;
    lanes.set(k, l + 1);
    return { d, lane: l };
  });
  const hd = hover === null ? null : placed[hover];
  return (
    <figure className={bare ? "" : "rounded-2xl border border-border bg-card p-3 sm:p-4"}>
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span>
          <strong className="block text-sm font-bold">Doses ao longo do dia</strong>
          <span className="text-xs text-muted-foreground">
            Toque em uma dose para registrar ou desfazer
          </span>
        </span>
        <span className="flex gap-3 text-[11px] font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <i className="size-2.5 rounded-full bg-emerald-500" /> Tomada
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="size-2.5 rounded-full bg-amber-500" /> Atrasada
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="size-2.5 rounded-full bg-rose-500" /> A tomar
          </span>
        </span>
      </figcaption>
      <div className="relative mt-4 h-28 select-none" onPointerLeave={() => setHover(null)}>
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-muted">
          <i
            className="block h-full rounded-full bg-gradient-to-r from-rose-500/30 to-pink-400/40 transition-[width] duration-700"
            style={{ width: `${pos(now)}%` }}
          />
        </div>
        <span
          className="absolute top-1 bottom-1 w-px bg-rose-500/70"
          style={{ left: `${pos(now)}%` }}
          aria-hidden="true"
        >
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-rose-600 px-1.5 text-[11px] font-bold text-white">
            agora
          </span>
        </span>
        {placed.map(({ d, lane }, i) => {
          const late = !d.taken && d.at < now;
          return (
            <button
              key={d.med.id + d.slot}
              type="button"
              onClick={() => onPick(d)}
              onPointerEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${d.med.name} ${d.slot}: ${d.taken ? "tomada" : late ? "atrasada" : "a tomar"}`}
              className={`nv-dot-in absolute grid size-8 -translate-x-1/2 place-items-center rounded-full border-2 border-card text-white shadow-md transition-transform hover:scale-125 focus-visible:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${d.taken ? "bg-emerald-700" : late ? "bg-amber-500" : "bg-rose-500"}`}
              style={{
                left: `${pos(d.at)}%`,
                top: `calc(50% - 16px + ${(lane % 2 ? 1 : -1) * Math.ceil(lane / 2) * 26}px)`,
                animationDelay: `${150 + i * 60}ms`,
              }}
            >
              {d.taken ? <Check size={14} /> : <Pill size={13} />}
            </button>
          );
        })}
        {hd && (
          <div
            className="pointer-events-none absolute -top-2 z-10 w-44 -translate-x-1/2 -translate-y-full rounded-xl bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
            style={{ left: `${Math.min(88, Math.max(12, pos(hd.d.at)))}%` }}
          >
            <strong className="block truncate">{hd.d.med.name}</strong>
            {hd.d.slot} · {hd.d.med.dose}
            <span className="block text-white/70">
              {hd.d.taken ? "Tomada" : hd.d.at < now ? "Atrasada" : "A tomar"}
            </span>
          </div>
        )}
      </div>
      <div className="mt-1 flex justify-between text-[11px] font-semibold text-muted-foreground">
        {["00h", "06h", "12h", "18h", "24h"].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </figure>
  );
}

type Pending =
  | { kind: "save"; value: Omit<ClientMedication, "id">; id?: string }
  | { kind: "delete"; med: ClientMedication }
  | { kind: "take"; med: ClientMedication; slot: string; taken: boolean };

export function ClientMedicationManager({
  patientId,
  ownerId,
}: {
  patientId: string;
  ownerId: string;
}) {
  const [meds, setMeds] = useState<ClientMedication[]>([]);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [remote, setRemote] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<Partial<ClientMedication> | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [category, setCategory] = useState(medicationLibrary[0].key);
  const [libQuery, setLibQuery] = useState("");
  const [openLib, setOpenLib] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [reload, setReload] = useState(0);
  const day = acreDateKey();
  const db = supabase as any;

  useEffect(() => {
    let active = true;
    void Promise.all([
      db
        .from("care_client_medications")
        .select("id,name,category,dose,times,instructions,active")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .order("created_at"),
      db
        .from("care_client_medication_intakes")
        .select("medication_id,taken_on,slot,taken_at")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .eq("taken_on", day),
    ]).then(([m, i]: any[]) => {
      if (!active) return;
      if (m.error || i.error) {
        setRemote(false);
        setMeds(readLocal(localKey(patientId, "list")));
        setIntakes(
          readLocal<Intake>(localKey(patientId, "intakes")).filter((x) => x.taken_on === day),
        );
      } else {
        setRemote(true);
        setMeds(m.data ?? []);
        setIntakes(i.data ?? []);
      }
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [patientId, ownerId, day, reload]);

  const doses = useMemo(() => {
    const taken = new Set(intakes.map((i) => `${i.medication_id}|${i.slot}`));
    return meds
      .filter((m) => m.active)
      .flatMap((med) =>
        med.times.map((slot) => ({
          med,
          slot,
          at: Date.parse(`${day}T${slot}:00-05:00`),
          taken: taken.has(`${med.id}|${slot}`),
        })),
      )
      .sort((a, b) => a.at - b.at);
  }, [meds, intakes, day]);
  const next = doses.find((d) => !d.taken && d.at >= Date.now() - 60 * 60_000);
  const done = doses.filter((d) => d.taken).length;
  const late = doses.filter((d) => !d.taken && d.at < Date.now()).length;

  function requestSave() {
    if (!draft) return;
    const result = validateMedication(draft);
    if ("error" in result) return setMessage({ ok: false, text: result.error });
    setMessage(null);
    setPending({ kind: "save", value: result.value, id: draft.id });
  }

  async function confirm() {
    if (!pending) return;
    const p = pending;
    setPending(null);
    let error: unknown = null,
      text = "";
    if (p.kind === "save") {
      if (remote)
        error = (
          p.id
            ? await db.from("care_client_medications").update(p.value).eq("id", p.id)
            : await db
                .from("care_client_medications")
                .insert({ ...p.value, patient_id: patientId, owner_id: ownerId })
        ).error;
      else
        writeLocal(
          localKey(patientId, "list"),
          p.id
            ? meds.map((m) => (m.id === p.id ? { ...m, ...p.value } : m))
            : [...meds, { ...p.value, id: crypto.randomUUID() }],
        );
      text = `${p.value.name} ${p.id ? "atualizado" : "cadastrado"} com ${p.value.times.length} horário(s).`;
      setDraft(null);
    } else if (p.kind === "delete") {
      if (remote)
        error = (await db.from("care_client_medications").delete().eq("id", p.med.id)).error;
      else
        writeLocal(
          localKey(patientId, "list"),
          meds.filter((m) => m.id !== p.med.id),
        );
      text = `${p.med.name} excluído.`;
    } else {
      if (remote)
        error = (
          p.taken
            ? await db
                .from("care_client_medication_intakes")
                .delete()
                .eq("medication_id", p.med.id)
                .eq("taken_on", day)
                .eq("slot", p.slot)
            : await db.from("care_client_medication_intakes").upsert(
                {
                  medication_id: p.med.id,
                  patient_id: patientId,
                  owner_id: ownerId,
                  taken_on: day,
                  slot: p.slot,
                },
                { onConflict: "medication_id,taken_on,slot", ignoreDuplicates: true },
              )
        ).error;
      // Atualiza a tela na hora: a dose aparece como tomada (ou pendente) sem esperar a nova leitura.
      if (!error)
        setIntakes((prev) =>
          p.taken
            ? prev.filter((x) => !(x.medication_id === p.med.id && x.slot === p.slot))
            : prev.some((x) => x.medication_id === p.med.id && x.slot === p.slot)
              ? prev
              : [...prev, { medication_id: p.med.id, taken_on: day, slot: p.slot }],
        );
      else {
        const all = readLocal<Intake>(localKey(patientId, "intakes")).filter(
          (x) => x.taken_on === day,
        );
        writeLocal(
          localKey(patientId, "intakes"),
          p.taken
            ? all.filter((x) => !(x.medication_id === p.med.id && x.slot === p.slot))
            : [...all, { medication_id: p.med.id, taken_on: day, slot: p.slot }],
        );
      }
      text = p.taken
        ? `Registro de ${p.med.name} (${p.slot}) desfeito.`
        : `${p.med.name} ${p.med.dose} das ${p.slot} registrado como tomado.`;
    }
    const reason = (error as { message?: string } | null)?.message;
    setMessage(
      error
        ? {
            ok: false,
            text: `Não foi possível concluir${reason ? `: ${reason}` : ". Tente novamente."}`,
          }
        : { ok: true, text },
    );
    setReload((v) => v + 1);
  }

  const cat = categoryOf(category)!;
  const field = "mt-1 block h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm";
  return (
    <section className="flex flex-col gap-4" aria-label="Meus medicamentos">
      {!remote && loaded && (
        <p
          role="status"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm"
        >
          Modo local: seus medicamentos estão salvos neste navegador até a atualização do banco ser
          aplicada.
        </p>
      )}
      <header className="nv-dark nv-scan relative isolate overflow-hidden border border-rose-400/30 p-2.5 text-white shadow-card sm:px-3">
        <div className="grid items-center gap-4 lg:grid-cols-[auto_minmax(0,1fr)_18rem]">
          <AdherenceRing done={done} total={doses.length} />
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">
              <span className="text-lg font-extrabold tabular-nums">{done}</span> de {doses.length}{" "}
              doses hoje
            </p>
            <p className="text-xs text-white/70">
              {!doses.length
                ? "Cadastre seus medicamentos e o NextVita avisa a hora de cada dose."
                : late
                  ? `${late} ${late === 1 ? "dose atrasada" : "doses atrasadas"}. Registre só o que você realmente tomou.`
                  : done === doses.length
                    ? "Todas as doses de hoje foram registradas."
                    : "Tudo em dia até agora."}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {next && (
                <button
                  type="button"
                  data-register-target="Registrar dose"
                  onClick={() =>
                    setPending({ kind: "take", med: next.med, slot: next.slot, taken: false })
                  }
                  className="nv-bump inline-flex h-8 items-center gap-1.5 bg-white px-3 text-xs font-bold text-rose-900 shadow-sm transition hover:bg-white/90 active:scale-[.97]"
                >
                  <CheckCircle2 size={14} /> Tomei {next.med.name}
                </button>
              )}
              {!doses.length && (
                <button
                  type="button"
                  onClick={() => {
                    setMessage(null);
                    setDraft({ times: ["08:00"], category: "outros" });
                  }}
                  className="nv-bump inline-flex h-8 items-center gap-1.5 bg-white px-3 text-xs font-bold text-rose-900 shadow-sm transition hover:bg-white/90 active:scale-[.97]"
                >
                  <Plus size={14} /> Adicionar medicamento
                </button>
              )}
              <ExportPlanButton
                patientId={patientId}
                ownerId={ownerId}
                label="Exportar horários"
                className="inline-flex h-8 items-center gap-1.5 border border-white/25 bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/20 active:scale-[.97]"
              />
            </div>
          </div>
          <NextUpClock
            compact
            alertKey="medicacao"
            title="Próxima dose"
            color="#f9a8d4"
            target={next ? next.at : null}
            from={(() => {
              const prev = doses.filter((d) => d.at < (next?.at ?? 0)).at(-1);
              return prev ? prev.at : null;
            })()}
            detail={next ? `${next.med.name} · ${next.med.dose}` : undefined}
            emptyText={doses.length ? "Nenhuma dose pendente hoje" : "Sem horários cadastrados"}
            actionLabel="Tomei"
            onAction={
              next
                ? () => setPending({ kind: "take", med: next.med, slot: next.slot, taken: false })
                : undefined
            }
          />
        </div>
      </header>

      {message && !draft && (
        <p
          role="status"
          className={`rounded-xl px-3 py-2 text-sm font-medium ${message.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 text-destructive"}`}
        >
          {message.text}
        </p>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        {/* Coluna principal: hoje + meus medicamentos */}
        <div className="grid min-w-0 gap-4">
          {doses.length > 0 && (
            <Retractable
              id="med-doses"
              eyebrow="Hoje"
              title="Doses e horários"
              accent="#f43f5e"
              summary={`${doses.filter((d) => d.taken).length} de ${doses.length} tomadas`}
            >
              <div>
                <DoseTimeline
                  doses={doses}
                  onPick={(d) =>
                    setPending({ kind: "take", med: d.med, slot: d.slot, taken: d.taken })
                  }
                  bare
                />
                <h3 className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-sm font-bold">
                  <Clock size={16} className="text-rose-500" /> Horários de hoje
                </h3>
                <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {doses.map(({ med, slot, taken, at }, i) => (
                    <li
                      key={med.id + slot}
                      className={`nv-fade-in flex items-center gap-2.5 rounded-xl border p-2 transition-colors ${taken ? "border-emerald-500/30 bg-emerald-500/[.06]" : at < Date.now() ? "border-amber-500/40 bg-amber-500/[.06]" : "border-border hover:bg-muted/40"}`}
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <span className="w-12 shrink-0 text-center font-mono text-sm font-bold tabular-nums">
                        {slot}
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm">{med.name}</strong>
                        <span className="text-xs text-muted-foreground">
                          {med.dose}
                          {taken ? " · tomada" : at < Date.now() ? " · atrasada" : ""}
                        </span>
                      </span>
                      <RecordInfo
                        title={`${med.name} · ${med.dose}`}
                        category="Medicação"
                        color="#e11d48"
                        at={
                          taken
                            ? (intakes.find((x) => x.medication_id === med.id && x.slot === slot)
                                ?.taken_at ?? new Date(at).toISOString())
                            : new Date(at).toISOString()
                        }
                        rows={[
                          { label: "Medicamento", value: med.name },
                          { label: "Dose", value: med.dose },
                          { label: "Horário previsto", value: slot },
                          {
                            label: "Situação",
                            value: taken ? "Tomada" : at < Date.now() ? "Atrasada" : "A tomar",
                          },
                          {
                            label: "Categoria",
                            value: categoryOf(med.category)?.label ?? "Outros",
                          },
                        ]}
                        description={med.instructions}
                      />
                      <button
                        type="button"
                        onClick={() => setPending({ kind: "take", med, slot, taken })}
                        aria-label={
                          taken ? `Desfazer ${med.name} ${slot}` : `Tomei ${med.name} ${slot}`
                        }
                        className={`inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-bold transition active:scale-95 ${taken ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-gradient-to-r from-rose-600 to-pink-500 text-white hover:brightness-110"}`}
                      >
                        {taken ? <Undo2 size={14} /> : <Check size={15} />}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </Retractable>
          )}

          <Retractable
            id="med-lista"
            eyebrow="Cadastro"
            title="Meus medicamentos"
            accent="#f43f5e"
            summary={`${meds.length} cadastrados`}
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span />
                <button
                  type="button"
                  onClick={() => {
                    setMessage(null);
                    setDraft({ times: ["08:00"], category: "outros" });
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 px-3 text-sm font-bold text-white transition hover:brightness-110 active:scale-[.97]"
                >
                  <Plus size={15} /> Adicionar
                </button>
              </div>
              {meds.length === 0 ? (
                <div className="mt-3 grid place-items-center rounded-2xl border border-dashed border-border px-4 py-8 text-center">
                  <span className="grid size-14 place-items-center rounded-2xl bg-rose-500/10 text-rose-600">
                    <Pill size={26} />
                  </span>
                  <p className="mt-3 font-bold">Nenhum medicamento cadastrado</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Adicione o seu com o botão acima ou escolha um na biblioteca ao lado. Depois é
                    só confirmar cada dose no horário.
                  </p>
                </div>
              ) : (
                <ul className="mt-3 divide-y divide-border">
                  {meds.map((med) => {
                    const c = categoryOf(med.category);
                    return (
                      <li key={med.id} className="group flex items-center gap-3 py-2.5">
                        <span
                          className={`grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white ${c?.gradient ?? "from-slate-500 to-slate-600"}`}
                        >
                          <Pill size={17} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-sm">
                            {med.name}{" "}
                            <span className="font-semibold text-muted-foreground">{med.dose}</span>
                          </strong>
                          <span className="mt-0.5 flex flex-wrap gap-1">
                            {med.times.map((t) => (
                              <span
                                key={t}
                                className="rounded-md bg-rose-500/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-rose-700 dark:text-rose-300"
                              >
                                {t}
                              </span>
                            ))}
                            <span className="text-[11px] text-muted-foreground">
                              · {c?.label ?? "Outros"}
                            </span>
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setMessage(null);
                            setDraft(med);
                          }}
                          aria-label={`Editar ${med.name}`}
                          className="grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPending({ kind: "delete", med })}
                          aria-label={`Excluir ${med.name}`}
                          className="grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {meds.length > 0 && (
                <details className="group mt-3 rounded-xl border border-border bg-muted/30 px-3 py-2">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">
                    <History size={15} className="text-rose-500" /> Esqueceu de confirmar doses
                    passadas?{" "}
                    <span className="ml-auto text-xs text-primary group-open:hidden">
                      Regularizar
                    </span>
                  </summary>
                  <div className="mt-2">
                    <MissedDoseRegularizer
                      patientId={patientId}
                      onDone={() => setReload((v) => v + 1)}
                      compact
                    />
                  </div>
                </details>
              )}
            </div>
          </Retractable>
        </div>

        {/* Biblioteca */}
        <Retractable
          id="med-biblioteca"
          eyebrow="Consulta"
          title="Biblioteca"
          accent="#f59e0b"
          summary="Busque e adicione medicamentos"
          className="min-w-0 xl:sticky xl:top-2"
        >
          <aside className="min-w-0" aria-label="Biblioteca de medicamentos">
            <p className="text-xs text-muted-foreground">
              Toque em um medicamento para ver detalhes e adicionar.
            </p>
            <label className="relative mt-3 block">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={libQuery}
                onChange={(e) => setLibQuery(e.target.value)}
                placeholder="Buscar: dipirona, losartana…"
                aria-label="Buscar medicamento"
                className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-rose-400"
              />
            </label>
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Categorias">
              {medicationLibrary.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={category === c.key}
                  onClick={() => {
                    setCategory(c.key);
                    setLibQuery("");
                  }}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${category === c.key && !libQuery ? `bg-gradient-to-r text-white ${c.gradient}` : "bg-muted text-muted-foreground hover:text-foreground"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <ul className="mt-3 grid gap-1.5">
              {(libQuery.trim()
                ? medicationLibrary
                    .flatMap((c) => c.meds.map((m) => ({ m, c })))
                    .filter(({ m }) => m.name.toLowerCase().includes(libQuery.trim().toLowerCase()))
                : cat.meds.map((m) => ({ m, c: cat }))
              ).map(({ m, c }) => {
                const open = openLib === m.name;
                return (
                  <li
                    key={c.key + m.name}
                    className={`overflow-hidden rounded-xl border transition ${open ? "border-rose-400/50 bg-rose-500/[.04]" : "border-border hover:border-rose-400/30"}`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenLib(open ? null : m.name)}
                      aria-expanded={open}
                      className="flex w-full items-center gap-2.5 p-2.5 text-left"
                    >
                      <span
                        className={`h-8 w-1.5 shrink-0 rounded-full bg-gradient-to-b ${c.gradient}`}
                      />
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm">
                          {m.name}{" "}
                          <span className="font-semibold text-muted-foreground">{m.dose}</span>
                        </strong>
                        <span className="text-xs text-muted-foreground">{m.use}</span>
                      </span>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                    {open && (
                      <div className="nv-fade-in border-t border-border px-3 pb-3 pt-2 text-sm">
                        <p>{m.tip}</p>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Horários comuns:{" "}
                          <span className="font-mono font-semibold text-foreground">
                            {m.times.join(" · ")}
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setMessage(null);
                            setDraft({
                              name: m.name,
                              dose: m.dose,
                              times: m.times,
                              category: c.key,
                              instructions: m.tip,
                            });
                          }}
                          className={`mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r text-sm font-bold text-white transition hover:brightness-110 ${c.gradient}`}
                        >
                          <Plus size={15} /> Adicionar à minha lista
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Conteúdo educativo. Use medicamentos somente com orientação médica ou farmacêutica;
              não altere doses por conta própria.
            </p>
          </aside>
        </Retractable>
      </div>

      {draft && (
        <div
          className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Cadastro de medicamento"
        >
          <div className="w-full max-w-md rounded-3xl bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {draft.id ? "Editar medicamento" : "Novo medicamento"}
              </h3>
              <button
                type="button"
                onClick={() => setDraft(null)}
                aria-label="Fechar"
                className="grid size-9 place-items-center rounded-lg hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 grid gap-3 text-sm font-semibold">
              <label>
                Nome
                <input
                  className={field}
                  value={draft.name ?? ""}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Ex.: Losartana"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  Dose
                  <input
                    className={field}
                    value={draft.dose ?? ""}
                    onChange={(e) => setDraft({ ...draft, dose: e.target.value })}
                    placeholder="Ex.: 50 mg"
                  />
                </label>
                <label>
                  Categoria
                  <NiceSelect
                    className="mt-1 h-11"
                    ariaLabel="Categoria"
                    value={draft.category ?? "outros"}
                    onChange={(v) => setDraft({ ...draft, category: v })}
                    options={[
                      ...medicationLibrary.map((c) => ({ value: c.key, label: c.label })),
                      { value: "outros", label: "Outros" },
                    ]}
                  />
                </label>
              </div>
              <div>
                Horários
                <div className="mt-1 flex flex-wrap gap-2">
                  {(draft.times ?? []).map((t, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-xl border border-border bg-surface pl-2"
                    >
                      <input
                        type="time"
                        value={t}
                        onChange={(e) => {
                          const times = [...(draft.times ?? [])];
                          times[i] = e.target.value;
                          setDraft({ ...draft, times });
                        }}
                        className="h-10 bg-transparent"
                      />
                      <button
                        type="button"
                        aria-label="Remover horário"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            times: (draft.times ?? []).filter((_, j) => j !== i),
                          })
                        }
                        className="grid size-9 place-items-center text-muted-foreground hover:text-destructive"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                  {(draft.times ?? []).length < 8 && (
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({ ...draft, times: [...(draft.times ?? []), "12:00"] })
                      }
                      className="inline-flex h-10 items-center gap-1 rounded-xl border border-dashed border-border px-3 hover:bg-muted"
                    >
                      <Plus size={14} /> Horário
                    </button>
                  )}
                </div>
              </div>
              <label>
                Orientações
                <textarea
                  rows={2}
                  maxLength={300}
                  className="mt-1 block w-full rounded-xl border border-border bg-surface p-3"
                  value={draft.instructions ?? ""}
                  onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
                  placeholder="Ex.: em jejum, após o almoço…"
                />
              </label>
              {message && !message.ok && (
                <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-destructive">
                  {message.text}
                </p>
              )}
              <button
                type="button"
                onClick={requestSave}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 text-base font-bold text-white hover:brightness-110"
              >
                <Check size={18} /> {draft.id ? "Salvar alterações" : "Cadastrar medicamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pending?.kind === "save" && (
        <ConfirmDialog
          title={pending.id ? "Confirmar alterações?" : "Confirmar cadastro?"}
          confirmLabel={pending.id ? "Sim, salvar" : "Sim, cadastrar"}
          onConfirm={() => void confirm()}
          onCancel={() => setPending(null)}
        >
          <p>
            <strong>{pending.value.name}</strong> · {pending.value.dose}
          </p>
          <p className="mt-1">
            Horários: <strong>{pending.value.times.join(", ")}</strong>
          </p>
          <p className="mt-2 text-muted-foreground">
            Confira se a dose e os horários estão iguais aos da sua receita.
          </p>
        </ConfirmDialog>
      )}
      {pending?.kind === "delete" && (
        <ConfirmDialog
          danger
          title="Excluir medicamento?"
          confirmLabel="Sim, excluir"
          onConfirm={() => void confirm()}
          onCancel={() => setPending(null)}
        >
          <p>
            <strong>{pending.med.name}</strong> ({pending.med.dose}) e todos os seus horários e
            registros de dose serão removidos. Esta ação não pode ser desfeita.
          </p>
        </ConfirmDialog>
      )}
      {pending?.kind === "take" && (
        <ConfirmDialog
          title={pending.taken ? "Desfazer registro?" : "Confirmar dose tomada?"}
          confirmLabel={pending.taken ? "Sim, desfazer" : "Sim, tomei"}
          onConfirm={() => void confirm()}
          onCancel={() => setPending(null)}
        >
          <p>
            <strong>{pending.med.name}</strong> · {pending.med.dose} · horário das{" "}
            <strong>{pending.slot}</strong>
          </p>
          <p className="mt-2 text-muted-foreground">
            {pending.taken
              ? "A dose voltará a aparecer como pendente."
              : "Confirme apenas se você realmente tomou esta dose. Não dobre doses esquecidas."}
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
