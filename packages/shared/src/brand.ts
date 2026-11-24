import type { DeliveryZone, OrderMode, OrderStatus, PaymentMethod } from './types';

export const BRAND = {
  name: 'KOTA EDU FRANGOS',
  tagline: 'REI DOS MOLHOS',
  fullName: 'KOTA EDU FRANGOS — REI DOS MOLHOS',
  sauceLine: 'Kota Edu Africa Chillies',
  slogans: [
    'O Melhor Frango Grelhado de Moz',
    'Kota Edu sempre a mexer os MOLHOS',
    'Sua Encomenda Nossa Paixão',
    'Servimos bem, para servir sempre',
    'Pronto pagamento, ajuda-nos crescer. Muito obrigado',
  ],
  address: 'Rua Correia de Brito, Frente à Pensão Chiveve',
  city: 'Beira, Moçambique',
  phones: ['+258 87 907 1974', '+258 85 748 3457'],
  /** número usado por defeito para o resumo via WhatsApp (formato internacional sem +) */
  whatsapp: '258879071974',
  hours: 'Atendimento contínuo · Selo 24h',
  colors: { coal: '#111111', ember: '#DC2626', gold: '#F59E0B' },
} as const;

export const PAYMENT_ACCOUNTS = {
  mpesa: { number: '857 483 457', raw: '857483457', holder: 'Edmundo Mateus F.' },
  emola: { number: '879 071 974', raw: '879071974', holder: 'Edmundo Mateus F.' },
} as const;

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  mpesa: 'M-Pesa',
  emola: 'E-Mola',
  cash: 'Cash',
  pos: 'P.O.S',
};

export const DIGITAL_PAYMENTS: PaymentMethod[] = ['mpesa', 'emola'];

export const MODE_LABEL: Record<OrderMode, string> = {
  mesa: 'Na Mesa',
  takeaway: 'Take-Away',
  delivery: 'Delivery',
};

export const STATUS_FLOW: OrderStatus[] = ['recebido', 'na_grelha', 'pronto', 'entregue'];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  recebido: 'Recebido',
  na_grelha: 'Na Grelha',
  pronto: 'Pronto / Em Entrega',
  entregue: 'Entregue',
};

/** Taxas de entrega por bairro da Beira (valores de demonstração — editáveis no Painel Admin). */
export const DEFAULT_ZONES: DeliveryZone[] = [
  { id: 'ponta-gea', name: 'Ponta Gêa', fee: 60 },
  { id: 'chaimite', name: 'Chaimite', fee: 70 },
  { id: 'macuti', name: 'Macuti', fee: 80 },
  { id: 'palmeiras', name: 'Palmeiras', fee: 90 },
  { id: 'maquinino', name: 'Maquinino', fee: 100 },
  { id: 'esturro', name: 'Esturro', fee: 80 },
  { id: 'munhava', name: 'Munhava', fee: 120 },
];

export const DEFAULT_PIN = '1234';
export const LOYALTY_GOAL = 5;
export const REWARD_ITEM_IDS = ['refresco-txoti', 'sande-queijo'] as const;

export const DEMO_PROFILE = { name: 'Cliente Demo', phone: '84 123 4567' };
