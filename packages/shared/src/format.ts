const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** 1250 -> "1 250,00 MT" (seguro em Hermes/React Native: sem Intl). */
export function formatMT(value: number): string {
  const neg = value < 0;
  const [int, dec] = Math.abs(value).toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${neg ? '-' : ''}${grouped},${dec} MT`;
}

/** 1250 -> "1 250 MT" (para gráficos e KPIs). */
export function formatMTShort(value: number): string {
  const grouped = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${grouped} MT`;
}

export function digitsOnly(s: string): string {
  return (s || '').replace(/\D/g, '');
}

/** Compara telefones ignorando espaços e prefixo +258 (últimos 9 dígitos). */
export function normalizePhone(p: string): string {
  const d = digitsOnly(p);
  return d.length > 9 ? d.slice(-9) : d;
}

export function isValidMzPhone(p: string): boolean {
  return /^(82|83|84|85|86|87)\d{7}$/.test(normalizePhone(p));
}

/** "879071974" -> "87 907 1974" */
export function formatPhoneMZ(p: string): string {
  const d = normalizePhone(p);
  if (d.length !== 9) return p;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
}

export function pad(n: number, size = 2): string {
  return String(n).padStart(size, '0');
}

export function formatOrderNumber(n: number): string {
  return `#${pad(n, 3)}`;
}

export function formatClock(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Duração em mm:ss (ou h:mm:ss). */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function weekdayShort(ts: number): string {
  return WEEKDAYS[new Date(ts).getDay()];
}

export function pct(part: number, whole: number, decimals = 0): number {
  if (!whole) return 0;
  const f = Math.pow(10, decimals);
  return Math.round((part / whole) * 100 * f) / f;
}
