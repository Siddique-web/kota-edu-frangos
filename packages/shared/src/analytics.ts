import { CATEGORY_LABEL, CATEGORY_ORDER } from './menu';
import { DIGITAL_PAYMENTS, PAYMENT_LABEL } from './brand';
import { formatMTShort, pad, pct, weekdayShort } from './format';
import { getSauce, SAUCES } from './sauces';
import { businessDayStartDaysAgo, OPERATING_HOURS, startOfBusinessDay } from './time';
import type { Category, MenuItem, Order, PaymentMethod, SauceId } from './types';

export type Period = 'hoje' | '7d';

export interface DayPoint { key: number; label: string; revenue: number; orders: number }
export interface ProductRank { id: string; name: string; qty: number; revenue: number }
export interface CategoryRev { category: Category; label: string; revenue: number; qty: number }
export interface PaymentSlice { method: PaymentMethod; label: string; total: number; count: number; pct: number }
export interface HourPoint { hour: number; label: string; orders: number }
export interface SauceRank { id: SauceId; label: string; count: number; pct: number; color: string }

export interface Stats {
  period: Period;
  revenue: number;
  orderCount: number;
  todayOrders: number;
  todayRevenue: number;
  avgTicket: number;
  topProduct: ProductRank | null;
  digitalPct: number;
  byDay: DayPoint[];
  topProducts: ProductRank[];
  byCategory: CategoryRev[];
  payments: PaymentSlice[];
  peakHours: HourPoint[];
  sauces: SauceRank[];
  drinkAttachPct: number;
  deliveryShare: number;
  topZone: { name: string; orders: number } | null;
  bestDay: DayPoint | null;
  weakestDay: DayPoint | null;
}

