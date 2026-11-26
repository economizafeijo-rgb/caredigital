import { useMemo, useState } from "react";
import { Droplets, Trash2, Clock, Info } from "lucide-react";
import { acreDateKey, acreDateTimeInput, acreTimeLabel } from "@/lib/acre-time";
import {
  MEDICAL_NOTE,
  VOLUME_LABEL,
  avgIntervalMin,
  hourlyCounts,
  hourlyMl,
  hydrationInsight,
  logsOfDay,
  pacingPlan,
  type UrinationLog,
  type UrineVolume,
} from "@/lib/urination";
import { useCareLogs, useLiquids } from "./useCareLogs";
import { ClientHealthHub } from "./ClientHealthHub";

const COLS = "id,at,volume,ml,notes";
const toneCls = {
  ok: "border-emerald-500/40 bg-emerald-500/10",
  info: "border-sky-500/40 bg-sky-500/10",
  warn: "border-amber-500/50 bg-amber-500/10",
} as const;

export function ClientUrinationPage({
  patientId,
  ownerId,
}: {
  patientId: string;
  ownerId: string;
}) {
  const { items, loaded, remote, error, add, remove } = useCareLogs<UrinationLog>(
    "care_urination_logs",
    COLS,
    patientId,
    ownerId,
  );
  const { liquids, goalMl } = useLiquids(patientId, ownerId);
  const range = "dia" as "dia" | "semana";
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState(() => acreDateTimeInput());
  const [volume, setVolume] = useState<UrineVolume>("moderado");
  const [ml, setMl] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const today = acreDateKey();
  const nowMs = Date.now();
  const todayLogs = useMemo(() => logsOfDay(items, today), [items, today]);
  const weekAgo = nowMs - 7 * 86_400_000;
  const scope =
    range === "dia" ? todayLogs : items.filter((l) => new Date(l.at).getTime() >= weekAgo);
  const scopeLiquids =
    range === "dia"
      ? logsOfDay(liquids, today)
      : liquids.filter((l) => new Date(l.at).getTime() >= weekAgo);
  const liquidToday = logsOfDay(liquids, today).reduce((a, l) => a + l.ml, 0);

  const counts = hourlyCounts(scope);
  const ml24 = hourlyMl(scopeLiquids);
  const interval = avgIntervalMin(todayLogs);
  const twoH = nowMs - 2 * 3_600_000;
  const insight = hydrationInsight({
    count: todayLogs.length,
    nightCount: todayLogs.filter((l) => {
      const h = Number(acreTimeLabel(l.at).slice(0, 2));
      return h >= 23 || h < 5;
    }).length,
    liquidMl: liquidToday,
    goalMl,
    lastTwoHoursMl: liquids
      .filter((l) => new Date(l.at).getTime() >= twoH)
      .reduce((a, l) => a + l.ml, 0),
    lastTwoHoursCount: todayLogs.filter((l) => new Date(l.at).getTime() >= twoH).length,
    hourNow: Number(acreTimeLabel(nowMs).slice(0, 2)),
  });
  const plan = goalMl
    ? pacingPlan({
        goalMl,
        liquidMl: liquidToday,
        nowMs,
        bedHour: 22,
        nightCount: todayLogs.filter((l) => {
          const h = Number(acreTimeLabel(l.at).slice(0, 2));
          return h >= 23 || h < 5;
        }).length,
      })
    : null;
  const perLiter =
    liquidToday > 0 && todayLogs.length
      ? (todayLogs.length / (liquidToday / 1000)).toFixed(1).replace(".", ",")
      : "–";

  async function save(quick: boolean) {
    if (saving) return;
    setSaving(true);
    const mlNum = ml ? Number(ml) : null;
    const ok = await add({
      at: quick ? new Date().toISOString() : new Date(when + ":00-05:00").toISOString(),
      volume,
      ml: mlNum && mlNum >= 10 && mlNum <= 1500 ? Math.round(mlNum) : null,
      notes: notes.trim().slice(0, 300),
    });
    setSaving(false);
    if (ok) {
      setOpen(false);
      setMl("");
      setNotes("");
      setWhen(acreDateTimeInput());
    }
  }

  return (
    <section className="grid min-w-0 gap-3" aria-labelledby="urina-title">
      <h2 id="urina-title" className="sr-only">
        Registro de micção
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save(true)}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-bold text-white hover:bg-sky-500 disabled:opacity-60"
        >
          <Droplets size={18} aria-hidden="true" /> Registrar xixi agora
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted"
        >
          <Clock size={16} aria-hidden="true" /> Ajustar hora e detalhes
        </button>
        {!remote && loaded && (
          <span className="text-xs text-muted-foreground">
            Salvo só neste aparelho por enquanto.
          </span>
        )}
      </div>

      {open && (
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold">
            Horário
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-normal"
            />
          </label>
          <fieldset className="grid gap-1 text-sm font-semibold">
            <legend className="mb-1">Volume estimado</legend>
            <div className="flex gap-1.5">
              {(Object.keys(VOLUME_LABEL) as UrineVolume[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={volume === v}
                  onClick={() => setVolume(v)}
                  className={`h-10 flex-1 rounded-lg border text-sm ${volume === v ? "border-sky-500 bg-sky-500/15 font-bold" : "border-border font-medium"}`}
                >
                  {VOLUME_LABEL[v]}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-1 text-sm font-semibold">
            Volume em ml (opcional)
            <input
              inputMode="numeric"
              value={ml}
              onChange={(e) => setMl(e.target.value.replace(/\D/g, ""))}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-normal"
              placeholder="ex.: 250"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Observações (cor, aspecto…)
            <input
              maxLength={300}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-normal"
            />
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save(false)}
            className="h-10 rounded-lg bg-sky-600 text-sm font-bold text-white sm:col-span-2 disabled:opacity-60"
          >
            Salvar registro
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}

      <div className={`rounded-2xl border p-4 ${toneCls[insight.tone]}`}>
        <p className="text-sm font-bold">{insight.title}</p>
        <p className="mt-1 text-[13px] leading-snug">{insight.text}</p>
        {plan && (
          <p className="mt-2 text-[13px] leading-snug">
            <b>Ritmo para o resto do dia:</b> faltam {plan.remainingMl} ml. Beba cerca de{" "}
            {plan.cupMl} ml a cada {plan.everyMin} min ({plan.cups} copos), até {plan.stopAt}, e
            evite beber muito de uma vez.
          </p>
        )}
        <p className="mt-2 flex gap-1.5 text-[11.5px] text-muted-foreground">
          <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          {MEDICAL_NOTE}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Idas hoje", String(todayLogs.length)],
          [
            "Intervalo médio",
            interval
              ? `${Math.floor(interval / 60)}h${String(interval % 60).padStart(2, "0")}`
              : "–",
          ],
          ["Líquidos hoje", `${liquidToday} ml`],
          ["Idas por litro", perLiter],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border bg-card p-3">
            <dt className="text-[11px] text-muted-foreground">{k}</dt>
            <dd className="mt-0.5 text-lg font-extrabold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <ClientHealthHub patientId={patientId} ownerId={ownerId} only="miccao" />

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-2 text-sm font-bold">
          Registros {range === "dia" ? "de hoje" : "dos últimos 7 dias"}
        </h3>
        {!scope.length ? (
          <p className="text-sm text-muted-foreground">
            Nenhum registro ainda. Toque em “Registrar xixi agora” quando for ao banheiro.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {scope.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-24 shrink-0 tabular-nums text-muted-foreground">
                  {range === "semana"
                    ? new Date(l.at).toLocaleDateString("pt-BR", {
                        timeZone: "America/Rio_Branco",
                        day: "2-digit",
                        month: "2-digit",
                      }) + " "
                    : ""}
                  {acreTimeLabel(l.at)}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {VOLUME_LABEL[l.volume]}
                  {l.ml ? ` · ${l.ml} ml` : ""}
                  {l.notes ? ` · ${l.notes}` : ""}
                </span>
                <button
                  type="button"
                  aria-label="Excluir registro"
                  onClick={() => void remove(l.id)}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-red-500"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
