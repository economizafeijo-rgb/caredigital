/** Cidades do Acre (22 municípios) para o endereço de entrega. */
export const ACRE_CITIES = [
  "Acrelândia",
  "Assis Brasil",
  "Brasiléia",
  "Bujari",
  "Capixaba",
  "Cruzeiro do Sul",
  "Epitaciolândia",
  "Feijó",
  "Jordão",
  "Mâncio Lima",
  "Manoel Urbano",
  "Marechal Thaumaturgo",
  "Plácido de Castro",
  "Porto Acre",
  "Porto Walter",
  "Rio Branco",
  "Rodrigues Alves",
  "Santa Rosa do Purus",
  "Sena Madureira",
  "Senador Guiomard",
  "Tarauacá",
  "Xapuri",
] as const;

export function formatCpf(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function isValidCpf(value: string): boolean {
  const d = value.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (const k of [9, 10]) {
    let s = 0;
    for (let i = 0; i < k; i++) s += Number(d[i]) * (k + 1 - i);
    const r = ((s * 10) % 11) % 10;
    if (r !== Number(d[k])) return false;
  }
  return true;
}
