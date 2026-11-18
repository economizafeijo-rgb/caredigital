import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Armchair, ArrowLeft, ArrowRight, Bike, Check, Dumbbell, Footprints, HeartPulse, Loader2,
  MapPin, Mountain, Scale, Sparkles, Target, TrendingDown, TrendingUp, UserRound, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { estimateObjectiveNutrition } from "@/lib/objective-nutrition";

type Profile = {
  birth_date: string | null; sex: string | null; height_cm: number | null; weight_kg: number | null;
  activity_level: string | null; care_goal: string | null; health_conditions: string[] | null;
  phone: string | null; city: string | null; state: string | null; address: string | null;
  onboarding_completed_at: string | null; onboarding_snoozed_until: string | null;
};

const levels = [
  { key: "sedentario", label: "Sedentário", hint: "Fico sentado a maior parte do dia, quase sem exercício.", icon: Armchair, minutes: 10, factor: 1.2 },
  { key: "leve", label: "Pouco ativo", hint: "Caminhadas curtas ou exercício 1 a 2 vezes por semana.", icon: Footprints, minutes: 30, factor: 1.375 },
  { key: "moderado", label: "Moderado", hint: "Exercício 3 a 4 vezes por semana, 30 a 60 minutos.", icon: Bike, minutes: 50, factor: 1.55 },
  { key: "ativo", label: "Ativo", hint: "Treino 5 ou mais vezes por semana ou trabalho físico.", icon: Dumbbell, minutes: 75, factor: 1.725 },
  { key: "muito_ativo", label: "Muito ativo", hint: "Treino intenso diário ou atleta em preparação.", icon: Mountain, minutes: 110, factor: 1.725 },
] as const;

const goals = [
  { key: "emagrecimento", label: "Emagrecer", hint: "Perder gordura com déficit leve e proteína alta.", icon: TrendingDown, tone: "from-sky-500 to-cyan-400" },
  { key: "equilibrio", label: "Manter o peso", hint: "Alimentação equilibrada e mais disposição.", icon: Scale, tone: "from-emerald-500 to-teal-400" },
  { key: "ganho_peso", label: "Ganhar peso", hint: "Aumentar o peso com refeições completas.", icon: TrendingUp, tone: "from-amber-500 to-orange-400" },
  { key: "hipertrofia", label: "Ganhar massa muscular", hint: "Hipertrofia com treino de força e recuperação.", icon: Dumbbell, tone: "from-rose-500 to-fuchsia-500" },
] as const;

const conditions = ["Hipertensão", "Diabetes", "Colesterol alto", "Gastrite", "Doença renal", "Problema na tireoide", "Gestante ou amamentando", "Alergia alimentar"];
const states = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

const steps = [
  { title: "Sobre você", lead: "Idade, altura e peso definem suas metas de água, energia e proteína.", image: "/images/hero-metricas.webp" },
  { title: "Sua rotina", lead: "O quanto você se movimenta muda o gasto de energia do dia.", image: "/images/hero-treinos.webp" },
  { title: "Seu objetivo", lead: "Escolha onde quer chegar. Você pode mudar quando quiser.", image: "/images/hero-alimentacao.webp" },
  { title: "Sua saúde", lead: "Opcional. Ajuda a deixar alertas e cardápios mais seguros.", image: "/images/caredigital-care-hero.webp" },
  { title: "Contato e local", lead: "Opcional. Usado para lojas próximas e para falarmos com você.", image: "/images/sobre-acre.webp" },
  { title: "Seu plano está pronto", lead: "Confira o acompanhamento montado a partir das suas respostas.", image: "/images/hero-hidratacao.webp" },
];

const ageOf = (iso: string) => {
  if (!iso) return null;
  const b = new Date(iso + "T12:00:00"), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return Number.isFinite(a) ? a : null;
};
const num = (s: string) => { const v = Number(s.replace(",", ".")); return Number.isFinite(v) && s.trim() ? v : null; };
const essentialsMissing = (p: Profile) => !p.birth_date || !p.sex || !p.height_cm || !p.weight_kg || !p.activity_level || !p.care_goal;

