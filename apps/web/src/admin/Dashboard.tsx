import {
  buildInsights,
  CATEGORY_SHORT,
  computeStats,
  formatMT,
  formatMTShort,
  type Insight,
  type Period,
} from '@kota/shared';
import { ArrowRight, Banknote, CreditCard, Crown, Receipt, ShoppingBasket, Sparkles, Target, TrendingUp } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAppState } from '../lib/store';

const C = { ember: '#DC2626', gold: '#F59E0B', grid: '#2b2b2b', axis: '#9ca3af' };
const PAY_COLORS: Record<string, string> = { mpesa: '#EF4444', emola: '#F59E0B', cash: '#22C55E', pos: '#60A5FA' };
const CAT_COLORS = ['#DC2626', '#F59E0B', '#F97316', '#22C55E', '#60A5FA', '#A78BFA'];

const tooltipStyle = {
  contentStyle: { background: '#1a1a1a', border: '1px solid #3a3a3a', borderRadius: 12, color: '#f5f5f5', fontSize: 13 },
  labelStyle: { color: '#F59E0B', fontWeight: 600 },
  itemStyle: { color: '#f5f5f5' },
  cursor: { fill: 'rgba(255,255,255,0.05)' },
};

export function Dashboard() {
  const { orders, menu } = useAppState();
  const [period, setPeriod] = useState<Period>('7d');
  // Recalcula quando chegam pedidos ou muda o período (tempo real).
  const stats = useMemo(() => computeStats(orders, period), [orders, period]);
  const insights = useMemo(() => buildInsights(stats, menu), [stats, menu]);

  const topN = stats.topProducts.slice(0, 7).map((p) => ({ name: p.name.replace('Hambúrguer', 'Hamb.').replace(' de Frango', ''), qty: p.qty }));
  const cats = stats.byCategory.map((c) => ({ name: CATEGORY_SHORT[c.category], revenue: c.revenue }));
  const pays = stats.payments.filter((p) => p.total > 0);
  const hours = stats.peakHours;
  const sauces = stats.sauces.filter((s) => s.count > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold uppercase">Estatísticas · BI</h1>
        <div className="flex rounded-full bg-coal-700 p-0.5" role="tablist" aria-label="Período">
          {([['hoje', 'Hoje'], ['7d', 'Últimos 7 dias']] as Array<[Period, string]>).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={period === id} onClick={() => setPeriod(id)} className={`min-h-[40px] rounded-full px-4 text-sm font-semibold ${period === id ? 'bg-ember text-white' : 'text-neutral-300'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi icon={<Banknote size={18} />} label={period === 'hoje' ? 'Faturação hoje' : 'Faturação (7 dias)'} value={formatMTShort(stats.revenue)} sub={`Hoje: ${formatMTShort(stats.todayRevenue)}`} tone="gold" />
        <Kpi icon={<Receipt size={18} />} label="Pedidos do dia" value={String(stats.todayOrders)} sub={period === '7d' ? `${stats.orderCount} em 7 dias` : 'dia de negócio (até às 05h)'} />
        <Kpi icon={<Target size={18} />} label="Ticket médio" value={formatMT(stats.avgTicket)} sub="por pedido" />
        <Kpi icon={<Crown size={18} />} label="Produto campeão" value={stats.topProduct?.name ?? '—'} sub={stats.topProduct ? `${stats.topProduct.qty} unidades` : ''} small />
        <Kpi icon={<CreditCard size={18} />} label="Pagamentos digitais" value={`${stats.digitalPct}%`} sub="M-Pesa + E-Mola" tone="ember" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
        <Panel title="Faturação diária" icon={<TrendingUp size={16} />} className="md:col-span-2 xl:col-span-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.byDay} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.ember} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={C.ember} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke={C.axis} tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis stroke={C.axis} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} width={44} />
              <Tooltip {...tooltipStyle} formatter={(v: any, n: any) => (n === 'revenue' ? [formatMT(v), 'Faturação'] : [v, 'Pedidos'])} />
              <Area type="monotone" dataKey="revenue" stroke={C.ember} strokeWidth={3} fill="url(#gRev)" activeDot={{ r: 6, fill: C.gold, stroke: '#111' }} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Fecho de caixa por pagamento" icon={<Banknote size={16} />} className="xl:col-span-4" height="h-[300px] xl:h-[300px]">
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pays} dataKey="total" nameKey="label" innerRadius="58%" outerRadius="88%" paddingAngle={3} stroke="#111" strokeWidth={2}>
                    {pays.map((p) => <Cell key={p.method} fill={PAY_COLORS[p.method]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v: any, _n: any, e: any) => [`${formatMT(v)} · ${e.payload?.count ?? 0} pedidos`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              {stats.payments.map((p) => (
                <li key={p.method} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: PAY_COLORS[p.method] }} />{p.label}</span>
                  <b className="tabular-nums">{formatMTShort(p.total)}</b>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel title="Top produtos (unidades)" icon={<ShoppingBasket size={16} />} className="xl:col-span-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topN} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 0 }}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke={C.axis} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" stroke={C.axis} tick={{ fontSize: 11 }} width={112} tickLine={false} axisLine={false} />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [v, 'Unidades']} />
              <Bar dataKey="qty" fill={C.gold} radius={[0, 6, 6, 0]} label={{ position: 'right', fill: '#d4d4d4', fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Receita por categoria" icon={<ShoppingBasket size={16} />} className="xl:col-span-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cats} margin={{ top: 16, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke={C.axis} tick={{ fontSize: 11 }} tickLine={false} interval={0} />
              <YAxis stroke={C.axis} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} width={40} />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [formatMT(v), 'Receita']} />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {cats.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Molhos mais pedidos" icon={<Sparkles size={16} />} className="xl:col-span-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sauces} layout="vertical" margin={{ top: 4, right: 36, left: 4, bottom: 0 }}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke={C.axis} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" stroke={C.axis} tick={{ fontSize: 12 }} width={96} tickLine={false} axisLine={false} />
              <Tooltip {...tooltipStyle} formatter={(v: any, _n: any, e: any) => [`${v} un. (${e.payload?.pct ?? 0}%)`, 'Molho']} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} label={{ position: 'right', fill: '#d4d4d4', fontSize: 11 }}>
                {sauces.map((s) => <Cell key={s.id} fill={s.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Horários de pico (11h → 03h)" icon={<TrendingUp size={16} />} className="md:col-span-2 xl:col-span-8">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hours} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke={C.axis} tick={{ fontSize: 11 }} tickLine={false} interval={0} />
              <YAxis stroke={C.axis} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [v, 'Pedidos']} />
              <Bar dataKey="orders" radius={[5, 5, 0, 0]}>
                {hours.map((h) => <Cell key={h.hour} fill={h.orders === Math.max(...hours.map((x) => x.orders)) ? C.gold : C.ember} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <section className="card-pad md:col-span-2 xl:col-span-4" aria-label="Consultor Estratégico">
          <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold uppercase text-gold-400"><Sparkles size={18} /> Consultor Estratégico IA</h2>
          <p className="mb-3 text-xs text-neutral-500">3 ações geradas a partir das métricas atuais (motor de regras, offline).</p>
          <ol className="space-y-3">
            {insights.map((i, n) => <InsightCard key={i.id} insight={i} n={n + 1} />)}
          </ol>
        </section>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub, tone, small }: { icon: ReactNode; label: string; value: string; sub?: string; tone?: 'gold' | 'ember'; small?: boolean }) {
  const color = tone === 'gold' ? 'text-gold-400' : tone === 'ember' ? 'text-ember-400' : 'text-white';
  return (
    <div className={`card border-t-2 p-3.5 ${tone === 'gold' ? 'border-t-gold' : tone === 'ember' ? 'border-t-ember' : 'border-t-coal-500'}`}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{icon}{label}</p>
      <p className={`mt-1.5 font-display font-bold leading-tight ${small ? 'text-xl' : 'text-3xl'} ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-neutral-500">{sub}</p>}
    </div>
  );
}

function Panel({ title, icon, children, className = '', height = 'h-[300px]' }: { title: string; icon?: ReactNode; children: ReactNode; className?: string; height?: string }) {
  return (
    <section className={`card-pad ${className}`}>
      <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide text-neutral-100"><span className="text-ember-400">{icon}</span>{title}</h2>
      <div className={height}>{children}</div>
    </section>
  );
}

function InsightCard({ insight: i, n }: { insight: Insight; n: number }) {
  const border = i.tone === 'ember' ? 'border-ember/40' : i.tone === 'green' ? 'border-green-500/40' : 'border-gold/40';
  return (
    <li className={`rounded-2xl border bg-coal-900 p-3 ${border}`}>
      <p className="text-sm font-semibold leading-snug"><span className="mr-1.5 text-gold-400">{n}.</span>{i.title}</p>
      <p className="mt-1 text-[13px] leading-snug text-neutral-300">{i.body}</p>
      <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-gold/10 px-2.5 py-1.5 text-xs font-medium text-gold-400"><ArrowRight size={14} className="mt-0.5 shrink-0" /> {i.action}</p>
    </li>
  );
}
