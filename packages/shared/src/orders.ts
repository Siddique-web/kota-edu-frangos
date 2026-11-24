import { BRAND, MODE_LABEL, PAYMENT_LABEL, STATUS_FLOW } from './brand';
import { orderMapsUrl } from './geo';
import { formatClock, formatMT, formatOrderNumber, formatPhoneMZ } from './format';
import { sauceShort } from './sauces';
import type { Order, OrderStatus } from './types';

/** A partir deste número de pedidos ainda por fazer, o cliente vê um aviso temporário. */
export const KITCHEN_BUSY_AT = 10;

export const KITCHEN_BUSY_MESSAGE = 'Vai demorar um pouco porque existem muitos pedidos a serem feitos.';

/** Recebido ou na grelha: a cozinha ainda está a preparar. */
export function isInPreparation(status: OrderStatus): boolean {
  return status === 'recebido' || status === 'na_grelha';
}

export function preparingCount(orders: ReadonlyArray<{ status: OrderStatus }>): number {
  let n = 0;
  for (const o of orders) if (isInPreparation(o.status)) n += 1;
  return n;
}

export function nextStatus(s: OrderStatus): OrderStatus | null {
  const i = STATUS_FLOW.indexOf(s);
  return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
}

export function statusIndex(s: OrderStatus): number {
  return STATUS_FLOW.indexOf(s);
}

/** Texto do botão principal do KDS conforme o estado e o tipo de pedido. */
export function kdsActionLabel(o: Pick<Order, 'status' | 'mode'>): string | null {
  switch (o.status) {
    case 'recebido':
      return 'Iniciar Grelha';
    case 'na_grelha':
      return 'Marcar Pronto';
    case 'pronto':
      return o.mode === 'delivery' ? 'Confirmar Entrega' : o.mode === 'mesa' ? 'Servido' : 'Entregue ao Cliente';
    default:
      return null;
  }
}

export function modeDetail(o: Pick<Order, 'mode' | 'table' | 'zoneName'>): string {
  if (o.mode === 'mesa') return `Mesa ${o.table ?? '?'}`;
  if (o.mode === 'delivery') return `Delivery · ${o.zoneName ?? ''}`.trim();
  return MODE_LABEL.takeaway;
}

export const PAYMENT_PROOF_MIN = 8;
export const PAYMENT_PROOF_MAX = 500;

/** Mensagem de confirmação colada pelo cliente (E-Mola / M-Pesa), sem cortar o texto. */
export function normalizePaymentProof(raw: string): string {
  return raw.trim().slice(0, PAYMENT_PROOF_MAX);
}

export function paymentSummary(o: Pick<Order, 'payment'>): string {
  const label = PAYMENT_LABEL[o.payment.method];
  if (o.payment.method === 'mpesa' || o.payment.method === 'emola') {
    if (o.payment.confirmed) return `${label} · confirmado`;
    return o.payment.smsCode ? `${label} · comprovativo por validar` : `${label} · à espera da transferência`;
  }
  return o.payment.confirmed ? `${label} · recebido` : `${label} · a cobrar`;
}

export function orderItemCount(o: Pick<Order, 'lines'>): number {
  return o.lines.reduce((s, l) => s + l.qty, 0);
}

/** Resumo formatado para WhatsApp (negrito *…* do WhatsApp). */
export function buildWhatsAppMessage(o: Order): string {
  const lines = o.lines.map((l) => {
    const sauce = l.sauce ? ` (${sauceShort(l.sauce)})` : '';
    const reward = l.reward ? ' 🎁 GRÁTIS' : '';
    return `• ${l.qty}x ${l.name}${sauce}${reward} — ${formatMT(l.unitPrice * l.qty)}`;
  });
  const parts = [
    `*${BRAND.fullName}*`,
    `🧾 *Pedido ${formatOrderNumber(o.number)}* · ${formatClock(o.createdAt)}`,
    '',
    ...lines,
    '',
    o.deliveryFee ? `Taxa de entrega: ${formatMT(o.deliveryFee)}` : '',
    `*TOTAL: ${formatMT(o.total)}*`,
    '',
    `📍 ${modeDetail(o)}${o.address ? ` — ${o.address}` : ''}`,
    orderMapsUrl(o) ? `Mapa: ${orderMapsUrl(o)}` : '',
    `👤 ${o.customerName} · ${formatPhoneMZ(o.customerPhone)}`,
    `💳 ${paymentSummary(o)}`,
    o.payment.smsCode ? `Comprovativo: ${o.payment.smsCode}` : '',
    o.notes ? `📝 ${o.notes}` : '',
    '',
    '_Pronto pagamento, ajuda-nos crescer. Muito obrigado_',
  ];
  return parts.filter((p, i, a) => !(p === '' && a[i - 1] === '')).join('\n').trim();
}

export function whatsappLink(number: string, text: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}

/** Talão térmico (80mm ≈ 42 colunas, texto simples monoespaçado). */
export function receiptText(o: Order, width = 42): string {
  const center = (s: string) => ' '.repeat(Math.max(0, Math.floor((width - s.length) / 2))) + s;
  const row = (l: string, r: string) => l + ' '.repeat(Math.max(1, width - l.length - r.length)) + r;
  const hr = '-'.repeat(width);
  const out: string[] = [
    center(BRAND.name),
    center(BRAND.tagline),
    center(BRAND.address),
    center(BRAND.phones[0]),
    hr,
    row(`PEDIDO ${formatOrderNumber(o.number)}`, formatClock(o.createdAt)),
    modeDetail(o).toUpperCase(),
    hr,
  ];
  for (const l of o.lines) {
    out.push(row(`${l.qty}x ${l.name}`, l.reward ? 'GRATIS' : formatMT(l.unitPrice * l.qty)));
    if (l.sauce) out.push(`   >> MOLHO: ${sauceShort(l.sauce).toUpperCase()}`);
    if (l.notes) out.push(`   Obs: ${l.notes}`);
  }
  out.push(hr);
  if (o.deliveryFee) out.push(row('Taxa entrega', formatMT(o.deliveryFee)));
  out.push(row('TOTAL', formatMT(o.total)));
  out.push(hr);
  out.push(`Cliente: ${o.customerName} ${formatPhoneMZ(o.customerPhone)}`);
  if (o.address) out.push(`Morada: ${o.address}`);
  if (o.lat != null && o.lng != null) out.push(`GPS: ${o.lat.toFixed(6)}, ${o.lng.toFixed(6)}`);
  out.push(`Pagamento: ${paymentSummary(o)}`);
  if (o.payment.smsCode) out.push(`Comprovativo: ${o.payment.smsCode}`);
  if (o.notes) out.push(`Obs: ${o.notes}`);
  out.push(hr);
  out.push(center('Servimos bem, para servir sempre'));
  return out.join('\n');
}
