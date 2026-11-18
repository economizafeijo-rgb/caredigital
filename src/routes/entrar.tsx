import { FitPage } from "@/components/vigia/FitPage";
import { endOtherSessions } from "@/components/vigia/SessionGuard";
import { AuthStage, type AuthStatus } from "@/components/vigia/AuthStage";
import { PartnerSignup } from "@/components/vigia/PartnerSignup";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type InputHTMLAttributes } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  Phone,
  Ruler,
  Scale,
  ShieldCheck,
  User,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapPublicSignup } from "@/lib/public-signup-bootstrap";
import { getSupabaseConfigurationIssue } from "@/lib/supabase-session";
import {
  formatBrazilPhone,
  formatCpf,
  isValidBirthDate,
  isValidBrazilPhone,
  isValidCpf,
  normalizeBrazilPhone,
  normalizeCpf,
} from "@/lib/public-signup-validation";

export const Route = createFileRoute("/entrar")({
  head: () => ({ meta: [{ title: "Entrar ou criar conta grátis — NextVita" }] }),
  component: Entrar,
});

type Mode = "login" | "signup" | "vendor" | "forgot" | "reset";
type Notice = { type: "error" | "success"; message: string } | null;

function authErrorMessage(error: { message?: string; code?: string; status?: number }): string {
  const code = (error.code ?? "").toLowerCase();
  const raw = (error.message ?? "").toLowerCase();
  if (code === "email_not_confirmed" || raw.includes("email not confirmed"))
    return "Confirme o e-mail da conta antes de entrar. Verifique sua caixa de entrada.";
  if (code === "over_request_rate_limit" || error.status === 429)
    return "Muitas tentativas em pouco tempo. Aguarde e tente novamente.";
  if (code === "invalid_credentials" || raw.includes("invalid login credentials"))
    return "E-mail ou senha não conferem. Se você acabou de se cadastrar, use o botão para reenviar a confirmação.";
  if (raw.includes("already registered") || raw.includes("user already registered"))
    return "Este e-mail já possui uma conta. Entre ou recupere sua senha.";
  if (raw.includes("failed to fetch") || raw.includes("network"))
    return "Não foi possível conectar ao serviço de autenticação. Verifique sua conexão.";
  return "Não foi possível concluir o acesso. Tente novamente ou solicite ajuda ao administrador.";
}

