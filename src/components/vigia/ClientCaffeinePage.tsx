/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { Coffee, Info, Lock, Moon, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { acreDateKey, acreTimeLabel } from "@/lib/acre-time";
import {
  CAFFEINE_NOTE,
  curfewHour,
  fmtHour,
  residualMg,
  sleepCorrelation,
  totalMg,
  totalMl,
  type CaffeineLog,
} from "@/lib/caffeine";
import { Collapsible } from "./HealthBits";
import { useDialog } from "@/lib/dialog";
import { useRecordLock } from "./useRecordLock";
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

  const pct = Math.min(100, Math.round((total / Math.max(1, limit)) * 100));
  const over = total > limit;
  const R = 54;
  const C = 2 * Math.PI * R;
  const ringColor = over ? "#ef4444" : pct > 75 ? "#f59e0b" : "#10b981";
  const peak = Math.max(50, ...hourly);
  const cw = 340;
  const ch = 150;
  const px = (h: number) => 8 + (h / 23) * (cw - 16);
  const py = (v: number) => ch - 22 - (v / peak) * (ch - 40);
  const curve = hourly
    .map((v, h) => `${h ? "L" : "M"}${px(h).toFixed(1)},${py(v).toFixed(1)}`)
    .join(" ");
  const nowHr = Math.min(23, Math.floor(nowH));

  const lock = useRecordLock();
  const dialog = useDialog();
  async function guardedRemove(r: { id: string; at: string }) {
    if (lock.isLocked(r.at) && !(await lock.unlock())) return;
    const ok = await dialog.confirm(
      "Excluir este registro?",
      "Não dá para desfazer.",
      true,
      "Excluir",
    );
    if (ok) await remove(r.id);
  }

  return (
    <section className="grid min-w-0 gap-3" aria-labelledby="cafe-title">
      <h2 id="cafe-title" className="sr-only">
        Cafeína e sono
      </h2>

      <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-amber-500/15 via-card to-card p-4">
        <div className="flex items-center gap-4">
          <div className="relative size-32 shrink-0">
            <svg viewBox="0 0 130 130" className="size-full -rotate-90" aria-hidden="true">
              <circle cx="65" cy="65" r={R} fill="none" strokeWidth="11" className="stroke-muted" />
              <circle
                cx="65"
                cy="65"
                r={R}
                fill="none"
                strokeWidth="11"
                strokeLinecap="round"
                stroke={ringColor}
                strokeDasharray={C}
                strokeDashoffset={C * (1 - pct / 100)}
                style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.23,1,0.32,1)" }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="text-3xl font-black leading-none tabular-nums">{total}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">de {limit} mg</p>
              </div>
            </div>
          </div>
          <div className="grid min-w-0 flex-1 gap-2">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <Coffee size={12} /> Hoje
              </p>
              <p className="text-sm font-bold">
                {over ? "Acima do limite" : left <= 0 ? "No limite" : `Restam ${left} mg`}
              </p>
              <p className="text-[11px] text-muted-foreground">{totalMl(todayLogs)} ml de bebida</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">No organismo agora</p>
              <p className="text-sm font-bold tabular-nums">{residualMg(todayLogs, nowMs)} mg</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                <Moon size={11} /> Última dose até
              </p>
              <p className="text-sm font-bold tabular-nums">{fmtHour(cutoff)}</p>
            </div>
          </div>
        </div>
        <p
          className={`mt-3 rounded-2xl p-3 text-[13px] leading-snug ${over || pastCutoff ? "bg-amber-500/15" : "bg-muted/50"}`}
        >
          {left <= 0
            ? "Você chegou ao limite de hoje; evite mais cafeína."
            : `Até ${suggestMg} mg por vez, de preferência até ${fmtHour(cutoff)}.`}
          {pastCutoff && " Já passou do horário de corte: pode atrapalhar o sono."}
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Lock size={11} aria-hidden="true" /> Limite calculado do seu perfil. A cafeína é
          detectada sozinha ao registrar bebidas e refeições.
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-4">
        <h3 className="text-sm font-bold">Cafeína no organismo hoje</h3>
        <p className="mb-2 text-[11px] text-muted-foreground">
          Estimativa hora a hora (meia-vida de ~5 h). A linha tracejada é o horário atual.
        </p>
        <svg
          viewBox={`0 0 ${cw} ${ch}`}
          className="w-full"
          role="img"
          aria-label="Cafeína estimada no organismo ao longo do dia"
        >
          <defs>
            <linearGradient id="cafg" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((f) => (
            <line
              key={f}
              x1="8"
              x2={cw - 8}
              y1={py(peak * f)}
              y2={py(peak * f)}
              className="stroke-border"
              strokeDasharray="3 4"
            />
          ))}
          <path d={`${curve} L${px(23)},${py(0)} L${px(0)},${py(0)} Z`} fill="url(#cafg)" />
          <path d={curve} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinejoin="round" />
          {intake.map((v, h) =>
            v > 0 ? (
              <g key={h}>
                <line
                  x1={px(h)}
                  x2={px(h)}
                  y1={py(0)}
                  y2={py(0) - 10}
                  stroke="#b45309"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </g>
            ) : null,
          )}
          <line
            x1={px(nowHr)}
            x2={px(nowHr)}
            y1="8"
            y2={py(0)}
            stroke="#64748b"
            strokeDasharray="4 4"
          />
          {[0, 6, 12, 18, 23].map((h) => (
            <text
              key={h}
              x={px(h)}
              y={ch - 6}
              textAnchor="middle"
              fontSize="10.5"
              className="fill-muted-foreground"
            >
              {h}h
            </text>
          ))}
          <text x="10" y="12" fontSize="10.5" className="fill-muted-foreground">
            {Math.round(peak)} mg
          </text>
        </svg>
        <p className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <i className="inline-block h-0.5 w-4 rounded bg-amber-500" /> no organismo
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="inline-block h-2.5 w-1 rounded bg-amber-700" /> dose registrada
          </span>
        </p>
      </div>

      <ClientHealthHub patientId={patientId} ownerId={ownerId} only="cafeina" />

      <Collapsible
        title="Registros de hoje"
        summary={`${todayLogs.length} ${todayLogs.length === 1 ? "registro" : "registros"} · ${total} mg`}
        icon={<Coffee size={16} className="text-amber-500" />}
        defaultOpen
      >
        {!todayLogs.length ? (
          <p className="text-sm text-muted-foreground">
            Nada hoje. Registre bebidas ou refeições e a cafeína entra sozinha.
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
                    onClick={() => void guardedRemove(l)}
                    className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Collapsible>

      <Collapsible
        title="Registrar manualmente"
        summary="Só para fontes que o app não reconhece"
        icon={<Coffee size={16} className="text-muted-foreground" />}
      >
        <div className="grid gap-2 sm:grid-cols-[1fr_6rem_6rem_auto]">
          <input
            aria-label="Nome da fonte"
            placeholder="Fonte"
            value={custom.source}
            onChange={(e) => setCustom({ ...custom, source: e.target.value })}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <input
            aria-label="Cafeína em mg"
            inputMode="numeric"
            placeholder="mg"
            value={custom.mg}
            onChange={(e) => setCustom({ ...custom, mg: e.target.value.replace(/\D/g, "") })}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <input
            aria-label="Volume em ml"
            inputMode="numeric"
            placeholder="ml"
            value={custom.ml}
            onChange={(e) => setCustom({ ...custom, ml: e.target.value.replace(/\D/g, "") })}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <button
            type="button"
            disabled={saving || !custom.mg}
            onClick={() => void addCustom()}
            className="h-11 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white disabled:opacity-50"
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
      </Collapsible>

      <Collapsible
        title="Cafeína e sono"
        summary={
          corr.rows.length < 3
            ? "Precisa de 3 noites com dados"
            : corr.late.quality !== null && corr.calm.quality !== null
              ? `Qualidade ${fmtCmp(corr.late.quality)} com cafeína tarde, ${fmtCmp(corr.calm.quality)} nas demais`
              : "Comparação das suas noites"
        }
        icon={<Moon size={16} className="text-violet-500" />}
      >
        {corr.rows.length < 3 ? (
          <p className="text-sm text-muted-foreground">
            Registre cafeína e o sono por alguns dias para ver se há relação.
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
                    <td className="py-1.5 pr-3">Cafeína tarde ou alta</td>
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
              “Tarde ou alta” = última dose depois das 16h ou mais de 300 mg no dia. Comparação
              simples; outros fatores também afetam o sono.
            </p>
          </>
        )}
      </Collapsible>

      <Collapsible
        title="Sobre a cafeína"
        summary="Como o limite é calculado"
        icon={<Info size={16} className="text-sky-500" />}
      >
        <p className="text-[12.5px] leading-snug text-muted-foreground">{CAFFEINE_NOTE}</p>
      </Collapsible>
    </section>
  );
}
