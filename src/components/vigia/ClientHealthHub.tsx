import { useMemo, useState } from "react";
import { BedDouble, Coffee, Droplets, Milk, Sparkles, Waves } from "lucide-react";
import { acreDateKey, acreTimeLabel } from "@/lib/acre-time";
import { feel, hourKey, useHourlyTemps } from "@/lib/weather";
import {
  aggregate,
  bucketDays,
  makeBuckets,
  rangeDays,
  rangeLabel,
  type RangeId,
} from "@/lib/health-ranges";
import { HealthChart, type ChartSeries } from "./HealthChart";
import { Collapsible, LimitsCard, RangeTabs } from "./HealthBits";
import { useHealthLimits } from "./useHealthLimits";
import { useHealthSeries } from "./useHealthSeries";

const nf = (v: number, d = 0) => v.toLocaleString("pt-BR", { maximumFractionDigits: d });
const go = (hash: string) => {
  window.location.hash = hash;
};

/** Média de b nos dias em que a se separa da mediana, para mostrar relações entre as métricas. */
function compareDays(
  a: Map<string, number>,
  b: Map<string, number>,
): { hi: number; lo: number; n: number } | null {
  const keys = [...a.keys()].filter((k) => b.has(k));
  if (keys.length < 6) return null;
  const sorted = keys.map((k) => a.get(k)!).sort((x, y) => x - y);
  const med = sorted[Math.floor(sorted.length / 2)];
  const hi = keys.filter((k) => a.get(k)! > med);
  const lo = keys.filter((k) => a.get(k)! <= med);
  if (hi.length < 3 || lo.length < 3) return null;
  const avg = (ks: string[]) => ks.reduce((s, k) => s + b.get(k)!, 0) / ks.length;
  return { hi: avg(hi), lo: avg(lo), n: keys.length };
}
const byDay = <T extends { at: string }>(
  items: T[],
  v: (x: T) => number,
  mode: "sum" | "avg" = "sum",
) => {
  const sum = new Map<string, number>();
  const cnt = new Map<string, number>();
  for (const it of items) {
    const k = acreDateKey(it.at);
    sum.set(k, (sum.get(k) ?? 0) + v(it));
    cnt.set(k, (cnt.get(k) ?? 0) + 1);
  }
  if (mode === "avg") for (const [k, s] of sum) sum.set(k, s / cnt.get(k)!);
  return sum;
};