export function computeStats(allOrders: Order[], period: Period, now: number = Date.now()): Stats {
  const todayStart = startOfBusinessDay(now);
  const from = period === 'hoje' ? todayStart : businessDayStartDaysAgo(now, 6);
  const orders = allOrders.filter((o) => o.createdAt >= from);
  const todayOrders = allOrders.filter((o) => o.createdAt >= todayStart);

  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const digital = orders.filter((o) => DIGITAL_PAYMENTS.includes(o.payment.method));
  const digitalRevenue = digital.reduce((s, o) => s + o.total, 0);

  // Evolução de 7 dias (sempre)
  const byDay: DayPoint[] = [];
  for (let d = 6; d >= 0; d--) {
    const start = businessDayStartDaysAgo(now, d);
    const end = businessDayStartDaysAgo(now, d - 1);
    const dayOrders = allOrders.filter((o) => o.createdAt >= start && o.createdAt < (d === 0 ? Infinity : end));
    byDay.push({
      key: start,
      label: `${weekdayShort(start)} ${pad(new Date(start).getDate())}`,
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      orders: dayOrders.length,
    });
  }

  // Produtos
  const prod = new Map<string, ProductRank>();
  const cat = new Map<Category, CategoryRev>();
  let drinkOrders = 0;
  for (const o of orders) {
    let hasDrink = false;
    for (const l of o.lines) {
      const p = prod.get(l.itemId) ?? { id: l.itemId, name: l.name, qty: 0, revenue: 0 };
      p.qty += l.qty;
      p.revenue += l.unitPrice * l.qty;
      prod.set(l.itemId, p);
      const c = cat.get(l.category) ?? { category: l.category, label: CATEGORY_LABEL[l.category], revenue: 0, qty: 0 };
      c.revenue += l.unitPrice * l.qty;
      c.qty += l.qty;
      cat.set(l.category, c);
      if (l.category === 'bebidas') hasDrink = true;
    }
    if (hasDrink) drinkOrders++;
  }
  const topProducts = [...prod.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue);
  const byCategory = CATEGORY_ORDER.map((k) => cat.get(k)).filter((c): c is CategoryRev => !!c && c.revenue > 0);

  // Pagamentos
  const payMap = new Map<PaymentMethod, { total: number; count: number }>();
  for (const o of orders) {
    const p = payMap.get(o.payment.method) ?? { total: 0, count: 0 };
    p.total += o.total;
    p.count += 1;
    payMap.set(o.payment.method, p);
  }
  const payments: PaymentSlice[] = (['mpesa', 'emola', 'cash', 'pos'] as PaymentMethod[]).map((m) => {
    const p = payMap.get(m) ?? { total: 0, count: 0 };
    return { method: m, label: PAYMENT_LABEL[m], total: p.total, count: p.count, pct: pct(p.total, revenue, 1) };
  });

  // Horas de pico
  const hourMap = new Map<number, number>();
  for (const o of orders) {
    const h = new Date(o.createdAt).getHours();
    hourMap.set(h, (hourMap.get(h) ?? 0) + 1);
  }
  const peakHours: HourPoint[] = OPERATING_HOURS.map((h) => ({ hour: h, label: `${h}h`, orders: hourMap.get(h) ?? 0 }));

  // Molhos (unidades)
  const sauceMap = new Map<SauceId, number>();
  for (const o of orders) for (const l of o.lines) if (l.sauce) sauceMap.set(l.sauce, (sauceMap.get(l.sauce) ?? 0) + l.qty);
  const sauceTotal = [...sauceMap.values()].reduce((s, n) => s + n, 0);
  const sauces: SauceRank[] = SAUCES.map((s) => ({
    id: s.id,
    label: s.short,
    count: sauceMap.get(s.id) ?? 0,
    pct: pct(sauceMap.get(s.id) ?? 0, sauceTotal),
    color: s.color,
  })).sort((a, b) => b.count - a.count);

  // Delivery
  const delivery = orders.filter((o) => o.mode === 'delivery');
  const zoneMap = new Map<string, number>();
  for (const o of delivery) if (o.zoneName) zoneMap.set(o.zoneName, (zoneMap.get(o.zoneName) ?? 0) + 1);
  const topZoneEntry = [...zoneMap.entries()].sort((a, b) => b[1] - a[1])[0];

  const closedDays = byDay.filter((d) => d.orders > 0);
  const bestDay = closedDays.length ? [...closedDays].sort((a, b) => b.revenue - a.revenue)[0] : null;
  // Dia mais fraco: ignora o dia em curso (incompleto)
  const completeDays = byDay.slice(0, -1).filter((d) => d.orders > 0);
  const weakestDay = completeDays.length ? [...completeDays].sort((a, b) => a.revenue - b.revenue)[0] : null;

  return {
    period,
    revenue,
    orderCount: orders.length,
    todayOrders: todayOrders.length,
    todayRevenue: todayOrders.reduce((s, o) => s + o.total, 0),
    avgTicket: orders.length ? revenue / orders.length : 0,
    topProduct: topProducts[0] ?? null,
    digitalPct: pct(digitalRevenue, revenue, 1),
    byDay,
    topProducts,
    byCategory,
    payments,
    peakHours,
    sauces,
    drinkAttachPct: pct(drinkOrders, orders.length),
    deliveryShare: pct(delivery.reduce((s, o) => s + o.total, 0), revenue),
    topZone: topZoneEntry ? { name: topZoneEntry[0], orders: topZoneEntry[1] } : null,
    bestDay,
    weakestDay,
  };
}

// ───────────────────────── Consultor Estratégico ─────────────────────────

export interface Insight {
  id: string;
  title: string;
  body: string;
  action: string;
  impact: number; // estimativa de impacto em MT (só para ordenar)
  tone: 'ember' | 'gold' | 'green';
}

/**
 * Motor de regras que transforma as métricas atuais em recomendações acionáveis.
 * É determinístico e corre offline. Pode ser substituído por um LLM implementando a mesma saída.
 */
