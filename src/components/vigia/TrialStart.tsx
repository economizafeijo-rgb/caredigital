import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Droplets,
  Gift,
  Loader2,
  Pill,
  Scale,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clientSectionHashes, type ClientSection } from "@/lib/client-pages";

export const trialErrorMessage = (message: string) =>
  /already used/i.test(message)
    ? "Este e-mail já ativou o acesso gratuito. Entre na sua conta para continuar."
    : /already linked/i.test(message)
      ? "Sua conta já tem um acompanhamento. Abra o painel."
      : /does not exist|schema cache|function/i.test(message)
        ? "O teste grátis ainda não foi habilitado no servidor. Tente mais tarde."
        : "Não foi possível iniciar o teste agora. Tente novamente.";

/** Ativa o acesso gratuito para a conta logada e recarrega o painel. */
export async function startTrial(name?: string) {
  const { data, error } = await (supabase as any).rpc("care_start_trial", { p_name: name ?? null });
  if (error) throw new Error(trialErrorMessage(error.message ?? ""));
  return data as { expires_on: string };
}

export function ActivateTrialCard() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run() {
    setBusy(true);
    setError("");
    try {
      const { data } = await supabase.auth.getUser();
      await startTrial(String(data.user?.user_metadata?.full_name ?? ""));
      window.location.assign("/cliente");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Erro ao iniciar o teste.");
      setBusy(false);
    }
  }
  return (
    <section className="mx-auto mt-8 w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-card shadow-pop">
      <div className="bg-gradient-to-br from-emerald-700 to-teal-700 p-6 text-white">
        <Gift size={34} />
        <h1 className="mt-3 text-2xl font-extrabold">O NextVita é gratuito para você</h1>
        <p className="mt-1 text-sm text-white/90">
          Sua conta está criada. Ative o acesso para liberar o painel completo, sem cartão, sem
          mensalidade e sem prazo.
        </p>
      </div>
      <div className="p-6">
        <button
          type="button"
          disabled={busy}
          onClick={() => void run()}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 text-base font-bold text-white shadow-sm hover:brightness-110 disabled:opacity-60"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} Ativar
          meu acesso gratuito
        </button>
        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Já é cliente? Peça ao administrador para vincular seu e-mail ao seu prontuário.
        </p>
      </div>
    </section>
  );
}

const steps: {
  key: string;
  section: ClientSection;
  icon: typeof Pill;
  title: string;
  text: string;
  gradient: string;
}[] = [
  {
    key: "agua",
    section: "hidratacao",
    icon: Droplets,
    title: "Defina sua meta de água",
    text: "Ajuste a meta e registre o primeiro copo com um toque.",
    gradient: "from-sky-600 to-cyan-500",
  },
  {
    key: "med",
    section: "medicacao",
    icon: Pill,
    title: "Cadastre um medicamento",
    text: "Escolha na biblioteca e veja o timer da próxima dose.",
    gradient: "from-rose-600 to-pink-500",
  },
  {
    key: "refeicao",
    section: "alimentacao",
    icon: UtensilsCrossed,
    title: "Registre uma refeição",
    text: "Escreva o que comeu e veja calorias e nutrientes.",
    gradient: "from-emerald-600 to-lime-500",
  },
  {
    key: "peso",
    section: "peso",
    icon: Scale,
    title: "Registre seu peso",
    text: "Acompanhe a evolução com gráficos e IMC.",
    gradient: "from-fuchsia-600 to-pink-500",
  },
  {
    key: "agenda",
    section: "agenda",
    icon: CalendarCheck2,
    title: "Conheça sua agenda",
    text: "Todos os cuidados do dia em um só lugar.",
    gradient: "from-violet-600 to-fuchsia-500",
  },
];
const storeKey = "caredigital-trial-tour";
const readDone = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(storeKey) ?? "[]");
  } catch {
    return [];
  }
};

/** Roteiro de primeiros passos para quem acabou de entrar: guia o visitante pelas áreas principais. */
export function TrialTour() {
  const [done, setDone] = useState<string[]>(readDone);
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(storeKey + "-hidden") === "1";
    } catch {
      return false;
    }
  });
  if (hidden) return null;
  const mark = (key: string) => {
    const next = Array.from(new Set([...done, key]));
    setDone(next);
    try {
      localStorage.setItem(storeKey, JSON.stringify(next));
    } catch {
      /* ok */
    }
  };
  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(storeKey + "-hidden", "1");
    } catch {
      /* ok */
    }
  };
  const pct = Math.round((done.length / steps.length) * 100);
  return (
    <section
      className="mb-3 overflow-hidden rounded-3xl border border-emerald-500/30 bg-card shadow-card"
      aria-label="Primeiros passos"
    >
      <div className="flex flex-wrap items-center gap-3 bg-gradient-to-r from-emerald-700 to-teal-700 p-4 text-white">
        <Gift size={24} />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold">Bem-vindo ao NextVita · acesso gratuito</h2>
          <p className="text-sm text-white/90">
            Siga os 5 passos para conhecer a plataforma em poucos minutos.
          </p>
        </div>
        <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-bold">
          {done.length}/{steps.length} · {pct}%
        </span>
        <button
          type="button"
          onClick={hide}
          aria-label="Ocultar primeiros passos"
          className="grid size-9 place-items-center rounded-lg hover:bg-white/15"
        >
          <X size={18} />
        </button>
      </div>
      <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map(({ key, section, icon: Icon, title, text, gradient }, index) => {
          const ok = done.includes(key);
          return (
            <Link
              key={key}
              to="/cliente"
              hash={clientSectionHashes[section]}
              onClick={() => mark(key)}
              className={`group flex flex-col rounded-2xl border p-3 transition hover:-translate-y-0.5 ${ok ? "border-emerald-500/40 bg-emerald-500/[.06]" : "border-border hover:border-emerald-500/50"}`}
            >
              <span className="flex items-center justify-between">
                <span
                  className={`grid size-9 place-items-center rounded-xl bg-gradient-to-br text-white ${gradient}`}
                >
                  <Icon size={17} />
                </span>
                {ok ? (
                  <CheckCircle2 size={18} className="text-emerald-500" />
                ) : (
                  <span className="text-xs font-bold text-muted-foreground">Passo {index + 1}</span>
                )}
              </span>
              <strong className="mt-2 text-sm">{title}</strong>
              <span className="flex-1 text-xs text-muted-foreground">{text}</span>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                {ok ? "Abrir de novo" : "Começar"} <ArrowRight size={13} />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
