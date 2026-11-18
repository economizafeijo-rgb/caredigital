import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft, ArrowRight, Check, Droplets, Flame, HeartPulse, Loader2, Mars, Minus, Plus, Sparkles, Venus, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { estimateObjectiveNutrition } from "@/lib/objective-nutrition";
import { formatBrazilPhone, isValidBirthDate, isValidBrazilPhone, normalizeBrazilPhone, parseDecimal } from "@/lib/public-signup-validation";

type Profile = {
  birth_date: string | null; sex: string | null; height_cm: number | null; weight_kg: number | null;
  activity_level: string | null; care_goal: string | null; health_conditions: string[] | null;
  phone: string | null; city: string | null; state: string | null; address: string | null;
  onboarding_completed_at: string | null; onboarding_snoozed_until: string | null;
};

const levels = [
  { key: "sedentario", label: "Sedentário", hint: "Passo a maior parte do dia sentado, quase sem exercício.", bars: 1, minutes: 10, factor: 1.2 },
  { key: "leve", label: "Pouco ativo", hint: "Caminhadas curtas ou exercício 1 a 2 vezes por semana.", bars: 2, minutes: 30, factor: 1.375 },
  { key: "moderado", label: "Moderado", hint: "Exercício 3 a 4 vezes por semana, de 30 a 60 minutos.", bars: 3, minutes: 50, factor: 1.55 },
  { key: "ativo", label: "Ativo", hint: "Treino 5 ou mais vezes por semana ou trabalho físico.", bars: 4, minutes: 75, factor: 1.725 },
  { key: "muito_ativo", label: "Muito ativo", hint: "Treino intenso todos os dias ou preparação de atleta.", bars: 5, minutes: 110, factor: 1.725 },
] as const;

const goals = [
  { key: "emagrecimento", label: "Emagrecer", hint: "Déficit leve de energia e proteína alta", image: "/images/hero-treinos.webp", color: "#38bdf8" },
  { key: "equilibrio", label: "Manter o peso", hint: "Equilíbrio, energia e constância", image: "/images/hero-alimentacao.webp", color: "#34d399" },
  { key: "ganho_peso", label: "Ganhar peso", hint: "Refeições completas e regulares", image: "/images/hero-peso.webp", color: "#fbbf24" },
  { key: "hipertrofia", label: "Ganhar massa muscular", hint: "Treino de força com recuperação", image: "/images/caredigital-esporte.webp", color: "#fb7185" },
] as const;

const conditions = ["Hipertensão", "Diabetes", "Colesterol alto", "Gastrite", "Doença renal", "Tireoide", "Gestante ou amamentando", "Alergia alimentar"];
const states = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
const steps = ["Você", "Corpo", "Rotina", "Objetivo", "Saúde", "Contato", "Plano"];
/** Foto realista de cada etapa: aparece ao fundo da pergunta e se funde ao escuro. */
const stepPhotos = ["/images/caredigital-care-hero.webp", "/images/show-metricas.webp", "/images/hero-treinos.webp", "/images/caredigital-esporte.webp", "/images/painel-visao.webp", "/images/sobre-acre.webp", "/images/hero-alimentacao.webp"];

const ageOf = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const b = new Date(iso + "T12:00:00"), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return Number.isFinite(a) ? a : null;
};
const essentialsMissing = (p: Profile) => !p.birth_date || !p.sex || !p.height_cm || !p.weight_kg || !p.activity_level || !p.care_goal;
const fmt = (v: number, d = 0) => v.toLocaleString("pt-BR", { maximumFractionDigits: d });

/**
 * Exibe o cadastro inicial quando faltam dados essenciais.
 * Abre ao entrar no painel até ser concluído; "Lembrar depois" adia por 1 dia (salvo no servidor),
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
      <div role="status" className="nv-fade-in relative mb-3 flex flex-wrap items-center gap-3 overflow-hidden rounded-2xl bg-[#071512] p-3 pr-4 text-white">
        <span aria-hidden="true" className="pointer-events-none absolute -left-10 -top-16 size-40 rounded-full bg-emerald-400/25 blur-3xl" />
        <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-[#04211a]"><Sparkles size={18} /></span>
        <span className="relative min-w-0 flex-1"><strong className="block text-sm">Seu painel ainda não está personalizado</strong><span className="text-xs text-white/65">Em 2 minutos calculamos suas metas de água, energia, proteína e atividade.</span></span>
        <button type="button" onClick={() => setOpen(true)} className="relative inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-bold text-[#062019] transition hover:bg-emerald-50 active:scale-[.97]">Personalizar agora <ArrowRight size={15} /></button>
      </div>
    )}
    {open && <OnboardingStudio patientId={patientId} fullName={fullName} initial={profile}
      onSnooze={() => { setOpen(false); if (incomplete) void (supabase as any).rpc("care_snooze_onboarding", { p_patient_id: patientId }); }}
      onDone={() => { setOpen(false); setProfile({ ...profile, onboarding_completed_at: new Date().toISOString(), birth_date: "x", sex: "x", height_cm: 1, weight_kg: 1, activity_level: "x", care_goal: "x" }); onCompleted(); }} />}
  </>;
}

/** Número que desliza até o novo valor. */
function useCountUp(target: number | null, ms = 650) {
  const [v, setV] = useState(target ?? 0);
  const from = useRef(v);
  useEffect(() => {
    if (target === null) return;
    const start = performance.now(), a = from.current, b = target;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setV(b); from.current = b; return; }
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms), e = 1 - (1 - k) ** 3;
      const cur = a + (b - a) * e; setV(cur); from.current = cur;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return target === null ? null : v;
}

