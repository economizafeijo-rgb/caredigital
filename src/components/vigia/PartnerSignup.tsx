import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, Dumbbell, Loader2, Megaphone, Stethoscope, Store, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type PartnerType = "loja" | "academia" | "personal" | "marca" | "profissional";

const types: { key: PartnerType; label: string; hint: string; icon: typeof Store; segment: string }[] = [
  { key: "loja", label: "Loja ou comércio", hint: "Suplementos, moda fitness, farmácia, naturais", icon: Store, segment: "suplementos" },
  { key: "academia", label: "Academia ou estúdio", hint: "Planos, aulas e horários", icon: Dumbbell, segment: "outros" },
  { key: "personal", label: "Personal trainer", hint: "Consultoria e treinos", icon: UserRound, segment: "autonomo" },
  { key: "profissional", label: "Profissional de saúde", hint: "Nutrição, fisioterapia e mais", icon: Stethoscope, segment: "outros" },
  { key: "marca", label: "Marca ou anunciante", hint: "Divulgar produtos e serviços", icon: Megaphone, segment: "outros" },
];
const segmentsLoja = [
  { key: "suplementos", label: "Suplementos" }, { key: "roupas", label: "Moda fitness" }, { key: "farmacia", label: "Farmácia" },
  { key: "naturais", label: "Produtos naturais e fitoterápicos" }, { key: "outros", label: "Outro comércio" },
];
const cities = ["Feijó", "Tarauacá", "Rio Branco", "Cruzeiro do Sul", "Sena Madureira", "Outra"];
const goals = ["Vender produtos", "Divulgar serviços", "Conseguir alunos ou clientes", "Anunciar a marca"];

import { isValidBrazilPhone, isValidCnpj, isValidCpf, isValidEmail } from "@/lib/public-signup-validation";
const digits = (v: string) => v.replace(/\D/g, "");
const fmtPhone = (v: string) => { const d = digits(v).slice(0, 11); return d.length <= 2 ? d : d.length <= 7 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; };
const fmtDoc = (v: string) => {
  const d = digits(v).slice(0, 14);
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
};

const input = "field mt-1.5 h-11 w-full";
const label = "block text-xs font-bold text-foreground";

