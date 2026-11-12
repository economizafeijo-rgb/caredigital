import { useEffect, useMemo, useState } from "react";
import {
  BookOpen, Check, CheckCircle2, Clock, Dumbbell, Fish, Flame, Leaf, Lightbulb, Moon, Pencil, Plus, ShieldCheck,
  Sparkles, Sun, Trash2, Undo2, UtensilsCrossed, X, Zap, type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { acreDateKey } from "@/lib/acre-time";
import { CareTimer } from "./CareTimer";

type Unit = "g" | "mg" | "mcg" | "UI" | "cápsula" | "comprimido" | "ml" | "scoop";
export type SupplementPlan = { id: string; name: string; kind: string; dose: number; unit: Unit; times: string[]; with_food: boolean; notes: string | null; active: boolean };
type Intake = { id: string; plan_id: string; taken_on: string; slot: string; taken_at: string };
type Task = { id: string; patient_id: string; title: string; category: string; scheduled_at: string; completed_at: string | null };
type Props = { patientId: string; ownerId: string; tasks: Task[]; onConfirm: (task: Task) => void };

type LibraryItem = { key: string; name: string; icon: LucideIcon; gradient: string; category: string; dose: number; unit: Unit; range: string; timing: string; times: string[]; withFood: boolean; benefit: string; tips: string[]; caution: string };

/** Referências educativas usuais em adultos saudáveis. Não substitui orientação profissional. */
export const supplementLibrary: LibraryItem[] = [
  { key: "whey", name: "Whey protein", icon: Dumbbell, gradient: "from-sky-500 to-indigo-500", category: "Proteína", dose: 30, unit: "g", range: "20–40 g por dose", timing: "Após o treino ou para completar a proteína do dia", times: ["16:00"], withFood: false,
    benefit: "Ajuda a atingir a meta diária de proteína e a recuperação muscular.", tips: ["Misture em água ou leite logo após o treino.", "Conte a dose dentro da proteína total do dia."], caution: "Pessoas com doença renal devem ter orientação profissional." },
  { key: "creatina", name: "Creatina monohidratada", icon: Zap, gradient: "from-violet-500 to-fuchsia-500", category: "Desempenho", dose: 3, unit: "g", range: "3–5 g por dia", timing: "Todos os dias, em qualquer horário", times: ["08:00"], withFood: true,
    benefit: "Melhora força e desempenho em exercícios de alta intensidade.", tips: ["A constância diária importa mais que o horário.", "Beba água ao longo do dia."], caution: "Evite em doença renal sem acompanhamento." },
  { key: "omega3", name: "Ômega 3 (EPA/DHA)", icon: Fish, gradient: "from-cyan-500 to-teal-500", category: "Saúde cardiovascular", dose: 1, unit: "cápsula", range: "1–2 g de EPA+DHA por dia", timing: "Junto a uma refeição com gordura", times: ["12:00"], withFood: true,
    benefit: "Contribui para a saúde do coração e do cérebro.", tips: ["Tomar com a refeição reduz o retrogosto.", "Guarde em local fresco."], caution: "Atenção se usa anticoagulantes." },
  { key: "vitd", name: "Vitamina D3", icon: Sun, gradient: "from-amber-400 to-orange-500", category: "Vitamina", dose: 2000, unit: "UI", range: "1.000–2.000 UI por dia (conforme exame)", timing: "Com a maior refeição do dia", times: ["12:00"], withFood: true,
    benefit: "Importante para ossos, músculos e imunidade.", tips: ["É lipossolúvel: tome com alimentos que contenham gordura.", "Dose ideal depende do exame de sangue."], caution: "Doses altas só com prescrição." },
  { key: "magnesio", name: "Magnésio", icon: Moon, gradient: "from-indigo-500 to-purple-600", category: "Mineral", dose: 300, unit: "mg", range: "200–400 mg por dia", timing: "À noite, antes de dormir", times: ["21:00"], withFood: false,
    benefit: "Participa do relaxamento muscular e da qualidade do sono.", tips: ["Formas como glicinato costumam ser bem toleradas.", "Divida a dose se sentir desconforto intestinal."], caution: "Cuidado em insuficiência renal." },
  { key: "multi", name: "Multivitamínico", icon: Sparkles, gradient: "from-pink-500 to-rose-500", category: "Vitaminas e minerais", dose: 1, unit: "comprimido", range: "1 por dia", timing: "No café da manhã", times: ["08:00"], withFood: true,
    benefit: "Cobre lacunas de micronutrientes da alimentação.", tips: ["Não substitui uma alimentação variada.", "Evite somar com outros suplementos de mesmos nutrientes."], caution: "Confira ferro e vitamina A se gestante." },
  { key: "colageno", name: "Colágeno hidrolisado", icon: Leaf, gradient: "from-emerald-500 to-lime-500", category: "Articulações e pele", dose: 10, unit: "g", range: "5–10 g por dia", timing: "Em jejum ou com vitamina C", times: ["07:30"], withFood: false,
    benefit: "Pode apoiar articulações, pele e tendões.", tips: ["Combine com uma fonte de vitamina C.", "Resultados aparecem após semanas de uso contínuo."], caution: "Não conta como proteína completa." },
  { key: "cafeina", name: "Cafeína", icon: Flame, gradient: "from-orange-500 to-red-500", category: "Energia", dose: 200, unit: "mg", range: "3 mg/kg, até 400 mg/dia", timing: "30–60 min antes do treino", times: ["15:30"], withFood: false,
    benefit: "Aumenta foco e disposição para o treino.", tips: ["Evite após as 16h para não atrapalhar o sono.", "Some o café do dia ao limite diário."], caution: "Hipertensos e gestantes devem evitar doses altas." },
];
const libraryByKey = Object.fromEntries(supplementLibrary.map(item => [item.key, item]));
const units: Unit[] = ["g", "mg", "mcg", "UI", "cápsula", "comprimido", "ml", "scoop"];

const localKey = (patientId: string, kind: "plans" | "intakes") => `caredigital-supplements-${kind}-${patientId}`;
const readLocal = <T,>(key: string): T[] => { try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; } };
const writeLocal = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* armazenamento indisponível */ } };
const slotTime = (day: string, slot: string) => Date.parse(`${day}T${slot}:00-05:00`);
const fmtDose = (plan: Pick<SupplementPlan, "dose" | "unit">) => `${plan.dose.toLocaleString("pt-BR")} ${plan.unit}`;

