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
    return <div className="mx-auto max-w-6xl space-y-3">
      <ClientHomeSummary />
      <div className="flex flex-wrap gap-2">
        <Link to="/cliente" className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-xs font-semibold text-primary hover:bg-primary/20">
          <HeartPulse size={17} /> Meu acompanhamento completo <ArrowRight size={15} />
        </Link>
        <Link to="/hidratacao" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted">
          <Droplets size={17} /> Meu cronograma de água
        </Link>
      </div>
    </div>;
  }

  return <div className="mx-auto max-w-6xl space-y-4">
    <section className="relative isolate overflow-hidden rounded-3xl border border-[#8fb2c5]/25 bg-[#092b40] text-white shadow-[0_20px_60px_-36px_rgba(0,29,51,.75)]">
      <img
        src="/images/caredigital-care-hero.webp"
        alt="Profissional de saúde em ambiente clínico"
        className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-[72%_28%] sm:object-[65%_35%] lg:object-[center_32%]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-[#092439]/95 via-[#10374d]/85 to-[#103d57]/35 sm:from-[#092439]/95 sm:via-[#10374d]/80 sm:to-[#103d57]/20" />
      <div className="relative flex min-h-[240px] flex-col justify-center gap-3 px-5 py-7 sm:min-h-[260px] sm:px-8 sm:py-9 lg:max-w-[65%]">
        <span className="text-[10px] font-bold uppercase tracking-[.18em] text-[#b9e9f9]">
          CareDigital · cuidado conectado
        </span>
        <h1 className="max-w-[17ch] text-balance font-display text-4xl leading-[1.03] tracking-tight text-white sm:text-5xl">
          Sua saúde, com tudo no lugar.
        </h1>
        <p className="max-w-[50ch] text-sm leading-relaxed text-[#e8f5fc]">
          Tratamento, lembretes e histórico reunidos para uma rotina mais simples.
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          {access === "admin" ? (
            <Link to="/prontuario" className="inline-flex items-center gap-2 rounded-xl bg-[#8bd8f3] px-4 py-2.5 text-xs font-bold !text-[#0b2737] transition hover:bg-[#c0eeff]">
              <ClipboardList size={16}/> Abrir prontuários <ArrowRight size={15}/>
            </Link>
          ) : (
            <Link to="/entrar" className="inline-flex items-center gap-2 rounded-xl bg-[#8bd8f3] px-4 py-2.5 text-xs font-bold !text-[#0b2737] transition hover:bg-[#c0eeff]">
              <LockKeyhole size={16}/> Acessar minha conta <ArrowRight size={15}/>
            </Link>
          )}
          <Link to="/hidratacao" className="inline-flex items-center gap-2 rounded-xl border border-white/35 bg-[#123e57]/80 px-4 py-2.5 text-xs font-semibold !text-white transition hover:bg-[#245b76]">
            <Droplets size={16}/> Hidratação
          </Link>
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
