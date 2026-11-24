import { DEMO_PROFILE } from './brand';
import { cartSubtotal, makeId } from './cart';
import { businessDayStartDaysAgo, MS, OPERATING_HOURS, startOfBusinessDay, timestampInBusinessDay } from './time';
import type { CartLine, DeliveryZone, MenuItem, Order, OrderMode, OrderStatus, PaymentMethod, SauceId } from './types';

// ───────────── PRNG determinístico (mulberry32) ─────────────
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T>(rng: Rng, entries: Array<[T, number]>): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [v, w] of entries) {
    r -= w;
    if (r <= 0) return v;
  }
  return entries[entries.length - 1][0];
}

const int = (rng: Rng, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;

// ───────────── Pesos realistas ─────────────
const MAIN_WEIGHTS: Array<[string, number]> = [
  ['frango-quarto-classico', 18], ['frango-quarto-completo', 10], ['frango-metade', 9], ['frango-inteiro', 4],
  ['hamb-simples', 7], ['salva-vida', 6], ['mata-fome', 8], ['hamb-queijo', 7], ['hamb-especial', 5], ['hamb-completo', 4],
  ['sande-queijo', 5], ['sande-2-ovos', 3], ['sande-misto', 3], ['dose-batata', 5],
];
const DRINK_WEIGHTS: Array<[string, number]> = [
  ['refresco-txoti', 14], ['agua-b-aqua-pequena', 8], ['agua-vumba-pequena', 4], ['cappy-txoti', 6], ['agua-b-aqua-grande', 4],
  ['refresco-lata', 6], ['lemon-twist', 3], ['agua-tonica', 2], ['cappy-lata', 4], ['agua-vumba-grande', 3],
  ['refresco-1l', 4], ['cappy-1l', 3], ['monster', 4], ['refresco-2l', 3], ['red-bull', 3],
];
const SAUCE_WEIGHTS: Array<[SauceId, number]> = [
  ['original', 34], ['chillies-suave', 25], ['chillies-fogo', 21], ['alho-ervas', 12], ['sem-molho', 8],
];
const PAYMENT_WEIGHTS: Array<[PaymentMethod, number]> = [['mpesa', 38], ['emola', 17], ['cash', 30], ['pos', 15]];
const MODE_WEIGHTS: Array<[OrderMode, number]> = [['mesa', 33], ['takeaway', 30], ['delivery', 37]];
/** Distribuição de pedidos por hora (11h → 03h) com picos ao almoço e à noite. */
const HOUR_WEIGHTS: Record<number, number> = {
  11: 3, 12: 9, 13: 10, 14: 6, 15: 3, 16: 3, 17: 5, 18: 8, 19: 11, 20: 12, 21: 10, 22: 8, 23: 7, 0: 6, 1: 5, 2: 3, 3: 1,
};
const WEEKDAY_FACTOR = [1.1, 0.85, 0.8, 0.85, 0.95, 1.25, 1.35]; // Dom..Sáb

const FIRST_NAMES = ['Armando', 'Celina', 'Hélio', 'Nádia', 'Tiago', 'Ercília', 'Jordão', 'Fátima', 'Gil', 'Lúcia', 'Dário', 'Ivone', 'Samuel', 'Bela', 'Nelson', 'Cláudia', 'Osvaldo', 'Rosa', 'Délcio', 'Ana', 'Mário', 'Sónia', 'Edson', 'Vera', 'Abel', 'Telma'];
const NOTES = ['Bem passado', 'Sem salada', 'Pouco picante', 'Mais molho por favor', 'Sem cebola', 'Cortar ao meio'];
const ALNUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomPhone(rng: Rng): string {
  const prefix = pickWeighted(rng, [['84', 40], ['85', 20], ['86', 20], ['87', 20]] as Array<[string, number]>);
  return `${prefix} ${int(rng, 100, 999)} ${int(rng, 1000, 9999)}`;
}

function randomSms(rng: Rng): string {
  let s = '';
  for (let i = 0; i < 10; i++) s += ALNUM[Math.floor(rng() * ALNUM.length)];
  return s;
}

function sauceFor(rng: Rng, item: MenuItem): SauceId | undefined {
  if (item.sauceMode === 'none') return undefined;
  if (item.sauceMode === 'optional' && rng() < 0.25) return undefined;
  return pickWeighted(rng, SAUCE_WEIGHTS);
}

export interface GenContext {
  menu: MenuItem[];
  zones: DeliveryZone[];
}

function makeLine(item: MenuItem, qty: number, sauce: SauceId | undefined, notes?: string): CartLine {
  return {
    lineId: makeId('l'),
    itemId: item.id,
    name: item.name,
    category: item.category,
    unitPrice: item.price,
    qty,
    sauce,
    notes,
  };
}

/** Gera um pedido realista (estado inicial `recebido`, sem timeline além de recebido). */
export function generateOrder(rng: Rng, ctx: GenContext, ts: number, number: number): Order {
  const byId = (id: string) => ctx.menu.find((m) => m.id === id);
  const lines: CartLine[] = [];

  const mains = pickWeighted(rng, [[1, 58], [2, 28], [3, 10], [4, 4]] as Array<[number, number]>);
  for (let i = 0; i < mains; i++) {
    const id = pickWeighted(rng, MAIN_WEIGHTS);
    const item = byId(id);
    if (!item) continue;
    const qty = item.id === 'frango-inteiro' ? 1 : rng() < 0.15 ? 2 : 1;
    const notes = rng() < 0.08 ? NOTES[Math.floor(rng() * NOTES.length)] : undefined;
    const sauce = sauceFor(rng, item);
    const same = lines.find((l) => l.itemId === item.id && l.sauce === sauce && l.notes === notes);
    if (same) same.qty += qty;
    else lines.push(makeLine(item, qty, sauce, notes));
  }
  if (rng() < 0.6) {
    const drink = byId(pickWeighted(rng, DRINK_WEIGHTS));
    if (drink) lines.push(makeLine(drink, rng() < 0.2 ? 2 : 1, undefined));
  }
  if (rng() < 0.12) {
    const pao = byId('pao-extra');
    if (pao) lines.push(makeLine(pao, int(rng, 1, 3), undefined));
  }

  const mode = pickWeighted(rng, MODE_WEIGHTS);
  const zone = mode === 'delivery' ? ctx.zones[Math.floor(rng() * ctx.zones.length)] : undefined;
  const method = pickWeighted(rng, PAYMENT_WEIGHTS);
  const subtotal = cartSubtotal(lines);
  const fee = zone?.fee ?? 0;
  const digital = method === 'mpesa' || method === 'emola';

  return {
    id: makeId('o'),
    number,
    createdAt: ts,
    updatedAt: ts,
    status: 'recebido',
    timeline: { recebido: ts },
    mode,
    table: mode === 'mesa' ? String(int(rng, 1, 12)) : undefined,
    zoneId: zone?.id,
    zoneName: zone?.name,
    address: zone ? `Ref. ${zone.name}, casa nº ${int(rng, 1, 90)}` : undefined,
    deliveryFee: fee,
    customerName: FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)],
    customerPhone: randomPhone(rng),
    lines,
    subtotal,
    total: subtotal + fee,
    payment: { method, smsCode: digital ? randomSms(rng) : undefined, confirmed: true },
  };
}

