const TZ = "America/Rio_Branco";

export function calculateAge(birthDate: string, now = new Date()): number {
  const [year, month, day] = birthDate.split("-").map(Number);
  let age = now.getFullYear() - year;
  const beforeBirthday =
    now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day);
  if (beforeBirthday) age -= 1;
  return Math.max(0, age);
}

const SIGNS = ["ÁRIES", "TOURO", "GÊMEOS", "CÂNCER", "LEÃO", "VIRGEM", "LIBRA", "ESCORPIÃO", "SAGITÁRIO", "CAPRICÓRNIO", "AQUÁRIO", "PEIXES"] as const;

/**
 * Longitude eclíptica aparente do Sol (graus), algoritmo de baixa precisão de Jean Meeus
 * (Astronomical Algorithms, cap. 25; erro ~0,01°, menos de 15 minutos na data de virada).
 */
export function solarLongitude(utcMs: number): number {
  const rad = Math.PI / 180;
  const jd = utcMs / 86_400_000 + 2440587.5;
  const t = (jd - 2451545) / 36525;
  const l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
  const m = (357.52911 + 35999.05029 * t - 0.0001537 * t * t) * rad;
  const c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(m) + (0.019993 - 0.000101 * t) * Math.sin(2 * m) + 0.000289 * Math.sin(3 * m);
  const omega = (125.04 - 1934.136 * t) * rad;
  const lambda = l0 + c - 0.00569 - 0.00478 * Math.sin(omega);
  return ((lambda % 360) + 360) % 360;
}

const signAt = (utcMs: number) => SIGNS[Math.floor(solarLongitude(utcMs) / 30) % 12];

/**
 * Signo solar (zodíaco tropical) pela posição real do Sol no nascimento, no horário do Acre (UTC−5).
 * Sem hora de nascimento usa o meio-dia; se o Sol mudou de signo naquele dia, indica a cúspide.
 */
export function zodiacDetails(birthDate: string, birthTime?: string | null) {
  const [y, mo, d] = birthDate.split("-").map(Number);
  const local = (h: number, mi: number) => Date.UTC(y, mo - 1, d, h + 5, mi); // UTC−5 → UTC
  const [h, mi] = birthTime && /^\d{1,2}:\d{2}$/.test(birthTime) ? birthTime.split(":").map(Number) : [12, 0];
  const sign = signAt(local(h, mi));
  const start = signAt(local(0, 0)), end = signAt(local(23, 59));
  const cusp = start !== end && !birthTime;
  return { sign, cusp, other: cusp ? (sign === start ? end : start) : null };
}

export function zodiacSign(birthDate: string, birthTime?: string | null): string {
  return zodiacDetails(birthDate, birthTime).sign;
}

export function patientDateSummary(birthDate: string, now = new Date()) {
  const [year, month, day] = birthDate.split("-").map(Number);
  const birthday = new Date(now.getFullYear(), month - 1, day);
  if (birthday.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime())
    birthday.setFullYear(now.getFullYear() + 1);
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: TZ }).format(
    new Date(year, month - 1, day),
  );
  const date = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date(year, month - 1, day));
  const nextBirthday = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    timeZone: TZ,
  }).format(birthday);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysToBirthday = Math.round((birthday.getTime() - today.getTime()) / 86_400_000);
  const z = zodiacDetails(birthDate);
  return {
    daysToBirthday,
    sign: z.sign,
    signCusp: z.cusp ? z.other : null,
    age: calculateAge(birthDate, now),
    weekday: weekday.toUpperCase(),
    date,
    nextBirthday: nextBirthday.toUpperCase(),
    zodiac: (() => { const z = zodiacDetails(birthDate); return z.cusp ? `${z.sign} (CÚSPIDE COM ${z.other})` : z.sign; })(),
  };
}
