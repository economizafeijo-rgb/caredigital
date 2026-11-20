import { useState } from "react";
import { CupSoda, Droplets, Plus, UtensilsCrossed, X } from "lucide-react";
import { ClientQuickIntake } from "./ClientQuickIntake";

type Props = { patientId: string; area: string; onRecorded: () => void };

/** Botão de registro no cabeçalho da área: só oferece o registro da área aberta, sem ocupar espaço da página. */
export function QuickRegisterFab({ patientId, area, onRecorded }: Props) {
  const [menu, setMenu] = useState(false);
  const [water, setWater] = useState(0);
  const [food, setFood] = useState(0);
  const [drink, setDrink] = useState(0);
  // Visão geral e Hidratação abrem um menu (água, outras bebidas e, na visão geral, alimento).
  const both = area === "hoje" || area === "hidratacao";
  const kind: "water" | "food" | "jump" | null = both ? null
    : area === "hidratacao" ? "water"
    : area === "alimentacao" || area === "cardapios" ? "food"
    : ["peso", "sono", "atividade", "medicacao", "suplementos"].includes(area) ? "jump" : null;
  if (!both && !kind) return null;
  const jumpLabel = area === "peso" ? "Inserir peso" : area === "sono" ? "Registrar noite" : area === "atividade" ? "Registrar atividade" : "Registrar dose";

  function go() {
    const target = document.querySelector<HTMLElement>("[data-register-target]");
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => target.querySelector<HTMLElement>("input,select,textarea")?.focus({ preventScroll: true }), 450);
  }
  const fab = "nv-btn nv-btn-glass !min-h-10 !rounded-xl px-3.5";
  const chip = "inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-xl bg-card px-3.5 text-[13px] font-bold text-foreground shadow-lg ring-1 ring-border transition hover:bg-muted active:scale-95";
  const label = both ? "Registrar" : kind === "water" ? "Registrar água" : kind === "food" ? "Registrar refeição" : jumpLabel;
  return <span className="relative inline-flex">
    <span hidden>
      <ClientQuickIntake patientId={patientId} mode="water" openSignal={water} onRecorded={onRecorded} />
      <ClientQuickIntake patientId={patientId} mode="food" openSignal={food} onRecorded={onRecorded} />
      <ClientQuickIntake patientId={patientId} mode="drink" openSignal={drink} onRecorded={onRecorded} />
    </span>
    {menu && <button type="button" aria-label="Fechar opções" className="fixed inset-0 z-[85] cursor-default" onClick={() => setMenu(false)} />}
    {both && menu && <div className="nv-pop absolute right-0 top-full z-[90] mt-2 flex flex-col items-stretch gap-1.5">
      {area === "hoje" && <button type="button" className={chip} onClick={() => { setMenu(false); setFood((v) => v + 1); }}><UtensilsCrossed size={16} className="text-emerald-600" /> Registrar refeição</button>}
      <button type="button" className={chip} onClick={() => { setMenu(false); setDrink((v) => v + 1); }}><CupSoda size={16} className="text-violet-500" /> Registrar bebida</button>
      <button type="button" className={chip} onClick={() => { setMenu(false); setWater((v) => v + 1); }}><Droplets size={16} className="text-sky-500" /> Registrar água</button>
    </div>}
    <button type="button" className={fab} aria-label={label} aria-expanded={both ? menu : undefined}
      onClick={() => { if (both) setMenu((v) => !v); else if (kind === "water") setWater((v) => v + 1); else if (kind === "food") setFood((v) => v + 1); else go(); }}>
      {menu ? <X size={16} /> : kind === "water" ? <Droplets size={16} /> : kind === "food" ? <UtensilsCrossed size={16} /> : <Plus size={16} />}
      <span>{label}</span>
    </button>
  </span>;
}
