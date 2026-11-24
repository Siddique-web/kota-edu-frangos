import { LOYALTY_GOAL, REWARD_ITEM_IDS } from './brand';
import { digitsOnly, isValidMzPhone, normalizePhone } from './format';
import { validateDeliveryPin } from './geo';
import { normalizePaymentProof, PAYMENT_PROOF_MIN } from './orders';
import { validateSauce } from './sauces';
import type {
  CartLine,
  CheckoutDraft,
  CheckoutErrors,
  DeliveryZone,
  MenuItem,
  Order,
  OrderMode,
  SauceId,
} from './types';

let counter = 0;
export function makeId(prefix = 'id'): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ───────────────────────── Carrinho ─────────────────────────

export interface AddLineOptions {
  sauce?: SauceId;
  notes?: string;
  qty?: number;
  reward?: boolean;
}

export function addLine(lines: CartLine[], item: MenuItem, opts: AddLineOptions = {}): CartLine[] {
  const qty = Math.max(1, opts.qty ?? 1);
  const notes = (opts.notes ?? '').trim() || undefined;
  const reward = !!opts.reward;
  const existing = lines.find(
    (l) => l.itemId === item.id && l.sauce === opts.sauce && (l.notes ?? '') === (notes ?? '') && !!l.reward === reward,
  );
  if (existing && !reward) {
    return lines.map((l) => (l.lineId === existing.lineId ? { ...l, qty: l.qty + qty } : l));
  }
  const line: CartLine = {
    lineId: makeId('l'),
    itemId: item.id,
    name: item.name,
    category: item.category,
    unitPrice: reward ? 0 : item.price,
    qty: reward ? 1 : qty,
    sauce: opts.sauce,
    notes,
    reward: reward || undefined,
  };
  return [...lines, line];
}

export function changeQty(lines: CartLine[], lineId: string, delta: number): CartLine[] {
  return lines
    .map((l) => (l.lineId === lineId && !l.reward ? { ...l, qty: l.qty + delta } : l))
    .filter((l) => l.qty > 0);
}

export function removeLine(lines: CartLine[], lineId: string): CartLine[] {
  return lines.filter((l) => l.lineId !== lineId);
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.qty, 0);
}

export function lineTotal(l: CartLine): number {
  return l.unitPrice * l.qty;
}

export function deliveryFee(mode: OrderMode, zones: DeliveryZone[], zoneId: string): number {
  if (mode !== 'delivery') return 0;
  return zones.find((z) => z.id === zoneId)?.fee ?? 0;
}

export function computeTotals(lines: CartLine[], mode: OrderMode, zones: DeliveryZone[], zoneId: string) {
  const subtotal = cartSubtotal(lines);
  const fee = deliveryFee(mode, zones, zoneId);
  return { subtotal, deliveryFee: fee, total: subtotal + fee };
}

// ───────────────────────── Upsell ─────────────────────────

export interface Upsell {
  item: MenuItem;
  reason: string;
}

/**
 * Motor de upsell: sugere bebida e/ou Pão Extra quando o pedido ainda não os tem.
 * Só sugere itens disponíveis e que ainda não estão no carrinho.
 */
export function getUpsells(lines: CartLine[], menu: MenuItem[], max = 3): Upsell[] {
  if (lines.length === 0) return [];
  const find = (id: string) => menu.find((m) => m.id === id && m.available);
  const inCart = (id: string) => lines.some((l) => l.itemId === id && !l.reward);

  const hasDrink = lines.some((l) => l.category === 'bebidas');
  const hasBread = inCart('pao-extra');
  const hasFrango = lines.some((l) => l.category === 'frangos');
  const hasGrilled = hasFrango || lines.some((l) => l.category === 'hamburguer');
  const hasMain = lines.some((l) => ['frangos', 'hamburguer', 'sandes', 'combos'].includes(l.category));
  const subtotal = cartSubtotal(lines);

  const out: Upsell[] = [];
  const push = (id: string | undefined, reason: string) => {
    const item = id ? find(id) : undefined;
    if (item && !inCart(item.id) && !out.some((o) => o.item.id === item.id)) out.push({ item, reason });
  };

  if (!hasDrink && hasMain) {
    push('refresco-txoti', 'Falta a bebida! O mais barato da casa.');
    push('agua-b-aqua-pequena', 'Hidrate-se com a grelha.');
  }
  if (hasGrilled && !hasBread) push('pao-extra', 'Mais pão para aproveitar o molho.');
  if (!hasDrink && hasFrango) push('refresco-lata', 'Casa bem com frango na brasa.');
  if (hasFrango && !inCart('dose-batata') && subtotal < 600) push('dose-batata', 'Acompanhamento para partilhar.');
  return out.slice(0, max);
}

