import { PAYMENT_LABEL } from './brand';
import { formatClock, formatMT, formatOrderNumber, pad } from './format';
import { modeDetail, paymentSummary } from './orders';
import { businessDayStartDaysAgo, startOfBusinessDay } from './time';
import type { Order, OrderMode, OrderStatus, PaymentMethod } from './types';

export type LedgerRange = 'hoje' | 'ontem' | '7d' | '30d' | 'tudo' | 'intervalo';

export interface LedgerQuery {
  range: LedgerRange;
  /** Início inclusivo do intervalo (ms). */
  from?: number;
  /** Fim exclusivo do intervalo (ms). */
  to?: number;
  mode: OrderMode | 'todos';
  payment: PaymentMethod | 'todos';
  status: OrderStatus | 'todos';
  q: string;
}

export interface LedgerMoney {
  method: PaymentMethod;
  label: string;
  confirmed: number;
  pending: number;
  count: number;
}

export interface Ledger {
  label: string;
  orders: Order[];
  count: number;
  revenue: number;
  confirmed: number;
  pending: number;
  deliveryFees: number;
  avgTicket: number;
  money: LedgerMoney[];
}

function fold(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function bounds(query: LedgerQuery, now: number): { from: number; to: number } | null {
  if (query.range === 'tudo') return null;
  if (query.range === 'hoje') return { from: startOfBusinessDay(now), to: now + 1 };
  if (query.range === 'ontem') return { from: businessDayStartDaysAgo(now, 1), to: startOfBusinessDay(now) };
  if (query.range === '7d') return { from: businessDayStartDaysAgo(now, 6), to: now + 1 };
  if (query.range === '30d') return { from: businessDayStartDaysAgo(now, 29), to: now + 1 };
  if (query.from == null || query.to == null || query.to <= query.from) return { from: 0, to: 0 };
  return { from: query.from, to: query.to };
}

function rangeLabel(query: LedgerQuery, now: number): string {
  const day = (ts: number) => {
    const d = new Date(ts);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  };
  if (query.range === 'hoje') return `Hoje · ${day(now)}`;
  if (query.range === 'ontem') return `Ontem · ${day(businessDayStartDaysAgo(now, 1))}`;
  if (query.range === '7d') return 'Últimos 7 dias';
  if (query.range === '30d') return 'Últimos 30 dias';
  if (query.range === 'tudo') return 'Todos os pedidos';
  if (query.from == null || query.to == null || query.to <= query.from) return 'Escolha o intervalo';
  return `${day(query.from)} – ${day(startOfBusinessDay(query.to - 1))}`;
}

/** Pedidos que passam nos filtros, do mais recente para o mais antigo, com o fecho desse conjunto. */
export function buildLedger(orders: readonly Order[], query: LedgerQuery, now: number = Date.now()): Ledger {
  const window = bounds(query, now);
  const needle = fold(query.q.trim());
  const matched = orders.filter((o) => {
    if (window && (o.createdAt < window.from || o.createdAt >= window.to)) return false;
    if (query.mode !== 'todos' && o.mode !== query.mode) return false;
    if (query.payment !== 'todos' && o.payment.method !== query.payment) return false;
    if (query.status !== 'todos' && o.status !== query.status) return false;
    if (!needle) return true;
    const blob = fold([
      String(o.number).padStart(3, '0'),
      o.customerName,
      o.customerPhone,
      o.address ?? '',
      o.zoneName ?? '',
      o.table ?? '',
      ...o.lines.map((l) => l.name),
    ].join(' '));
    return blob.includes(needle);
  }).sort((a, b) => b.createdAt - a.createdAt);

  const revenue = matched.reduce((s, o) => s + o.total, 0);
  const confirmed = matched.filter((o) => o.payment.confirmed).reduce((s, o) => s + o.total, 0);
  const methods: PaymentMethod[] = ['cash', 'pos', 'mpesa', 'emola'];
  const money: LedgerMoney[] = methods.map((method) => {
    const rows = matched.filter((o) => o.payment.method === method);
    return {
      method,
      label: PAYMENT_LABEL[method],
      confirmed: rows.filter((o) => o.payment.confirmed).reduce((s, o) => s + o.total, 0),
      pending: rows.filter((o) => !o.payment.confirmed).reduce((s, o) => s + o.total, 0),
      count: rows.length,
    };
  });

  return {
    label: rangeLabel(query, now),
    orders: matched,
    count: matched.length,
    revenue,
    confirmed,
    pending: revenue - confirmed,
    deliveryFees: matched.reduce((s, o) => s + o.deliveryFee, 0),
    avgTicket: matched.length ? revenue / matched.length : 0,
    money,
  };
}

/** "2026-11-24" → 05:00 desse dia (início do dia de negócio). */
export function businessDayFromDateInput(isoDate: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return null;
  const y = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const ts = new Date(y, month - 1, day, 5, 0, 0, 0).getTime();
  return Number.isFinite(ts) ? ts : null;
}

export function ledgerCsvRows(orders: readonly Order[]): Array<Array<string | number>> {
  const rows: Array<Array<string | number>> = [[
    'Pedido', 'Data', 'Hora', 'Tipo', 'Cliente', 'Telemóvel', 'Pagamento', 'Confirmado',
    'Itens', 'Taxa', 'Total (MT)', 'Estado', 'Morada', 'Latitude', 'Longitude', 'Mapa',
  ]];
  for (const o of [...orders].sort((a, b) => a.createdAt - b.createdAt)) {
    const d = new Date(o.createdAt);
    rows.push([
      formatOrderNumber(o.number),
      d.toLocaleDateString('pt-PT'),
      formatClock(o.createdAt),
      modeDetail(o),
      o.customerName,
      o.customerPhone,
      paymentSummary(o),
      o.payment.confirmed ? 'sim' : 'não',
      o.lines.map((l) => `${l.qty}x ${l.name}`).join(' | '),
      o.deliveryFee,
      o.total,
      o.status,
      o.address ?? '',
      o.lat ?? '',
      o.lng ?? '',
      o.lat != null && o.lng != null ? `${o.lat.toFixed(6)},${o.lng.toFixed(6)}` : '',
    ]);
  }
  return rows;
}

export function closeReport(ledger: Ledger): string {
  const line = (k: string, v: string) => `${k.padEnd(22, ' ')}${v}`;
  return [
    'KOTA EDU FRANGOS',
    'FECHO',
    ledger.label,
    '',
    line('Pedidos', String(ledger.count)),
    line('Lançado', formatMT(ledger.revenue)),
    line('Confirmado no caixa', formatMT(ledger.confirmed)),
    line('Ainda pendente', formatMT(ledger.pending)),
    line('Taxas de entrega', formatMT(ledger.deliveryFees)),
    line('Ticket médio', formatMT(ledger.avgTicket)),
    '',
    ...ledger.money.filter((m) => m.count > 0).map((m) => `${m.label}: ${formatMT(m.confirmed)} confirmado · ${formatMT(m.pending)} pendente · ${m.count}`),
  ].join('\n');
}
