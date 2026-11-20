import { useState } from "react";
import { createPortal } from "react-dom";
import { CupSoda, Droplets, Plus, UtensilsCrossed, X } from "lucide-react";
import { ClientQuickIntake } from "./ClientQuickIntake";

type Props = { patientId: string; area: string; onRecorded: () => void };

/** Botão flutuante de registro: fica sempre ao alcance do polegar e só oferece o registro da área aberta. */
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
  const fab = "nv-fab fixed right-4 z-[90] bottom-[calc(1rem+env(safe-area-inset-bottom))] inline-flex h-14 items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 px-5 text-sm font-extrabold text-white shadow-xl shadow-emerald-900/30 ring-4 ring-white/70 transition active:scale-95 dark:ring-slate-900/70";
  const chip = "inline-flex h-12 items-center gap-2 rounded-full bg-card px-4 text-sm font-bold text-foreground shadow-lg ring-1 ring-border";
  const ui = <>
    <div hidden>
      <ClientQuickIntake patientId={patientId} mode="water" openSignal={water} onRecorded={onRecorded} />
      <ClientQuickIntake patientId={patientId} mode="food" openSignal={food} onRecorded={onRecorded} />
      <ClientQuickIntake patientId={patientId} mode="drink" openSignal={drink} onRecorded={onRecorded} />
    </div>
    {menu && <button type="button" aria-label="Fechar opções" className="fixed inset-0 z-[85] bg-slate-950/30 backdrop-blur-[1px]" onClick={() => setMenu(false)} />}
    {both && menu && <div className="nv-fab-menu fixed right-4 z-[90] bottom-[calc(5.25rem+env(safe-area-inset-bottom))] flex flex-col items-end gap-2">
      {area === "hoje" && <button type="button" className={chip} onClick={() => { setMenu(false); setFood((v) => v + 1); }}><UtensilsCrossed size={18} className="text-emerald-600" /> Registrar refeição</button>}
      <button type="button" className={chip} onClick={() => { setMenu(false); setDrink((v) => v + 1); }}><CupSoda size={18} className="text-violet-500" /> Registrar bebida (suco, café, leite…)</button>
      <button type="button" className={chip} onClick={() => { setMenu(false); setWater((v) => v + 1); }}><Droplets size={18} className="text-sky-500" /> Registrar água</button>
    </div>}
    <button type="button" className={fab} aria-label={both ? "Registrar" : kind === "water" ? "Registrar água" : kind === "food" ? "Registrar refeição" : jumpLabel}
      onClick={() => { if (both) setMenu((v) => !v); else if (kind === "water") setWater((v) => v + 1); else if (kind === "food") setFood((v) => v + 1); else go(); }}>
      {menu ? <X size={22} /> : kind === "water" ? <Droplets size={22} /> : kind === "food" ? <UtensilsCrossed size={22} /> : <Plus size={22} />}
      {!menu && <span>{both ? "Registrar" : kind === "water" ? "Registrar água" : kind === "food" ? "Registrar refeição" : jumpLabel}</span>}
    </button>
  </>;
  return typeof document === "undefined" ? null : createPortal(ui, document.body);
}
