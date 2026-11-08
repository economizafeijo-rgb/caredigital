import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Clock3, Pill } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { canConfirmCare, careScheduleLabel } from "@/lib/care-schedule";

type Dose = {
  id: string;
  patient_id: string;
  title: string;
  category: string;
  scheduled_at: string;
  completed_at: string | null;
};

const timeZone = "America/Rio_Branco";
const dayKey = (value: string) => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
const timeLabel = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
const confirmationLabel = (dose: Dose) => {
  if (!dose.completed_at) return "Pendente";
  return `Confirmado em ${dateLabel(dose.completed_at)} às ${timeLabel(dose.completed_at)}`;
};

export function MedicationBlisterCalendar({
  patientId,
  ownerId,
  revision,
  onConfirm,
}: {
  patientId: string;
  ownerId: string;
  revision: number;
  onConfirm: (dose: Dose) => void;
}) {
  const [doses, setDoses] = useState<Dose[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    void (async () => {
      const result = await (supabase as any)
        .from("care_daily_checklist")
        .select("id,patient_id,title,category,scheduled_at,completed_at")
        .eq("owner_id", ownerId)
        .eq("patient_id", patientId)
        .eq("category", "medicacao")
        .order("scheduled_at", { ascending: true })
        .limit(500);

      if (!active) return;
      if (result.error) {
        setError("Não foi possível carregar a agenda de medicamentos.");
        setDoses([]);
      } else {
        setDoses((result.data ?? []) as Dose[]);
      }
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [patientId, ownerId, revision]);

  const days = useMemo(() => {
    const grouped = new Map<string, Dose[]>();
    for (const dose of doses) {
      const key = dayKey(dose.scheduled_at);
      const group = grouped.get(key) ?? [];
      group.push(dose);
      grouped.set(key, group);
    }
    return Array.from(grouped.entries())
      .map(([key, tasks]) => ({ key, date: tasks[0]!.scheduled_at, tasks }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [doses]);

  useEffect(() => {
    if (!days.length) {
      setSelectedDay("");
      return;
    }
    const today = dayKey(new Date().toISOString());
    const firstUpcoming = days.find((day) => day.key >= today);
    const fallback = firstUpcoming?.key ?? days[days.length - 1]!.key;
    setSelectedDay((current) =>
      current && days.some((day) => day.key === current) ? current : fallback,
    );
  }, [days]);

  const total = doses.length;
  const completed = doses.filter((dose) => dose.completed_at !== null).length;
  const pending = total - completed;
  const selected = days.find((day) => day.key === selectedDay);
  const selectedCompleted =
    selected?.tasks.filter((dose) => dose.completed_at !== null).length ?? 0;

  return (
    <section
      className="care-premium-treatment-calendar mb-5 min-w-0 rounded-2xl border border-border bg-card p-4 text-card-foreground sm:p-5"
      aria-label="Agenda de medicamentos"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="flex items-center gap-2 text-lg font-bold">
            <Pill size={21} aria-hidden="true" />
            Agenda de medicamentos
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Horários e confirmações conforme os registros do paciente.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background px-3 py-2 text-right">
          <strong className="block text-lg tabular-nums">
            {completed}/{total}
          </strong>
          <span className="text-xs text-muted-foreground">cuidados confirmados</span>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-background p-3">
          <span className="text-xs text-muted-foreground">Programados</span>
          <strong className="mt-1 block text-xl tabular-nums">{total}</strong>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <span className="text-xs text-emerald-800 dark:text-emerald-200">Confirmados</span>
          <strong className="mt-1 block text-xl tabular-nums text-emerald-800 dark:text-emerald-100">
            {completed}
          </strong>
        </div>
        <div className="col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30 sm:col-span-1">
          <span className="text-xs text-amber-900 dark:text-amber-200">Pendentes</span>
          <strong className="mt-1 block text-xl tabular-nums text-amber-900 dark:text-amber-100">
            {pending}
          </strong>
        </div>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Progresso das confirmações de medicamentos"
        aria-valuemin={0}
        aria-valuemax={total || 1}
        aria-valuenow={completed}
      >
        <div
          className="h-full rounded-full bg-emerald-600 transition-all"
          style={{ width: total ? `${(completed / total) * 100}%` : "0%" }}
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-5 text-sm text-muted-foreground">Carregando registros…</p>
      ) : days.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-border p-5 text-center">
          <Pill className="mx-auto mb-2 text-muted-foreground" size={24} />
          <p className="font-medium">Nenhum horário de medicamento encontrado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Quando houver uma programação vinculada a este paciente, ela aparecerá aqui.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h5 className="text-sm font-semibold">Dias com programação</h5>
              <span className="text-xs text-muted-foreground">
                {days.length} {days.length === 1 ? "dia" : "dias"}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Selecionar dia">
              {days.map((day) => {
                const done = day.tasks.filter((task) => task.completed_at).length;
                const active = selectedDay === day.key;
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => setSelectedDay(day.key)}
                    aria-pressed={active}
                    className={`min-w-[104px] rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    <span className="block text-xs capitalize text-muted-foreground">
                      {dateLabel(day.date)}
                    </span>
                    <strong className="mt-1 block text-sm tabular-nums">
                      {done}/{day.tasks.length}
                    </strong>
                    <span className="text-[11px] text-muted-foreground">confirmados</span>
                  </button>
                );
              })}
            </div>
          </div>

          {selected && (
            <div className="mt-4 rounded-xl border border-border bg-background p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h5 className="font-semibold capitalize">{dateLabel(selected.date)}</h5>
                  <p className="text-xs text-muted-foreground">
                    {selectedCompleted} de {selected.tasks.length} cuidados confirmados
                  </p>
                </div>
                <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                  Horário local · Acre
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {selected.tasks.map((dose) => {
                  const canConfirm = !dose.completed_at && canConfirmCare(dose);
                  return (
                    <div
                      key={dose.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            dose.completed_at
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {dose.completed_at ? <Check size={18} /> : <Clock3 size={18} />}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">
                            {timeLabel(dose.scheduled_at)} · {dose.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {dose.completed_at
                              ? confirmationLabel(dose)
                              : careScheduleLabel(dose)}
                          </p>
                        </div>
                      </div>
                      {!dose.completed_at && (
                        <button
                          type="button"
                          disabled={!canConfirm}
                          onClick={() => canConfirm && onConfirm(dose)}
                          className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {canConfirm ? "Confirmar tomada" : "Aguardando horário"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
        <AlertTriangle size={15} className="mt-0.5 shrink-0" />
        Esta agenda exibe os horários cadastrados. A confirmação registra o horário real
        no servidor; não altera dose, prescrição ou quantidade de medicamento.
      </p>
    </section>
  );
}
