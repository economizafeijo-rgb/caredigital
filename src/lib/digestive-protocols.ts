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

/** Reads the published, read-only clinical library from Supabase PostgREST. */
export async function loadDigestiveProtocols(): Promise<DigestiveProtocol[]> {
  const url = import.meta.env["VITE_SUPABASE_URL"];
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

  if (!url || !key) {
    throw new Error("A conexão com Supabase não está configurada neste ambiente.");
  }

  const endpoint = new URL("/rest/v1/digestive_protocols", url);
  endpoint.searchParams.set("select", "id,category,name,summary,guidance,caution,sources,updated_at");
  endpoint.searchParams.set("order", "category.asc,name.asc");

  const response = await fetch(endpoint, {
    headers: { apikey: key, Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Não foi possível carregar os protocolos salvos no Supabase.");
  }

  return response.json() as Promise<DigestiveProtocol[]>;
}
