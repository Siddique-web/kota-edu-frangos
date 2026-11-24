import { BRAND, cartCount, selectMyActiveOrder, useNow } from '@kota/shared';
import { Drumstick, Gift, Moon, ShoppingCart, Store, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMediaQuery } from '../lib/hooks';
import { useAppState } from '../lib/store';
import { CartPanel } from './CartPanel';
import { ClubView } from './ClubView';
import { KitchenDelayNotice } from './KitchenDelayNotice';
import { MenuView } from './MenuView';
import { TrackerView } from './TrackerView';

type View = 'menu' | 'cart' | 'track' | 'club';

const NAV: Array<{ id: View; label: string; icon: typeof Store }> = [
  { id: 'menu', label: 'Menu', icon: Store },
  { id: 'cart', label: 'Carrinho', icon: ShoppingCart },
  { id: 'track', label: 'Pedido', icon: Truck },
  { id: 'club', label: 'Clube', icon: Gift },
];

export function CustomerApp() {
  const state = useAppState();
  const [view, setView] = useState<View>('menu');
  const isXl = useMediaQuery('(min-width: 1280px)');
  const count = cartCount(state.cart);
  const active = selectMyActiveOrder(state);
  const hasActive = !!active && active.status !== 'entregue';
  const effective: View = isXl && view === 'cart' ? 'menu' : view;
  const nav = NAV.filter((n) => !(isXl && n.id === 'cart'));

  // Slogan rotativo
  const tick = useNow(5000);
  const slogan = BRAND.slogans[Math.floor(tick / 5000) % BRAND.slogans.length];

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  return (
    <div className="min-h-[calc(100dvh-44px)] pb-36 lg:pb-8">
      <header className="sticky top-11 z-40 border-b border-coal-600 bg-coal/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-3 py-2.5 sm:px-5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-ember to-ember-700 text-white shadow-ember" aria-hidden>
            <Drumstick size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] font-bold uppercase leading-none tracking-wide sm:text-xl">Kota Edu Frangos</p>
            <p className="mt-1 font-display text-[15px] font-bold uppercase leading-none tracking-wide text-gold sm:text-lg">Rei dos Molhos</p>
            <p key={slogan} className="mt-1 hidden truncate text-[11px] italic text-neutral-400 animate-fadeUp sm:block sm:text-xs">{slogan}</p>
          </div>
          {state.session.table && (
            <span className="pill hidden bg-gold/15 text-gold-400 sm:inline-flex">Mesa {state.session.table}</span>
          )}
          <span className="pill shrink-0 border border-gold/40 bg-gold/10 text-gold-400" title={BRAND.hours}>
            <Moon size={13} /> 24H
          </span>
          {/* Navegação superior (lg+) */}
          <nav className="ml-2 hidden items-center gap-1 lg:flex" aria-label="Principal">
            {nav.map((n) => (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={`relative flex min-h-[44px] items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition ${effective === n.id ? 'bg-ember text-white' : 'text-neutral-300 hover:bg-coal-700'}`}
              >
                <n.icon size={17} /> {n.label}
                {n.id === 'cart' && count > 0 && <Badge>{count}</Badge>}
                {n.id === 'track' && hasActive && <Dot />}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-3 pt-4 sm:px-5 xl:grid xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start xl:gap-6">
        <section aria-live="polite">
          <KitchenDelayNotice active={effective === 'menu' || effective === 'cart' || effective === 'track'} />
          {effective === 'menu' && <MenuView />}
          {effective === 'cart' && (
            <div className="mx-auto max-w-xl animate-fadeUp">
              <CartPanel onPlaced={() => setView('track')} onBackToMenu={() => setView('menu')} />
            </div>
          )}
          {effective === 'track' && <TrackerView onMenu={() => setView('menu')} />}
          {effective === 'club' && <ClubView />}
        </section>

        {isXl && (
          <aside className="sticky top-[120px] max-h-[calc(100dvh-136px)] overflow-y-auto rounded-2xl" aria-label="Pedido em curso">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold uppercase">
                <ShoppingCart size={20} className="text-ember-400" /> Pedido em curso
              </h2>
              {count > 0 && <span className="pill bg-ember text-white">{count}</span>}
            </div>
            {state.session.table && <p className="mb-2 text-xs font-semibold text-gold-400">Mesa {state.session.table}</p>}
            <CartPanel onPlaced={() => setView('track')} onBackToMenu={() => setView('menu')} />
          </aside>
        )}
      </main>

      {/* Bottom Tab Bar (mobile + tablet) */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-coal-600 bg-coal-950/95 backdrop-blur-md lg:hidden [padding-bottom:env(safe-area-inset-bottom)]" aria-label="Principal">
        <ul className="mx-auto grid max-w-xl grid-cols-4">
          {NAV.map((n) => {
            const on = effective === n.id;
            return (
              <li key={n.id}>
                <button onClick={() => setView(n.id)} aria-current={on ? 'page' : undefined} className={`relative flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${on ? 'text-ember-400' : 'text-neutral-400'}`}>
                  <span className={`relative grid h-8 w-14 place-items-center rounded-full transition ${on ? 'bg-ember/15' : ''}`}>
                    <n.icon size={21} />
                    {n.id === 'cart' && count > 0 && <Badge>{count}</Badge>}
                    {n.id === 'track' && hasActive && <Dot />}
                  </span>
                  {n.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Barra "Ver carrinho" flutuante no menu (mobile) */}
      {effective === 'menu' && count > 0 && !isXl && (
        <button onClick={() => setView('cart')} className="btn-primary fixed inset-x-3 bottom-20 z-40 h-12 animate-pop shadow-ember lg:inset-x-auto lg:right-6 lg:bottom-6 lg:px-8">
          <ShoppingCart size={18} /> Ver carrinho · {count} {count === 1 ? 'item' : 'itens'}
        </button>
      )}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold text-coal">{children}</span>;
}
function Dot() {
  return <span className="absolute right-3 top-0 h-2.5 w-2.5 animate-pulse rounded-full bg-ember ring-2 ring-coal-950" />;
}
