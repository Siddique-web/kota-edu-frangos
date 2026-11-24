import { BRAND, buildDecisionDesk, formatClock, useNow } from '@kota/shared';
import { BarChart3, ChefHat, Compass, Lock, Radio, Settings as Cog, Soup } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { beep, primeAudio, useLocalState, useOnIncrease } from '../lib/hooks';
import { store, useAppState } from '../lib/store';
import { Dashboard } from './Dashboard';
import { DecisionDesk } from './DecisionDesk';
import { Kds } from './Kds';
import { Ledger } from './Ledger';
import { MenuManager } from './MenuManager';
import { PinGate } from './PinGate';
import { SettingsView } from './SettingsView';

type Tab = 'kds' | 'desk' | 'bi' | 'menu' | 'cfg';
const TABS: Array<{ id: Tab; label: string; short: string; hint: string; icon: typeof ChefHat }> = [
  { id: 'kds', label: 'Cozinha', short: 'Cozinha', hint: 'Pedidos ao vivo', icon: ChefHat },
  { id: 'desk', label: 'Agora', short: 'Agora', hint: 'Decisões do turno', icon: Compass },
  { id: 'bi', label: 'Estatísticas', short: 'Stats', hint: 'Faturação e picos', icon: BarChart3 },
  { id: 'menu', label: 'Cardápio', short: 'Menu', hint: 'Preços e stock', icon: Soup },
  { id: 'cfg', label: 'Definições', short: 'Config', hint: 'PIN, zonas, som', icon: Cog },
];

