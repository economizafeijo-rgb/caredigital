import type { ReactNode } from "react";
import {
  Activity,
  Droplets,
  Pill,
  Scale,
  ShieldCheck,
  Trash2,
  UtensilsCrossed,
  Moon,
  type LucideIcon,
} from "lucide-react";

type Area = {
  key: string;
  label: string;
  icon: LucideIcon;
  image: string;
  accent: string;
};

const AREAS: Area[] = [
  {
    key: "agua",
    label: "Hidratação",
    icon: Droplets,
    image: "/images/hero-hidratacao.webp",
    accent: "#22d3ee",
  },
  {
    key: "peso",
    label: "Peso",
    icon: Scale,
    image: "/images/hero-peso.webp",
    accent: "#a78bfa",
  },
  { key: "sono", label: "Sono", icon: Moon, image: "/images/hero-sono.webp", accent: "#818cf8" },
  {
    key: "atividade",
    label: "Atividade",
    icon: Activity,
    image: "/images/painel-atividade.webp",
    accent: "#fb923c",
  },
  {
    key: "remedio",
    label: "Medicação",
    icon: Pill,
    image: "/images/hero-medicamentos.webp",
    accent: "#38bdf8",
  },
  {
    key: "suplemento",
    label: "Suplementos",
    icon: Pill,
    image: "/images/hero-suplementos.webp",
    accent: "#a3e635",
  },
  {
    key: "comida",
    label: "Alimentação",
    icon: UtensilsCrossed,
    image: "/images/hero-alimentacao.webp",
    accent: "#34d399",
  },
];
const GENERIC: Area = {
  key: "geral",
  label: "Confirmação",
  icon: ShieldCheck,
  image: "/images/caredigital-care-hero.webp",
  accent: "#34d399",
};

/** Descobre a área (água, peso, sono…) pelo texto da própria confirmação. */
export function confirmArea(text: string): Area {
  const t = text.toLowerCase();
  if (/sono|dormi/.test(t)) return AREAS[2];
  if (/\bpeso\b|\bkg\b|altura/.test(t)) return AREAS[1];
  if (/suplement/.test(t)) return AREAS[5];
  if (/dose|medica|remédio|remedio|programaç/.test(t)) return AREAS[4];
  if (/atividade|treino|exerc|caminhada/.test(t)) return AREAS[3];
  if (/refei|prato|aliment|consumo|\bg de\b|\bgramas\b|cardápio|cardapio/.test(t)) return AREAS[6];
  if (/água|agua|\bml\b|bebida|líquido|liquido|chá|hidrat/.test(t)) return AREAS[0];
  return GENERIC;
}

/**
 * Cartão de confirmação compacto: foto da área no topo, ícone da ação, título e linhas de resumo.
 * Largura fixa em linha para escapar da regra global `[role=dialog]{max-width:100vw}`.
 */
export function ConfirmCard({
  title,
  lines,
  area,
  danger = false,
  onClose,
  children,
  footer,
  titleId,
}: {
  title: string;
  lines: ReactNode[];
  area: Area;
  danger?: boolean;
  onClose?: () => void;
  children?: ReactNode;
  footer: ReactNode;
  titleId?: string;
}) {
  const Icon = danger ? Trash2 : area.icon;
  const accent = danger ? "#f43f5e" : area.accent;
  return (
    <div
      className="nv-dark nv-pop relative w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950 text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,.8)]"
      style={{ maxWidth: 360 }}
    >
      <div className="relative h-24 overflow-hidden">
        <img
          src={area.image}
          alt=""
          aria-hidden="true"
          loading="eager"
          className="absolute inset-0 size-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-slate-950/45 to-slate-950"
        />
        <span
          className="absolute left-4 top-3 rounded-full bg-slate-950/60 px-2.5 py-1 text-[11px] font-bold backdrop-blur-md"
          style={{ color: accent }}
        >
          {danger ? "Atenção" : area.label}
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{ cursor: "pointer" }}
            className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-slate-950/60 text-sm text-white/80 backdrop-blur-md transition hover:bg-slate-950/90 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>
      <div className="relative -mt-7 px-5 pb-5">
        <span
          className="grid size-12 place-items-center rounded-2xl text-slate-950 shadow-lg ring-4 ring-slate-950"
          style={{ background: accent }}
        >
          <Icon size={22} />
        </span>
        <h2 id={titleId} className="mt-3 text-lg font-extrabold leading-tight">
          {title}
        </h2>
        <div className="mt-2 grid gap-1.5 text-[13px] leading-snug text-white/75">
          {lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
        {children}
        <div className="mt-5">{footer}</div>
      </div>
    </div>
  );
}
