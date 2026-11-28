import { useState } from "react";
import { ChevronDown, Footprints, GraduationCap } from "lucide-react";

/** Gasto por minuto pela fórmula do ACSM: MET × 3,5 × peso (kg) ÷ 200. METs do Compendium of Physical Activities. */
const ACTIVITIES: [string, number][] = [
  ["Caminhada moderada", 3.5],
  ["Caminhada rápida", 4.3],
  ["Bicicleta leve", 5.8],
  ["Dança", 5],
  ["Musculação", 5],
  ["Natação moderada", 6],
  ["Corrida leve (8 km/h)", 8.3],
];
const KCAL_PER_KG_FAT = 7700;
const nf = (n: number) => Math.round(n).toLocaleString("pt-BR");

/** Explicação discreta: o que é kcal, balanço do dia, como perder peso e equivalência em exercício. */
export function CalorieGuide({
  total,
  target,
  weightKg,
}: {
  total: number;
  target: number;
  weightKg: number | null;
}) {
  const [open, setOpen] = useState(false);
  const kg = weightKg && weightKg > 30 ? weightKg : 70;
  const excess = target > 0 ? total - target : 0;
  const base = excess > 50 ? excess : 300;
  return (
    <section className="mt-3 overflow-hidden rounded-xl border border-border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-muted/50"
      >
        <GraduationCap size={14} className="text-orange-400" />
        Entenda as calorias e como usar a meta
        <ChevronDown
          size={14}
          className={`ml-auto transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="grid gap-3 border-t border-border px-3 py-2.5 text-[12px] leading-snug">
          <p>
            <b>O que é kcal.</b> Quilocaloria é a unidade de energia dos alimentos. Carboidrato e
            proteína dão 4 kcal por grama, gordura dá 9 kcal e álcool 7 kcal. Seu corpo gasta
            energia o dia todo: para funcionar em repouso, digerir e se mover.
          </p>
          <p>
            <b>Balanço de hoje.</b>{" "}
            {target > 0
              ? excess > 0
                ? `Você está ${nf(excess)} kcal acima da sua meta de ${nf(target)} kcal.`
                : `Ainda cabem ${nf(-excess)} kcal na sua meta de ${nf(target)} kcal.`
              : "Defina sua meta no perfil para ver o balanço."}{" "}
            A meta já considera seu objetivo; um dia acima não desfaz o progresso — o que conta é a
            média da semana.
          </p>
          <div>
            <p>
              <b>Para perder peso.</b> Coma de forma constante um pouco abaixo do que gasta. Um
              déficit de 500 a 750 kcal por dia leva, em média, a perder cerca de 0,5 a 0,7 kg por
              semana. Como referência, 1 kg de gordura guarda cerca de {nf(KCAL_PER_KG_FAT)} kcal.
            </p>
            <ul className="mt-1.5 grid gap-1 text-muted-foreground">
              <li>• Priorize proteína, verduras, legumes e fibras: saciam com menos calorias.</li>
              <li>
                • Reduza bebidas açucaradas, frituras, doces e álcool — calorias que pouco saciam.
              </li>
              <li>• Some exercício: a dieta pesa mais para perder; o exercício ajuda a manter.</li>
              <li>• Musculação 2× por semana preserva músculo enquanto você emagrece.</li>
            </ul>
          </div>
          <div>
            <p className="flex items-center gap-1.5">
              <Footprints size={13} className="text-emerald-400" />
              <b>
                {nf(base)} kcal{excess > 50 ? " (o excesso de hoje)" : ""} equivalem a, para{" "}
                {nf(kg)} kg:
              </b>
            </p>
            <ul className="mt-1.5 grid grid-cols-2 gap-1">
              {ACTIVITIES.map(([name, met]) => {
                const perMin = (met * 3.5 * kg) / 200;
                return (
                  <li
                    key={name}
                    className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-2 py-1"
                  >
                    <span className="truncate">{name}</span>
                    <b className="shrink-0 tabular-nums">{nf(base / perMin)} min</b>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Estimativas. Gasto pela fórmula MET × 3,5 × peso ÷ 200 (ACSM; METs do Compendium of
            Physical Activities). Déficit de 500–750 kcal/dia: Mayo Clinic. Gestantes, menores de
            idade e pessoas com doenças devem ajustar metas com nutricionista ou médico.
          </p>
        </div>
      )}
    </section>
  );
}
