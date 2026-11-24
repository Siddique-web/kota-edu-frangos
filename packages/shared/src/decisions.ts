import { PAYMENT_LABEL } from './brand';
import { formatMT, formatOrderNumber, normalizePhone } from './format';
import { KITCHEN_BUSY_AT, KITCHEN_BUSY_MESSAGE, modeDetail, paymentSummary, preparingCount } from './orders';
import { startOfBusinessDay } from './time';
import type { MenuItem, Order, OrderMode, OrderStatus, PaymentMethod } from './types';

const STALE_NEW_MIN = 12;
const STALE_GRILL_MIN = 25;
const STALE_READY_MIN = 15;

export interface DeskOrder {
  id: string;
  number: number;
  label: string;
  name: string;
  waitMin: number;
  status: OrderStatus;
  where: string;
  pay: string;
  total: number;
  urgent: boolean;
}

export interface DeskAlert {
  id: string;
  tone: 'ember' | 'gold' | 'green';
  title: string;
  detail: string;
  /** Número do pedido para abrir na cozinha. */
  focus?: string;
}

export interface DeskMove {
  id: string;
  title: string;
  body: string;
}

export interface DeskMoney {
  method: PaymentMethod;
  label: string;
  confirmed: number;
  pending: number;
}

export interface DecisionDesk {
  headline: string;
  preparing: number;
  busy: boolean;
  newCount: number;
  grillCount: number;
  readyCount: number;
  deliveryOut: number;
  oldestOpenMin: number | null;
  avgReadyMin: number | null;
  proofs: { count: number; amount: number };
  transfers: { count: number; amount: number };
  toCollect: { count: number; amount: number };
  drawerTotal: number;
  todayOrders: number;
  todayRevenue: number;
  modes: Record<OrderMode, number>;
  soldOut: string[];
  repeats: Array<{ name: string; phone: string; orders: number }>;
  money: DeskMoney[];
  open: DeskOrder[];
  alerts: DeskAlert[];
  moves: DeskMove[];
}

function minutesBetween(now: number, then: number): number {
  return Math.max(0, Math.floor((now - then) / 60_000));
}

