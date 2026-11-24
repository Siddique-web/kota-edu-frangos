import { KITCHEN_BUSY_AT, KITCHEN_BUSY_MESSAGE, preparingCount } from '@kota/shared';
import { Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppState } from '../lib/store';

const VISIBLE_MS = 6500;

/** Aviso curto no ecrã do cliente quando a cozinha já tem muitos pedidos em preparação. */
export function KitchenDelayNotice({ active }: { active: boolean }) {
  const { orders } = useAppState();
  const busy = active && preparingCount(orders) >= KITCHEN_BUSY_AT;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!busy) {
      setOpen(false);
      return;
    }
    setOpen(true);
    const timer = window.setTimeout(() => setOpen(false), VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [busy]);

  if (!open) return null;

  return (
    <div role="status" className="mx-auto mb-4 flex max-w-xl animate-fadeUp items-start gap-3 rounded-2xl border border-gold/40 bg-coal-800 px-4 py-3 text-sm font-semibold leading-snug text-gold-400 shadow-gold">
      <Clock size={18} className="mt-0.5 shrink-0" aria-hidden />
      <p>{KITCHEN_BUSY_MESSAGE}</p>
    </div>
  );
}
