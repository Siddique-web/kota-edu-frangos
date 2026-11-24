import { describe, expect, it } from 'vitest';
import {
  addLine, buildDecisionDesk, buildDefaultMenu, buildInsights, buildLedger, buildSeedOrders, buildWhatsAppMessage, cartSubtotal, computeStats, mapsDirectionsUrl, validateDeliveryPin,
  KITCHEN_BUSY_AT, KITCHEN_BUSY_MESSAGE, preparingCount,
  createKotaStore, DEFAULT_ZONES, emptyDraft, formatMT, getUpsells, loyaltyStatus, parseTableFromQr, selectMyOrders, validateCheckout,
  MENU_ITEM_COUNT, startOfBusinessDay, isSameBusinessDay,
} from '../src';
import type { StorageAdapter } from '../src';

const menu = buildDefaultMenu();
const item = (id: string) => menu.find((m) => m.id === id)!;

describe('cardápio', () => {
  it('tem exatamente 30 itens com preços oficiais', () => {
    expect(menu).toHaveLength(30);
    expect(MENU_ITEM_COUNT).toBe(30);
    expect(item('frango-quarto-classico').price).toBe(250);
    expect(item('frango-inteiro').price).toBe(950);
    expect(item('pao-extra').price).toBe(10);
    expect(item('red-bull').price).toBe(125);
    expect(new Set(menu.map((m) => m.id)).size).toBe(30);
  });
  it('formata meticais', () => {
    expect(formatMT(250)).toBe('250,00 MT');
    expect(formatMT(1250.5)).toBe('1 250,50 MT');
  });
});

describe('carrinho & upsell', () => {
  it('junta linhas iguais e separa molhos diferentes', () => {
    let l = addLine([], item('frango-metade'), { sauce: 'original' });
    l = addLine(l, item('frango-metade'), { sauce: 'original' });
    l = addLine(l, item('frango-metade'), { sauce: 'chillies-fogo' });
    expect(l).toHaveLength(2);
    expect(cartSubtotal(l)).toBe(1500);
  });
  it('sugere bebida e pão extra quando faltam', () => {
    const lines = addLine([], item('frango-quarto-classico'), { sauce: 'original' });
    const ids = getUpsells(lines, menu).map((u) => u.item.id);
    expect(ids).toContain('refresco-txoti');
    expect(ids).toContain('pao-extra');
  });
  it('não sugere bebida se já existe', () => {
    let lines = addLine([], item('hamb-simples'));
    lines = addLine(lines, item('refresco-txoti'));
    expect(getUpsells(lines, menu).some((u) => u.item.category === 'bebidas')).toBe(false);
  });
  it('lê mesa do QR', () => {
    expect(parseTableFromQr('https://kotaedu.app/?mesa=7')).toBe('7');
    expect(parseTableFromQr('mesa:12')).toBe('12');
    expect(parseTableFromQr('xyz')).toBeNull();
  });
});

