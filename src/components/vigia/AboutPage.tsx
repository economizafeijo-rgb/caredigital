import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AppWindow, Check, Code2, Copy, Mail, MapPin, MessageCircle, Phone, ShoppingBag, Smartphone } from "lucide-react";
import { LogoMark } from "./Logo";

const EMAIL = "aplicativosfj@gmail.com";
const PHONE_LABEL = "(68) 99203-1340";
const PHONE_DIGITS = "5568992031340";
const WHATSAPP = `https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent("Olá, Franc! Vi a NextVita e quero conversar sobre um projeto.")}`;

const story = [
  { key: "plataforma", label: "Plataforma", text: "Saúde e rotina no mesmo app: medicação, água, alimentação, treinos, sono e métricas, com lembretes e gráficos de evolução. Grátis para usar." },
  { key: "loja", label: "Loja virtual", text: "Suplementos, fitoterápicos, moda fitness e acessórios de lojas parceiras da região, com carrinho, Pix com desconto e entrega ou retirada." },
  { key: "lojistas", label: "Para lojistas", text: "Vitrine própria, selo da loja, avaliações e painel de vendas para quem quer vender para um público que já cuida da saúde." },
  { key: "anuncios", label: "Anúncios", text: "Academias, personal trainers e marcas divulgam serviços e produtos para quem acompanha a própria rotina no app todos os dias." },
  { key: "sob-medida", label: "Sob medida", text: "Quem criou a NextVita também desenvolve sites, aplicativos e lojas virtuais para quem tem uma ideia e quer levar ao seu público." },
] as const;

const services = [
  { key: "sites", label: "Sites", icon: AppWindow, text: "Sites rápidos e bonitos para apresentar o seu negócio e ser encontrado no Google." },
  { key: "apps", label: "Aplicativos", icon: Smartphone, text: "Apps que funcionam no celular e no computador, instaláveis na tela inicial." },
  { key: "lojas", label: "Lojas virtuais", icon: ShoppingBag, text: "Vitrine, carrinho e pedidos para vender pela internet com a sua marca." },
  { key: "sistemas", label: "Sistemas", icon: Code2, text: "Painéis e sistemas sob medida para organizar clientes, agenda e vendas." },
] as const;

const hubAreas = [
  { label: "Medicação", angle: -150 }, { label: "Hidratação", angle: -110 }, { label: "Alimentação", angle: -70 },
  { label: "Treinos", angle: -30 }, { label: "Sono", angle: 10 }, { label: "Métricas", angle: 50 },
  { label: "Loja", angle: 130 }, { label: "Lojistas", angle: 170 },
] as const;

