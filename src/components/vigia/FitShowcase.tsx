import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Gift, LockKeyhole, ShieldCheck } from "lucide-react";
import { copy, related, showcaseImage, type ShowcaseKind } from "./PublicCareShowcase";
import { ToolDemo } from "./SmartBanner";
import { useFitWindow } from "@/lib/use-fit-window";

type Layout = "split" | "stage" | "bento" | "steps" | "mirror";

/** Cada área tem layout, cor e demonstração próprios: vizinhas no menu nunca repetem a composição. */
const areaStyle: Record<ShowcaseKind, { layout: Layout; color: string; demo?: "agua" | "medicacao" | "sono" | "metricas" }> = {
  protocols: { layout: "steps", color: "#0c8063" },
  medication: { layout: "split", color: "#e11d48", demo: "medicacao" },
  hydration: { layout: "stage", color: "#0284c7", demo: "agua" },
  diet: { layout: "bento", color: "#059669" },
  sports: { layout: "mirror", color: "#d97706" },
  supplements: { layout: "mirror", color: "#7c3aed" },
  weight: { layout: "steps", color: "#c026d3" },
  sleep: { layout: "stage", color: "#4f46e5", demo: "sono" },
  training: { layout: "bento", color: "#ea580c" },
  metrics: { layout: "split", color: "#0d9488", demo: "metricas" },
};

const menuOrder: ShowcaseKind[] = ["protocols", "medication", "hydration", "diet", "supplements", "weight", "sleep", "training", "metrics"];

/** Foto com leve paralaxe que acompanha o ponteiro (desligada com "reduzir movimento"). */
function ParallaxPhoto({ src, position, className = "", children }: { src: string; position: string; className?: string; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", `${((e.clientX - r.left) / r.width - 0.5) * -14}px`);
    el.style.setProperty("--py", `${((e.clientY - r.top) / r.height - 0.5) * -14}px`);
  };
  const reset = () => { ref.current?.style.setProperty("--px", "0px"); ref.current?.style.setProperty("--py", "0px"); };
  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={reset} className={`nv-parallax relative isolate overflow-hidden ${className}`}>
      <img src={src} alt="" aria-hidden="true" className="absolute -inset-4 -z-10 h-[calc(100%+2rem)] w-[calc(100%+2rem)] object-cover" style={{ objectPosition: position }} />
      {children}
    </div>
  );
}

