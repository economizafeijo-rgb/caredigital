import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, ArrowRight, ClipboardList, Droplets, HeartPulse, LockKeyhole, Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ClientHomeSummary } from "@/components/vigia/ClientHomeSummary";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareDigital — Cuidado organizado" },
      { name: "description", content: "Acompanhe tratamentos, medicação, refeições e hidratação em um só lugar." },
      { property: "og:title", content: "CareDigital — Cuidado organizado" },
      { property: "og:description", content: "Um espaço simples e seguro para sua rotina de cuidados." },
    ],
  }),
  component: Homepage,
});

type Access = "loading" | "public" | "client" | "admin" | "unlinked";

function Homepage() {
  const [access, setAccess] = useState<Access>("loading");

  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) { setAccess("public"); return; }
      if ((data.user.email ?? "").trim().toLowerCase() === "francdenisbr@gmail.com") {
        setAccess("admin"); return;
      }
      const { data: grants, error } = await (supabase as any).from("care_patient_access")
        .select("patient_id").eq("user_id", data.user.id).limit(1);
      if (!active) return;
      setAccess(!error && grants?.length ? "client" : "unlinked");
    };
    void check();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => { void check(); });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, []);

  if (access === "loading") {
    return <div role="status" className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
      Preparando sua página…
    </div>;
  }

  if (access === "client") {
    return <div className="mx-auto flex min-h-0 w-full max-w-[1380px] flex-col lg:h-full">
      <ClientHomeSummary />
    </div>;
  }

  return <div className="mx-auto max-w-6xl space-y-4">
    <section className="relative isolate overflow-hidden rounded-3xl border border-[#9acbdc]/60 bg-gradient-to-br from-[#eaf7fc] via-[#d8f0f8] to-[#b5e4ee] text-[#102c43] shadow-[0_20px_55px_-36px_rgba(14,82,115,.4)] dark:border-[#7ec5da]/30 dark:from-[#132f44] dark:via-[#174056] dark:to-[#174f62] dark:text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 size-60 rounded-full bg-[#61c6d6]/25 blur-3xl"/>
      <div className="relative grid min-h-[310px] items-center gap-2 sm:min-h-[340px] sm:grid-cols-[minmax(275px,1fr)_minmax(0,1.4fr)]">
        <div className="relative mx-auto flex min-h-[210px] w-full items-center justify-center overflow-hidden px-3 py-3 sm:min-h-[300px] sm:px-0 sm:py-2">
          <div aria-hidden="true" className="pointer-events-none absolute inset-6 rounded-full bg-[#56c4cf]/15 blur-3xl"/>
          <img src="/images/caredigital-health-illustration.svg" width={780} height={540} loading="eager" decoding="async" alt="Ilustração de cuidados digitais com prontuário, medicamentos, hidratação e calendário" className="relative block h-auto max-h-[235px] w-full max-w-[390px] object-contain drop-shadow-[0_10px_24px_rgba(24,76,94,.15)] sm:max-h-[310px] sm:max-w-[440px]" />
        </div>
        <div className="relative px-5 pb-7 pt-2 sm:py-7 sm:pl-2 sm:pr-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#24627c] dark:text-[#a7e9f5]">CareDigital · rotina de cuidados</p>
          <h1 className="mt-2 max-w-[22ch] text-balance font-display text-3xl leading-tight tracking-tight text-[#102c43] dark:text-white sm:text-4xl lg:text-5xl">Seu tratamento, organizado e sempre com você.</h1>
          <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-[#385c74] dark:text-[#d7eaf5]">Medicações, alimentação, água e evolução do cuidado em um único lugar.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {access === "admin" ?
              <Link to="/prontuario" className="inline-flex items-center gap-2 rounded-xl bg-[#0d587a] px-4 py-2.5 text-xs font-bold !text-white hover:bg-[#126e92]"><ClipboardList size={16}/> Prontuários <ArrowRight size={14}/></Link> :
              <Link to="/entrar" className="inline-flex items-center gap-2 rounded-xl bg-[#0d587a] px-4 py-2.5 text-xs font-bold !text-white hover:bg-[#126e92]"><LockKeyhole size={16}/> Acessar minha conta <ArrowRight size={14}/></Link>
            }
            <Link to="/hidratacao" className="inline-flex items-center gap-2 rounded-xl border border-[#77acbf] bg-white/65 px-4 py-2.5 text-xs font-semibold !text-[#184c65] hover:bg-white dark:border-white/25 dark:bg-white/10 dark:!text-white dark:hover:bg-white/20"><Droplets size={16}/> Hidratação</Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-[11px] font-medium text-[#416a7a] dark:text-[#c0dce9]"><span className="inline-flex items-center gap-1"><HeartPulse size={14}/> Acompanhamento</span><span>·</span><span>Rotina organizada</span><span>·</span><span>Dados protegidos</span></div>
        </div>
      </div>
    </section>

    <section aria-label="Acessos rápidos" className="grid gap-3 sm:grid-cols-3">
      {[
        { to: "/medicamentos", title: "Medicações", text: "Organize doses e horários.", icon: Activity },
        { to: "/dietas", title: "Alimentação", text: "Consulte os cuidados alimentares.", icon: Utensils },
        { to: "/hidratacao", title: "Hidratação", text: "Visualize o roteiro de água.", icon: Droplets },
      ].map(({ to, title, text, icon: Icon }) => (
        <Link key={to} to={to} className="group flex items-center gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-sm transition hover:border-primary/45 hover:bg-muted">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon size={22}/></span>
          <span className="min-w-0 flex-1">
            <strong className="block text-sm text-foreground">{title}</strong>
            <span className="mt-0.5 block text-xs text-muted-foreground">{text}</span>
          </span>
          <ArrowRight size={17} className="shrink-0 text-muted-foreground group-hover:text-primary"/>
        </Link>
      ))}
    </section>

    {access === "admin" && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/80 px-4 py-3">
      <div><p className="text-xs font-bold text-foreground">Gestão administrativa</p><p className="text-[11px] text-muted-foreground">Acesse dados reais no ambiente protegido, sem indicadores demonstrativos.</p></div>
      <Link to="/admin" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
        Administração <ArrowRight size={15}/>
      </Link>
    </div>}
  </div>;
}
