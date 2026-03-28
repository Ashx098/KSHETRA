import { Decimal } from "@prisma/client/runtime/library";

export function decimalToNumber(value: Decimal | number | string): number {
  return Number(value);
}

export function dateToIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