function LiveRing({ label, value, unit, pct, color, icon }: { label: string; value: number | null; unit: string; pct: number; color: string; icon: ReactNode }) {
  const shown = useCountUp(value);
  const R = 30, C = 2 * Math.PI * R;
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative size-[76px]">
        <svg viewBox="0 0 76 76" className="size-full -rotate-90">
          <circle cx="38" cy="38" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="7" />
          <circle cx="38" cy="38" r={R} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - (value === null ? 0 : pct))} style={{ transition: "stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)", filter: `drop-shadow(0 0 6px ${color}88)` }} />
        </svg>
        <span className="absolute inset-0 grid place-items-center" style={{ color }}>{icon}</span>
      </div>
      <strong className="mt-1.5 text-lg font-extrabold tabular-nums text-white">{shown === null ? "—" : fmt(shown, unit === "L" ? 1 : 0)}<span className="ml-0.5 text-[11px] font-semibold text-white/50">{unit}</span></strong>
      <span className="text-[11px] text-white/55">{label}</span>
    </div>
  );
}

/** Régua arrastável: o valor fica sob o marcador central. Também aceita setas do teclado, roda do mouse e botões −/+. */
function Ruler({ value, onChange, min, max, step, unit, label, accent }: { value: number; onChange: (v: number) => void; min: number; max: number; step: number; unit: string; label: string; accent: string }) {
  const PX = step < 1 ? 9 : 12; // pixels por passo
  const decimals = step < 1 ? (step < 0.5 ? 2 : 1) : 0;
  const drag = useRef<{ x: number; v: number } | null>(null);
  const [text, setText] = useState<string | null>(null);
  const clamp = useCallback((v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step)), [min, max, step]);
  const set = (v: number) => onChange(Number(clamp(v).toFixed(2)));
  const offset = -((value - min) / step) * PX;
  const center = Math.round((value - min) / step);
  const total = Math.round((max - min) / step);
  const first = Math.max(0, center - 70), last = Math.min(total, center + 70); // só os traços visíveis
  const commit = () => { if (text === null) return; const v = parseDecimal(text); if (v !== null) set(v); setText(null); };
  return (
    <div>
      <div className="flex items-end justify-center gap-4">
        <button type="button" aria-label={`Diminuir ${label}`} onClick={() => set(value - step)} className="mb-2 grid size-10 place-items-center rounded-full border border-white/15 text-white/80 transition hover:bg-white/10 active:scale-90"><Minus size={16} /></button>
        <p className="flex items-baseline justify-center leading-none">
          <input aria-label={`${label} em ${unit}`} inputMode="decimal" value={text ?? fmt(value, decimals)} onFocus={(e) => { setText(fmt(value, decimals)); e.currentTarget.select(); }}
            onChange={(e) => setText(e.target.value.replace(/[^\d.,]/g, ""))} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); (e.currentTarget as HTMLInputElement).blur(); } }}
            className="w-[5.2ch] rounded-xl border border-transparent bg-transparent text-center font-display text-6xl font-extrabold tabular-nums tracking-tight text-white outline-none transition hover:border-white/15 focus:border-white/30 focus:bg-white/[.05] sm:text-7xl" style={{ width: `${Math.max(3, fmt(value, decimals).length) + 0.6}ch` }} />
          <span className="ml-1.5 text-xl font-semibold text-white/50">{unit}</span>
        </p>
        <button type="button" aria-label={`Aumentar ${label}`} onClick={() => set(value + step)} className="mb-2 grid size-10 place-items-center rounded-full border border-white/15 text-white/80 transition hover:bg-white/10 active:scale-90"><Plus size={16} /></button>
      </div>
      <div
        role="slider" tabIndex={0} aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-valuetext={`${fmt(value, decimals)} ${unit}`}
        onKeyDown={(e) => { if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); set(value - step); } if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); set(value + step); } }}
        onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); drag.current = { x: e.clientX, v: value }; }}
        onPointerMove={(e) => { if (!drag.current) return; set(drag.current.v - ((e.clientX - drag.current.x) / PX) * step); }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
        className="relative mt-5 h-20 cursor-grab touch-none select-none overflow-hidden rounded-2xl border border-white/10 bg-white/[.03] outline-none focus-visible:ring-2 active:cursor-grabbing"
        style={{ maskImage: "linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)", WebkitMaskImage: "linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)", ["--tw-ring-color" as string]: accent }}
      >
        <div className="absolute left-1/2 top-0 h-full transition-transform duration-75 ease-out" style={{ transform: `translateX(${offset}px)` }}>
          {Array.from({ length: last - first + 1 }, (_, j) => {
            const i = first + j, v = min + i * step;
            const big = i % 10 === 0, mid = i % 5 === 0;
            return (
              <span key={i} className="absolute top-0" style={{ left: i * PX }}>
                <i className={`block w-px rounded-full ${big ? "h-8 bg-white/60" : mid ? "h-5 bg-white/35" : "h-3 bg-white/20"}`} />
                {big && <span className="absolute left-0 top-10 -translate-x-1/2 text-[11px] font-semibold tabular-nums text-white/45">{fmt(v)}</span>}
              </span>
            );
          })}
        </div>
        <span aria-hidden="true" className="absolute left-1/2 top-0 h-12 w-[3px] -translate-x-1/2 rounded-b-full" style={{ background: accent, boxShadow: `0 0 14px ${accent}` }} />
        <span aria-hidden="true" className="absolute left-1/2 top-11 size-2 -translate-x-1/2 rotate-45" style={{ background: accent }} />
      </div>
      <p className="mt-2 text-center text-[11px] text-white/40">Toque no número para digitar, ou arraste a régua</p>
    </div>
  );
}

