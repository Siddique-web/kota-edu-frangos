/**
 * "Dia de negócio": o restaurante trabalha até de madrugada, por isso o dia
 * só vira às 05:00. Um pedido às 01:30 pertence ao dia de negócio anterior.
 */
export const BUSINESS_DAY_START_HOUR = 5;
const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** Início (05:00 locais) do dia de negócio que contém `ts`. */
export function startOfBusinessDay(ts: number): number {
  const shifted = new Date(ts - BUSINESS_DAY_START_HOUR * HOUR);
  return new Date(shifted.getFullYear(), shifted.getMonth(), shifted.getDate(), BUSINESS_DAY_START_HOUR, 0, 0, 0).getTime();
}

export function businessDayKey(ts: number): string {
  const d = new Date(startOfBusinessDay(ts));
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function isSameBusinessDay(a: number, b: number): boolean {
  return startOfBusinessDay(a) === startOfBusinessDay(b);
}

/** Início do dia de negócio de há `n` dias (n=0 → hoje). */
export function businessDayStartDaysAgo(now: number, n: number): number {
  const base = new Date(startOfBusinessDay(now));
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() - n, BUSINESS_DAY_START_HOUR, 0, 0, 0).getTime();
}

/** Horas de operação em ordem de exibição: 11h → 23h, 0h → 3h. */
export const OPERATING_HOURS: number[] = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3];

/** Timestamp dentro de um dia de negócio para uma hora de relógio (0-23) e minuto. */
export function timestampInBusinessDay(dayStart: number, hour: number, minute: number): number {
  const offsetHours = hour >= BUSINESS_DAY_START_HOUR ? hour - BUSINESS_DAY_START_HOUR : hour + (24 - BUSINESS_DAY_START_HOUR);
  return dayStart + offsetHours * HOUR + minute * 60_000;
}

export const MS = { HOUR, DAY, MINUTE: 60_000 };