function memStorage(): StorageAdapter {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

describe('store', () => {
  it('exige molho para frango e bloqueia esgotados', () => {
    const s = createKotaStore({ storage: memStorage() });
    expect(s.actions.addToCart('frango-metade').ok).toBe(false);
    expect(s.actions.addToCart('frango-metade', { sauce: 'chillies-suave' }).ok).toBe(true);
    s.actions.setAvailable('refresco-txoti', false);
    expect(s.actions.addToCart('refresco-txoti').ok).toBe(false);
  });

  it('mostra todos os pedidos do telemóvel e guarda o comprovativo E-Mola', () => {
    const s = createKotaStore({ storage: memStorage() });
    s.actions.setProfile({ name: 'Teste', phone: '84 555 1234' });
    s.actions.addToCart('frango-quarto-classico', { sauce: 'original' });
    const placed = s.actions.placeOrder({ ...emptyDraft(), name: 'Teste', phone: '84 555 1234', payment: 'emola', smsCode: '' });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(selectMyOrders(s.getState()).some((o) => o.id === placed.order.id)).toBe(true);
    const short = s.actions.submitPaymentProof(placed.order.id, 'curto');
    expect(short.ok).toBe(false);
    const msg = 'Confirmado. Transferiu 250.00 MT para 879071974. Ref EMO123456.';
    const proof = s.actions.submitPaymentProof(placed.order.id, msg);
    expect(proof.ok).toBe(true);
    const saved = s.getState().orders.find((o) => o.id === placed.order.id)!;
    expect(saved.payment.smsCode).toBe(msg);
    expect(saved.payment.confirmed).toBe(false);
    s.actions.confirmPayment(placed.order.id);
    expect(s.actions.submitPaymentProof(placed.order.id, msg).ok).toBe(false);
  });
  it('faz o fluxo completo: pedido → KDS → entregue, com taxa de delivery', () => {
    const s = createKotaStore({ storage: memStorage() });
    s.actions.addToCart('frango-quarto-classico', { sauce: 'chillies-fogo' });
    s.actions.addToCart('refresco-txoti');
    const draft = { ...emptyDraft(), mode: 'delivery' as const, zoneId: 'macuti', address: 'Perto do mercado', lat: -19.847, lng: 34.905, accuracy: 12, name: 'Teste', phone: '84 555 1234', payment: 'mpesa' as const, smsCode: 'ABC123DEF4' };
    const before = s.getState().orders.length;
    const r = s.actions.placeOrder(draft);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order.deliveryFee).toBe(DEFAULT_ZONES.find((z) => z.id === 'macuti')!.fee);
    expect(r.order.lat).toBe(-19.847);
    expect(r.order.lng).toBe(34.905);
    expect(r.order.total).toBe(285 + r.order.deliveryFee);
    expect(s.getState().orders.length).toBe(before + 1);
    expect(s.getState().cart).toHaveLength(0);
    s.actions.advanceOrder(r.order.id);
    s.actions.advanceOrder(r.order.id);
    s.actions.advanceOrder(r.order.id);
    const done = s.getState().orders.find((o) => o.id === r.order.id)!;
    expect(done.status).toBe('entregue');
    expect(done.timeline.entregue).toBeTruthy();
  });

  it('valida checkout', () => {
    const lines = addLine([], item('hamb-simples'));
    const e = validateCheckout({ ...emptyDraft(), mode: 'delivery', name: '', phone: '12' }, 1, lines);
    expect(Object.keys(e)).toEqual(expect.arrayContaining(['name', 'phone', 'zoneId', 'address', 'lat']));
  });

  it('sincroniza deltas entre dois stores', () => {
    const handlers: Array<(d: any) => void> = [];
    const mk = () => ({ name: 'mem', publish: (d: any) => handlers.forEach((h) => h(d)), subscribe: (h: any) => { handlers.push(h); return () => undefined; } });
    const a = createKotaStore({ sync: mk() });
    const b = createKotaStore({ sync: mk() });
    // publica só para o outro (o próprio também recebe, mas o merge é idempotente)
    a.actions.setAvailable('monster', false);
    expect(b.getState().menu.find((m) => m.id === 'monster')!.available).toBe(false);
    const o = a.actions.simulateOrder();
    expect(b.getState().orders.some((x) => x.id === o.id)).toBe(true);
  });

  it('persiste e recarrega o estado', async () => {
    const st = memStorage();
    const a = createKotaStore({ storage: st });
    a.actions.setPrice('pao-extra', 15);
    await new Promise((r) => setTimeout(r, 200));
    const b = createKotaStore({ storage: st });
    expect(b.getState().menu.find((m) => m.id === 'pao-extra')!.price).toBe(15);
  });

  it('resgata prémio com 5 selos', () => {
    const s = createKotaStore({ storage: memStorage() });
    const phone = '86 999 0000';
    for (let i = 0; i < 5; i++) {
      s.actions.addToCart('sande-queijo');
      const r = s.actions.placeOrder({ ...emptyDraft(), mode: 'takeaway', name: 'Fiel', phone, payment: 'cash' });
      expect(r.ok).toBe(true);
      if (r.ok) { s.actions.setOrderStatus(r.order.id, 'entregue'); }
    }
    expect(loyaltyStatus(s.getState().orders, phone).rewardReady).toBe(true);
    s.actions.setReward('refresco-txoti');
    const r = s.actions.placeOrder({ ...emptyDraft(), mode: 'takeaway', name: 'Fiel', phone, payment: 'cash' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.order.total).toBe(0);
    expect(loyaltyStatus(s.getState().orders, phone).rewardReady).toBe(false);
  });
});

describe('seed & analytics', () => {
  const now = Date.now();
  const orders = buildSeedOrders({ menu, zones: DEFAULT_ZONES }, now);
  it('gera 7 dias de histórico e pedidos ativos para a cozinha', () => {
    expect(orders.length).toBeGreaterThan(150);
    const stats = computeStats(orders, '7d', now);
    expect(stats.byDay).toHaveLength(7);
    expect(stats.byDay.every((d) => d.orders > 0)).toBe(true);
    expect(orders.filter((o) => o.status !== 'entregue').length).toBe(5);
    expect(orders.every((o) => o.createdAt <= now)).toBe(true);
  });
  it('pagamentos somam 100% e total bate certo', () => {
    const s = computeStats(orders, '7d', now);
    expect(s.payments.reduce((a, p) => a + p.total, 0)).toBe(s.revenue);
    expect(Math.round(s.payments.reduce((a, p) => a + p.pct, 0))).toBeGreaterThanOrEqual(99);
    expect(s.peakHours).toHaveLength(17);
  });
  it('cliente demo tem 3 selos e 3 insights', () => {
    expect(loyaltyStatus(orders, '84 123 4567').stamps).toBe(3);
    const ins = buildInsights(computeStats(orders, '7d', now), menu);
    expect(ins).toHaveLength(3);
    expect(new Set(ins.map((i) => i.id)).size).toBe(3);
  });
  it('dia de negócio vira às 05:00', () => {
    const d = new Date(2026, 10, 24, 0, 26).getTime();
    const prev = new Date(2026, 10, 23, 20, 0).getTime();
    const morning = new Date(2026, 10, 24, 6, 0).getTime();
    expect(isSameBusinessDay(d, prev)).toBe(true);
    expect(isSameBusinessDay(d, morning)).toBe(false);
    expect(startOfBusinessDay(d)).toBe(new Date(2026, 10, 23, 5, 0).getTime());
  });
  it('conta só pedidos ainda em preparação', () => {
    const sample = [
      ...Array.from({ length: 6 }, () => ({ status: 'recebido' as const })),
      ...Array.from({ length: 4 }, () => ({ status: 'na_grelha' as const })),
      { status: 'pronto' as const },
      { status: 'entregue' as const },
    ];
    expect(preparingCount(sample)).toBe(10);
    expect(preparingCount(sample) >= KITCHEN_BUSY_AT).toBe(true);
    expect(KITCHEN_BUSY_MESSAGE).toContain('muitos pedidos');
  });
  it('mensagem de WhatsApp contém total e molho', () => {
    const msg = buildWhatsAppMessage(orders[0]);
    expect(msg).toContain('KOTA EDU FRANGOS');
    expect(msg).toContain('TOTAL');
  });
});

describe('localização e fecho', () => {
  it('aceita um ponto em Beira e recusa um ponto longe ou impreciso', () => {
    expect(validateDeliveryPin(-19.844, 34.85, 18)).toBeNull();
    expect(validateDeliveryPin(null, null, null)).toMatch(/Marque/);
    expect(validateDeliveryPin(-25.97, 32.57, 10)).toMatch(/fora/);
    expect(validateDeliveryPin(-19.844, 34.85, 250)).toMatch(/impreciso/);
    expect(mapsDirectionsUrl(-19.844, 34.85)).toContain('destination=-19.844000%2C34.850000');
  });

  it('filtra o fecho por dia e por pagamento', () => {
    const now = Date.now();
    const orders = buildSeedOrders({ menu, zones: DEFAULT_ZONES }, now);
    const open = { mode: 'todos' as const, payment: 'todos' as const, status: 'todos' as const, q: '' };
    const all = buildLedger(orders, { range: 'tudo', ...open }, now);
    const today = buildLedger(orders, { range: 'hoje', ...open }, now);
    expect(all.count).toBe(orders.length);
    expect(today.count).toBeLessThan(all.count);
    expect(today.revenue).toBe(today.orders.reduce((s, o) => s + o.total, 0));
    expect(today.confirmed + today.pending).toBe(today.revenue);
    const cash = buildLedger(orders, { range: 'tudo', ...open, payment: 'cash' }, now);
    expect(cash.count).toBeGreaterThan(0);
    expect(cash.orders.every((o) => o.payment.method === 'cash')).toBe(true);
    const none = buildLedger(orders, { range: 'intervalo', ...open }, now);
    expect(none.count).toBe(0);
    const from = startOfBusinessDay(now);
    const day = today.label.replace('Hoje · ', '');
    const span = buildLedger(orders, { range: 'intervalo', ...open, from, to: from + 24 * 3600_000 }, now);
    expect(span.label).toBe(`${day} – ${day}`);
    expect(span.count).toBe(today.count);
  });
});

describe('mesa de decisão', () => {
  it('separa o caixa confirmado dos comprovativos por validar', () => {
    const s = createKotaStore({ storage: memStorage() });
    s.actions.setProfile({ name: 'Teste', phone: '84 555 1234' });
    s.actions.addToCart('agua-b-aqua-pequena');
    const cash = s.actions.placeOrder({ ...emptyDraft(), name: 'Teste', phone: '84 555 1234', payment: 'cash' });
    expect(cash.ok).toBe(true);
    if (!cash.ok) return;
    s.actions.advanceOrder(cash.order.id);
    s.actions.advanceOrder(cash.order.id);
    s.actions.advanceOrder(cash.order.id);

    s.actions.addToCart('refresco-txoti');
    const emola = s.actions.placeOrder({ ...emptyDraft(), name: 'Teste', phone: '84 555 1234', payment: 'emola', smsCode: '' });
    expect(emola.ok).toBe(true);
    if (!emola.ok) return;
    const proof = s.actions.submitPaymentProof(emola.order.id, 'Confirmado. Transferiu 35.00 MT para 879071974.');
    expect(proof.ok).toBe(true);
    s.actions.setAvailable('agua-b-aqua-pequena', false);

    const ids = new Set([cash.order.id, emola.order.id]);
    const desk = buildDecisionDesk(s.getState().orders.filter((o) => ids.has(o.id)), s.getState().menu);
    expect(desk.proofs.count).toBe(1);
    expect(desk.proofs.amount).toBe(35);
    expect(desk.drawerTotal).toBe(30);
    expect(desk.soldOut).toContain('Água Pequena B. aqua');
    expect(desk.alerts.some((a) => a.id === 'proofs')).toBe(true);
    expect(desk.moves[0]?.id).toBe('proofs');
    expect(desk.open.some((o) => o.id === emola.order.id && o.urgent)).toBe(true);
    expect(desk.repeats[0]?.orders).toBe(2);
    expect(desk.open.some((o) => o.id === cash.order.id)).toBe(false);
  });
});
