import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Gift, LockKeyhole, ShieldCheck } from "lucide-react";
import { copy, related, showcaseImage, type ShowcaseKind } from "./PublicCareShowcase";
import { AreaDemo } from "./AreaDemos";
import { useFitWindow } from "@/lib/use-fit-window";

type Layout = "split" | "stage" | "bento" | "steps" | "mirror";

/** Cada área tem layout, cor e demonstração próprios: vizinhas no menu nunca repetem a composição. */
const areaStyle: Record<
  ShowcaseKind,
  { layout: Layout; color: string; demo?: "agua" | "medicacao" | "sono" | "metricas" }
> = {
  protocols: { layout: "steps", color: "#0c8063" },
  medication: { layout: "split", color: "#e11d48", demo: "medicacao" },
  hydration: { layout: "stage", color: "#0369a1", demo: "agua" },
  diet: { layout: "bento", color: "#047857" },
  sports: { layout: "mirror", color: "#b45309" },
  supplements: { layout: "mirror", color: "#7c3aed" },
  weight: { layout: "steps", color: "#a21caf" },
  sleep: { layout: "stage", color: "#4f46e5", demo: "sono" },
  training: { layout: "bento", color: "#c2410c" },
  metrics: { layout: "split", color: "#0f766e", demo: "metricas" },
};

const menuOrder: ShowcaseKind[] = [
  "protocols",
  "medication",
  "hydration",
  "diet",
  "supplements",
  "weight",
  "sleep",
  "training",
  "metrics",
];

/** Foto com leve paralaxe que acompanha o ponteiro (desligada com "reduzir movimento"). */
function ParallaxPhoto({
  src,
  position,
  className = "",
  children,
}: {
  src: string;
  position: string;
  className?: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", `${((e.clientX - r.left) / r.width - 0.5) * -14}px`);
    el.style.setProperty("--py", `${((e.clientY - r.top) / r.height - 0.5) * -14}px`);
  };
  const reset = () => {
    ref.current?.style.setProperty("--px", "0px");
    ref.current?.style.setProperty("--py", "0px");
  };
  return (
    <div
      ref={ref}
      onPointerMove={move}
      onPointerLeave={reset}
      className={`nv-parallax relative isolate overflow-hidden ${className}`}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute -inset-4 -z-10 h-[calc(100%+2rem)] w-[calc(100%+2rem)] object-cover"
        style={{ objectPosition: position }}
      />
      {children}
    </div>
  );
}

function Ctas({ cta, light = false }: { cta: string; light?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href="/entrar?mode=signup"
        className={`nv-cta inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold ${light ? "bg-white text-slate-950" : "bg-[var(--area)] text-white"}`}
      >
        <Gift size={16} aria-hidden="true" /> Criar conta grátis{" "}
        <ArrowRight size={16} aria-hidden="true" className="nv-cta-arrow" />
      </a>
      <Link
        to="/cliente"
        className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold ${light ? "border-white/40 text-white hover:bg-white/10" : "border-border hover:border-[var(--area)]"}`}
      >
        <LockKeyhole size={16} aria-hidden="true" /> {cta}
      </Link>
    </div>
  );
}

/** Lista de benefícios interativa: ao passar o mouse ou focar, o item se destaca e mostra o texto completo. */
function BenefitPicker({
  kind,
  dark = false,
  columns = false,
}: {
  kind: ShowcaseKind;
  dark?: boolean;
  columns?: boolean;
}) {
  const [active, setActive] = useState(0);
  const items = copy[kind].benefits;
  return (
    <ul className={columns ? "grid gap-2 sm:grid-cols-3 [&>li>button]:h-full" : "grid gap-2"}>
      {items.map((b, i) => {
        const on = active === i;
        return (
          <li key={b.title}>
            <button
              type="button"
              aria-pressed={on}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className={`nv-tile flex w-full items-start gap-3 rounded-xl border p-3 text-left ${dark ? "border-white/15 bg-slate-950/70 text-white backdrop-blur-md" : "border-border bg-card"} ${on ? "border-[var(--area)]" : ""}`}
              style={{ "--tile": "var(--area)" } as CSSProperties}
            >
              <span
                className={`nv-tile-icon grid size-9 shrink-0 place-items-center rounded-lg ${dark ? "bg-[var(--area)] text-white" : "bg-[color-mix(in_srgb,var(--area)_16%,transparent)] text-[color-mix(in_srgb,var(--area)_55%,white)]"}`}
              >
                <b.icon size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <strong className="block text-sm font-semibold">{b.title}</strong>
                <span
                  className={`block text-[13px] leading-snug ${dark ? "text-white/75" : "text-muted-foreground"}`}
                >
                  {b.text}
                </span>
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
    <ol
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
    >
      {steps.map((s, i) => {
        const on = i === active;
        const done = i < active;
        return (
          <li key={s.name}>
            <button
              type="button"
              onClick={() => setActive(i)}
              onFocus={() => {
                setHold(true);
                setActive(i);
              }}
              aria-current={on ? "step" : undefined}
              className={`relative w-full overflow-hidden rounded-xl border p-3 text-left transition-colors ${dark ? "border-white/15 bg-slate-950/60 text-white backdrop-blur-md" : "border-border bg-card"} ${on ? "border-[var(--area)] bg-[color-mix(in_srgb,var(--area)_30%,#020617)]" : ""}`}
            >
              <span
                className={`grid size-7 place-items-center rounded-full text-xs font-bold transition-colors ${on || done ? "bg-[var(--area)] text-white" : dark ? "bg-white/10" : "bg-muted"}`}
              >
                {i + 1}
              </span>
              <strong className="mt-2 block text-sm font-semibold">{s.name}</strong>
              <span className={`block text-xs ${dark ? "text-white/70" : "text-muted-foreground"}`}>
                {s.detail}
              </span>
              {on && !hold && (
                <span
                  className="nv-progress absolute inset-x-0 bottom-0 block h-0.5 bg-[var(--area)]"
                  style={{ animationDuration: "2600ms" }}
                />
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Privacy({ kind, dark = false }: { kind: ShowcaseKind; dark?: boolean }) {
  return (
    <p
      className={`flex items-start gap-2 text-xs ${dark ? "text-white/70" : "text-muted-foreground"}`}
    >
      <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> {copy[kind].privacy}
    </p>
  );
}

/** Navegação entre as áreas na base da página, com a atual destacada. */
function AreaSwitcher({ kind }: { kind: ShowcaseKind }) {
  return (
    <nav
      aria-label="Outras áreas"
      className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {menuOrder.map((k) => {
        const on = k === kind;
        const Icon = copy[k].icon;
        return (
          <Link
            key={k}
            to={related[k].to}
            aria-current={on ? "page" : undefined}
            className={`nv-chip inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold ${on ? "border-transparent bg-[var(--area)] text-white" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
            style={on ? undefined : ({ "--chip": areaStyle[k].color } as CSSProperties)}
          >
            <Icon size={15} aria-hidden="true" /> {related[k].label}
          </Link>
        );
      })}
    </nav>
  );
}

