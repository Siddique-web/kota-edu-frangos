import type { MenuItem, Sauce, SauceId } from './types';

/** Motor de personalização "Rei dos Molhos". */
export const SAUCES: Sauce[] = [
  {
    id: 'original',
    name: 'Molho Original do Kota',
    short: 'Original',
    description: 'A receita da casa — a base de tudo.',
    heat: 1,
    color: '#F59E0B',
    emoji: '👑',
  },
  {
    id: 'chillies-suave',
    name: 'Kota Edu Africa Chillies (Suave)',
    short: 'Chillies Suave',
    description: 'Piri-piri aromático com picante moderado.',
    heat: 2,
    color: '#F97316',
    emoji: '🌶️',
    exclusiveLine: true,
  },
  {
    id: 'chillies-fogo',
    name: 'Kota Edu Africa Chillies (Fogo Máximo)',
    short: 'Fogo Máximo',
    description: 'Só para corajosos. Picante a sério.',
    heat: 3,
    color: '#DC2626',
    emoji: '🔥',
    exclusiveLine: true,
  },
  {
    id: 'alho-ervas',
    name: 'Alho & Ervas',
    short: 'Alho & Ervas',
    description: 'Fresco, aromático e sem picante.',
    heat: 0,
    color: '#22C55E',
    emoji: '🌿',
  },
  {
    id: 'sem-molho',
    name: 'Sem Molho',
    short: 'Sem Molho',
    description: 'Sem molho, só a grelha.',
    heat: 0,
    color: '#9CA3AF',
    emoji: '🚫',
  },
];

const BY_ID = new Map<SauceId, Sauce>(SAUCES.map((s) => [s.id, s]));

export function getSauce(id?: SauceId | null): Sauce | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function sauceLabel(id?: SauceId | null): string {
  return getSauce(id)?.name ?? '';
}

export function sauceShort(id?: SauceId | null): string {
  return getSauce(id)?.short ?? '';
}

export function itemNeedsSauce(item: Pick<MenuItem, 'sauceMode'>): boolean {
  return item.sauceMode !== 'none';
}

/** Molho usado no toque rápido. Obrigatório entra com o molho da casa; opcional entra sem molho. */
export function quickSauce(item: Pick<MenuItem, 'sauceMode'>): SauceId | undefined {
  return item.sauceMode === 'required' ? 'original' : undefined;
}

/** Devolve mensagem de erro se o molho for inválido para o item. */
export function validateSauce(item: Pick<MenuItem, 'sauceMode'>, sauce?: SauceId | null): string | null {
  if (item.sauceMode === 'required' && !sauce) return 'Escolha um molho para continuar.';
  if (sauce && !BY_ID.has(sauce)) return 'Molho inválido.';
  return null;
}
