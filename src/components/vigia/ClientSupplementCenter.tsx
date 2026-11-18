import { useEffect, useMemo, useState } from "react";
import { NiceSelect } from "./NiceSelect";
import {
  BookOpen, Check, CheckCircle2, Clock, Dumbbell, Fish, Flame, Leaf, Lightbulb, Moon, Pencil, Plus, ShieldCheck,
  Sparkles, Sun, Trash2, Undo2, UtensilsCrossed, X, Zap, type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { acreDateKey } from "@/lib/acre-time";
import { useDialog } from "@/lib/dialog";
import { SupplementPack, type PackShape } from "./SupplementPack";
import { NextUpClock } from "./NextUpClock";

type Unit = "g" | "mg" | "mcg" | "UI" | "cápsula" | "comprimido" | "ml" | "scoop";
export type SupplementPlan = { id: string; name: string; kind: string; dose: number; unit: Unit; times: string[]; with_food: boolean; notes: string | null; active: boolean };
type Intake = { id: string; plan_id: string; taken_on: string; slot: string; taken_at: string };
type Task = { id: string; patient_id: string; title: string; category: string; scheduled_at: string; completed_at: string | null };
type Props = { patientId: string; ownerId: string; tasks: Task[]; onConfirm: (task: Task) => void };

type LibraryItem = { key: string; name: string; icon: LucideIcon; gradient: string; category: string; dose: number; unit: Unit; range: string; timing: string; times: string[]; withFood: boolean; benefit: string; tips: string[]; caution: string; pack: { shape: PackShape; color: string; label: string; sub: string } };
type Seed = Omit<LibraryItem, "pack" | "icon" | "gradient"> & { icon?: LucideIcon; gradient?: string; pack: LibraryItem["pack"] };
const seed = (x: Seed): LibraryItem => ({ icon: Sparkles, gradient: "from-violet-500 to-fuchsia-500", ...x });

/** Referências educativas usuais em adultos saudáveis. Não substitui orientação profissional. */
export const supplementLibrary: LibraryItem[] = [
  seed({ key: "whey", name: "Whey protein", icon: Dumbbell, gradient: "from-sky-500 to-indigo-500", category: "Proteínas", dose: 30, unit: "g", range: "20–40 g por dose", timing: "Após o treino ou para completar a proteína do dia", times: ["16:00"], withFood: false,
    benefit: "Ajuda a atingir a meta diária de proteína e a recuperação muscular.", tips: ["Misture em água ou leite logo após o treino.", "Conte a dose dentro da proteína total do dia."], caution: "Pessoas com doença renal devem ter orientação profissional.", pack: { shape: "pote", color: "#0284c7", label: "WHEY", sub: "900 g" } }),
  seed({ key: "creatina", name: "Creatina monohidratada", icon: Zap, gradient: "from-violet-500 to-fuchsia-500", category: "Desempenho", dose: 3, unit: "g", range: "3–5 g por dia", timing: "Todos os dias, em qualquer horário", times: ["08:00"], withFood: true,
    benefit: "Melhora força e desempenho em exercícios de alta intensidade.", tips: ["A constância diária importa mais que o horário.", "Beba água ao longo do dia."], caution: "Evite em doença renal sem acompanhamento.", pack: { shape: "pote", color: "#7c3aed", label: "CREATINA", sub: "300 g" } }),
  seed({ key: "vitd", name: "Vitamina D3", icon: Sun, gradient: "from-amber-400 to-orange-500", category: "Vitaminas", dose: 2000, unit: "UI", range: "1.000–2.000 UI por dia (conforme exame)", timing: "Com a maior refeição do dia", times: ["12:00"], withFood: true,
    benefit: "Importante para ossos, músculos e imunidade.", tips: ["É lipossolúvel: tome com alimentos que contenham gordura.", "A dose ideal depende do exame de sangue."], caution: "Doses altas só com prescrição.", pack: { shape: "gotas", color: "#d97706", label: "VITAMINA D3", sub: "2.000 UI · 20 ml" } }),
  seed({ key: "vitc", name: "Vitamina C", icon: Sun, gradient: "from-orange-400 to-amber-500", category: "Vitaminas", dose: 500, unit: "mg", range: "75–500 mg por dia", timing: "Pela manhã, com uma refeição", times: ["08:00"], withFood: true,
    benefit: "Antioxidante que apoia a imunidade e ajuda a absorver o ferro.", tips: ["Frutas como acerola, laranja e goiaba são ótimas fontes.", "Doses acima de 1 g podem causar desconforto intestinal."], caution: "Histórico de cálculo renal pede orientação.", pack: { shape: "frasco", color: "#ea580c", label: "VIT C", sub: "500 mg · 60 cáps" } }),
  seed({ key: "multi", name: "Multivitamínico", icon: Sparkles, gradient: "from-pink-500 to-rose-500", category: "Vitaminas", dose: 1, unit: "comprimido", range: "1 por dia", timing: "No café da manhã", times: ["08:00"], withFood: true,
    benefit: "Cobre lacunas de vitaminas e minerais da alimentação.", tips: ["Não substitui uma alimentação variada.", "Evite somar com outros suplementos de mesmos nutrientes."], caution: "Confira ferro e vitamina A se gestante.", pack: { shape: "frasco", color: "#db2777", label: "MULTI", sub: "A–Z · 60 comp" } }),
  seed({ key: "complexo_b", name: "Complexo B", category: "Vitaminas", dose: 1, unit: "cápsula", range: "1 por dia", timing: "Pela manhã", times: ["08:00"], withFood: true,
    benefit: "Vitaminas do metabolismo energético e do sistema nervoso.", tips: ["Pode deixar a urina amarelada, o que é esperado.", "Prefira pela manhã."], caution: "Evite doses muito altas de B6 por longos períodos.", pack: { shape: "frasco", color: "#ca8a04", label: "COMPLEXO B", sub: "60 cáps" } }),
  seed({ key: "b12", name: "Vitamina B12", category: "Vitaminas", dose: 500, unit: "mcg", range: "250–1.000 mcg por dia", timing: "Pela manhã", times: ["08:00"], withFood: false,
    benefit: "Essencial para o sangue e os nervos; importante para vegetarianos e idosos.", tips: ["Formas sublinguais são práticas.", "Acompanhe com exame se tiver deficiência."], caution: "Uso de metformina pode reduzir a B12: converse com o médico.", pack: { shape: "gotas", color: "#be123c", label: "B12", sub: "metilcobalamina" } }),
  seed({ key: "colageno", name: "Colágeno hidrolisado", icon: Leaf, gradient: "from-emerald-500 to-lime-500", category: "Bem-estar", dose: 10, unit: "g", range: "5–10 g por dia", timing: "Em jejum ou com vitamina C", times: ["07:30"], withFood: false,
    benefit: "Pode apoiar articulações, pele e tendões.", tips: ["Combine com uma fonte de vitamina C.", "Os resultados aparecem após semanas de uso contínuo."], caution: "Não conta como proteína completa.", pack: { shape: "sache", color: "#e11d48", label: "COLÁGENO", sub: "10 g · hidrolisado" } }),
  seed({ key: "maca", name: "Maca peruana", category: "Bem-estar", dose: 3, unit: "g", range: "1,5–3 g por dia", timing: "Pela manhã, misturada em vitamina ou suco", times: ["08:00"], withFood: true,
    benefit: "Raiz andina usada para disposição e energia no dia a dia.", tips: ["Comece com 1,5 g e aumente aos poucos.", "Combina com vitaminas de banana e aveia."], caution: "Evite na gestação e em problemas de tireoide sem orientação.", pack: { shape: "pote", color: "#a16207", label: "MACA", sub: "peruana · 250 g" } }),
  seed({ key: "omega3", name: "Ômega 3 (EPA/DHA)", icon: Fish, gradient: "from-cyan-500 to-teal-500", category: "Bem-estar", dose: 1, unit: "cápsula", range: "1–2 g de EPA+DHA por dia", timing: "Junto a uma refeição com gordura", times: ["12:00"], withFood: true,
    benefit: "Contribui para a saúde do coração e do cérebro.", tips: ["Tomar com a refeição reduz o retrogosto.", "Guarde em local fresco."], caution: "Atenção se usa anticoagulantes.", pack: { shape: "frasco", color: "#0891b2", label: "ÔMEGA 3", sub: "1 g · 120 cáps" } }),
  seed({ key: "magnesio", name: "Magnésio", icon: Moon, gradient: "from-indigo-500 to-purple-600", category: "Minerais", dose: 300, unit: "mg", range: "200–400 mg por dia", timing: "À noite, antes de dormir", times: ["21:00"], withFood: false,
    benefit: "Participa do relaxamento muscular e da qualidade do sono.", tips: ["Formas como glicinato costumam ser bem toleradas.", "Divida a dose se sentir desconforto intestinal."], caution: "Cuidado em insuficiência renal.", pack: { shape: "frasco", color: "#4f46e5", label: "MAGNÉSIO", sub: "glicinato · 60 cáps" } }),
  seed({ key: "zinco", name: "Zinco", category: "Minerais", dose: 15, unit: "mg", range: "8–15 mg por dia", timing: "Longe de refeições ricas em cálcio", times: ["20:00"], withFood: false,
    benefit: "Apoia a imunidade, a pele e a cicatrização.", tips: ["Pode causar enjoo em jejum: tome com um lanche leve.", "Não passe de 40 mg por dia."], caution: "Uso prolongado em dose alta reduz o cobre.", pack: { shape: "frasco", color: "#475569", label: "ZINCO", sub: "15 mg · 60 cáps" } }),
  seed({ key: "ferro", name: "Ferro", category: "Minerais", dose: 14, unit: "mg", range: "Conforme exame", timing: "Em jejum, com vitamina C", times: ["07:00"], withFood: false,
    benefit: "Necessário para formar hemoglobina e combater a anemia.", tips: ["Evite café, chá e leite na mesma hora.", "Vitamina C aumenta a absorção."], caution: "Só use com indicação: excesso de ferro faz mal.", pack: { shape: "frasco", color: "#991b1b", label: "FERRO", sub: "quelato · 60 cáps" } }),
  seed({ key: "calcio", name: "Cálcio + vitamina D", category: "Minerais", dose: 500, unit: "mg", range: "500–1.000 mg por dia", timing: "Com refeições, em doses divididas", times: ["12:00"], withFood: true,
    benefit: "Apoia a saúde dos ossos, sobretudo após os 50 anos.", tips: ["Doses de até 500 mg por vez são melhor absorvidas.", "Não tome junto com ferro."], caution: "Histórico de cálculo renal pede orientação.", pack: { shape: "frasco", color: "#64748b", label: "CÁLCIO + D", sub: "60 comp" } }),
  seed({ key: "probiotico", name: "Probiótico", category: "Bem-estar", dose: 1, unit: "cápsula", range: "1 por dia", timing: "Em jejum ou antes do café", times: ["07:00"], withFood: false,
    benefit: "Apoia o equilíbrio da flora intestinal.", tips: ["Guarde conforme o rótulo, alguns exigem geladeira.", "Use por algumas semanas para avaliar o efeito."], caution: "Imunossuprimidos devem ter orientação médica.", pack: { shape: "frasco", color: "#16a34a", label: "PROBIÓTICO", sub: "10 bilhões UFC" } }),
  seed({ key: "curcuma", name: "Cúrcuma", category: "Bem-estar", dose: 500, unit: "mg", range: "500–1.000 mg por dia", timing: "Com uma refeição com gordura", times: ["12:00"], withFood: true,
    benefit: "Usada por suas propriedades anti-inflamatórias.", tips: ["Pimenta-preta (piperina) aumenta a absorção.", "Tome junto ao almoço."], caution: "Atenção se usa anticoagulantes ou tem cálculo biliar.", pack: { shape: "frasco", color: "#eab308", label: "CÚRCUMA", sub: "500 mg · 60 cáps" } }),
  seed({ key: "spirulina", name: "Spirulina", category: "Bem-estar", dose: 3, unit: "g", range: "1–3 g por dia", timing: "Pela manhã", times: ["08:00"], withFood: true,
    benefit: "Alga rica em proteínas, ferro e antioxidantes.", tips: ["Comece com dose baixa.", "Prefira marcas com laudo de pureza."], caution: "Evite em doenças autoimunes sem orientação.", pack: { shape: "pote", color: "#15803d", label: "SPIRULINA", sub: "120 cáps" } }),
  seed({ key: "bcaa", name: "BCAA", category: "Desempenho", dose: 5, unit: "g", range: "5–10 g por dia", timing: "Antes ou durante o treino", times: ["15:30"], withFood: false,
    benefit: "Aminoácidos de cadeia ramificada usados no treino.", tips: ["Se a proteína do dia já é alta, o benefício é pequeno.", "Misture em água gelada."], caution: "Prefira atingir a proteína total pela comida.", pack: { shape: "pote", color: "#0d9488", label: "BCAA", sub: "2:1:1 · 300 g" } }),
  seed({ key: "glutamina", name: "Glutamina", category: "Desempenho", dose: 5, unit: "g", range: "5 g por dia", timing: "Após o treino ou antes de dormir", times: ["21:00"], withFood: false,
    benefit: "Aminoácido usado na recuperação e na saúde intestinal.", tips: ["Dissolve fácil em água.", "Pode ser tomada junto ao whey."], caution: "Doença hepática ou renal pede orientação.", pack: { shape: "pote", color: "#2563eb", label: "GLUTAMINA", sub: "300 g" } }),
  seed({ key: "hipercalorico", name: "Hipercalórico", category: "Proteínas", dose: 100, unit: "g", range: "1 dose conforme rótulo", timing: "Entre as refeições", times: ["10:00"], withFood: false,
    benefit: "Ajuda quem precisa ganhar peso a completar as calorias do dia.", tips: ["Bata com leite e banana para mais energia.", "Não substitua as refeições principais."], caution: "Diabéticos devem ter orientação.", pack: { shape: "pote", color: "#c2410c", label: "MASS", sub: "hipercalórico · 3 kg" } }),
  seed({ key: "eletrolitos", name: "Eletrólitos", category: "Desempenho", dose: 1, unit: "scoop", range: "1 dose em 500 ml de água", timing: "Em treinos longos ou dias muito quentes", times: ["15:00"], withFood: false,
    benefit: "Repõe sódio e potássio perdidos no suor.", tips: ["Útil no calor do Acre e em treinos acima de 1 hora.", "Não precisa no dia a dia comum."], caution: "Hipertensos devem observar o sódio.", pack: { shape: "sache", color: "#0ea5e9", label: "HIDRATA", sub: "eletrólitos" } }),
  seed({ key: "melatonina", name: "Melatonina", icon: Moon, category: "Sono", dose: 0.21, unit: "mg", range: "Até 0,21 mg por dia (Anvisa)", timing: "30 minutos antes de dormir", times: ["21:30"], withFood: false,
    benefit: "Ajuda a regular o horário do sono.", tips: ["Diminua telas e luz forte à noite.", "Mantenha horários regulares."], caution: "Não use com sedativos sem orientação; evite na gestação.", pack: { shape: "gotas", color: "#4338ca", label: "MELATONINA", sub: "0,21 mg" } }),
  seed({ key: "cafeina", name: "Cafeína", icon: Flame, gradient: "from-orange-500 to-red-500", category: "Desempenho", dose: 200, unit: "mg", range: "3 mg/kg, até 400 mg/dia", timing: "30–60 min antes do treino", times: ["15:30"], withFood: false,
    benefit: "Aumenta foco e disposição para o treino.", tips: ["Evite após as 16h para não atrapalhar o sono.", "Some o café do dia ao limite diário."], caution: "Hipertensos e gestantes devem evitar doses altas.", pack: { shape: "frasco", color: "#b91c1c", label: "CAFEÍNA", sub: "200 mg · 60 cáps" } }),
];
const libraryCategories = ["Todos", ...Array.from(new Set(supplementLibrary.map(item => item.category)))];
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
  const dialog = useDialog();
  const [plans, setPlans] = useState<SupplementPlan[]>([]);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [remote, setRemote] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<Partial<SupplementPlan> | null>(null);
  const [selected, setSelected] = useState<string>("creatina");
  const [libCat, setLibCat] = useState("Todos");
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
    if (!(await dialog.confirm("Remover suplemento?", `${plan.name} sai da sua programação e os horários deixam de aparecer. Os registros já feitos continuam no histórico.`, true, "Remover"))) return;
    if (remote) { const result = await db.from("care_supplement_plans").delete().eq("id", plan.id); if (result.error) return setMessage("Não foi possível remover."); }
    else writeLocal(localKey(patientId, "plans"), plans.filter(item => item.id !== plan.id));
    setReload(value => value + 1);
  }

  async function toggleDose(plan: SupplementPlan, slot: string, taken: boolean) {
    const ok = await dialog.confirm(taken ? "Desfazer registro?" : "Confirmar dose?", taken ? `O registro de ${plan.name} das ${slot} será desfeito e a dose volta a ficar pendente.` : `Registrar ${plan.name} (${fmtDose(plan)}) das ${slot} como tomado agora?`, taken, taken ? "Desfazer" : "Confirmar dose");
    if (!ok) return;
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
          <NextUpClock alertKey="suplemento" title="Próxima dose" color="#fbbf24"
            target={next ? next.at : null}
            from={(() => { const prev = doses.filter(d => d.at < (next?.at ?? 0)).at(-1); return prev ? prev.at : null; })()}
            detail={next ? `${next.plan.name} · ${fmtDose(next.plan)}${next.plan.with_food ? " · com refeição" : ""}` : undefined}
            emptyText={doses.length ? "Todas as doses de hoje registradas" : "Monte sua programação abaixo"}
            actionLabel="Tomei" onAction={next ? () => void toggleDose(next.plan, next.slot, false) : undefined}/>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"><i className="block h-full rounded-full bg-gradient-to-r from-violet-400 to-amber-400 transition-[width]" style={{ width: percent + "%" }}/></div>
        {next && <button type="button" data-register-target="Registrar dose" onClick={() => void toggleDose(next.plan, next.slot, false)} className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-violet-900 shadow-sm transition hover:bg-white/90"><CheckCircle2 size={18}/> Registrar dose agora</button>}
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
                {item ? <span className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ background: `${item.pack.color}1f` }}><SupplementPack {...item.pack} className="h-10 w-auto"/></span>
                  : <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm"><Icon size={20}/></span>}
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
              {item ? <span className="grid size-14 shrink-0 place-items-center rounded-xl" style={{ background: `${item.pack.color}1f` }}><SupplementPack {...item.pack} className="h-12 w-auto"/></span>
                : <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"><Icon size={20}/></span>}
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

    <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5" aria-label="Biblioteca de suplementos">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold"><BookOpen size={20} className="text-amber-500"/> Biblioteca de suplementos</h3>
          <p className="text-sm text-muted-foreground">{supplementLibrary.length} suplementos com dose de referência, melhor horário e cuidados.</p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por categoria">
          {libraryCategories.map(c => <button key={c} type="button" aria-pressed={libCat === c} onClick={() => setLibCat(c)}
            className={`h-8 rounded-full px-3 text-xs font-semibold transition ${libCat === c ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{c}</button>)}
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
          {supplementLibrary.filter(item => libCat === "Todos" || item.category === libCat).map((item, i) => {
            const on = selected === item.key;
            return <button key={item.key} type="button" onClick={() => setSelected(item.key)} aria-pressed={on}
              className={`nv-rise group relative flex flex-col items-center overflow-hidden rounded-2xl border p-3 text-center transition duration-300 ${on ? "border-transparent shadow-lg" : "border-border hover:-translate-y-0.5 hover:shadow-md"}`}
              style={{ animationDelay: `${Math.min(i, 12) * 35}ms`, boxShadow: on ? `0 0 0 2px ${item.pack.color}, 0 14px 30px -14px ${item.pack.color}` : undefined, background: `radial-gradient(circle at 50% 28%, ${item.pack.color}22, transparent 65%)` }}>
              <SupplementPack {...item.pack} title={item.name} className="h-28 w-auto transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-2"/>
              <strong className="mt-1 line-clamp-1 text-sm">{item.name}</strong>
              <span className="text-[11px] text-muted-foreground">{item.category}</span>
            </button>;
          })}
        </div>
        <article key={info.key} className="nv-fade-in self-start overflow-hidden rounded-2xl border border-border lg:sticky lg:top-2">
          <div className="relative grid place-items-center py-5" style={{ background: `radial-gradient(circle at 50% 40%, ${info.pack.color}33, transparent 70%), linear-gradient(180deg, ${info.pack.color}14, transparent)` }}>
            <SupplementPack {...info.pack} title={info.name} className="nv-float h-44 w-auto drop-shadow-xl"/>
            <span className="absolute left-3 top-3 rounded-full bg-card/80 px-2.5 py-1 text-[11px] font-bold backdrop-blur" style={{ color: info.pack.color }}>{info.category}</span>
          </div>
          <div className="p-4">
            <h4 className="text-xl font-bold">{info.name}</h4>
            <p className="mt-1 text-sm">{info.benefit}</p>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2"><dt className="text-muted-foreground">Dose de referência</dt><dd className="text-right font-bold">{info.range}</dd></div>
              <div className="flex justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2"><dt className="text-muted-foreground">Melhor momento</dt><dd className="text-right font-bold">{info.timing}</dd></div>
              <div className="flex justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2"><dt className="text-muted-foreground">Com refeição?</dt><dd className="flex items-center gap-1 font-bold">{info.withFood ? <><UtensilsCrossed size={14}/> Sim</> : "Não é necessário"}</dd></div>
            </dl>
            <ul className="mt-3 grid gap-1.5 text-sm">{info.tips.map(tip => <li key={tip} className="flex gap-2"><Lightbulb size={16} className="mt-0.5 shrink-0 text-amber-500"/>{tip}</li>)}</ul>
            <p className="mt-2 text-xs text-muted-foreground"><strong>Atenção:</strong> {info.caution} Converse com seu médico ou nutricionista antes de iniciar.</p>
            <button type="button" onClick={() => startFromLibrary(info)} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 active:scale-[.98]" style={{ background: info.pack.color }}><Plus size={17}/> Adicionar à minha programação</button>
          </div>
        </article>
      </div>
    </section>

    {editing && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Programar suplemento">
      <div className="w-full max-w-md rounded-3xl bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between"><h3 className="text-lg font-bold">{editing.id ? "Editar suplemento" : "Programar suplemento"}</h3>
          <button type="button" onClick={() => setEditing(null)} aria-label="Fechar" className="grid size-9 place-items-center rounded-lg hover:bg-muted"><X size={18}/></button></div>
        <div className="mt-4 grid gap-3 text-sm">
          <label className="font-semibold">Nome<input value={editing.name ?? ""} onChange={e => setEditing({ ...editing, name: e.target.value })} className="mt-1 block h-11 w-full rounded-xl border border-border bg-surface px-3" placeholder="Ex.: Creatina"/></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="font-semibold">Dose<input inputMode="decimal" value={editing.dose ?? ""} onChange={e => setEditing({ ...editing, dose: Number(e.target.value.replace(",", ".")) })} className="mt-1 block h-11 w-full rounded-xl border border-border bg-surface px-3"/></label>
            <label className="font-semibold">Unidade<NiceSelect className="mt-1 h-11" ariaLabel="Unidade" value={editing.unit ?? "g"} onChange={v => setEditing({ ...editing, unit: v as Unit })} options={units.map(u => ({ value: u, label: u }))}/></label>
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
