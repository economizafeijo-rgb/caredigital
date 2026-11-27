import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Estado vazio padrão: ilustração discreta (ícone do tema sobre círculos suaves),
 * título curto e uma orientação do que fazer. Use no lugar de textos soltos.
 */
export function EmptyState({
  icon: Icon,
  title,
  text,
  tone = "#14b8a6",
  action,
  compact,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  tone?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? "px-4 py-6" : "px-6 py-10"}`}
    >
      <div className="relative grid size-24 place-items-center" aria-hidden="true">
        <span
          className="absolute inset-0 rounded-full opacity-[.08]"
          style={{ background: tone }}
        />
        <span
          className="absolute inset-3 rounded-full opacity-[.12]"
          style={{ background: tone }}
        />
        <span
          className="relative grid size-12 place-items-center rounded-2xl border bg-card shadow-sm"
          style={{ borderColor: `${tone}55`, color: tone }}
        >
          <Icon size={22} strokeWidth={1.75} />
        </span>
      </div>
      <p className="mt-3 text-sm font-bold text-foreground">{title}</p>
      {text ? (
        <p className="mt-1 max-w-[20rem] text-xs leading-relaxed text-muted-foreground">{text}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