function DesktopShowcase({ kind }: { kind: ShowcaseKind }) {
  const fitRef = useFitWindow<HTMLDivElement>();
  const c = copy[kind];
  const img = showcaseImage[kind];
  const st = areaStyle[kind];
  const Icon = c.icon;
  const vars = { "--area": st.color } as CSSProperties;
  const title = (
    <h1 className="nv-rise text-balance font-display text-3xl font-extrabold leading-[1.08] tracking-tight xl:text-[2.6rem]">
      {c.title}
    </h1>
  );
  const eyebrow = (dark: boolean) => (
    <span
      className={`nv-rise inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${dark ? "bg-white/15 text-white backdrop-blur" : "bg-[color-mix(in_srgb,var(--area)_12%,transparent)] text-[color-mix(in_srgb,var(--area)_55%,white)]"}`}
    >
      <Icon size={14} aria-hidden="true" /> {c.eyebrow}
    </span>
  );
  const shell = "mx-auto flex w-full max-w-[1680px] flex-col gap-3";

  const flip = st.layout === "mirror" || st.layout === "stage";
  return (
    <div ref={fitRef} className={shell} style={vars}>
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_1.08fr]">
        <section
          className={`relative flex min-h-0 flex-col justify-center gap-5 overflow-hidden rounded-3xl border border-border bg-card p-8 xl:p-12 ${flip ? "lg:order-2" : ""}`}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-28 -top-28 size-96 rounded-full bg-[color-mix(in_srgb,var(--area)_22%,transparent)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--area)] to-transparent"
          />
          <div className="relative flex flex-col gap-5">
            {eyebrow(false)}
            {title}
            <p
              className="nv-rise max-w-[56ch] text-base leading-relaxed text-muted-foreground"
              style={{ animationDelay: "80ms" }}
            >
              {c.description}
            </p>
            <ul className="flex flex-wrap gap-2" aria-label="O que você acompanha">
              {c.preview.map((t) => (
                <li
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-semibold"
                >
                  <span className="size-1.5 rounded-full bg-[var(--area)]" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
            <Ctas cta={c.cta} />
            <Privacy kind={kind} />
          </div>
        </section>

        <ParallaxPhoto
          src={img.src}
          position={img.position}
          className="min-h-[18rem] rounded-3xl bg-slate-950 shadow-[0_30px_80px_-30px_color-mix(in_srgb,var(--area)_60%,#000)] ring-1 ring-white/10"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/20" />
          <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--area)_28%,transparent)] mix-blend-soft-light" />
          <span className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-black/45 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur">
            <span className="grid size-5 place-items-center rounded-full bg-[var(--area)]">
              <Icon size={12} aria-hidden="true" />
            </span>
            {c.eyebrow}
          </span>
          <div
            className={`absolute bottom-6 ${flip ? "left-6" : "right-6"} flex max-w-[calc(100%-3rem)] flex-col gap-3`}
          >
            {st.demo ? (
              <AreaDemo kind={kind} />
            ) : (
              <div className="w-72 rounded-2xl border border-white/20 bg-slate-950/70 p-4 text-white shadow-2xl backdrop-blur-xl">
                <p className="text-xs font-semibold text-white/60">No seu painel</p>
                <ul className="mt-2 grid gap-2">
                  {c.preview.map((t) => (
                    <li key={t} className="flex items-center gap-2.5 text-sm font-semibold">
                      <span className="grid size-7 place-items-center rounded-lg bg-[var(--area)]">
                        <Icon size={14} aria-hidden="true" />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ParallaxPhoto>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <BenefitPicker kind={kind} columns />
        <StepRail kind={kind} />
      </div>
      <AreaSwitcher kind={kind} />
    </div>
  );
}

/** Versão do celular: foto de abertura com título, demonstração, benefícios e etapas em linha do tempo. */
function MobileShowcase({ kind }: { kind: ShowcaseKind }) {
  const c = copy[kind];
  const img = showcaseImage[kind];
  const st = areaStyle[kind];
  const Icon = c.icon;
  const vars = { "--area": st.color } as CSSProperties;
  return (
    <div style={vars} className="-mx-3 -mt-3 flex flex-col gap-6 pb-6">
      <section className="relative isolate overflow-hidden rounded-b-[2rem] bg-slate-950 text-white">
        <img
          src={img.src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 size-full object-cover"
          style={{ objectPosition: img.position }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950 via-slate-950/55 to-[color-mix(in_srgb,var(--area)_30%,transparent)]"
        />
        <div className="flex min-h-[25rem] flex-col justify-between px-5 pb-7 pt-5">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold backdrop-blur">
            <span className="grid size-5 place-items-center rounded-full bg-[var(--area)]">
              <Icon size={12} aria-hidden="true" />
            </span>
            {c.eyebrow}
          </span>
          <div>
            <h1 className="nv-rise text-balance font-display text-[2rem] font-extrabold leading-[1.05] tracking-[-0.02em]">
              {c.title}
            </h1>
            <p
              className="nv-rise mt-3 text-[15px] leading-relaxed text-white/80"
              style={{ animationDelay: "90ms" }}
            >
              {c.description}
            </p>
            <div className="mt-5 grid gap-2.5">
              <a
                href="/entrar?mode=signup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-[15px] font-bold text-slate-950 shadow-lg active:scale-[.98]"
              >
                <Gift size={17} aria-hidden="true" /> Criar conta grátis
              </a>
              <Link
                to="/cliente"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 text-[14px] font-semibold backdrop-blur active:scale-[.98]"
              >
                <LockKeyhole size={16} aria-hidden="true" /> {c.cta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {st.demo && (
        <section className="flex justify-center px-4" aria-label="Experimente">
          <AreaDemo kind={kind} />
        </section>
      )}

      <section className="grid gap-2.5 px-4" aria-label="Benefícios">
        {c.benefits.map((b) => (
          <div
            key={b.title}
            className="flex items-start gap-3.5 rounded-2xl border border-border bg-card p-4"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--area)_16%,transparent)] text-[var(--area)]">
              <b.icon size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <strong className="block text-[15px] font-semibold">{b.title}</strong>
              <span className="mt-0.5 block text-[13.5px] leading-snug text-muted-foreground">
                {b.text}
              </span>
            </span>
          </div>
        ))}
      </section>

      <section className="px-4" aria-label="Como funciona">
        <h2 className="px-1 font-display text-lg font-extrabold">Como funciona</h2>
        <ol className="relative mt-4 grid gap-5 pl-1">
          <span
            aria-hidden="true"
            className="absolute bottom-3 left-[1.05rem] top-3 w-px bg-gradient-to-b from-[var(--area)] to-transparent"
          />
          {c.steps.map((s, i) => (
            <li key={s.name} className="relative flex items-center gap-4">
              <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-[var(--area)] text-sm font-bold text-white shadow-[0_0_0_5px_color-mix(in_srgb,var(--area)_18%,transparent)]">
                {i + 1}
              </span>
              <span>
                <strong className="block text-[15px] font-semibold">{s.name}</strong>
                <span className="text-[13px] text-muted-foreground">{s.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-4 px-4">
        <Privacy kind={kind} />
        <AreaSwitcher kind={kind} />
      </div>
    </div>
  );
}

export function FitShowcase({ kind }: { kind: ShowcaseKind }) {
  return (
    <>
      <div className="max-lg:hidden">
        <DesktopShowcase kind={kind} />
      </div>
      <div className="lg:hidden">
        <MobileShowcase kind={kind} />
      </div>
    </>
  );
}