function countWord(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Leitura do turno: cozinha, caixa e o que fazer a seguir. Corre offline, com os pedidos reais. */
export function buildDecisionDesk(orders: readonly Order[], menu: readonly MenuItem[], now: number = Date.now()): DecisionDesk {
  const todayStart = startOfBusinessDay(now);
  const today = orders.filter((o) => o.createdAt >= todayStart);
  const openOrders = orders.filter((o) => o.status !== 'entregue');

  const newCount = openOrders.filter((o) => o.status === 'recebido').length;
  const grillCount = openOrders.filter((o) => o.status === 'na_grelha').length;
  const readyCount = openOrders.filter((o) => o.status === 'pronto').length;
  const preparing = preparingCount(openOrders);
  const deliveryOut = openOrders.filter((o) => o.mode === 'delivery' && (o.status === 'pronto' || o.status === 'na_grelha')).length;

  const waits = openOrders.map((o) => minutesBetween(now, o.createdAt));
  const oldestOpenMin = waits.length ? Math.max(...waits) : null;

  const readySamples = today
    .map((o) => {
      const done = o.timeline.pronto ?? o.timeline.entregue;
      return done ? minutesBetween(done, o.createdAt) : null;
    })
    .filter((n): n is number => n !== null);
  const avgReadyMin = readySamples.length ? Math.round(readySamples.reduce((s, n) => s + n, 0) / readySamples.length) : null;

  const digitalOpen = (predicate: (o: Order) => boolean) => {
    const list = openOrders.filter((o) => (o.payment.method === 'emola' || o.payment.method === 'mpesa') && !o.payment.confirmed && predicate(o));
    return { count: list.length, amount: list.reduce((s, o) => s + o.total, 0), first: list[0] };
  };
  const proofList = digitalOpen((o) => !!o.payment.smsCode);
  const transferList = digitalOpen((o) => !o.payment.smsCode);
  const collectList = openOrders.filter((o) => (o.payment.method === 'cash' || o.payment.method === 'pos') && !o.payment.confirmed);

  const methods: PaymentMethod[] = ['cash', 'pos', 'mpesa', 'emola'];
  const money: DeskMoney[] = methods.map((method) => {
    const rows = today.filter((o) => o.payment.method === method);
    return {
      method,
      label: PAYMENT_LABEL[method],
      confirmed: rows.filter((o) => o.payment.confirmed).reduce((s, o) => s + o.total, 0),
      pending: rows.filter((o) => !o.payment.confirmed).reduce((s, o) => s + o.total, 0),
    };
  });
  const drawerTotal = money.reduce((s, m) => s + m.confirmed, 0);
  const todayRevenue = today.reduce((s, o) => s + o.total, 0);

  const modes: Record<OrderMode, number> = { mesa: 0, takeaway: 0, delivery: 0 };
  for (const o of today) modes[o.mode] += 1;

  const soldToday = new Set(today.flatMap((o) => o.lines.map((l) => l.itemId)));
  const soldOutItems = menu.filter((m) => !m.available);
  const soldOut = soldOutItems.map((m) => m.name);
  const soldOutHot = soldOutItems.filter((m) => soldToday.has(m.id));

  const byPhone = new Map<string, { name: string; phone: string; orders: number }>();
  for (const o of today) {
    const phone = normalizePhone(o.customerPhone);
    if (phone.length !== 9) continue;
    const cur = byPhone.get(phone) ?? { name: o.customerName, phone, orders: 0 };
    cur.orders += 1;
    cur.name = o.customerName;
    byPhone.set(phone, cur);
  }
  const repeats = [...byPhone.values()].filter((c) => c.orders >= 2).sort((a, b) => b.orders - a.orders);

  const drinkOrders = today.filter((o) => o.lines.some((l) => l.category === 'bebidas')).length;
  const drinkPct = today.length ? Math.round((drinkOrders / today.length) * 100) : 0;

  const zoneOpen = new Map<string, number>();
  for (const o of openOrders) {
    if (o.mode === 'delivery' && o.zoneName) zoneOpen.set(o.zoneName, (zoneOpen.get(o.zoneName) ?? 0) + 1);
  }
  const batch = [...zoneOpen.entries()].sort((a, b) => b[1] - a[1])[0];

  const staleNew = openOrders.filter((o) => o.status === 'recebido' && minutesBetween(now, o.createdAt) >= STALE_NEW_MIN);
  const staleGrill = openOrders.filter((o) => o.status === 'na_grelha' && minutesBetween(now, o.createdAt) >= STALE_GRILL_MIN);
  const staleReady = openOrders.filter((o) => o.status === 'pronto' && minutesBetween(now, o.timeline.pronto ?? o.createdAt) >= STALE_READY_MIN);

  const open: DeskOrder[] = openOrders
    .map((o) => {
      const waitMin = minutesBetween(now, o.createdAt);
      const proof = (o.payment.method === 'emola' || o.payment.method === 'mpesa') && !!o.payment.smsCode && !o.payment.confirmed;
      const urgent = proof
        || (o.status === 'recebido' && waitMin >= STALE_NEW_MIN)
        || (o.status === 'na_grelha' && waitMin >= STALE_GRILL_MIN)
        || (o.status === 'pronto' && minutesBetween(now, o.timeline.pronto ?? o.createdAt) >= STALE_READY_MIN);
      return {
        id: o.id,
        number: o.number,
        label: formatOrderNumber(o.number),
        name: o.customerName,
        waitMin,
        status: o.status,
        where: modeDetail(o),
        pay: paymentSummary(o),
        total: o.total,
        urgent,
      };
    })
    .sort((a, b) => Number(b.urgent) - Number(a.urgent) || b.waitMin - a.waitMin);

  const alerts: DeskAlert[] = [];
  if (preparing >= KITCHEN_BUSY_AT) {
    alerts.push({
      id: 'busy',
      tone: 'ember',
      title: `${countWord(preparing, 'pedido', 'pedidos')} ainda em preparação`,
      detail: KITCHEN_BUSY_MESSAGE,
    });
  }
  if (staleNew.length) {
    const first = [...staleNew].sort((a, b) => a.createdAt - b.createdAt)[0];
    alerts.push({
      id: 'stale-new',
      tone: 'ember',
      title: `${countWord(staleNew.length, 'pedido novo parado', 'pedidos novos parados')}`,
      detail: `${formatOrderNumber(first.number)} espera há ${minutesBetween(now, first.createdAt)} min. Mande para a grelha.`,
      focus: String(first.number).padStart(3, '0'),
    });
  }
  if (staleGrill.length) {
    const first = [...staleGrill].sort((a, b) => a.createdAt - b.createdAt)[0];
    alerts.push({
      id: 'stale-grill',
      tone: 'gold',
      title: `${countWord(staleGrill.length, 'pedido na grelha há demasiado tempo', 'pedidos na grelha há demasiado tempo')}`,
      detail: `${formatOrderNumber(first.number)} entrou há ${minutesBetween(now, first.createdAt)} min.`,
      focus: String(first.number).padStart(3, '0'),
    });
  }
  if (proofList.count) {
    alerts.push({
      id: 'proofs',
      tone: 'gold',
      title: `${countWord(proofList.count, 'comprovativo por validar', 'comprovativos por validar')}`,
      detail: `${formatMT(proofList.amount)} só entram no fecho depois de conferir a mensagem.`,
      focus: proofList.first ? String(proofList.first.number).padStart(3, '0') : undefined,
    });
  }
  if (transferList.count) {
    alerts.push({
      id: 'transfers',
      tone: 'gold',
      title: `${countWord(transferList.count, 'transferência ainda sem mensagem', 'transferências ainda sem mensagem')}`,
      detail: `${formatMT(transferList.amount)} em E-Mola ou M-Pesa à espera de o cliente colar a confirmação.`,
      focus: transferList.first ? String(transferList.first.number).padStart(3, '0') : undefined,
    });
  }
  if (staleReady.length) {
    const first = [...staleReady].sort((a, b) => (a.timeline.pronto ?? 0) - (b.timeline.pronto ?? 0))[0];
    alerts.push({
      id: 'stale-ready',
      tone: 'ember',
      title: `${countWord(staleReady.length, 'pedido pronto à espera', 'pedidos prontos à espera')}`,
      detail: `${formatOrderNumber(first.number)} está pronto há ${minutesBetween(now, first.timeline.pronto ?? first.createdAt)} min.`,
      focus: String(first.number).padStart(3, '0'),
    });
  }
  if (soldOutHot.length) {
    alerts.push({
      id: 'sold-out',
      tone: 'ember',
      title: `${soldOutHot[0].name} esgotou e já saiu hoje`,
      detail: 'Avise o balcão e ofereça o prato mais próximo que ainda está disponível.',
    });
  }
  if (!alerts.length) {
    alerts.push({
      id: 'calm',
      tone: 'green',
      title: 'Turno sob controlo',
      detail: 'Nenhum pedido parado e nenhum pagamento digital por validar.',
    });
  }

  const moves: DeskMove[] = [];
  if (proofList.count) {
    moves.push({
      id: 'proofs',
      title: 'Feche os comprovativos antes de contar o caixa',
      body: `${formatMT(proofList.amount)} em ${countWord(proofList.count, 'mensagem', 'mensagens')} ainda não estão validados. O fecho só fica certo depois dessa conferência.`,
    });
  }
  if (collectList.length) {
    const amount = collectList.reduce((s, o) => s + o.total, 0);
    moves.push({
      id: 'collect',
      title: `${formatMT(amount)} ainda saem da mão do cliente`,
      body: 'Cash e P.O.S entram no caixa quando o pedido fica Entregue. Não os some ao dinheiro que já está na gaveta.',
    });
  }
  if (preparing >= KITCHEN_BUSY_AT || staleNew.length) {
    moves.push({
      id: 'kitchen',
      title: 'A grelha é o limite deste turno',
      body: preparing >= KITCHEN_BUSY_AT
        ? `Há ${preparing} pedidos em preparação. Segure personalizações longas e mantenha a mensagem de demora visível para o cliente.`
        : `Há pedidos novos parados. Cada um que passa de ${STALE_NEW_MIN} min devia já estar na brasa.`,
    });
  }
  if (today.length >= 4 && drinkPct < 70) {
    moves.push({
      id: 'drinks',
      title: `Só ${drinkPct}% dos pedidos de hoje levam bebida`,
      body: 'No balcão, a pergunta que muda o ticket é curta: “Leva um Refresco Txoti?”. Faça-a antes de fechar a conta.',
    });
  }
  if (soldOutHot.length) {
    const gone = soldOutHot[0];
    const alt = menu.find((m) => m.available && m.category === gone.category && m.id !== gone.id);
    moves.push({
      id: 'stock',
      title: `${gone.name} já não pode sair`,
      body: alt ? `Quem pedir, ofereça ${alt.name}. Está no cardápio e ainda há.` : 'Marque a alternativa no cardápio antes que o balcão prometa o que a cozinha não tem.',
    });
  }
  if (batch && batch[1] >= 2) {
    moves.push({
      id: 'batch',
      title: `${batch[0]} tem ${batch[1]} entregas abertas`,
      body: 'Mande o mesmo estafeta com as duas. Uma viagem em vez de duas reduz a espera e o combustível.',
    });
  }
  if (repeats[0]) {
    moves.push({
      id: 'regular',
      title: `${repeats[0].name} já pediu ${repeats[0].orders} vezes hoje`,
      body: 'Trate pelo nome. Quem volta no mesmo dia é o cliente que segura a casa quando a rua está fraca.',
    });
  }
  if (!moves.length) {
    moves.push({
      id: 'prep',
      title: 'A cozinha está livre: prepare a próxima leva',
      body: 'Molhos prontos e meia dúzia de ¼ na brasa deixam o próximo pico começar sem fila.',
    });
  }

  const parts: string[] = [];
  if (preparing) parts.push(countWord(preparing, 'pedido na cozinha', 'pedidos na cozinha'));
  if (proofList.count) parts.push(countWord(proofList.count, 'comprovativo por validar', 'comprovativos por validar'));
  if (collectList.length) parts.push(`${formatMT(collectList.reduce((s, o) => s + o.total, 0))} por cobrar`);
  const headline = parts.length
    ? `${parts.join(', ')}. Confirmado no caixa: ${formatMT(drawerTotal)}.`
    : `Turno calmo. Confirmado no caixa: ${formatMT(drawerTotal)}.`;

  return {
    headline,
    preparing,
    busy: preparing >= KITCHEN_BUSY_AT,
    newCount,
    grillCount,
    readyCount,
    deliveryOut,
    oldestOpenMin,
    avgReadyMin,
    proofs: { count: proofList.count, amount: proofList.amount },
    transfers: { count: transferList.count, amount: transferList.amount },
    toCollect: { count: collectList.length, amount: collectList.reduce((s, o) => s + o.total, 0) },
    drawerTotal,
    todayOrders: today.length,
    todayRevenue,
    modes,
    soldOut,
    repeats,
    money,
    open,
    alerts: alerts.slice(0, 5),
    moves: moves.slice(0, 3),
  };
}
