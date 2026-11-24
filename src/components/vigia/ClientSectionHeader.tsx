import type { ReactNode } from "react";
import { UserRound } from "lucide-react";
import type { ClientSection } from "@/lib/client-pages";
import { clientSectionTheme } from "@/lib/client-section-theme";
import { AnimatedLock } from "./AnimatedLock";
import { ClientQuickIntake } from "./ClientQuickIntake";
import { ExportPlanButton } from "./ExportPlanButton";
import { LiveModeButton } from "./LiveMode";
import { QuickRegisterFab } from "./QuickRegisterFab";

type Props = {
  area: ClientSection;
  title: string;
  subtitle: ReactNode;
  patientId: string;
  ownerId: string;
  heightCm: number | null;
  name: string;
  profileLocked: boolean;
  onRecorded: () => void;
  onProfile: () => void;
};

/** Botão quadrado de ferramenta (PDF, ao vivo, perfil): só ícone no celular, com texto no computador. */
const tool =
  "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-slate-950/60 text-sm font-semibold text-white shadow-md backdrop-blur-md transition hover:bg-slate-900/85 active:scale-95 max-sm:w-10 sm:px-3";

/**
 * Faixa do topo de cada área do painel do cliente.
 * Celular: título e ferramentas (PDF, ao vivo, perfil) numa linha; o registro da área, quando existe,
 * ocupa a linha de baixo inteira. Computador: tudo numa linha só.
 */
export function ClientSectionHeader({
  area,
  title,
  subtitle,
  patientId,
  ownerId,
  heightCm,
  name,
  profileLocked,
  onRecorded,
  onProfile,
}: Props) {
  const theme = clientSectionTheme[area];
  const Icon = theme.icon;
  return (
    <header className="relative isolate flex min-h-0 shrink-0 flex-wrap items-center gap-x-3 gap-y-2.5 overflow-hidden rounded-xl bg-slate-950 !px-3 !py-2.5 text-white shadow-card sm:!py-2 [&_p]:!text-slate-200">
      <img
        key={area}
        src={theme.image}
        alt=""
        aria-hidden="true"
        width={1400}
        height={600}
        decoding="async"
        style={{ objectPosition: theme.position }}
        className="absolute inset-y-0 right-0 -z-20 h-full w-full object-cover sm:w-3/5"
      />
      <div
        aria-hidden="true"
        className={`absolute inset-0 -z-10 bg-gradient-to-r from-35% via-60% ${theme.overlay}`}
      />

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden="true"
          className={`hidden size-10 shrink-0 place-items-center rounded-xl text-white shadow-lg ring-1 ring-white/25 sm:grid ${theme.pill}`}
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate !whitespace-nowrap text-lg font-bold leading-tight tracking-tight sm:text-xl">
            {title}
          </h1>
          <p className="truncate !whitespace-nowrap text-xs text-muted-foreground first-letter:uppercase">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Registro da área. Alimentação e Hidratação já têm o botão principal dentro da própria página. */}
      <fieldset
        disabled={profileLocked}
        title={profileLocked ? "Complete o cadastro para registrar" : undefined}
        className="nv-day-actions order-last m-0 flex w-full min-w-0 flex-wrap items-center gap-2 border-0 p-0 empty:hidden disabled:opacity-60 max-sm:[&>*]:flex-1 max-sm:[&>span>button]:w-full max-sm:[&>span>button]:justify-center sm:order-none sm:w-auto"
      >
        {area === "hoje" && (
          <ClientQuickIntake
            patientId={patientId}
            mode="water"
            label="Água"
            onRecorded={onRecorded}
          />
        )}
        {(area === "hoje" || area === "cardapios") && (
          <ClientQuickIntake
            patientId={patientId}
            mode="food"
            label={area === "hoje" ? "Refeição" : undefined}
            onRecorded={onRecorded}
          />
        )}
        {area === "hoje" && (
          <ClientQuickIntake
            patientId={patientId}
            mode="drink"
            label="Bebida"
            onRecorded={onRecorded}
          />
        )}
        {profileLocked && (
          <span className="inline-flex h-9 items-center gap-1.5 border border-white/20 px-2.5 text-xs font-semibold text-white/80">
            <AnimatedLock
              size={15}
              label="Registros bloqueados até completar o cadastro"
              className="!text-amber-300"
            />
            Registros bloqueados
          </span>
        )}
        {!profileLocked && area !== "alimentacao" && (
          <QuickRegisterFab patientId={patientId} area={area} onRecorded={onRecorded} />
        )}
      </fieldset>

      <div className="flex shrink-0 items-center gap-1.5">
        <ExportPlanButton
          patientId={patientId}
          ownerId={ownerId}
          label="PDF"
          labelClassName="max-sm:sr-only"
          className={tool}
        />
        <fieldset
          disabled={profileLocked}
          className="m-0 flex items-center gap-1.5 border-0 p-0 disabled:opacity-60"
        >
          <LiveModeButton
            iconOnlyOnMobile
            className="!h-10 !rounded-xl max-sm:!w-10 max-sm:justify-center max-sm:!px-0 sm:!px-4 sm:!text-[13px]"
            patientId={patientId}
            ownerId={ownerId}
            heightCm={heightCm}
            name={name}
          />
          <button
            type="button"
            onClick={onProfile}
            aria-label="Meu perfil"
            title="Meu perfil"
            className={`${tool} sm:w-10 sm:px-0`}
          >
            <UserRound size={17} />
          </button>
        </fieldset>
      </div>
    </header>
  );
}
