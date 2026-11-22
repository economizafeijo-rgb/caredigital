import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { NiceSelect } from "./NiceSelect";
import {
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Dumbbell,
  Fish,
  Flame,
  Leaf,
  Lightbulb,
  Moon,
  Pencil,
  Pill,
  Plus,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Undo2,
  UtensilsCrossed,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { acreDateKey } from "@/lib/acre-time";
import { useDialog } from "@/lib/dialog";
import { SupplementPack, type PackShape } from "./SupplementPack";
import { NextUpClock } from "./NextUpClock";

type Unit = "g" | "mg" | "mcg" | "UI" | "cápsula" | "comprimido" | "ml" | "scoop";
export type SupplementPlan = {
  id: string;
  name: string;
  kind: string;
  dose: number;
  unit: Unit;
  times: string[];
  with_food: boolean;
  notes: string | null;
  active: boolean;
};
type Intake = { id: string; plan_id: string; taken_on: string; slot: string; taken_at: string };
type Task = {
  id: string;
  patient_id: string;
  title: string;
  category: string;
  scheduled_at: string;
  completed_at: string | null;
};
type Props = { patientId: string; ownerId: string; tasks: Task[]; onConfirm: (task: Task) => void };

type LibraryItem = {
  key: string;
  name: string;
  icon: LucideIcon;
  gradient: string;
  category: string;
  dose: number;
  unit: Unit;
  range: string;
  timing: string;
  times: string[];
  withFood: boolean;
  benefit: string;
  tips: string[];
  caution: string;
  pack: { shape: PackShape; color: string; label: string; sub: string };
  /** Foto real da embalagem (PNG/WebP com fundo transparente), quando existir. */
  photo?: string;
  brand?: string;
  /** Dados transcritos do rótulo do produto. */
  label?: ProductLabel;
};
type ProductLabel = {
  serving: string;
  servings: string;
  rows: { name: string; detail?: string; amount: string; dv?: string }[];
  other: string;
  free: string[];
  seals: string[];
  note: string;
};
type Seed = Omit<LibraryItem, "pack" | "icon" | "gradient"> & {
  icon?: LucideIcon;
  gradient?: string;
  pack: LibraryItem["pack"];
};
const seed = (x: Seed): LibraryItem => ({
  icon: Sparkles,
  gradient: "from-violet-500 to-fuchsia-500",
  ...x,
});

/** Mostra a foto real da embalagem quando houver; senão, a ilustração em SVG. */
function PackArt({ item, className }: { item: LibraryItem; className?: string }) {
  if (item.photo) {
    return (
      <img
        src={item.photo}
        alt={item.name}
        loading="lazy"
        decoding="async"
        className={`${className ?? ""} object-contain`}
      />
    );
  }
  return <SupplementPack {...item.pack} title={item.name} className={className} />;
}

/** Página própria do produto: vitrine em tela cheia com foto, ficha, como tomar e cuidados. */
function ProductPage({
  item,
  onClose,
  onAdd,
}: {
  item: LibraryItem;
  onClose: () => void;
  onAdd: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  const color = item.pack.color;
  const specs = [
    { icon: Pill, label: "Dose de referência", value: item.range },
    { icon: Clock, label: "Melhor momento", value: item.timing },
    {
      icon: UtensilsCrossed,
      label: "Com refeição?",
      value: item.withFood ? "Sim, de preferência" : "Não é necessário",
    },
  ];
  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/75 p-0 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <article
        role="dialog"
        aria-modal="true"
        aria-label={`Página do produto: ${item.name}`}
        onClick={(e) => e.stopPropagation()}
        className="nv-fade-in relative flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden bg-background shadow-2xl sm:h-[min(46rem,calc(100dvh-2rem))] sm:rounded-3xl md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar página do produto"
          className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-full bg-background/85 text-foreground shadow ring-1 ring-border backdrop-blur transition hover:bg-background"
        >
          <X size={18} />
        </button>
        <div
          className="relative h-60 shrink-0 md:h-auto md:min-h-0"
          style={{
            background: `radial-gradient(circle at 50% 42%, ${color}55, transparent 68%), linear-gradient(160deg, ${color}26, ${color}0d 60%, transparent)`,
          }}
        >
          <span
            className="absolute left-4 top-4 rounded-full bg-background/80 px-3 py-1 text-xs font-bold backdrop-blur"
            style={{ color }}
          >
            {item.category}
          </span>
          <div className="absolute inset-x-6 bottom-16 top-12 grid place-items-center md:bottom-20 md:top-14">
            <PackArt
              item={item}
              className={`nv-float w-auto max-w-[70%] object-contain drop-shadow-[0_16px_18px_rgba(0,0,0,.35)] ${item.photo ? "max-h-[min(100%,19rem)]" : "max-h-[min(100%,15rem)]"}`}
            />
          </div>
          <span
            aria-hidden="true"
            className="absolute bottom-[4.25rem] left-1/2 h-4 w-40 -translate-x-1/2 rounded-[50%] bg-black/30 blur-lg md:bottom-[5.25rem]"
          />
          <p className="absolute inset-x-4 bottom-4 text-center text-xs font-semibold text-foreground/70">
            {item.pack.sub}
          </p>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto p-5 sm:p-6">
          <header>
            {item.brand && (
              <p className="text-xs font-bold tracking-wide" style={{ color }}>
                {item.brand}
              </p>
            )}
            <h3 className="mt-0.5 pr-10 text-2xl font-extrabold leading-tight">{item.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.benefit}</p>
            {item.label && (
              <p className="mt-2 flex flex-wrap gap-1.5">
                {item.label.seals.map((seal) => (
                  <span
                    key={seal}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300"
                  >
                    <Check size={12} /> {seal}
                  </span>
                ))}
              </p>
            )}
          </header>

          <dl className="grid gap-2">
            {specs.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 rounded-2xl bg-muted/60 px-3 py-2.5">
                <span
                  className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl text-white"
                  style={{ background: color }}
                >
                  <Icon size={16} />
                </span>
                <div className="min-w-0">
                  <dt className="text-[11px] font-semibold text-muted-foreground">{label}</dt>
                  <dd className="text-sm font-bold">{value}</dd>
                </div>
              </div>
            ))}
          </dl>

          {item.label && (
            <section aria-label="Informação nutricional" className="overflow-hidden rounded-2xl border border-border">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 bg-foreground px-3 py-2 text-background">
                <h4 className="text-sm font-extrabold">Informação nutricional</h4>
                <span className="text-[11px] opacity-80">Porção: {item.label.serving}</span>
              </div>
              <p className="px-3 pt-1.5 text-[11px] text-muted-foreground">{item.label.servings}</p>
              <table className="w-full text-sm">
                <thead className="sr-only">
                  <tr>
                    <th>Nutriente</th>
                    <th>Quantidade por porção</th>
                    <th>%VD</th>
                  </tr>
                </thead>
                <tbody>
                  {item.label.rows.map((row) => (
                    <tr key={row.name} className="border-t border-border">
                      <td className="px-3 py-2">
                        <strong>{row.name}</strong>
                        {row.detail && (
                          <span className="block text-[11px] leading-4 text-muted-foreground">
                            {row.detail}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-1 text-right font-bold tabular-nums">
                        {row.amount}
                      </td>
                      <td className="w-14 whitespace-nowrap px-3 text-right tabular-nums text-muted-foreground">
                        {row.dv}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="grid gap-1.5 border-t border-border px-3 py-2.5 text-xs">
                <p>
                  <strong>Outros ingredientes:</strong> {item.label.other}
                </p>
                <p>
                  <strong>Livre de:</strong> {item.label.free.join(", ")}.
                </p>
                <p className="text-[11px] text-muted-foreground">{item.label.note}</p>
              </div>
            </section>
          )}

          <section aria-label="Como tomar">
            <h4 className="flex items-center gap-2 text-sm font-extrabold">
              <Lightbulb size={16} className="text-amber-500" /> Como tomar
            </h4>
            <ul className="mt-2 grid gap-2 text-sm">
              {item.tips.map((tip) => (
                <li key={tip} className="flex gap-2.5">
                  <Check size={15} className="mt-0.5 shrink-0" style={{ color }} />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </section>

          <aside className="flex gap-2.5 rounded-2xl bg-amber-500/10 p-3 text-xs leading-relaxed">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <p>
              <strong>Atenção:</strong> {item.caution} Converse com seu médico ou nutricionista
              antes de iniciar.
            </p>
          </aside>

          </div>
          <div className="flex shrink-0 flex-wrap gap-2 border-t border-border bg-background px-5 py-3 sm:px-6">
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex h-11 min-w-[12rem] flex-1 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold text-white shadow-lg transition hover:brightness-110 active:scale-[.98]"
              style={{ background: color }}
            >
              <Plus size={18} /> Adicionar à minha programação
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl bg-muted px-5 text-sm font-bold transition hover:bg-muted/70"
            >
              Voltar à biblioteca
            </button>
          </div>
        </div>
      </article>
    </div>,
    document.body,
  );
}

/** Referências educativas usuais em adultos saudáveis. Não substitui orientação profissional. */
export const supplementLibrary: LibraryItem[] = [
  seed({
    key: "whey",
    name: "Whey protein",
    icon: Dumbbell,
    gradient: "from-sky-500 to-indigo-500",
    category: "Proteínas",
    dose: 30,
    unit: "g",
    range: "20–40 g por dose",
    timing: "Após o treino ou para completar a proteína do dia",
    times: ["16:00"],
    withFood: false,
    benefit: "Ajuda a atingir a meta diária de proteína e a recuperação muscular.",
    tips: [
      "Misture em água ou leite logo após o treino.",
      "Conte a dose dentro da proteína total do dia.",
    ],
    caution: "Pessoas com doença renal devem ter orientação profissional.",
    pack: { shape: "pote", color: "#0284c7", label: "WHEY", sub: "900 g" },
  }),
  seed({
    key: "creatina",
    name: "Creatina monohidratada",
    icon: Zap,
    gradient: "from-violet-500 to-fuchsia-500",
    category: "Desempenho",
    dose: 3,
    unit: "g",
    range: "3–5 g por dia",
    timing: "Todos os dias, em qualquer horário",
    times: ["08:00"],
    withFood: true,
    benefit: "Melhora força e desempenho em exercícios de alta intensidade.",
    tips: ["A constância diária importa mais que o horário.", "Beba água ao longo do dia."],
    caution: "Evite em doença renal sem acompanhamento.",
    pack: { shape: "pote", color: "#7c3aed", label: "CREATINA", sub: "300 g" },
  }),
  seed({
    key: "vitd",
    name: "Vitamina D3",
    icon: Sun,
    gradient: "from-amber-400 to-orange-500",
    category: "Vitaminas",
    dose: 2000,
    unit: "UI",
    range: "1.000–2.000 UI por dia (conforme exame)",
    timing: "Com a maior refeição do dia",
    times: ["12:00"],
    withFood: true,
    benefit: "Importante para ossos, músculos e imunidade.",
    tips: [
      "É lipossolúvel: tome com alimentos que contenham gordura.",
      "A dose ideal depende do exame de sangue.",
    ],
    caution: "Doses altas só com prescrição.",
    pack: { shape: "gotas", color: "#d97706", label: "VITAMINA D3", sub: "2.000 UI · 20 ml" },
  }),
  seed({
    key: "vitc",
    name: "Vitamina C",
    icon: Sun,
    gradient: "from-orange-400 to-amber-500",
    category: "Vitaminas",
    dose: 500,
    unit: "mg",
    range: "75–500 mg por dia",
    timing: "Pela manhã, com uma refeição",
    times: ["08:00"],
    withFood: true,
    benefit: "Antioxidante que apoia a imunidade e ajuda a absorver o ferro.",
    tips: [
      "Frutas como acerola, laranja e goiaba são ótimas fontes.",
      "Doses acima de 1 g podem causar desconforto intestinal.",
    ],
    caution: "Histórico de cálculo renal pede orientação.",
    pack: { shape: "frasco", color: "#ea580c", label: "VIT C", sub: "500 mg · 60 cáps" },
  }),
  seed({
    key: "multi",
    name: "Multivitamínico",
    icon: Sparkles,
    gradient: "from-pink-500 to-rose-500",
    category: "Vitaminas",
    dose: 1,
    unit: "comprimido",
    range: "1 por dia",
    timing: "No café da manhã",
    times: ["08:00"],
    withFood: true,
    benefit: "Cobre lacunas de vitaminas e minerais da alimentação.",
    tips: [
      "Não substitui uma alimentação variada.",
      "Evite somar com outros suplementos de mesmos nutrientes.",
    ],
    caution: "Confira ferro e vitamina A se gestante.",
    pack: { shape: "frasco", color: "#db2777", label: "MULTI", sub: "A–Z · 60 comp" },
  }),
  seed({
    key: "complexo_b",
    name: "Complexo B",
    category: "Vitaminas",
    dose: 1,
    unit: "cápsula",
    range: "1 por dia",
    timing: "Pela manhã",
    times: ["08:00"],
    withFood: true,
    benefit: "Vitaminas do metabolismo energético e do sistema nervoso.",
    tips: ["Pode deixar a urina amarelada, o que é esperado.", "Prefira pela manhã."],
    caution: "Evite doses muito altas de B6 por longos períodos.",
    pack: { shape: "frasco", color: "#ca8a04", label: "COMPLEXO B", sub: "60 cáps" },
  }),
  seed({
    key: "b12",
    name: "Vitamina B12",
    category: "Vitaminas",
    dose: 500,
    unit: "mcg",
    range: "250–1.000 mcg por dia",
    timing: "Pela manhã",
    times: ["08:00"],
    withFood: false,
    benefit: "Essencial para o sangue e os nervos; importante para vegetarianos e idosos.",
    tips: ["Formas sublinguais são práticas.", "Acompanhe com exame se tiver deficiência."],
    caution: "Uso de metformina pode reduzir a B12: converse com o médico.",
    pack: { shape: "gotas", color: "#be123c", label: "B12", sub: "metilcobalamina" },
  }),
  seed({
    key: "colageno",
    name: "Colágeno hidrolisado",
    icon: Leaf,
    gradient: "from-emerald-500 to-lime-500",
    category: "Bem-estar",
    dose: 10,
    unit: "g",
    range: "5–10 g por dia",
    timing: "Em jejum ou com vitamina C",
    times: ["07:30"],
    withFood: false,
    benefit: "Pode apoiar articulações, pele e tendões.",
    tips: [
      "Combine com uma fonte de vitamina C.",
      "Os resultados aparecem após semanas de uso contínuo.",
    ],
    caution: "Não conta como proteína completa.",
    pack: { shape: "sache", color: "#e11d48", label: "COLÁGENO", sub: "10 g · hidrolisado" },
  }),
  seed({
    key: "maca",
    name: "Maca peruana",
    category: "Bem-estar",
    dose: 3,
    unit: "g",
    range: "1,5–3 g por dia",
    timing: "Pela manhã, misturada em vitamina ou suco",
    times: ["08:00"],
    withFood: true,
    benefit: "Raiz andina usada para disposição e energia no dia a dia.",
    tips: ["Comece com 1,5 g e aumente aos poucos.", "Combina com vitaminas de banana e aveia."],
    caution: "Evite na gestação e em problemas de tireoide sem orientação.",
    pack: { shape: "pote", color: "#a16207", label: "MACA", sub: "peruana · 250 g" },
  }),
  seed({
    key: "omega3",
    name: "Ômega 3 (EPA/DHA)",
    icon: Fish,
    gradient: "from-cyan-500 to-teal-500",
    category: "Bem-estar",
    dose: 1,
    unit: "cápsula",
    range: "1–2 g de EPA+DHA por dia",
    timing: "Junto a uma refeição com gordura",
    times: ["12:00"],
    withFood: true,
    benefit: "Contribui para a saúde do coração e do cérebro.",
    tips: ["Tomar com a refeição reduz o retrogosto.", "Guarde em local fresco."],
    caution: "Atenção se usa anticoagulantes.",
    pack: { shape: "frasco", color: "#0891b2", label: "ÔMEGA 3", sub: "1 g · 120 cáps" },
  }),
  seed({
    key: "magnesio",
    name: "Magnésio",
    icon: Moon,
    gradient: "from-indigo-500 to-purple-600",
    category: "Minerais",
    dose: 300,
    unit: "mg",
    range: "200–400 mg por dia",
    timing: "À noite, antes de dormir",
    times: ["21:00"],
    withFood: false,
    benefit: "Participa do relaxamento muscular e da qualidade do sono.",
    tips: [
      "Formas como glicinato costumam ser bem toleradas.",
      "Divida a dose se sentir desconforto intestinal.",
    ],
    caution: "Cuidado em insuficiência renal.",
    pack: { shape: "frasco", color: "#4f46e5", label: "MAGNÉSIO", sub: "glicinato · 60 cáps" },
  }),
  seed({
    key: "magnesio_b6",
    name: "Magnésio + vitamina B6",
    icon: Moon,
    gradient: "from-indigo-500 to-violet-600",
    category: "Minerais",
    dose: 1,
    unit: "cápsula",
    range: "200–350 mg de magnésio + 1–2 mg de B6 por dia",
    timing: "À noite ou após o jantar",
    times: ["21:00"],
    withFood: true,
    benefit:
      "A B6 ajuda o magnésio a entrar nas células; a dupla apoia músculos, sono e redução do cansaço.",
    tips: [
      "Confira no rótulo a quantidade de magnésio elementar.",
      "Não some com outro magnésio sem orientação.",
    ],
    caution:
      "Doença renal pede orientação; B6 acima de 25 mg por dia por longos períodos pode afetar os nervos.",
    pack: { shape: "frasco", color: "#6d28d9", label: "MAGNÉSIO + B6", sub: "60 cáps" },
  }),
  seed({
    key: "multi_50",
    name: "Multivitamínico 50+",
    icon: Sparkles,
    gradient: "from-rose-500 to-pink-600",
    category: "Vitaminas",
    dose: 1,
    unit: "comprimido",
    range: "1 por dia",
    timing: "No café da manhã ou almoço",
    times: ["08:00"],
    withFood: true,
    benefit:
      "Fórmula com mais vitamina D, B12 e cálcio, nutrientes que costumam faltar após os 50 anos.",
    tips: [
      "Tome com uma refeição para melhor absorção das vitaminas lipossolúveis.",
      "Leve o rótulo à consulta para conferir com seus exames.",
    ],
    caution: "Quem usa anticoagulante deve checar a vitamina K da fórmula.",
    pack: { shape: "frasco", color: "#be185d", label: "MULTI 50+", sub: "A–Z · 60 comp" },
  }),
  seed({
    key: "zinco",
    name: "Zinco",
    category: "Minerais",
    dose: 15,
    unit: "mg",
    range: "8–15 mg por dia",
    timing: "Longe de refeições ricas em cálcio",
    times: ["20:00"],
    withFood: false,
    benefit: "Apoia a imunidade, a pele e a cicatrização.",
    tips: ["Pode causar enjoo em jejum: tome com um lanche leve.", "Não passe de 40 mg por dia."],
    caution: "Uso prolongado em dose alta reduz o cobre.",
    pack: { shape: "frasco", color: "#475569", label: "ZINCO", sub: "15 mg · 60 cáps" },
  }),
  seed({
    key: "ferro",
    name: "Ferro",
    category: "Minerais",
    dose: 14,
    unit: "mg",
    range: "Conforme exame",
    timing: "Em jejum, com vitamina C",
    times: ["07:00"],
    withFood: false,
    benefit: "Necessário para formar hemoglobina e combater a anemia.",
    tips: ["Evite café, chá e leite na mesma hora.", "Vitamina C aumenta a absorção."],
    caution: "Só use com indicação: excesso de ferro faz mal.",
    pack: { shape: "frasco", color: "#991b1b", label: "FERRO", sub: "quelato · 60 cáps" },
  }),
  seed({
    key: "calcio",
    name: "Cálcio + vitamina D",
    category: "Minerais",
    dose: 500,
    unit: "mg",
    range: "500–1.000 mg por dia",
    timing: "Com refeições, em doses divididas",
    times: ["12:00"],
    withFood: true,
    benefit: "Apoia a saúde dos ossos, sobretudo após os 50 anos.",
    tips: ["Doses de até 500 mg por vez são melhor absorvidas.", "Não tome junto com ferro."],
    caution: "Histórico de cálculo renal pede orientação.",
    pack: { shape: "frasco", color: "#64748b", label: "CÁLCIO + D", sub: "60 comp" },
  }),
  seed({
    key: "drb-magnesio",
    name: "Doctor's Best Magnésio de Alta Absorção",
    brand: "Doctor's Best",
    category: "Minerais",
    dose: 2,
    unit: "cápsula",
    range: "2 cápsulas por dia (1 porção = 105 mg de magnésio)",
    timing: "Todos os dias; à noite é uma opção para quem busca relaxamento e sono",
    times: ["21:00"],
    withFood: true,
    benefit:
      "Magnésio quelado (lisinato glicinato, Albion®), apresentado pelo fabricante para relaxamento muscular, função dos nervos e apoio ao sono, com boa tolerância intestinal. O magnésio participa de centenas de reações enzimáticas do corpo.",
    tips: [
      "Rótulo: tomar 2 cápsulas ao dia, ou conforme a orientação de um profissional de saúde com conhecimento em nutrição.",
      "Forma quelada: o magnésio vem ligado aos aminoácidos glicina e lisina, que o fabricante indica para melhor absorção e menos desconforto no intestino.",
      "Orientação geral: se o estômago incomodar, tome junto de uma refeição ou divida as 2 cápsulas em dois horários.",
      "Para apoio ao sono, o fabricante posiciona o produto assim; tomar à noite é uma opção, não uma regra do rótulo.",
      "Se já usa outro suplemento com magnésio (como o Solgar Cálcio + Magnésio + Zinco, com 400 mg por porção), some as doses. O limite superior para magnésio de suplementos em adultos é de 350 mg por dia (NIH).",
      "Guarde em local fresco e seco.",
    ],
    caution:
      "Quem tem doença renal, está grávida ou amamentando, ou usa medicamentos (como alguns antibióticos, remédios para osteoporose e para a tireoide) deve consultar o profissional antes. Excesso de magnésio pode causar diarreia.",
    pack: { shape: "frasco", color: "#ea580c", label: "MAGNÉSIO", sub: "Doctor's Best · cápsulas vegetais" },
    photo: "/images/suplementos/doctors-best-magnesio-alta-absorcao.webp",
    label: {
      serving: "2 cápsulas vegetais",
      servings: "120 porções no frasco de 240 cápsulas (60 porções no de 120)",
      rows: [
        {
          name: "Magnésio",
          detail: "de 1.050 mg de quelato de lisinato glicinato de magnésio (Albion®)",
          amount: "105 mg",
          dv: "25%",
        },
      ],
      other: "Hipromelose (cápsula vegetal), estearato de cálcio, celulose microcristalina e dióxido de silício.",
      free: ["Glúten", "Soja", "Transgênicos"],
      seals: ["Quelato 100%", "Vegano", "Sem glúten", "Sem soja"],
      note: "%VD norte-americano. Dados conferidos em lojas que vendem o frasco de 120 cápsulas; confirme no rótulo do seu frasco de 240.",
    },
  }),
  seed({
    key: "solgar-cmz",
    name: "Solgar Cálcio + Magnésio + Zinco",
    brand: "Solgar",
    category: "Minerais",
    dose: 3,
    unit: "comprimido",
    range: "3 comprimidos por dia (1 porção), com uma refeição",
    timing: "Com uma refeição; pode dividir os 3 comprimidos ao longo do dia",
    times: ["12:00"],
    withFood: true,
    benefit:
      "Promove ossos saudáveis e apoia a função dos nervos e dos músculos; o fabricante também cita apoio ao sistema imunológico. O cálcio ajuda a manter ossos e dentes fortes; o magnésio regula o transporte do cálcio e participa da função muscular; o zinco atua na síntese de colágeno do tecido ósseo.",
    tips: [
      "Rótulo e site oficial: tomar 3 comprimidos ao dia, com uma refeição.",
      "Rótulo: a dose pode ser distribuída ao longo do dia. Uma forma prática é 1 comprimido em cada uma das 3 refeições principais.",
      "Siga a orientação do seu profissional de saúde se ela for diferente da indicada no frasco.",
      "Orientação geral: o cálcio costuma ser melhor aproveitado em doses menores e divididas. Dividir os 3 comprimidos ajuda nisso.",
      "Se usa outros medicamentos, pergunte ao médico ou farmacêutico qual horário escolher. A página oficial não lista interações.",
      "Guarde em temperatura ambiente, longe de crianças. Não use se o lacre estiver ausente ou danificado.",
    ],
    caution:
      "Gestantes, lactantes, quem usa medicamentos ou tem alguma condição de saúde devem consultar o profissional antes. Suspenda e procure atendimento se houver reação adversa. Cálcio, magnésio e zinco podem interferir na absorção de alguns medicamentos: pergunte sobre o horário. O magnésio desta porção (400 mg) já passa do limite de 350 mg/dia indicado para magnésio de suplementos; não some outro suplemento com magnésio sem orientação.",
    pack: { shape: "frasco", color: "#b45309", label: "CÁLCIO MAG ZINCO", sub: "Solgar · 100 comp" },
    photo: "/images/suplementos/solgar-calcio-magnesio-zinco.webp",
    label: {
      serving: "3 comprimidos",
      servings: "33 porções por frasco (100 comprimidos)",
      rows: [
        {
          name: "Cálcio",
          detail: "carbonato, citrato e gluconato de cálcio",
          amount: "1.000 mg",
          dv: "77%",
        },
        {
          name: "Magnésio",
          detail: "óxido, gluconato e citrato de magnésio",
          amount: "400 mg",
          dv: "95%",
        },
        { name: "Zinco", detail: "gluconato de zinco", amount: "15 mg", dv: "136%" },
        { name: "Sódio", detail: "naturalmente presente", amount: "15 mg", dv: "<1%" },
      ],
      other:
        "Celulose microcristalina, celulose vegetal, ácido cítrico, estearato de magnésio vegetal, ácido esteárico vegetal, glicerina vegetal e cera de carnaúba.",
      free: ["Glúten", "Trigo", "Laticínios", "Soja", "Levedura", "Açúcar", "Aromas, adoçantes e corantes artificiais"],
      seals: ["Não transgênico", "Adequado para veganos", "Kosher pareve"],
      note: "%VD conforme o rótulo norte-americano (base de adultos dos EUA). Informações do rótulo do fabricante; confira sempre a embalagem em mãos.",
    },
  }),
  seed({
    key: "probiotico",
    name: "Probiótico",
    category: "Bem-estar",
    dose: 1,
    unit: "cápsula",
    range: "1 por dia",
    timing: "Em jejum ou antes do café",
    times: ["07:00"],
    withFood: false,
    benefit: "Apoia o equilíbrio da flora intestinal.",
    tips: [
      "Guarde conforme o rótulo, alguns exigem geladeira.",
      "Use por algumas semanas para avaliar o efeito.",
    ],
    caution: "Imunossuprimidos devem ter orientação médica.",
    pack: { shape: "frasco", color: "#16a34a", label: "PROBIÓTICO", sub: "10 bilhões UFC" },
  }),
  seed({
    key: "curcuma",
    name: "Cúrcuma",
    category: "Bem-estar",
    dose: 500,
    unit: "mg",
    range: "500–1.000 mg por dia",
    timing: "Com uma refeição com gordura",
    times: ["12:00"],
    withFood: true,
    benefit: "Usada por suas propriedades anti-inflamatórias.",
    tips: ["Pimenta-preta (piperina) aumenta a absorção.", "Tome junto ao almoço."],
    caution: "Atenção se usa anticoagulantes ou tem cálculo biliar.",
    pack: { shape: "frasco", color: "#eab308", label: "CÚRCUMA", sub: "500 mg · 60 cáps" },
  }),
  seed({
    key: "spirulina",
    name: "Spirulina",
    category: "Bem-estar",
    dose: 3,
    unit: "g",
    range: "1–3 g por dia",
    timing: "Pela manhã",
    times: ["08:00"],
    withFood: true,
    benefit: "Alga rica em proteínas, ferro e antioxidantes.",
    tips: ["Comece com dose baixa.", "Prefira marcas com laudo de pureza."],
    caution: "Evite em doenças autoimunes sem orientação.",
    pack: { shape: "pote", color: "#15803d", label: "SPIRULINA", sub: "120 cáps" },
  }),
  seed({
    key: "bcaa",
    name: "BCAA",
    category: "Desempenho",
    dose: 5,
    unit: "g",
    range: "5–10 g por dia",
    timing: "Antes ou durante o treino",
    times: ["15:30"],
    withFood: false,
    benefit: "Aminoácidos de cadeia ramificada usados no treino.",
    tips: ["Se a proteína do dia já é alta, o benefício é pequeno.", "Misture em água gelada."],
    caution: "Prefira atingir a proteína total pela comida.",
    pack: { shape: "pote", color: "#0d9488", label: "BCAA", sub: "2:1:1 · 300 g" },
  }),
  seed({
    key: "glutamina",
    name: "Glutamina",
    category: "Desempenho",
    dose: 5,
    unit: "g",
    range: "5 g por dia",
    timing: "Após o treino ou antes de dormir",
    times: ["21:00"],
    withFood: false,
    benefit: "Aminoácido usado na recuperação e na saúde intestinal.",
    tips: ["Dissolve fácil em água.", "Pode ser tomada junto ao whey."],
    caution: "Doença hepática ou renal pede orientação.",
    pack: { shape: "pote", color: "#2563eb", label: "GLUTAMINA", sub: "300 g" },
  }),
  seed({
    key: "hipercalorico",
    name: "Hipercalórico",
    category: "Proteínas",
    dose: 100,
    unit: "g",
    range: "1 dose conforme rótulo",
    timing: "Entre as refeições",
    times: ["10:00"],
    withFood: false,
    benefit: "Ajuda quem precisa ganhar peso a completar as calorias do dia.",
    tips: ["Bata com leite e banana para mais energia.", "Não substitua as refeições principais."],
    caution: "Diabéticos devem ter orientação.",
    pack: { shape: "pote", color: "#c2410c", label: "MASS", sub: "hipercalórico · 3 kg" },
  }),
  seed({
    key: "eletrolitos",
    name: "Eletrólitos",
    category: "Desempenho",
    dose: 1,
    unit: "scoop",
    range: "1 dose em 500 ml de água",
    timing: "Em treinos longos ou dias muito quentes",
    times: ["15:00"],
    withFood: false,
    benefit: "Repõe sódio e potássio perdidos no suor.",
    tips: [
      "Útil no calor do Acre e em treinos acima de 1 hora.",
      "Não precisa no dia a dia comum.",
    ],
    caution: "Hipertensos devem observar o sódio.",
    pack: { shape: "sache", color: "#0ea5e9", label: "HIDRATA", sub: "eletrólitos" },
  }),
  seed({
    key: "melatonina",
    name: "Melatonina",
    icon: Moon,
    category: "Sono",
    dose: 0.21,
    unit: "mg",
    range: "Até 0,21 mg por dia (Anvisa)",
    timing: "30 minutos antes de dormir",
    times: ["21:30"],
    withFood: false,
    benefit: "Ajuda a regular o horário do sono.",
    tips: ["Diminua telas e luz forte à noite.", "Mantenha horários regulares."],
    caution: "Não use com sedativos sem orientação; evite na gestação.",
    pack: { shape: "gotas", color: "#4338ca", label: "MELATONINA", sub: "0,21 mg" },
  }),
  seed({
    key: "cafeina",
    name: "Cafeína",
    icon: Flame,
    gradient: "from-orange-500 to-red-500",
    category: "Desempenho",
    dose: 200,
    unit: "mg",
    range: "3 mg/kg, até 400 mg/dia",
    timing: "30–60 min antes do treino",
    times: ["15:30"],
    withFood: false,
    benefit: "Aumenta foco e disposição para o treino.",
    tips: ["Evite após as 16h para não atrapalhar o sono.", "Some o café do dia ao limite diário."],
    caution: "Hipertensos e gestantes devem evitar doses altas.",
    pack: { shape: "frasco", color: "#b91c1c", label: "CAFEÍNA", sub: "200 mg · 60 cáps" },
  }),
];
const libraryCategories = [
  "Todos",
  ...Array.from(new Set(supplementLibrary.map((item) => item.category))),
];
const libraryByKey = Object.fromEntries(supplementLibrary.map((item) => [item.key, item]));
const units: Unit[] = ["g", "mg", "mcg", "UI", "cápsula", "comprimido", "ml", "scoop"];

const localKey = (patientId: string, kind: "plans" | "intakes") =>
  `caredigital-supplements-${kind}-${patientId}`;
const readLocal = <T,>(key: string): T[] => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
};
const writeLocal = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* armazenamento indisponível */
  }
};
const slotTime = (day: string, slot: string) => Date.parse(`${day}T${slot}:00-05:00`);
const fmtDose = (plan: Pick<SupplementPlan, "dose" | "unit">) =>
  `${plan.dose.toLocaleString("pt-BR")} ${plan.unit}`;

/** Ordena as doses de hoje e devolve a próxima pendente. */
export function buildDoses(plans: SupplementPlan[], intakes: Intake[], day: string) {
  const taken = new Set(
    intakes.filter((item) => item.taken_on === day).map((item) => `${item.plan_id}|${item.slot}`),
  );
  return plans
    .filter((plan) => plan.active)
    .flatMap((plan) =>
      plan.times.map((slot) => ({
        plan,
        slot,
        at: slotTime(day, slot),
        taken: taken.has(`${plan.id}|${slot}`),
      })),
    )
    .sort((a, b) => a.at - b.at);
}

export function ClientSupplementCenter({ patientId, ownerId, tasks, onConfirm }: Props) {
  const dialog = useDialog();
  const [plans, setPlans] = useState<SupplementPlan[]>([]);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [remote, setRemote] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<Partial<SupplementPlan> | null>(null);
  const [selected, setSelected] = useState<string>("creatina");
  const [libCat, setLibCat] = useState("Todos");
  const [productOpen, setProductOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const day = acreDateKey();
  const db = supabase as any;

  useEffect(() => {
    let active = true;
    void Promise.all([
      db
        .from("care_supplement_plans")
        .select("id,name,kind,dose,unit,times,with_food,notes,active")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .order("created_at"),
      db
        .from("care_supplement_intakes")
        .select("id,plan_id,taken_on,slot,taken_at")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .eq("taken_on", day),
    ]).then(([p, i]: any[]) => {
      if (!active) return;
      if (p.error || i.error) {
        setRemote(false);
        setPlans(readLocal<SupplementPlan>(localKey(patientId, "plans")));
        setIntakes(readLocal<Intake>(localKey(patientId, "intakes")));
      } else {
        setRemote(true);
        setPlans((p.data ?? []).map((row: SupplementPlan) => ({ ...row, dose: Number(row.dose) })));
        setIntakes(i.data ?? []);
      }
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [patientId, ownerId, day, reload]);

  const doses = useMemo(() => buildDoses(plans, intakes, day), [plans, intakes, day]);
  const next = doses.find((dose) => !dose.taken && dose.at >= Date.now() - 60 * 60_000);
  const takenCount = doses.filter((dose) => dose.taken).length;
  const percent = doses.length ? Math.round((takenCount / doses.length) * 100) : 0;
  const scheduledTasks = tasks.filter((task) => task.category === "outro");

  async function savePlan() {
    if (!editing) return;
    const plan = {
      name: (editing.name ?? "").trim(),
      kind: editing.kind ?? "outro",
      dose: Number(editing.dose),
      unit: editing.unit ?? "g",
      times: (editing.times ?? []).filter(Boolean).sort(),
      with_food: Boolean(editing.with_food),
      notes: editing.notes?.trim() || null,
      active: editing.active ?? true,
    };
    if (
      plan.name.length >= 2 &&
      Number.isFinite(plan.dose) &&
      plan.dose > 0 &&
      plan.times.length &&
      !(await dialog.confirm(
        editing.id ? "Salvar alterações?" : "Confirmar programação?",
        `${plan.name} · ${plan.dose.toLocaleString("pt-BR")} ${plan.unit} às ${plan.times.join(", ")}.`,
        false,
        editing.id ? "Salvar alterações" : "Confirmar",
      ))
    )
      return;
    if (plan.name.length < 2) return setMessage("Informe o nome do suplemento.");
    if (!Number.isFinite(plan.dose) || plan.dose <= 0)
      return setMessage("Informe uma dose válida.");
    if (!plan.times.length) return setMessage("Escolha pelo menos um horário.");
    if (remote) {
      const query = editing.id
        ? db.from("care_supplement_plans").update(plan).eq("id", editing.id)
        : db
            .from("care_supplement_plans")
            .insert({ ...plan, patient_id: patientId, owner_id: ownerId });
      const result = await query;
      if (result.error) return setMessage("Não foi possível salvar o suplemento. Tente novamente.");
    } else {
      const list = editing.id
        ? plans.map((item) =>
            item.id === editing.id ? ({ ...item, ...plan } as SupplementPlan) : item,
          )
        : [...plans, { ...plan, id: crypto.randomUUID() } as SupplementPlan];
      writeLocal(localKey(patientId, "plans"), list);
    }
    setMessage(`${plan.name} salvo na sua programação.`);
    setEditing(null);
    setReload((value) => value + 1);
  }

  async function removePlan(plan: SupplementPlan) {
    if (
      !(await dialog.confirm(
        "Remover suplemento?",
        `${plan.name} sai da sua programação e os horários deixam de aparecer. Os registros já feitos continuam no histórico.`,
        true,
        "Remover",
      ))
    )
      return;
    if (remote) {
      const result = await db.from("care_supplement_plans").delete().eq("id", plan.id);
      if (result.error) return setMessage("Não foi possível remover.");
    } else
      writeLocal(
        localKey(patientId, "plans"),
        plans.filter((item) => item.id !== plan.id),
      );
    setReload((value) => value + 1);
  }

  async function toggleDose(plan: SupplementPlan, slot: string, taken: boolean) {
    const ok = await dialog.confirm(
      taken ? "Desfazer registro?" : "Confirmar dose?",
      taken
        ? `O registro de ${plan.name} das ${slot} será desfeito e a dose volta a ficar pendente.`
        : `Registrar ${plan.name} (${fmtDose(plan)}) das ${slot} como tomado agora?`,
      taken,
      taken ? "Desfazer" : "Confirmar dose",
    );
    if (!ok) return;
    if (remote) {
      const result = taken
        ? await db
            .from("care_supplement_intakes")
            .delete()
            .eq("plan_id", plan.id)
            .eq("taken_on", day)
            .eq("slot", slot)
        : await db.from("care_supplement_intakes").insert({
            plan_id: plan.id,
            patient_id: patientId,
            owner_id: ownerId,
            taken_on: day,
            slot,
          });
      if (result.error) return setMessage("Não foi possível registrar a dose.");
    } else {
      const all = readLocal<Intake>(localKey(patientId, "intakes")).filter(
        (item) => item.taken_on === day,
      );
      writeLocal(
        localKey(patientId, "intakes"),
        taken
          ? all.filter((item) => !(item.plan_id === plan.id && item.slot === slot))
          : [
              ...all,
              {
                id: crypto.randomUUID(),
                plan_id: plan.id,
                taken_on: day,
                slot,
                taken_at: new Date().toISOString(),
              },
            ],
      );
    }
    setMessage(
      taken
        ? "Registro desfeito."
        : `${plan.name} (${fmtDose(plan)}) registrado às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Rio_Branco" })}.`,
    );
    setReload((value) => value + 1);
  }

  const startFromLibrary = (item: LibraryItem) =>
    setEditing({
      name: item.name,
      kind: item.key,
      dose: item.dose,
      unit: item.unit,
      times: item.times,
      with_food: item.withFood,
      notes: item.timing,
    });
  const info = libraryByKey[selected] as LibraryItem;

  return (
    <div className="flex flex-col gap-2.5">
      {!remote && loaded && (
        <p
          role="status"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs"
        >
          Modo local: sua programação está salva neste navegador. Ela passa a ser sincronizada assim
          que a atualização do banco for aplicada.
        </p>
      )}

      <header
        className="nv-dark nv-scan relative isolate overflow-hidden border border-violet-400/30 p-2.5 text-white shadow-card sm:px-3"
        aria-label="Próxima dose"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 -z-10 size-72 rounded-full bg-amber-400/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 left-1/4 -z-10 size-56 rounded-full bg-fuchsia-400/15 blur-3xl"
        />
        <div className="grid items-center gap-3 lg:grid-cols-[auto_minmax(0,1fr)_26rem]">
          <div
            className="relative mx-auto size-[68px] shrink-0 lg:mx-0"
            role="img"
            aria-label={`${takenCount} de ${doses.length} doses tomadas hoje`}
          >
            <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#ffffff1f" strokeWidth="10" />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="url(#nv-sup-grad)"
                strokeWidth="10"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={`${Math.max(percent, 0.5)} 100`}
                className="nv-ring-draw"
                style={{ transition: "stroke-dasharray .8s ease" }}
              />
              <defs>
                <linearGradient id="nv-sup-grad" x1="0" x2="1">
                  <stop offset="0" stopColor="#c4b5fd" />
                  <stop offset="1" stopColor="#fbbf24" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-[13px] grid place-items-center rounded-full bg-white/[.07] text-center shadow-inner">
              <span className="leading-none">
                <strong className="block text-sm font-extrabold tabular-nums">{percent}%</strong>
                <span className="text-[8px] font-semibold text-white/70">doses</span>
              </span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-xl font-extrabold tabular-nums">
              {takenCount}{" "}
              <span className="text-sm font-semibold text-white/65">
                de {doses.length} doses hoje
              </span>
            </p>
            <p className="mt-0.5 text-xs text-white/80">
              {!doses.length
                ? "Escolha um suplemento na biblioteca para montar sua programação com horários e lembretes."
                : takenCount === doses.length
                  ? "Todas as doses de hoje registradas."
                  : next
                    ? `Próxima: ${next.plan.name} às ${next.slot}.`
                    : "Restam doses atrasadas para registrar."}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {next && (
                <button
                  type="button"
                  data-register-target="Registrar dose"
                  onClick={() => void toggleDose(next.plan, next.slot, false)}
                  className="inline-flex h-8 items-center gap-2 bg-white px-3 text-xs font-bold text-violet-900 shadow-sm transition hover:bg-white/90 active:scale-[.97]"
                >
                  <CheckCircle2 size={16} /> Registrar dose agora
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditing({ times: ["08:00"], unit: "g", dose: 1 })}
                className={`inline-flex h-8 items-center gap-1.5 px-3 text-xs font-bold transition active:scale-[.97] ${next ? "border border-white/25 bg-white/10 text-white backdrop-blur hover:bg-white/20" : "bg-white text-violet-900 shadow-sm hover:bg-white/90"}`}
              >
                <Plus size={16} /> Adicionar suplemento
              </button>
              <a
                href="#nv-sup-library"
                className="inline-flex h-8 items-center gap-1.5 border border-white/25 bg-white/10 px-3 text-xs font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                <BookOpen size={15} /> Biblioteca
              </a>
            </div>
          </div>
          <NextUpClock
            alertKey="suplemento"
            title="Próxima dose"
            color="#fbbf24"
            target={next ? next.at : null}
            from={(() => {
              const prev = doses.filter((d) => d.at < (next?.at ?? 0)).at(-1);
              return prev ? prev.at : null;
            })()}
            detail={
              next
                ? `${next.plan.name} · ${fmtDose(next.plan)}${next.plan.with_food ? " · com refeição" : ""}`
                : undefined
            }
            emptyText={
              doses.length ? "Todas as doses de hoje registradas" : "Sem doses programadas"
            }
            actionLabel="Tomei"
            onAction={next ? () => void toggleDose(next.plan, next.slot, false) : undefined}
          />
        </div>
      </header>

      {doses.length > 0 || scheduledTasks.length > 0 || message ? (
        <div className="grid gap-2.5">
          <section
            className="border border-border bg-card p-3 shadow-card"
            aria-label="Doses de hoje"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-base font-bold">
                <Clock size={18} className="text-violet-500" /> Programação de hoje
              </h3>
              <span className="text-xs tabular-nums text-muted-foreground">
                {takenCount}/{doses.length} tomadas
              </span>
            </div>
            <ul className="mt-3 grid gap-2 md:grid-cols-2">
              {!loaded ? (
                <li className="h-16 animate-pulse rounded-xl bg-muted" />
              ) : doses.length === 0 ? (
                <li className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground md:col-span-2">
                  Nenhum suplemento programado para hoje.
                </li>
              ) : (
                doses.map(({ plan, slot, taken, at }) => {
                  const item = libraryByKey[plan.kind] as LibraryItem | undefined;
                  const Icon = item?.icon ?? Sparkles;
                  const late = !taken && at < Date.now();
                  return (
                    <li
                      key={plan.id + slot}
                      className={`flex items-center gap-3 rounded-2xl border p-3 transition ${taken ? "border-emerald-500/30 bg-emerald-500/[.06]" : late ? "border-amber-500/40 bg-amber-500/[.06]" : "border-border bg-surface"}`}
                    >
                      {item ? (
                        <span
                          className="grid size-11 shrink-0 place-items-center rounded-xl"
                          style={{ background: `${item.pack.color}1f` }}
                        >
                          <PackArt item={item} className="h-10 w-auto" />
                        </span>
                      ) : (
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
                          <Icon size={20} />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm">{plan.name}</strong>
                        <span className="text-xs text-muted-foreground">
                          {slot} · {fmtDose(plan)}
                          {plan.with_food ? " · com refeição" : ""}
                          {late ? " · atrasada" : ""}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => void toggleDose(plan, slot, taken)}
                        aria-pressed={taken}
                        className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition ${taken ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300" : "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-sm hover:brightness-110"}`}
                      >
                        {taken ? (
                          <>
                            <Undo2 size={15} /> Tomado
                          </>
                        ) : (
                          <>
                            <Check size={16} /> Tomar
                          </>
                        )}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            {scheduledTasks.length > 0 && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Prescritos pelo profissional
                </p>
                {scheduledTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onConfirm(task)}
                    className="mt-2 flex w-full items-center justify-between rounded-xl bg-muted/60 px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span className="truncate font-semibold">{task.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(task.scheduled_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "America/Rio_Branco",
                      })}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {message && (
              <p
                role="status"
                className="mt-3 rounded-xl bg-violet-500/10 px-3 py-2 text-sm font-medium text-violet-700 dark:text-violet-300"
              >
                {message}
              </p>
            )}
          </section>
        </div>
      ) : null}

      {plans.length > 0 && (
        <section
          className="rounded-2xl border border-border bg-card p-4 shadow-card"
          aria-label="Meus suplementos"
        >
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <ShieldCheck size={20} className="text-emerald-500" /> Meus suplementos
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const item = libraryByKey[plan.kind] as LibraryItem | undefined;
              const Icon = item?.icon ?? Sparkles;
              return (
                <article key={plan.id} className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-start gap-3">
                    {item ? (
                      <span
                        className="grid size-14 shrink-0 place-items-center rounded-xl"
                        style={{ background: `${item.pack.color}1f` }}
                      >
                        <PackArt item={item} className="h-12 w-auto" />
                      </span>
                    ) : (
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                        <Icon size={20} />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate">{plan.name}</strong>
                      <span className="text-sm text-muted-foreground">
                        {fmtDose(plan)} · {plan.times.join(", ")}
                      </span>
                    </div>
                  </div>
                  {plan.notes && <p className="mt-2 text-sm text-muted-foreground">{plan.notes}</p>}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(plan)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted"
                    >
                      <Pencil size={14} /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void removePlan(plan)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 size={14} /> Remover
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section
        id="nv-sup-library"
        className="scroll-mt-4 border border-border bg-card p-3 shadow-card"
        aria-label="Biblioteca de suplementos"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <BookOpen size={16} className="text-amber-500" /> Biblioteca de suplementos
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {supplementLibrary.length} suplementos com dose de referência, melhor horário e
              cuidados.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por categoria">
            {libraryCategories.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={libCat === c}
                onClick={() => setLibCat(c)}
                className={`h-7 px-2.5 text-[11px] font-semibold transition ${libCat === c ? "bg-violet-500 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2.5 grid gap-3">
          <div className="grid auto-rows-max grid-cols-3 content-start gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {supplementLibrary
              .filter((item) => libCat === "Todos" || item.category === libCat)
              .map((item, i) => {
                const on = selected === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setSelected(item.key);
                      setProductOpen(true);
                    }}
                    aria-haspopup="dialog"
                    aria-pressed={on}
                    className={`nv-rise group relative flex min-h-[7.5rem] shrink-0 flex-col items-center justify-start overflow-hidden border px-2 pb-2 pt-2.5 text-center transition duration-300 ${on ? "border-transparent shadow-lg" : "border-border hover:-translate-y-0.5 hover:shadow-md"}`}
                    style={{
                      animationDelay: `${Math.min(i, 12) * 35}ms`,
                      boxShadow: on
                        ? `0 0 0 2px ${item.pack.color}, 0 14px 30px -14px ${item.pack.color}`
                        : undefined,
                      background: `radial-gradient(circle at 50% 28%, ${item.pack.color}22, transparent 65%)`,
                    }}
                  >
                    <PackArt
                      item={item}
                      className="h-[4.25rem] w-auto shrink-0 drop-shadow-[0_6px_8px_rgba(0,0,0,.35)] transition-transform duration-500 group-hover:scale-105"
                    />
                    <strong className="mt-1.5 line-clamp-2 min-h-[2rem] w-full text-[11px] font-semibold leading-4">
                      {item.name}
                    </strong>
                    <span className="mt-0.5 text-[10px] leading-3 text-muted-foreground">
                      {item.category}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      </section>

      {productOpen && (
        <ProductPage
          item={info}
          onClose={() => setProductOpen(false)}
          onAdd={() => {
            setProductOpen(false);
            startFromLibrary(info);
          }}
        />
      )}

      {editing && (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Programar suplemento"
        >
          <div className="w-full max-w-md rounded-3xl bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editing.id ? "Editar suplemento" : "Programar suplemento"}
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Fechar"
                className="grid size-9 place-items-center rounded-lg hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              <label className="font-semibold">
                Nome
                <input
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="mt-1 block h-11 w-full rounded-xl border border-border bg-surface px-3"
                  placeholder="Ex.: Creatina"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="font-semibold">
                  Dose
                  <input
                    inputMode="decimal"
                    value={editing.dose ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, dose: Number(e.target.value.replace(",", ".")) })
                    }
                    className="mt-1 block h-11 w-full rounded-xl border border-border bg-surface px-3"
                  />
                </label>
                <label className="font-semibold">
                  Unidade
                  <NiceSelect
                    className="mt-1 h-11"
                    ariaLabel="Unidade"
                    value={editing.unit ?? "g"}
                    onChange={(v) => setEditing({ ...editing, unit: v as Unit })}
                    options={units.map((u) => ({ value: u, label: u }))}
                  />
                </label>
              </div>
              <div>
                <span className="font-semibold">Horários</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {(editing.times ?? []).map((time, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface pl-2"
                    >
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => {
                          const times = [...(editing.times ?? [])];
                          times[index] = e.target.value;
                          setEditing({ ...editing, times });
                        }}
                        className="h-10 bg-transparent"
                      />
                      <button
                        type="button"
                        aria-label="Remover horário"
                        onClick={() =>
                          setEditing({
                            ...editing,
                            times: (editing.times ?? []).filter((_, i) => i !== index),
                          })
                        }
                        className="grid size-9 place-items-center text-muted-foreground hover:text-destructive"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                  {(editing.times ?? []).length < 6 && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({ ...editing, times: [...(editing.times ?? []), "12:00"] })
                      }
                      className="inline-flex h-10 items-center gap-1 rounded-xl border border-dashed border-border px-3 font-semibold hover:bg-muted"
                    >
                      <Plus size={14} /> Horário
                    </button>
                  )}
                </div>
              </div>
              <label className="flex items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={Boolean(editing.with_food)}
                  onChange={(e) => setEditing({ ...editing, with_food: e.target.checked })}
                  className="size-4"
                />{" "}
                Tomar junto a uma refeição
              </label>
              <label className="font-semibold">
                Observações
                <textarea
                  value={editing.notes ?? ""}
                  maxLength={300}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  rows={2}
                  className="mt-1 block w-full rounded-xl border border-border bg-surface p-3"
                />
              </label>
              <button
                type="button"
                onClick={() => void savePlan()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-base font-bold text-white shadow-sm hover:brightness-110"
              >
                <Check size={18} /> Salvar programação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
