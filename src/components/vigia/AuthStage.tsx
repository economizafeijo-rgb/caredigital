import { Check, Droplets, LockKeyhole, Pill, ShieldCheck, UtensilsCrossed } from "lucide-react";
import { LogoMark } from "./Logo";

export type AuthStatus = "idle" | "busy" | "error" | "success";

type Props = {
  mode: string;
  email: string;
  password: string;
  focus: "email" | "password" | "other" | null;
  status: AuthStatus;
};

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
const nameFrom = (email: string) => {
  const local = email.split("@")[0]?.replace(/[0-9._-]+/g, " ").trim().split(" ")[0] ?? "";
  return local ? local.charAt(0).toUpperCase() + local.slice(1).toLowerCase() : "";
};

const rows = [
  { icon: Droplets, label: "Água", value: "1,8 de 2,5 L", pct: 72, color: "#38bdf8" },
  { icon: UtensilsCrossed, label: "Refeições", value: "3 de 5", pct: 60, color: "#34d399" },
  { icon: Pill, label: "Medicação", value: "2 de 3 doses", pct: 66, color: "#a78bfa" },
];

/** Painel do acesso, discreto: a prévia do seu dia fica nítida conforme você entra. */
export function AuthStage({ mode, email, password, status }: Props) {
  const okEmail = emailOk(email);
  const name = okEmail ? nameFrom(email) : "";
  const progress = status === "success" ? 1 : Math.min(1, (okEmail ? 0.5 : 0) + Math.min(password.length, 6) / 12);
  const blur = Math.round((1 - progress) * 6);
  const caption =
    status === "success" ? "Acesso liberado. Abrindo o seu painel."
    : status === "busy" ? "Validando o seu acesso…"
    : status === "error" ? "Confira o e-mail e a senha ao lado."
    : mode !== "login" ? "Crie sua conta e acompanhe a sua rotina num só lugar."
    : "Seu dia aparece aqui assim que você entrar.";

  return (
    <aside aria-hidden="true" className="nv-dark relative isolate flex min-h-[260px] flex-col justify-between gap-6 overflow-hidden rounded-3xl bg-[#062019] p-6 text-white shadow-pop lg:min-h-0 lg:p-9">
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 -z-10 size-[26rem] rounded-full bg-emerald-500/15 blur-3xl" />

      <div className="flex items-center gap-2.5">
        <LogoMark size={34} />
        <span className="font-display text-lg font-extrabold">Next<span className="text-[#7ef0cc]">Vita</span></span>
      </div>

      <div className="mx-auto w-full max-w-sm">
        <p className="mb-3 min-h-[1.75rem] font-display text-xl font-bold transition-opacity duration-300" style={{ opacity: name ? 1 : 0.5 }}>
          {name ? `Olá, ${name}.` : "Bem-vindo de volta."}
        </p>
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.06] p-4 backdrop-blur">
          <div className="transition-[filter,opacity] duration-500" style={{ filter: `blur(${blur}px)`, opacity: 0.55 + progress * 0.45 }}>
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Seu dia</span>
              <span className="tabular-nums">66% concluído</span>
            </div>
            <ul className="mt-3 grid gap-3">
              {rows.map((r) => (
                <li key={r.label} className="flex items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: `${r.color}22`, color: r.color }}><r.icon size={15} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-xs"><span className="font-semibold">{r.label}</span><span className="text-white/60 tabular-nums">{r.value}</span></div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10"><i className="block h-full rounded-full" style={{ width: `${r.pct * Math.max(progress, 0.15)}%`, background: r.color, transition: "width .6s ease" }} /></div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          {status !== "success" && progress < 1 && (
            <span className="absolute inset-0 grid place-items-center transition-opacity duration-300" style={{ opacity: 1 - progress }}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1 text-xs font-semibold text-white/80"><LockKeyhole size={13} /> Protegido</span>
            </span>
          )}
          {status === "success" && (
            <span className="nv-fade-in absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-400 px-2.5 py-1 text-xs font-bold text-slate-950"><Check size={13} /> Acesso liberado</span>
          )}
        </div>
        <p key={caption} className={`nv-fade-in mt-3 text-sm ${status === "error" ? "text-rose-300" : "text-white/70"}`}>{caption}</p>
      </div>

      <p className="flex items-center gap-2 text-xs text-white/55"><ShieldCheck size={14} /> Acesso individual e dados pessoais protegidos.</p>
    </aside>
  );
}
