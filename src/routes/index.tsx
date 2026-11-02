import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronRight, ClipboardList, Clock3, Droplets, HeartPulse, LockKeyhole, Pill, ShieldCheck, Sparkles, Utensils } from "lucide-react";
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

  return <div className="public-homepage mx-auto flex min-h-full w-full max-w-[1020px] flex-col gap-3 pb-2 lg:h-full lg:min-h-0 lg:overflow-hidden">
    <section aria-labelledby="public-home-title" className="relative isolate flex min-h-[440px] flex-col overflow-hidden rounded-[28px] border border-[#9ecdd8]/70 bg-gradient-to-br from-[#edf9fb] via-[#d8eff3] to-[#b8e2e7] text-[#153748] shadow-[0_25px_65px_-40px_rgba(14,78,91,.45)] dark:border-[#7cb3bf]/25 dark:from-[#172b36] dark:via-[#183e49] dark:to-[#265962] dark:text-white lg:min-h-0 lg:flex-1">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-28 size-80 rounded-full bg-[#5bcecd]/20 blur-[75px]"/>
        <div className="absolute -bottom-44 right-0 size-[450px] rounded-full bg-[#8cddd5]/25 blur-[90px] dark:bg-[#6fd6c5]/10"/>
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-transparent via-[#4eb5ae]/60 to-transparent"/>
      </div>
      <div className="relative grid min-h-0 flex-1 items-center gap-0 md:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
        <div className="relative flex min-h-0 items-center justify-center overflow-hidden px-5 pb-1 pt-5 sm:px-6 md:h-full md:p-5">
          <div aria-hidden="true" className="pointer-events-none absolute aspect-square w-[min(78%,340px)] rounded-full border border-[#57bac4]/20 bg-white/20 shadow-[0_0_0_24px_rgba(113,200,205,.045)] dark:border-white/10 dark:bg-white/5"/>
          <img src="/images/caredigital-health-illustration.svg" width={780} height={540} loading="eager" decoding="async"
            alt="Ilustração vetorial de prontuário, medicação, hidratação e agenda de cuidados"
            className="relative block h-auto max-h-[225px] w-full max-w-[410px] object-contain drop-shadow-[0_16px_32px_rgba(10,57,73,.14)] sm:max-h-[280px] md:max-h-[min(43dvh,355px)]"/>
        </div>
        <div className="relative z-10 flex min-w-0 flex-col justify-center px-5 pb-7 pt-3 sm:px-7 md:py-6 md:pl-2 md:pr-8 lg:pr-9">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#7dbcc4]/50 bg-white/45 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.13em] text-[#216177] dark:border-white/20 dark:bg-white/10 dark:text-[#b7f0ea]"><Sparkles size={13}/> CareDigital · rotina conectada</span>
          <h1 id="public-home-title" className="mt-4 max-w-[19ch] text-balance font-display text-[2.65rem] leading-[1.12] tracking-tight text-[#14384d] dark:text-white sm:text-[3.1rem] lg:text-[3.3rem]">
            Seu cuidado, <span className="block text-[#197985] dark:text-[#91e8df]">em um só lugar.</span>
          </h1>
          <p className="mt-3 max-w-[47ch] text-[13px] leading-relaxed text-[#3b6376] dark:text-[#d1e5e8] sm:text-sm">
            Medicações, refeições e hidratação com horários, lembretes e registros organizados para sua rotina.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {access==="admin"
              ? <Link to="/prontuario" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#185d73] px-4 py-2.5 text-[13px] font-extrabold !text-white shadow-[0_8px_22px_-13px_rgba(5,50,68,.5)] transition hover:bg-[#23788c] dark:bg-[#8ce8da] dark:!text-[#123331] dark:hover:bg-[#b4f5e8]"><ClipboardList size={17}/> Abrir prontuários <ArrowRight size={15}/></Link>
              : <Link to="/entrar" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#185d73] px-4 py-2.5 text-[13px] font-extrabold !text-white shadow-[0_8px_22px_-13px_rgba(5,50,68,.5)] transition hover:bg-[#23788c] dark:bg-[#8ce8da] dark:!text-[#123331] dark:hover:bg-[#b4f5e8]"><LockKeyhole size={17}/> Acessar minha conta <ArrowRight size={15}/></Link>
            }
            <Link to={access==="admin"?"/admin":"/protocolos"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#7fb3be]/60 bg-white/50 px-4 py-2.5 text-[13px] font-bold text-[#23556a] transition hover:border-[#3e9da5] hover:bg-white/80 dark:border-white/25 dark:bg-white/10 dark:text-white dark:hover:bg-white/20">
              {access==="admin"?"Administração":"Como funciona"} <ChevronRight size={16}/>
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[#76b1bd]/25 pt-3 text-[11px] font-semibold text-[#4d7281] dark:border-white/15 dark:text-[#c3dce0]">
            <span className="inline-flex items-center gap-1.5"><Clock3 size={14}/> Rotina por horários</span>
            <span className="inline-flex items-center gap-1.5"><HeartPulse size={14}/> Acompanhamento pessoal</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14}/> Acesso protegido</span>
          </div>
        </div>
      </div>
    </section>

    <section aria-label="Conheça os recursos da plataforma" className="grid shrink-0 gap-2.5 sm:grid-cols-3">
      {[
        {to:"/medicamentos",title:"Medicações",description:"Horários, lembretes e tomadas.",icon:Pill},
        {to:"/dietas",title:"Alimentação",description:"Refeições e rotina alimentar.",icon:Utensils},
        {to:"/hidratacao",title:"Hidratação",description:"Meta de água e acompanhamento.",icon:Droplets},
      ].map(({to,title,description,icon:Icon})=>(
        <Link key={to} to={to} className="group relative flex min-h-[94px] min-w-0 items-center gap-3 overflow-hidden rounded-[20px] border border-border bg-card/95 p-3.5 shadow-[0_7px_22px_-17px_rgba(20,65,78,.45)] transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card hover:shadow-lg sm:p-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><Icon size={23} strokeWidth={1.9}/></span>
          <span className="min-w-0 flex-1"><strong className="block text-[14px] font-extrabold text-foreground sm:text-[15px]">{title}</strong><span className="mt-1 block text-[11px] leading-snug text-muted-foreground sm:text-xs">{description}</span></span>
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted/80 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:bg-primary/10 group-hover:text-primary"><ArrowRight size={17}/></span>
        </Link>
      ))}
    </section>
  </div>;
}
