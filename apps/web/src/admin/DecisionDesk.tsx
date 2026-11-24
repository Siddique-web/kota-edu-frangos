import {
  buildDecisionDesk,
  formatMT,
  STATUS_LABEL,
  useNow,
  type DeskAlert,
  type DeskOrder,
} from '@kota/shared';
import { ArrowRight, Banknote, Bike, ChefHat, Clock3, Flame, TriangleAlert, Users, Wallet } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { useAppState } from '../lib/store';

export function DecisionDesk({ onOpen }: { onOpen: (query: string) => void }) {
  const { orders, menu } = useAppState();
  const now = useNow(30_000);
  const desk = useMemo(() => buildDecisionDesk(orders, menu, now), [orders, menu, now]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold uppercase">Mesa de decisão</h1>
        <p className="mt-1 text-sm leading-snug text-neutral-300">{desk.headline}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Pulse icon={<Flame size={16} />} label="Na cozinha" value={String(desk.preparing)} hint={`${desk.newCount} novos · ${desk.grillCount} na grelha`} hot={desk.busy} />
        <Pulse icon={<Wallet size={16} />} label="Por validar" value={formatMT(desk.proofs.amount)} hint={desk.proofs.count === 1 ? '1 comprovativo' : `${desk.proofs.count} comprovativos`} hot={desk.proofs.count > 0} />
        <Pulse icon={<Banknote size={16} />} label="No caixa" value={formatMT(desk.drawerTotal)} hint={`${formatMT(desk.toCollect.amount)} ainda por cobrar`} />
        <Pulse icon={<Clock3 size={16} />} label="Tempo até pronto" value={desk.avgReadyMin === null ? '—' : `${desk.avgReadyMin} min`} hint={desk.oldestOpenMin === null ? 'Nada em aberto' : `Mais antigo: ${desk.oldestOpenMin} min`} />
      </div>

      <section className="space-y-2" aria-label="Alertas do turno">
        {desk.alerts.map((a) => (
          <Alert key={a.id} alert={a} onOpen={onOpen} />
        ))}
      </section>

      <section className="card-pad">
        <h2 className="mb-2 flex items-center gap-2 font-display text-lg uppercase text-neutral-100">
          <ChefHat size={18} className="text-ember-400" /> Pedidos em aberto · {desk.open.length}
        </h2>
        {desk.open.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhum pedido por fazer. A cozinha está limpa.</p>
        ) : (
          <ul className="space-y-2">
            {desk.open.map((o) => (
              <li key={o.id}>
                <OrderRow order={o} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-pad">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg uppercase text-neutral-100">
          <Banknote size={18} className="text-gold-400" /> Fecho de hoje
        </h2>
        <p className="mb-3 text-sm text-neutral-400">
          {desk.todayOrders} pedidos · {formatMT(desk.todayRevenue)} lançados · {desk.modes.mesa} mesa · {desk.modes.takeaway} take-away · {desk.modes.delivery} delivery
          {desk.deliveryOut > 0 ? ` · ${desk.deliveryOut} entregas ainda na rua` : ''}
        </p>
        <div className="mb-1 grid grid-cols-[1fr_auto_auto] gap-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          <span>Método</span>
          <span>Confirmado</span>
          <span className="w-24 text-right">Pendente</span>
        </div>
        <ul className="space-y-2">
          {desk.money.map((m) => (
            <li key={m.method} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-3 text-sm">
              <span className="text-neutral-200">{m.label}</span>
              <span className="tabular-nums text-green-300">{formatMT(m.confirmed)}</span>
              <span className={`w-24 text-right tabular-nums ${m.pending ? 'text-gold-400' : 'text-neutral-600'}`}>{m.pending ? formatMT(m.pending) : '—'}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="O que fazer agora">
        <h2 className="mb-2 font-display text-lg uppercase text-gold-400">O que fazer agora</h2>
        <ol className="space-y-2">
          {desk.moves.map((m, i) => (
            <li key={m.id} className="rounded-2xl border border-gold/30 bg-gold/5 p-3">
              <p className="text-sm font-semibold"><span className="mr-1.5 text-gold-400">{i + 1}.</span>{m.title}</p>
              <p className="mt-1 text-sm leading-snug text-neutral-300">{m.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {(desk.repeats.length > 0 || desk.soldOut.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {desk.repeats.length > 0 && (
            <section className="card-pad">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-300"><Users size={16} className="text-gold-400" /> Voltaram hoje</h2>
              <ul className="space-y-1 text-sm">
                {desk.repeats.slice(0, 5).map((c) => (
                  <li key={c.phone} className="flex justify-between gap-2">
                    <span>{c.name}</span>
                    <span className="tabular-nums text-gold-400">{c.orders} pedidos</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {desk.soldOut.length > 0 && (
            <section className="card-pad">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-300"><TriangleAlert size={16} className="text-ember-400" /> Esgotados</h2>
              <ul className="space-y-1 text-sm text-neutral-300">
                {desk.soldOut.map((name) => <li key={name}>{name}</li>)}
              </ul>
            </section>
          )}
        </div>
      )}

      <p className="flex items-center gap-2 text-xs text-neutral-500"><Bike size={14} /> As entregas em curso contam em “na rua”. O histórico e os gráficos continuam em Estatísticas.</p>
    </div>
  );
}

function Pulse({ icon, label, value, hint, hot }: { icon: ReactNode; label: string; value: string; hint: string; hot?: boolean }) {
  return (
    <div className={`card border-t-2 p-3 ${hot ? 'border-t-ember' : 'border-t-gold'}`}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{icon}{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold leading-none ${hot ? 'text-ember-400' : 'text-gold-400'}`}>{value}</p>
      <p className="mt-1 text-[11px] leading-snug text-neutral-500">{hint}</p>
    </div>
  );
}

function Alert({ alert, onOpen }: { alert: DeskAlert; onOpen: (query: string) => void }) {
  const border = alert.tone === 'ember' ? 'border-ember/50' : alert.tone === 'green' ? 'border-green-600/40' : 'border-gold/40';
  return (
    <div className={`flex items-start gap-3 rounded-2xl border bg-coal-900 px-3 py-3 ${border}`}>
      <TriangleAlert size={18} className={alert.tone === 'green' ? 'mt-0.5 shrink-0 text-green-400' : alert.tone === 'ember' ? 'mt-0.5 shrink-0 text-ember-400' : 'mt-0.5 shrink-0 text-gold-400'} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{alert.title}</p>
        <p className="mt-0.5 text-sm leading-snug text-neutral-300">{alert.detail}</p>
      </div>
      {alert.focus && (
        <button type="button" className="btn-ghost btn-sm shrink-0 scroll-mb-32" onClick={() => onOpen(alert.focus!)}>
          Abrir <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

function OrderRow({ order, onOpen }: { order: DeskOrder; onOpen: (query: string) => void }) {
  const q = String(order.number).padStart(3, '0');
  return (
    <button type="button" onClick={() => onOpen(q)} className={`flex w-full scroll-mb-32 items-center gap-3 rounded-xl border px-3 py-2.5 text-left ${order.urgent ? 'border-ember/50 bg-ember/10' : 'border-coal-600 bg-coal-900'}`}>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{order.label} · {order.name}</p>
        <p className="truncate text-xs text-neutral-400">{order.waitMin} min · {STATUS_LABEL[order.status]} · {order.where} · {order.pay}</p>
      </div>
      <span className="shrink-0 font-display text-lg text-gold-400">{formatMT(order.total)}</span>
    </button>
  );
}