/**
 * Exibe o cadastro inicial quando faltam dados essenciais.
 * Aparece ao abrir o painel até ser concluído; "Lembrar depois" adia por 1 dia (salvo no servidor),
 * e enquanto estiver incompleto uma faixa discreta permanece no topo do painel.
 */
export function ClientOnboardingGate({ patientId, fullName, onCompleted, openSignal = 0 }: { patientId: string; fullName: string; onCompleted: () => void; openSignal?: number }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (openSignal > 0) setOpen(true); }, [openSignal]);
  useEffect(() => {
    let active = true;
    void (supabase as any).from("care_patients")
      .select("birth_date,sex,height_cm,weight_kg,activity_level,care_goal,health_conditions,phone,city,state,address,onboarding_completed_at,onboarding_snoozed_until")
      .eq("id", patientId).maybeSingle()
      .then(({ data, error }: any) => {
        if (!active || error || !data) return;
        setProfile(data);
        const snoozed = data.onboarding_snoozed_until && Date.parse(data.onboarding_snoozed_until) > Date.now();
        if (essentialsMissing(data) && !snoozed) setOpen(true);
      });
    return () => { active = false; };
  }, [patientId]);
  if (!profile) return null;
  const incomplete = essentialsMissing(profile);
  if (!incomplete && !open) return null;
  return <>
    {!open && incomplete && (
      <div role="status" className="nv-fade-in mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-3">
        <span className="nv-float grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Sparkles size={18} /></span>
        <span className="min-w-0 flex-1"><strong className="block text-sm">Complete seu cadastro</strong><span className="text-xs text-muted-foreground">Leva 2 minutos e deixa metas de água, alimentação e atividade sob medida.</span></span>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:brightness-110 active:scale-[.97]">Completar agora <ArrowRight size={15} /></button>
      </div>
    )}
    {open && <ClientOnboardingWizard patientId={patientId} fullName={fullName} initial={profile}
      onSnooze={() => { setOpen(false); void (supabase as any).rpc("care_snooze_onboarding", { p_patient_id: patientId }); }}
      onDone={() => { setOpen(false); setProfile({ ...profile, onboarding_completed_at: new Date().toISOString(), birth_date: "x", sex: "x", height_cm: 1, weight_kg: 1, activity_level: "x", care_goal: "x" }); onCompleted(); }} />}
  </>;
}