/** Arte original: floresta e rio do Acre em linhas topográficas, com a NextVita ao centro conectando as áreas. */
function AcreArt() {
  const [active, setActive] = useState<number | null>(null);
  const contours = Array.from({ length: 9 }, (_, i) => {
    const r = 60 + i * 34;
    const pts = Array.from({ length: 49 }, (_, k) => {
      const a = (k / 48) * Math.PI * 2;
      const wob = 1 + 0.08 * Math.sin(a * 3 + i) + 0.05 * Math.cos(a * 5 - i * 0.7);
      return `${(560 + Math.cos(a) * r * 1.35 * wob).toFixed(1)},${(260 + Math.sin(a) * r * wob).toFixed(1)}`;
    });
    return `M${pts.join(" L")}Z`;
  });
  const cx = 560, cy = 260, R = 150;
  return (
    <svg aria-hidden="true" className="absolute inset-0 -z-20 size-full" viewBox="0 0 900 640" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="acre-bg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#0b2a1b" /><stop offset=".6" stopColor="#06150d" /><stop offset="1" stopColor="#020a06" /></linearGradient>
        <radialGradient id="acre-sun" cx="78%" cy="18%" r="45%"><stop stopColor="#facc15" stopOpacity=".55" /><stop offset=".4" stopColor="#f59e0b" stopOpacity=".18" /><stop offset="1" stopColor="#f59e0b" stopOpacity="0" /></radialGradient>
        <linearGradient id="acre-river" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#fde68a" /><stop offset=".5" stopColor="#facc15" /><stop offset="1" stopColor="#34d399" /></linearGradient>
        <filter id="acre-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      <rect width="900" height="640" fill="url(#acre-bg)" />
      <rect width="900" height="640" fill="url(#acre-sun)" />
      <g fill="none" stroke="#a7f3d0" strokeOpacity=".09">
        {contours.map((d, i) => <path key={i} d={d} className="nv-contour" style={{ animationDelay: `${i * 0.4}s` }} />)}
      </g>
      <path d="M-20 520 C 140 470 160 380 300 400 S 470 520 560 440 S 700 300 920 330" fill="none" stroke="url(#acre-river)" strokeWidth="14" strokeLinecap="round" opacity=".35" filter="url(#acre-glow)" />
      <path d="M-20 520 C 140 470 160 380 300 400 S 470 520 560 440 S 700 300 920 330" fill="none" stroke="url(#acre-river)" strokeWidth="4" strokeLinecap="round" />
      <path d="M-20 520 C 140 470 160 380 300 400 S 470 520 560 440 S 700 300 920 330" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeDasharray="40 260" className="nv-river-shimmer" opacity=".8" />
      <g style={{ pointerEvents: "auto" }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#6ee7b7" strokeOpacity=".22" strokeDasharray="2 8" className="nv-orbit" />
        {hubAreas.map((a, i) => {
          const rad = (a.angle * Math.PI) / 180;
          const x = cx + Math.cos(rad) * R * 1.25, y = cy + Math.sin(rad) * R;
          const on = active === i;
          return (
            <g key={a.label} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} style={{ cursor: "default" }}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke={on ? "#facc15" : "#6ee7b7"} strokeOpacity={on ? 0.9 : 0.25} strokeWidth={on ? 2 : 1} className="nv-link" style={{ animationDelay: `${i * 0.35}s` }} />
              <circle cx={x} cy={y} r={on ? 11 : 7} fill={on ? "#facc15" : "#0b2a1b"} stroke="#6ee7b7" strokeWidth="2" style={{ transition: "r .25s, fill .25s" }} />
              <circle cx={x} cy={y} r="18" fill="transparent" />
              <text x={x} y={y - 18} textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff" opacity={on ? 1 : 0.55} style={{ transition: "opacity .25s" }}>{a.label}</text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r="46" fill="#0c8063" opacity=".25" className="nv-hub-pulse" />
        <rect x={cx - 30} y={cy - 30} width="60" height="60" rx="16" fill="#0c8063" />
        <path d={`M${cx - 12} ${cy + 13}V${cy - 13}L${cx + 12} ${cy + 13}V${cy - 5}`} fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={cx + 12} cy={cy - 14} r="4.2" fill="#7ef0cc" />
      </g>
    </svg>
  );
}

function useFitPage() {
  useEffect(() => {
    document.body.setAttribute("data-fit-page", "");
    return () => document.body.removeAttribute("data-fit-page");
  }, []);
}

/** Página "Sobre": a história do projeto, o desenvolvedor, o portfólio e o contato, em tela fixa. */
export function AboutPage() {
  useFitPage();
  const [step, setStep] = useState(0);
  const [hold, setHold] = useState(false);
  const [service, setService] = useState(0);
  const [copied, setCopied] = useState(false);
  const photo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hold || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => setStep((s) => (s + 1) % story.length), 4200);
    return () => window.clearTimeout(t);
  }, [step, hold]);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(t);
  }, [copied]);

  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = photo.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", `${((e.clientX - r.left) / r.width - 0.5) * -16}px`);
    el.style.setProperty("--py", `${((e.clientY - r.top) / r.height - 0.5) * -16}px`);
  };
  const copyEmail = async () => {
    try { await navigator.clipboard.writeText(EMAIL); setCopied(true); } catch { window.location.href = `mailto:${EMAIL}`; }
  };
  const S = services[service];

  return (
    <div className="mx-auto grid w-full max-w-[1680px] gap-3 lg:h-[calc(100dvh-3.5rem-2rem)] lg:grid-cols-[1.15fr_0.85fr] lg:grid-rows-[minmax(0,1fr)]">
      {/* História: foto do Acre com paralaxe e linha do tempo interativa */}
      <div
        ref={photo}
        onPointerMove={move}
        onPointerLeave={() => { photo.current?.style.setProperty("--px", "0px"); photo.current?.style.setProperty("--py", "0px"); }}
        className="nv-parallax nv-dark relative isolate flex min-h-[30rem] flex-col justify-end overflow-hidden rounded-2xl bg-[#06150d] text-white lg:min-h-0"
      >
        <AcreArt />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-[#06150d] via-[#06150d]/60 to-transparent" />
        <div className="flex flex-col gap-4 p-5 lg:p-10">
          <span className="nv-rise inline-flex w-fit items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <MapPin size={13} className="text-yellow-300" aria-hidden="true" /> Feijó, Acre, Brasil
          </span>
          <h1 className="nv-rise max-w-[20ch] text-balance font-display text-3xl font-extrabold leading-[1.06] tracking-tight xl:text-5xl" style={{ animationDelay: "60ms" }}>
            Saúde, loja e tecnologia em uma só plataforma, feita no Acre.
          </h1>
          <div onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} className="max-w-[46rem]">
            <div role="tablist" aria-label="A história da NextVita" className="flex flex-wrap gap-1.5">
              {story.map((s, i) => (
                <button key={s.key} role="tab" type="button" aria-selected={i === step} onClick={() => setStep(i)} onFocus={() => { setHold(true); setStep(i); }}
                  className={`relative overflow-hidden rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${i === step ? "bg-yellow-300 text-[#0b2418]" : "bg-white/10 text-white/80 hover:bg-white/20"}`}>
                  {s.label}
                  {i === step && !hold && <span className="nv-progress absolute inset-x-0 bottom-0 block h-0.5 bg-[#0b2418]/50" style={{ animationDuration: "4200ms" }} />}
                </button>
              ))}
            </div>
            <p key={step} role="tabpanel" className="nv-fade-in mt-3 min-h-[4.8em] text-[15px] leading-relaxed text-white/85">{story[step].text}</p>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 gap-3 lg:grid-rows-[auto_minmax(0,1fr)_auto]">
        {/* Desenvolvedor */}
        <section aria-label="O desenvolvedor" className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 lg:p-5">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#0b2418]"><LogoMark size={40} /></span>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-extrabold leading-tight">Franc D&apos;nis</h2>
            <p className="text-sm text-muted-foreground">Desenvolvedor de sites, aplicativos e sistemas. Criador da NextVita.</p>
          </div>
        </section>

        {/* Portfólio e serviços */}
        <section aria-label="Portfólio e serviços" className="relative flex min-h-0 flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 lg:p-5">
          <div className="relative mx-auto flex min-h-0 w-full flex-1 items-center justify-center pt-2"><div className="relative h-full max-h-64 max-w-full" style={{ aspectRatio: "16 / 10" }}>
            <span className="absolute -left-1 top-0 z-10 rounded-full bg-[#0b2418] px-2.5 py-1 text-[11px] font-bold text-yellow-300 shadow">Projeto em destaque: NextVita</span>
            <div className="mt-3 rounded-xl bg-slate-900 p-1.5 shadow-xl">
              <div className="overflow-hidden rounded-md bg-white">
                <img src="/images/dev-nextvita-desktop.webp" alt="Página inicial da NextVita no computador" width={800} height={450} className="aspect-[16/9] w-full object-cover object-top" />
              </div>
            </div>
            <div className="relative left-1/2 h-2 w-[110%] -translate-x-1/2 rounded-b-xl bg-gradient-to-b from-slate-400 to-slate-600" />
            <div className="nv-float absolute -bottom-3 right-0 w-[18%] rounded-[14px] bg-slate-900 p-1 shadow-2xl">
              <img src="/images/dev-nextvita-mobile.webp" alt="NextVita no celular" width={300} height={560} className="aspect-[9/17] w-full rounded-[10px] object-cover object-top" />
            </div>
          </div></div>
          <div role="tablist" aria-label="Serviços" className="grid shrink-0 grid-cols-4 gap-1.5">
            {services.map((s, i) => (
              <button key={s.key} role="tab" type="button" aria-selected={i === service} onClick={() => setService(i)} onMouseEnter={() => setService(i)}
                className={`nv-tile flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-xs font-semibold ${i === service ? "border-[#4d7c0f] bg-[#4d7c0f]/10" : "border-border"}`}
                style={{ ["--tile" as string]: "#4d7c0f" }}>
                <s.icon size={17} className="nv-tile-icon text-[#4d7c0f] dark:text-lime-300" aria-hidden="true" /> {s.label}
              </button>
            ))}
          </div>
          <p key={service} role="tabpanel" className="nv-fade-in min-h-[2.8em] shrink-0 text-sm text-muted-foreground">{S.text}</p>
        </section>

        {/* Contato */}
        <section aria-label="Contato" className="grid gap-2 rounded-2xl bg-[#0b2418] p-4 text-white lg:p-5">
          <p className="font-display text-lg font-bold">Tem uma ideia? Vamos conversar.</p>
          <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr]">
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="nv-cta inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25d366] px-4 text-sm font-bold text-slate-950" style={{ ["--area" as string]: "#25d366" }}>
              <MessageCircle size={17} aria-hidden="true" /> Chamar no WhatsApp
            </a>
            <a href={`tel:+${PHONE_DIGITS}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/25 px-4 text-sm font-semibold tabular-nums hover:bg-white/10">
              <Phone size={16} className="text-yellow-300" aria-hidden="true" /> {PHONE_LABEL}
            </a>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm">
            <Mail size={16} className="shrink-0 text-yellow-300" aria-hidden="true" />
            <a href={`mailto:${EMAIL}`} className="min-w-0 flex-1 truncate hover:underline">{EMAIL}</a>
            <button type="button" onClick={() => void copyEmail()} aria-label="Copiar e-mail" className="inline-flex h-8 items-center gap-1 rounded-lg bg-white/10 px-2.5 text-xs font-semibold hover:bg-white/20">
              {copied ? <><Check size={13} aria-hidden="true" /> Copiado</> : <><Copy size={13} aria-hidden="true" /> Copiar</>}
            </button>
          </div>
          <p className="sr-only" role="status" aria-live="polite">{copied ? "E-mail copiado." : ""}</p>
        </section>
      </div>
    </div>
  );
}
