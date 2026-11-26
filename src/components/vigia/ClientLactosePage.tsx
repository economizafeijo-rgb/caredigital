import { useMemo, useState } from "react";
import { Info, Milk, Trash2 } from "lucide-react";
import { acreDateKey, acreTimeLabel } from "@/lib/acre-time";
import { LACTOSE_THRESHOLDS as T } from "@/lib/intake-detect";
import { useCareLogs } from "./useCareLogs";
import { useIntakeRecords, type LactoseRecord } from "./useIntakeRecords";

type SymptomLog = { id: string; at: string; severity: number; symptoms: string; notes: string };
const COLS = "id,at,severity,symptoms,notes";
const LIMIT_KEY = "nv-lactose-limit";
const SYMPTOMS = ["Inchaço", "Gases", "Cólica", "Diarreia", "Náusea", "Ronco na barriga"];
const SEVERITY = ["Sem sintomas", "Leve", "Moderado", "Forte"];
const GREEN = "#059669";
const AMBER = "#f59e0b";
const RED = "#ef4444";

const TIPS = [
  "Intolerância não é alergia: o corpo não digere a lactose, mas muita gente tolera uma parte. Cerca de 12 g (um copo de leite) de uma vez costuma ser bem tolerado.",
  "Fracione: pequenas doses ao longo do dia pesam menos que um copo grande de uma vez. Leite junto com comida sólida desce mais devagar.",
  "Queijos curados (parmesão, prato, cheddar) têm pouquíssima lactose; leite, requeijão, creme de leite e leite condensado têm bastante.",
  "Iogurte e kefir com culturas vivas costumam ser mais fáceis de tolerar que o leite.",
  "Versões “sem lactose” têm 0 g e o mesmo cálcio. Leia o rótulo: soro de leite, sólidos do leite e creme de leite também trazem lactose.",
  "Se cortar laticínios, garanta cálcio e vitamina D por outras fontes (sardinha, couve, tofu, fortificados) e converse com nutricionista.",
  "Os sintomas surgem entre 30 minutos e 2 horas depois. Registre como se sentiu: o app compara com a lactose ingerida antes e estima o seu limite.",
];

type Dose = { at: string; g: number; items: LactoseRecord[] };
/** Itens com menos de 60 min entre si contam como uma só refeição. */
function groupDoses(recs: LactoseRecord[]): Dose[] {
  const sorted = [...recs].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const out: Dose[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && Date.parse(r.at) - Date.parse(last.items[last.items.length - 1].at) < 3_600_000) {
      last.g += r.g;
      last.items.push(r);
    } else out.push({ at: r.at, g: r.g, items: [r] });
  }
  return out.map((d) => ({ ...d, g: Math.round(d.g * 10) / 10 }));
}
const tone = (g: number) => (g > T.perMealHigh ? RED : g > T.perMealOk ? AMBER : GREEN);

