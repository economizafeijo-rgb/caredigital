import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  Search,
  Sparkles,
  Stethoscope,
  Trash2,
} from "lucide-react";
import {
  Activity as IcActivity,
  Brain,
  Circle,
  CloudRain,
  Droplet,
  Flame,
  Frown,
  Hand,
  HeartCrack,
  HeartPulse,
  Moon,
  Smile,
  Snowflake,
  Sparkles as IcSparkles,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";

const SYMPTOM_ICONS: Record<string, LucideIcon> = {
  dor_barriga: Zap,
  nausea: Frown,
  vomito: CloudRain,
  diarreia: Droplet,
  inchaco_gases: Circle,
  azia: Flame,
  coceira: Hand,
  manchas: IcSparkles,
  inchaco_rosto: Smile,
  nariz: Wind,
  falta_ar: Wind,
  pressao_alta: TrendingUp,
  pressao_baixa: TrendingDown,
  palpitacao: HeartPulse,
  tontura: IcActivity,
  dor_peito: HeartCrack,
  desmaio: Moon,
  dor_cabeca: Brain,
  sonolencia: Moon,
  suor_frio: Snowflake,
  febre: Thermometer,
};
import { acreDateKey, acreDateTimeInput, acreTimeLabel } from "@/lib/acre-time";
import {
  SEVERITY_LABELS,
  SYMPTOMS,
  SYMPTOM_GROUPS,
  classifyBp,
  redFlag,
  symptomLabel,
  type SymptomGroup,
} from "@/lib/symptoms";
import {
  explainEvent,
  findClues,
  type Clue,
  type Confidence,
  type SymptomEvent,
} from "@/lib/symptom-correlation";
import { useDialog } from "@/lib/dialog";
import { useCareLogs } from "./useCareLogs";
import { useExposures } from "./useExposures";
import { useRecordLock } from "./useRecordLock";
import { EmptyState } from "./EmptyState";
import { Retractable } from "./Retractable";

type Row = {
  id: string;
  at: string;
  symptoms: string[];
  severity: number;
  sys: number | null;
  dia: number | null;
  temp_c: number | null;
  notes: string;
};
const COLS = "id,at,symptoms,severity,sys,dia,temp_c,notes";
const ACCENT = "#e11d48";
const CONF: Record<Confidence, { t: string; c: string }> = {
  alta: { t: "Pista forte", c: "#dc2626" },
  media: { t: "Pista média", c: "#f59e0b" },
  baixa: { t: "Pista fraca", c: "#64748b" },
};
const KIND_LABEL = {
  alimento: "Comida",
  bebida: "Bebida",
  remedio: "Remédio",
  suplemento: "Suplemento",
};
const fmtDelay = (min: number) =>
  min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}`;
const dm = (at: number | string) => `${acreDateKey(at).slice(8)}/${acreDateKey(at).slice(5, 7)}`;

function clueText(c: Clue) {
  const sym = symptomLabel(c.symptom).toLowerCase();
  const pct = Math.round(c.rate * 100);
  return `${c.events === c.totalEvents ? `Em todas as ${c.totalEvents}` : `Em ${c.events} de ${c.totalEvents}`} vezes que registrou ${sym}, você tinha consumido isso antes. Das ${c.occurrences} vezes que consumiu, ${c.hits} foram seguidas do sintoma (${pct}%)${c.medianMin ? `, em geral após ${fmtDelay(c.medianMin)}` : ""}.`;
}

export function ClientSymptomsPage({ patientId, ownerId }: { patientId: string; ownerId: string }) {
  const { items, remote, error, add, remove } = useCareLogs<Row>(
    "care_symptom_events",
    COLS,
    patientId,
    ownerId,
    90,
  );
  const exp = useExposures(patientId, ownerId, 100);
  const dialog = useDialog();
  const lock = useRecordLock();

  const [sel, setSel] = useState<string[]>([]);
  const [sev, setSev] = useState(2);
  const [when, setWhen] = useState(() => acreDateTimeInput());
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [temp, setTemp] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const events: SymptomEvent[] = useMemo(
    () =>
      items.map((r) => ({
        id: r.id,
        at: Date.parse(r.at),
        symptoms: Array.isArray(r.symptoms) ? r.symptoms : [],
        severity: r.severity,
      })),
    [items],
  );
  const clues = useMemo(() => findClues(events, exp.items), [events, exp.items]);
  const sysN = Number(sys) || null;
  const diaN = Number(dia) || null;
  const bp = classifyBp(sysN, diaN);
  const alert = redFlag(sel, sev, sysN, diaN);

  const setAgo = (h: number) => setWhen(acreDateTimeInput(Date.now() - h * 3_600_000));

  async function save() {
    if (!sel.length) return;
    const at = new Date(`${when}:00-05:00`);
    if (Number.isNaN(at.getTime()) || at.getTime() > Date.now() + 60_000) {
      dialog.notify("O início do sintoma não pode estar no futuro.", "danger");
      return;
    }
    setSaving(true);
    const ok = await add({
      at: at.toISOString(),
      symptoms: sel,
      severity: sev,
      sys: sysN,
      dia: diaN,
      temp_c: temp ? Number(temp.replace(",", ".")) || null : null,
      notes: notes.trim().slice(0, 300),
    });
    setSaving(false);
    if (ok) {
      setSel([]);
      setSys("");
      setDia("");
      setTemp("");
      setNotes("");
      setSev(2);
      setWhen(acreDateTimeInput());
    }
  }

  async function del(r: Row) {
    if (lock.isLocked(r.at) && !(await lock.unlock())) return;
    const ok = await dialog.confirm(
      "Excluir este registro?",
      "Não dá para desfazer.",
      true,
      "Excluir",
    );
    if (ok) await remove(r.id);
  }

  const groups = Object.keys(SYMPTOM_GROUPS) as SymptomGroup[];
  const topClues = clues.filter((c) => c.score >= 0.2).slice(0, 6);

  return (
    <section
      className="grid min-w-0 items-start gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
      aria-labelledby="sint-title"
    >
      <h2 id="sint-title" className="sr-only">
        Sintomas e pistas
      </h2>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div
          className="flex items-center gap-3 px-3.5 py-2.5"
          style={{ background: `${ACCENT}12` }}
        >
          <span
            className="grid size-9 shrink-0 place-items-center rounded-xl text-white"
            style={{ background: ACCENT }}
          >
            <Stethoscope size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">Como você está se sentindo?</p>
            <p className="text-xs text-muted-foreground">
              Registre o que sentiu. O app compara com o que você comeu, bebeu e tomou antes.
            </p>
          </div>
        </div>

        <div className="grid gap-3 p-3.5">
          <div className="grid gap-3">
            {groups.map((g) => (
              <fieldset key={g} className="min-w-0">
                <legend className="mb-1 text-xs font-semibold text-muted-foreground">
                  {SYMPTOM_GROUPS[g]}
                </legend>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 xl:grid-cols-6">
                  {SYMPTOMS.filter((s) => s.group === g).map((s) => {
                    const on = sel.includes(s.key);
                    const Icon = SYMPTOM_ICONS[s.key] ?? Circle;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setSel((v) => (on ? v.filter((x) => x !== s.key) : [...v, s.key]))
                        }
                        className={`relative flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl border p-1.5 text-center text-[11px] leading-tight transition active:scale-[.97] ${on ? "font-semibold text-white shadow-md" : "border-border bg-background/40 hover:border-foreground/30 hover:bg-muted"}`}
                        style={on ? { background: ACCENT, borderColor: ACCENT } : undefined}
                      >
                        <Icon
                          size={20}
                          aria-hidden="true"
                          style={on ? undefined : { color: s.red ? "#ef4444" : ACCENT }}
                        />
                        <span className="line-clamp-2">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          {alert && (
            <div
              role="alert"
              className="flex gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm"
            >
              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0 text-red-500"
                aria-hidden="true"
              />
              <p>{alert}</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Intensidade</p>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={sev === n}
                    onClick={() => setSev(n)}
                    className={`h-9 rounded-lg px-3 text-xs ${sev === n ? "font-bold text-white" : "border border-border"}`}
                    style={sev === n ? { background: ACCENT } : undefined}
                  >
                    {n}
                    <span className="hidden min-[1500px]:inline"> · {SEVERITY_LABELS[n]}</span>
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {sev} · {SEVERITY_LABELS[sev]}
              </p>
            </div>

            <div>
              <label
                htmlFor="sint-when"
                className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground"
              >
                <Clock size={12} aria-hidden="true" /> Quando começou
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  id="sint-when"
                  type="datetime-local"
                  value={when}
                  max={acreDateTimeInput()}
                  onChange={(e) => setWhen(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                />
                {[0, 1, 3, 6].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setAgo(h)}
                    className="h-9 rounded-lg border border-border px-2.5 text-xs hover:bg-muted"
                  >
                    {h === 0 ? "Agora" : `Há ${h} h`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
              Pressão máx.
              <input
                inputMode="numeric"
                value={sys}
                onChange={(e) => setSys(e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="120"
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm font-normal text-foreground"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
              Pressão mín.
              <input
                inputMode="numeric"
                value={dia}
                onChange={(e) => setDia(e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="80"
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm font-normal text-foreground"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
              Temperatura °C
              <input
                inputMode="decimal"
                value={temp}
                onChange={(e) => setTemp(e.target.value.replace(/[^0-9.,]/g, "").slice(0, 4))}
                placeholder="36,5"
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm font-normal text-foreground"
              />
            </label>
          </div>
          {bp && (
            <p className="-mt-1 text-xs text-muted-foreground">
              Pressão {sysN}/{diaN}: <strong>{bp.label}</strong>
            </p>
          )}

          <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
            Observação (opcional)
            <input
              value={notes}
              maxLength={300}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: comi fora, estava estressado, tomei o remédio em jejum"
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm font-normal text-foreground"
            />
          </label>

          <button
            type="button"
            disabled={saving || !sel.length}
            onClick={() => void save()}
            className="h-11 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-50"
            style={{ background: ACCENT }}
          >
            {sel.length ? "Registrar sintomas" : "Escolha ao menos um sintoma"}
          </button>
          {error && <p className="text-xs text-red-500">{error}</p>}
          {!remote && (
            <p className="text-xs text-muted-foreground">
              Salvando neste aparelho até a tabela ser ativada no banco.
            </p>
          )}
        </div>
      </div>

      <div className="grid min-w-0 gap-3">
        <Retractable
          id="sint-pistas"
          eyebrow="O que pode estar por trás"
          title="Pistas para investigar"
          accent={ACCENT}
          summary={topClues.length ? `${topClues.length} pistas` : "Sem pistas ainda"}
        >
          {!events.length ? (
            <EmptyState
              compact
              icon={Search}
              tone={ACCENT}
              title="Nenhum sintoma registrado"
              text="Registre o que sentir. Com alguns registros, o app mostra o que costuma vir antes."
            />
          ) : !topClues.length ? (
            <EmptyState
              compact
              icon={Search}
              tone={ACCENT}
              title="Ainda sem pistas claras"
              text={
                exp.loaded && !exp.items.length
                  ? "Registre também refeições, bebidas e remédios para o app poder comparar."
                  : "Os registros atuais não repetem nenhum gatilho. Continue anotando: padrões aparecem com o tempo."
              }
            />
          ) : (
            <ul className="grid gap-2">
              {topClues.map((c) => (
                <li key={`${c.symptom}-${c.tag}`} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                      style={{ background: CONF[c.confidence].c }}
                    >
                      {CONF[c.confidence].t}
                    </span>
                    <p className="min-w-0 flex-1 text-sm font-semibold">
                      {c.label}{" "}
                      <span className="font-normal text-muted-foreground">
                        → {symptomLabel(c.symptom).toLowerCase()}
                      </span>
                    </p>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{clueText(c)}</p>
                  {c.lift >= 1.5 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Isso é {c.lift.toFixed(1).replace(".", ",")}× mais frequente que com o resto
                      do que você consome.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 flex gap-1.5 text-[12px] text-muted-foreground">
            <Sparkles size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            Pista não é diagnóstico: coincidir não prova que foi a causa. Leve o histórico ao
            médico, principalmente se repetir, piorar ou vier com falta de ar, inchaço no rosto ou
            dor no peito.
          </p>
        </Retractable>

        <Retractable
          id="sint-historico"
          eyebrow="Linha do tempo"
          title="Registros e o que veio antes"
          accent={ACCENT}
          summary={`${items.length} ${items.length === 1 ? "registro" : "registros"}`}
          defaultOpen
        >
          {!items.length ? (
            <EmptyState
              compact
              icon={Stethoscope}
              tone={ACCENT}
              title="Nada registrado"
              text="Cada registro mostra o que você consumiu nas horas anteriores."
            />
          ) : (
            <ul className="grid gap-2">
              {items.slice(0, 30).map((r) => {
                const e = events.find((x) => x.id === r.id)!;
                const before = openId === r.id ? explainEvent(e, exp.items, clues) : [];
                const b = classifyBp(r.sys, r.dia);
                return (
                  <li key={r.id} className="rounded-xl border border-border">
                    <div className="flex items-start gap-2 p-3">
                      <button
                        type="button"
                        aria-expanded={openId === r.id}
                        onClick={() => setOpenId(openId === r.id ? null : r.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {dm(r.at)} às {acreTimeLabel(r.at)} ·{" "}
                          {SEVERITY_LABELS[r.severity] ?? r.severity}
                        </p>
                        <p className="text-sm font-semibold">
                          {e.symptoms.map(symptomLabel).join(", ") || "Sem sintomas"}
                        </p>
                        {(b || r.temp_c || r.notes) && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {b ? `Pressão ${r.sys}/${r.dia} (${b.label}) ` : ""}
                            {r.temp_c ? `· ${String(r.temp_c).replace(".", ",")} °C ` : ""}
                            {r.notes ? `· ${r.notes}` : ""}
                          </p>
                        )}
                      </button>
                      <ChevronDown
                        size={16}
                        aria-hidden="true"
                        className={`mt-1 shrink-0 text-muted-foreground transition-transform ${openId === r.id ? "rotate-180" : ""}`}
                      />
                      <button
                        type="button"
                        aria-label="Excluir registro"
                        onClick={() => void del(r)}
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-red-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    {openId === r.id && (
                      <div className="border-t border-border bg-muted/30 p-3">
                        {!before.length ? (
                          <p className="text-xs text-muted-foreground">
                            Nada registrado nas horas anteriores. Anote refeições, bebidas e
                            remédios para comparar.
                          </p>
                        ) : (
                          <ul className="grid gap-1">
                            {before.map((i) => (
                              <li
                                key={i.exposure.id}
                                className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${i.suspect ? "bg-red-500/10" : ""}`}
                              >
                                <span className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">
                                  há {fmtDelay(i.minBefore)}
                                </span>
                                <span className="min-w-0 flex-1 truncate">{i.exposure.label}</span>
                                {i.novel && (
                                  <span className="rounded-full bg-amber-500/15 px-1.5 text-[10px] font-bold text-amber-600">
                                    novidade
                                  </span>
                                )}
                                {i.suspect && (
                                  <span className="rounded-full bg-red-500/15 px-1.5 text-[10px] font-bold text-red-600">
                                    suspeito
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground">
                                  {KIND_LABEL[i.exposure.kind]}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Retractable>
      </div>
    </section>
  );
}
