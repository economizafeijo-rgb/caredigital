const TZ = "America/Rio_Branco";

export function calculateAge(birthDate: string, now = new Date()): number {
  const [year, month, day] = birthDate.split("-").map(Number);
  let age = now.getFullYear() - year;
  const beforeBirthday =
    now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day);
  if (beforeBirthday) age -= 1;
  return Math.max(0, age);
}

export function zodiacSign(birthDate: string): string {
  const [, month, day] = birthDate.split("-").map(Number);
  const signs = [
    ["CAPRICÓRNIO", 1, 20],
    ["AQUÁRIO", 2, 19],
    ["PEIXES", 3, 21],
    ["ÁRIES", 4, 20],
    ["TOURO", 5, 21],
    ["GÊMEOS", 6, 21],
    ["CÂNCER", 7, 23],
    ["LEÃO", 8, 23],
    ["VIRGEM", 9, 23],
    ["LIBRA", 10, 23],
    ["ESCORPIÃO", 11, 22],
    ["SAGITÁRIO", 12, 22],
  ] as const;
  const index = day < signs[month - 1][2] ? month - 2 : month - 1;
  return signs[(index + 12) % 12][0];
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
  return {
    age: calculateAge(birthDate, now),
    weekday: weekday.toUpperCase(),
    date,
    nextBirthday: nextBirthday.toUpperCase(),
    zodiac: zodiacSign(birthDate),
  };
}
