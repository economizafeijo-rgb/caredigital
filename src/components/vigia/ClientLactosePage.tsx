import { useMemo, useState } from "react";
import { Info, Lock, Milk, Trash2 } from "lucide-react";
import { acreDateKey, acreTimeLabel } from "@/lib/acre-time";
import { LACTOSE_THRESHOLDS as T } from "@/lib/intake-detect";
import { useCareLogs } from "./useCareLogs";
import { useHealthLimits } from "./useHealthLimits";
import { ClientHealthHub } from "./ClientHealthHub";
import { useIntakeRecords, type LactoseRecord } from "./useIntakeRecords";

type SymptomLog = { id: string; at: string; severity: number; symptoms: string; notes: string };
const COLS = "id,at,severity,symptoms,notes";
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
  const { limits } = useHealthLimits(patientId);
  // Limites calculados do perfil e travados: não há campo para alterar.
  const limit = limits.lactoseDayG ?? T.dayOk;
  const mealLimit = limits.lactoseMealG ?? T.perMealOk;
  const range = 1;
  const [sel, setSel] = useState<string[]>([]);
  const [sev, setSev] = useState(1);
  const [saving, setSaving] = useState(false);
  const today = acreDateKey();

  const todayRecs = intake.lactose.filter((r) => acreDateKey(r.at) === today);
  const todayDoses = useMemo(() => groupDoses(todayRecs), [todayRecs]);
  const todayG = Math.round(todayRecs.reduce((s, r) => s + r.g, 0) * 10) / 10;
  const biggest = todayDoses.reduce((m, d) => Math.max(m, d.g), 0);
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

  const listRecs = intake.lactose.filter((r) => acreDateKey(r.at) === today);

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
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock size={12} aria-hidden="true" />{" "}
          {limits.lactoseIntolerant
            ? `Limite de ${limit} g por dia e ${mealLimit} g por refeição, calculado do seu perfil.`
            : "Sem intolerância no perfil: valores de referência, sem limite pessoal."}
        </p>
      </div>

      <ClientHealthHub patientId={patientId} ownerId={ownerId} only="lactose" />

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
