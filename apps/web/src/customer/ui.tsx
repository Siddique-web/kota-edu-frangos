import { getSauce, type SauceId } from '@kota/shared';
import { Minus, Plus, X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { SauceIcon } from '../lib/marks';

export function Qty({ qty, onMinus, onPlus, small }: { qty: number; onMinus: () => void; onPlus: () => void; small?: boolean }) {
  const size = small ? 'h-11 w-11' : 'h-11 w-11';
  return (
    <div className="inline-flex items-center rounded-xl border border-coal-500 bg-coal-900">
      <button aria-label="Diminuir" onClick={onMinus} className={`${size} grid place-items-center rounded-l-xl text-neutral-200 active:bg-coal-600`}>
        <Minus size={16} />
      </button>
      <span className="min-w-8 text-center text-sm font-bold tabular-nums">{qty}</span>
      <button aria-label="Aumentar" onClick={onPlus} className={`${size} grid place-items-center rounded-r-xl text-neutral-200 active:bg-coal-600`}>
        <Plus size={16} />
      </button>
    </div>
  );
}

export function SauceTag({ id }: { id?: SauceId }) {
  const s = getSauce(id);
  if (!s) return null;
  return (
    <span className="pill" style={{ background: `${s.color}26`, color: s.color, border: `1px solid ${s.color}55` }}>
      <SauceIcon id={s.id} size={12} /> {s.short}
    </span>
  );
}

/** Bottom-sheet no mobile, diálogo centrado em ecrãs maiores. */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Fechar" className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full animate-sheetUp flex-col rounded-t-3xl border border-coal-500 bg-coal-800 shadow-2xl md:max-w-lg md:animate-pop md:rounded-3xl">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-coal-500 md:hidden" />
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3">
          <h2 className="font-display text-xl font-semibold tracking-wide">{title}</h2>
          <button aria-label="Fechar" onClick={onClose} className="tap grid place-items-center rounded-full bg-coal-700 text-neutral-300">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="border-t border-coal-600 px-5 pb-safe pt-3 [padding-bottom:max(env(safe-area-inset-bottom),12px)]">{footer}</div>}
      </div>
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="font-display text-2xl font-semibold uppercase tracking-wide text-neutral-50">{children}</h2>
      {right}
    </div>
  );
}
