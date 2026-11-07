export const ACRE_TIME_ZONE = "America/Rio_Branco";
export const ACRE_UTC_OFFSET = "-05:00";

type DateInput = Date | number | string;

const asDate = (value: DateInput) => {
  if (value instanceof Date) return value;
  if (typeof value === "string" && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) {
    return new Date(`${value}T12:00:00${ACRE_UTC_OFFSET}`);
  }
  return new Date(value);
};

export function acreDateKey(value: DateInput = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ACRE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(asDate(value));
}

export function acreTimeLabel(value: DateInput): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: ACRE_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(asDate(value));
}

export function acreDateTimeInput(value: DateInput = Date.now()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ACRE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(asDate(value));
  const part = (name: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === name)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

/** Creates an absolute instant from a wall-clock date/time in Acre, never the device timezone. */
export function acreDateAtTime(dateKey: string, time: string): Date {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateKey) || !/^[0-9]{2}:[0-9]{2}$/.test(time)) {
    throw new RangeError("Invalid Acre date or time");
  }
  const value = new Date(`${dateKey}T${time}:00${ACRE_UTC_OFFSET}`);
  // Only reject truly invalid instants; locale formatting differs across browsers.
  if (!Number.isFinite(value.getTime())) throw new RangeError("Invalid Acre date or time");
  return value;
}

export function acreStartOfDay(dateKey = acreDateKey()): Date {
  return acreDateAtTime(dateKey, "00:00");
}

export function acreEndOfDay(dateKey = acreDateKey()): Date {
  return new Date(acreStartOfDay(dateKey).getTime() + 24 * 60 * 60 * 1000);
}

export function acreAddDays(dateKey: string, days: number): string {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateKey) || !Number.isInteger(days)) {
    throw new RangeError("Invalid Acre date or day offset");
  }
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function formatAcreDateOnly(
  dateKey: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "short" },
): string {
  return new Intl.DateTimeFormat("pt-BR", {
    ...options,
    timeZone: ACRE_TIME_ZONE,
  }).format(acreDateAtTime(dateKey, "12:00"));
}
