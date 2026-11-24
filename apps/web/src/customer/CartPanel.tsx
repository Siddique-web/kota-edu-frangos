import {
  BRAND,
  buildWhatsAppMessage,
  cartCount,
  cartSubtotal,
  computeTotals,
  DIGITAL_PAYMENTS,
  emptyDraft,
  formatMT,
  getUpsells,
  mapsPinUrl,
  validateDeliveryPin,
  hasErrors,
  lineTotal,
  loyaltyStatus,
  MODE_LABEL,
  PAYMENT_ACCOUNTS,
  PAYMENT_LABEL,
  rewardOptions,
  validateCheckout,
  whatsappLink,
  type CheckoutDraft,
  type CheckoutErrors,
  type OrderMode,
  type PaymentMethod,
} from '@kota/shared';
import { Banknote, Bike, Check, ClipboardPaste, Copy, CreditCard, Gift, MapPin, MessageCircle, ShoppingBag, ShoppingCart, Smartphone, Trash2, UtensilsCrossed } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { copyText, readClipboard, vibrate } from '../lib/hooks';
import { ItemIcon } from '../lib/marks';
import { actions, useAppState } from '../lib/store';
import { useToast } from '../lib/toast';
import { Qty, SauceTag } from './ui';

const STEPS = ['Carrinho', 'Entrega', 'Pagamento'];

/**
 * Carrinho + checkout em 3 etapas rápidas (Carrinho → Entrega → Pagamento).
 * Usado como Sticky Sidebar (≥1280px) e como ecrã completo no mobile/tablet.
 */
