import { BRAND, DEFAULT_PIN, formatMT, PAYMENT_ACCOUNTS, PAYMENT_LABEL, formatClock, formatOrderNumber, modeDetail } from '@kota/shared';
import { Download, RotateCcw, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { downloadCsv } from '../lib/print';
import { actions, store, useAppState } from '../lib/store';
import { useToast } from '../lib/toast';

export function SettingsView() {
  const { settings, zones, orders } = useAppState();
  const toast = useToast();
  const [pin, setPin] = useState('');

  const savePin = () => {
    if (!/^\d{4}$/.test(pin)) return toast('O PIN deve ter 4 dígitos.', 'err');
    actions.setSettings({ adminPin: pin });
    setPin('');
    toast('PIN atualizado.');
  };

  const exportCsv = () => {
    const rows: Array<Array<string | number>> = [['Pedido', 'Data', 'Hora', 'Tipo', 'Cliente', 'Telemóvel', 'Pagamento', 'Itens', 'Taxa', 'Total (MT)', 'Estado']];
    [...orders].sort((a, b) => a.createdAt - b.createdAt).forEach((o) => {
      const d = new Date(o.createdAt);
      rows.push([formatOrderNumber(o.number), d.toLocaleDateString('pt-PT'), formatClock(o.createdAt), modeDetail(o), o.customerName, o.customerPhone, PAYMENT_LABEL[o.payment.method], o.lines.map((l) => `${l.qty}x ${l.name}`).join(' | '), o.deliveryFee, o.total, o.status]);
    });
    downloadCsv(`kota-edu-vendas-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <h1 className="font-display text-2xl font-bold uppercase lg:col-span-2">Configurações</h1>

      <section className="card-pad space-y-3">
        <h2 className="font-display text-lg font-semibold uppercase text-gold-400">Restaurante</h2>
        <dl className="space-y-1.5 text-sm">
          <Item k="Nome" v={BRAND.fullName} />
          <Item k="Local" v={`${BRAND.address}, ${BRAND.city}`} />
          <Item k="Contactos" v={BRAND.phones.join(' · ')} />
          <Item k="M-Pesa" v={`${PAYMENT_ACCOUNTS.mpesa.number} — ${PAYMENT_ACCOUNTS.mpesa.holder}`} />
          <Item k="E-Mola" v={`${PAYMENT_ACCOUNTS.emola.number} — ${PAYMENT_ACCOUNTS.emola.holder}`} />
        </dl>
        <div>
          <label className="label" htmlFor="wa">WhatsApp que recebe os resumos (formato 258…)</label>
          <input id="wa" className="input" inputMode="tel" value={settings.whatsapp} onChange={(e) => actions.setSettings({ whatsapp: e.target.value.replace(/\D/g, '') })} />
        </div>
        <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-[#DC2626]" checked={settings.soundOn} onChange={(e) => actions.setSettings({ soundOn: e.target.checked })} />
          Som de alerta na Cozinha quando entra um novo pedido
        </label>
      </section>

      <section className="card-pad space-y-3">
        <h2 className="font-display text-lg font-semibold uppercase text-gold-400">Taxas de entrega por bairro</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {zones.map((z) => <ZoneInput key={z.id} id={z.id} name={z.name} fee={z.fee} />)}
        </ul>
        <p className="text-xs text-neutral-500">Valores de demonstração — ajuste às taxas reais. Os clientes veem a alteração de imediato.</p>
      </section>

      <section className="card-pad space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold uppercase text-gold-400"><ShieldCheck size={18} /> Segurança</h2>
        <div className="flex gap-2">
          <input className="input flex-1" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="Novo PIN (4 dígitos)" aria-label="Novo PIN" />
          <button className="btn-gold" onClick={savePin}>Guardar</button>
        </div>
        <p className="text-xs text-neutral-500">PIN de demonstração: {DEFAULT_PIN}. Em produção, valide o PIN no servidor (ver README).</p>
      </section>

      <section className="card-pad space-y-3">
        <h2 className="font-display text-lg font-semibold uppercase text-gold-400">Dados & sincronização</h2>
        <p className="text-sm text-neutral-300">Sincronização: <b>{store.syncName}</b> · {orders.length} pedidos · {formatMT(orders.reduce((s, o) => s + o.total, 0))} acumulados.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={exportCsv}><Download size={16} /> Exportar vendas (CSV)</button>
          <button className="btn-ghost" onClick={() => { if (confirm('Repor os dados de demonstração? Isto apaga pedidos e alterações ao cardápio.')) { actions.resetDemo(); toast('Dados de demonstração repostos.'); } }}>
            <RotateCcw size={16} /> Repor dados demo
          </button>
        </div>
      </section>
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return <div className="flex gap-3"><dt className="w-24 shrink-0 text-neutral-500">{k}</dt><dd className="min-w-0 flex-1 break-words">{v}</dd></div>;
}

function ZoneInput({ id, name, fee }: { id: string; name: string; fee: number }) {
  const [v, setV] = useState(String(fee));
  return (
    <li className="flex items-center gap-2 rounded-xl border border-coal-500 bg-coal-900 px-3 py-1.5">
      <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
      <input aria-label={`Taxa ${name}`} className="input !min-h-[40px] w-20 !px-2 text-right text-sm" inputMode="numeric" value={v} onChange={(e) => setV(e.target.value.replace(/[^\d]/g, ''))} onBlur={() => { const n = parseInt(v || '0', 10); actions.setZoneFee(id, n); setV(String(n)); }} />
      <span className="text-xs text-neutral-500">MT</span>
    </li>
  );
}
