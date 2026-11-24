import type { Category, MenuItem, SauceId } from '@kota/shared';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type Name = ComponentProps<typeof MaterialCommunityIcons>['name'];

const CATEGORY: Record<Category, Name> = {
  frangos: 'food-drumstick',
  hamburguer: 'hamburger',
  sandes: 'food',
  extras: 'french-fries',
  bebidas: 'cup',
  combos: 'fire',
};

const SAUCE: Record<SauceId, Name> = {
  original: 'crown',
  'chillies-suave': 'chili-mild',
  'chillies-fogo': 'chili-hot',
  'alho-ervas': 'leaf',
  'sem-molho': 'cancel',
};

export function categoryIcon(id: Category | 'todos'): Name {
  return id === 'todos' ? 'silverware-fork-knife' : CATEGORY[id];
}

export function itemIcon(item: Pick<MenuItem, 'id' | 'category'>): Name {
  if (item.id.startsWith('agua')) return 'cup-water';
  if (item.id.includes('lemon') || item.id.includes('cappy')) return 'fruit-citrus';
  if (item.id === 'monster' || item.id === 'red-bull') return 'lightning-bolt';
  if (item.id.startsWith('refresco')) return 'cup';
  if (item.id === 'pao-extra') return 'bread-slice';
  if (item.id === 'dose-batata') return 'french-fries';
  if (item.id === 'salva-vida' || item.id === 'mata-fome') return 'food-hot-dog';
  return CATEGORY[item.category] ?? 'silverware-fork-knife';
}

export function ItemMark({ item, size = 28, color = '#ffffff' }: { item: Pick<MenuItem, 'id' | 'category'>; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={itemIcon(item)} size={size} color={color} />;
}

export function CategoryMark({ id, size = 16, color = '#ffffff' }: { id: Category | 'todos'; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={categoryIcon(id)} size={size} color={color} />;
}

export function SauceMark({ id, size = 14, color = '#ffffff' }: { id: SauceId; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={SAUCE[id]} size={size} color={color} />;
}