function Ctas({ cta, light = false }: { cta: string; light?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <a href="/entrar?mode=signup" className={`nv-cta inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold ${light ? "bg-white text-slate-950" : "bg-[var(--area)] text-white"}`}>
        <Gift size={16} aria-hidden="true" /> Criar conta grátis <ArrowRight size={16} aria-hidden="true" className="nv-cta-arrow" />
      </a>
      <Link to="/cliente" className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold ${light ? "border-white/40 text-white hover:bg-white/10" : "border-border hover:border-[var(--area)]"}`}>
        <LockKeyhole size={16} aria-hidden="true" /> {cta}
      </Link>
    </div>
  );
}

/** Lista de benefícios interativa: ao passar o mouse ou focar, o item se destaca e mostra o texto completo. */
function BenefitPicker({ kind, dark = false, columns = false }: { kind: ShowcaseKind; dark?: boolean; columns?: boolean }) {
  const [active, setActive] = useState(0);
  const items = copy[kind].benefits;
  return (
    <ul className={columns ? "grid gap-2 sm:grid-cols-3" : "grid gap-2"}>
      {items.map((b, i) => {
        const on = active === i;
        return (
          <li key={b.title}>
            <button
              type="button"
              aria-pressed={on}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className={`nv-tile flex w-full items-start gap-3 rounded-xl border p-3 text-left ${dark ? "border-white/15 bg-white/[.06] text-white" : "border-border bg-card"} ${on ? "border-[var(--area)]" : ""}`}
              style={{ "--tile": "var(--area)" } as CSSProperties}
            >
              <span className="nv-tile-icon grid size-9 shrink-0 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--area)_16%,transparent)] text-[var(--area)]">
                <b.icon size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <strong className="block text-sm font-semibold">{b.title}</strong>
                <span className={`block text-[13px] leading-snug ${dark ? "text-white/75" : "text-muted-foreground"}`}>{b.text}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Linha do tempo das etapas: avança sozinha e pode ser escolhida com clique ou teclado. */
function StepRail({ kind, dark = false }: { kind: ShowcaseKind; dark?: boolean }) {
  const steps = copy[kind].steps;
  const [active, setActive] = useState(0);
  const [hold, setHold] = useState(false);
  useEffect(() => {
    if (hold || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => setActive((a) => (a + 1) % steps.length), 2600);
    return () => window.clearTimeout(t);
  }, [active, hold, steps.length]);
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}>
      {steps.map((s, i) => {
        const on = i === active;
        const done = i < active;
        return (
          <li key={s.name}>
            <button type="button" onClick={() => setActive(i)} onFocus={() => { setHold(true); setActive(i); }} aria-current={on ? "step" : undefined}
              className={`relative w-full overflow-hidden rounded-xl border p-3 text-left transition-colors ${dark ? "border-white/15 text-white" : "border-border bg-card"} ${on ? "border-[var(--area)] bg-[color-mix(in_srgb,var(--area)_12%,transparent)]" : ""}`}>
              <span className={`grid size-7 place-items-center rounded-full text-xs font-bold transition-colors ${on || done ? "bg-[var(--area)] text-white" : dark ? "bg-white/10" : "bg-muted"}`}>{i + 1}</span>
              <strong className="mt-2 block text-sm font-semibold">{s.name}</strong>
              <span className={`block text-xs ${dark ? "text-white/70" : "text-muted-foreground"}`}>{s.detail}</span>
              {on && !hold && <span className="nv-progress absolute inset-x-0 bottom-0 block h-0.5 bg-[var(--area)]" style={{ animationDuration: "2600ms" }} />}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Privacy({ kind, dark = false }: { kind: ShowcaseKind; dark?: boolean }) {
  return (
    <p className={`flex items-start gap-2 text-xs ${dark ? "text-white/70" : "text-muted-foreground"}`}>
      <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> {copy[kind].privacy}
    </p>
  );
}

/** Navegação entre as áreas na base da página, com a atual destacada. */
function AreaSwitcher({ kind }: { kind: ShowcaseKind }) {
  return (
    <nav aria-label="Outras áreas" className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {menuOrder.map((k) => {
        const on = k === kind;
        const Icon = copy[k].icon;
        return (
          <Link key={k} to={related[k].to} aria-current={on ? "page" : undefined}
            className={`nv-chip inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold ${on ? "border-transparent bg-[var(--area)] text-white" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
            style={on ? undefined : ({ "--chip": areaStyle[k].color } as CSSProperties)}>
            <Icon size={15} aria-hidden="true" /> {related[k].label}
          </Link>
        );
      })}
    </nav>
  );
}