export function ClientLactosePage({ patientId, ownerId }: { patientId: string; ownerId: string }) {
  const intake = useIntakeRecords(patientId, ownerId, 30);
  const { items, remote, error, add, remove } = useCareLogs<SymptomLog>(
    "care_lactose_logs",
    COLS,
    patientId,
    ownerId,
  );
  const [limit, setLimit] = useState(() => {
    try {
      return Number(localStorage.getItem(LIMIT_KEY)) || T.dayOk;
    } catch {
      return T.dayOk;
    }
  });
  const [range, setRange] = useState<1 | 7 | 30>(1);
  const [pick, setPick] = useState<number | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [sev, setSev] = useState(1);
  const [saving, setSaving] = useState(false);
  const today = acreDateKey();

  const days = useMemo(
    () =>
      Array.from({ length: range }, (_, i) =>
        acreDateKey(Date.now() - (range - 1 - i) * 86_400_000),
      ),
    [range],
  );
  const todayRecs = intake.lactose.filter((r) => acreDateKey(r.at) === today);
  const todayDoses = useMemo(() => groupDoses(todayRecs), [todayRecs]);
  const todayG = Math.round(todayRecs.reduce((s, r) => s + r.g, 0) * 10) / 10;
  const biggest = todayDoses.reduce((m, d) => Math.max(m, d.g), 0);
  const perDay = useMemo(
    () =>
      days.map((d) => {
        const recs = intake.lactose.filter((r) => acreDateKey(r.at) === d);
        const sym = items.filter((s) => acreDateKey(s.at) === d && s.severity > 0);
        return {
          d,
          g: Math.round(recs.reduce((s, r) => s + r.g, 0) * 10) / 10,
          sev: sym.reduce((m, s) => Math.max(m, s.severity), 0),
        };
      }),
    [days, intake.lactose, items],
  );

  /** Lactose das 4 h anteriores a cada registro com sintomas × sem sintomas. */
  const personal = useMemo(() => {
    const before = (at: string) =>
      groupDoses(
        intake.lactose.filter((r) => {
          const dt = Date.parse(at) - Date.parse(r.at);
          return dt >= 0 && dt <= 4 * 3_600_000;
        }),
      ).reduce((m, d) => Math.max(m, d.g), 0);
    const bad = items
      .filter((s) => s.severity > 0)
      .map((s) => before(s.at))
      .filter((g) => g > 0);
    const ok = items
      .filter((s) => s.severity === 0)
      .map((s) => before(s.at))
      .filter((g) => g > 0);
    const med = (a: number[]) => {
      const s = [...a].sort((x, y) => x - y);
      return s.length ? s[Math.floor(s.length / 2)] : null;
    };
    return { bad: med(bad), ok: med(ok), nBad: bad.length, nOk: ok.length };
  }, [intake.lactose, items]);

  const status =
    todayG === 0
      ? { c: GREEN, t: "Nenhum laticínio com lactose hoje." }
      : todayG <= limit && biggest <= T.perMealOk
        ? { c: GREEN, t: "Dentro do seu limite. Bom ritmo." }
        : todayG <= T.dayHigh && biggest <= T.perMealHigh
          ? {
              c: AMBER,
              t: "Atenção: perto do limite. Prefira versões sem lactose no resto do dia.",
            }
          : { c: RED, t: "Acima do que a maioria tolera. Prefira sem lactose até amanhã." };

  async function saveSymptom(none: boolean) {
    setSaving(true);
    const ok = await add({
      at: new Date().toISOString(),
      severity: none ? 0 : sev,
      symptoms: none ? "" : sel.join(", "),
      notes: "",
    });
    setSaving(false);
    if (ok) {
      setSel([]);
      window.dispatchEvent(new Event("nv-intake-changed"));
    }
  }

  const W = 320;
  const H = 140;
  const L = 30;
  const R = 8;
  const Tp = 10;
  const B = 20;
  const iw = W - L - R;
  const ih = H - Tp - B;
  const yMax = Math.max(
    range === 1 ? T.perMealHigh * 1.15 : limit * 1.4,
    ...(range === 1 ? todayDoses.map((d) => d.g) : perDay.map((p) => p.g)),
  );
  const y = (g: number) => Tp + ih - (g / yMax) * ih;
  const dayStart = Date.parse(`${today}T00:00:00-05:00`);
  const xAt = (f: number) => L + f * iw;
  const detail =
    pick === null
      ? range === 1
        ? "Toque numa barra para ver a refeição. Cada barra é uma refeição (itens com menos de 1 h de intervalo)."
        : `Média ${Math.round((perDay.reduce((s, p) => s + p.g, 0) / range) * 10) / 10} g/dia. Toque numa barra para ver o dia.`
      : range === 1
        ? `${acreTimeLabel(todayDoses[pick].at)} · ${todayDoses[pick].g} g: ${todayDoses[pick].items.map((i) => `${i.label} ${i.g} g`).join(", ")}`
        : `${perDay[pick].d.slice(8)}/${perDay[pick].d.slice(5, 7)} · ${perDay[pick].g} g de lactose${perDay[pick].sev ? ` · sintomas ${SEVERITY[perDay[pick].sev].toLowerCase()}` : ""}`;
  const listRecs = intake.lactose
    .filter((r) => days.includes(acreDateKey(r.at)))
    .filter((r) => (pick !== null && range > 1 ? acreDateKey(r.at) === perDay[pick].d : true));

  return (
    <section className="grid min-w-0 gap-3" aria-labelledby="lactose-title">
      <h2 id="lactose-title" className="sr-only">
        Gestão de lactose
      </h2>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Lactose hoje</p>
            <p className="text-3xl font-black tabular-nums" style={{ color: status.c }}>
              {todayG} <span className="text-base font-semibold">g</span>
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Limite do dia: {limit} g</p>
            <p>
              Maior refeição: {biggest} g (ideal até {T.perMealOk} g)
            </p>
          </div>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`${todayG} de ${limit} gramas`}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, (todayG / limit) * 100)}%`, background: status.c }}
          />
        </div>
        <p className="mt-2 text-sm font-medium">{status.t}</p>
        <label className="mt-2 flex items-center gap-2 text-xs">
          Meu limite diário (g)
          <input
            type="number"
            min={2}
            max={60}
            value={limit}
            onChange={(e) => {
              const v = Math.min(60, Math.max(2, Number(e.target.value) || T.dayOk));
              setLimit(v);
              try {
                localStorage.setItem(LIMIT_KEY, String(v));
              } catch {
                /* ok */
              }
            }}
            className="h-8 w-16 rounded-lg border border-border bg-background px-2"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">
            {range === 1 ? "Lactose por refeição" : "Lactose por dia"}
          </h3>
          <div className="flex gap-1" role="group" aria-label="Período da lactose">
            {([1, 7, 30] as const).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                onClick={() => {
                  setRange(r);
                  setPick(null);
                }}
                className={`h-8 rounded-lg px-3 text-xs ${range === r ? "bg-emerald-600 font-bold text-white" : "border border-border"}`}
              >
                {r === 1 ? "Hoje" : `${r} dias`}
              </button>
            ))}
          </div>
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full select-none"
          role="img"
          aria-label="Gráfico de lactose"
        >
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line
                x1={L}
                x2={W - R}
                y1={y(yMax * f)}
                y2={y(yMax * f)}
                stroke="currentColor"
                strokeOpacity=".12"
              />
              <text
                x={L - 4}
                y={y(yMax * f) + 3}
                textAnchor="end"
                fontSize="8"
                fill="currentColor"
                opacity=".6"
              >
                {Math.round(yMax * f)}
              </text>
            </g>
          ))}
          <line
            x1={L}
            x2={W - R}
            y1={y(range === 1 ? T.perMealOk : limit)}
            y2={y(range === 1 ? T.perMealOk : limit)}
            stroke={AMBER}
            strokeDasharray="4 3"
          />
          <text
            x={W - R}
            y={y(range === 1 ? T.perMealOk : limit) - 2}
            textAnchor="end"
            fontSize="8"
            fill={AMBER}
          >
            {range === 1 ? `${T.perMealOk} g por refeição` : `limite ${limit} g`}
          </text>
          {range === 1
            ? todayDoses.map((d, i) => {
                const f = (Date.parse(d.at) - dayStart) / 86_400_000;
                return (
                  <rect
                    key={d.at}
                    x={xAt(f) - 6}
                    y={y(d.g)}
                    width="12"
                    height={Math.max(0, Tp + ih - y(d.g))}
                    rx="2"
                    fill={tone(d.g)}
                    opacity={pick === i ? 1 : 0.8}
                    tabIndex={0}
                    role="button"
                    aria-label={`${acreTimeLabel(d.at)}, ${d.g} gramas`}
                    onClick={() => setPick(i)}
                    onKeyDown={(e) => e.key === "Enter" && setPick(i)}
                    style={{ cursor: "pointer" }}
                  />
                );
              })
            : perDay.map((p, i) => {
                const bw = Math.max(2, Math.min(18, iw / perDay.length - 2));
                const cx = xAt(perDay.length === 1 ? 0.5 : i / (perDay.length - 1));
                return (
                  <g key={p.d} onClick={() => setPick(i)} style={{ cursor: "pointer" }}>
                    <rect
                      x={cx - bw / 2}
                      y={y(p.g)}
                      width={bw}
                      height={Math.max(0, Tp + ih - y(p.g))}
                      rx="2"
                      fill={p.g > limit ? RED : GREEN}
                      opacity={pick === i ? 1 : 0.8}
                    />
                    <rect
                      x={cx - bw / 2 - 1}
                      y={Tp}
                      width={bw + 2}
                      height={ih}
                      fill="transparent"
                    />
                    {p.sev > 0 && <circle cx={cx} cy={H - B + 8} r={2 + p.sev} fill={RED} />}
                  </g>
                );
              })}
          {range === 1 &&
            [0, 6, 12, 18, 24].map((h) => (
              <text
                key={h}
                x={xAt(h / 24)}
                y={H - 6}
                textAnchor="middle"
                fontSize="8"
                fill="currentColor"
                opacity=".6"
              >
                {h}h
              </text>
            ))}
          {range > 1 &&
            [0, perDay.length - 1].map((i) => (
              <text
                key={i}
                x={xAt(perDay.length === 1 ? 0.5 : i / (perDay.length - 1))}
                y={H - 6}
                textAnchor={i === 0 ? "start" : "end"}
                fontSize="8"
                fill="currentColor"
                opacity=".6"
              >
                {perDay[i].d.slice(8)}/{perDay[i].d.slice(5, 7)}
              </text>
            ))}
        </svg>
        <p className="mt-1 min-h-5 text-xs text-muted-foreground" aria-live="polite">
          {detail}
          {range > 1 && " Pontos vermelhos = dias com sintomas."}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-2 text-sm font-bold">Como você se sentiu?</h3>
        <div className="flex flex-wrap gap-1.5">
          {SYMPTOMS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={sel.includes(s)}
              onClick={() => setSel((v) => (v.includes(s) ? v.filter((x) => x !== s) : [...v, s]))}
              className={`rounded-full border px-3 py-1 text-xs ${sel.includes(s) ? "border-emerald-500 bg-emerald-500/10 font-semibold" : "border-border"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          Intensidade
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={sev === n}
              onClick={() => setSev(n)}
              className={`h-8 rounded-lg px-3 ${sev === n ? "bg-emerald-600 font-bold text-white" : "border border-border"}`}
            >
              {SEVERITY[n]}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving || !sel.length}
            onClick={() => void saveSymptom(false)}
            className="h-10 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Registrar sintomas
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveSymptom(true)}
            className="h-10 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-60"
          >
            Passei bem
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        {!remote && (
          <p className="mt-2 text-xs text-muted-foreground">
            Salvando neste aparelho até a tabela ser ativada.
          </p>
        )}
        <p className="mt-3 text-sm">
          {personal.nBad + personal.nOk < 2
            ? "Registre como se sentiu depois de laticínios. Com alguns registros o app estima a dose que o seu corpo tolera."
            : personal.bad !== null && personal.ok !== null
              ? `Quando passou bem, a maior refeição antes foi de ~${personal.ok} g; com sintomas, ~${personal.bad} g. ${personal.bad > personal.ok ? `Seu limite por refeição deve ficar perto de ${personal.ok} g.` : "Não há diferença clara de dose: outros alimentos podem pesar."}`
              : personal.bad !== null
                ? `Seus sintomas apareceram após refeições de ~${personal.bad} g de lactose. Teste doses menores.`
                : `Você passou bem com refeições de ~${personal.ok} g de lactose.`}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-2 text-sm font-bold">
          Laticínios registrados{range > 1 ? ` (${range} dias)` : " hoje"}
        </h3>
        {!listRecs.length ? (
          <p className="text-sm text-muted-foreground">
            Leite, iogurte, queijo e derivados registrados em qualquer tela aparecem aqui sozinhos,
            com a lactose calculada.
          </p>
        ) : (
          <ul className="max-h-64 divide-y divide-border overflow-y-auto">
            {listRecs.map((r) => (
              <li key={r.id} className="flex items-center gap-2 py-1.5 text-sm">
                <span className="w-[4.5rem] shrink-0 tabular-nums text-muted-foreground">
                  {range > 1
                    ? `${acreDateKey(r.at).slice(8)}/${acreDateKey(r.at).slice(5, 7)} `
                    : ""}
                  {acreTimeLabel(r.at)}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {r.label} · {r.amount} {r.origin === "porcao" ? "g" : "ml/g"}
                </span>
                <span
                  className={`w-16 shrink-0 text-right font-semibold tabular-nums ${r.free ? "text-emerald-600" : ""}`}
                >
                  {r.free ? "sem lactose" : `${r.g} g`}
                </span>
              </li>
            ))}
          </ul>
        )}
        {items.length > 0 && (
          <>
            <h4 className="mb-1 mt-3 text-xs font-bold">Sintomas registrados</h4>
            <ul className="divide-y divide-border">
              {items.slice(0, 8).map((s) => (
                <li key={s.id} className="flex items-center gap-2 py-1.5 text-sm">
                  <span className="w-24 shrink-0 tabular-nums text-muted-foreground">
                    {acreDateKey(s.at).slice(8)}/{acreDateKey(s.at).slice(5, 7)}{" "}
                    {acreTimeLabel(s.at)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {SEVERITY[s.severity]}
                    {s.symptoms ? ` · ${s.symptoms}` : ""}
                  </span>
                  <button
                    type="button"
                    aria-label="Excluir registro"
                    onClick={() => void remove(s.id)}
                    className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
          <Milk size={16} /> Dicas para conviver com a lactose
        </h3>
        <ul className="grid gap-2 text-sm">
          {TIPS.map((t) => (
            <li key={t} className="rounded-xl bg-muted/50 p-3">
              {t}
            </li>
          ))}
        </ul>
      </div>

      <p className="flex gap-2 text-[12px] text-muted-foreground">
        <Info size={14} className="mt-0.5 shrink-0" />
        Valores médios educativos (NIDDK, revisão sistemática em Annals of Internal Medicine,
        tabelas de composição). A lactose real varia por marca. Não é diagnóstico: sintomas fortes,
        sangue nas fezes ou perda de peso pedem avaliação médica. Alergia ao leite é diferente de
        intolerância e exige acompanhamento.
      </p>
    </section>
  );
}