export function CartPanel({ onPlaced, onBackToMenu }: { onPlaced: () => void; onBackToMenu: () => void }) {
  const state = useAppState();
  const toast = useToast();
  const { cart, menu, zones, orders, profile, session, settings } = state;
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<CheckoutDraft>(() => emptyDraft(session.table, profile));
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const top = useRef<HTMLDivElement>(null);

  // Mesa por QR muda → atualiza rascunho
  useEffect(() => {
    if (session.table) setDraft((d) => ({ ...d, mode: 'mesa', table: session.table! }));
  }, [session.table]);

  const patch = (p: Partial<CheckoutDraft>) => {
    setDraft((d) => ({ ...d, ...p }));
    setErrors((e) => {
      const n = { ...e };
      (Object.keys(p) as Array<keyof CheckoutDraft>).forEach((k) => delete n[k]);
      return n;
    });
  };

  const goto = (n: number) => {
    setStep(n);
    top.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const totals = computeTotals(cart, draft.mode, zones, draft.zoneId);
  const loyalty = loyaltyStatus(orders, draft.phone || profile.phone);
  const upsells = getUpsells(cart, menu);
  const hasReward = cart.some((l) => l.reward);

  const next = () => {
    if (step === 0) {
      if (cart.length === 0) return;
      return goto(1);
    }
    if (step === 1) {
      const e = validateCheckout(draft, 1, cart);
      setErrors(e);
      if (hasErrors(e)) return vibrate(40);
      return goto(2);
    }
  };

  const submit = () => {
    const res = actions.placeOrder(draft);
    if (!res.ok) {
      setErrors(res.errors);
      if (res.errors.cart) toast(res.errors.cart, 'err');
      if (res.errors.name || res.errors.phone || res.errors.table || res.errors.zoneId || res.errors.address || res.errors.lat) goto(1);
      return;
    }
    vibrate(30);
    toast(`Pedido enviado para a cozinha!`);
    if (draft.sendWhatsapp) window.open(whatsappLink(settings.whatsapp || BRAND.whatsapp, buildWhatsAppMessage(res.order)), '_blank', 'noopener');
    setStep(0);
    setDraft(emptyDraft(session.table, { name: draft.name, phone: draft.phone }));
    onPlaced();
  };

  if (cart.length === 0 && step === 0) {
    return (
      <div className="card-pad text-center" ref={top}>
        <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-coal-700 text-neutral-300">
          <ShoppingCart size={28} />
        </div>
        <h2 className="font-display text-2xl font-semibold uppercase">Pedido em curso</h2>
        <p className="mt-1 text-sm text-neutral-400">Ainda vazio. Escolha o frango e o molho — o total aparece aqui.</p>
        <button className="btn-primary mt-4" onClick={onBackToMenu}>
          Ver cardápio
        </button>
      </div>
    );
  }

  return (
    <div className="card" ref={top}>
      {/* Indicador de etapas */}
      <ol className="flex items-center gap-1 border-b border-coal-600 bg-coal-900/60 px-3 py-3" aria-label="Etapas do pedido">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <button
              onClick={() => i < step && goto(i)}
              disabled={i > step}
              className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold transition ${
                i === step ? 'bg-ember text-white' : i < step ? 'bg-coal-600 text-gold-400' : 'bg-coal-800 text-neutral-500'
              }`}
              aria-current={i === step ? 'step' : undefined}
            >
              {i < step ? <Check size={14} /> : <span className="text-[11px] opacity-80">{i + 1}</span>} {s}
            </button>
          </li>
        ))}
      </ol>

      <div className="p-4">
        {step === 0 && (
          <div className="space-y-4">
            <ul className="divide-y divide-coal-600">
              {cart.map((l) => (
                <li key={l.lineId} className="flex items-start gap-3 py-3 first:pt-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold leading-snug">
                      {l.reward && <Gift size={14} className="mr-1 inline text-gold" />}
                      {l.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <SauceTag id={l.sauce} />
                      {l.notes && <span className="text-xs italic text-neutral-400">“{l.notes}”</span>}
                    </div>
                    <p className="mt-1 text-sm text-gold-400">{l.reward ? 'GRÁTIS' : formatMT(lineTotal(l))}</p>
                  </div>
                  {l.reward ? (
                    <button aria-label="Remover prémio" onClick={() => actions.removeLine(l.lineId)} className="tap grid place-items-center rounded-xl text-neutral-400 hover:text-ember-400">
                      <Trash2 size={18} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Qty qty={l.qty} onMinus={() => (l.qty === 1 ? actions.removeLine(l.lineId) : actions.changeQty(l.lineId, -1))} onPlus={() => actions.changeQty(l.lineId, 1)} />
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {/* Prémio de fidelidade */}
            {loyalty.rewardReady && !hasReward && (
              <div className="rounded-2xl border border-gold/40 bg-gold/10 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-gold-400">
                  <Gift size={18} /> Tem um prémio de fidelidade! Escolha o seu grátis:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {rewardOptions(menu).map((m) => (
                    <button key={m.id} className="btn-gold btn-sm" onClick={() => actions.setReward(m.id)}>
                      <ItemIcon item={m} size={16} /> {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Upsell inteligente */}
            {upsells.length > 0 && (
              <div>
                <p className="label">Combina bem com…</p>
                <div className="grid gap-2">
                  {upsells.map(({ item, reason }) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        actions.addToCart(item.id);
                        vibrate();
                      }}
                      className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-dashed border-gold/40 bg-gold/5 px-3 py-2 text-left transition active:scale-[.99] hover:bg-gold/10"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-coal-800 text-gold-400">
                        <ItemIcon item={item} size={20} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{item.name}</span>
                        <span className="block text-xs text-neutral-400">{reason}</span>
                      </span>
                      <span className="shrink-0 text-sm font-bold text-gold-400">+ {formatMT(item.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <p className="label">Como quer receber?</p>
              <div className="grid grid-cols-3 gap-2" role="radiogroup">
                {([
                  ['mesa', UtensilsCrossed],
                  ['takeaway', ShoppingBag],
                  ['delivery', Bike],
                ] as Array<[OrderMode, typeof Bike]>).map(([m, Icon]) => (
                  <button
                    key={m}
                    role="radio"
                    aria-checked={draft.mode === m}
                    onClick={() => patch({ mode: m })}
                    className={`flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-2xl border text-[13px] font-semibold transition active:scale-[.97] ${
                      draft.mode === m ? 'border-ember bg-ember/15 text-white' : 'border-coal-500 bg-coal-900 text-neutral-300'
                    }`}
                  >
                    <Icon size={22} className={draft.mode === m ? 'text-ember-400' : ''} />
                    {MODE_LABEL[m]}
                  </button>
                ))}
              </div>
            </div>

            {draft.mode === 'mesa' && (
              <Field label="Nº da mesa" error={errors.table} id="mesa">
                <input id="mesa" className="input" inputMode="numeric" placeholder="Ex.: 7" value={draft.table} onChange={(e) => patch({ table: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
                {session.table && <p className="mt-1.5 flex items-center gap-1 text-xs text-gold-400"><Check size={13} /> Mesa {session.table} detetada pelo QR Code.</p>}
              </Field>
            )}

            {draft.mode === 'takeaway' && (
              <div className="flex gap-3 rounded-2xl border border-coal-500 bg-coal-900 p-3 text-sm">
                <MapPin className="mt-0.5 shrink-0 text-ember-400" size={18} />
                <p>
                  <strong>Levante em:</strong> {BRAND.address}, {BRAND.city}.<br />
                  <span className="text-neutral-400">Avisamos por telemóvel quando estiver pronto.</span>
                </p>
              </div>
            )}

            {draft.mode === 'delivery' && (
              <>
                <div>
                  <p className="label">Bairro (taxa automática)</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2" role="radiogroup">
                    {zones.map((z) => (
                      <button
                        key={z.id}
                        role="radio"
                        aria-checked={draft.zoneId === z.id}
                        onClick={() => patch({ zoneId: z.id })}
                        className={`flex min-h-[52px] flex-col items-start justify-center rounded-xl border px-3 text-left transition ${
                          draft.zoneId === z.id ? 'border-gold bg-gold/10' : 'border-coal-500 bg-coal-900'
                        }`}
                      >
                        <span className="text-sm font-semibold">{z.name}</span>
                        <span className="text-xs text-gold-400">+ {formatMT(z.fee)}</span>
                      </button>
                    ))}
                  </div>
                  {errors.zoneId && <p className="err">{errors.zoneId}</p>}
                </div>
                <Field label="Referência / morada" error={errors.address} id="addr">
                  <textarea id="addr" rows={2} className="input min-h-[72px] py-2.5" placeholder="Rua, nº da casa, ponto de referência…" value={draft.address} onChange={(e) => patch({ address: e.target.value })} />
                </Field>
                <LocationMark
                  lat={draft.lat}
                  lng={draft.lng}
                  accuracy={draft.accuracy}
                  error={errors.lat}
                  onPin={(pin) => patch(pin)}
                />
              </>
            )}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Field label="O seu nome" error={errors.name} id="nome">
                <input id="nome" className="input" autoComplete="name" value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Nome" />
              </Field>
              <Field label="Telemóvel" error={errors.phone} id="tel">
                <input id="tel" className="input" inputMode="tel" autoComplete="tel" value={draft.phone} onChange={(e) => patch({ phone: e.target.value })} placeholder="84 123 4567" />
              </Field>
            </div>
            <Field label="Observações do pedido (opcional)" id="notes">
              <input id="notes" className="input" value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Ex.: ligar ao chegar" maxLength={140} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <p className="label">Forma de pagamento</p>
              <div className="grid grid-cols-2 gap-2" role="radiogroup">
                {(['mpesa', 'emola', 'cash', 'pos'] as PaymentMethod[]).map((m) => {
                  const Icon = m === 'cash' ? Banknote : m === 'pos' ? CreditCard : Smartphone;
                  return (
                    <button
                      key={m}
                      role="radio"
                      aria-checked={draft.payment === m}
                      onClick={() => patch({ payment: m })}
                      className={`flex min-h-[56px] items-center gap-2.5 rounded-2xl border px-3 text-left text-sm font-semibold transition active:scale-[.98] ${
                        draft.payment === m ? 'border-ember bg-ember/15' : 'border-coal-500 bg-coal-900 text-neutral-300'
                      }`}
                    >
                      <Icon size={20} className={draft.payment === m ? 'text-ember-400' : ''} />
                      {PAYMENT_LABEL[m]}
                    </button>
                  );
                })}
              </div>
            </div>

            {DIGITAL_PAYMENTS.includes(draft.payment) && <MobileMoneyBox method={draft.payment as 'mpesa' | 'emola'} total={totals.total} code={draft.smsCode} error={errors.smsCode} onCode={(v) => patch({ smsCode: v })} />}
            {draft.payment === 'cash' && <Note>Pague em dinheiro {draft.mode === 'delivery' ? 'ao estafeta' : 'no balcão / à mesa'}. Leve o valor certo se puder.</Note>}
            {draft.payment === 'pos' && <Note>Pague com cartão no terminal P.O.S {draft.mode === 'delivery' ? 'levado pelo estafeta' : 'no balcão / à mesa'}.</Note>}

            <label className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-2xl border border-coal-500 bg-coal-900 px-3">
              <input type="checkbox" className="h-5 w-5 accent-[#25D366]" checked={draft.sendWhatsapp} onChange={(e) => patch({ sendWhatsapp: e.target.checked })} />
              <MessageCircle size={20} className="text-[#25D366]" />
              <span className="text-sm">Enviar também o resumo por <strong>WhatsApp</strong> ao restaurante</span>
            </label>
          </div>
        )}
      </div>

      {/* Rodapé: totais + ação */}
      <div className="sticky bottom-[4.5rem] z-30 border-t border-coal-600 bg-coal-900/95 p-4 backdrop-blur lg:static">
        <dl className="mb-3 space-y-1 text-sm">
          <Row label={`Subtotal (${cartCount(cart)} itens)`} value={formatMT(cartSubtotal(cart))} />
          {draft.mode === 'delivery' && <Row label={`Entrega${draft.zoneId ? '' : ' (escolha o bairro)'}`} value={draft.zoneId ? formatMT(totals.deliveryFee) : '—'} />}
          <div className="flex items-baseline justify-between border-t border-coal-600 pt-2">
            <dt className="font-display text-lg uppercase">Total</dt>
            <dd className="font-display text-2xl font-bold text-gold-400">{formatMT(totals.total)}</dd>
          </div>
        </dl>
        <div className="flex gap-2">
          {step > 0 && (
            <button className="btn-ghost" onClick={() => goto(step - 1)}>
              Voltar
            </button>
          )}
          {step < 2 ? (
            <button className="btn-primary flex-1" onClick={next} disabled={cart.length === 0}>
              Continuar
            </button>
          ) : (
            <button className="btn-primary flex-1" onClick={submit}>
              Confirmar pedido · {formatMT(totals.total)}
            </button>
          )}
        </div>
        {step === 0 && cart.length > 0 && (
          <button onClick={() => actions.clearCart()} className="mt-2 w-full text-center text-xs text-neutral-500 hover:text-ember-400">
            Esvaziar carrinho
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, error, id, children }: { label: string; error?: string; id: string; children: ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      {children}
      {error && <p className="err">{error}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-neutral-300">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function LocationMark({ lat, lng, accuracy, error, onPin }: { lat: number | null; lng: number | null; accuracy: number | null; error?: string; onPin: (pin: { lat: number; lng: number; accuracy: number }) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const live = lat != null ? validateDeliveryPin(lat, lng, accuracy) : null;
  const mark = () => {
    if (!navigator.geolocation) {
      toast('Este aparelho não deu acesso à localização.', 'err');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        onPin({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        vibrate();
      },
      (err) => {
        setBusy(false);
        toast(err.code === err.PERMISSION_DENIED ? 'Autorize a localização para marcar a entrega.' : 'Não foi possível ler o GPS. Tente outra vez ao ar livre.', 'err');
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };
  return (
    <div className="space-y-2">
      <p className="label">Localização da entrega</p>
      <button type="button" className="btn-gold w-full" onClick={mark} disabled={busy}>
        <MapPin size={18} /> {busy ? 'A ler o GPS…' : lat != null ? 'Marcar outra vez' : 'Marcar a minha localização'}
      </button>
      {lat != null && lng != null && !live && (
        <p className="text-sm text-green-300">
          Localização marcada{accuracy != null && Number.isFinite(accuracy) ? ` · precisão ${Math.round(accuracy)} m` : ''}.{' '}
          <a className="underline" href={mapsPinUrl(lat, lng)} target="_blank" rel="noreferrer">Confirmar no mapa</a>
        </p>
      )}
      {(error || live) && <p className="err">{error || live}</p>}
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-coal-500 bg-coal-900 p-3 text-sm text-neutral-300">{children}</p>;
}

function MobileMoneyBox({ method, total, code, error, onCode }: { method: 'mpesa' | 'emola'; total: number; code: string; error?: string; onCode: (v: string) => void }) {
  const acc = PAYMENT_ACCOUNTS[method];
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const ok = await copyText(acc.raw);
    if (ok) {
      setCopied(true);
      vibrate();
      toast(`Número ${PAYMENT_LABEL[method]} copiado`);
      setTimeout(() => setCopied(false), 2000);
    } else toast('Não foi possível copiar', 'err');
  };
  const paste = async () => {
    const t = (await readClipboard()).trim();
    if (t) onCode(t.slice(0, 500));
    else toast('Nada para colar — cole manualmente', 'err');
  };
  return (
    <div className="space-y-3 rounded-2xl border border-gold/30 bg-gold/5 p-3.5">
      <p className="text-sm text-neutral-300">
        <b className="text-gold-400">1.</b> Na aplicação {PAYMENT_LABEL[method]}, <b className="text-white">fora deste site</b>, envie <b className="text-white">{formatMT(total)}</b> para:
      </p>
      <div className="flex items-center gap-3 rounded-xl bg-coal-900 p-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl font-semibold tracking-wider text-white">{acc.number}</p>
          <p className="truncate text-xs text-neutral-400">Titular: <b className="text-neutral-200">{acc.holder}</b></p>
        </div>
        <button onClick={copy} className={`btn h-12 shrink-0 ${copied ? 'bg-green-600 text-white' : 'bg-gold text-coal'}`} aria-label={`Copiar número ${PAYMENT_LABEL[method]}`}>
          {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <p className="text-sm text-neutral-300">
        <b className="text-gold-400">2.</b> Depois de transferir, cole a <b className="text-white">mensagem de confirmação</b> para o administrador validar.
      </p>
      <textarea className="input min-h-[96px] py-2.5" rows={4} value={code} onChange={(e) => onCode(e.target.value.slice(0, 500))} placeholder="Cole aqui a SMS de confirmação da transferência" aria-label="Mensagem de confirmação da transferência" />
      <button onClick={paste} className="btn-ghost" type="button"><ClipboardPaste size={18} /> Colar mensagem</button>
      {error ? <p className="err">{error}</p> : <p className="text-xs text-neutral-500">Pode confirmar o pedido e colar a mensagem depois, no ecrã do pedido.</p>}
    </div>
  );
}
