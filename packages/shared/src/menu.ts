import type { Category, MenuItem } from './types';

export const CATEGORY_LABEL: Record<Category, string> = {
  frangos: 'Frangos (Na Brasa)',
  hamburguer: 'Hambúrguer & Packs',
  sandes: 'Sandes',
  extras: 'Extras',
  bebidas: 'Refrigerantes & Bebidas',
  combos: 'Combos',
};

export const CATEGORY_SHORT: Record<Category, string> = {
  frangos: 'Frangos',
  hamburguer: 'Hambúrguer',
  sandes: 'Sandes',
  extras: 'Extras',
  bebidas: 'Bebidas',
  combos: 'Combos',
};

export const CATEGORY_EMOJI: Record<Category, string> = {
  frangos: '🍗',
  hamburguer: '🍔',
  sandes: '🥪',
  extras: '🍟',
  bebidas: '🥤',
  combos: '🔥',
};

export const CATEGORY_ORDER: Category[] = ['combos', 'frangos', 'hamburguer', 'sandes', 'extras', 'bebidas'];

type Seed = Omit<MenuItem, 'available'>;

/** Cardápio oficial — 30 itens em Meticais (MT). */
const ITEMS: Seed[] = [
  // ── Frangos (Na Brasa)
  { id: 'frango-quarto-classico', name: '1/4 de Frango (Clássico)', price: 250, category: 'frangos', description: 'Batata, Salada + 1 Pão', emoji: '🍗', sauceMode: 'required', badge: 'Mais pedido' },
  { id: 'frango-quarto-completo', name: '1/4 de Frango (Completo)', price: 300, category: 'frangos', description: 'Arroz, Batata + Salada', emoji: '🍗', sauceMode: 'required' },
  { id: 'frango-metade', name: 'Metade de Frango', price: 500, category: 'frangos', description: 'Batata, Salada + 1 Pão', emoji: '🍗', sauceMode: 'required' },
  { id: 'frango-inteiro', name: 'Frango Inteiro', price: 950, category: 'frangos', description: 'Batata, Salada, 4 Pães', emoji: '🍗', sauceMode: 'required', badge: 'Para partilhar' },

  // ── Hambúrguer & Packs
  { id: 'hamb-simples', name: 'Hambúrguer Simples', price: 160, category: 'hamburguer', description: '1 Carne, 1 Ovo, Tomate e Cebola', emoji: '🍔', sauceMode: 'optional' },
  { id: 'salva-vida', name: 'Salva Vida Pack', price: 180, category: 'hamburguer', description: 'Batata, 1 Salsicha e 1 Ovo', emoji: '🌭', sauceMode: 'optional' },
  { id: 'mata-fome', name: 'Mata Fome', price: 200, category: 'hamburguer', description: 'Batata, 2 Salsichas, 1 Pão + Salada', emoji: '🌭', sauceMode: 'optional' },
  { id: 'hamb-queijo', name: 'Hambúrguer com Queijo', price: 210, category: 'hamburguer', description: '1 Carne, 1 Ovo, 1 Queijo, Tomate e Cebola', emoji: '🍔', sauceMode: 'optional' },
  { id: 'hamb-especial', name: 'Hambúrguer Especial', price: 220, category: 'hamburguer', description: '1 Carne, 1 Fiambre, 1 Ovo, 1 Queijo, Tomate e Cebola', emoji: '🍔', sauceMode: 'optional' },
  { id: 'hamb-completo', name: 'Hambúrguer Completo', price: 300, category: 'hamburguer', description: '2 Fiambre, 1 Carne, 1 Ovo, 1 Queijo, Tomate e Cebola + Batata', emoji: '🍔', sauceMode: 'optional' },

  // ── Sandes
  { id: 'sande-queijo', name: 'Sande de Queijo', price: 35, category: 'sandes', description: 'Pão fresco com queijo', emoji: '🥪', sauceMode: 'optional' },
  { id: 'sande-2-ovos', name: 'Sande de 2 Ovos', price: 100, category: 'sandes', description: '2 Ovos, Tomate, Cebola, Molho de Tomate e Maionese', emoji: '🥪', sauceMode: 'optional' },
  { id: 'sande-misto', name: 'Sande Misto', price: 150, category: 'sandes', description: '1 Fiambre, 1 Queijo, 1 Ovo, Tomate, Cebola e Maionese', emoji: '🥪', sauceMode: 'optional' },

  // ── Extras
  { id: 'pao-extra', name: 'Pão Extra', price: 10, category: 'extras', description: 'Unidade de pão fresco', emoji: '🥖', sauceMode: 'none' },
  { id: 'dose-batata', name: 'Dose de Batata', price: 170, category: 'extras', description: 'Batata frita, Salada + 1 Pão', emoji: '🍟', sauceMode: 'optional' },

  // ── Refrigerantes & Bebidas
  { id: 'agua-b-aqua-pequena', name: 'Água Pequena B. aqua', price: 30, category: 'bebidas', emoji: '💧', sauceMode: 'none' },
  { id: 'refresco-txoti', name: 'Refresco Txoti', price: 35, category: 'bebidas', emoji: '🥤', sauceMode: 'none' },
  { id: 'agua-vumba-pequena', name: 'Água Vumba Pequena', price: 40, category: 'bebidas', emoji: '💧', sauceMode: 'none' },
  { id: 'cappy-txoti', name: 'Sumo Cappy Txoti', price: 40, category: 'bebidas', emoji: '🧃', sauceMode: 'none' },
  { id: 'agua-b-aqua-grande', name: 'Água Grande B. aqua', price: 60, category: 'bebidas', emoji: '💧', sauceMode: 'none' },
  { id: 'refresco-lata', name: 'Refresco Lata', price: 70, category: 'bebidas', emoji: '🥫', sauceMode: 'none' },
  { id: 'lemon-twist', name: 'Lemon Twist', price: 70, category: 'bebidas', emoji: '🍋', sauceMode: 'none' },
  { id: 'agua-tonica', name: 'Água Tónica', price: 70, category: 'bebidas', emoji: '🫧', sauceMode: 'none' },
  { id: 'cappy-lata', name: 'Sumo Cappy Lata', price: 75, category: 'bebidas', emoji: '🥫', sauceMode: 'none' },
  { id: 'agua-vumba-grande', name: 'Água Vumba Grande', price: 80, category: 'bebidas', emoji: '💧', sauceMode: 'none' },
  { id: 'refresco-1l', name: 'Refresco 1L', price: 85, category: 'bebidas', emoji: '🥤', sauceMode: 'none' },
  { id: 'cappy-1l', name: 'Sumo Cappy 1 Litro', price: 85, category: 'bebidas', emoji: '🧃', sauceMode: 'none' },
  { id: 'monster', name: 'Monster', price: 90, category: 'bebidas', emoji: '⚡', sauceMode: 'none' },
  { id: 'refresco-2l', name: 'Refresco 2L', price: 125, category: 'bebidas', emoji: '🥤', sauceMode: 'none' },
  { id: 'red-bull', name: 'Red Bull', price: 125, category: 'bebidas', emoji: '⚡', sauceMode: 'none' },
];

/** Há algo para abrir à parte: descrição, molho ou composição de combo. */
export function itemHasDetails(item: Pick<MenuItem, 'description' | 'sauceMode' | 'comboOf'>): boolean {
  return item.sauceMode !== 'none' || !!item.description?.trim() || (item.comboOf?.length ?? 0) > 0;
}

export function buildDefaultMenu(): MenuItem[] {
  return ITEMS.map((i) => ({ ...i, available: true }));
}

export const MENU_ITEM_COUNT = ITEMS.length;
