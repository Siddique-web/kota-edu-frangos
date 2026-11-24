import {
  BRAND,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  CATEGORY_SHORT,
  formatMT,
  getSauce,
  itemHasDetails,
  quickSauce,
  type Category,
  type MenuItem,
} from '@kota/shared';
import { Drumstick, Flame, Info, Search, X } from 'lucide-react';
import { CategoryIcon, ItemIcon } from '../lib/marks';
import { useMemo, useState } from 'react';
import { actions, useAppState } from '../lib/store';
import { vibrate } from '../lib/hooks';
import { useToast } from '../lib/toast';
import { SauceModal } from './SauceModal';

function norm(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function MenuView() {
  const { menu, cart } = useAppState();
  const toast = useToast();
  const [cat, setCat] = useState<Category | 'todos'>('todos');
  const [query, setQuery] = useState('');
  const [sauceItem, setSauceItem] = useState<MenuItem | null>(null);

  const q = norm(query.trim());
  const categories = useMemo(() => CATEGORY_ORDER.filter((c) => menu.some((m) => m.category === c)), [menu]);

  const counts = useMemo(() => {
    const map = new Map<Category, number>();
    for (const item of menu) {
      if (!item.available) continue;
      map.set(item.category, (map.get(item.category) ?? 0) + 1);
    }
    return map;
  }, [menu]);

  const matches = (item: MenuItem) => {
    if (cat !== 'todos' && item.category !== cat) return false;
    if (!q) return true;
    return norm(`${item.name} ${item.description ?? ''} ${item.badge ?? ''}`).includes(q);
  };

  const visible = categories.filter((c) => menu.some((m) => m.category === c && matches(m)));
  const resultCount = menu.filter(matches).length;

  const featured = useMemo(() => {
    const badged = menu.filter((m) => m.available && m.badge);
    const fillers = menu.filter(
      (m) => m.available && !m.badge && (m.category === 'combos' || m.category === 'frangos' || m.category === 'hamburguer'),
    );
    return [...badged, ...fillers].slice(0, 4);
  }, [menu]);

  const showFeatured = !q && cat === 'todos' && featured.length > 0;

  const add = (item: MenuItem) => {
    if (!item.available) return;
    const sauce = quickSauce(item);
    const r = actions.addToCart(item.id, { sauce });
    if (r.ok) {
      vibrate();
      const sauceName = sauce ? getSauce(sauce)?.short : undefined;
      toast(sauceName ? `${item.name} adicionado · ${sauceName}` : `${item.name} adicionado`);
    } else toast(r.error ?? 'Erro', 'err');
  };

  const qtyOf = (id: string) => cart.filter((l) => l.itemId === id && !l.reward).reduce((s, l) => s + l.qty, 0);

  return (
    <div className="animate-fadeUp">
      <section className="relative mb-4 overflow-hidden rounded-2xl border border-ember/40 bg-gradient-to-r from-ember-700 via-ember to-coal-800 px-4 py-4 shadow-ember sm:px-5">
        <div className="pointer-events-none absolute -right-1 top-3 text-white/15 sm:top-2" aria-hidden>
          <Drumstick size={84} strokeWidth={1.25} />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">Beira · {BRAND.sauceLine}</p>
        <h1 className="mt-1 max-w-[18ch] font-display text-[1.65rem] font-bold uppercase leading-[1.05] text-white sm:text-4xl">
          {BRAND.slogans[0]}
        </h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-white/90">
          <Flame size={15} className="animate-flame" /> Molho escolhido na hora · {BRAND.hours}
        </p>
      </section>

      <label className="relative mb-3 block">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar prato, acompanhamento ou bebida…"
          className="input h-12 pl-11 pr-11"
          aria-label="Pesquisar no cardápio"
        />
        {query && (
          <button
            type="button"
            aria-label="Limpar pesquisa"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-neutral-400 hover:bg-coal-700 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </label>

      <div className="sticky top-[calc(44px+64px)] z-30 -mx-3 bg-coal/95 px-3 py-2 backdrop-blur sm:-mx-5 sm:px-5">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Categorias</p>
        <div className="no-scrollbar flex snap-x gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Categorias">
          <CategoryTile
            active={cat === 'todos'}
            id="todos"
            label="Tudo"
            hint={`${menu.filter((m) => m.available).length}`}
            onClick={() => setCat('todos')}
          />
          {categories.map((c) => (
            <CategoryTile
              key={c}
              active={cat === c}
              id={c}
              label={CATEGORY_SHORT[c]}
              hint={`${counts.get(c) ?? 0}`}
              onClick={() => setCat(c)}
            />
          ))}
        </div>
      </div>

      {q && (
        <p className="mt-3 text-sm text-neutral-400">
          {resultCount === 0 ? 'Nenhum prato encontrado' : `${resultCount} ${resultCount === 1 ? 'resultado' : 'resultados'}`}
          {query.trim() ? ` para “${query.trim()}”` : ''}
        </p>
      )}

      {showFeatured && (
        <section className="mt-4" aria-labelledby="sugestoes">
          <h2 id="sugestoes" className="mb-2.5 font-display text-xl font-semibold uppercase tracking-wide text-gold-400">
            Sugestões da casa
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((item) => (
              <ItemCard
                key={`feat-${item.id}`}
                item={item}
                qty={qtyOf(item.id)}
                onAdd={() => add(item)}
                onDetails={() => setSauceItem(item)}
              />
            ))}
          </div>
        </section>
      )}

      {resultCount === 0 ? (
        <div className="card-pad mt-4 text-center">
          <p className="font-display text-xl uppercase">Nada com esse nome</p>
          <p className="mt-1 text-sm text-neutral-400">Tente outro prato ou veja o cardápio completo.</p>
          <button className="btn-ghost mt-4" onClick={() => { setQuery(''); setCat('todos'); }}>
            Ver tudo
          </button>
        </div>
      ) : q ? (
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {menu.filter(matches).map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              qty={qtyOf(item.id)}
              onAdd={() => add(item)}
              onDetails={() => setSauceItem(item)}
            />
          ))}
        </div>
      ) : (
        visible.map((c) => (
          <section key={c} className="mt-5" aria-labelledby={`cat-${c}`}>
            <div className="mb-2.5 flex items-baseline justify-between gap-2">
              <h2 id={`cat-${c}`} className="font-display text-xl font-semibold uppercase tracking-wide text-gold-400">
                {CATEGORY_LABEL[c]}
              </h2>
              <span className="text-xs text-neutral-500">{counts.get(c) ?? 0} disponíveis</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {menu
                .filter((m) => m.category === c)
                .map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    qty={qtyOf(item.id)}
                    onAdd={() => add(item)}
                    onDetails={() => setSauceItem(item)}
                  />
                ))}
            </div>
          </section>
        ))
      )}

      <p className="mt-8 text-center text-sm italic text-neutral-500">“{BRAND.slogans[3]}”</p>
      <SauceModal item={sauceItem} onClose={() => setSauceItem(null)} />
    </div>
  );
}

