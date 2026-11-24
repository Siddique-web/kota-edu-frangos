import {
  buildLedger,
  businessDayFromDateInput,
  closeReport,
  formatClock,
  formatMT,
  formatOrderNumber,
  ledgerCsvRows,
  modeDetail,
  orderMapsUrl,
  pad,
  paymentSummary,
  STATUS_LABEL,
  useNow,
  type LedgerRange,
  type OrderMode,
  type OrderStatus,
  type PaymentMethod,
} from '@kota/shared';
import { Download, MapPin, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { downloadCsv, printText } from '../lib/print';
import { useAppState } from '../lib/store';

const RANGES: Array<[LedgerRange, string]> = [
  ['hoje', 'Hoje'],
  ['ontem', 'Ontem'],
  ['7d', '7 dias'],
  ['30d', '30 dias'],
  ['tudo', 'Tudo'],
  ['intervalo', 'Intervalo'],
];

function isoDay(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function Ledger() {
  const { orders } = useAppState();
  const now = useNow(30_000);
  const [range, setRange] = useState<LedgerRange>('hoje');
  const [fromDay, setFromDay] = useState(() => isoDay(Date.now()));
  const [toDay, setToDay] = useState(() => isoDay(Date.now()));
  const [mode, setMode] = useState<OrderMode | 'todos'>('todos');
  const [payment, setPayment] = useState<PaymentMethod | 'todos'>('todos');
  const [status, setStatus] = useState<OrderStatus | 'todos'>('todos');
  const [q, setQ] = useState('');

  const ledger = useMemo(() => {
    const from = businessDayFromDateInput(fromDay);
    const toStart = businessDayFromDateInput(toDay);
    const to = toStart == null ? undefined : toStart + 24 * 60 * 60 * 1000;
    return buildLedger(orders, { range, from: from ?? undefined, to, mode, payment, status, q }, now);
  }, [orders, range, fromDay, toDay, mode, payment, status, q, now]);

  const exportCsv = () => {
    downloadCsv(`kota-fecho-${isoDay(now)}.csv`, ledgerCsvRows(ledger.orders));
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold uppercase">Fecho</h1>
        <p className="mt-1 text-sm text-neutral-400">{ledger.label}. O dia de negócio começa às 05:00.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Período do fecho">
        {RANGES.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={range === id} onClick={() => setRange(id)} className={`min-h-[40px] shrink-0 rounded-full px-4 text-sm font-semibold ${range === id ? 'bg-ember text-white' : 'bg-coal-700 text-neutral-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {range === 'intervalo' && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-neutral-400">De
            <input type="date" className="input mt-1" value={fromDay} onChange={(e) => setFromDay(e.target.value)} />
          </label>
          <label className="text-xs text-neutral-400">Até
            <input type="date" className="input mt-1" value={toDay} onChange={(e) => setToDay(e.target.value)} />
          </label>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Select label="Tipo" value={mode} onChange={setMode} options={[['todos', 'Todos'], ['mesa', 'Mesa'], ['takeaway', 'Take-away'], ['delivery', 'Delivery']]} />
        <Select label="Pagamento" value={payment} onChange={setPayment} options={[['todos', 'Todos'], ['cash', 'Cash'], ['pos', 'P.O.S'], ['mpesa', 'M-Pesa'], ['emola', 'E-Mola']]} />
        <Select label="Estado" value={status} onChange={setStatus} options={[['todos', 'Todos'], ['recebido', 'Recebido'], ['na_grelha', 'Na grelha'], ['pronto', 'Pronto'], ['entregue', 'Entregue']]} />
        <label className="text-xs text-neutral-400">Procurar
          <input className="input mt-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nº, cliente, prato" aria-label="Procurar no fecho" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Pedidos" value={String(ledger.count)} />
        <Stat label="Lançado" value={formatMT(ledger.revenue)} />
        <Stat label="No caixa" value={formatMT(ledger.confirmed)} />
        <Stat label="Pendente" value={formatMT(ledger.pending)} />
        <Stat label="Taxas de entrega" value={formatMT(ledger.deliveryFees)} />
        <Stat label="Ticket médio" value={formatMT(ledger.avgTicket)} />
      </div>

      <ul className="space-y-1 text-sm">
        {ledger.money.filter((m) => m.count > 0).map((m) => (
          <li key={m.method} className="flex justify-between gap-3">
            <span>{m.label} · {m.count}</span>
            <span className="tabular-nums text-neutral-300">{formatMT(m.confirmed)} <span className="text-gold-400">+ {formatMT(m.pending)}</span></span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-gold scroll-mb-32" onClick={exportCsv}><Download size={16} /> Extrair CSV</button>
        <button type="button" className="btn-ghost scroll-mb-32" onClick={() => printText(`Fecho ${ledger.label}`, closeReport(ledger))}><Printer size={16} /> Imprimir fecho</button>
      </div>

      <ul className="space-y-2">
        {ledger.orders.length === 0 && <li className="text-sm text-neutral-400">Nenhum pedido neste filtro.</li>}
        {ledger.orders.map((o) => {
          const map = orderMapsUrl(o);
          return (
            <li key={o.id} className="rounded-xl border border-coal-600 bg-coal-900 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{formatOrderNumber(o.number)} · {o.customerName}</p>
                <span className="shrink-0 font-display text-lg text-gold-400">{formatMT(o.total)}</span>
              </div>
              <p className="mt-0.5 text-xs text-neutral-400">{formatClock(o.createdAt)} · {modeDetail(o)} · {STATUS_LABEL[o.status]} · {paymentSummary(o)}</p>
              <p className="mt-1 truncate text-xs text-neutral-500">{o.lines.map((l) => `${l.qty}× ${l.name}`).join(', ')}</p>
              {map && (
                <a className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-gold-400 underline" href={map} target="_blank" rel="noreferrer">
                  <MapPin size={12} /> {o.lat != null ? 'Abrir no Google Maps' : 'Procurar morada no mapa'}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card border-t-2 border-t-gold p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-gold-400">{value}</p>
    </div>
  );
}

function Select<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: Array<[T, string]> }) {
  return (
    <label className="text-xs text-neutral-400">{label}
      <select className="input mt-1" value={value} onChange={(e) => onChange(e.target.value as T)} aria-label={label}>
        {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
    </label>
  );
}