function ClientOnboardingWizard({ patientId, fullName, initial, onSnooze, onDone }: { patientId: string; fullName: string; initial: Profile; onSnooze: () => void; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [birth, setBirth] = useState(initial.birth_date ?? "");
  const [sex, setSex] = useState(initial.sex ?? "");
  const [height, setHeight] = useState(initial.height_cm ? String(initial.height_cm) : "");
  const [weight, setWeight] = useState(initial.weight_kg ? String(initial.weight_kg) : "");
  const [level, setLevel] = useState(initial.activity_level ?? "");
  const [goal, setGoal] = useState(initial.care_goal && goals.some((g) => g.key === initial.care_goal) ? initial.care_goal : "");
  const [target, setTarget] = useState("");
  const [health, setHealth] = useState<string[]>(initial.health_conditions ?? []);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [city, setCity] = useState(initial.city ?? "");
  const [uf, setUf] = useState(initial.state ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const age = ageOf(birth);
  const h = num(height), w = num(weight), tw = num(target);
  const bmi = h && w ? w / (h / 100) ** 2 : null;
  const lv = levels.find((l) => l.key === level);
  const plan = useMemo(() => estimateObjectiveNutrition({ weight: w, age, heightCm: h, sex: sex === "feminino" ? "female" : sex === "masculino" ? "male" : null, objective: goal || "equilibrio", activityFactor: lv?.factor }), [w, age, h, sex, goal, lv]);
  const water = w ? Math.round((w * 35 + (lv?.minutes ?? 20) * 8) / 50) * 50 : null;
  const first = fullName.trim().split(/\s+/)[0] || "";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !saving) onSnooze(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onSnooze, saving]);

  function validate(i: number): string {
    if (i === 0) {
      if (age === null || age < 18 || age > 110) return "Informe sua data de nascimento (18 anos ou mais).";
      if (!sex) return "Escolha o sexo biológico: ele muda o cálculo do gasto de energia.";
      if (!h || h < 100 || h > 230) return "Informe a altura entre 100 e 230 cm.";
      if (!w || w < 30 || w > 250) return "Informe o peso entre 30 e 250 kg.";
    }
    if (i === 1 && !level) return "Escolha o nível que mais se parece com a sua semana.";
    if (i === 2) {
      if (!goal) return "Escolha um objetivo para continuar.";
      if (target.trim() && (!tw || tw < 30 || tw > 250)) return "O peso desejado deve ficar entre 30 e 250 kg.";
    }
    return "";
  }
  function go(delta: 1 | -1) {
    if (delta === 1) { const e = validate(step); if (e) { setError(e); return; } }
    setError(""); setDir(delta); setStep((s) => Math.min(steps.length - 1, Math.max(0, s + delta)));
  }
  async function save() {
    for (let i = 0; i < 3; i++) { const e = validate(i); if (e) { setStep(i); setError(e); return; } }
    setSaving(true); setError("");
    const r = await (supabase as any).rpc("care_save_onboarding", {
      p_patient_id: patientId, p_birth_date: birth, p_sex: sex, p_height_cm: h, p_weight_kg: w,
      p_activity_level: level, p_objective: goal, p_target_weight_kg: tw, p_health_conditions: health,
      p_phone: phone, p_city: city, p_state: uf, p_address: address,
    });
    setSaving(false);
    if (r.error) { setError(r.error.message || "Não foi possível salvar. Tente novamente."); return; }
    setDone(true);
    window.setTimeout(onDone, 1900);
  }

  const field = "mt-1 block h-11 w-full rounded-xl border border-border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15";
  const gap = tw && w ? tw - w : null;
  const weeks = gap ? Math.ceil(Math.abs(gap) / (gap < 0 ? 0.5 : 0.25)) : null;

  let body: ReactNode = null;
  if (step === 0) body = <div className="grid gap-4">
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Data de nascimento<input type="date" className={field} value={birth} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBirth(e.target.value)} />{age !== null && age > 0 && <span className="mt-1 block text-xs text-muted-foreground">{age} anos</span>}</label>
      <div className="text-sm font-semibold">Sexo biológico
        <div className="mt-1 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Sexo biológico">
          {[["feminino", "Feminino"], ["masculino", "Masculino"]].map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={sex === k} onClick={() => setSex(k)}
            className={`h-11 rounded-xl border text-sm font-bold transition active:scale-[.97] ${sex === k ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border hover:border-primary/40 hover:bg-primary/5"}`}>{l}</button>)}
        </div>
      </div>
    </div>
    <Slider label="Altura" unit="cm" min={130} max={210} step={1} value={height} onChange={setHeight} />
    <Slider label="Peso" unit="kg" min={35} max={180} step={0.5} value={weight} onChange={setWeight} />
    {bmi && <div className="nv-fade-in flex items-center gap-3 rounded-2xl bg-muted/60 p-3 text-sm">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card font-extrabold tabular-nums">{bmi.toFixed(1)}</span>
      <span><strong className="block">IMC {bmi < 18.5 ? "abaixo do ideal" : bmi < 25 ? "na faixa saudável" : bmi < 30 ? "em sobrepeso" : "em obesidade"}</strong><span className="text-xs text-muted-foreground">É só uma referência inicial. O acompanhamento olha a tendência ao longo das semanas.</span></span>
    </div>}
  </div>;
  if (step === 1) body = <div className="grid gap-2" role="radiogroup" aria-label="Nível de atividade">
    {levels.map((l, i) => <button key={l.key} type="button" role="radio" aria-checked={level === l.key} onClick={() => setLevel(l.key)}
      className={`nv-rise group flex items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[.99] ${level === l.key ? "border-primary bg-primary/[.07] ring-2 ring-primary/25" : "border-border hover:border-primary/40 hover:bg-muted/50"}`} style={{ animationDelay: `${i * 50}ms` }}>
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl transition ${level === l.key ? "bg-primary text-primary-foreground" : "bg-muted text-foreground group-hover:bg-primary/10"}`}><l.icon size={20} /></span>
      <span className="min-w-0 flex-1"><strong className="block text-sm">{l.label}</strong><span className="text-xs text-muted-foreground">{l.hint}</span></span>
      <span className="hidden gap-0.5 sm:flex" aria-hidden="true">{Array.from({ length: 5 }, (_, j) => <i key={j} className={`h-4 w-1.5 rounded-full ${j <= i ? (level === l.key ? "bg-primary" : "bg-foreground/30") : "bg-muted"}`} />)}</span>
    </button>)}
  </div>;
  if (step === 2) body = <div className="grid gap-3">
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Objetivo">
      {goals.map((g, i) => <button key={g.key} type="button" role="radio" aria-checked={goal === g.key} onClick={() => setGoal(g.key)}
        className={`nv-rise relative overflow-hidden rounded-2xl border p-3 text-left transition active:scale-[.98] ${goal === g.key ? "border-transparent text-white shadow-lg" : "border-border hover:border-primary/40 hover:bg-muted/50"}`} style={{ animationDelay: `${i * 60}ms` }}>
        <span aria-hidden="true" className={`absolute inset-0 -z-0 bg-gradient-to-br ${g.tone} transition-opacity duration-300 ${goal === g.key ? "opacity-100" : "opacity-0"}`} />
        <span className="relative flex items-start gap-3">
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${goal === g.key ? "bg-white/20" : `bg-gradient-to-br ${g.tone} text-white`}`}><g.icon size={19} /></span>
          <span className="min-w-0"><strong className="block text-sm">{g.label}</strong><span className={`text-xs ${goal === g.key ? "text-white/85" : "text-muted-foreground"}`}>{g.hint}</span></span>
          {goal === g.key && <Check size={18} className="nv-bump ml-auto shrink-0" />}
        </span>
      </button>)}
    </div>
    {goal && goal !== "equilibrio" && <label className="nv-fade-in text-sm font-semibold">Peso desejado <span className="font-normal text-muted-foreground">(opcional)</span>
      <input inputMode="decimal" className={field} value={target} onChange={(e) => setTarget(e.target.value)} placeholder={w ? `Ex.: ${Math.round(goal === "emagrecimento" ? w * 0.92 : w * 1.06)} kg` : "Ex.: 70"} />
      {gap !== null && weeks !== null && Math.abs(gap) >= 0.5 && <span className="mt-1 block text-xs text-muted-foreground">{gap < 0 ? "Perder" : "Ganhar"} {Math.abs(gap).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg · ritmo seguro em cerca de {weeks} semanas.</span>}
    </label>}
  </div>;
  if (step === 3) body = <div>
    <p className="text-sm text-muted-foreground">Marque o que se aplica a você. Pode pular esta etapa.</p>
    <div className="mt-3 flex flex-wrap gap-2">
      {conditions.map((c, i) => { const on = health.includes(c.toLowerCase()); return <button key={c} type="button" aria-pressed={on} onClick={() => setHealth((h) => on ? h.filter((x) => x !== c.toLowerCase()) : [...h, c.toLowerCase()])}
        className={`nv-rise inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition active:scale-95 ${on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40 hover:bg-primary/5"}`} style={{ animationDelay: `${i * 35}ms` }}>{on && <Check size={14} />}{c}</button>; })}
    </div>
    <p className="mt-4 flex gap-2 rounded-2xl bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200"><HeartPulse size={16} className="shrink-0" />O NextVita não faz diagnóstico. Estas informações só ajustam alertas e sugestões; siga sempre a orientação do seu médico.</p>
  </div>;
  if (step === 4) body = <div className="grid gap-3 sm:grid-cols-2">
    <label className="text-sm font-semibold sm:col-span-2">Telefone ou WhatsApp<input type="tel" inputMode="tel" autoComplete="tel" className={field} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(68) 99999-0000" /></label>
    <label className="text-sm font-semibold">Cidade<input autoComplete="address-level2" className={field} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex.: Feijó" /></label>
    <label className="text-sm font-semibold">Estado<select className={field} value={uf} onChange={(e) => setUf(e.target.value)}><option value="">Selecione</option>{states.map((s) => <option key={s}>{s}</option>)}</select></label>
    <label className="text-sm font-semibold sm:col-span-2">Endereço<input autoComplete="street-address" className={field} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número e bairro" /></label>
  </div>;
  if (step === 5) body = <div className="grid gap-2 sm:grid-cols-2">
    {[
      { icon: Target, label: "Objetivo", value: goals.find((g) => g.key === goal)?.label ?? "—", note: tw ? `Meta de ${tw} kg` : "Sem peso-alvo definido" },
      { icon: Sparkles, label: "Energia do dia", value: plan.target ? `${plan.target.toLocaleString("pt-BR")} kcal` : "—", note: plan.maintenance ? `Manutenção estimada: ${plan.maintenance.toLocaleString("pt-BR")} kcal` : "Estimativa educativa" },
      { icon: Dumbbell, label: "Proteína", value: plan.protein ? `${plan.protein} g por dia` : "—", note: "Distribua entre as refeições" },
      { icon: HeartPulse, label: "Água", value: water ? `${(water / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L por dia` : "—", note: "Ajustada ao peso e à atividade" },
      { icon: Footprints, label: "Movimento", value: "150 min por semana", note: `Nível atual: ${lv?.label ?? "—"}` },
      { icon: MapPin, label: "Local", value: city ? `${city}${uf ? ` · ${uf}` : ""}` : "Não informado", note: "Lojas e serviços perto de você" },
    ].map((c, i) => <div key={c.label} className="nv-rise flex items-start gap-3 rounded-2xl border border-border p-3" style={{ animationDelay: `${i * 70}ms` }}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><c.icon size={18} /></span>
      <span className="min-w-0"><span className="block text-[11px] font-semibold text-muted-foreground">{c.label}</span><strong className="block truncate text-sm">{c.value}</strong><span className="block truncate text-xs text-muted-foreground">{c.note}</span></span>
    </div>)}
    <p className="text-xs text-muted-foreground sm:col-span-2">Valores estimados com a fórmula de Mifflin-St Jeor. Você pode ajustar tudo depois em Meu perfil.</p>
  </div>;

  const s = steps[step];
  return (
    <div className="fixed inset-0 z-[9995] grid place-items-center bg-slate-950/70 p-0 backdrop-blur-md sm:p-4" role="dialog" aria-modal="true" aria-labelledby="nv-onb-title">
      <div className="nv-fade-in relative flex h-full w-full max-w-5xl overflow-hidden bg-card shadow-2xl sm:h-[min(44rem,94vh)] sm:rounded-3xl">
        {/* Painel visual */}
        <aside className="relative hidden w-[42%] shrink-0 overflow-hidden text-white md:block">
          {steps.map((x, i) => <img key={x.image} src={x.image} alt="" aria-hidden="true" className={`nv-kenburns absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === step ? "opacity-100" : "opacity-0"}`} />)}
          <div className="absolute inset-0 bg-gradient-to-t from-[#04140f] via-[#04140f]/55 to-[#04140f]/10" />
          <div className="absolute inset-x-0 bottom-0 p-7">
            <p className="text-sm font-semibold text-emerald-200">{first ? `Olá, ${first}` : "Bem-vindo ao NextVita"}</p>
            <p className="mt-2 text-2xl font-extrabold leading-tight">Vamos montar o seu acompanhamento.</p>
            <ul className="mt-5 grid gap-2">
              {steps.slice(0, 5).map((x, i) => <li key={x.title} className={`flex items-center gap-2.5 text-sm transition ${i === step ? "text-white" : i < step ? "text-white/80" : "text-white/45"}`}>
                <span className={`grid size-6 place-items-center rounded-full border text-[11px] font-bold transition ${i < step ? "border-emerald-300 bg-emerald-400 text-emerald-950" : i === step ? "border-white bg-white text-slate-900" : "border-white/40"}`}>{i < step ? <Check size={13} /> : i + 1}</span>
                {x.title}{i >= 3 && <span className="text-[11px] text-white/50">opcional</span>}
              </li>)}
            </ul>
          </div>
        </aside>

        {/* Formulário */}
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-border px-5 py-4 sm:px-7">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><UserRound size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted-foreground">Etapa {Math.min(step + 1, 6)} de 6</p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-[width] duration-500 ease-out" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
            </div>
            <button type="button" onClick={onSnooze} disabled={saving} className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted" aria-label="Lembrar depois"><X size={15} /><span className="hidden sm:inline">Lembrar depois</span></button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
            {done ? (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <span className="nv-bump mx-auto grid size-20 place-items-center rounded-full bg-gradient-to-br from-primary to-emerald-400 text-white shadow-lg"><Check size={40} strokeWidth={3} /></span>
                  <p className="mt-4 text-2xl font-extrabold">Tudo pronto{first ? `, ${first}` : ""}!</p>
                  <p className="mt-1 text-sm text-muted-foreground">Seu painel foi ajustado com as novas metas.</p>
                </div>
              </div>
            ) : (
              <div key={step} className={dir === 1 ? "nv-onb-next" : "nv-onb-prev"}>
                <h2 id="nv-onb-title" className="text-2xl font-extrabold tracking-tight">{s.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{s.lead}</p>
                <div className="mt-5">{body}</div>
              </div>
            )}
          </div>

          {!done && <footer className="border-t border-border px-5 py-3 sm:px-7">
            {error && <p role="alert" className="nv-fade-in mb-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p>}
            <div className="flex items-center gap-2">
              {step > 0 && <button type="button" onClick={() => go(-1)} disabled={saving} className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-bold transition hover:bg-muted active:scale-[.97]"><ArrowLeft size={16} /> Voltar</button>}
              {(step === 3 || step === 4) && <button type="button" onClick={() => go(1)} className="h-11 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:text-foreground">Pular</button>}
              {step < steps.length - 1
                ? <button type="button" onClick={() => go(1)} className="ml-auto inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-[.97]">Continuar <ArrowRight size={16} /></button>
                : <button type="button" onClick={() => void save()} disabled={saving} className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-emerald-500 px-6 text-sm font-bold text-white shadow-md transition hover:brightness-110 active:scale-[.97] disabled:opacity-70">{saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Confirmar e começar</button>}
            </div>
          </footer>}
        </section>
      </div>
    </div>
  );
}

function Slider({ label, unit, min, max, step, value, onChange }: { label: string; unit: string; min: number; max: number; step: number; value: string; onChange: (v: string) => void }) {
  const v = num(value);
  const pct = v ? Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100)) : 0;
  return <div className="text-sm font-semibold">
    <div className="flex items-end justify-between gap-2">
      <span>{label}</span>
      <span className="flex items-baseline gap-1"><input inputMode="decimal" aria-label={`${label} em ${unit}`} value={value} onChange={(e) => onChange(e.target.value)} placeholder="—"
        className="w-20 rounded-lg border border-transparent bg-transparent text-right text-2xl font-extrabold tabular-nums outline-none transition hover:border-border focus:border-primary" /><span className="text-sm text-muted-foreground">{unit}</span></span>
    </div>
    <input type="range" min={min} max={max} step={step} value={v ?? Math.round((min + max) / 2)} onChange={(e) => onChange(e.target.value)} aria-label={label}
      className="nv-range mt-2 w-full" style={{ ["--nv-pct" as string]: `${v ? pct : 50}%` }} />
  </div>;
}