function OnboardingStudio({ patientId, fullName, initial, onSnooze, onDone }: { patientId: string; fullName: string; initial: Profile; onSnooze: () => void; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [birth, setBirth] = useState(initial.birth_date ?? "");
  const [sex, setSex] = useState(initial.sex ?? "");
  const [height, setHeight] = useState(initial.height_cm ? Number(initial.height_cm) : 165);
  const [weight, setWeight] = useState(initial.weight_kg ? Number(initial.weight_kg) : 70);
  const [touched, setTouched] = useState(Boolean(initial.height_cm && initial.weight_kg));
  const [level, setLevel] = useState(initial.activity_level ?? "");
  const [goal, setGoal] = useState(initial.care_goal && goals.some((g) => g.key === initial.care_goal) ? initial.care_goal : "");
  const [target, setTarget] = useState<number | null>(null);
  const [health, setHealth] = useState<string[]>(initial.health_conditions ?? []);
  const [phone, setPhone] = useState(formatBrazilPhone(initial.phone ?? ""));
  const [city, setCity] = useState(initial.city ?? "");
  const [uf, setUf] = useState(initial.state ?? "AC");
  const [address, setAddress] = useState(initial.address ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const first = fullName.trim().split(/\s+/)[0] || "";
  const age = ageOf(birth);
  const lv = levels.find((l) => l.key === level);
  const gl = goals.find((g) => g.key === goal);
  const bmi = weight / (height / 100) ** 2;
  const plan = useMemo(() => estimateObjectiveNutrition({ weight, age, heightCm: height, sex: sex === "feminino" ? "female" : sex === "masculino" ? "male" : null, objective: goal || "equilibrio", activityFactor: lv?.factor }), [weight, age, height, sex, goal, lv]);
  const water = Math.round((weight * 35 + (lv?.minutes ?? 20) * 8) / 50) * 50;
  const bodyReady = touched || step > 1;

  function validate(i: number): string {
    if (i === 0) {
      if (!isValidBirthDate(birth)) return "Informe uma data de nascimento válida.";
      if (age === null || age < 18 || age > 110) return "O acompanhamento é para maiores de 18 anos.";
      if (!sex) return "Escolha o sexo biológico. Ele muda o cálculo do gasto de energia.";
    }
    if (i === 2 && !level) return "Escolha o nível que mais se parece com a sua semana.";
    if (i === 3 && !goal) return "Escolha um objetivo para continuar.";
    if (i === 5 && phone.trim() && !isValidBrazilPhone(phone)) return "Telefone inválido. Use DDD + número, ex.: (68) 99999-0000.";
    if (i === 5 && city.trim() && city.trim().length < 2) return "Informe o nome da cidade.";
    return "";
  }
  function go(delta: 1 | -1) {
    if (delta === 1) { const e = validate(step); if (e) { setError(e); return; } if (step === 1) setTouched(true); }
    setError(""); setDir(delta); setStep((s) => Math.min(steps.length - 1, Math.max(0, s + delta)));
  }
  async function save() {
    for (const i of [0, 2, 3, 5]) { const e = validate(i); if (e) { setDir(-1); setStep(i); setError(e); return; } }
    setSaving(true); setError("");
    const r = await (supabase as any).rpc("care_save_onboarding", {
      p_patient_id: patientId, p_birth_date: birth, p_sex: sex, p_height_cm: height, p_weight_kg: weight,
      p_activity_level: level, p_objective: goal, p_target_weight_kg: goal !== "equilibrio" ? target : null, p_health_conditions: health,
      p_phone: phone.trim() ? normalizeBrazilPhone(phone) : null, p_city: city.trim().replace(/\s+/g, " "), p_state: uf, p_address: address,
    });
    setSaving(false);
    if (r.error) { setError(r.error.message || "Não foi possível salvar. Tente novamente."); return; }
    setDone(true);
    window.setTimeout(onDone, 2200);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onSnooze();
      const t = e.target as HTMLElement | null;
      if (e.key === "Enter" && !e.defaultPrevented && !saving && !done && !(t && (t.tagName === "BUTTON" || t.tagName === "TEXTAREA" || t.tagName === "SELECT"))) { e.preventDefault(); if (step < steps.length - 1) go(1); else void save(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = prev; }; }, []);

  const input = "mt-1.5 block h-12 w-full rounded-xl border border-white/10 bg-white/[.05] px-4 text-base text-white placeholder:normal-case placeholder:text-white/30 outline-none transition focus:border-emerald-300/70 focus:bg-white/[.08] focus:ring-4 focus:ring-emerald-400/15 [color-scheme:dark]";
  const gap = target !== null ? target - weight : null;
  const weeks = gap ? Math.ceil(Math.abs(gap) / (gap < 0 ? 0.5 : 0.25)) : null;
  const titles = [
    [`${first ? `${first}, vamos` : "Vamos"} montar o seu painel`, "Comece pelo básico. Estes dados ajustam todas as metas do NextVita."],
    ["Altura e peso", "Arraste a régua até o seu valor atual. O IMC e as metas se ajustam na hora."],
    ["Como é a sua semana?", "O quanto você se movimenta muda o gasto de energia do dia."],
    ["Onde você quer chegar?", "Escolha um objetivo. Dá para mudar quando quiser em Meu perfil."],
    ["Algo que devemos considerar?", "Opcional. Deixa alertas e cardápios mais seguros para você."],
    ["Onde encontrar você", "Opcional. Usado para lojas próximas e para falarmos com você."],
    ["Seu plano está pronto", "Confira as metas calculadas com base nas suas respostas."],
  ];

  let body: ReactNode = null;
  if (step === 0) body = (
    <div className="grid gap-6">
      <label className="block text-sm font-semibold text-white/80">Data de nascimento
        <span className="relative block">
          <input type="date" className={input} value={birth} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBirth(e.target.value)} />
          {age !== null && age > 0 && <span className="nv-fade-in pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-bold text-emerald-200">{age} anos</span>}
        </span>
      </label>
      <div>
        <p className="text-sm font-semibold text-white/80">Sexo biológico</p>
        <div className="mt-1.5 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Sexo biológico">
          {([["feminino", "Feminino", Venus, "#f472b6"], ["masculino", "Masculino", Mars, "#60a5fa"]] as const).map(([k, l, Icon, c]) => {
            const on = sex === k;
            return (
              <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setSex(k)}
                className={`group relative flex h-28 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border transition duration-300 active:scale-[.98] ${on ? "border-transparent bg-white/[.09]" : "border-white/10 bg-white/[.03] hover:border-white/25 hover:bg-white/[.06]"}`}
                style={on ? { boxShadow: `inset 0 0 0 2px ${c}, 0 10px 40px -12px ${c}` } : undefined}>
                <span aria-hidden="true" className={`absolute inset-x-0 -bottom-10 h-20 rounded-full blur-2xl transition-opacity duration-500 ${on ? "opacity-60" : "opacity-0"}`} style={{ background: c }} />
                <Icon size={30} className="relative transition-transform duration-300 group-hover:scale-110" style={{ color: on ? c : "rgba(255,255,255,.6)" }} />
                <span className="relative text-sm font-bold text-white">{l}</span>
                {on && <Check size={16} className="nv-bump absolute right-3 top-3" style={{ color: c }} />}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-white/40">Usado só no cálculo do metabolismo basal (fórmula de Mifflin-St Jeor).</p>
      </div>
    </div>
  );
  if (step === 1) body = (
    <div className="grid gap-8">
      <Ruler label="Altura" unit="cm" min={130} max={210} step={1} value={height} onChange={(v) => { setHeight(v); setTouched(true); }} accent="#34d399" />
      <Ruler label="Peso" unit="kg" min={35} max={180} step={0.1} value={weight} onChange={(v) => { setWeight(v); setTouched(true); }} accent="#22d3ee" />
    </div>
  );
  if (step === 2) body = (
    <div className="grid gap-2.5" role="radiogroup" aria-label="Nível de atividade">
      {levels.map((l, i) => {
        const on = level === l.key;
        return (
          <button key={l.key} type="button" role="radio" aria-checked={on} onClick={() => setLevel(l.key)}
            className={`nv-rise group flex items-center gap-4 rounded-2xl border p-4 text-left transition duration-300 active:scale-[.99] ${on ? "border-emerald-300/70 bg-emerald-400/[.08] shadow-[0_10px_40px_-14px_rgba(52,211,153,.6)]" : "border-white/10 bg-white/[.03] hover:border-white/25 hover:bg-white/[.06]"}`} style={{ animationDelay: `${i * 55}ms` }}>
            <span className="flex h-9 shrink-0 items-end gap-[3px]" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((b) => <i key={b} className="w-[5px] rounded-full transition-all duration-500" style={{ height: `${b * 20}%`, background: b <= l.bars ? (on ? "#34d399" : "rgba(255,255,255,.55)") : "rgba(255,255,255,.1)", transitionDelay: `${b * 40}ms` }} />)}
            </span>
            <span className="min-w-0 flex-1"><strong className="block text-[15px] text-white">{l.label}</strong><span className="text-sm text-white/55">{l.hint}</span></span>
            <span className={`grid size-6 shrink-0 place-items-center rounded-full border transition ${on ? "border-emerald-300 bg-emerald-300 text-[#04211a]" : "border-white/25"}`}>{on && <Check size={14} strokeWidth={3} />}</span>
          </button>
        );
      })}
    </div>
  );
  if (step === 3) body = (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Objetivo">
        {goals.map((g, i) => {
          const on = goal === g.key;
          return (
            <button key={g.key} type="button" role="radio" aria-checked={on} onClick={() => { setGoal(g.key); if (target === null && g.key !== "equilibrio") setTarget(Math.round(g.key === "emagrecimento" ? weight * 0.93 : weight * 1.06)); }}
              className="nv-rise group relative isolate h-36 overflow-hidden rounded-2xl text-left transition duration-300 active:scale-[.98] sm:h-44" style={{ animationDelay: `${i * 70}ms`, boxShadow: on ? `0 0 0 2px ${g.color}, 0 18px 50px -18px ${g.color}` : "0 0 0 1px rgba(255,255,255,.1)" }}>
              <img src={g.image} alt="" className={`absolute inset-0 -z-20 h-full w-full object-cover transition duration-700 group-hover:scale-105 ${on ? "scale-105" : "saturate-[.6]"}`} />
              <span className="absolute inset-0 -z-10 bg-gradient-to-t from-[#020806] via-[#020806]/60 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-3.5">
                <strong className="block text-base font-extrabold text-white">{g.label}</strong>
                <span className="text-xs text-white/70">{g.hint}</span>
              </span>
              <span className={`absolute right-3 top-3 grid size-7 place-items-center rounded-full border-2 transition ${on ? "border-transparent text-[#04211a]" : "border-white/50 bg-black/20"}`} style={on ? { background: g.color } : undefined}>{on && <Check size={15} strokeWidth={3} className="nv-bump" />}</span>
            </button>
          );
        })}
      </div>
      {goal && goal !== "equilibrio" && target !== null && (
        <div className="nv-fade-in rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <p className="mb-2 text-sm font-semibold text-white/80">Peso que você quer alcançar</p>
          <Ruler label="Peso desejado" unit="kg" min={35} max={180} step={0.1} value={target} onChange={setTarget} accent={gl?.color ?? "#34d399"} />
          {gap !== null && weeks !== null && Math.abs(gap) >= 0.5 && <p className="mt-2 text-center text-sm text-white/70">{gap < 0 ? "Perder" : "Ganhar"} <strong className="text-white">{fmt(Math.abs(gap), 1)} kg</strong> · ritmo seguro em cerca de <strong className="text-white">{weeks} semanas</strong></p>}
        </div>
      )}
    </div>
  );
  if (step === 4) body = (
    <div>
      <div className="flex flex-wrap gap-2.5">
        {conditions.map((c, i) => {
          const key = c.toLowerCase(), on = health.includes(key);
          return (
            <button key={c} type="button" aria-pressed={on} onClick={() => setHealth((h) => on ? h.filter((x) => x !== key) : [...h, key])}
              className={`nv-rise inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition active:scale-95 ${on ? "border-emerald-300 bg-emerald-300 text-[#04211a]" : "border-white/15 text-white/85 hover:border-white/35 hover:bg-white/[.06]"}`} style={{ animationDelay: `${i * 35}ms` }}>
              {on ? <Check size={15} strokeWidth={3} /> : <Plus size={15} className="text-white/50" />}{c}
            </button>
          );
        })}
      </div>
      <p className="mt-6 flex gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[.06] p-4 text-sm text-amber-100/90"><HeartPulse size={18} className="mt-0.5 shrink-0 text-amber-300" />O NextVita não faz diagnóstico. Estas informações só ajustam alertas e sugestões; siga sempre a orientação do seu médico.</p>
    </div>
  );
  if (step === 5) body = (
    <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
      <label className="text-sm font-semibold text-white/80 sm:col-span-2">Telefone ou WhatsApp<input type="tel" inputMode="tel" autoComplete="tel" className={input} value={phone} onChange={(e) => setPhone(formatBrazilPhone(e.target.value))} placeholder="(68) 99999-0000" />
        {phone.trim() && <span className={`mt-1 block text-xs ${isValidBrazilPhone(phone) ? "text-emerald-300" : "text-amber-300"}`}>{isValidBrazilPhone(phone) ? "✓ Número válido" : "Digite DDD + número"}</span>}</label>
      <label className="text-sm font-semibold text-white/80">Cidade<input autoComplete="address-level2" className={input} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex.: Feijó" /></label>
      <label className="text-sm font-semibold text-white/80">Estado<select className={input} value={uf} onChange={(e) => setUf(e.target.value)}>{states.map((s) => <option key={s} className="bg-[#0b1714]">{s}</option>)}</select></label>
      <label className="text-sm font-semibold text-white/80 sm:col-span-2">Endereço<input autoComplete="street-address" className={input} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número e bairro" /></label>
    </div>
  );
  if (step === 6) body = (
    <div className="grid gap-3 sm:grid-cols-2">
      {[
        { k: "Energia por dia", v: plan.target ? `${fmt(plan.target)} kcal` : "—", n: plan.maintenance ? `Manutenção: ${fmt(plan.maintenance)} kcal` : "", c: "#fb923c" },
        { k: "Proteína", v: plan.protein ? `${plan.protein} g` : "—", n: "Distribua entre as refeições", c: "#fb7185" },
        { k: "Água", v: `${fmt(water / 1000, 1)} L`, n: "Ajustada ao peso e à atividade", c: "#22d3ee" },
        { k: "Movimento", v: "150 min/sem", n: `Nível atual: ${lv?.label ?? "—"}`, c: "#a3e635" },
        { k: "Carboidratos", v: plan.carbs ? `${plan.carbs} g` : "—", n: "Base de energia do dia", c: "#fbbf24" },
        { k: "Gorduras", v: plan.fat ? `${plan.fat} g` : "—", n: "Prefira fontes naturais", c: "#a78bfa" },
      ].map((x, i) => (
        <div key={x.k} className="nv-rise relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.04] p-4 pl-5" style={{ animationDelay: `${i * 70}ms` }}>
          <span className="absolute left-0 top-4 h-8 w-1 rounded-r-full" style={{ background: x.c }} />
          <p className="text-xs font-semibold text-white/55">{x.k}</p>
          <p className="mt-0.5 font-display text-2xl font-extrabold tabular-nums text-white">{x.v}</p>
          {x.n && <p className="text-xs text-white/45">{x.n}</p>}
        </div>
      ))}
      <p className="text-xs text-white/40 sm:col-span-2">Estimativas educativas (Mifflin-St Jeor), não são prescrição. Você pode ajustar tudo depois em Meu perfil.</p>
    </div>
  );

  const bmiPos = Math.min(100, Math.max(0, ((bmi - 15) / 25) * 100));
  const bmiLabel = bmi < 18.5 ? "Abaixo do ideal" : bmi < 25 ? "Faixa saudável" : bmi < 30 ? "Sobrepeso" : "Obesidade";

  return (
    <div className="nv-dark fixed inset-0 z-[10020] flex flex-col overflow-hidden bg-[#050d0b] text-white" role="dialog" aria-modal="true" aria-labelledby="nv-onb-title">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)", backgroundSize: "40px 40px", maskImage: "radial-gradient(ellipse at 30% 20%, #000 20%, transparent 75%)", WebkitMaskImage: "radial-gradient(ellipse at 30% 20%, #000 20%, transparent 75%)" }} />
      <div aria-hidden="true" className="nv-float pointer-events-none absolute -left-32 -top-40 size-[34rem] rounded-full bg-emerald-500/20 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 right-0 size-[30rem] rounded-full blur-[120px] transition-colors duration-1000" style={{ background: `${gl?.color ?? "#06b6d4"}26` }} />

      <header className="relative flex items-center gap-4 border-b border-white/[.07] px-4 py-3 sm:px-8">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 font-display text-lg font-black text-[#04211a]">N</span>
        <div className="hidden min-w-0 md:block"><p className="text-sm font-bold">Configuração do acompanhamento</p><p className="text-xs text-white/45">Leva cerca de 2 minutos</p></div>
        <ol className="mx-auto flex items-center gap-1.5 sm:gap-2" aria-label="Etapas">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-1.5" aria-current={i === step ? "step" : undefined}>
              <span className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? "w-8 bg-emerald-300 sm:w-10" : i < step ? "w-4 bg-emerald-300/60 sm:w-6" : "w-4 bg-white/[.12] sm:w-6"}`} />
              <span className={`hidden text-[11px] font-semibold 2xl:inline ${i === step ? "text-white" : "text-white/35"}`}>{s}</span>
            </li>
          ))}
        </ol>
        <button type="button" onClick={onSnooze} disabled={saving} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs font-semibold text-white/70 transition hover:bg-white/[.06] hover:text-white"><X size={15} /><span className="hidden sm:inline">Lembrar depois</span></button>
      </header>

      <div className="relative flex justify-around border-b border-white/[.07] bg-white/[.02] px-4 py-2 text-center text-[11px] lg:hidden">
        <span><strong className="block text-sm tabular-nums">{plan.target ? fmt(plan.target) : "—"}</strong><span className="text-white/45">kcal</span></span>
        <span><strong className="block text-sm tabular-nums">{plan.protein ?? "—"}</strong><span className="text-white/45">g proteína</span></span>
        <span><strong className="block text-sm tabular-nums">{bodyReady ? fmt(water / 1000, 1) : "—"}</strong><span className="text-white/45">L água</span></span>
        <span><strong className="block text-sm tabular-nums">{bodyReady ? fmt(bmi, 1) : "—"}</strong><span className="text-white/45">IMC</span></span>
      </div>

      <div className="relative grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_25rem] xl:grid-cols-[minmax(0,1fr)_28rem]">
        <main className="relative isolate flex min-h-0 flex-col overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden w-[58%] md:block" style={{ maskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,.35) 30%, #000 75%)", WebkitMaskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,.35) 30%, #000 75%)" }}>
            {stepPhotos.map((src, i) => <img key={src} src={src} alt="" className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[1200ms] ease-out ${i === step ? "scale-100 opacity-60" : "scale-105 opacity-0"}`} />)}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050d0b] via-transparent to-[#050d0b]/60" />
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 md:hidden">
            <img key={stepPhotos[step]} src={stepPhotos[step]} alt="" className="nv-fade-in h-48 w-full object-cover opacity-40" />
            <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-transparent to-[#050d0b]" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-10 lg:px-16 lg:py-12">
            {done ? (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <div className="relative mx-auto size-28">
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" style={{ animationIterationCount: 2 }} />
                    <span className="nv-bump relative grid size-28 place-items-center rounded-full bg-gradient-to-br from-emerald-300 to-teal-500 text-[#04211a] shadow-[0_20px_60px_-10px_rgba(52,211,153,.7)]"><Check size={52} strokeWidth={3} /></span>
                  </div>
                  <p className="mt-6 font-display text-3xl font-extrabold">Painel personalizado{first ? `, ${first}` : ""}!</p>
                  <p className="mt-2 text-white/60">Suas metas já estão valendo a partir de agora.</p>
                </div>
              </div>
            ) : (
              <div key={step} className={`mx-auto w-full max-w-[34rem] md:mx-0 ${dir === 1 ? "nv-onb-next" : "nv-onb-prev"}`}>
                <p className="text-xs font-bold text-emerald-300">Etapa {step + 1} de {steps.length}{step === 4 || step === 5 ? " · opcional" : ""}</p>
                <h2 id="nv-onb-title" className="mt-2 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{titles[step][0]}</h2>
                <p className="mt-2 text-white/55">{titles[step][1]}</p>
                <div className="mt-8">{body}</div>
              </div>
            )}
          </div>
          {!done && (
            <footer className="relative border-t border-white/[.07] px-5 py-4 sm:px-10 lg:px-16">
              {error && <p role="alert" className="nv-fade-in mx-auto mb-3 max-w-[34rem] md:mx-0 rounded-xl border border-rose-400/30 bg-rose-500/15 px-4 py-2.5 text-sm font-medium text-rose-100">{error}</p>}
              <div className="mx-auto flex max-w-[34rem] items-center gap-3 md:mx-0">
                {step > 0 && <button type="button" onClick={() => go(-1)} disabled={saving} className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/[.12] px-5 text-sm font-bold text-white/85 transition hover:bg-white/[.06] active:scale-[.97]"><ArrowLeft size={16} /> Voltar</button>}
                {(step === 4 || step === 5) && <button type="button" onClick={() => go(1)} className="h-12 px-2 text-sm font-semibold text-white/50 transition hover:text-white">Pular</button>}
                <span className="ml-auto hidden text-xs text-white/35 sm:inline">Enter para continuar</span>
                {step < steps.length - 1
                  ? <button type="button" onClick={() => go(1)} className="group ml-auto inline-flex h-12 items-center gap-2 rounded-xl bg-white px-7 text-sm font-bold text-[#04211a] shadow-[0_10px_30px_-10px_rgba(255,255,255,.5)] transition hover:bg-emerald-50 active:scale-[.97] sm:ml-0">Continuar <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /></button>
                  : <button type="button" onClick={() => void save()} disabled={saving} className="ml-auto inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-300 to-cyan-300 px-7 text-sm font-extrabold text-[#04211a] shadow-[0_12px_40px_-10px_rgba(52,211,153,.8)] transition hover:brightness-105 active:scale-[.97] disabled:opacity-70 sm:ml-0">{saving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Ativar meu painel</button>}
              </div>
            </footer>
          )}
        </main>

        <aside className="relative hidden min-h-0 overflow-y-auto border-l border-white/[.07] bg-white/[.015] p-6 lg:block xl:p-8" aria-label="Prévia do seu painel">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Seu painel</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-bold text-emerald-200"><i className="nv-live size-1.5 rounded-full bg-emerald-300" /> calculando ao vivo</span>
          </div>

          <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[.07] to-white/[.02] p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,.8)]">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-300 to-cyan-400 text-lg font-extrabold text-[#04211a]">{(first[0] ?? "N").toUpperCase()}</span>
              <div className="min-w-0">
                <p className="truncate font-bold">{fullName || "Você"}</p>
                <p className="truncate text-xs text-white/50">{[age && age > 0 ? `${age} anos` : null, sex ? (sex === "feminino" ? "Feminino" : "Masculino") : null, bodyReady ? `${height} cm · ${fmt(weight, 2)} kg` : null].filter(Boolean).join(" · ") || "Preencha para ver seus dados"}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <LiveRing label="Energia" value={plan.target} unit="kcal" pct={plan.target ? Math.min(1, plan.target / 3500) : 0} color="#fb923c" icon={<Flame size={20} />} />
              <LiveRing label="Proteína" value={plan.protein} unit="g" pct={plan.protein ? Math.min(1, plan.protein / 200) : 0} color="#fb7185" icon={<HeartPulse size={20} />} />
              <LiveRing label="Água" value={bodyReady ? water / 1000 : null} unit="L" pct={Math.min(1, water / 4500)} color="#22d3ee" icon={<Droplets size={20} />} />
            </div>

            <div className="mt-5 rounded-2xl bg-black/25 p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-semibold text-white/55">IMC</p>
                <p className="text-sm"><strong className="font-display text-xl tabular-nums">{bodyReady ? fmt(bmi, 1) : "—"}</strong> <span className="text-xs text-white/55">{bodyReady ? bmiLabel : ""}</span></p>
              </div>
              <div className="relative mt-3 h-2 rounded-full" style={{ background: "linear-gradient(90deg,#38bdf8 0 14%,#34d399 14% 40%,#fbbf24 40% 60%,#fb7185 60%)" }}>
                {bodyReady && <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#050d0b] bg-white shadow transition-[left] duration-700 ease-out" style={{ left: `${bmiPos}%` }} />}
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-white/35"><span>15</span><span>18,5</span><span>25</span><span>30</span><span>40</span></div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-2xl bg-black/25 p-3">
                <p className="text-[11px] font-semibold text-white/50">Rotina</p>
                <div className="mt-1.5 flex h-5 items-end gap-[3px]" aria-hidden="true">{[1, 2, 3, 4, 5].map((b) => <i key={b} className="w-1.5 rounded-full transition-all duration-500" style={{ height: 6 + b * 3, background: lv && b <= lv.bars ? "#a3e635" : "rgba(255,255,255,.12)" }} />)}</div>
                <p className="mt-1 truncate font-bold">{lv?.label ?? "—"}</p>
              </div>
              <div className="rounded-2xl bg-black/25 p-3">
                <p className="text-[11px] font-semibold text-white/50">Objetivo</p>
                <p className="mt-1 truncate font-bold" style={{ color: gl?.color }}>{gl?.label ?? "—"}</p>
                <p className="truncate text-xs text-white/50">{gl && goal !== "equilibrio" && target ? `Meta: ${fmt(target, 1)} kg` : " "}</p>
              </div>
            </div>
          </div>

          <ul className="mt-6 grid gap-3 text-sm text-white/60">
            {["Metas de água, energia e proteína sob medida", "Lembretes nos horários certos", "Evolução semanal do seu progresso"].map((t) => (
              <li key={t} className="flex items-center gap-2.5"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-emerald-300"><Check size={12} strokeWidth={3} /></span>{t}</li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