function CategoryTile({
  active,
  id,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  id: Category | 'todos';
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex w-[92px] shrink-0 snap-start flex-col items-center rounded-2xl border px-2 py-2.5 transition active:scale-[.98] ${
        active ? 'border-ember bg-ember text-white shadow-ember' : 'border-coal-600 bg-coal-800 text-neutral-200 hover:border-coal-500'
      }`}
    >
      <CategoryIcon id={id} size={22} />
      <span className="mt-1 max-w-full truncate text-[12px] font-semibold">{label}</span>
      <span className={`text-[10px] ${active ? 'text-white/80' : 'text-neutral-500'}`}>{hint} ativos</span>
    </button>
  );
}

function ItemCard({
  item,
  qty,
  onAdd,
  onDetails,
}: {
  item: MenuItem;
  qty: number;
  onAdd: () => void;
  onDetails: () => void;
}) {
  const off = !item.available;
  const details = itemHasDetails(item);
  return (
    <article className={`card relative flex flex-col overflow-hidden ${off ? 'opacity-55' : ''}`}>
      <button
        type="button"
        onClick={onAdd}
        disabled={off}
        aria-label={off ? `${item.name} esgotado` : `Adicionar ${item.name}`}
        className="flex flex-1 flex-col text-left disabled:cursor-not-allowed"
      >
        <div className={`relative grid h-[88px] place-items-center bg-gradient-to-br from-coal-700 to-ember-700/80 sm:h-28 ${off ? 'grayscale' : ''}`}>
          <ItemIcon item={item} size={36} className="text-white" />
          {item.badge && !off && (
            <span className="absolute left-2 top-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-coal">
              {item.badge}
            </span>
          )}
          {off && <span className="absolute left-2 top-2 pill bg-coal-900/80 text-neutral-200">Esgotado</span>}
          {qty > 0 && (
            <span className="absolute bottom-2 right-2 grid h-6 min-w-6 place-items-center rounded-full bg-gold px-1.5 text-[12px] font-bold text-coal">
              {qty}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-2.5 sm:p-3.5">
          <h3 className="text-[13px] font-semibold leading-snug sm:text-[15px]">{item.name}</h3>
          {item.description && <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-neutral-400 sm:text-[13px]">{item.description}</p>}
          <p className={`mt-auto pt-2.5 font-display text-lg font-semibold text-gold-400 sm:text-xl ${details && !off ? 'pr-10' : ''}`}>{formatMT(item.price)}</p>
        </div>
      </button>
      {details && !off && (
        <button
          type="button"
          onClick={onDetails}
          aria-label={`Ver detalhes de ${item.name}`}
          className="absolute bottom-2.5 right-2.5 z-10 grid h-9 w-9 place-items-center rounded-full border border-coal-500 bg-coal-900 text-gold-400 hover:bg-coal-700"
        >
          <Info size={18} />
        </button>
      )}
    </article>
  );
}