// ───────────────────────── Fidelidade ─────────────────────────

export interface LoyaltyStatus {
  goal: number;
  earned: number; // pedidos entregues
  redeemed: number; // prémios já usados
  available: number; // selos disponíveis
  stamps: number; // selos visíveis no cartão (0..goal)
  rewardReady: boolean;
  remaining: number;
}

/** Selos derivados dos pedidos: 1 pedido entregue = 1 selo · 5 selos = 1 prémio. */
export function loyaltyStatus(orders: Order[], phone: string): LoyaltyStatus {
  const key = normalizePhone(phone);
  const mine = key ? orders.filter((o) => normalizePhone(o.customerPhone) === key) : [];
  const earned = mine.filter((o) => o.status === 'entregue').length;
  const redeemed = mine.filter((o) => o.rewardUsed).length;
  const available = Math.max(0, earned - redeemed * LOYALTY_GOAL);
  const rewardReady = available >= LOYALTY_GOAL;
  return {
    goal: LOYALTY_GOAL,
    earned,
    redeemed,
    available,
    stamps: Math.min(available, LOYALTY_GOAL),
    rewardReady,
    remaining: rewardReady ? 0 : LOYALTY_GOAL - available,
  };
}

export function rewardOptions(menu: MenuItem[]): MenuItem[] {
  return REWARD_ITEM_IDS.map((id) => menu.find((m) => m.id === id && m.available)).filter(Boolean) as MenuItem[];
}

// ───────────────────────── Checkout ─────────────────────────

export function emptyDraft(table?: string | null, profile?: { name: string; phone: string }): CheckoutDraft {
  return {
    mode: table ? 'mesa' : 'takeaway',
    table: table ?? '',
    zoneId: '',
    address: '',
    lat: null,
    lng: null,
    accuracy: null,
    name: profile?.name ?? '',
    phone: profile?.phone ?? '',
    notes: '',
    payment: 'mpesa',
    smsCode: '',
    sendWhatsapp: false,
  };
}

/** step 1 = Entrega · step 2 = Pagamento · 'all' valida tudo. */
export function validateCheckout(draft: CheckoutDraft, step: 1 | 2 | 'all', lines: CartLine[]): CheckoutErrors {
  const e: CheckoutErrors = {};
  if (lines.length === 0) e.cart = 'O carrinho está vazio.';
  if (step === 1 || step === 'all') {
    if (draft.name.trim().length < 2) e.name = 'Indique o seu nome.';
    if (!isValidMzPhone(draft.phone)) e.phone = 'Telemóvel inválido (ex.: 84 123 4567).';
    if (draft.mode === 'mesa' && !digitsOnly(draft.table)) e.table = 'Indique o número da mesa.';
    if (draft.mode === 'delivery') {
      if (!draft.zoneId) e.zoneId = 'Escolha o seu bairro.';
      if (draft.address.trim().length < 4) e.address = 'Indique uma referência para o estafeta.';
      const pin = validateDeliveryPin(draft.lat, draft.lng, draft.accuracy);
      if (pin) e.lat = pin;
    }
  }
  if (step === 2 || step === 'all') {
    const proof = normalizePaymentProof(draft.smsCode);
    if (proof && proof.length < PAYMENT_PROOF_MIN) {
      e.smsCode = 'Cole a mensagem completa de confirmação da transferência.';
    }
  }
  return e;
}

export function hasErrors(e: CheckoutErrors): boolean {
  return Object.keys(e).length > 0;
}

/** Extrai o nº da mesa de um QR (ex.: "https://x.app/?mesa=7", "mesa:7" ou "7"). */
export function parseTableFromQr(data: string): string | null {
  const text = (data || '').trim();
  const m = text.match(/mesa[=:/\s-]*(\d{1,3})/i) || text.match(/^(\d{1,3})$/);
  return m ? String(parseInt(m[1], 10)) : null;
}
