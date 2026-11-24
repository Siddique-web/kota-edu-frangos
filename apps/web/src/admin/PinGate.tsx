import { BRAND } from '@kota/shared';
import { Delete, Lock } from 'lucide-react';
import { useState } from 'react';
import { vibrate } from '../lib/hooks';

export function PinGate({ pin, onUnlock }: { pin: string; onUnlock: () => void }) {
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);

  const press = (d: string) => {
    vibrate(8);
    const next = (value + d).slice(0, pin.length);
    setValue(next);
    setWrong(false);
    if (next.length === pin.length) {
      if (next === pin) onUnlock();
      else {
        setWrong(true);
        vibrate(60);
        setTimeout(() => setValue(''), 380);
      }
    }
  };

  return (
    <div className="grid min-h-[calc(100dvh-44px)] place-items-center px-4 py-8">
      <div className="card w-full max-w-xs p-6 text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-ember/15 text-ember-400"><Lock size={26} /></div>
        <h1 className="font-display text-2xl font-bold uppercase">Painel da Equipa</h1>
        <p className="text-sm text-neutral-400">{BRAND.name}</p>
        <div className={`my-5 flex justify-center gap-3 ${wrong ? 'animate-shake' : ''}`} aria-label={`${value.length} de ${pin.length} dígitos`}>
          {Array.from({ length: pin.length }).map((_, i) => (
            <span key={i} className={`h-4 w-4 rounded-full border-2 transition ${i < value.length ? (wrong ? 'border-ember bg-ember' : 'border-gold bg-gold') : 'border-coal-500'}`} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} onClick={() => press(d)} className="h-14 rounded-2xl bg-coal-700 text-xl font-semibold active:bg-coal-500">{d}</button>
          ))}
          <span />
          <button onClick={() => press('0')} className="h-14 rounded-2xl bg-coal-700 text-xl font-semibold active:bg-coal-500">0</button>
          <button onClick={() => setValue((v) => v.slice(0, -1))} aria-label="Apagar" className="grid h-14 place-items-center rounded-2xl bg-coal-800 text-neutral-300 active:bg-coal-600"><Delete size={22} /></button>
        </div>
        <p className="mt-4 text-xs text-neutral-500">{wrong ? 'PIN incorreto. Tente novamente.' : 'PIN de demonstração: 1234'}</p>
      </div>
    </div>
  );
}
