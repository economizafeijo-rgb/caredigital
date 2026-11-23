import {
  BadgeCheck,
  Check,
  Droplets,
  LockKeyhole,
  Megaphone,
  Pill,
  ShieldCheck,
  Store,
  Users,
  UtensilsCrossed,
} from "lucide-react";
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
  const local =
    email
      .split("@")[0]
      ?.replace(/[0-9._-]+/g, " ")
      .trim()
      .split(" ")[0] ?? "";
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
  const progress =
    status === "success" ? 1 : Math.min(1, (okEmail ? 0.5 : 0) + Math.min(password.length, 6) / 12);
  const blur = Math.round((1 - progress) * 6);
  const caption =
    status === "success"
      ? "Acesso liberado. Abrindo o seu painel."
      : status === "busy"
        ? "Validando o seu acesso…"
        : status === "error"
          ? "Confira o e-mail e a senha ao lado."
          : mode !== "login"
            ? "Crie sua conta e acompanhe a sua rotina num só lugar."
            : "Seu dia aparece aqui assim que você entrar.";

  if (mode === "vendor")
    return (
      <aside
        aria-hidden="true"
        className="nv-dark relative isolate flex min-h-[300px] flex-col justify-between gap-6 overflow-hidden rounded-3xl bg-[#0b0f1a] p-6 text-white shadow-pop lg:min-h-0 lg:p-8"
      >
        <img
          src="/images/hero-suplementos.webp"
          alt=""
          className="nv-kenburns absolute inset-0 -z-30 size-full object-cover object-[70%_50%]"
          style={{ animationDuration: "26s" }}
        />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,rgba(8,11,20,.55)_0%,rgba(8,11,20,.35)_40%,rgba(8,11,20,.94)_80%,#080b14_100%)]" />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(8,11,20,.85)_0%,rgba(8,11,20,.2)_70%)]" />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <LogoMark size={34} />
            <span className="font-display text-lg font-extrabold">
              NextVita <span className="text-amber-300">Parceiros</span>
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[11px] font-semibold text-white/85 backdrop-blur">
            <ShieldCheck size={12} className="text-amber-300" /> Sem mensalidade para começar
          </span>
        </div>

        {/* Prévia do painel da loja: pedido chegando e nota da loja */}
        <div className="pointer-events-none absolute right-6 top-24 hidden flex-col items-end gap-2.5 lg:flex">
          <span className="nv-float inline-flex items-center gap-2.5 rounded-2xl border border-white/15 bg-white/10 p-2 pr-3.5 text-xs backdrop-blur-md">
            <img
              src="/loja/v2/whey.webp"
              alt=""
              className="size-10 rounded-xl bg-white object-cover"
            />
            <span className="leading-tight">
              <strong className="block font-semibold">Novo pedido · #128</strong>
              <span className="text-white/65">Whey Protein · R$ 149,90</span>
            </span>
          </span>
          <span
            className="nv-float mr-8 inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur-md"
            style={{ animationDelay: "1.3s" }}
          >
            <span className="grid size-6 place-items-center rounded-lg bg-amber-300/25 text-amber-200">
              <BadgeCheck size={13} />
            </span>{" "}
            Loja verificada · nota 4,8
          </span>
        </div>

        <div className="max-w-sm">
          <p className="font-display text-2xl font-extrabold leading-tight">
            Apareça para quem já cuida da saúde todos os dias.
          </p>
          <ul className="mt-4 grid gap-2.5 text-sm text-white/85">
            {[
              [Store, "Vitrine própria com link e QR Code"],
              [Megaphone, "Pedidos, estoque, caixa e chat num painel"],
              [Users, "Público que acompanha treino, dieta e rotina"],
            ].map(([I, t]) => {
              const Icon = I as typeof Store;
              return (
                <li key={t as string} className="flex items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-300/15 text-amber-200 ring-1 ring-amber-300/20">
                    <Icon size={15} />
                  </span>
                  {t as string}
                </li>
              );
            })}
          </ul>
          <p className="mt-5 flex items-center gap-2 text-xs text-white/55">
            <ShieldCheck size={14} /> Cadastro analisado pela equipe NextVita.
          </p>
        </div>
      </aside>
    );

  const mobileBand = (
    <div
      aria-hidden="true"
      className="nv-dark relative isolate -mx-3 -mt-3 overflow-hidden bg-[#06101f] pb-12 text-white lg:hidden"
    >
      <img
        src="/images/caredigital-care-hero.webp"
        alt=""
        className="absolute inset-0 -z-30 size-full object-cover object-[75%_20%] opacity-60"
      />
      <span className="absolute inset-0 -z-20 bg-gradient-to-b from-[#06101f]/60 via-[#06101f]/70 to-[#06101f]" />
      <span
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70% 60% at 100% 0%, rgba(99,102,241,.35), transparent 70%), radial-gradient(60% 50% at 0% 100%, rgba(63,224,200,.22), transparent 70%)",
        }}
      />
      <div className="px-5 pt-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            <LogoMark size={32} />
            <span className="font-display text-lg font-extrabold">
              Next<span className="text-[#3fe0c8]">Vita</span>
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
            <ShieldCheck size={12} className="text-[#3fe0c8]" /> Conexão segura
          </span>
        </div>
        <p className="mt-6 text-balance font-display text-[1.7rem] font-extrabold leading-[1.1] tracking-[-0.02em]">
          {name
            ? `Olá, ${name}.`
            : mode === "signup"
              ? "Cuide da sua rotina e compre de quem é daqui."
              : "Sua rotina de saúde e as lojas de Feijó."}
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {rows.map((r) => (
            <li
              key={r.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11.5px] font-semibold backdrop-blur"
            >
              <r.icon size={12} style={{ color: r.color }} /> {r.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <>
      {mobileBand}
      <aside
        aria-hidden="true"
        className="nv-dark relative isolate flex min-h-[320px] flex-col justify-between gap-6 overflow-hidden rounded-3xl bg-[#04140f] p-6 text-white shadow-pop max-lg:hidden lg:min-h-0 lg:p-8"
      >
        <img
          src="/images/caredigital-care-hero.webp"
          alt=""
          className="nv-kenburns absolute inset-0 -z-30 size-full object-cover object-[60%_30%]"
          style={{ animationDuration: "24s" }}
        />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,rgba(3,18,14,.55)_0%,rgba(3,18,14,.25)_35%,rgba(3,18,14,.92)_78%,#03120e_100%)]" />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(3,18,14,.75),transparent_60%)]" />
        <div className="absolute inset-0 -z-10 opacity-[.13] [background-image:linear-gradient(rgba(126,240,204,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(126,240,204,.5)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(180deg,#000,transparent_70%)]" />
        <div className="nv-auth-scan pointer-events-none absolute inset-x-0 -z-10 h-24 bg-gradient-to-b from-transparent via-emerald-300/10 to-transparent" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <LogoMark size={34} />
            <span className="font-display text-lg font-extrabold">
              Next<span className="text-[#7ef0cc]">Vita</span>
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[11px] font-semibold text-white/85 backdrop-blur">
            <i className="relative size-1.5 rounded-full bg-emerald-400">
              <i className="absolute inset-0 animate-ping rounded-full bg-emerald-400" />
            </i>{" "}
            Conexão criptografada
          </span>
        </div>

        <div className="pointer-events-none absolute right-6 top-24 hidden flex-col items-end gap-2 lg:flex">
          <span
            className="nv-float inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur-md"
            style={{ animationDelay: "0s" }}
          >
            <span className="grid size-6 place-items-center rounded-lg bg-sky-400/25 text-sky-200">
              <Droplets size={13} />
            </span>{" "}
            Meta de água · 72%
          </span>
          <span
            className="nv-float mr-6 inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur-md"
            style={{ animationDelay: "1.2s" }}
          >
            <span className="grid size-6 place-items-center rounded-lg bg-violet-400/25 text-violet-200">
              <Pill size={13} />
            </span>{" "}
            Próxima dose · 14:00
          </span>
        </div>

        <div className="w-full max-w-sm">
          <p className="font-display text-2xl font-extrabold leading-tight transition-opacity duration-300">
            {name ? `Olá, ${name}.` : "Sua saúde, organizada em um só lugar."}
          </p>
          <p className="mt-1 text-sm text-white/70">
            {name
              ? "Seu painel está a um passo."
              : "Remédios, água, refeições, sono e movimento com lembretes no horário certo."}
          </p>
          <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/12 bg-black/35 p-4 shadow-2xl backdrop-blur-xl">
            <div
              className="transition-[filter,opacity] duration-500"
              style={{ filter: `blur(${blur}px)`, opacity: 0.55 + progress * 0.45 }}
            >
              <div className="flex items-center justify-between text-xs text-white/60">
                <span>Seu dia</span>
                <span className="tabular-nums">66% concluído</span>
              </div>
              <ul className="mt-3 grid gap-3">
                {rows.map((r) => (
                  <li key={r.label} className="flex items-center gap-3">
                    <span
                      className="grid size-8 shrink-0 place-items-center rounded-lg"
                      style={{ background: `${r.color}22`, color: r.color }}
                    >
                      <r.icon size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold">{r.label}</span>
                        <span className="text-white/60 tabular-nums">{r.value}</span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                        <i
                          className="block h-full rounded-full"
                          style={{
                            width: `${r.pct * Math.max(progress, 0.15)}%`,
                            background: r.color,
                            transition: "width .6s ease",
                          }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {status !== "success" && progress < 1 && (
              <span
                className="absolute inset-0 grid place-items-center transition-opacity duration-300"
                style={{ opacity: 1 - progress }}
              >
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white/85">
                  <LockKeyhole size={13} /> Protegido
                </span>
              </span>
            )}
            {status === "success" && (
              <span className="nv-fade-in absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-400 px-2.5 py-1 text-xs font-bold text-slate-950">
                <Check size={13} /> Acesso liberado
              </span>
            )}
          </div>
          <p
            key={caption}
            className={`nv-fade-in mt-3 text-sm ${status === "error" ? "text-rose-300" : "text-white/70"}`}
          >
            {caption}
          </p>
          <p className="mt-4 flex items-center gap-2 text-xs text-white/55">
            <ShieldCheck size={14} /> Acesso individual e dados pessoais protegidos.
          </p>
        </div>
      </aside>
    </>
  );
}
