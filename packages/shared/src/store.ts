import { DEFAULT_PIN, DEFAULT_ZONES, DEMO_PROFILE, BRAND, LOYALTY_GOAL } from './brand';
import {
  addLine,
  changeQty,
  computeTotals,
  hasErrors,
  loyaltyStatus,
  makeId,
  removeLine,
  validateCheckout,
} from './cart';
import { normalizePhone } from './format';
import { buildDefaultMenu } from './menu';
import { validateDeliveryPin } from './geo';
import { nextStatus, normalizePaymentProof, PAYMENT_PROOF_MIN } from './orders';
import { validateSauce } from './sauces';
import { buildSeedOrders, generateOrder, mulberry32 } from './seed';
import { isSameBusinessDay } from './time';
import type {
  AppSettings,
  AppState,
  CartLine,
  CheckoutDraft,
  CheckoutErrors,
  DeliveryZone,
  MenuItem,
  Order,
  OrderStatus,
  SauceId,
  StorageAdapter,
  SyncAdapter,
  SyncDelta,
} from './types';

export const STATE_VERSION = 3;

export type PlaceOrderResult = { ok: true; order: Order } | { ok: false; errors: CheckoutErrors };

export interface KotaStoreOptions {
  storage?: StorageAdapter;
  storageKey?: string;
  sync?: SyncAdapter;
  /** instante "agora" (testes) */
  now?: () => number;
}

export interface KotaStore {
  getState(): AppState;
  subscribe(listener: () => void): () => void;
  /** resolve quando o estado persistido (se assíncrono) foi carregado */
  ready: Promise<void>;
  syncName: string;
  actions: KotaActions;
}

export interface KotaActions {
  // Carrinho
  addToCart(itemId: string, opts?: { sauce?: SauceId; notes?: string; qty?: number }): { ok: boolean; error?: string };
  changeQty(lineId: string, delta: number): void;
  removeLine(lineId: string): void;
  clearCart(): void;
  setReward(itemId: string | null): void;
  // Sessão / perfil
  setTable(table: string | null): void;
  setProfile(p: Partial<{ name: string; phone: string }>): void;
  // Pedidos
  placeOrder(draft: CheckoutDraft): PlaceOrderResult;
  advanceOrder(id: string): void;
  setOrderStatus(id: string, status: OrderStatus): void;
  confirmPayment(id: string): void;
  submitPaymentProof(id: string, message: string): { ok: true } | { ok: false; error: string };
  simulateOrder(): Order;
  // Cardápio & stock
  setAvailable(itemId: string, available: boolean): void;
  setPrice(itemId: string, price: number): void;
  addCombo(input: { name: string; description?: string; price: number; includes: string[] }): MenuItem;
  removeCombo(itemId: string): void;
  setZoneFee(zoneId: string, fee: number): void;
  // Configurações
  setSettings(p: Partial<AppSettings>): void;
  resetDemo(): void;
}

function isPromise<T>(v: unknown): v is Promise<T> {
  return !!v && typeof (v as { then?: unknown }).then === 'function';
}

export function buildInitialState(now: number): AppState {
  const menu = buildDefaultMenu();
  const zones = DEFAULT_ZONES.map((z) => ({ ...z }));
  return {
    version: STATE_VERSION,
    menu,
    menuRev: 1,
    zones,
    zonesRev: 1,
    orders: buildSeedOrders({ menu, zones }, now),
    cart: [],
    profile: { ...DEMO_PROFILE },
    myOrderIds: [],
    session: { table: null },
    settings: { whatsapp: BRAND.whatsapp, adminPin: DEFAULT_PIN, soundOn: true },
  };
}

