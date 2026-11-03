import { CalendarDays, Droplets, History, LayoutDashboard, UtensilsCrossed, BookOpen } from "lucide-react";
import { clientSectionLabels, type ClientSection } from "@/lib/client-pages";
type Props={section:ClientSection;count?:number;dateLabel?:string};
const icons={
  hoje:LayoutDashboard,agenda:CalendarDays,hidratacao:Droplets,historico:History,alimentacao:UtensilsCrossed,cardapios:BookOpen,
} as const;
const countUnit={hoje:"cuidados",agenda:"agendamentos",hidratacao:"horários",historico:"prontuário privado",alimentacao:"refeições",cardapios:"biblioteca alimentar"} as const;

export function ClientSectionHeader({section,count,dateLabel}:Props){
  const Icon=icons[section];
  const copy=clientSectionLabels[section];
  return <header data-page={section} className="care-section-heading relative flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-2 overflow-hidden rounded-2xl border px-3 py-2.5 sm:px-4">
    <div className="care-section-heading-decor pointer-events-none absolute -right-8 -top-8 size-32 rounded-full" aria-hidden="true"/>
    <div className="relative flex min-w-0 items-center gap-3">
      <span className="care-section-heading-icon grid size-11 shrink-0 place-items-center rounded-xl border">
        <Icon size={22} strokeWidth={2.1}/>
      </span>
      <div className="min-w-0">
        <p className="care-section-heading-eyebrow text-[9px] font-extrabold uppercase tracking-widest">{copy.tagline}</p>
        <h2 className="truncate text-base font-extrabold tracking-tight sm:text-lg">{copy.title}</h2>
        <p className="care-section-heading-subtitle hidden max-w-[80ch] truncate text-[10px] sm:block sm:text-[11px]">{copy.subtitle}</p>
      </div>
    </div>
    <div className="relative flex min-w-0 shrink-0 flex-col items-end gap-0.5">
      {typeof count==="number"?<span className="care-section-heading-stat inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-bold tabular-nums">
        {count} {countUnit[section]}
      </span>:<span className="care-section-heading-stat rounded-lg border px-2.5 py-1 text-[10px] font-bold">{countUnit[section]}</span>}
      {dateLabel&&<span className="care-section-heading-subtitle text-[10px]">{dateLabel}</span>}
    </div>
  </header>;
}
