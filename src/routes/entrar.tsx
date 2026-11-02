import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSupabaseConfigurationIssue } from "@/lib/supabase-session";

export const Route = createFileRoute("/entrar")({
  head: () => ({ meta: [{ title: "Entrar na conta — CareDigital" }] }),
  component: Entrar,
});

type Mode = "login" | "forgot" | "reset";
type Notice = { type: "error" | "success"; message: string } | null;

function authErrorMessage(error: { message?: string; code?: string; status?: number }): string {
  const code = (error.code ?? "").toLowerCase();
  const raw = (error.message ?? "").toLowerCase();
  if (code === "email_not_confirmed" || raw.includes("email not confirmed")) {
    return "Confirme o e-mail da conta antes de entrar. Verifique sua caixa de entrada.";
  }
  if (code === "over_request_rate_limit" || error.status === 429) {
    return "Muitas tentativas em pouco tempo. Aguarde e tente novamente.";
  }
  if (code === "invalid_credentials" || raw.includes("invalid login credentials")) {
    return "E-mail ou senha não conferem. Verifique os dados ou utilize 'Esqueci minha senha'.";
  }
  if (raw.includes("failed to fetch") || raw.includes("network")) {
    return "Não foi possível conectar ao serviço de autenticação. Verifique sua conexão.";
  }
  return "Não foi possível concluir o acesso. Tente novamente ou solicite ajuda ao administrador.";
}

