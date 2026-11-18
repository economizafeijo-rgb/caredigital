import { useMemo, useState } from "react";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, Droplets, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { acreDateAtTime, acreDateKey, ACRE_TIME_ZONE } from "@/lib/acre-time";
import { beverageKinds, beverageCategory, isBeverageKind } from "@/lib/care-intake-categories";
import { beverageNutrients } from "@/lib/beverage-nutrients";
import { NiceSelect } from "./NiceSelect";
import { RecordInfo } from "./RecordInfo";
import { useDialog } from "@/lib/dialog";

export type WaterEntry = { id: string; amount_ml: number; recorded_at: string; kind?: string; name?: string };
type Entry = WaterEntry & { source: "water" | "beverage" };
const hhmm = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: ACRE_TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
const ml = (v: number) => `${Math.round(v).toLocaleString("pt-BR")} ml`;

/** Registros de hoje: gráfico interativo (barras por registro + acumulado x meta) e lista com editar/excluir sempre à vista. */
export function HydrationEntries({ patientId, water, beverages, goal, onChanged }: { patientId: string; water: WaterEntry[]; beverages: WaterEntry[]; goal: number; onChanged: () => void }) {
  const dialog = useDialog();
  const entries = useMemo<Entry[]>(() => [...water.map((e) => ({ ...e, source: "water" as const })), ...beverages.map((e) => ({ ...e, source: "beverage" as const }))].sort((a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at)), [water, beverages]);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState("");
  const [name, setName] = useState("");
  const [when, setWhen] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const data = useMemo(() => {
    let sum = 0;
    return entries.map((e) => { sum += Number(e.amount_ml); return { id: e.id, label: hhmm(e.recorded_at), ml: Number(e.amount_ml), total: sum, source: e.source }; });
  }, [entries]);
  const total = data.at(-1)?.total ?? 0;
  const pct = goal ? Math.min(100, Math.round((total / goal) * 100)) : 0;
  if (entries.length === 0) return null;

  function startEdit(e: Entry) {
    setEditing(e.id); setSelected(e.id); setAmount(String(Math.round(Number(e.amount_ml)))); setWhen(hhmm(e.recorded_at));
    setKind(e.source === "beverage" && e.kind && isBeverageKind(e.kind) ? e.kind : "outra");
    setName(e.name ?? ""); setError(""); setConfirmId(null);
  }
  async function save(e: Entry) {
    const value = Math.round(Number(amount.replace(",", ".")));
    if (!Number.isFinite(value) || value < 1 || value > 5000) { setError("Informe um volume entre 1 e 5000 ml."); return; }
    if (e.source === "beverage" && (name.trim().length < 2 || name.trim().length > 100)) { setError("Informe o nome da bebida (2 a 100 caracteres)."); return; }
    if (!/^\d{2}:\d{2}$/.test(when)) { setError("Informe o horário (hh:mm)."); return; }
    const at = acreDateAtTime(acreDateKey(e.recorded_at), when);
    if (at.getTime() > Date.now() + 60_000) { setError("O horário não pode estar no futuro."); return; }
    const what = e.source === "beverage" ? `${beverageCategory(kind)?.label ?? "Bebida"}: ${name.trim()}, ${value} ml` : `${value} ml de água`;
    if (!(await dialog.confirm("Salvar alteração?", `Alterar este registro para ${what} às ${when}?`, false, "Salvar alteração"))) return;
    setBusy(true); setError("");
    const { error: err } = e.source === "water"
      ? await (supabase as any).rpc("care_update_intake_entry", { p_patient_id: patientId, p_entry_type: "water", p_entry_id: e.id, p_description: null, p_amount_ml: value, p_consumed_at: at.toISOString() })
      : await (supabase as any).rpc("care_update_client_beverage", { p_patient_id: patientId, p_entry_id: e.id, p_kind: kind, p_name: name.trim(), p_amount_ml: value, p_consumed_at: at.toISOString() });
    setBusy(false);
    if (err) { setError(err.message || "Não foi possível salvar a alteração."); return; }
    setEditing(null); onChanged();
  }
  async function remove(e: Entry) {
    setBusy(true); setError("");
    const { error: err } = await (supabase as any).rpc("care_delete_intake_entry", { p_patient_id: patientId, p_entry_type: e.source, p_entry_id: e.id });
    setBusy(false);
    if (err) { setError(err.message || "Não foi possível excluir o registro."); return; }
    setConfirmId(null); setSelected(null); onChanged();
  }

  return (
    <section className="grid gap-3 rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/[.07] to-cyan-500/[.03] p-3 sm:p-4" aria-label="Consumo de água de hoje">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-sky-600 dark:text-sky-300">Acompanhamento</p><h4 className="text-base font-extrabold">Consumo de hoje</h4></div>
        <div className="text-right"><strong className="text-xl font-extrabold tabular-nums">{ml(total)}</strong>{goal > 0 && <span className="block text-[11px] text-muted-foreground">{pct}% de {ml(goal)}</span>}</div>
      </header>
      <div className="h-40 sm:h-48" role="img" aria-label="Consumo de água por registro e total acumulado">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 6, left: -8, bottom: 0 }}>
            <defs><linearGradient id="hydBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#0284c7" /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="ml" tick={{ fontSize: 10 }} width={42} />
            <YAxis yAxisId="total" orientation="right" tick={{ fontSize: 10 }} width={42} domain={[0, Math.max(goal, total) * 1.05 || 100]} />
            {goal > 0 && <ReferenceLine yAxisId="total" y={goal} stroke="#10b981" strokeDasharray="5 4" label={{ value: "Meta", position: "insideTopRight", fontSize: 10, fill: "#10b981" }} />}
            <Tooltip cursor={{ fill: "rgba(56,189,248,.12)" }} formatter={(v: number, name: string) => [ml(v), name]} />
            <Bar yAxisId="ml" dataKey="ml" name="Registro" radius={[8, 8, 0, 0]} maxBarSize={44} animationDuration={700} onClick={(d: any) => setSelected(d?.id ?? null)} cursor="pointer">
              {data.map((d) => <Cell key={d.id} fill={selected === d.id ? "#f59e0b" : d.source === "water" ? "url(#hydBar)" : "#8b5cf6"} />)}
            </Bar>
            <Line yAxisId="total" type="monotone" dataKey="total" name="Acumulado" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} animationDuration={900} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted-foreground">Toque numa barra para selecionar o registro. Barras roxas são outras bebidas.</p>
      {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
      <ul className="grid gap-1.5" aria-label="Meus registros de hoje">
        {[...entries].reverse().map((e) => (
          <li key={e.id} className={`rounded-xl border bg-card px-3 py-2 ${selected === e.id ? "border-amber-400 ring-2 ring-amber-400/30" : "border-border"}`}>
            {editing === e.id ? (
              <div className="grid gap-2">
                {e.source === "beverage" && (
                  <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr]">
                    <label className="text-[11px] font-semibold">Tipo de líquido
                      <NiceSelect className="mt-0.5" ariaLabel="Tipo de líquido" value={kind} onChange={setKind}
                        options={beverageKinds.filter((k) => k.value !== "agua").map((k) => ({ value: k.value, label: k.label, hint: k.hint }))} /></label>
                    <label className="text-[11px] font-semibold">Nome / descrição
                      <input value={name} onChange={(ev) => setName(ev.target.value)} maxLength={100} placeholder={beverageCategory(kind)?.example ?? "Descreva a bebida"} className="mt-0.5 block h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm" /></label>
                    {/* Nutrientes são recalculados pelo nome; sem alimento conhecido, usa a estimativa do tipo. */}
                  </div>
                )}
                <div className="flex flex-wrap items-end gap-2">
                <label className="text-[11px] font-semibold">Volume (ml)<input inputMode="numeric" value={amount} onChange={(ev) => setAmount(ev.target.value)} className="mt-0.5 block h-10 w-24 rounded-lg border border-border bg-surface px-2 text-sm" /></label>
                <label className="text-[11px] font-semibold">Horário<input type="time" value={when} onChange={(ev) => setWhen(ev.target.value)} className="mt-0.5 block h-10 rounded-lg border border-border bg-surface px-2 text-sm" /></label>
                <button type="button" disabled={busy} onClick={() => void save(e)} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white disabled:opacity-60"><Check size={15} /> {busy ? "Salvando…" : "Salvar"}</button>
                <button type="button" onClick={() => setEditing(null)} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold"><X size={15} /> Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setSelected(e.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl text-white ${e.source === "water" ? "bg-sky-500" : "bg-violet-500"}`}><Droplets size={17} /></span>
                  <span className="min-w-0"><strong className="block text-sm tabular-nums">{ml(Number(e.amount_ml))}</strong><span className="text-[11px] text-muted-foreground">{hhmm(e.recorded_at)} · {e.source === "water" ? "Água" : (e.name ? `${e.name} · ` : "") + (beverageCategory(e.kind ?? "outra")?.label ?? "Bebida")}{e.source === "beverage" && isBeverageKind(e.kind ?? "") ? ` · ~${beverageNutrients(e.kind as any, Number(e.amount_ml)).kcal} kcal` : ""}</span></span>
                </button>
                {confirmId === e.id ? (
                  <span className="flex items-center gap-1.5"><button type="button" disabled={busy} onClick={() => void remove(e)} className="h-9 rounded-lg bg-rose-600 px-3 text-xs font-bold text-white disabled:opacity-60">{busy ? "Excluindo…" : "Confirmar exclusão"}</button><button type="button" onClick={() => setConfirmId(null)} className="h-9 rounded-lg border border-border px-2.5 text-xs font-semibold">Voltar</button></span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <RecordInfo
                      title={e.source === "water" ? `Água · ${ml(Number(e.amount_ml))}` : `${e.name || beverageCategory(e.kind ?? "outra")?.label || "Bebida"} · ${ml(Number(e.amount_ml))}`}
                      at={e.recorded_at}
                      category={e.source === "water" ? "Hidratação" : "Bebida"}
                      color={e.source === "water" ? "#0ea5e9" : "#8b5cf6"}
                      rows={[
                        { label: "Consumido", value: e.source === "water" ? "Água" : e.name || beverageCategory(e.kind ?? "outra")?.label || "Bebida" },
                        ...(e.source === "beverage" ? [{ label: "Tipo", value: beverageCategory(e.kind ?? "outra")?.label ?? "Bebida" }] : []),
                        { label: "Quantidade", value: ml(Number(e.amount_ml)) },
                        ...(e.source === "beverage" && isBeverageKind(e.kind ?? "") ? (() => { const n = beverageNutrients(e.kind as any, Number(e.amount_ml)); return [{ label: "Energia", value: `~${n.kcal} kcal` }, { label: "Macros", value: `P ${n.protein} g · C ${n.carbs} g · G ${n.fat} g` }]; })() : []),
                        { label: "Da meta do dia", value: goal > 0 ? `${Math.round((Number(e.amount_ml) / goal) * 100)}%` : "—" },
                      ]}
                    />
                    <button type="button" onClick={() => startEdit(e)} aria-label={`Editar registro de ${ml(Number(e.amount_ml))} às ${hhmm(e.recorded_at)}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-bold hover:border-primary/40"><Pencil size={14} /> <span className="hidden sm:inline">Editar</span></button>
                    <button type="button" onClick={() => { setConfirmId(e.id); setEditing(null); setError(""); }} aria-label={`Excluir registro de ${ml(Number(e.amount_ml))} às ${hhmm(e.recorded_at)}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 text-xs font-bold text-rose-700 dark:text-rose-300"><Trash2 size={14} /> <span className="hidden sm:inline">Excluir</span></button>
                  </span>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
