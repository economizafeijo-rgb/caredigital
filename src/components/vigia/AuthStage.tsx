import { Activity, BedDouble, Check, Droplets, Pill, ShieldCheck, ShoppingBag, Utensils, X } from "lucide-react";

export type AuthStatus = "idle" | "busy" | "error" | "success";

type Props = {
  mode: string;
  email: string;
  password: string;
  focus: "email" | "password" | "other" | null;
  status: AuthStatus;
};

const orbit = [Pill, Droplets, Utensils, Activity, BedDouble, ShoppingBag];
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/** Painel interativo do acesso: reage ao que a pessoa digita, à validação e ao resultado do login. */
export function AuthStage({ mode, email, password, focus, status }: Props) {
  const okEmail = emailOk(email);
  const pwd = Math.min(password.length, 12);
  const progress = status === "success" ? 1 : Math.min(1, (okEmail ? 0.5 : Math.min(email.length, 12) / 24) + (pwd / 12) * 0.5);
  const message =
    status === "success" ? "Bem-vindo de volta! Abrindo o seu painel…"
    : status === "busy" ? "Validando o seu acesso com segurança…"
    : status === "error" ? "Não foi possível entrar. Confira os dados ao lado."
    : mode !== "login" ? "Sua conta NextVita: saúde, rotina e loja num só lugar."
    : focus === "password" ? (pwd >= 6 ? "Tudo pronto. Toque em Entrar." : "Digite a sua senha.")
    : focus === "email" ? (okEmail ? "E-mail reconhecido." : "Digite o e-mail cadastrado.")
    : okEmail && pwd >= 6 ? "Tudo pronto. Toque em Entrar." : "Entre para continuar o seu acompanhamento.";
  const ring = status === "error" ? "#f43f5e" : status === "success" ? "#34d399" : "#6ee7b7";

  return (
    <aside aria-hidden="true" className="nv-dark relative isolate flex min-h-[260px] flex-col overflow-hidden rounded-3xl bg-[#04140f] p-6 text-white shadow-pop lg:min-h-0 lg:p-8">
      <div className="nv-aurora-a pointer-events-none absolute -left-24 -top-24 -z-10 h-80 w-[30rem] rounded-full" />
      <div className="nv-aurora-b pointer-events-none absolute -bottom-28 -right-10 -z-10 h-72 w-[28rem] rounded-full" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:22px_22px]" />

      <p className="text-sm font-semibold text-emerald-200">NextVita · acesso protegido</p>

      <div className="relative mx-auto my-auto grid aspect-square w-[min(19rem,70%)] place-items-center">
        {/* Órbita com as áreas da plataforma */}
        <div className={`absolute inset-0 rounded-full border border-white/10 ${status === "busy" ? "nv-auth-spin-fast" : "nv-auth-spin"}`}>
          {orbit.map((Icon, i) => {
            const a = (i / orbit.length) * Math.PI * 2;
            return (
              <span key={i} className="absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl border border-white/15 bg-white/10 text-emerald-200 backdrop-blur"
                style={{ left: `${50 + Math.cos(a) * 50}%`, top: `${50 + Math.sin(a) * 50}%` }}>
                <Icon size={16} className="nv-auth-counter" />
              </span>
            );
          })}
        </div>

        {/* Anel de progresso do acesso */}
        <svg viewBox="0 0 120 120" className={`absolute inset-[14%] ${status === "error" ? "nv-auth-shake" : ""}`}>
          <circle cx="60" cy="60" r="52" fill="none" stroke="#ffffff14" strokeWidth="6" />
          <circle cx="60" cy="60" r="52" fill="none" stroke={ring} strokeWidth="6" strokeLinecap="round" pathLength={100}
            strokeDasharray={`${progress * 100} 100`} transform="rotate(-90 60 60)" style={{ transition: "stroke-dasharray .45s cubic-bezier(.2,.8,.2,1), stroke .3s" }}
            className={status === "busy" ? "nv-auth-busy" : ""} />
          {/* Pulso a cada letra digitada */}
          <circle key={`${email.length}-${password.length}`} cx="60" cy="60" r="40" fill="none" stroke={ring} strokeWidth="1.5" className={email || password ? "nv-auth-ping" : ""} opacity="0" />
        </svg>

        {/* Logo que se desenha conforme o formulário é preenchido */}
        <div className={`relative grid size-[34%] place-items-center rounded-[28%] shadow-2xl transition-colors duration-500 ${status === "success" ? "bg-emerald-500" : status === "error" ? "bg-rose-600" : "bg-[#0c8063]"}`}>
          {status === "success" ? (
            <Check className="nv-check size-1/2" strokeWidth={3} />
          ) : status === "error" ? (
            <X className="nv-check size-1/2" strokeWidth={3} />
          ) : (
            <svg viewBox="0 0 64 64" className="size-3/4">
              <path d="M19 45V19L45 45V27" fill="none" stroke="#fff" strokeWidth="6.2" strokeLinecap="round" strokeLinejoin="round" pathLength={1}
                strokeDasharray="1" strokeDashoffset={1 - Math.max(0.12, progress)} style={{ transition: "stroke-dashoffset .45s cubic-bezier(.2,.8,.2,1)" }} />
              <circle cx="45" cy="18" r="4.4" fill="#7ef0cc" style={{ opacity: progress >= 0.99 || (okEmail && pwd >= 6) ? 1 : 0.25, transition: "opacity .3s" }} />
            </svg>
          )}
          {status === "success" && <span className="nv-auth-burst absolute inset-0 rounded-[28%]" />}
        </div>
      </div>

      {/* Indicadores do que já foi preenchido */}
      <div className="grid gap-3">
        <div className="flex items-center gap-3 text-xs">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold transition-colors ${okEmail ? "bg-emerald-400/20 text-emerald-200" : "bg-white/10 text-white/60"}`}>
            {okEmail ? <Check size={12} /> : <span className="size-1.5 rounded-full bg-current" />} E-mail
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 font-semibold text-white/60">
            Senha
            <span className="ml-1 flex gap-0.5">
              {Array.from({ length: 8 }, (_, i) => <span key={i} className={`size-1.5 rounded-full transition-all duration-200 ${i < Math.min(pwd, 8) ? "scale-110 bg-emerald-300" : "bg-white/20"}`} />)}
            </span>
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-white/50"><ShieldCheck size={13} /> Conexão segura</span>
        </div>
        <p key={message} className="nv-fade-in font-display text-xl font-bold leading-snug sm:text-2xl">{message}</p>
      </div>
    </aside>
  );
}