/** Ordena as doses de hoje e devolve a próxima pendente. */
export function buildDoses(plans: SupplementPlan[], intakes: Intake[], day: string) {
  const taken = new Set(intakes.filter(item => item.taken_on === day).map(item => `${item.plan_id}|${item.slot}`));
  return plans.filter(plan => plan.active).flatMap(plan => plan.times.map(slot => ({ plan, slot, at: slotTime(day, slot), taken: taken.has(`${plan.id}|${slot}`) })))
    .sort((a, b) => a.at - b.at);
}

export function ClientSupplementCenter({ patientId, ownerId, tasks, onConfirm }: Props) {
  const [plans, setPlans] = useState<SupplementPlan[]>([]);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [remote, setRemote] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<Partial<SupplementPlan> | null>(null);
  const [selected, setSelected] = useState<string>("creatina");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const day = acreDateKey();
  const db = supabase as any;

  useEffect(() => {
    let active = true;
    void Promise.all([
      db.from("care_supplement_plans").select("id,name,kind,dose,unit,times,with_food,notes,active").eq("patient_id", patientId).eq("owner_id", ownerId).order("created_at"),
      db.from("care_supplement_intakes").select("id,plan_id,taken_on,slot,taken_at").eq("patient_id", patientId).eq("owner_id", ownerId).eq("taken_on", day),
    ]).then(([p, i]: any[]) => {
      if (!active) return;
      if (p.error || i.error) {
        setRemote(false);
        setPlans(readLocal<SupplementPlan>(localKey(patientId, "plans")));
        setIntakes(readLocal<Intake>(localKey(patientId, "intakes")));
      } else {
        setRemote(true);
        setPlans((p.data ?? []).map((row: SupplementPlan) => ({ ...row, dose: Number(row.dose) })));
        setIntakes(i.data ?? []);
      }
      setLoaded(true);
    });
    return () => { active = false; };
  }, [patientId, ownerId, day, reload]);

  const doses = useMemo(() => buildDoses(plans, intakes, day), [plans, intakes, day]);
  const next = doses.find(dose => !dose.taken && dose.at >= Date.now() - 60 * 60_000);
  const takenCount = doses.filter(dose => dose.taken).length;
  const percent = doses.length ? Math.round(takenCount / doses.length * 100) : 0;
  const scheduledTasks = tasks.filter(task => task.category === "outro");

  async function savePlan() {
    if (!editing) return;
    const plan = { name: (editing.name ?? "").trim(), kind: editing.kind ?? "outro", dose: Number(editing.dose), unit: editing.unit ?? "g",
      times: (editing.times ?? []).filter(Boolean).sort(), with_food: Boolean(editing.with_food), notes: editing.notes?.trim() || null, active: editing.active ?? true };
    if (plan.name.length < 2) return setMessage("Informe o nome do suplemento.");
    if (!Number.isFinite(plan.dose) || plan.dose <= 0) return setMessage("Informe uma dose válida.");
    if (!plan.times.length) return setMessage("Escolha pelo menos um horário.");
    if (remote) {
      const query = editing.id
        ? db.from("care_supplement_plans").update(plan).eq("id", editing.id)
        : db.from("care_supplement_plans").insert({ ...plan, patient_id: patientId, owner_id: ownerId });
      const result = await query;
      if (result.error) return setMessage("Não foi possível salvar o suplemento. Tente novamente.");
    } else {
      const list = editing.id ? plans.map(item => item.id === editing.id ? { ...item, ...plan } as SupplementPlan : item)
        : [...plans, { ...plan, id: crypto.randomUUID() } as SupplementPlan];
      writeLocal(localKey(patientId, "plans"), list);
    }
    setMessage(`${plan.name} salvo na sua programação.`);
    setEditing(null); setReload(value => value + 1);
  }

  async function removePlan(plan: SupplementPlan) {
    if (!window.confirm(`Remover ${plan.name} da programação?`)) return;
    if (remote) { const result = await db.from("care_supplement_plans").delete().eq("id", plan.id); if (result.error) return setMessage("Não foi possível remover."); }
    else writeLocal(localKey(patientId, "plans"), plans.filter(item => item.id !== plan.id));
    setReload(value => value + 1);
  }

  async function toggleDose(plan: SupplementPlan, slot: string, taken: boolean) {
    if (remote) {
      const result = taken
        ? await db.from("care_supplement_intakes").delete().eq("plan_id", plan.id).eq("taken_on", day).eq("slot", slot)
        : await db.from("care_supplement_intakes").insert({ plan_id: plan.id, patient_id: patientId, owner_id: ownerId, taken_on: day, slot });
      if (result.error) return setMessage("Não foi possível registrar a dose.");
    } else {
      const all = readLocal<Intake>(localKey(patientId, "intakes")).filter(item => item.taken_on === day);
      writeLocal(localKey(patientId, "intakes"), taken ? all.filter(item => !(item.plan_id === plan.id && item.slot === slot))
        : [...all, { id: crypto.randomUUID(), plan_id: plan.id, taken_on: day, slot, taken_at: new Date().toISOString() }]);
    }
    setMessage(taken ? "Registro desfeito." : `${plan.name} (${fmtDose(plan)}) registrado às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Rio_Branco" })}.`);
    setReload(value => value + 1);
  }

  const startFromLibrary = (item: LibraryItem) => setEditing({ name: item.name, kind: item.key, dose: item.dose, unit: item.unit, times: item.times, with_food: item.withFood, notes: item.timing });
  const info = libraryByKey[selected] as LibraryItem;
  const InfoIcon = info.icon;

  return <div className="flex flex-col gap-4">
    {!remote && loaded && <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
      Modo local: sua programação está salva neste navegador. Ela passa a ser sincronizada assim que a atualização do banco for aplicada.
    </p>}

    <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-900 p-5 text-white shadow-card" aria-label="Próxima dose">
        <div aria-hidden="true" className="absolute -right-10 -top-10 size-48 rounded-full bg-amber-400/20 blur-3xl"/>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-white/70">Próxima dose</p>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{takenCount} de {doses.length} doses hoje · {percent}%</span>
        </div>
        <div className="mt-4">
          {next ? <CareTimer target={next.at} title={`${next.plan.name} · ${fmtDose(next.plan)}`} subtitle={next.plan.with_food ? "Tomar junto a uma refeição" : "Pode tomar fora das refeições"} tone="supplement" dark windowMs={3 * 3600_000}/>
            : <p className="py-6 text-base text-white/85">{doses.length ? "Todas as doses de hoje foram registradas. Excelente!" : "Monte sua programação para ativar o timer das próximas doses."}</p>}
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"><i className="block h-full rounded-full bg-gradient-to-r from-violet-400 to-amber-400 transition-[width]" style={{ width: percent + "%" }}/></div>
        {next && <button type="button" onClick={() => void toggleDose(next.plan, next.slot, false)} className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-violet-900 shadow-sm transition hover:bg-white/90"><CheckCircle2 size={18}/> Registrar dose agora</button>}
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-card" aria-label="Doses de hoje">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-lg font-bold"><Clock size={20} className="text-violet-500"/> Programação de hoje</h3>
          <button type="button" onClick={() => setEditing({ times: ["08:00"], unit: "g", dose: 1 })} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 text-sm font-bold text-white shadow-sm transition hover:brightness-110"><Plus size={17}/> Adicionar</button>
        </div>
        <ul className="mt-3 grid max-h-[300px] gap-2 overflow-y-auto pr-1">
          {!loaded ? <li className="h-16 animate-pulse rounded-xl bg-muted"/> : doses.length === 0
            ? <li className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">Nenhum suplemento programado. Escolha um na biblioteca abaixo ou clique em <strong>Adicionar</strong>.</li>
            : doses.map(({ plan, slot, taken, at }) => {
              const item = libraryByKey[plan.kind] as LibraryItem | undefined;
              const Icon = item?.icon ?? Sparkles;
              const late = !taken && at < Date.now();
              return <li key={plan.id + slot} className={`flex items-center gap-3 rounded-2xl border p-3 transition ${taken ? "border-emerald-500/30 bg-emerald-500/[.06]" : late ? "border-amber-500/40 bg-amber-500/[.06]" : "border-border bg-surface"}`}>
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm ${item?.gradient ?? "from-violet-500 to-fuchsia-500"}`}><Icon size={20}/></span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">{plan.name}</strong>
                  <span className="text-xs text-muted-foreground">{slot} · {fmtDose(plan)}{plan.with_food ? " · com refeição" : ""}{late ? " · atrasada" : ""}</span>
                </span>
                <button type="button" onClick={() => void toggleDose(plan, slot, taken)} aria-pressed={taken}
                  className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition ${taken ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300" : "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-sm hover:brightness-110"}`}>
                  {taken ? <><Undo2 size={15}/> Tomado</> : <><Check size={16}/> Tomar</>}
                </button>
              </li>;
            })}
        </ul>
        {scheduledTasks.length > 0 && <div className="mt-3 border-t border-border pt-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prescritos pelo profissional</p>
          {scheduledTasks.map(task => <button key={task.id} type="button" onClick={() => onConfirm(task)} className="mt-2 flex w-full items-center justify-between rounded-xl bg-muted/60 px-3 py-2 text-left text-sm hover:bg-muted">
            <span className="truncate font-semibold">{task.title}</span><span className="text-xs text-muted-foreground">{new Date(task.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Rio_Branco" })}</span>
          </button>)}
        </div>}
        {message && <p role="status" className="mt-3 rounded-xl bg-violet-500/10 px-3 py-2 text-sm font-medium text-violet-700 dark:text-violet-300">{message}</p>}
      </section>
    </div>

    {plans.length > 0 && <section className="rounded-3xl border border-border bg-card p-5 shadow-card" aria-label="Meus suplementos">
      <h3 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck size={20} className="text-emerald-500"/> Meus suplementos</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map(plan => { const item = libraryByKey[plan.kind] as LibraryItem | undefined; const Icon = item?.icon ?? Sparkles;
          return <article key={plan.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start gap-3">
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white ${item?.gradient ?? "from-violet-500 to-fuchsia-500"}`}><Icon size={20}/></span>
              <div className="min-w-0 flex-1"><strong className="block truncate">{plan.name}</strong><span className="text-sm text-muted-foreground">{fmtDose(plan)} · {plan.times.join(", ")}</span></div>
            </div>
            {plan.notes && <p className="mt-2 text-sm text-muted-foreground">{plan.notes}</p>}
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setEditing(plan)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted"><Pencil size={14}/> Editar</button>
              <button type="button" onClick={() => void removePlan(plan)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-destructive hover:bg-destructive/10"><Trash2 size={14}/> Remover</button>
            </div>
          </article>; })}
      </div>
    </section>}

    <section className="rounded-3xl border border-border bg-card p-5 shadow-card" aria-label="Biblioteca de suplementos">
      <h3 className="flex items-center gap-2 text-lg font-bold"><BookOpen size={20} className="text-amber-500"/> Biblioteca de suplementos</h3>
      <p className="text-sm text-muted-foreground">Doses de referência, melhor horário e dicas. Toque em um suplemento para ver os detalhes.</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {supplementLibrary.map(item => { const Icon = item.icon; return <button key={item.key} type="button" onClick={() => setSelected(item.key)} aria-pressed={selected === item.key}
          className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition ${selected === item.key ? "border-violet-500 bg-violet-500/[.07] shadow-sm" : "border-border hover:border-violet-400/50 hover:bg-muted/40"}`}>
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white ${item.gradient}`}><Icon size={18}/></span>
          <span className="min-w-0"><strong className="block truncate text-sm">{item.name}</strong><span className="block truncate text-xs text-muted-foreground">{item.category}</span></span>
        </button>; })}
      </div>
      <article className="mt-4 grid gap-4 rounded-2xl bg-muted/40 p-4 md:grid-cols-[auto_1fr]">
        <span className={`grid size-16 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-md ${info.gradient}`}><InfoIcon size={30}/></span>
        <div>
          <h4 className="text-xl font-bold">{info.name}</h4>
          <p className="mt-1 text-sm">{info.benefit}</p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-card p-3"><dt className="text-xs font-semibold text-muted-foreground">Dose de referência</dt><dd className="mt-0.5 font-bold">{info.range}</dd></div>
            <div className="rounded-xl bg-card p-3"><dt className="text-xs font-semibold text-muted-foreground">Melhor momento</dt><dd className="mt-0.5 font-bold">{info.timing}</dd></div>
            <div className="rounded-xl bg-card p-3"><dt className="text-xs font-semibold text-muted-foreground">Com refeição?</dt><dd className="mt-0.5 flex items-center gap-1 font-bold">{info.withFood ? <><UtensilsCrossed size={14}/> Sim</> : "Não é necessário"}</dd></div>
          </dl>
          <ul className="mt-3 grid gap-1.5 text-sm">{info.tips.map(tip => <li key={tip} className="flex gap-2"><Lightbulb size={16} className="mt-0.5 shrink-0 text-amber-500"/>{tip}</li>)}</ul>
          <p className="mt-2 text-xs text-muted-foreground"><strong>Atenção:</strong> {info.caution} Converse com seu médico ou nutricionista antes de iniciar.</p>
          <button type="button" onClick={() => startFromLibrary(info)} className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"><Plus size={17}/> Adicionar à minha programação</button>
        </div>
      </article>
    </section>

    {editing && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Programar suplemento">
      <div className="w-full max-w-md rounded-3xl bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between"><h3 className="text-lg font-bold">{editing.id ? "Editar suplemento" : "Programar suplemento"}</h3>
          <button type="button" onClick={() => setEditing(null)} aria-label="Fechar" className="grid size-9 place-items-center rounded-lg hover:bg-muted"><X size={18}/></button></div>
        <div className="mt-4 grid gap-3 text-sm">
          <label className="font-semibold">Nome<input value={editing.name ?? ""} onChange={e => setEditing({ ...editing, name: e.target.value })} className="mt-1 block h-11 w-full rounded-xl border border-border bg-surface px-3" placeholder="Ex.: Creatina"/></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="font-semibold">Dose<input inputMode="decimal" value={editing.dose ?? ""} onChange={e => setEditing({ ...editing, dose: Number(e.target.value.replace(",", ".")) })} className="mt-1 block h-11 w-full rounded-xl border border-border bg-surface px-3"/></label>
            <label className="font-semibold">Unidade<select value={editing.unit ?? "g"} onChange={e => setEditing({ ...editing, unit: e.target.value as Unit })} className="mt-1 block h-11 w-full rounded-xl border border-border bg-surface px-3">{units.map(u => <option key={u}>{u}</option>)}</select></label>
          </div>
          <div><span className="font-semibold">Horários</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {(editing.times ?? []).map((time, index) => <span key={index} className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface pl-2">
                <input type="time" value={time} onChange={e => { const times = [...(editing.times ?? [])]; times[index] = e.target.value; setEditing({ ...editing, times }); }} className="h-10 bg-transparent"/>
                <button type="button" aria-label="Remover horário" onClick={() => setEditing({ ...editing, times: (editing.times ?? []).filter((_, i) => i !== index) })} className="grid size-9 place-items-center text-muted-foreground hover:text-destructive"><X size={14}/></button>
              </span>)}
              {(editing.times ?? []).length < 6 && <button type="button" onClick={() => setEditing({ ...editing, times: [...(editing.times ?? []), "12:00"] })} className="inline-flex h-10 items-center gap-1 rounded-xl border border-dashed border-border px-3 font-semibold hover:bg-muted"><Plus size={14}/> Horário</button>}
            </div>
          </div>
          <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={Boolean(editing.with_food)} onChange={e => setEditing({ ...editing, with_food: e.target.checked })} className="size-4"/> Tomar junto a uma refeição</label>
          <label className="font-semibold">Observações<textarea value={editing.notes ?? ""} maxLength={300} onChange={e => setEditing({ ...editing, notes: e.target.value })} rows={2} className="mt-1 block w-full rounded-xl border border-border bg-surface p-3"/></label>
          <button type="button" onClick={() => void savePlan()} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-base font-bold text-white shadow-sm hover:brightness-110"><Check size={18}/> Salvar programação</button>
        </div>
      </div>
    </div>}
  </div>;
}
