import { formatMT, getSauce, SAUCES, type MenuItem, type SauceId } from '@kota/shared';
import { Check, Flame } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ItemIcon, SauceIcon } from '../lib/marks';
import { actions, useAppState } from '../lib/store';
import { vibrate } from '../lib/hooks';
import { useToast } from '../lib/toast';
import { Qty, Sheet } from './ui';

/** Personalizador "Rei dos Molhos": molho obrigatório (frangos) ou opcional (hambúrguer, sandes…). */
export function SauceModal({ item, onClose }: { item: MenuItem | null; onClose: () => void }) {
  const toast = useToast();
  const [sauce, setSauce] = useState<SauceId | undefined>();
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    setSauce(undefined);
    setNotes('');
    setQty(1);
    setError('');
  }, [item?.id]);

  const { menu } = useAppState();
  if (!item) return null;
  const required = item.sauceMode === 'required';
  const asksSauce = item.sauceMode !== 'none';
  const included = (item.comboOf ?? [])
    .map((id) => menu.find((m) => m.id === id)?.name)
    .filter((name): name is string => !!name);

  const confirm = () => {
    const res = actions.addToCart(item.id, { sauce, notes, qty });
    if (!res.ok) {
      setError(res.error ?? 'Não foi possível adicionar.');
      return;
    }
    vibrate();
    toast(`${qty}× ${item.name} adicionado${sauce ? ` · ${getSauce(sauce)?.short}` : ''}`);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Detalhes"
      footer={
        <div className="flex items-center gap-3">
          <Qty qty={qty} onMinus={() => setQty((q) => Math.max(1, q - 1))} onPlus={() => setQty((q) => Math.min(20, q + 1))} />
          <button className="btn-primary h-12 flex-1" onClick={confirm} disabled={required && !sauce}>
            Adicionar · {formatMT(item.price * qty)}
          </button>
        </div>
      }
    >
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-coal-700/60 p-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-ember-700 to-ember text-white">
          <ItemIcon item={item} size={22} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{item.name}</p>
          <p className="text-sm text-gold-400">{formatMT(item.price)}</p>
        </div>
      </div>

      {item.description && <p className="mb-3 text-sm leading-snug text-neutral-300">{item.description}</p>}
      {included.length > 0 && (
        <p className="mb-3 text-sm text-neutral-300">
          <span className="font-semibold text-white">Inclui: </span>
          {included.join(' · ')}
        </p>
      )}

      {asksSauce && (
        <>
      <p className="label">
        Escolha o molho {required ? <span className="text-ember-400">· obrigatório</span> : <span className="text-neutral-500">· opcional</span>}
      </p>
      <div className="grid gap-2" role="radiogroup" aria-label="Molho">
        {SAUCES.map((s) => {
          const on = sauce === s.id;
          return (
            <button
              key={s.id}
              role="radio"
              aria-checked={on}
              onClick={() => {
                setSauce(on && !required ? undefined : s.id);
                setError('');
                vibrate(8);
              }}
              className={`flex min-h-[56px] items-center gap-3 rounded-2xl border px-3 py-2 text-left transition active:scale-[.99] ${
                on ? 'border-gold bg-gold/10' : 'border-coal-500 bg-coal-900 hover:border-coal-500 hover:bg-coal-700'
              }`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl" style={{ background: `${s.color}26` }}>
                <SauceIcon id={s.id} size={18} style={{ color: s.color }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-tight">{s.name}</span>
                <span className="block text-xs text-neutral-400">{s.description}</span>
              </span>
              {s.heat > 0 && (
                <span className="flex shrink-0 gap-0.5" aria-label={`Picante ${s.heat} de 3`}>
                  {[1, 2, 3].map((n) => (
                    <Flame key={n} size={14} className={n <= s.heat ? 'text-ember' : 'text-coal-500'} fill={n <= s.heat ? 'currentColor' : 'none'} />
                  ))}
                </span>
              )}
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${on ? 'border-gold bg-gold text-coal' : 'border-coal-500'}`}>
                {on && <Check size={14} strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
        </>
      )}
      {error && <p className="err">{error}</p>}

      <label className="label mt-4" htmlFor="obs">Observações</label>
      <textarea
        id="obs"
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Ex.: bem passado, sem cebola, molho à parte…"
        className="input min-h-[72px] py-2.5"
        maxLength={140}
      />
    </Sheet>
  );
}
