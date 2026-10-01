export type Tone = "primary" | "warning" | "success" | "destructive";

export type Dose = {
  id: string;
  name: string;
  route: string;
  time: string; // HH:MM
  patient: string;
  kind: "Medicamento" | "Natural" | "Suplemento";
  done?: string;
};

export const doses: Dose[] = [
  { id: "d1", name: "Omeprazol 20mg", route: "Via oral", time: "07:00", patient: "Helena Souza", kind: "Medicamento", done: "07:02" },
  { id: "d2", name: "Metformina 850mg", route: "Via oral", time: "09:00", patient: "Rafael Costa", kind: "Medicamento" },
  { id: "d3", name: "Óleo de CBD 5ml", route: "Sublingual", time: "10:00", patient: "Lúcia Mendes", kind: "Natural" },
  { id: "d4", name: "AAS 100mg", route: "Via oral", time: "12:00", patient: "Helena Souza", kind: "Medicamento" },
  { id: "d5", name: "Chá de camomila", route: "Via oral", time: "15:00", patient: "Paulo Alves", kind: "Natural" },
  { id: "d6", name: "Vitamina D3 1000UI", route: "Via oral", time: "18:00", patient: "Rafael Costa", kind: "Suplemento" },
  { id: "d7", name: "Losartana 50mg", route: "Via oral", time: "21:00", patient: "Helena Souza", kind: "Medicamento" },
];

export type Patient = {
  id: string;
  name: string;
  age: number;
  condition: string;
  protocol: string;
  diet: string;
  caregiver: string;
  status: "Estável" | "Atenção" | "Crítico";
};

export const patients: Patient[] = [
  { id: "p1", name: "Helena Souza", age: 68, condition: "Hipertensão", protocol: "Hipertensão arterial", diet: "Hipossódica", caregiver: "Ana Beltrão", status: "Atenção" },
  { id: "p2", name: "Rafael Costa", age: 54, condition: "Diabetes T2", protocol: "Controle glicêmico", diet: "Low-carb", caregiver: "João Torres", status: "Estável" },
  { id: "p3", name: "Lúcia Mendes", age: 71, condition: "Pós-operatório", protocol: "Recuperação cirúrgica", diet: "Pastosa", caregiver: "Ana Beltrão", status: "Crítico" },
  { id: "p4", name: "Paulo Alves", age: 42, condition: "Asma", protocol: "Controle respiratório", diet: "Livre", caregiver: "Carla Nunes", status: "Estável" },
];

export type Medication = {
  id: string;
  name: string;
  dose: string;
  route: string;
  kind: "Medicamento" | "Natural" | "Suplemento";
  times: string[];
  stock: number;
  notes: string;
};

export const medications: Medication[] = [
  { id: "m1", name: "Metformina", dose: "850mg", route: "Via oral", kind: "Medicamento", times: ["09:00", "21:00"], stock: 42, notes: "Tomar com alimentos" },
  { id: "m2", name: "Losartana", dose: "50mg", route: "Via oral", kind: "Medicamento", times: ["21:00"], stock: 18, notes: "Com água" },
  { id: "m3", name: "Omeprazol", dose: "20mg", route: "Via oral", kind: "Medicamento", times: ["07:00"], stock: 6, notes: "Em jejum" },
  { id: "m4", name: "Óleo de CBD", dose: "5ml", route: "Sublingual", kind: "Natural", times: ["10:00", "22:00"], stock: 2, notes: "Manter sob a língua 60s" },
  { id: "m5", name: "Chá de camomila", dose: "200ml", route: "Via oral", kind: "Natural", times: ["15:00"], stock: 30, notes: "Morno, sem açúcar" },
  { id: "m6", name: "Vitamina D3", dose: "1000UI", route: "Via oral", kind: "Suplemento", times: ["18:00"], stock: 60, notes: "Após refeição" },
  { id: "m7", name: "Whey protein", dose: "30g", route: "Via oral", kind: "Suplemento", times: ["16:00"], stock: 14, notes: "Diluir em 200ml" },
];

export type Protocol = {
  id: string;
  type: "Doença" | "Tratamento" | "Dieta" | "Suplementação";
  name: string;
  summary: string;
  steps: string[];
  meds: number;
  patients: number;
};

