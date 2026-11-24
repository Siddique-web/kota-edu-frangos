import {
  formatClock,
  formatDuration,
  formatMT,
  formatOrderNumber,
  loyaltyStatus,
  modeDetail,
  PAYMENT_ACCOUNTS,
  PAYMENT_LABEL,
  paymentSummary,
  selectMyOrders,
  STATUS_FLOW,
  STATUS_LABEL,
  statusIndex,
  useNow,
  type Order,
} from '@kota/shared';
import { Bike, CheckCircle2, ChefHat, ClipboardPaste, Drumstick, Flame, PackageCheck, ReceiptText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { readClipboard, vibrate } from '../lib/hooks';
import { actions, useAppState } from '../lib/store';
import { useToast } from '../lib/toast';
import { SauceTag } from './ui';

const ICONS = [ReceiptText, Flame, PackageCheck, CheckCircle2];

export function TrackerView({ onMenu }: { onMenu: () => void }) {
  const state = useAppState();
  const mine = selectMyOrders(state);
  const now = useNow(1000);

  if (mine.length === 0) {
    return (
      <div className="card-pad mx-auto mt-6 max-w-md text-center">
        <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-coal-700 text-ember-400"><Flame size={28} /></div>
        <h2 className="font-display text-2xl font-semibold uppercase">Ainda sem pedidos</h2>
        <p className="mt-1 text-sm text-neutral-400">Quando fizer um pedido, acompanha-o aqui em tempo real.</p>
        <button className="btn-primary mt-4" onClick={onMenu}>Pedir agora</button>
      </div>
    );
  }
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const current = mine.find((o) => o.id === selectedId) ?? mine.find((o) => o.status !== 'entregue') ?? mine[0];
  const stats = loyaltyStatus(state.orders, current.customerPhone);

  return (
    <div className="mx-auto max-w-2xl animate-fadeUp space-y-4">
      <div>
        <p className="label">Os seus pedidos · {mine.length}</p>
        <ul className="space-y-2">
          {mine.map((o) => {
            const on = o.id === current.id;
            return (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(o.id)}
                  aria-current={on ? 'true' : undefined}
                  className={`card flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm ${on ? 'border-ember' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{formatOrderNumber(o.number)} · {modeDetail(o)}</p>
                    <p className="text-xs text-neutral-400">{formatClock(o.createdAt)} · {STATUS_LABEL[o.status]} · {paymentSummary(o)}</p>
                  </div>
                  <span className="shrink-0 font-display text-lg text-gold-400">{formatMT(o.total)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <TrackerCard order={current} now={now} />
      <PaymentProof order={current} />
      {current.status === 'entregue' && (
        <div className="card-pad text-center">
          <p className="flex items-center justify-center gap-2 font-display text-xl uppercase text-gold-400"><Drumstick size={20} /> Bom apetite</p>
          <p className="mt-1 text-sm text-neutral-300">
            {stats.rewardReady ? 'Tem um prémio à espera no próximo pedido!' : `Faltam ${stats.remaining} pedido(s) para o seu prémio.`}
          </p>
          <button className="btn-primary mt-3" onClick={onMenu}>Pedir outra vez</button>
        </div>
      )}
    </div>
  );
}

function PaymentProof({ order }: { order: Order }) {
  const method = order.payment.method;
  const digital = method === 'emola' || method === 'mpesa';
  const toast = useToast();
  const [text, setText] = useState(order.payment.smsCode ?? '');
  useEffect(() => setText(order.payment.smsCode ?? ''), [order.id, order.payment.smsCode]);
  if (!digital) return null;
  if (order.payment.confirmed) {
    return <p className="rounded-2xl border border-green-700/40 bg-green-950/30 px-4 py-3 text-sm text-green-300">Pagamento validado pela equipa.</p>;
  }
  const acc = PAYMENT_ACCOUNTS[method];
  const send = () => {
    const res = actions.submitPaymentProof(order.id, text);
    if (!res.ok) toast(res.error, 'err');
    else {
      vibrate();
      toast('Comprovativo enviado. O administrador vai validar.');
    }
  };
  const paste = async () => {
    const t = (await readClipboard()).trim();
    if (t) setText(t.slice(0, 500));
    else toast('Nada para colar — cole manualmente', 'err');
  };
  return (
    <div className="space-y-3 rounded-2xl border border-gold/30 bg-gold/5 p-4">
      <p className="text-sm text-neutral-200">
        Transfira <b>{formatMT(order.total)}</b> por {PAYMENT_LABEL[order.payment.method]} para <b>{acc.number}</b>, na aplicação, fora deste site.
      </p>
      <p className="text-sm text-neutral-300">Depois de transferir, cole a mensagem de confirmação para o administrador validar.</p>
      <textarea className="input min-h-[96px] py-2.5" rows={4} value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} aria-label="Mensagem de confirmação da transferência" placeholder="Cole aqui a SMS de confirmação" />
      <div className="flex gap-2">
        <button type="button" className="btn-ghost" onClick={paste}><ClipboardPaste size={18} /> Colar</button>
        <button type="button" className="btn-primary flex-1" onClick={send}>{order.payment.smsCode ? 'Actualizar comprovativo' : 'Já transferi'}</button>
      </div>
      {order.payment.smsCode && <p className="text-xs text-neutral-400">Comprovativo enviado. À espera da validação.</p>}
    </div>
  );
}

function TrackerCard({ order, now }: { order: Order; now: number }) {
  const idx = statusIndex(order.status);
  const done = order.status === 'entregue';
  const elapsed = (done ? order.timeline.entregue ?? now : now) - order.createdAt;
  const labels = STATUS_FLOW.map((s) => (s === 'pronto' && order.mode !== 'delivery' ? 'Pronto' : STATUS_LABEL[s]));
  const hint: Record<string, string> = {
    recebido: 'A cozinha recebeu o seu pedido.',
    na_grelha: 'O seu frango está na brasa.',
    pronto: order.mode === 'delivery' ? 'O estafeta saiu com o seu pedido.' : order.mode === 'mesa' ? 'A caminho da sua mesa.' : 'Pode levantar o seu pedido ao balcão.',
    entregue: 'Pedido entregue. Obrigado!',
  };
  return (
    <section className="card overflow-hidden" aria-live="polite">
      <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-ember-700/60 to-transparent p-4">
        <div>
          <p className="font-display text-sm uppercase tracking-widest text-neutral-300">Pedido</p>
          <h2 className="font-display text-4xl font-bold leading-none">{formatOrderNumber(order.number)}</h2>
          <p className="mt-1 text-sm text-neutral-300">{modeDetail(order)}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-semibold tabular-nums text-gold-400">{formatDuration(elapsed)}</p>
          <p className="text-xs text-neutral-400">{done ? 'tempo total' : 'a decorrer'}</p>
        </div>
      </div>

      <div className="px-4 pb-1 pt-5">
        <div className="relative">
          <div className="absolute left-[12.5%] right-[12.5%] top-5 h-1 rounded-full bg-coal-600" />
          <div className="absolute left-[12.5%] top-5 h-1 rounded-full bg-gradient-to-r from-ember to-gold transition-all duration-700" style={{ width: `${(idx / 3) * 75}%` }} />
          <ol className="relative grid grid-cols-4">
            {STATUS_FLOW.map((s, i) => {
              const Icon = s === 'pronto' && order.mode === 'delivery' ? Bike : s === 'na_grelha' ? ChefHat : ICONS[i];
              const reached = i <= idx;
              return (
                <li key={s} className="flex flex-col items-center gap-2 text-center" aria-current={i === idx ? 'step' : undefined}>
                  <span className={`grid h-11 w-11 place-items-center rounded-full border-2 transition ${reached ? 'border-gold bg-ember text-white' : 'border-coal-500 bg-coal-800 text-neutral-500'} ${i === idx && !done ? 'animate-pulse shadow-ember' : ''}`}>
                    <Icon size={18} />
                  </span>
                  <span className={`text-[11px] font-semibold leading-tight sm:text-xs ${reached ? 'text-white' : 'text-neutral-500'}`}>{labels[i]}</span>
                  {order.timeline[s] && <span className="text-[10px] text-neutral-500">{formatClock(order.timeline[s]!)}</span>}
                </li>
              );
            })}
          </ol>
        </div>
        <p className="mt-4 rounded-xl bg-coal-900 px-3 py-2.5 text-center text-sm text-neutral-200">{hint[order.status]}</p>
      </div>

      <ul className="mt-3 space-y-2 border-t border-coal-600 p-4 text-sm">
        {order.lines.map((l) => (
          <li key={l.lineId} className="flex items-start justify-between gap-3">
            <span>
              <b>{l.qty}×</b> {l.name} {l.sauce && <SauceTag id={l.sauce} />}
            </span>
            <span className="shrink-0 text-neutral-300">{l.reward ? 'GRÁTIS' : formatMT(l.unitPrice * l.qty)}</span>
          </li>
        ))}
        <li className="flex justify-between border-t border-coal-600 pt-2 font-semibold">
          <span>Total · {paymentSummary(order)}</span>
          <span className="font-display text-lg text-gold-400">{formatMT(order.total)}</span>
        </li>
      </ul>
    </section>
  );
}
