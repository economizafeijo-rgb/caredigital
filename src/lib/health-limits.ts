/**
 * Limites personalizados de cafeína e lactose a partir do perfil (idade, peso, sexo e condições).
 * Fontes: EFSA (2015), FDA, Health Canada, AACAP/Mayo Clinic, ACOG, NIDDK e revisão sistemática
 * sobre lactose (Annals of Internal Medicine, 2010). Educativo, não substitui orientação médica.
 */
export type LimitProfile = {
  birth_date: string | null;
  sex: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  health_conditions: string[] | null;
};
export type Limits = {
  /** Perfil com idade, sexo e peso preenchidos. */
  complete: boolean;
  age: number | null;
  caffeineDayMg: number;
  caffeineDoseMg: number;
  /** Horas antes de dormir sem cafeína. */
  caffeineCutoffH: number;
  caffeineReasons: string[];
  lactoseIntolerant: boolean;
  lactoseDayG: number | null;
  lactoseMealG: number | null;
  lactoseReasons: string[];
};
export const LACTOSE_CONDITION = "Intolerância à lactose";

export const ageFromBirth = (iso: string | null): number | null => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const b = new Date(iso.slice(0, 10) + "T12:00:00Z");
  const n = new Date();
  let a = n.getUTCFullYear() - b.getUTCFullYear();
  if (
    n.getUTCMonth() < b.getUTCMonth() ||
    (n.getUTCMonth() === b.getUTCMonth() && n.getUTCDate() < b.getUTCDate())
  )
    a--;
  return a >= 0 && a < 120 ? a : null;
};

export function computeLimits(p: LimitProfile | null): Limits {
  const age = ageFromBirth(p?.birth_date ?? null);
  const kg = p?.weight_kg && p.weight_kg > 0 ? Number(p.weight_kg) : null;
  const has = new Set(p?.health_conditions ?? []);
  const complete = !!(p && age !== null && p.sex && kg);
  const why: string[] = [];
  let day = 400;
  const cap = (mg: number, reason: string) => {
    if (mg < day) day = mg;
    why.push(reason);
  };
  if (!complete)
    why.push(
      "Limite provisório de adulto saudável (400 mg). Complete seu perfil para personalizar.",
    );
  else if (age! >= 18) why.push("Adulto saudável: até 400 mg por dia (EFSA, FDA).");
  if (age !== null && age < 12)
    cap(
      Math.max(0, Math.min(85, Math.round(2.5 * (kg ?? 30)))),
      "Crianças: cerca de 2,5 mg por kg, no máximo 85 mg (Health Canada). O ideal é evitar.",
    );
  else if (age !== null && age < 18)
    cap(
      Math.min(100, Math.round(2.5 * (kg ?? 40))),
      "Adolescentes: até 100 mg por dia, ou 2,5 mg por kg (AACAP, Health Canada).",
    );
  if (has.has("Gestante ou amamentando"))
    cap(200, "Gestação ou amamentação: até 200 mg por dia (EFSA, ACOG).");
  if (has.has("Hipertensão"))
    cap(300, "Hipertensão: a cafeína pode elevar a pressão; limite prudente de 300 mg.");
  if (has.has("Gastrite"))
    cap(300, "Gastrite: café e outras fontes irritam o estômago; limite prudente de 300 mg.");
  if (has.has("Doença renal")) why.push("Doença renal: confirme seu limite com o médico.");
  if (has.has("Diabetes"))
    why.push("Diabetes: a cafeína pode alterar a glicemia; observe suas medições.");
  if (has.has("Tireoide"))
    why.push("Tireoide: cafeína pode agravar palpitações; observe sintomas.");
  if (age !== null && age >= 65)
    why.push("Acima de 65 anos a eliminação é mais lenta: prefira doses menores à tarde.");
  const dose = Math.max(0, Math.min(200, Math.round(day / 2)));
  const intolerant = has.has(LACTOSE_CONDITION);
  return {
    complete,
    age,
    caffeineDayMg: day,
    caffeineDoseMg: dose,
    caffeineCutoffH: has.has("Gestante ou amamentando") || day <= 200 ? 8 : 6,
    caffeineReasons: why,
    lactoseIntolerant: intolerant,
    lactoseDayG: intolerant ? 18 : null,
    lactoseMealG: intolerant ? 12 : null,
    lactoseReasons: intolerant
      ? [
          "Intolerância informada: até 12 g por refeição (cerca de 1 copo de leite) e 18 g por dia, em doses fracionadas.",
          "Com registros de sintomas, o limite por refeição pode baixar para o que o seu corpo tolera.",
        ]
      : [
          "Sem intolerância informada: acompanhamento opcional. Marque “Intolerância à lactose” em Meu perfil para ativar os limites.",
        ],
  };
}