/** Faz avançar um pedido gerado até um estado, preenchendo a timeline de forma coerente. */
function progressTo(o: Order, status: OrderStatus, rng: Rng): Order {
  const t0 = o.createdAt;
  const grill = t0 + int(rng, 1, 3) * MS.MINUTE;
  const ready = grill + int(rng, 8, 17) * MS.MINUTE;
  const delivered = ready + int(rng, o.mode === 'delivery' ? 10 : 1, o.mode === 'delivery' ? 28 : 8) * MS.MINUTE;
  const timeline: Order['timeline'] = { recebido: t0 };
  if (status !== 'recebido') timeline.na_grelha = grill;
  if (status === 'pronto' || status === 'entregue') timeline.pronto = ready;
  if (status === 'entregue') timeline.entregue = delivered;
  return { ...o, status, timeline, updatedAt: timeline.entregue ?? timeline.pronto ?? timeline.na_grelha ?? t0 };
}

/**
 * Histórico realista de 7 dias de negócio + alguns pedidos ativos para a Cozinha (KDS).
 * Determinístico para um dado `now` arredondado ao dia.
 */
export function buildSeedOrders(ctx: GenContext, now: number = Date.now()): Order[] {
  const dayStartToday = startOfBusinessDay(now);
  const rng = mulberry32(Math.floor(dayStartToday / MS.DAY) * 7919 + 13);
  const orders: Order[] = [];
  const cutoff = now - 30 * MS.MINUTE; // o que for mais recente fica "ativo"

  for (let d = 6; d >= 0; d--) {
    const dayStart = businessDayStartDaysAgo(now, d);
    const weekday = new Date(dayStart).getDay();
    const target = Math.round(46 * WEEKDAY_FACTOR[weekday] * (0.92 + rng() * 0.16));
    const stamps: number[] = [];
    for (let i = 0; i < target; i++) {
      const hour = pickWeighted(rng, OPERATING_HOURS.map((h) => [h, HOUR_WEIGHTS[h]] as [number, number]));
      const ts = timestampInBusinessDay(dayStart, hour, int(rng, 0, 59));
      if (ts <= cutoff) stamps.push(ts);
    }
    stamps.sort((a, b) => a - b);
    stamps.forEach((ts, i) => {
      const base = generateOrder(rng, ctx, ts, i + 1);
      orders.push(progressTo(base, 'entregue', rng));
    });
  }

  // Cliente demo com 3 pedidos entregues em dias distintos (cartão fidelidade 3/5).
  const demoDays = [5, 3, 1].map((n) => businessDayStartDaysAgo(now, n));
  for (const ds of demoDays) {
    const idx = orders.findIndex((o) => o.createdAt >= ds && o.createdAt < ds + MS.DAY && o.customerName !== DEMO_PROFILE.name);
    if (idx >= 0) orders[idx] = { ...orders[idx], customerName: DEMO_PROFILE.name, customerPhone: DEMO_PROFILE.phone };
  }

  // Pedidos ativos para a Cozinha: Recebido ×2, Na Grelha ×2, Pronto ×1.
  const active: Array<[OrderStatus, number]> = [
    ['recebido', 2], ['recebido', 5], ['na_grelha', 11], ['na_grelha', 16], ['pronto', 24],
  ];
  const todayCount = orders.filter((o) => o.createdAt >= dayStartToday).length;
  active.forEach(([status, minutesAgo], i) => {
    const ts = now - minutesAgo * MS.MINUTE;
    const base = generateOrder(rng, ctx, ts, todayCount + i + 1);
    const o = { ...base, payment: { ...base.payment, confirmed: base.payment.method === 'cash' || base.payment.method === 'pos' ? false : i % 2 === 0 } };
    const grill = ts + 2 * MS.MINUTE;
    const ready = ts + 14 * MS.MINUTE;
    const timeline: Order['timeline'] = { recebido: ts };
    if (status !== 'recebido') timeline.na_grelha = grill;
    if (status === 'pronto') timeline.pronto = ready;
    orders.push({ ...o, status, timeline, updatedAt: now });
  });

  return orders.sort((a, b) => b.createdAt - a.createdAt);
}

