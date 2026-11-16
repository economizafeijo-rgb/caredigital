import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Gift, KeyRound, Loader2, Mail, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startTrial } from "@/components/vigia/TrialStart";

export const Route = createFileRoute("/teste-gratis")({
  head: () => ({ meta: [{ title: "Teste grátis por 7 dias — NextVita" }, { name: "description", content: "Crie sua conta e use o NextVita completo por 7 dias, sem cartão." }] }),
  component: FreeTrial,
});

function FreeTrial() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (name.trim().length < 3) return setNotice({ ok: false, text: "Informe seu nome completo." });
    if (password.length < 6) return setNotice({ ok: false, text: "A senha precisa ter pelo menos 6 caracteres." });
    setBusy(true); setNotice(null);
    try {
      const signup = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password,
        options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin + "/cliente" } });
      if (signup.error) {
        setNotice({ ok: false, text: /registered|already/i.test(signup.error.message) ? "Este e-mail já tem conta. Use Entrar." : "Não foi possível criar a conta: " + signup.error.message });
        return;
      }
      if (!signup.data.session) {
        setNotice({ ok: true, text: "Conta criada! Enviamos um e-mail de confirmação. Confirme e depois entre para ativar seus 7 dias grátis." });
        return;
      }
      await startTrial(name.trim());
      await navigate({ to: "/cliente" });
      window.location.reload();
    } catch (failure) {
      setNotice({ ok: false, text: failure instanceof Error ? failure.message : "Erro inesperado. Tente novamente." });
    } finally { setBusy(false); }
  }

  const field = "block h-12 w-full rounded-xl border border-border bg-surface pl-10 pr-3 text-base";
  return <main className="mx-auto grid min-h-full w-full max-w-5xl items-center gap-5 py-4 lg:grid-cols-2" aria-label="Teste grátis">
    <aside className="relative isolate flex min-h-[200px] flex-col justify-end overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-pop lg:min-h-[560px] lg:p-8">
      <img src="/images/caredigital-care-hero.webp" alt="" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full object-cover object-[70%_20%]"/>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-emerald-950 via-emerald-950/65 to-transparent"/>
      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur"><Gift size={14}/> 7 dias grátis · sem cartão</span>
      <h1 className="mt-3 text-3xl font-extrabold leading-tight">Experimente o NextVita completo.</h1>
      <ul className="mt-3 grid gap-2 text-sm text-slate-100">
        {["Medicações com timer e confirmação", "Hidratação com meta e próximo copo calculado", "Nutrição automática, peso com gráficos e suplementos", "Roteiro de primeiros passos para conhecer tudo"].map(item => <li key={item} className="flex items-center gap-2"><CheckCircle2 size={16} className="shrink-0 text-emerald-300"/>{item}</li>)}
      </ul>
    </aside>
    <form onSubmit={submit} className="rounded-3xl border border-border bg-card p-6 shadow-pop">
      <h2 className="text-2xl font-extrabold">Criar conta e começar</h2>
      <p className="mt-1 text-sm text-muted-foreground">Leva menos de um minuto. Ao final dos 7 dias você decide se continua.</p>
      <div className="mt-5 grid gap-3 text-sm font-semibold">
        <label>Nome completo<span className="relative mt-1 block"><UserRound size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input className={field} value={name} onChange={e => setName(e.target.value)} autoComplete="name" required/></span></label>
        <label>E-mail<span className="relative mt-1 block"><Mail size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input type="email" className={field} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required/></span></label>
        <label>Crie uma senha<span className="relative mt-1 block"><KeyRound size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input type="password" className={field} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" minLength={6} required/></span></label>
        {notice && <p role="status" className={`rounded-xl px-3 py-2 font-medium ${notice.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 text-destructive"}`}>{notice.text}</p>}
        <button type="submit" disabled={busy} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-base font-bold text-white shadow-sm hover:brightness-110 disabled:opacity-60">
          {busy ? <Loader2 size={18} className="animate-spin"/> : <Gift size={18}/>} Começar meu teste grátis <ArrowRight size={17}/></button>
      </div>
      <p className="mt-4 text-center text-sm text-muted-foreground">Já tem conta? <Link to="/entrar" className="font-bold text-primary hover:underline">Entrar</Link></p>
      <p className="mt-2 text-center text-xs text-muted-foreground">O NextVita organiza sua rotina e não substitui orientação médica.</p>
    </form>
  </main>;
}