function Entrar() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [focus, setFocus] = useState<"email" | "password" | "other" | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("idle");
  // Aparelho desconectado porque a conta entrou em outro dispositivo.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("reason") === "other-device")
      setNotice({ type: "error", message: "Sua conta foi conectada em outro dispositivo e esta sessão foi encerrada. Por segurança, só um dispositivo fica conectado por vez. Entre novamente para continuar aqui." });
  }, []);
  const configurationIssue = getSupabaseConfigurationIssue();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
        setNotice(null);
      }
    });
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hashParams.get("error_code") === "otp_expired") {
      setMode("login");
      setNotice({
        type: "error",
        message:
          "Este link de confirmação expirou. Informe seu e-mail e use o botão para reenviar uma nova confirmação.",
      });
      setNeedsConfirmation(true);
    } else if (window.location.hash.includes("type=recovery") || params.get("type") === "recovery")
      setMode("reset");
    else if (params.get("mode") === "signup") setMode("signup");
    else if (params.get("mode") === "lojista") setMode("vendor");
    return () => subscription.unsubscribe();
  }, []);

  async function openAuthenticatedArea(userId: string, userEmail: string) {
    if (userEmail.trim().toLowerCase() === "francdenisbr@gmail.com") {
      await navigate({ to: "/admin" });
      return;
    }
    // Quem veio de "Seja lojista" volta para lá depois de entrar.
    try {
      const back = window.sessionStorage.getItem("nv_after_login");
      window.sessionStorage.removeItem("nv_after_login");
      if (back && /^\/[a-z0-9\-/]*$/i.test(back) && !back.startsWith("//")) {
        await navigate({ to: back as "/lojista" });
        return;
      }
    } catch { /* sem armazenamento */ }
    // Conta criada pelo cadastro de lojista vai direto para o painel da loja.
    const { data: current } = await supabase.auth.getUser();
    // Dono de loja (cadastrado como lojista ou com loja transferida pelo administrador) abre o painel da loja.
    const { data: ownStore } = await (supabase as any).from("care_store_vendors").select("id").eq("owner_id", userId).limit(1);
    if (current.user?.user_metadata?.account_type === "vendor" || ownStore?.length) {
      await navigate({ to: "/lojista" });
      return;
    }
    const { data: grants, error } = await (supabase as any)
      .from("care_patient_access")
      .select("patient_id")
      .eq("user_id", userId)
      .limit(1);
    if (error) {
      setNotice({
        type: "error",
        message:
          "Login realizado, mas não foi possível consultar as permissões do prontuário. Tente atualizar a página.",
      });
      return;
    }
    if (!grants?.length) {
      setNotice({
        type: "error",
        message:
          "Login realizado, mas esta conta ainda não está vinculada a um prontuário. Solicite o acesso ao administrador.",
      });
      return;
    }
    await navigate({ to: "/cliente" });
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || configurationIssue) return;
    setBusy(true);
    setAuthStatus("busy");
    setNotice(null);
    setNeedsConfirmation(false);
    const fail = () => { setAuthStatus("error"); window.setTimeout(() => setAuthStatus("idle"), 1600); };
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        const confirmationRequired =
          error.code === "email_not_confirmed" ||
          error.message?.toLowerCase().includes("email not confirmed") ||
          error.code === "invalid_credentials";
        setNeedsConfirmation(confirmationRequired);
        setNotice({ type: "error", message: authErrorMessage(error) });
        fail();
        return;
      }
      if (!data.user || !data.session) {
        setNotice({
          type: "error",
          message: "A autenticação não criou uma sessão. Entre novamente.",
        });
        fail();
        return;
      }
      // Sessão única: este login passa a ser o único ativo da conta.
      await endOtherSessions();
      if (data.user.user_metadata?.nextvita_signup) await bootstrapPublicSignup(data.user);
      setAuthStatus("success");
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) await new Promise((r) => window.setTimeout(r, 700));
      await openAuthenticatedArea(data.user.id, data.user.email ?? "");
    } catch (error: any) {
      fail();
      setNotice({
        type: "error",
        message: error?.message?.includes("CPF")
          ? error.message
          : "Falha de conexão durante o login. Tente novamente.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleResendConfirmation() {
    if (resendBusy || !email.trim()) return;
    setResendBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
      });
      setNotice(
        error
          ? { type: "error", message: authErrorMessage(error) }
          : { type: "success", message: "Novo link enviado. Verifique também a caixa de spam." },
      );
      setNeedsConfirmation(false);
    } catch {
      setNotice({
        type: "error",
        message: "Não foi possível reenviar o link agora. Tente novamente.",
      });
    } finally {
      setResendBusy(false);
    }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || configurationIssue) return;
    setNotice(null);
    const normalizedCpf = normalizeCpf(cpf);
    const normalizedPhone = normalizeBrazilPhone(phone);
    const weight = Number(weightKg.replace(",", "."));
    const height = Number(heightCm.replace(",", "."));
    if (fullName.trim().length < 3)
      return setNotice({ type: "error", message: "Informe seu nome completo." });
    if (!isValidCpf(normalizedCpf))
      return setNotice({
        type: "error",
        message: "Informe um CPF válido com os dígitos verificadores corretos.",
      });
    if (!isValidBrazilPhone(normalizedPhone))
      return setNotice({ type: "error", message: "Informe um celular brasileiro válido com DDD." });
    if (!isValidBirthDate(birthDate))
      return setNotice({
        type: "error",
        message: "Informe uma data de nascimento válida que não esteja no futuro.",
      });
    if (!Number.isFinite(weight) || weight < 20 || weight > 350)
      return setNotice({ type: "error", message: "Informe um peso entre 20 e 350 kg." });
    if (!Number.isFinite(height) || height < 100 || height > 230)
      return setNotice({ type: "error", message: "Informe uma altura entre 100 e 230 cm." });
    if (password.length < 8)
      return setNotice({ type: "error", message: "Use uma senha com pelo menos 8 caracteres." });
    if (password !== confirmPassword)
      return setNotice({ type: "error", message: "As senhas informadas não são iguais." });
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/entrar?confirmed=1`,
          data: {
            account_type: "client",
            display_name: fullName.trim(),
            nextvita_signup: {
              fullName: fullName.trim(),
              cpf: normalizedCpf,
              phone: normalizedPhone,
              birthDate,
              weightKg: weight,
              heightCm: height,
            },
          },
        },
      });
      if (error) {
        setNotice({ type: "error", message: authErrorMessage(error) });
        return;
      }
      if (data.user && data.session) {
        await bootstrapPublicSignup(data.user);
        await openAuthenticatedArea(data.user.id, data.user.email ?? email);
        return;
      }
      setMode("login");
      setNeedsConfirmation(true);
      setPassword("");
      setConfirmPassword("");
      setNotice({
        type: "success",
        message:
          "Cadastro criado. Enviamos um link de confirmação para seu e-mail. Confirme a conta antes do primeiro acesso.",
      });
    } catch (error: any) {
      setNotice({
        type: "error",
        message: error?.message?.includes("CPF")
          ? error.message
          : "Não foi possível concluir o cadastro. Tente novamente.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleForgot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || configurationIssue) return;
    setBusy(true);
    setNotice(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: window.location.origin + "/entrar",
      });
      if (error) {
        setNotice({ type: "error", message: authErrorMessage(error) });
        return;
      }
      setNotice({
        type: "success",
        message:
          "Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha. Verifique também a caixa de spam.",
      });
    } catch {
      setNotice({
        type: "error",
        message: "Não foi possível solicitar a recuperação. Tente novamente.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setNotice(null);
    if (newPassword.length < 8)
      return setNotice({
        type: "error",
        message: "Use uma nova senha com pelo menos 8 caracteres.",
      });
    if (newPassword !== confirmPassword)
      return setNotice({ type: "error", message: "As senhas informadas não são iguais." });
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setNotice({
          type: "error",
          message: "O link de recuperação expirou. Solicite outro link na tela de entrada.",
        });
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setNotice({ type: "error", message: authErrorMessage(error) });
        return;
      }
      setNewPassword("");
      setConfirmPassword("");
      setNotice({
        type: "success",
        message: "Senha atualizada com sucesso. Abrindo seu acompanhamento…",
      });
      await openAuthenticatedArea(user.id, user.email ?? "");
    } catch {
      setNotice({
        type: "error",
        message: "Não foi possível atualizar a senha. Solicite um novo link.",
      });
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "login"
      ? "Acesse seu acompanhamento"
      : mode === "signup"
        ? "Crie sua conta grátis"
        : mode === "vendor"
          ? "Cadastro de parceiro"
          : mode === "forgot"
          ? "Recuperar acesso"
          : "Criar nova senha";
  const field = "field mt-1.5";
  const iconField = (Icon: LucideIcon, props: InputHTMLAttributes<HTMLInputElement>) => (
    <span className="relative block">
      <Icon size={17} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" />
      <input {...props} className={`${field} !pl-10 lg:min-h-9 lg:py-1`} />
    </span>
  );

  return (
    <FitPage
      label="Acesso NextVita"
      className="mx-auto grid w-full max-w-5xl items-stretch gap-5 py-1 lg:grid-cols-[1.05fr_1fr]"
    >
      <AuthStage mode={mode} email={email} password={mode === "login" ? password : newPassword || password} focus={focus} status={authStatus} />
      <section
        onFocusCapture={(e) => { const t = (e.target as HTMLInputElement).type; setFocus(t === "email" ? "email" : t === "password" || (e.target as HTMLInputElement).autocomplete?.includes("password") ? "password" : "other"); }}
        onBlurCapture={() => setFocus(null)}
        className="relative flex min-h-0 flex-col justify-center overflow-hidden rounded-3xl border border-border bg-card shadow-pop">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-500" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-center gap-3 px-4 pb-1 pt-5 sm:px-6">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-[0_8px_20px_-8px_rgba(16,185,129,.7)]">
            <LockKeyhole size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground">NextVita · conta protegida</p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-foreground">{title}</h1>
          </div>
        </div>
        <div className="relative space-y-3 p-4 sm:px-6 sm:py-5 lg:space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {mode === "login"
              ? "Entre com o e-mail e a senha cadastrados."
              : mode === "signup"
                ? "Preencha seus dados e use o NextVita completo, gratuitamente e sem prazo de validade."
                : mode === "vendor"
                  ? "Lojas, academias, personal trainers, profissionais de saúde e marcas. Três etapas rápidas; a equipe NextVita aprova o cadastro."
                  : mode === "forgot"
                  ? "Informe o e-mail da conta para solicitar um link seguro de recuperação."
                  : "Defina uma senha nova e segura para sua conta."}
          </p>
          {configurationIssue && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs font-semibold text-destructive"
            >
              {configurationIssue}
            </div>
          )}
          {notice && (
            <div
              role={notice.type === "error" ? "alert" : "status"}
              className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium leading-relaxed ${notice.type === "error" ? "border-destructive/25 bg-destructive/5 text-destructive" : "border-success/25 bg-success/10 text-foreground"}`}
            >
              {notice.type === "success" ? (
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
              ) : (
                <ShieldCheck size={16} className="mt-0.5 shrink-0" />
              )}
              {notice.message}
            </div>
          )}
          {needsConfirmation && (
            <button
              type="button"
              onClick={() => void handleResendConfirmation()}
              disabled={resendBusy}
              className="w-full rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 text-xs font-bold text-primary transition hover:bg-primary/10 disabled:opacity-50"
            >
              {resendBusy ? "Reenviando link…" : "Reenviar e-mail de confirmação"}
            </button>
          )}

          {(mode === "signup" || mode === "vendor") && (
            <div role="tablist" aria-label="Tipo de conta" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              {([["signup", "Quero me cuidar", "Conta pessoal grátis"], ["vendor", "Sou parceiro", "Loja, academia, personal"]] as const).map(([m, t, h]) => (
                <button key={m} role="tab" type="button" aria-selected={mode === m} onClick={() => { setMode(m); setNotice(null); }}
                  className={`rounded-lg px-3 py-2 text-left transition-colors ${mode === m ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  <strong className="block text-sm">{t}</strong><span className="block text-[11px] text-muted-foreground">{h}</span>
                </button>
              ))}
            </div>
          )}

          {mode === "login" && (
            <form className="space-y-3" onSubmit={(event) => void handleLogin(event)}>
              <label className="block text-xs font-bold text-foreground">
                E-mail cadastrado
                {iconField(Mail, {
                  type: "email",
                  autoComplete: "username",
                  required: true,
                  value: email,
                  onChange: (e) => setEmail(e.target.value),
                  placeholder: "seuemail@exemplo.com",
                  disabled: busy,
                })}
              </label>
              <label className="block text-xs font-bold text-foreground">
                Senha
                <span className="relative mt-1.5 block">
                  <KeyRound
                    size={17}
                    className="pointer-events-none absolute left-3 top-3 text-muted-foreground"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className={`${field} !pl-10 !pr-11`}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-2 top-1.5 grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setNotice(null);
                  }}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <button
                type="submit"
                disabled={busy || !!configurationIssue}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Validando acesso…" : "Entrar na minha conta"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setNotice(null);
                }}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-4 text-sm font-bold text-primary transition hover:bg-primary/10"
              >
                <UserPlus size={17} /> Criar conta grátis
              </button>
            </form>
          )}

          {mode === "signup" && (
            <form
              className="grid gap-2 sm:grid-cols-2"
              onSubmit={(event) => void handleSignup(event)}
            >
              <label className="block text-xs font-bold text-foreground sm:col-span-2">
                Nome completo
                {iconField(User, {
                  type: "text",
                  autoComplete: "name",
                  required: true,
                  value: fullName,
                  onChange: (e) => setFullName(e.target.value.toUpperCase()),
                  placeholder: "Seu nome completo",
                  disabled: busy,
                })}
              </label>
              <label className="block text-xs font-bold text-foreground">
                E-mail
                {iconField(Mail, {
                  type: "email",
                  autoComplete: "email",
                  required: true,
                  value: email,
                  onChange: (e) => setEmail(e.target.value),
                  placeholder: "seuemail@exemplo.com",
                  disabled: busy,
                })}
              </label>
              <label className="block text-xs font-bold text-foreground">
                CPF
                {iconField(CreditCard, {
                  type: "text",
                  inputMode: "numeric",
                  autoComplete: "off",
                  required: true,
                  value: formatCpf(cpf),
                  onChange: (e) => setCpf(e.target.value),
                  placeholder: "000.000.000-00",
                  disabled: busy,
                })}
              </label>
              <label className="block text-xs font-bold text-foreground">
                Celular
                {iconField(Phone, {
                  type: "tel",
                  inputMode: "tel",
                  autoComplete: "tel",
                  required: true,
                  value: formatBrazilPhone(phone),
                  onChange: (e) => setPhone(e.target.value),
                  placeholder: "(68) 99999-9999",
                  disabled: busy,
                })}
              </label>
              <label className="block text-xs font-bold text-foreground">
                Data de nascimento
                {iconField(CalendarDays, {
                  type: "date",
                  autoComplete: "bday",
                  required: true,
                  value: birthDate,
                  onChange: (e) => setBirthDate(e.target.value),
                  disabled: busy,
                })}
              </label>
              <label className="block text-xs font-bold text-foreground">
                Peso em kg
                {iconField(Scale, {
                  type: "number",
                  inputMode: "decimal",
                  min: 20,
                  max: 350,
                  step: "0.1",
                  required: true,
                  value: weightKg,
                  onChange: (e) => setWeightKg(e.target.value),
                  placeholder: "70",
                  disabled: busy,
                })}
              </label>
              <label className="block text-xs font-bold text-foreground">
                Altura em cm
                {iconField(Ruler, {
                  type: "number",
                  inputMode: "decimal",
                  min: 100,
                  max: 230,
                  step: "0.1",
                  required: true,
                  value: heightCm,
                  onChange: (e) => setHeightCm(e.target.value),
                  placeholder: "170",
                  disabled: busy,
                })}
              </label>
              <label className="block text-xs font-bold text-foreground">
                Senha
                {iconField(KeyRound, {
                  type: "password",
                  autoComplete: "new-password",
                  minLength: 8,
                  required: true,
                  value: password,
                  onChange: (e) => setPassword(e.target.value),
                  disabled: busy,
                })}
              </label>
              <label className="block text-xs font-bold text-foreground">
                Confirmar senha
                {iconField(KeyRound, {
                  type: "password",
                  autoComplete: "new-password",
                  minLength: 8,
                  required: true,
                  value: confirmPassword,
                  onChange: (e) => setConfirmPassword(e.target.value),
                  disabled: busy,
                })}
              </label>
              <p className="text-[11px] leading-relaxed text-muted-foreground sm:col-span-2">
                O e-mail será confirmado antes do primeiro acesso. Seus dados ficam vinculados à sua
                própria conta.
              </p>
              <button
                type="submit"
                disabled={busy || !!configurationIssue}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50 sm:col-span-2"
              >
                {busy ? "Criando sua conta…" : "Criar minha conta grátis"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setNotice(null);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline sm:col-span-2"
              >
                <ArrowLeft size={14} /> Já tenho uma conta
              </button>
            </form>
          )}

          {mode === "vendor" && (
            <PartnerSignup
              disabled={!!configurationIssue}
              errorMessage={authErrorMessage}
              onSignedIn={openAuthenticatedArea}
              onBack={() => { setMode("login"); setNotice(null); }}
              onNeedsConfirmation={(mail) => {
                setEmail(mail);
                setMode("login");
                setNeedsConfirmation(true);
                setNotice({ type: "success", message: "Conta de parceiro criada. Confirme o e-mail que enviamos e depois entre para concluir o cadastro do seu negócio." });
              }}
            />
          )}

          {mode === "forgot" && (
            <form className="space-y-3" onSubmit={(event) => void handleForgot(event)}>
              <label className="block text-xs font-bold text-foreground">
                E-mail da conta
                <input
                  type="email"
                  autoComplete="email"
                  className={field}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  disabled={busy}
                />
              </label>
              <button
                type="submit"
                disabled={busy || !!configurationIssue}
                className="h-11 w-full rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Enviando solicitação…" : "Enviar link de recuperação"}
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                onClick={() => {
                  setMode("login");
                  setNotice(null);
                }}
              >
                <ArrowLeft size={14} /> Voltar ao login
              </button>
            </form>
          )}
          {mode === "reset" && (
            <form className="space-y-3" onSubmit={(event) => void handleReset(event)}>
              <label className="block text-xs font-bold text-foreground">
                Nova senha (8 ou mais caracteres)
                <input
                  type="password"
                  autoComplete="new-password"
                  className={field}
                  minLength={8}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="block text-xs font-bold text-foreground">
                Confirmar nova senha
                <input
                  type="password"
                  autoComplete="new-password"
                  className={field}
                  minLength={8}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={busy}
                />
              </label>
              <button
                type="submit"
                disabled={busy || !!configurationIssue}
                className="h-11 w-full rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Salvando…" : "Salvar nova senha"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setNotice(null);
                }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Solicitar outro link
              </button>
            </form>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
            >
              <ArrowLeft size={14} /> Voltar à homepage
            </Link>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck size={14} className="text-primary" /> Acesso individual
            </span>
          </div>
        </div>
      </section>
    </FitPage>
  );
}
