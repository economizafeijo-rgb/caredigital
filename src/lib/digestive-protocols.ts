export type DigestiveProtocol = {
  id: string;
  category: "Estômago" | "Intestino" | "Intolerância";
  name: string;
  summary: string;
  guidance: string[];
  caution: string;
  sources: { label: string; url: string }[];
  updated_at: string;
  is_active: boolean;
};

export type DietPlan = {
  id: string;
  name: string;
  goal: string;
  condition_key: string;
  variant: number;
  variant_label: string;
  category: string;
  summary: string;
  caution: string;
  sources: { label: string; url: string }[];
  beverages: { type: "Priorize" | "Observe" | "Atenção" | "Evite"; name: string; note: string }[];
  meals: { time: string; name: string; items: string }[];
  updated_at: string;
  is_active: boolean;
};

export type DigestiveDietGuide = {
  id: string;
  category: string;
  name: string;
  summary: string;
  guidance: string[];
  caution: string;
  sources: { label: string; url: string }[];
  updated_at: string;
  is_active: boolean;
};

export type SportsSupplement = {
  id: string; name: string; category: string; purpose: string; evidence: string;
  use_case: string; common_dose: string; timing: string; cautions: string;
  sources: { label: string; url: string }[];
};

export type SportsGoalPlan = {
  id: string; goal_key: string; name: string; summary: string;
  priorities: string[]; foods: string[];
  meals: { time: string; name: string; items: string }[];
  note: string; sources: { label: string; url: string }[];
};

async function readTable<T>(table: string, select: string, order: string): Promise<T[]> {
  const url = import.meta.env["VITE_SUPABASE_URL"];
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

  if (!url || !key) {
    throw new Error("A conexão com Supabase não está configurada neste ambiente.");
  }

  const endpoint = new URL(`/rest/v1/${table}`, url);
  endpoint.searchParams.set("select", select);
  endpoint.searchParams.set("order", order);
  endpoint.searchParams.set("is_active", "eq.true");

  const response = await fetch(endpoint, {
    headers: { apikey: key, Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Não foi possível carregar ${table} do Supabase.`);
  }

  return response.json() as Promise<T[]>;
}

/** Reads the published, read-only clinical library from Supabase PostgREST. */
export async function loadDigestiveProtocols(): Promise<DigestiveProtocol[]> {
  return readTable("digestive_protocols", "id,category,name,summary,guidance,caution,sources,updated_at,is_active", "category.asc,name.asc");
}

export async function loadDietPlans(): Promise<DietPlan[]> {
  return readTable("diet_plans", "id,name,goal,category,condition_key,variant,variant_label,summary,caution,sources,beverages,meals,updated_at,is_active", "category.asc,name.asc,variant.asc");
}

export async function loadDigestiveDietGuides(): Promise<DigestiveDietGuide[]> {
  return readTable("digestive_diet_guides", "id,category,name,summary,guidance,caution,sources,updated_at,is_active", "category.asc,name.asc");
}

export async function loadSportsSupplements(): Promise<SportsSupplement[]> {
  return readTable("sports_supplements", "id,name,category,purpose,evidence,use_case,common_dose,timing,cautions,sources", "name.asc");
}

export async function loadSportsGoalPlans(): Promise<SportsGoalPlan[]> {
  return readTable("sports_goal_plans", "id,goal_key,name,summary,priorities,foods,meals,note,sources", "goal_key.asc");
}
