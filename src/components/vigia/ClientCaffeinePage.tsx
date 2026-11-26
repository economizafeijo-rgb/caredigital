/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { Coffee, Info, Lock, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { acreDateKey, acreTimeLabel } from "@/lib/acre-time";
import {
  CAFFEINE_NOTE,
  CAFFEINE_SOURCES,
  curfewHour,
  fmtHour,
  residualMg,
  sleepCorrelation,
  totalMg,
  totalMl,
  type CaffeineLog,
  type CaffeineSource,
} from "@/lib/caffeine";
import { HourBars } from "./HourBars";
import { useCareLogs } from "./useCareLogs";
import { useIntakeRecords } from "./useIntakeRecords";
import { useHealthLimits } from "./useHealthLimits";
import { ClientHealthHub } from "./ClientHealthHub";

const COLS = "id,at,source,ml,mg";

export function ClientCaffeinePage({ patientId, ownerId }: { patientId: string; ownerId: string }) {
  const {
    loaded,
    remote,
    error,
    add: addRaw,
    remove: removeRaw,
  } = useCareLogs<CaffeineLog>("care_caffeine_logs", COLS, patientId, ownerId);
  const add = async (row: Parameters<typeof addRaw>[0]) => {
    const ok = await addRaw(row);
    window.dispatchEvent(new Event("nv-intake-changed"));
    return ok;
  };
  const remove = async (id: string) => {
    await removeRaw(id);
    window.dispatchEvent(new Event("nv-intake-changed"));
  };
  const auto = useIntakeRecords(patientId, ownerId, 30);
  // Soma automática: bebidas, refeições, porções e registros manuais, sem duplicar.
  const all = useMemo<CaffeineLog[]>(
    () => auto.caffeine.map((r) => ({ id: r.id, at: r.at, source: r.label, ml: r.ml, mg: r.mg })),
    [auto.caffeine],
  );
  const [sleeps, setSleeps] = useState<
    { bed_at: string; wake_at: string; quality: number; awakenings: number }[]
  >([]);
  const { limits } = useHealthLimits(patientId);
  // Limite calculado do perfil e travado: não há campo para alterar.
  const limit = limits.caffeineDayMg;
  const [custom, setCustom] = useState<{ source: string; mg: string; ml: string }>({
    source: "",
    mg: "",
    ml: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    void (supabase as any)
      .from("care_sleep_logs")
      .select("bed_at,wake_at,quality,awakenings")
      .eq("patient_id", patientId)
      .eq("owner_id", ownerId)
      .gte("sleep_date", since)
      .then((r: any) => active && !r.error && setSleeps(r.data ?? []));
    return () => {
      active = false;
    };
  }, [patientId, ownerId]);

  const today = acreDateKey();
  const nowMs = Date.now();
  const todayLogs = useMemo(() => all.filter((l) => acreDateKey(l.at) === today), [all, today]);
  const total = totalMg(todayLogs);
  const left = Math.max(0, limit - total);
  const bedHour = useMemo(() => {
    const hs = sleeps.map((s) => {
      const p = acreTimeLabel(s.bed_at).split(":");
      const h = Number(p[0]) + Number(p[1]) / 60;
      return h < 12 ? h + 24 : h;
    });
    const avg = hs.length ? hs.reduce((a, b) => a + b, 0) / hs.length : 22;
    return avg;
  }, [sleeps]);
  const suggestMg = Math.min(100, left);
  const cutoff = curfewHour(bedHour, Math.max(suggestMg, 50));
  const nowH =
    Number(acreTimeLabel(nowMs).slice(0, 2)) + Number(acreTimeLabel(nowMs).slice(3, 5)) / 60;
  const pastCutoff = nowH > cutoff % 24 && nowH < 24 && cutoff < 24 + 1;

  const hourly = Array.from({ length: 24 }, (_, h) => {
    const at = new Date(`${today}T${String(h).padStart(2, "0")}:00:00-05:00`).getTime();
    return residualMg(todayLogs, at);
  });
  const intake = Array<number>(24).fill(0);
  for (const l of todayLogs) intake[Number(acreTimeLabel(l.at).slice(0, 2))] += l.mg;

  const corr = useMemo(() => sleepCorrelation(all, sleeps), [all, sleeps]);

  async function addSource(s: CaffeineSource, ml?: number, mg?: number) {
    if (saving) return;
    setSaving(true);
    await add({ at: new Date().toISOString(), source: s.label, ml: ml ?? s.ml, mg: mg ?? s.mg });
    setSaving(false);
  }
  async function addCustom() {
    const mg = Number(custom.mg);
    const ml = custom.ml ? Number(custom.ml) : null;
    const name = custom.source.trim() || "Outra fonte";
    if (!mg || mg < 1 || mg > 1000) return;
    setSaving(true);
    const ok = await add({
      at: new Date().toISOString(),
      source: name.slice(0, 60),
      ml,
      mg: Math.round(mg),
    });
    setSaving(false);
    if (ok) setCustom({ source: "", mg: "", ml: "" });
  }
  const fmtCmp = (v: number | null, u = "") =>
    v === null ? "–" : `${String(v).replace(".", ",")}${u}`;

  return (
    <section className="grid min-w-0 gap-3" aria-labelledby="cafe-title">
      <h2 id="cafe-title" className="sr-only">
        Cafeína e sono
      </h2>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-2 text-sm font-bold">Registrar agora</h3>
        <div className="flex flex-wrap gap-2">
          {CAFFEINE_SOURCES.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={saving}
              onClick={() => void addSource(s)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-muted disabled:opacity-60"
            >
              <Coffee size={14} aria-hidden="true" /> {s.label}
              <span className="text-xs font-normal text-muted-foreground">
                {s.ml} ml · {s.mg} mg
              </span>
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_6rem_6rem_auto]">
          <input
            aria-label="Nome da fonte"
            placeholder="Outra fonte"
            value={custom.source}
            onChange={(e) => setCustom({ ...custom, source: e.target.value })}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            aria-label="Cafeína em mg"
            inputMode="numeric"
            placeholder="mg"
            value={custom.mg}
            onChange={(e) => setCustom({ ...custom, mg: e.target.value.replace(/\D/g, "") })}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            aria-label="Volume em ml"
            inputMode="numeric"
            placeholder="ml"
            value={custom.ml}
            onChange={(e) => setCustom({ ...custom, ml: e.target.value.replace(/\D/g, "") })}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <button
            type="button"
            disabled={saving || !custom.mg}
            onClick={() => void addCustom()}
            className="h-10 rounded-lg bg-amber-600 px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            Registrar
          </button>
        </div>
        {!remote && loaded && (
          <p className="mt-2 text-xs text-muted-foreground">
            Salvo só neste aparelho por enquanto.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Hoje", `${total} mg`, `${totalMl(todayLogs)} ml de bebida`],
          ["Restam", `${left} mg`, `limite ${limit} mg`],
          ["No organismo agora", `${residualMg(todayLogs, nowMs)} mg`, "estimativa"],
          ["Horário de corte", fmtHour(cutoff), `dormir ~${fmtHour(bedHour)}`],
        ].map(([k, v, sub]) => (
          <div key={k} className="rounded-xl border border-border bg-card p-3">
            <dt className="text-[11px] text-muted-foreground">{k}</dt>
            <dd className="mt-0.5 text-lg font-extrabold tabular-nums">{v}</dd>
            <p className="text-[11px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </dl>

      <div
        className={`rounded-2xl border p-4 text-[13px] leading-snug ${total > limit || pastCutoff ? "border-amber-500/50 bg-amber-500/10" : "border-border bg-card"}`}
      >
        <p>
          <b>Dose e horário sugeridos:</b>{" "}
          {left <= 0
            ? "você já chegou ao limite de hoje; evite mais cafeína."
            : `até ${suggestMg} mg por vez (cerca de ${Math.round((suggestMg / 90) * 150)} ml de café coado), de preferência até ${fmtHour(cutoff)}.`}
          {pastCutoff && " Já passou do horário de corte: tomar agora pode atrapalhar o sono."}
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock size={12} aria-hidden="true" /> Limite diário de {limit} mg, calculado do seu
          perfil.
        </p>
        <p className="mt-2 flex gap-1.5 text-[11.5px] text-muted-foreground">
          <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          {CAFFEINE_NOTE}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold">Consumo e cafeína no organismo (hoje)</h3>
        <HourBars
          a={hourly}
          b={intake}
          aLabel="No organismo (mg, estimado)"
          bLabel="Dose registrada (mg)"
          aColor="#f59e0b"
          bColor="#b45309"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-2 text-sm font-bold">Cafeína × sono</h3>
        {corr.rows.length < 3 ? (
          <p className="text-sm text-muted-foreground">
            Registre cafeína e o sono por alguns dias para ver se há relação. É preciso ao menos 3
            noites com dados.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[22rem] text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Noites</th>
                    <th className="pr-3 font-medium">Nº</th>
                    <th className="pr-3 font-medium">Qualidade</th>
                    <th className="pr-3 font-medium">Horas</th>
                    <th className="font-medium">Despertares</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border">
                    <td className="py-1.5 pr-3">Com cafeína tarde ou alta</td>
                    <td className="pr-3">{corr.late.n}</td>
                    <td className="pr-3">{fmtCmp(corr.late.quality)}</td>
                    <td className="pr-3">{fmtCmp(corr.late.hours, " h")}</td>
                    <td>{fmtCmp(corr.late.awakenings)}</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="py-1.5 pr-3">Demais noites</td>
                    <td className="pr-3">{corr.calm.n}</td>
                    <td className="pr-3">{fmtCmp(corr.calm.quality)}</td>
                    <td className="pr-3">{fmtCmp(corr.calm.hours, " h")}</td>
                    <td>{fmtCmp(corr.calm.awakenings)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[12px] text-muted-foreground">
              “Tarde ou alta” = última dose depois das 16h ou mais de 300 mg no dia. É só uma
              comparação dos seus registros; outros fatores também afetam o sono.
              {corr.late.quality !== null &&
                corr.calm.quality !== null &&
                corr.late.quality < corr.calm.quality &&
                " Nas suas noites com cafeína tarde ou alta, a qualidade ficou menor."}
            </p>
          </>
        )}
      </div>

      <ClientHealthHub patientId={patientId} ownerId={ownerId} only="cafeina" />

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-2 text-sm font-bold">Registros de hoje</h3>
        {!todayLogs.length ? (
          <p className="text-sm text-muted-foreground">
            Nada registrado hoje. Use os botões acima.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {todayLogs.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-12 shrink-0 tabular-nums text-muted-foreground">
                  {acreTimeLabel(l.at)}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {l.source}
                  {l.ml ? ` · ${l.ml} ml` : ""} · {l.mg} mg
                </span>
                {l.id.includes("-c-") ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    automático
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-label="Excluir registro"
                    onClick={() => void remove(l.id)}
                    className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