export function AdminApp() {
  const { settings, orders, menu } = useAppState();
  const [unlocked, setUnlocked] = useLocalState('kota-admin-unlocked', false);
  const [tab, setTab] = useState<Tab>('kds');
  const [kitchenQuery, setKitchenQuery] = useState('');
  const [kitchenNonce, setKitchenNonce] = useState(0);
  const [statsView, setStatsView] = useState<'charts' | 'fecho'>('charts');
  const now = useNow(30_000);
  const pending = orders.filter((o) => o.status === 'recebido').length;
  const attention = useMemo(
    () => buildDecisionDesk(orders, menu, now).alerts.filter((a) => a.tone !== 'green').length,
    [orders, menu, now],
  );
  const openInKitchen = (query: string) => {
    setKitchenQuery(query);
    setKitchenNonce((n) => n + 1);
    setTab('kds');
  };

  useOnIncrease(pending, () => {
    if (settings.soundOn) beep();
  });

  useEffect(() => {
    const prime = () => primeAudio();
    window.addEventListener('pointerdown', prime);
    return () => window.removeEventListener('pointerdown', prime);
  }, []);

  if (!unlocked) return <PinGate pin={settings.adminPin} onUnlock={() => { primeAudio(); setUnlocked(true); }} />;
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className="lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:items-start">
      <aside className="sticky top-11 hidden h-[calc(100dvh-44px)] flex-col border-r border-coal-600 bg-coal-950 lg:flex">
        <div className="flex items-center gap-3 px-4 pb-3 pt-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold to-gold-600 text-coal shadow-gold">
            <ChefHat size={20} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold uppercase leading-none tracking-wide">Kota Edu</p>
            <p className="mt-1 truncate text-[11px] text-neutral-500">Gestão · {BRAND.city}</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Painel">
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={on ? 'page' : undefined}
                className={`flex min-h-[52px] items-center gap-3 rounded-xl px-3 text-left transition ${
                  on ? 'bg-ember text-white shadow-ember' : 'text-neutral-300 hover:bg-coal-800'
                }`}
              >
                <t.icon size={18} className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{t.label}</span>
                  <span className={`block truncate text-[11px] ${on ? 'text-white/75' : 'text-neutral-500'}`}>{t.hint}</span>
                </span>
                {t.id === 'kds' && pending > 0 && <span className="pill bg-gold text-coal">{pending}</span>}
                {t.id === 'desk' && attention > 0 && <span className="pill bg-ember text-white">{attention}</span>}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-coal-600 p-3">
          <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] text-neutral-400">
            <Radio size={12} className="animate-pulse text-green-400" />
            <span className="text-green-400">Ao vivo</span>
            <span>· {formatClock(now)}</span>
          </p>
          <button className="btn-ghost w-full" onClick={() => setUnlocked(false)}>
            <Lock size={16} /> Bloquear
          </button>
        </div>
      </aside>

      <div className="min-w-0 pb-40 lg:pb-6">
        <header className="sticky top-11 z-40 border-b border-coal-600 bg-coal/90 backdrop-blur-md lg:hidden">
          <div className="flex h-16 items-center gap-3 px-3 sm:px-5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold to-gold-600 text-coal shadow-gold">
              <ChefHat size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg font-bold uppercase leading-none tracking-wide">{current.label}</p>
              <p className="mt-1 flex items-center gap-2 text-[11px] text-neutral-400">
                <span className="inline-flex items-center gap-1 text-green-400">
                  <Radio size={12} className="animate-pulse" /> ao vivo
                </span>
                <span>· {formatClock(now)}</span>
              </p>
            </div>
            <button className="btn-ghost btn-sm" onClick={() => setUnlocked(false)} aria-label="Bloquear painel">
              <Lock size={16} />
            </button>
          </div>
        </header>

        <div className="sticky top-11 z-30 hidden h-12 items-center justify-between border-b border-coal-600 bg-coal/80 px-5 text-xs text-neutral-400 backdrop-blur lg:flex">
          <p className="font-display text-sm uppercase tracking-wide text-neutral-200">{current.label}</p>
          <p className="flex items-center gap-2">
            <Radio size={12} className="animate-pulse text-green-400" />
            <span className="text-green-400">Ao vivo</span>
            <span>· {formatClock(now)}</span>
            <span className="text-neutral-600">·</span>
            <span>sync {store.syncName}</span>
          </p>
        </div>

        <main className="px-3 pt-4 sm:px-5">
          {tab === 'kds' && <Kds focusQuery={kitchenQuery} focusNonce={kitchenNonce} />}
          {tab === 'desk' && <DecisionDesk onOpen={openInKitchen} />}
          {tab === 'bi' && (
            <div className="space-y-4">
              <div className="flex w-fit rounded-full bg-coal-700 p-0.5" role="tablist" aria-label="Vista das estatísticas">
                <button role="tab" aria-selected={statsView === 'charts'} onClick={() => setStatsView('charts')} className={`min-h-[40px] rounded-full px-4 text-sm font-semibold ${statsView === 'charts' ? 'bg-ember text-white' : 'text-neutral-300'}`}>Gráficos</button>
                <button role="tab" aria-selected={statsView === 'fecho'} onClick={() => setStatsView('fecho')} className={`min-h-[40px] rounded-full px-4 text-sm font-semibold ${statsView === 'fecho' ? 'bg-ember text-white' : 'text-neutral-300'}`}>Fecho</button>
              </div>
              {statsView === 'charts' ? <Dashboard /> : <Ledger />}
            </div>
          )}
          {tab === 'menu' && <MenuManager />}
          {tab === 'cfg' && <SettingsView />}
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-50 border-t border-coal-600 bg-coal-950/95 backdrop-blur-md lg:hidden [padding-bottom:env(safe-area-inset-bottom)]"
          aria-label="Painel"
        >
          <ul className="mx-auto grid max-w-xl grid-cols-5">
            {TABS.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id ? 'page' : undefined}
                  className={`flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold ${tab === t.id ? 'text-ember-400' : 'text-neutral-400'}`}
                >
                  <span className={`relative grid h-8 w-14 place-items-center rounded-full ${tab === t.id ? 'bg-ember/15' : ''}`}>
                    <t.icon size={21} />
                    {t.id === 'kds' && pending > 0 && (
                      <span className="absolute -right-0.5 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold text-coal">
                        {pending}
                      </span>
                    )}
                    {t.id === 'desk' && attention > 0 && (
                      <span className="absolute -right-0.5 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ember px-1 text-[11px] font-bold text-white">
                        {attention}
                      </span>
                    )}
                  </span>
                  {t.short}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