/** Cadastro de parceiros em 3 etapas: tipo de parceiro, dados do negócio e responsável com acesso. */
export function PartnerSignup({ disabled, errorMessage, onSignedIn, onNeedsConfirmation, onBack }: {
  disabled?: boolean;
  errorMessage: (e: { message?: string; code?: string; status?: number }) => string;
  onSignedIn: (userId: string, email: string) => Promise<void>;
  onNeedsConfirmation: (email: string) => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState(0);
  const [type, setType] = useState<PartnerType>("loja");
  const [business, setBusiness] = useState("");
  const [segment, setSegment] = useState("suplementos");
  const [doc, setDoc] = useState("");
  const [registry, setRegistry] = useState("");
  const [city, setCity] = useState("Feijó");
  const [instagram, setInstagram] = useState("");
  const [goal, setGoal] = useState(goals[0]);
  const [service, setService] = useState<"presencial" | "online" | "ambos">("presencial");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const t = types.find((x) => x.key === type)!;
  const businessLabel = type === "personal" || type === "profissional" ? "Nome profissional" : type === "academia" ? "Nome da academia ou estúdio" : type === "marca" ? "Nome da marca ou empresa" : "Nome da loja";
  const registryLabel = type === "personal" ? "CREF (opcional)" : type === "profissional" ? "Registro profissional (CRN, CREFITO…)" : "";

  function next(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (step === 1) {
      if (business.trim().length < 2) return setError(`Informe o ${businessLabel.toLowerCase()}.`);
      const d = digits(doc);
      if (d && !(d.length === 11 ? isValidCpf(d) : d.length === 14 ? isValidCnpj(d) : false)) return setError("CPF ou CNPJ inválido. Confira os números ou deixe em branco.");
      if (type === "profissional" && registry.trim().length < 3) return setError("Informe o registro profissional.");
    }
    setStep((s) => s + 1);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || disabled) return;
    setError("");
    if (name.trim().length < 3) return setError("Informe o nome do responsável.");
    if (!isValidEmail(email)) return setError("Informe um e-mail válido, ex.: contato@seunegocio.com.");
    if (!isValidBrazilPhone(phone)) return setError("Informe um WhatsApp válido com DDD, ex.: (68) 99999-9999.");
    if (password.length < 8) return setError("Use uma senha com pelo menos 8 caracteres.");
    if (password !== confirm) return setError("As senhas informadas não são iguais.");
    if (!terms) return setError("Confirme que as informações são verdadeiras para continuar.");
    setBusy(true);
    try {
      const mail = email.trim().toLowerCase();
      const partner = {
        partner_type: type, business_name: business.trim(), segment: type === "loja" ? segment : t.segment,
        document: digits(doc) || null, professional_registry: registry.trim() || null, city,
        instagram: instagram.trim().replace(/^@/, "") || null, goal, service_mode: type === "loja" || type === "marca" ? null : service,
      };
      const { data, error: err } = await supabase.auth.signUp({
        email: mail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/entrar?confirmed=1`,
          data: { account_type: "vendor", display_name: name.trim(), phone: digits(phone), partner },
        },
      });
      if (err) return setError(errorMessage(err));
      if (data.user && data.session) return void (await onSignedIn(data.user.id, data.user.email ?? mail));
      onNeedsConfirmation(mail);
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  const stepper = (
    <ol className="mb-1 grid grid-cols-3 gap-2" aria-label="Etapas do cadastro">
      {["Tipo", "Negócio", "Acesso"].map((s, i) => (
        <li key={s} className="grid gap-1">
          <span className={`h-1 rounded-full transition-colors duration-300 ${i <= step ? "bg-primary" : "bg-muted"}`} />
          <span className={`text-[11px] font-semibold ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{i < step ? <Check size={11} className="mr-0.5 inline" /> : null}{i + 1}. {s}</span>
        </li>
      ))}
    </ol>
  );
  const errorBox = error && <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">{error}</p>;
  const backBtn = (
    <button type="button" onClick={() => (step === 0 ? onBack() : setStep((s) => s - 1))} className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-semibold hover:border-primary/40">
      <ArrowLeft size={15} /> {step === 0 ? "Voltar" : "Anterior"}
    </button>
  );

  return (
    <div className="grid gap-3">
      {stepper}
      {step === 0 && (
        <form key="s0" onSubmit={next} className="nv-fade-in grid gap-3">
          <p className="text-sm text-muted-foreground">Como você quer participar da NextVita?</p>
          <div role="radiogroup" aria-label="Tipo de parceiro" className="grid gap-2 sm:grid-cols-2">
            {types.map((x) => {
              const on = type === x.key;
              return (
                <button key={x.key} type="button" role="radio" aria-checked={on} onClick={() => setType(x.key)}
                  className={`nv-tile flex items-center gap-3 rounded-xl border p-3 text-left ${on ? "border-primary bg-primary/5" : "border-border"} ${x.key === "marca" ? "sm:col-span-2" : ""}`}>
                  <span className={`nv-tile-icon grid size-10 shrink-0 place-items-center rounded-lg ${on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}><x.icon size={19} /></span>
                  <span className="min-w-0"><strong className="block text-sm">{x.label}</strong><span className="block truncate text-xs text-muted-foreground">{x.hint}</span></span>
                  {on && <Check size={16} className="ml-auto shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between gap-2">{backBtn}<button type="submit" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90">Continuar <ArrowRight size={15} /></button></div>
        </form>
      )}

      {step === 1 && (
        <form key="s1" onSubmit={next} className="nv-fade-in grid gap-2.5 sm:grid-cols-2">
          <label className={`${label} sm:col-span-2`}>{businessLabel}<input className={input} value={business} onChange={(e) => setBusiness(e.target.value)} maxLength={80} required placeholder={type === "loja" ? "Ex.: Arena Suplementos" : ""} /></label>
          {type === "loja" && (
            <label className={label}>Segmento
              <select className={input} value={segment} onChange={(e) => setSegment(e.target.value)}>{segmentsLoja.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
            </label>
          )}
          <label className={label}>Cidade
            <select className={input} value={city} onChange={(e) => setCity(e.target.value)}>{cities.map((c) => <option key={c}>{c}</option>)}</select>
          </label>
          <label className={label}>{type === "loja" || type === "marca" || type === "academia" ? "CNPJ ou CPF (opcional)" : "CPF ou CNPJ (opcional)"}<input className={input} inputMode="numeric" value={fmtDoc(doc)} onChange={(e) => setDoc(e.target.value)} placeholder="00.000.000/0000-00" /></label>
          {registryLabel && <label className={label}>{registryLabel}<input className={input} value={registry} onChange={(e) => setRegistry(e.target.value)} maxLength={30} placeholder="Ex.: 012345-G/AC" /></label>}
          <label className={label}>Instagram (opcional)<input className={input} value={instagram} onChange={(e) => setInstagram(e.target.value)} maxLength={40} placeholder="@seunegocio" /></label>
          {type !== "loja" && type !== "marca" && (
            <fieldset className="sm:col-span-2">
              <legend className={label}>Atendimento</legend>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {(["presencial", "online", "ambos"] as const).map((m) => <button key={m} type="button" aria-pressed={service === m} onClick={() => setService(m)} className={`h-10 rounded-lg border text-xs font-semibold capitalize ${service === m ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{m}</button>)}
              </div>
            </fieldset>
          )}
          <fieldset className="sm:col-span-2">
            <legend className={label}>Principal objetivo na plataforma</legend>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {goals.map((g) => <button key={g} type="button" aria-pressed={goal === g} onClick={() => setGoal(g)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${goal === g ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{g}</button>)}
            </div>
          </fieldset>
          <div className="sm:col-span-2">{errorBox}</div>
          <div className="flex justify-between gap-2 sm:col-span-2">{backBtn}<button type="submit" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90">Continuar <ArrowRight size={15} /></button></div>
        </form>
      )}

      {step === 2 && (
        <form key="s2" onSubmit={(e) => void submit(e)} className="nv-fade-in grid gap-2.5 sm:grid-cols-2">
          <p className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground sm:col-span-2"><Building2 size={14} className="shrink-0 text-primary" /> <span><strong className="text-foreground">{business}</strong> · {t.label} · {city}</span></p>
          <label className={`${label} sm:col-span-2`}>Nome do responsável<input className={input} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label className={label}>E-mail de acesso<input className={input} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="contato@seunegocio.com" /></label>
          <label className={label}>WhatsApp<input className={input} type="tel" inputMode="tel" autoComplete="tel" value={fmtPhone(phone)} onChange={(e) => setPhone(e.target.value)} required placeholder="(68) 99999-9999" /></label>
          <label className={label}>Senha<input className={input} type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <label className={label}>Confirmar senha<input className={input} type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label>
          <label className="flex items-start gap-2 text-xs text-muted-foreground sm:col-span-2"><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" /> Confirmo que as informações são verdadeiras e que represento este negócio. O cadastro passa por aprovação da equipe NextVita.</label>
          <div className="sm:col-span-2">{errorBox}</div>
          <div className="flex justify-between gap-2 sm:col-span-2">{backBtn}
            <button type="submit" disabled={busy || disabled} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {busy ? <><Loader2 size={15} className="animate-spin" /> Criando…</> : "Criar conta de parceiro"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
