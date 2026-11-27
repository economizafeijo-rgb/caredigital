import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Droplets, Trash2, Info, Lock, Pencil, Thermometer, X } from "lucide-react";
import { feel, useHourlyTemps } from "@/lib/weather";
import { useDialog } from "@/lib/dialog";
import { useRecordLock } from "./useRecordLock";
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
import { Collapsible } from "./HealthBits";
import { EmptyState } from "./EmptyState";

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
  // Só grava/lê a temperatura se a coluna já existir no banco (migração aplicada).
  const [tempCol, setTempCol] = useState(false);
  useEffect(() => {
    void (supabase as any)
      .from("care_urination_logs")
      .select("temp_c")
      .limit(1)
      .then((r: { error: unknown }) => setTempCol(!r.error));
  }, []);
  const { items, loaded, remote, error, add, remove, update } = useCareLogs<UrinationLog>(
    "care_urination_logs",
    tempCol ? `${COLS},temp_c` : COLS,
    patientId,
    ownerId,
  );
  const { liquids, goalMl } = useLiquids(patientId, ownerId);
  const range = "dia" as "dia" | "semana";
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState(() => acreDateTimeInput());
  const [volume, setVolume] = useState<UrineVolume>("moderado");
  const [ml, setMl] = useState("");
  const wx = useHourlyTemps(8, { patientId, ownerId });
  const nowFeel = wx.now !== null ? feel(wx.now) : null;
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const lock = useRecordLock();
  const dialog = useDialog();
  const [done, setDone] = useState<string | null>(null);

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

  async function save() {
    if (saving) return;
    setSaving(true);
    const mlNum = ml ? Number(ml) : null;
    const row = {
      at: new Date(when + ":00-05:00").toISOString(),
      volume,
      ml: mlNum && mlNum >= 10 && mlNum <= 1500 ? Math.round(mlNum) : null,
      notes: notes.trim().slice(0, 300),
      // Ao editar, mantém a temperatura original; ao criar, usa a da hora do registro.
      ...(tempCol
        ? {
            temp_c: editId
              ? (items.find((x) => x.id === editId)?.temp_c ??
                wx.at(new Date(when + ":00-05:00").getTime()))
              : wx.at(new Date(when + ":00-05:00").getTime()),
          }
        : {}),
    };
    const ok = editId ? await update(editId, row) : await add(row);
    setSaving(false);
    if (ok) {
      setEditId(null);
      setDone(
        `Micção ${editId ? "atualizada" : "registrada"} às ${acreTimeLabel(new Date(when + ":00-05:00").getTime())}.`,
      );
      window.setTimeout(() => setDone(null), 4000);
      setOpen(false);
      setMl("");
      setNotes("");
      setWhen(acreDateTimeInput());
    }
  }

  async function startEdit(l: UrinationLog) {
    if (lock.isLocked(l.at) && !(await lock.unlock())) return;
    setEditId(l.id);
    setWhen(acreDateTimeInput(new Date(l.at).getTime()));
    setVolume(l.volume);
    setMl(l.ml ? String(l.ml) : "");
    setNotes(l.notes ?? "");
    setOpen(true);
  }
  async function askRemove(l: UrinationLog) {
    if (lock.isLocked(l.at) && !(await lock.unlock())) return;
    const ok = await dialog.confirm(
      "Excluir este registro?",
      `Micção das ${acreTimeLabel(l.at)}. Não dá para desfazer.`,
      true,
      "Excluir",
    );
    if (ok) await remove(l.id);
  }

  return (
    <section className="grid min-w-0 gap-3" aria-labelledby="urina-title">
      <h2 id="urina-title" className="sr-only">
        Registro de micção
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setEditId(null);
            setWhen(acreDateTimeInput());
            setOpen(true);
          }}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 text-[15px] font-bold text-white shadow-sm transition active:scale-[0.97] hover:bg-sky-500"
        >
          <Droplets size={19} aria-hidden="true" /> Registrar xixi agora
        </button>
        {!remote && loaded && (
          <span className="text-xs text-muted-foreground">
            Salvo só neste aparelho por enquanto.
          </span>
        )}
      </div>

      {done && (
        <p
          role="status"
          className="rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-300"
        >
          {done}
        </p>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[12000] flex items-end bg-black/60 sm:items-center sm:justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Registrar micção"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="grid max-h-[92dvh] w-full gap-4 overflow-y-auto rounded-t-3xl border border-border bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">
                  {editId ? "Editar micção" : "Registrar micção"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Confirme o horário e, se quiser, quanto saiu.
                </p>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => {
                  setOpen(false);
                  setEditId(null);
                }}
                className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>
            <label className="grid gap-1 text-sm font-semibold">
              Horário
              <input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="h-12 rounded-xl border border-border bg-background px-3 text-base font-normal"
              />
            </label>
            <fieldset className="grid gap-1.5 text-sm font-semibold">
              <legend className="mb-1">Quantidade</legend>
              <div className="flex gap-2">
                {(Object.keys(VOLUME_LABEL) as UrineVolume[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={volume === v}
                    onClick={() => setVolume(v)}
                    className={`h-12 flex-1 rounded-xl border text-sm transition active:scale-95 ${volume === v ? "border-sky-500 bg-sky-500/15 font-bold" : "border-border font-medium"}`}
                  >
                    {VOLUME_LABEL[v]}
                  </button>
                ))}
              </div>
            </fieldset>
            {nowFeel && wx.now !== null ? (
              <p
                className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs"
                style={{ borderColor: `${nowFeel.color}55`, background: `${nowFeel.color}14` }}
              >
                <Thermometer size={15} style={{ color: nowFeel.color }} />
                <span>
                  Agora: <b>{Math.round(wx.now)} °C</b> · {nowFeel.label}. O clima será anotado com
                  o registro
                  {wx.now <= 22 ? "; tempo frio pode aumentar a vontade de urinar." : "."}
                </span>
              </p>
            ) : null}
            <div className="grid gap-1.5 text-sm font-semibold">
              <label htmlFor="urina-ml">Volume em ml (opcional)</label>
              <input
                id="urina-ml"
                inputMode="numeric"
                value={ml}
                onChange={(e) => setMl(e.target.value.replace(/\D/g, ""))}
                className="h-12 rounded-xl border border-border bg-background px-3 text-base font-normal"
                placeholder="ex.: 250"
              />
              <div className="flex flex-wrap gap-1.5">
                {[100, 200, 300, 400, 500].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMl(String(v))}
                    className={`h-9 rounded-full border px-3 text-xs font-semibold ${ml === String(v) ? "border-sky-500 bg-sky-500/15" : "border-border"}`}
                  >
                    {v} ml
                  </button>
                ))}
              </div>
            </div>
            <label className="grid gap-1 text-sm font-semibold">
              Observações (cor, aspecto…)
              <input
                maxLength={300}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-12 rounded-xl border border-border bg-background px-3 text-base font-normal"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setEditId(null);
                }}
                className="h-12 rounded-xl border border-border text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="h-12 rounded-xl bg-sky-600 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving ? "Salvando…" : editId ? "Salvar alteração" : "Confirmar"}
              </button>
            </div>
          </div>
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
      </div>

      <Collapsible
        title="Sobre estas orientações"
        summary="Não substitui avaliação médica"
        icon={<Info size={16} className="text-sky-500" />}
      >
        <p className="text-[12.5px] leading-snug text-muted-foreground">{MEDICAL_NOTE}</p>
      </Collapsible>

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

      <Collapsible
        title={`Registros ${range === "dia" ? "de hoje" : "dos últimos 7 dias"}`}
        summary={`${scope.length} ${scope.length === 1 ? "ida" : "idas"}`}
        icon={<Droplets size={16} className="text-sky-500" />}
        defaultOpen
      >
        {!scope.length ? (
          <EmptyState
            icon={Droplets}
            tone="#eab308"
            compact
            title="Nenhum registro ainda"
            text="Toque em “Registrar xixi agora” quando for ao banheiro."
          />
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
                {(l.temp_c ?? wx.at(l.at)) !== null ? (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums"
                    style={{
                      background: `${feel((l.temp_c ?? wx.at(l.at))!).color}22`,
                      color: feel((l.temp_c ?? wx.at(l.at))!).color,
                    }}
                    title={`Temperatura na hora do registro: ${feel((l.temp_c ?? wx.at(l.at))!).label}`}
                  >
                    <Thermometer size={11} /> {Math.round((l.temp_c ?? wx.at(l.at))!)}°
                  </span>
                ) : null}
                {lock.isLocked(l.at) ? (
                  <button
                    type="button"
                    aria-label="Registro trancado: liberar com a senha"
                    onClick={() => void lock.unlock()}
                    className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                  >
                    <Lock size={15} />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      aria-label="Editar registro"
                      onClick={() => void startEdit(l)}
                      className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-sky-500"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label="Excluir registro"
                      onClick={() => void askRemove(l)}
                      className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Collapsible>
    </section>
  );
}
