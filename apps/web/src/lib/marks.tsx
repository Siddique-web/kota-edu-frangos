import type { Category, MenuItem, SauceId } from '@kota/shared';
import {
  Ban,
  Beef,
  Citrus,
  CookingPot,
  Croissant,
  Crown,
  CupSoda,
  Drumstick,
  Flame,
  GlassWater,
  LayoutGrid,
  Leaf,
  Sandwich,
  UtensilsCrossed,
  Wheat,
  Zap,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';

const CATEGORY_ICON: Record<Category, LucideIcon> = {
  frangos: Drumstick,
  hamburguer: Beef,
  sandes: Sandwich,
  extras: Croissant,
  bebidas: CupSoda,
  combos: Flame,
};

const SAUCE_ICON: Record<SauceId, LucideIcon> = {
  original: Crown,
  'chillies-suave': Flame,
  'chillies-fogo': Flame,
  'alho-ervas': Leaf,
  'sem-molho': Ban,
};

export function itemIcon(item: Pick<MenuItem, 'id' | 'category'>): LucideIcon {
  if (item.id.startsWith('agua')) return GlassWater;
  if (item.id.includes('lemon') || item.id.includes('cappy')) return Citrus;
  if (item.id === 'monster' || item.id === 'red-bull') return Zap;
  if (item.id.startsWith('refresco')) return CupSoda;
  if (item.id === 'pao-extra') return Wheat;
  if (item.id === 'dose-batata') return Croissant;
  if (item.id === 'salva-vida' || item.id === 'mata-fome') return CookingPot;
  return CATEGORY_ICON[item.category] ?? UtensilsCrossed;
}

export function ItemIcon({ item, ...props }: { item: Pick<MenuItem, 'id' | 'category'> } & LucideProps) {
  const Icon = itemIcon(item);
  return <Icon aria-hidden {...props} />;
}

export function CategoryIcon({ id, ...props }: { id: Category | 'todos' } & LucideProps) {
  const Icon = id === 'todos' ? LayoutGrid : CATEGORY_ICON[id];
  return <Icon aria-hidden {...props} />;
}

export function SauceIcon({ id, ...props }: { id: SauceId } & LucideProps) {
  const Icon = SAUCE_ICON[id];
  return <Icon aria-hidden {...props} />;
}