export const protocols: Protocol[] = [
  { id: "pr1", type: "Doença", name: "Hipertensão arterial", summary: "Controle pressórico com medicação e restrição de sódio.", steps: ["Aferir pressão 2x ao dia", "Losartana 50mg às 21:00", "Dieta hipossódica (< 2g sódio)", "Caminhada leve 30 min"], meds: 3, patients: 1 },
  { id: "pr2", type: "Tratamento", name: "Controle glicêmico", summary: "Diabetes tipo 2 com monitoramento de glicemia capilar.", steps: ["Glicemia em jejum", "Metformina 850mg 09:00 e 21:00", "Dieta low-carb", "Registrar sintomas de hipoglicemia"], meds: 4, patients: 1 },
  { id: "pr3", type: "Dieta", name: "Hipossódica", summary: "Regime de 5 refeições com baixo teor de sódio.", steps: ["Café 07:30", "Lanche 10:00", "Almoço 12:30", "Lanche 16:00", "Jantar 19:30"], meds: 0, patients: 1 },
  { id: "pr4", type: "Suplementação", name: "Vitamina D3", summary: "Reposição diária por 90 dias.", steps: ["1000UI após refeição", "Reavaliar exame em 90 dias"], meds: 1, patients: 2 },
];

export type Meal = { time: string; name: string; items: string; kcal: number };
export type Diet = { id: string; name: string; goal: string; kcal: number; water: string; meals: Meal[] };

export const diets: Diet[] = [
  {
    id: "di1", name: "Hipossódica", goal: "Controle de pressão", kcal: 1800, water: "2,0 L",
    meals: [
      { time: "07:30", name: "Café da manhã", items: "Pão integral, queijo branco, mamão", kcal: 380 },
      { time: "10:00", name: "Lanche", items: "Iogurte natural com aveia", kcal: 180 },
      { time: "12:30", name: "Almoço", items: "Arroz, feijão, frango grelhado, salada", kcal: 620 },
      { time: "16:00", name: "Lanche", items: "Fruta + castanhas", kcal: 200 },
      { time: "19:30", name: "Jantar", items: "Sopa de legumes com carne magra", kcal: 420 },
    ],
  },
  {
    id: "di2", name: "Low-carb", goal: "Controle glicêmico", kcal: 1600, water: "2,5 L",
    meals: [
      { time: "07:00", name: "Café da manhã", items: "Ovos mexidos, abacate", kcal: 350 },
      { time: "12:00", name: "Almoço", items: "Peixe, legumes no vapor", kcal: 550 },
      { time: "16:00", name: "Lanche", items: "Whey protein + morangos", kcal: 220 },
      { time: "19:00", name: "Jantar", items: "Omelete de espinafre", kcal: 380 },
    ],
  },
  {
    id: "di3", name: "Emagrecimento", goal: "Regime − 0,5 kg/semana", kcal: 1400, water: "3,0 L",
    meals: [
      { time: "07:30", name: "Café da manhã", items: "Tapioca com frango", kcal: 300 },
      { time: "12:30", name: "Almoço", items: "Salada completa, grão-de-bico", kcal: 480 },
      { time: "16:00", name: "Lanche", items: "Maçã + chá verde", kcal: 120 },
      { time: "19:30", name: "Jantar", items: "Caldo de abóbora", kcal: 320 },
    ],
  },
];

export type Role = "Administrador" | "Enfermeiro(a)" | "Cuidador(a)" | "Médico(a)" | "Nutricionista" | "Familiar";
export type Member = { id: string; name: string; email: string; role: Role; patients: number; active: boolean };

export const team: Member[] = [
  { id: "u1", name: "Mariana Costa", email: "mariana@vigia.app", role: "Administrador", patients: 4, active: true },
  { id: "u2", name: "João Torres", email: "joao@vigia.app", role: "Enfermeiro(a)", patients: 2, active: true },
  { id: "u3", name: "Ana Beltrão", email: "ana@vigia.app", role: "Cuidador(a)", patients: 2, active: true },
  { id: "u4", name: "Carla Nunes", email: "carla@vigia.app", role: "Cuidador(a)", patients: 1, active: true },
  { id: "u5", name: "Dr. Henrique Lima", email: "henrique@vigia.app", role: "Médico(a)", patients: 4, active: false },
  { id: "u6", name: "Paula Reis", email: "paula@vigia.app", role: "Nutricionista", patients: 3, active: true },
];

export const initials = (n: string) =>
  n.replace(/^(Dr\.|Dra\.)\s*/, "").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
