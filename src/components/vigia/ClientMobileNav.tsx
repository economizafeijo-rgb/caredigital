import { useEffect, useRef } from "react";
import {
  Activity,
  BedDouble,
  BookOpen,
  CalendarDays,
  Droplets,
  HeartPulse,
  History,
  LayoutDashboard,
  Pill,
  Ruler,
  Scale,
  Sparkles,
  Target,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { ClientSection } from "@/lib/client-pages";

const ITEMS: [ClientSection, string, LucideIcon][] = [
  ["hoje", "Hoje", LayoutDashboard],
  ["agenda", "Meu dia", CalendarDays],
  ["medicacao", "Medicação", Pill],
  ["hidratacao", "Hidratação", Droplets],
  ["alimentacao", "Alimentação", Utensils],
  ["cardapios", "Cardápios", BookOpen],
  ["suplementos", "Suplementos", Sparkles],
  ["atividade", "Atividade", Activity],
  ["sono", "Sono", BedDouble],
  ["peso", "Peso", Scale],
  ["medidas", "Medidas", Ruler],
  ["batimentos", "Batimentos", HeartPulse],
  ["indicadores", "Indicadores", Target],
  ["historico", "Histórico", History],
];

/** Menu de seções do painel do cliente no celular: abas deslizáveis, sempre visíveis no topo. */
export function ClientMobileNav({
  active,
  onOpen,
}: {
  active: ClientSection;
  onOpen: (section: ClientSection) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[aria-current="page"]');
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);
  return (
    <nav
      ref={ref}
      aria-label="Seções do meu acompanhamento"
      className="sticky -top-2 z-30 -mx-2 -mt-2 border-b border-border bg-background pt-2 sm:-top-3 sm:-mx-3 sm:-mt-3 sm:pt-3 lg:hidden"
    >
      <ul className="flex gap-2 overflow-x-auto px-2 py-2.5 sm:px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ITEMS.map(([key, label, Icon]) => {
          const on = key === active;
          return (
            <li key={key} className="shrink-0">
              <button
                type="button"
                aria-current={on ? "page" : undefined}
                onClick={() => onOpen(key)}
                className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition active:scale-95 ${
                  on
                    ? "border-transparent bg-primary text-primary-foreground shadow"
                    : "border-border bg-card text-foreground/80"
                }`}
              >
                <Icon size={15} aria-hidden="true" /> {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