function mergeOrders(local: Order[], incoming: Order[]): Order[] {
  const map = new Map(local.map((o) => [o.id, o]));
  let changed = false;
  for (const o of incoming) {
    const cur = map.get(o.id);
    if (!cur || o.updatedAt > cur.updatedAt) {
      map.set(o.id, o);
      changed = true;
    }
  }
  if (!changed) return local;
  return [...map.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export function createKotaStore(opts: KotaStoreOptions = {}): KotaStore {
  const now = opts.now ?? Date.now;
  const key = opts.storageKey ?? 'kota-edu-state';
  const storage = opts.storage;
  const sync = opts.sync;

  let state: AppState = buildInitialState(now());
  const listeners = new Set<() => void>();
  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  function parse(raw: string | null): AppState | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as AppState;
      return parsed && parsed.version === STATE_VERSION ? parsed : null;
    } catch {
      return null;
    }
  }

  function persist() {
    if (!storage) return;
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      try {
        const r = storage.setItem(key, JSON.stringify(state));
        if (isPromise(r)) r.catch(() => undefined);
      } catch {
        /* quota / modo privado: ignora */
      }
    }, 120);
  }

  function setState(next: AppState) {
    state = next;
    listeners.forEach((l) => l());
    persist();
  }

  function patch(p: Partial<AppState>) {
    setState({ ...state, ...p });
  }

  function publish(delta: SyncDelta) {
    try {
      sync?.publish(delta);
    } catch {
      /* rede indisponível: o estado local continua válido */
    }
  }

  function applyDelta(delta: SyncDelta) {
    let next = state;
    if (delta.orders?.length) {
      const merged = mergeOrders(next.orders, delta.orders);
      if (merged !== next.orders) next = { ...next, orders: merged };
    }
    if (delta.menu && delta.menu.rev > next.menuRev) next = { ...next, menu: delta.menu.items, menuRev: delta.menu.rev };
    if (delta.zones && delta.zones.rev > next.zonesRev) next = { ...next, zones: delta.zones.items, zonesRev: delta.zones.rev };
    if (next !== state) setState(next);
  }

  // ── Hidratação (localStorage síncrono ou AsyncStorage assíncrono)
  let ready: Promise<void> = Promise.resolve();
  if (storage) {
    const raw = storage.getItem(key);
    if (isPromise<string | null>(raw)) {
      ready = raw
        .then((r) => {
          const saved = parse(r);
          if (saved) {
            state = saved;
            listeners.forEach((l) => l());
          }
        })
        .catch(() => undefined);
    } else {
      const saved = parse(raw);
      if (saved) state = saved;
    }
  }
  if (sync) {
    sync.subscribe(applyDelta);
    if (sync.fetchInitial) {
      ready = ready.then(() =>
        sync.fetchInitial!()
          .then((d) => {
            if (d) applyDelta(d);
          })
          .catch(() => undefined),
      );
    }
  }

  const touchOrder = (id: string, fn: (o: Order) => Order) => {
    const cur = state.orders.find((o) => o.id === id);
    if (!cur) return;
    const updated = { ...fn(cur), updatedAt: now() };
    patch({ orders: state.orders.map((o) => (o.id === id ? updated : o)) });
    publish({ orders: [updated] });
  };

  const nextNumber = () => {
    const t = now();
    return state.orders.filter((o) => isSameBusinessDay(o.createdAt, t)).reduce((m, o) => Math.max(m, o.number), 0) + 1;
  };

  const bumpMenu = (menu: MenuItem[]) => {
    const rev = Math.max(now(), state.menuRev + 1);
    patch({ menu, menuRev: rev });
    publish({ menu: { rev, items: menu } });
  };

  const actions: KotaActions = {
    addToCart(itemId, o = {}) {
      const item = state.menu.find((m) => m.id === itemId);
      if (!item) return { ok: false, error: 'Item não encontrado.' };
      if (!item.available) return { ok: false, error: 'Esgotado hoje.' };
      const err = validateSauce(item, o.sauce);
      if (err) return { ok: false, error: err };
      patch({ cart: addLine(state.cart, item, { sauce: o.sauce, notes: o.notes, qty: o.qty }) });
      return { ok: true };
    },
    changeQty: (lineId, delta) => patch({ cart: changeQty(state.cart, lineId, delta) }),
    removeLine: (lineId) => patch({ cart: removeLine(state.cart, lineId) }),
    clearCart: () => patch({ cart: [] }),
    setReward(itemId) {
      const without = state.cart.filter((l) => !l.reward);
      if (!itemId) return patch({ cart: without });
      const item = state.menu.find((m) => m.id === itemId && m.available);
      if (!item) return;
      patch({ cart: addLine(without, item, { reward: true }) });
    },

    setTable: (table) => patch({ session: { table } }),
    setProfile: (p) => patch({ profile: { ...state.profile, ...p } }),

    placeOrder(draft) {
      const lines = state.cart;
      const errors = validateCheckout(draft, 'all', lines);
      for (const l of lines) {
        const item = state.menu.find((m) => m.id === l.itemId);
        if (!item || !item.available) errors.cart = `"${l.name}" está esgotado. Remova-o do carrinho.`;
      }
      const reward = lines.find((l) => l.reward);
      if (reward && !loyaltyStatus(state.orders, draft.phone).rewardReady) {
        errors.cart = `Prémio indisponível: ainda não completou ${LOYALTY_GOAL} selos.`;
      }
      if (hasErrors(errors)) return { ok: false, errors };

      const totals = computeTotals(lines, draft.mode, state.zones, draft.zoneId);
      const zone = state.zones.find((z) => z.id === draft.zoneId);
      const digital = draft.payment === 'mpesa' || draft.payment === 'emola';
      const pinned = draft.mode === 'delivery' && validateDeliveryPin(draft.lat, draft.lng, draft.accuracy) == null;
      const t = now();
      const order: Order = {
        id: makeId('o'),
        number: nextNumber(),
        createdAt: t,
        updatedAt: t,
        status: 'recebido',
        timeline: { recebido: t },
        mode: draft.mode,
        table: draft.mode === 'mesa' ? draft.table.trim() : undefined,
        zoneId: draft.mode === 'delivery' ? zone?.id : undefined,
        zoneName: draft.mode === 'delivery' ? zone?.name : undefined,
        address: draft.mode === 'delivery' ? draft.address.trim() : undefined,
        lat: pinned ? draft.lat ?? undefined : undefined,
        lng: pinned ? draft.lng ?? undefined : undefined,
        accuracy: pinned ? draft.accuracy ?? undefined : undefined,
        deliveryFee: totals.deliveryFee,
        customerName: draft.name.trim(),
        customerPhone: draft.phone.trim(),
        lines: lines.map((l) => ({ ...l })),
        subtotal: totals.subtotal,
        total: totals.total,
        payment: {
          method: draft.payment,
          smsCode: digital ? normalizePaymentProof(draft.smsCode) || undefined : undefined,
          confirmed: false,
        },
        notes: draft.notes.trim() || undefined,
        rewardUsed: reward ? true : undefined,
      };
      patch({
        orders: [order, ...state.orders],
        cart: [],
        myOrderIds: [...state.myOrderIds, order.id],
        profile: { name: draft.name.trim(), phone: draft.phone.trim() },
      });
      publish({ orders: [order] });
      return { ok: true, order };
    },

    advanceOrder(id) {
      touchOrder(id, (o) => {
        const next = nextStatus(o.status);
        if (!next) return o;
        const timeline = { ...o.timeline, [next]: now() };
        const cashLike = o.payment.method === 'cash' || o.payment.method === 'pos';
        const payment = next === 'entregue' && cashLike ? { ...o.payment, confirmed: true } : o.payment;
        return { ...o, status: next, timeline, payment };
      });
    },
    setOrderStatus(id, status) {
      touchOrder(id, (o) => ({ ...o, status, timeline: { ...o.timeline, [status]: now() } }));
    },
    confirmPayment(id) {
      touchOrder(id, (o) => ({ ...o, payment: { ...o.payment, confirmed: true } }));
    },
    submitPaymentProof(id, message) {
      const text = normalizePaymentProof(message);
      if (text.length < PAYMENT_PROOF_MIN) return { ok: false, error: 'Cole a mensagem completa de confirmação da transferência.' };
      const cur = state.orders.find((o) => o.id === id);
      if (!cur) return { ok: false, error: 'Pedido não encontrado.' };
      if (cur.payment.method !== 'emola' && cur.payment.method !== 'mpesa') return { ok: false, error: 'Este pedido não é E-Mola nem M-Pesa.' };
      if (cur.payment.confirmed) return { ok: false, error: 'O pagamento já foi validado.' };
      touchOrder(id, (o) => ({ ...o, payment: { ...o.payment, smsCode: text } }));
      return { ok: true };
    },
    simulateOrder() {
      const rng = mulberry32(Math.floor(Math.random() * 1e9));
      const o = generateOrder(rng, { menu: state.menu.filter((m) => m.available), zones: state.zones }, now(), nextNumber());
      const order = { ...o, payment: { ...o.payment, confirmed: o.payment.method === 'cash' || o.payment.method === 'pos' ? false : rng() < 0.5 } };
      patch({ orders: [order, ...state.orders] });
      publish({ orders: [order] });
      return order;
    },

    setAvailable(itemId, available) {
      bumpMenu(state.menu.map((m) => (m.id === itemId ? { ...m, available } : m)));
    },
    setPrice(itemId, price) {
      if (!Number.isFinite(price) || price < 0) return;
      const p = Math.round(price * 100) / 100;
      patch({ cart: state.cart.map((l) => (l.itemId === itemId && !l.reward ? { ...l, unitPrice: p } : l)) });
      bumpMenu(state.menu.map((m) => (m.id === itemId ? { ...m, price: p } : m)));
    },
    addCombo({ name, description, price, includes }) {
      const combo: MenuItem = {
        id: makeId('combo'),
        name: name.trim(),
        description: description?.trim() || includes.map((id) => state.menu.find((m) => m.id === id)?.name).filter(Boolean).join(' + '),
        price: Math.max(0, price),
        category: 'combos',
        emoji: '🔥',
        sauceMode: includes.some((id) => state.menu.find((m) => m.id === id)?.sauceMode === 'required') ? 'required' : 'optional',
        available: true,
        badge: 'Promo',
        isCombo: true,
        comboOf: includes,
      };
      bumpMenu([combo, ...state.menu]);
      return combo;
    },
    removeCombo(itemId) {
      bumpMenu(state.menu.filter((m) => !(m.id === itemId && m.isCombo)));
      patch({ cart: state.cart.filter((l) => l.itemId !== itemId) });
    },
    setZoneFee(zoneId, fee) {
      if (!Number.isFinite(fee) || fee < 0) return;
      const zones: DeliveryZone[] = state.zones.map((z) => (z.id === zoneId ? { ...z, fee } : z));
      const rev = Math.max(now(), state.zonesRev + 1);
      patch({ zones, zonesRev: rev });
      publish({ zones: { rev, items: zones } });
    },

    setSettings: (p) => patch({ settings: { ...state.settings, ...p } }),
    resetDemo() {
      const fresh = buildInitialState(now());
      const keep = { settings: state.settings, profile: state.profile };
      setState({ ...fresh, ...keep, menuRev: Math.max(now(), state.menuRev + 1), zonesRev: Math.max(now(), state.zonesRev + 1) });
      publish({ orders: state.orders, menu: { rev: state.menuRev, items: state.menu }, zones: { rev: state.zonesRev, items: state.zones } });
    },
  };

  return {
    getState: () => state,
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    get ready() {
      return ready;
    },
    syncName: sync?.name ?? 'local',
    actions,
  };
}

// ───────────── Selectores utilitários ─────────────
export function selectMyOrders(s: AppState): Order[] {
  const ids = new Set(s.myOrderIds);
  const phone = normalizePhone(s.profile.phone);
  return s.orders
    .filter((o) => ids.has(o.id) || (phone.length === 9 && normalizePhone(o.customerPhone) === phone))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function selectMyActiveOrder(s: AppState): Order | null {
  const mine = selectMyOrders(s);
  return mine.find((o) => o.status !== 'entregue') ?? mine[0] ?? null;
}

export function selectCustomerOrders(s: AppState, phone: string): Order[] {
  const k = normalizePhone(phone);
  return s.orders.filter((o) => normalizePhone(o.customerPhone) === k);
}

export function selectCartLines(s: AppState): CartLine[] {
  return s.cart;
}
