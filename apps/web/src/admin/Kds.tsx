import {
  formatClock,
  formatDuration,
  formatMT,
  formatOrderNumber,
  formatPhoneMZ,
  kdsActionLabel,
  modeDetail,
  orderMapsUrl,
  paymentSummary,
  startOfBusinessDay,
  STATUS_LABEL,
  useNow,
  type Order,
  type OrderStatus,
} from '@kota/shared';
import { Bike, Check, ChefHat, Flame, MapPin, PackageCheck, Plus, Printer, Search, ShoppingBag, StickyNote, TriangleAlert, UtensilsCrossed, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { printTicket } from '../lib/print';
import { actions, useAppState } from '../lib/store';
import { SauceTag } from '../customer/ui';

const COLUMNS: Array<{ id: OrderStatus; title: string; icon: typeof Flame; accent: string }> = [
  { id: 'recebido', title: 'Novos', icon: Plus, accent: 'text-gold-400' },
  { id: 'na_grelha', title: 'Na Grelha', icon: Flame, accent: 'text-ember-400' },
  { id: 'pronto', title: 'Prontos / Entrega', icon: PackageCheck, accent: 'text-green-400' },
  { id: 'entregue', title: 'Concluídos', icon: Check, accent: 'text-neutral-400' },
];

function fold(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function Kds({ focusQuery, focusNonce = 0 }: { focusQuery?: string; focusNonce?: number }) {
  const { orders } = useAppState();
  const now = useNow(1000);
  const todayStart = startOfBusinessDay(now);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<OrderStatus | 'todos'>('todos');
  useEffect(() => {
    if (!focusNonce || !focusQuery) return;
    setQuery(focusQuery);
    setFilter('todos');
  }, [focusNonce, focusQuery]);
  const needle = fold(query.trim());

  const matches = (o: Order) => {
    if (!needle) return true;
    const blob = fold([String(o.number).padStart(3, '0'), o.customerName, o.customerPhone, o.table ?? '', o.zoneName ?? '', o.address ?? '', ...o.lines.map((l) => l.name)].join(' '));
    return blob.includes(needle);
  };

  const byStatus = (s: OrderStatus) => {
    const list = orders.filter((o) => o.status === s && matches(o) && (s !== 'entregue' || o.createdAt >= todayStart));
    return s === 'entregue' ? list.sort((a, b) => (b.timeline.entregue ?? 0) - (a.timeline.entregue ?? 0)) : list.sort((a, b) => a.createdAt - b.createdAt);
  };

  const columns = COLUMNS.filter((c) => filter === 'todos' || c.id === filter);
  const shown = columns.reduce((n, c) => n + byStatus(c.id).length, 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold uppercase">Cozinha · KDS</h1>
        <button className="btn-ghost btn-sm" onClick={() => actions.simulateOrder()}>
          <Plus size={16} /> Simular pedido
        </button>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Procurar pedido</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Número, cliente, telemóvel ou prato"
            className="input h-11 w-full pl-9"
          />
        </label>
        <p className="shrink-0 text-xs font-semibold text-neutral-400">{shown} {shown === 1 ? 'pedido' : 'pedidos'}</p>
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtrar pedidos">
        <FilterChip on={filter === 'todos'} label="Todos" count={COLUMNS.reduce((n, c) => n + byStatus(c.id).length, 0)} onClick={() => setFilter('todos')} />
        {COLUMNS.map((c) => (
          <FilterChip key={c.id} on={filter === c.id} label={c.title} count={byStatus(c.id).length} onClick={() => setFilter(c.id)} />
        ))}
      </div>

      <div className={`grid grid-cols-1 gap-3 ${filter === 'todos' ? 'md:grid-cols-2 xl:grid-cols-4' : ''}`}>
        {columns.map((c) => {
          const list = byStatus(c.id);
          return (
            <section key={c.id} className="min-w-0 rounded-2xl border border-coal-600 bg-coal-900/70" aria-label={c.title}>
              <header className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-coal-600 bg-coal-800 px-3.5 py-3">
                <h2 className={`flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide ${c.accent}`}>
                  <c.icon size={18} /> {c.title}
                </h2>
                <span className="pill bg-coal-600 text-neutral-200">{list.length}</span>
              </header>
              <div className="space-y-3 p-2.5 md:max-h-[calc(100dvh-280px)] md:overflow-y-auto">
                {list.length === 0 && <p className="py-8 text-center text-sm text-neutral-500">{needle ? 'Nenhum pedido com essa pesquisa' : 'Sem pedidos'}</p>}
                {list.map((o) => (
                  <TicketCard key={o.id} order={o} now={now} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({ on, label, count, onClick }: { on: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button type="button" role="tab" aria-selected={on} onClick={onClick} className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-semibold ${on ? 'bg-ember text-white' : 'bg-coal-800 text-neutral-300'}`}>
      {label}
      <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold ${on ? 'bg-white/20 text-white' : 'bg-coal-600 text-neutral-200'}`}>{count}</span>
    </button>
  );
}

function TicketCard({ order: o, now }: { order: Order; now: number }) {
  const done = o.status === 'entregue';
  const elapsedMs = (done ? o.timeline.entregue ?? now : now) - o.createdAt;
  const mins = elapsedMs / 60_000;
  const urgency = done ? 'text-neutral-400 bg-coal-700' : mins >= 20 ? 'bg-ember text-white animate-pulse' : mins >= 10 ? 'bg-gold text-coal' : 'bg-coal-600 text-green-400';
  const ModeIcon = o.mode === 'mesa' ? UtensilsCrossed : o.mode === 'delivery' ? Bike : ShoppingBag;
  const action = kdsActionLabel(o);
  const digital = o.payment.method === 'mpesa' || o.payment.method === 'emola';
  const needsPay = !o.payment.confirmed && !done;

  return (
    <article className={`rounded-2xl border bg-coal-800 p-3 ${!done && mins >= 20 ? 'border-ember' : 'border-coal-500'} ${done ? 'opacity-75' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-2xl font-bold leading-none">{formatOrderNumber(o.number)}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-300">
            <ModeIcon size={14} className="text-ember-400" /> {modeDetail(o)}
          </p>
        </div>
        <div className="text-right">
          <span className={`inline-block rounded-lg px-2 py-1 font-display text-lg font-semibold tabular-nums ${urgency}`} title="Tempo desde a entrada">{formatDuration(elapsedMs)}</span>
          <p className="mt-0.5 text-[11px] text-neutral-500">{formatClock(o.createdAt)}</p>
        </div>
      </div>

      <ul className="mt-3 space-y-2 border-t border-coal-600 pt-2.5">
        {o.lines.map((l) => (
          <li key={l.lineId} className="text-sm">
            <p className="font-semibold leading-snug"><span className="mr-1 text-gold-400">{l.qty}×</span>{l.name} {l.reward && <span className="pill bg-gold/20 text-gold-400">GRÁTIS</span>}</p>
            {(l.sauce || l.notes) && (
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {l.sauce && <span className="origin-left scale-110"><SauceTag id={l.sauce} /></span>}
                {l.notes && <span className="inline-flex items-center gap-1 rounded bg-gold/15 px-1.5 py-0.5 text-xs font-medium text-gold-400"><TriangleAlert size={12} /> {l.notes}</span>}
              </div>
            )}
          </li>
        ))}
      </ul>
      {o.notes && <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-gold/10 px-2 py-1.5 text-xs text-gold-400"><StickyNote size={13} className="mt-0.5 shrink-0" /> {o.notes}</p>}

      <div className="mt-3 space-y-1 border-t border-coal-600 pt-2 text-xs text-neutral-400">
        <p>{o.customerName} · <a className="underline" href={`tel:${o.customerPhone.replace(/\s/g, '')}`}>{formatPhoneMZ(o.customerPhone)}</a></p>
        {o.address && <p className="flex items-start gap-1"><MapPin size={12} className="mt-0.5 shrink-0 text-ember-400" /> {o.address}</p>}
        {orderMapsUrl(o) && (
          <a className="inline-flex items-center gap-1 font-semibold text-gold-400 underline" href={orderMapsUrl(o)!} target="_blank" rel="noreferrer">
            <MapPin size={12} /> {o.lat != null ? 'Google Maps · ponto marcado' : 'Google Maps'}
          </a>
        )}
        <p className="flex items-center justify-between gap-2">
          <span className={needsPay ? 'font-semibold text-gold-400' : ''}>{paymentSummary(o)}</span>
          <span className="font-display text-base font-semibold text-white">{formatMT(o.total)}</span>
        </p>
        {digital && o.payment.smsCode && (
          <p className="whitespace-pre-wrap rounded-lg bg-coal-900 px-2 py-1.5 text-xs leading-snug text-neutral-200">
            <span className="font-semibold text-gold-400">Comprovativo · </span>{o.payment.smsCode}
          </p>
        )}
      </div>

      <div className="mt-3 flex scroll-mb-32 gap-2">
        {action && (
          <button onClick={() => actions.advanceOrder(o.id)} className={`btn h-12 flex-1 scroll-mb-32 ${o.status === 'recebido' ? 'bg-ember text-white' : o.status === 'na_grelha' ? 'bg-gold text-coal' : 'bg-green-600 text-white'}`}>
            {o.status === 'recebido' ? <Flame size={18} /> : o.status === 'na_grelha' ? <ChefHat size={18} /> : <Check size={18} />} {action}
          </button>
        )}
        {done && <span className="flex h-12 flex-1 items-center justify-center gap-1.5 text-sm text-neutral-400"><Check size={16} /> {STATUS_LABEL.entregue} {o.timeline.entregue && formatClock(o.timeline.entregue)}</span>}
        {needsPay && digital && (
          <button onClick={() => actions.confirmPayment(o.id)} className="btn-ghost h-12 scroll-mb-32 px-3" title="Validar pagamento" aria-label="Validar pagamento"><Wallet size={18} /> Validar</button>
        )}
        <button onClick={() => printTicket(o)} className="btn-ghost h-12 px-3" title="Imprimir talão térmico" aria-label="Imprimir talão"><Printer size={18} /></button>
      </div>
    </article>
  );
}
