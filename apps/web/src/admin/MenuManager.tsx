import { CATEGORY_LABEL, CATEGORY_ORDER, formatMT, type MenuItem } from '@kota/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ItemIcon } from '../lib/marks';
import { actions, useAppState } from '../lib/store';
import { useToast } from '../lib/toast';

export function MenuManager() {
  const { menu } = useAppState();
  const off = menu.filter((m) => !m.available).length;
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold uppercase">Cardápio & Stock</h1>
          <span className={`pill ${off ? 'bg-ember/20 text-ember-400' : 'bg-green-500/15 text-green-400'}`}>{off ? `${off} esgotado(s) hoje` : 'Tudo disponível'}</span>
        </div>
        {CATEGORY_ORDER.filter((c) => menu.some((m) => m.category === c)).map((c) => (
          <section key={c} className="mb-4">
            <h2 className="mb-2 font-display text-lg uppercase tracking-wide text-gold-400">{CATEGORY_LABEL[c]}</h2>
            <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {menu.filter((m) => m.category === c).map((m) => <Row key={m.id} item={m} />)}
            </ul>
          </section>
        ))}
      </div>
      <ComboForm />
    </div>
  );
}

function Row({ item }: { item: MenuItem }) {
  const [price, setPrice] = useState(String(item.price));
  const commit = () => {
    const n = parseFloat(price.replace(',', '.'));
    if (Number.isFinite(n) && n >= 0 && n !== item.price) actions.setPrice(item.id, n);
    else setPrice(String(item.price));
  };
  return (
    <li className={`card flex items-center gap-3 p-2.5 ${item.available ? '' : 'opacity-60'}`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-coal-700 text-gold-400"><ItemIcon item={item} size={20} /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{item.name}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <input aria-label={`Preço de ${item.name}`} className="input !min-h-[40px] w-24 !px-2.5 text-sm tabular-nums" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
          <span className="text-xs text-neutral-500">MT</span>
        </div>
      </div>
      {item.isCombo && (
        <button aria-label={`Remover combo ${item.name}`} onClick={() => actions.removeCombo(item.id)} className="tap grid place-items-center rounded-xl text-neutral-400 hover:text-ember-400"><Trash2 size={18} /></button>
      )}
      <button
        role="switch"
        aria-checked={item.available}
        aria-label={item.available ? `Marcar ${item.name} como esgotado` : `Reativar ${item.name}`}
        onClick={() => actions.setAvailable(item.id, !item.available)}
        className={`relative h-8 w-[58px] shrink-0 rounded-full transition ${item.available ? 'bg-green-600' : 'bg-coal-500'}`}
      >
        <span className={`absolute top-1 grid h-6 w-6 place-items-center rounded-full bg-white text-[9px] font-bold text-coal transition-all ${item.available ? 'left-[30px]' : 'left-1'}`} />
      </button>
    </li>
  );
}

function ComboForm() {
  const { menu } = useAppState();
  const toast = useToast();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const base = menu.filter((m) => !m.isCombo);
  const sum = picked.reduce((s, id) => s + (menu.find((m) => m.id === id)?.price ?? 0), 0);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const create = () => {
    const p = parseFloat(price.replace(',', '.'));
    if (name.trim().length < 3 || !Number.isFinite(p) || p <= 0 || picked.length < 2) return toast('Indique nome, preço e pelo menos 2 itens.', 'err');
    actions.addCombo({ name, description: desc, price: p, includes: picked });
    toast(`Combo "${name.trim()}" criado — já está no cardápio do cliente.`);
    setName(''); setPrice(''); setDesc(''); setPicked([]);
  };

  return (
    <section className="card-pad xl:sticky xl:top-[120px]" aria-label="Novo combo">
      <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold uppercase text-gold-400"><Plus size={18} /> Novo combo promocional</h2>
      <div className="space-y-3">
        <div><label className="label" htmlFor="cn">Nome</label><input id="cn" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Combo Noite Kota" /></div>
        <div><label className="label" htmlFor="cd">Descrição (opcional)</label><input id="cd" className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Gerada automaticamente se vazio" /></div>
        <div>
          <p className="label">Itens incluídos ({picked.length})</p>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-coal-500 bg-coal-900 p-1.5">
            {base.map((m) => (
              <label key={m.id} className={`flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg px-2 text-sm ${picked.includes(m.id) ? 'bg-ember/15' : 'hover:bg-coal-700'}`}>
                <input type="checkbox" className="h-4 w-4 accent-[#DC2626]" checked={picked.includes(m.id)} onChange={() => toggle(m.id)} />
                <ItemIcon item={m} size={16} className="shrink-0 text-gold-400" />
                <span className="min-w-0 flex-1 truncate">{m.name}</span>
                <span className="text-xs text-neutral-400">{formatMT(m.price)}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="cp">Preço do combo (MT)</label>
          <input id="cp" className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={sum ? String(Math.round(sum * 0.9)) : '0'} />
          {sum > 0 && (
            <p className="mt-1.5 text-xs text-neutral-400">
              Soma dos itens: <b>{formatMT(sum)}</b> ·{' '}
              <button className="font-semibold text-gold-400 underline" onClick={() => setPrice(String(Math.round(sum * 0.9)))}>usar -10% ({formatMT(Math.round(sum * 0.9))})</button>
            </p>
          )}
        </div>
        <button className="btn-primary w-full" onClick={create}>Criar combo</button>
      </div>
    </section>
  );
}
