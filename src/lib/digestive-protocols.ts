export type DigestiveProtocol = {
  id: string;
  category: "Estômago" | "Intestino" | "Intolerância";
  name: string;
  summary: string;
  guidance: string[];
  caution: string;
  sources: { label: string; url: string }[];
  updated_at: string;
};

export type DietPlan = {
  id: string;
  name: string;
  goal: string;
  kcal: number;
  water: string;
  meals: { time: string; name: string; items: string; kcal: number }[];
  updated_at: string;
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
  return readTable("digestive_protocols", "id,category,name,summary,guidance,caution,sources,updated_at", "category.asc,name.asc");
}

export async function loadDietPlans(): Promise<DietPlan[]> {
  return readTable("diet_plans", "id,name,goal,kcal,water,meals,updated_at", "name.asc");
}
