const DATE_PARTS_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

export const SYSTEM_DAY_RESET_HOUR_LOCAL = 8;

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function getSystemDayString(timezone: string, date = new Date()): string {
  const parts = getZonedParts(timezone, date);
  const base = Date.UTC(parts.year, parts.month - 1, parts.day);
  const adjusted = new Date(
    parts.hour < SYSTEM_DAY_RESET_HOUR_LOCAL ? base - 24 * 60 * 60 * 1000 : base,
  );

  return adjusted.toISOString().slice(0, 10);
}

export function getNextSystemResetAt(timezone: string, date = new Date()): string {
  const parts = getZonedParts(timezone, date);
  const targetBaseUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
  const targetDate = new Date(
    parts.hour < SYSTEM_DAY_RESET_HOUR_LOCAL
      ? targetBaseUtc
      : targetBaseUtc + 24 * 60 * 60 * 1000,
  );

  return zonedDateTimeToUtc(timezone, {
    year: targetDate.getUTCFullYear(),
    month: targetDate.getUTCMonth() + 1,
    day: targetDate.getUTCDate(),
    hour: SYSTEM_DAY_RESET_HOUR_LOCAL,
    minute: 0,
    second: 0,
  }).toISOString();
}

export function getLocalHour(timezone: string, date = new Date()): number {
  return getZonedParts(timezone, date).hour;
}

export function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function shiftDateString(value: string, days: number): string {
  const date = toDateOnly(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getZonedParts(timezone: string, date: Date): ZonedParts {
  const cacheKey = `${timezone}:date-time`;
  const formatter =
    DATE_PARTS_FORMATTER_CACHE.get(cacheKey) ??
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      hourCycle: "h23",
    });

  DATE_PARTS_FORMATTER_CACHE.set(cacheKey, formatter);

  const parts = formatter.formatToParts(date);

  return {
    year: Number(getPart(parts, "year")),
    month: Number(getPart(parts, "month")),
    day: Number(getPart(parts, "day")),
    hour: Number(getPart(parts, "hour")),
    minute: Number(getPart(parts, "minute")),
    second: Number(getPart(parts, "second")),
  };
}

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? "0";
}

function zonedDateTimeToUtc(
  timezone: string,
  input: { year: number; month: number; day: number; hour: number; minute: number; second: number },
): Date {
  let utcGuess = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour,
    input.minute,
    input.second,
  );

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const offset = getTimezoneOffsetMs(timezone, new Date(utcGuess));
    const adjusted =
      Date.UTC(
        input.year,
        input.month - 1,
        input.day,
        input.hour,
        input.minute,
        input.second,
      ) - offset;

    if (adjusted === utcGuess) {
      break;
    }

    utcGuess = adjusted;
  }

  return new Date(utcGuess);
}

function getTimezoneOffsetMs(timezone: string, date: Date): number {
  const parts = getZonedParts(timezone, date);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return asUtc - date.getTime();
}
