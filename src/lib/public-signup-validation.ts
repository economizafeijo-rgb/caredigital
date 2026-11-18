export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function isValidCpf(value: string): boolean {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let index = 0; index < 9; index += 1) sum += Number(cpf[index]) * (10 - index);
  let digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  if (digit !== Number(cpf[9])) return false;
  sum = 0;
  for (let index = 0; index < 10; index += 1) sum += Number(cpf[index]) * (11 - index);
  digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  return digit === Number(cpf[10]);
}

export function normalizeBrazilPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  const national = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  return national.slice(0, 11);
}

export function isValidBrazilPhone(value: string): boolean {
  const phone = normalizeBrazilPhone(value);
  if (!/^\d{10,11}$/.test(phone) || /^(\d)\1+$/.test(phone)) return false;
  const ddd = Number(phone.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  const subscriber = phone.slice(2);
  return subscriber.length === 9 ? subscriber[0] === "9" : /^[2-5]/.test(subscriber[0]);
}

export function isValidBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getTime() <= todayUtc &&
    year >= 1900
  );
}

export function formatCpf(value: string): string {
  const cpf = normalizeCpf(value);
  return cpf.replace(
    /^(\d{3})(\d{3})(\d{3})(\d{0,2}).*/,
    (_, a, b, c, d) => [a, b, c].filter(Boolean).join(".") + (d ? `-${d}` : ""),
  );
}

export function formatBrazilPhone(value: string): string {
  const phone = normalizeBrazilPhone(value);
  if (phone.length <= 2) return phone;
  const ddd = phone.slice(0, 2);
  const subscriber = phone.slice(2);
  if (subscriber.length > 8) return `(${ddd}) ${subscriber.slice(0, 5)}-${subscriber.slice(5)}`;
  return `(${ddd}) ${subscriber.slice(0, 4)}-${subscriber.slice(4)}`;
}

/** E-mail com usuário, domínio e extensão (ex.: nome@dominio.com.br). */
export function isValidEmail(value: string): boolean {
  const v = value.trim();
  return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v) && !/\.\./.test(v);
}

export function isValidCnpj(value: string): boolean {
  const c = value.replace(/\D/g, "");
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const s = w.reduce((a, wt, i) => a + Number(c[i]) * wt, 0) % 11;
    return s < 2 ? 0 : 11 - s;
  };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}

/** Converte texto numérico em número aceitando vírgula ou ponto ("84,40" → 84.4). */
export function parseDecimal(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const t = value.trim().replace(/\s/g, "");
  if (!t) return null;
  const normalized = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Idade em anos completos para uma data AAAA-MM-DD. */
export function ageFromBirthDate(value: string): number | null {
  if (!isValidBirthDate(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age;
}