export function ClientHealthHub({
  patientId,
  ownerId,
  only,
}: {
  patientId: string;
  ownerId: string;
  /** Mostra só o gráfico e os limites de uma área (usado dentro das telas de micção, cafeína e lactose). */
  only?: "miccao" | "cafeina" | "lactose";
}) {
  const [range, setRange] = useState<RangeId>("7d");
  const { limits } = useHealthLimits(patientId);
  const d = useHealthSeries(patientId, ownerId, range);
  const wx = useHourlyTemps(Math.min(92, rangeDays(range) + 1));
  const buckets = useMemo(() => makeBuckets(range), [range]);
  const days = rangeDays(range);

  const m = useMemo(() => {
    const liquids = aggregate(buckets, d.liquids, (x) => x.v);
    const urine = aggregate(buckets, d.urine);
    const urineMl = aggregate(buckets, d.urine, (x) => x.ml ?? 0);
    const caf = aggregate(buckets, d.caffeine, (x) => x.mg);
    const lac = aggregate(buckets, d.lactose, (x) => x.g);
    const sym = buckets.map((_, i) => {
      const bs = buckets[i];
      return d.symptoms.reduce((mx, s) => {
        const t = Date.parse(s.at);
        return t >= bs.startMs && t < bs.endMs ? Math.max(mx, s.severity) : mx;
      }, 0);
    });
    const sleepSum = aggregate(buckets, d.sleep, (x) => x.hours);
    const sleepN = aggregate(buckets, d.sleep);
    const sleep = sleepSum.map((v, i) => (sleepN[i] ? Math.round((v / sleepN[i]) * 10) / 10 : 0));
    return { liquids, urine, urineMl, caf, lac, sym, sleep };
  }, [buckets, d]);

  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const activeDays = (keys: string[]) => Math.max(1, new Set(keys).size);
  const dayCount = (items: { at: string }[]) => activeDays(items.map((i) => acreDateKey(i.at)));
  const tLiq = sum(m.liquids);
  const tUri = sum(m.urine);
  const tUriMl = sum(m.urineMl);
  const uriNoMl = d.urine.filter((u) => !u.ml).length;
  const lastUri = d.urine.length
    ? d.urine.reduce((a, b) => (Date.parse(b.at) > Date.parse(a.at) ? b : a))
    : null;
  const uriTemps = d.urine
    .map((u) => u.temp_c ?? wx.temps[hourKey(u.at)])
    .filter((t): t is number => t !== undefined && t !== null);
  const uriTempAvg = uriTemps.length ? uriTemps.reduce((a, b) => a + b, 0) / uriTemps.length : null;
  const uriTempMin = uriTemps.length ? Math.min(...uriTemps) : null;
  const lastUriWhen = lastUri
    ? (acreDateKey(lastUri.at) === acreDateKey(Date.now())
        ? "Hoje"
        : acreDateKey(lastUri.at).split("-").reverse().slice(0, 2).join("/")) +
      " às " +
      acreTimeLabel(lastUri.at)
    : "";
  const tCaf = sum(m.caf);
  const tLac = Math.round(sum(m.lac) * 10) / 10;
  const sleeps = d.sleep.length ? d.sleep.reduce((s, x) => s + x.hours, 0) / d.sleep.length : 0;
  const limitFor = (b: (typeof buckets)[number], per: number) =>
    range === "hoje" ? undefined : per * bucketDays(b);

  const insights = useMemo(() => {
    const out: { k: "miccao" | "cafeina"; t: string }[] = [];
    if (range === "hoje") return out;
    const caf = byDay(d.caffeine, (x) => x.mg);
    const uri = byDay(d.urine, () => 1);
    const liq = byDay(d.liquids, (x) => x.v);
    const sl = byDay(d.sleep, (x) => x.hours, "avg");
    const c1 = compareDays(liq, uri);
    if (c1)
      out.push({
        k: "miccao",
        t: `Nos dias em que você bebeu mais líquidos, foi ao banheiro ${nf(c1.hi, 1)} vezes, contra ${nf(c1.lo, 1)} nos dias de menos líquidos.`,
      });
    const c2 = compareDays(caf, uri);
    if (c2)
      out.push({
        k: "cafeina",
        t: `Com mais cafeína, foram ${nf(c2.hi, 1)} idas ao banheiro por dia; com menos, ${nf(c2.lo, 1)}. A cafeína aumenta um pouco a vontade de urinar.`,
      });
    // Temperatura média do dia (Acre) x idas ao banheiro.
    const tDay = new Map<string, number[]>();
    for (const [k, v] of Object.entries(wx.temps)) {
      const day = k.slice(0, 10);
      tDay.set(day, [...(tDay.get(day) ?? []), v]);
    }
    const tAvg = new Map([...tDay].map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]));
    const c4 = compareDays(tAvg, uri);
    if (c4)
      out.push({
        k: "miccao",
        t: `Nos dias mais frios você foi ao banheiro ${nf(c4.lo, 1)} vezes; nos dias mais quentes, ${nf(c4.hi, 1)}. O frio costuma aumentar a vontade de urinar.`,
      });
    // O sono da noite seguinte: desloca a data do sono um dia para trás.
    const prev = new Map<string, number>();
    for (const [k, v] of sl)
      prev.set(acreDateKey(Date.parse(`${k}T12:00:00-05:00`) - 86_400_000), v);
    const c3 = compareDays(caf, prev);
    if (c3)
      out.push({
        k: "cafeina",
        t: `Nas noites depois de dias com mais cafeína você dormiu ${nf(c3.hi, 1)} h; depois de dias com menos, ${nf(c3.lo, 1)} h.`,
      });
    return out;
  }, [d, range, wx.temps]);

  const liqUri: ChartSeries[] = [
    {
      id: "liq",
      label: "Líquidos",
      color: "#0ea5e9",
      unit: "ml",
      values: m.liquids,
      type: "bar",
      axis: "a",
      agg: "sum",
    },
    {
      id: "uri",
      label: "Idas ao banheiro",
      color: "#f59e0b",
      unit: "vezes",
      values: m.urine,
      type: "line",
      axis: "b",
      agg: "sum",
    },
  ];
  const uriChart: ChartSeries[] = [
    {
      id: "uml",
      label: "Volume urinado",
      color: "#f59e0b",
      unit: "ml",
      values: m.urineMl,
      type: "bar",
      axis: "a",
      agg: "sum",
    },
    {
      id: "uri",
      label: "Idas ao banheiro",
      color: "#0ea5e9",
      unit: "vezes",
      values: m.urine,
      type: "line",
      axis: "b",
      agg: "sum",
    },
  ];
  const cafSleep: ChartSeries[] = [
    {
      id: "caf",
      label: "Cafeína",
      color: "#d97706",
      unit: "mg",
      values: m.caf,
      type: "bar",
      axis: "a",
      agg: "sum",
      limit:
        range === "hoje"
          ? { value: limits.caffeineDayMg, label: `${limits.caffeineDayMg} mg/dia` }
          : undefined,
    },
    {
      id: "sono",
      label: "Sono",
      color: "#8b5cf6",
      unit: "h",
      values: m.sleep,
      type: "line",
      axis: "b",
      agg: "avg",
      digits: 1,
    },
  ];
  const lacSym: ChartSeries[] = [
    {
      id: "lac",
      label: "Lactose",
      color: "#10b981",
      unit: "g",
      values: m.lac,
      type: "bar",
      axis: "a",
      agg: "sum",
      limit:
        limits.lactoseIntolerant && range !== "hoje" && limits.lactoseDayG
          ? {
              value: limits.lactoseDayG * bucketDays(buckets[0]),
              label: `${limits.lactoseDayG} g/dia`,
            }
          : undefined,
    },
    {
      id: "sint",
      label: "Sintomas (0 a 3)",
      color: "#ef4444",
      unit: "",
      values: m.sym,
      type: "line",
      axis: "b",
      agg: "avg",
      digits: 1,
    },
  ];
  void limitFor;

  const tiles = [
    {
      icon: Droplets,
      tone: "from-sky-500/20",
      ring: "ring-sky-500/25",
      c: "#0ea5e9",
      label: "Líquidos",
      v: nf(tLiq),
      u: "ml",
      sub: `${nf(tLiq / dayCount(d.liquids))} ml/dia`,
      to: "hidratacao",
    },
    {
      icon: Waves,
      tone: "from-amber-500/20",
      ring: "ring-amber-500/25",
      c: "#f59e0b",
      label: "Micção",
      v: nf(tUri),
      u: "vezes",
      sub: `${nf(tUri / dayCount(d.urine), 1)} por dia`,
      to: "miccao",
    },
    {
      icon: Coffee,
      tone: "from-orange-500/20",
      ring: "ring-orange-500/25",
      c: "#d97706",
      label: "Cafeína",
      v: nf(tCaf),
      u: "mg",
      sub: `${nf(tCaf / dayCount(d.caffeine))} mg/dia · limite ${limits.caffeineDayMg}`,
      to: "cafeina",
    },
    {
      icon: Milk,
      tone: "from-emerald-500/20",
      ring: "ring-emerald-500/25",
      c: "#10b981",
      label: "Lactose",
      v: nf(tLac, 1),
      u: "g",
      sub: limits.lactoseIntolerant
        ? `${nf(tLac / dayCount(d.lactose), 1)} g/dia · limite ${limits.lactoseDayG}`
        : "acompanhamento opcional",
      to: "lactose",
    },
    {
      icon: BedDouble,
      tone: "from-violet-500/20",
      ring: "ring-violet-500/25",
      c: "#8b5cf6",
      label: "Sono",
      v: sleeps ? nf(sleeps, 1) : "—",
      u: sleeps ? "h/noite" : "",
      sub: `${d.sleep.length} noites`,
      to: "sono",
    },
  ];

  const shown = insights.filter((x) => !only || x.k === only);

  return (
    <section className="grid min-w-0 gap-3" aria-labelledby="hub-title">
      <h2 id="hub-title" className="sr-only">
        Saúde integrada
      </h2>
      <RangeTabs value={range} onChange={setRange} />
      <p className="-mt-1 text-[11px] text-muted-foreground">
        {rangeLabel(range)} ·{" "}
        {range === "hoje"
          ? "por hora"
          : range === "6m"
            ? "por semana"
            : range === "1a"
              ? "por mês"
              : "por dia"}
        {!d.loaded && " · carregando…"}
      </p>

      {!only && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {tiles.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => go(t.to)}
              className={`rounded-3xl bg-gradient-to-br ${t.tone} to-card p-3 text-left ring-1 ${t.ring} transition active:scale-[.97]`}
            >
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <t.icon size={13} style={{ color: t.c }} /> {t.label}
              </p>
              <p className="mt-1 text-2xl font-black leading-none tabular-nums">
                {t.v}
                <span className="ml-1 text-[11px] font-semibold text-muted-foreground">{t.u}</span>
              </p>
              <p className="mt-1.5 text-[10px] leading-tight text-muted-foreground">{t.sub}</p>
            </button>
          ))}
        </div>
      )}

      {(only === "cafeina" || only === "lactose" || !only) && (
        <LimitsCard
          limits={limits}
          focus={only === "cafeina" ? "caffeine" : only === "lactose" ? "lactose" : undefined}
        />
      )}

      {only === "miccao" && (
        <div className="grid grid-cols-3 gap-2" aria-label="Resumo da micção no período">
          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-3">
            <p className="text-[11px] font-semibold text-muted-foreground">Idas</p>
            <p className="mt-0.5 text-2xl font-black tabular-nums leading-none">{nf(tUri)}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {nf(tUri / dayCount(d.urine), 1)} por dia
            </p>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="text-[11px] font-semibold text-muted-foreground">Total urinado</p>
            <p className="mt-0.5 text-2xl font-black tabular-nums leading-none">
              {nf(tUriMl)}
              <span className="ml-0.5 text-[11px] font-semibold text-muted-foreground">ml</span>
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {uriNoMl ? `${uriNoMl} sem volume informado` : "todos com volume"}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-muted/40 p-3">
            <p className="text-[11px] font-semibold text-muted-foreground">Mais recente</p>
            <p className="mt-0.5 text-2xl font-black tabular-nums leading-none">
              {lastUri?.ml ? nf(lastUri.ml) : "—"}
              {lastUri?.ml ? (
                <span className="ml-0.5 text-[11px] font-semibold text-muted-foreground">ml</span>
              ) : null}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {lastUri ? lastUriWhen : "sem registro"}
            </p>
          </div>
        </div>
      )}
      {only === "miccao" && uriTempAvg !== null && (
        <div
          className="flex items-center gap-3 rounded-2xl border px-3 py-2.5"
          style={{
            borderColor: `${feel(uriTempAvg).color}55`,
            background: `${feel(uriTempAvg).color}12`,
          }}
        >
          <span
            className="grid size-9 shrink-0 place-items-center rounded-xl text-lg font-black"
            style={{ background: `${feel(uriTempAvg).color}25`, color: feel(uriTempAvg).color }}
          >
            {Math.round(uriTempAvg)}°
          </span>
          <p className="text-xs leading-snug text-muted-foreground">
            <b className="text-foreground">Clima nas idas ao banheiro:</b> média de{" "}
            {nf(uriTempAvg, 1)} °C ({feel(uriTempAvg).label})
            {uriTempMin !== null ? `, mínima de ${nf(uriTempMin, 1)} °C` : ""}. Cada registro mostra
            a temperatura da hora.
          </p>
        </div>
      )}
      {(!only || only === "miccao") && (
        <HealthChart
          key={`${only ?? "all"}-${range}`}
          title={only === "miccao" ? "Volume e idas ao banheiro" : "Líquidos e idas ao banheiro"}
          hint={
            only === "miccao"
              ? "Quanto você urinou (ml) e quantas vezes foi ao banheiro."
              : "O que você bebeu e quantas vezes foi ao banheiro."
          }
          buckets={buckets}
          series={only === "miccao" ? uriChart : liqUri}
        />
      )}
      {(!only || only === "cafeina") && (
        <HealthChart
          key={`${only ?? "all"}-${range}`}
          title="Cafeína e sono"
          hint="Cafeína ingerida (bebidas, chás e refeições) junto com as horas dormidas."
          buckets={buckets}
          series={cafSleep}
        />
      )}
      {(!only || only === "lactose") && (
        <HealthChart
          key={`${only ?? "all"}-${range}`}
          title="Lactose e sintomas"
          hint="Lactose dos laticínios e a intensidade dos sintomas que você registrou."
          buckets={buckets}
          series={lacSym}
        />
      )}

      {only !== "lactose" && (
        <Collapsible
          title="O que seus dados mostram"
          summary={
            shown.length
              ? `${shown.length} ${shown.length === 1 ? "achado" : "achados"}`
              : "Ainda sem dados suficientes"
          }
          icon={<Sparkles size={16} className="text-amber-500" />}
        >
          {shown.length ? (
            <ul className="grid gap-2 text-sm">
              {shown.map((x) => (
                <li key={x.t} className="rounded-2xl bg-muted/50 p-3">
                  {x.t}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Registre por pelo menos 6 dias e escolha 7 dias ou mais para o app cruzar seus dados.
            </p>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Comparações simples dos seus registros, não diagnóstico.
          </p>
        </Collapsible>
      )}
    </section>
  );
}