export function FitShowcase({ kind }: { kind: ShowcaseKind }) {
  const fitRef = useFitWindow<HTMLDivElement>();
  const c = copy[kind];
  const img = showcaseImage[kind];
  const st = areaStyle[kind];
  const Icon = c.icon;
  const vars = { "--area": st.color } as CSSProperties;
  const title = <h1 className="nv-rise text-balance font-display text-3xl font-extrabold leading-[1.08] tracking-tight xl:text-[2.6rem]">{c.title}</h1>;
  const eyebrow = (dark: boolean) => (
    <span className={`nv-rise inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${dark ? "bg-white/15 text-white backdrop-blur" : "bg-[color-mix(in_srgb,var(--area)_12%,transparent)] text-[var(--area)]"}`}>
      <Icon size={14} aria-hidden="true" /> {c.eyebrow}
    </span>
  );
  const shell = "mx-auto flex w-full max-w-[1680px] flex-col gap-3";

  if (st.layout === "split")
    return (
      <div ref={fitRef} className={shell} style={vars}>
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[0.95fr_1.05fr]">
          <ParallaxPhoto src={img.src} position={img.position} className="min-h-[16rem] rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            {st.demo && <div className="absolute bottom-5 left-5"><ToolDemo kind={st.demo} /></div>}
          </ParallaxPhoto>
          <section className="flex min-h-0 flex-col justify-center gap-4 rounded-2xl border border-border bg-card p-5 lg:p-8">
            {eyebrow(false)}
            {title}
            <p className="nv-rise max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground" style={{ animationDelay: "80ms" }}>{c.description}</p>
            <BenefitPicker kind={kind} />
            <Ctas cta={c.cta} />
            <Privacy kind={kind} />
          </section>
        </div>
        <AreaSwitcher kind={kind} />
      </div>
    );

  if (st.layout === "stage")
    return (
      <div ref={fitRef} className={shell} style={vars}>
        <ParallaxPhoto src={img.src} position={img.position} className="min-h-0 flex-1 rounded-2xl bg-slate-950 text-white">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-[color-mix(in_srgb,var(--area)_35%,transparent)]" />
          <div className="relative grid h-full gap-6 p-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:p-10">
            <div className="flex flex-col gap-4">
              {eyebrow(true)}
              {title}
              <p className="nv-rise max-w-[54ch] text-[15px] leading-relaxed text-white/80" style={{ animationDelay: "80ms" }}>{c.description}</p>
              <StepRail kind={kind} dark />
              <Ctas cta={c.cta} light />
              <Privacy kind={kind} dark />
            </div>
            <div className="hidden flex-col items-end gap-3 lg:flex">
              {st.demo && <ToolDemo kind={st.demo} />}
              <div className="w-full max-w-sm"><BenefitPicker kind={kind} dark /></div>
            </div>
          </div>
        </ParallaxPhoto>
        <AreaSwitcher kind={kind} />
      </div>
    );

  if (st.layout === "bento")
    return (
      <div ref={fitRef} className={shell} style={vars}>
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-4 lg:grid-rows-[1fr_auto]">
          <section className="flex flex-col justify-center gap-4 rounded-2xl border border-border bg-card p-5 lg:col-span-2 lg:p-8">
            {eyebrow(false)}
            {title}
            <p className="nv-rise max-w-[56ch] text-[15px] leading-relaxed text-muted-foreground" style={{ animationDelay: "80ms" }}>{c.description}</p>
            <Ctas cta={c.cta} />
          </section>
          <ParallaxPhoto src={img.src} position={img.position} className="min-h-[14rem] rounded-2xl lg:col-span-2">
            <div className="absolute inset-0 bg-gradient-to-tr from-[color-mix(in_srgb,var(--area)_55%,transparent)] to-transparent mix-blend-multiply" />
            <ul className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
              {c.preview.map((p, i) => (
                <li key={p} className="nv-rise rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow" style={{ animationDelay: `${300 + i * 120}ms` }}>{p}</li>
              ))}
            </ul>
          </ParallaxPhoto>
          <div className="lg:col-span-3"><BenefitPicker kind={kind} columns /></div>
          <div className="flex items-center rounded-2xl border border-border bg-card p-4"><Privacy kind={kind} /></div>
        </div>
        <StepRail kind={kind} />
        <AreaSwitcher kind={kind} />
      </div>
    );

  if (st.layout === "steps")
    return (
      <div ref={fitRef} className={shell} style={vars}>
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_1fr]">
          <section className="flex min-h-0 flex-col justify-center gap-5 rounded-2xl border border-border bg-card p-5 lg:p-10">
            {eyebrow(false)}
            {title}
            <p className="nv-rise max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground" style={{ animationDelay: "80ms" }}>{c.description}</p>
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">Como funciona, em 4 etapas</h2>
              <StepRail kind={kind} />
            </div>
            <Ctas cta={c.cta} />
            <Privacy kind={kind} />
          </section>
          <ParallaxPhoto src={img.src} position={img.position} className="min-h-[20rem] rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
            <div className="absolute inset-x-4 bottom-4 lg:inset-x-6 lg:bottom-6">
              <BenefitPicker kind={kind} dark columns />
            </div>
          </ParallaxPhoto>
        </div>
        <AreaSwitcher kind={kind} />
      </div>
    );

  // mirror: foto alta à direita, texto e benefícios à esquerda, com faixa diagonal na cor da área
  return (
    <div ref={fitRef} className={shell} style={vars}>
      <div className="relative grid min-h-0 flex-1 gap-3 overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[1fr_0.85fr]">
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-[color-mix(in_srgb,var(--area)_18%,transparent)] blur-3xl" />
        <section className="relative flex flex-col justify-center gap-4 p-5 lg:p-10">
          {eyebrow(false)}
          {title}
          <p className="nv-rise max-w-[56ch] text-[15px] leading-relaxed text-muted-foreground" style={{ animationDelay: "80ms" }}>{c.description}</p>
          <BenefitPicker kind={kind} />
          <Ctas cta={c.cta} />
          <Privacy kind={kind} />
        </section>
        <ParallaxPhoto src={img.src} position={img.position} className="min-h-[16rem] lg:[clip-path:polygon(14%_0,100%_0,100%_100%,0_100%)]">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[color-mix(in_srgb,var(--area)_40%,transparent)]" />
          <ul className="absolute bottom-5 right-5 grid gap-2">
            {c.preview.map((p, i) => (
              <li key={p} className="nv-rise rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-slate-900 shadow-lg" style={{ animationDelay: `${300 + i * 140}ms` }}>{p}</li>
            ))}
          </ul>
        </ParallaxPhoto>
      </div>
      <AreaSwitcher kind={kind} />
    </div>
  );
}
