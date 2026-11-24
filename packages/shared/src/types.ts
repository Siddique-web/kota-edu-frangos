// Tipos de domínio partilhados entre Web e Mobile.

export type Category = 'frangos' | 'hamburguer' | 'sandes' | 'extras' | 'bebidas' | 'combos';

/** required = cliente tem de escolher molho · optional = pode escolher · none = não aplica */
export type SauceMode = 'required' | 'optional' | 'none';

export interface MenuItem {
  id: string;
  name: string;
  price: number; // MT
  category: Category;
  description?: string;
  emoji: string;
  sauceMode: SauceMode;
  available: boolean; // false = "Esgotado Hoje"
  badge?: string;
  isCombo?: boolean;
  comboOf?: string[]; // ids dos itens incluídos num combo
}

export type SauceId =
  | 'original'
  | 'chillies-suave'
  | 'chillies-fogo'
  | 'alho-ervas'
  | 'sem-molho';

export interface Sauce {
  id: SauceId;
  name: string;
  short: string;
  description: string;
  heat: 0 | 1 | 2 | 3;
  color: string;
  emoji: string;
  exclusiveLine?: boolean;
}

export interface CartLine {
  lineId: string;
  itemId: string;
  name: string;
  category: Category;
  unitPrice: number;
  qty: number;
  sauce?: SauceId;
  notes?: string;
  /** linha oferecida pelo Clube Fidelidade (preço 0) */
  reward?: boolean;
}

export type OrderMode = 'mesa' | 'takeaway' | 'delivery';
export type PaymentMethod = 'mpesa' | 'emola' | 'cash' | 'pos';
export type OrderStatus = 'recebido' | 'na_grelha' | 'pronto' | 'entregue';

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number; // MT
}

export interface OrderPayment {
  method: PaymentMethod;
  smsCode?: string;
  /** true quando o pagamento foi verificado pela equipa (ou é cash/POS na entrega) */
  confirmed: boolean;
}

export interface Order {
  id: string;
  number: number; // sequência diária (#001…)
  createdAt: number;
  updatedAt: number;
  status: OrderStatus;
  timeline: Partial<Record<OrderStatus, number>>;
  mode: OrderMode;
  table?: string;
  zoneId?: string;
  zoneName?: string;
  address?: string;
  /** Ponto GPS marcado pelo cliente. O mapa abre nestas coordenadas. */
  lat?: number;
  lng?: number;
  /** Precisão do GPS em metros, no momento em que marcou. */
  accuracy?: number;
  deliveryFee: number;
  customerName: string;
  customerPhone: string;
  lines: CartLine[];
  subtotal: number;
  total: number;
  payment: OrderPayment;
  notes?: string;
  rewardUsed?: boolean;
}

export interface CheckoutDraft {
  mode: OrderMode;
  table: string;
  zoneId: string;
  address: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  name: string;
  phone: string;
  notes: string;
  payment: PaymentMethod;
  smsCode: string;
  sendWhatsapp: boolean;
}

export type CheckoutErrors = Partial<Record<keyof CheckoutDraft | 'cart', string>>;

export interface AppSettings {
  whatsapp: string; // número do restaurante para resumo de pedido
  adminPin: string;
  soundOn: boolean;
}

export interface AppState {
  version: number;
  menu: MenuItem[];
  menuRev: number;
  zones: DeliveryZone[];
  zonesRev: number;
  orders: Order[];
  cart: CartLine[];
  profile: { name: string; phone: string };
  myOrderIds: string[];
  session: { table: string | null };
  settings: AppSettings;
}

/** Alterações incrementais trocadas entre dispositivos (Supabase/Firebase/BroadcastChannel). */
export interface SyncDelta {
  orders?: Order[];
  menu?: { rev: number; items: MenuItem[] };
  zones?: { rev: number; items: DeliveryZone[] };
}

export interface SyncAdapter {
  name: string;
  publish(delta: SyncDelta): void;
  subscribe(handler: (delta: SyncDelta) => void): () => void;
  /** carregamento inicial opcional (ex.: Supabase) */
  fetchInitial?(): Promise<SyncDelta | null>;
}

export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem?(key: string): void | Promise<void>;
}