export function buildInsights(stats: Stats, menu: MenuItem[]): Insight[] {
  const list: Insight[] = [];
  const drinkPrice = menu.find((m) => m.id === 'refresco-txoti')?.price ?? 35;

  // 1) Bebida no pedido (upsell)
  if (stats.orderCount > 0) {
    const target = 75;
    const gap = Math.max(0, target - stats.drinkAttachPct);
    const perDay = stats.period === 'hoje' ? stats.orderCount : stats.orderCount / 7;
    const extra = Math.round((gap / 100) * perDay * drinkPrice);
    list.push({
      id: 'drink-attach',
      title: `Só ${stats.drinkAttachPct}% dos pedidos levam bebida`,
      body: `Subir para ${target}% com sugestão de bebida no balcão e no carrinho vale cerca de ${formatMTShort(extra)} por dia (a ${drinkPrice} MT cada).`,
      action: 'Treinar equipa: "Leva um Refresco Txoti?" em cada pedido.',
      impact: extra * 30,
      tone: stats.drinkAttachPct >= target ? 'green' : 'gold',
    });
  }

  // 2) Horário de pico
  const peak = [...stats.peakHours].sort((a, b) => b.orders - a.orders)[0];
  if (peak && peak.orders > 0) {
    const prev = (peak.hour + 23) % 24;
    list.push({
      id: 'peak',
      title: `Pico às ${peak.hour}h com ${peak.orders} pedidos`,
      body: `A cozinha recebe a maior carga às ${peak.hour}h. Ter grelha cheia e molhos prontos às ${prev}h30 evita filas e cancelamentos.`,
      action: `Pré-grelhar ${Math.max(6, Math.ceil(peak.orders / 3))} ¼ de frango antes das ${prev}h30.`,
      impact: peak.orders * 40,
      tone: 'ember',
    });
  }

  // 3) Molhos / linha exclusiva
  const topSauce = stats.sauces[0];
  const africa = stats.sauces.filter((s) => s.id === 'chillies-suave' || s.id === 'chillies-fogo');
  const africaPct = africa.reduce((s, x) => s + x.pct, 0);
  if (topSauce && topSauce.count > 0) {
    const meta = getSauce(topSauce.id);
    list.push({
      id: 'sauce',
      title: `${meta?.short ?? topSauce.label} lidera (${topSauce.pct}% dos molhos)`,
      body: `A linha Kota Edu Africa Chillies já pesa ${africaPct}% das escolhas. É o seu diferencial: destaque-a e venda frascos para levar.`,
      action: 'Pôr o frasco Africa Chillies junto à caixa e no QR da mesa.',
      impact: Math.round(africaPct * 25),
      tone: 'gold',
    });
  }

  // 4) Dinheiro vivo vs digital
  const cash = stats.payments.find((p) => p.method === 'cash');
  if (cash && stats.revenue > 0) {
    list.push({
      id: 'cash',
      title: `Cash representa ${cash.pct}% da faturação`,
      body: `Pagamentos digitais já são ${stats.digitalPct}%. Mais M-Pesa/E-Mola reduz risco de troco e facilita o fecho de caixa.`,
      action: 'Oferecer pão extra ou desconto simbólico a quem paga por M-Pesa/E-Mola.',
      impact: Math.round(cash.total * 0.01),
      tone: cash.pct > 35 ? 'gold' : 'green',
    });
  }

  // 5) Delivery
  if (stats.topZone && stats.deliveryShare > 0) {
    list.push({
      id: 'delivery',
      title: `${stats.topZone.name} é a zona de delivery nº 1`,
      body: `Delivery vale ${stats.deliveryShare}% da faturação e ${stats.topZone.name} lidera com ${stats.topZone.orders} entregas.`,
      action: `Agrupar entregas de ${stats.topZone.name} por estafeta e testar taxa promocional fora do pico.`,
      impact: stats.topZone.orders * 15,
      tone: 'ember',
    });
  }

  // 6) Dia fraco
  if (stats.weakestDay && stats.bestDay && stats.weakestDay.key !== stats.bestDay.key) {
    const gap = stats.bestDay.revenue - stats.weakestDay.revenue;
    list.push({
      id: 'weak-day',
      title: `${stats.weakestDay.label} é o dia mais fraco`,
      body: `Faturou ${formatMTShort(stats.weakestDay.revenue)} contra ${formatMTShort(stats.bestDay.revenue)} no melhor dia (${stats.bestDay.label}).`,
      action: 'Criar um combo promocional (Painel › Cardápio) e divulgar no WhatsApp nesse dia.',
      impact: Math.round(gap * 0.2),
      tone: 'gold',
    });
  }

  // Mantém sempre 3 insights, por ordem de impacto.
  const fallback: Insight = {
    id: 'bootstrap',
    title: 'Comece a registar pedidos',
    body: 'Assim que entrarem pedidos, o consultor passa a sugerir ações com base nos números reais.',
    action: 'Faça um pedido de teste na Visão Cliente.',
    impact: 0,
    tone: 'gold',
  };
  const sorted = list.sort((a, b) => b.impact - a.impact).slice(0, 3);
  while (sorted.length < 3) sorted.push({ ...fallback, id: `${fallback.id}-${sorted.length}` });
  return sorted;
}