function Entrar() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const configurationIssue = getSupabaseConfigurationIssue();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
        setNotice(null);
      }
    });
    // Some email clients keep the hash on the URL while the auth client
    // exchanges the recovery token. Ensure the password form stays accessible.
    if (window.location.hash.includes("type=recovery") ||
        new URLSearchParams(window.location.search).get("type") === "recovery") {
      setMode("reset");
    }
    return () => subscription.unsubscribe();
  }, []);

  async function openAuthenticatedArea(userId: string, userEmail: string) {
    if (userEmail.trim().toLowerCase() === "francdenisbr@gmail.com") {
      await navigate({to: "/admin"});
      return;
    }
    const {data: grants, error} = await (supabase as any).from("care_patient_access")
      .select("patient_id").eq("user_id", userId).limit(1);
    if (error) {
      setNotice({type:"error",message:"Login realizado, mas não foi possível consultar as permissões do prontuário. Tente atualizar a página."});
      return;
    }
    if (!grants?.length) {
      setNotice({type:"error",message:"Login realizado, mas esta conta ainda não está vinculada a um prontuário. Solicite acesso ao administrador."});
      return;
    }
    await navigate({to:"/cliente"});
  }

  async function handleLogin(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || configurationIssue) return;
    setBusy(true); setNotice(null);
    try {
      const {data,error} = await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});
      if (error) {setNotice({type:"error",message:authErrorMessage(error)});return;}
      if (!data.user || !data.session) {
        setNotice({type:"error",message:"A autenticação não criou uma sessão. Entre novamente."});
        return;
      }
      await openAuthenticatedArea(data.user.id,data.user.email??"");
    } catch {
      setNotice({type:"error",message:"Falha de conexão durante o login. Tente novamente."});
    } finally {
      setBusy(false);
    }
  }

  async function handleForgot(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || configurationIssue) return;
    setBusy(true); setNotice(null);
    try {
      const redirectTo = window.location.origin + "/entrar";
      const {error} = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(),{redirectTo});
      if (error) {setNotice({type:"error",message:authErrorMessage(error)});return;}
      setNotice({type:"success",message:"Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha. Verifique também a caixa de spam."});
    } catch {
      setNotice({type:"error",message:"Não foi possível solicitar a recuperação. Tente novamente."});
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setNotice(null);
    if (newPassword.length < 8) {
      setNotice({type:"error",message:"Use uma nova senha com pelo menos 8 caracteres."});
      return;
    }
    if (newPassword !== confirmPassword) {
      setNotice({type:"error",message:"As senhas informadas não são iguais."});
      return;
    }
    setBusy(true);
    try {
      const {data:{user}} = await supabase.auth.getUser();
      if (!user) {
        setNotice({type:"error",message:"O link de recuperação expirou. Solicite outro link na tela de entrada."});
        return;
      }
      const {error} = await supabase.auth.updateUser({password:newPassword});
      if (error) {setNotice({type:"error",message:authErrorMessage(error)});return;}
      setNewPassword("");setConfirmPassword("");
      setNotice({type:"success",message:"Senha atualizada com sucesso. Abrindo seu acompanhamento…"});
      await openAuthenticatedArea(user.id,user.email??"");
    } catch {
      setNotice({type:"error",message:"Não foi possível atualizar a senha. Solicite um novo link."});
    } finally {
      setBusy(false);
    }
  }

  const title = mode==="login"?"Acesse seu acompanhamento":mode==="forgot"?"Recuperar acesso":"Criar nova senha";

  return <main className="mx-auto flex min-h-full w-full max-w-[520px] flex-col justify-center py-4 sm:py-6" aria-label="Acesso CareDigital">
    <section className="overflow-hidden rounded-3xl border border-border bg-card/95 shadow-[0_22px_70px_-42px_rgba(15,50,45,.4)]">
      <div className="flex items-center gap-3 border-b border-border bg-primary/5 px-5 py-4 sm:px-6">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><LockKeyhole size={21}/></div>
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-primary">CareDigital · Conta protegida</p>
          <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-foreground">{title}</h1>
        </div>
      </div>
      <div className="space-y-4 p-5 sm:p-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {mode==="login"
            ?"Entre com o e-mail e a senha cadastrados. Cada paciente acessa apenas seu próprio prontuário."
            :mode==="forgot"
            ?"Informe o e-mail da conta para solicitar um link seguro de recuperação."
            :"Defina uma senha nova e segura para sua conta."}
        </p>
        {configurationIssue && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs font-semibold text-destructive">{configurationIssue}</div>}
        {notice && <div role={notice.type==="error"?"alert":"status"} className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium leading-relaxed ${notice.type==="error"?"border-destructive/25 bg-destructive/5 text-destructive":"border-success/25 bg-success/10 text-foreground"}`}>
          {notice.type==="success"?<CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success"/>:<ShieldCheck size={16} className="mt-0.5 shrink-0"/>}
          {notice.message}
        </div>}

        {mode==="login"&&<form className="space-y-3" onSubmit={event=>void handleLogin(event)}>
          <label className="block text-xs font-bold text-foreground">E-mail cadastrado
            <span className="relative mt-1.5 block"><Mail size={17} className="pointer-events-none absolute left-3 top-3 text-muted-foreground"/><input type="email" autoComplete="username" className="field !pl-10" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="seuemail@exemplo.com" disabled={busy}/></span>
          </label>
          <label className="block text-xs font-bold text-foreground">Senha
            <span className="relative mt-1.5 block">
              <KeyRound size={17} className="pointer-events-none absolute left-3 top-3 text-muted-foreground"/>
              <input type={showPassword?"text":"password"} autoComplete="current-password" className="field !pl-10 !pr-11" required value={password} onChange={event=>setPassword(event.target.value)} disabled={busy}/>
              <button type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?"Ocultar senha":"Mostrar senha"} className="absolute right-2 top-1.5 grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted">{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button>
            </span>
          </label>
          <div className="flex justify-end">
            <button type="button" onClick={()=>{setMode("forgot");setNotice(null)}} className="text-xs font-semibold text-primary hover:underline">Esqueci minha senha</button>
          </div>
          <button type="submit" disabled={busy||!!configurationIssue} className="flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">{busy?"Validando acesso…":"Entrar na minha conta"}</button>
        </form>}

        {mode==="forgot"&&<form className="space-y-3" onSubmit={event=>void handleForgot(event)}>
          <label className="block text-xs font-bold text-foreground">E-mail da conta
            <input type="email" autoComplete="email" className="field mt-1.5" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="seuemail@exemplo.com" disabled={busy}/>
          </label>
          <button type="submit" disabled={busy||!!configurationIssue} className="h-11 w-full rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy?"Enviando solicitação…":"Enviar link de recuperação"}</button>
          <button type="button" className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline" onClick={()=>{setMode("login");setNotice(null)}}><ArrowLeft size={14}/> Voltar ao login</button>
        </form>}

        {mode==="reset"&&<form className="space-y-3" onSubmit={event=>void handleReset(event)}>
          <label className="block text-xs font-bold text-foreground">Nova senha (8 ou mais caracteres)
            <input type="password" autoComplete="new-password" className="field mt-1.5" minLength={8} required value={newPassword} onChange={event=>setNewPassword(event.target.value)} disabled={busy}/>
          </label>
          <label className="block text-xs font-bold text-foreground">Confirmar nova senha
            <input type="password" autoComplete="new-password" className="field mt-1.5" minLength={8} required value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)} disabled={busy}/>
          </label>
          <button type="submit" disabled={busy||!!configurationIssue} className="h-11 w-full rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy?"Salvando…":"Salvar nova senha"}</button>
          <button type="button" onClick={()=>{setMode("forgot");setNotice(null)}} className="text-xs font-semibold text-primary hover:underline">Solicitar outro link</button>
        </form>}

        <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
          <Link to="/" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"><ArrowLeft size={14}/> Voltar à homepage</Link>
          <span className="inline-flex items-center gap-1"><ShieldCheck size={14} className="text-primary"/> Acesso individual</span>
        </div>
      </div>
    </section>
  </main>;
}
