/** Busca todas as linhas de uma consulta do Supabase em páginas de 1.000 (limite do servidor). */
export async function fetchAll<T = Record<string, unknown>>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  maxPages = 12,
): Promise<{ data: T[]; error: unknown }> {
  const out: T[] = [];
  for (let i = 0; i < maxPages; i++) {
    const r = await page(i * 1000, i * 1000 + 999);
    if (r.error) return { data: out, error: r.error };
    const rows = r.data ?? [];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return { data: out, error: null };
}
