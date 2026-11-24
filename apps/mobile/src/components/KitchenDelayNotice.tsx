import { KITCHEN_BUSY_AT, KITCHEN_BUSY_MESSAGE, preparingCount } from '@kota/shared';
import { useNavigationState } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useAppState } from '../lib/store';

const VISIBLE_MS = 6500;
const CUSTOMER_TABS = new Set(['Menu', 'Carrinho', 'Pedido']);

/** Aviso curto no ecrã do cliente quando a cozinha já tem muitos pedidos em preparação. */
export function KitchenDelayNotice() {
  const { orders } = useAppState();
  const route = useNavigationState((s) => s.routes[s.index]?.name);
  const busy = CUSTOMER_TABS.has(String(route)) && preparingCount(orders) >= KITCHEN_BUSY_AT;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!busy) {
      setOpen(false);
      return;
    }
    setOpen(true);
    const timer = setTimeout(() => setOpen(false), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [busy, route]);

  if (!open) return null;

  return (
    <View pointerEvents="none" className="absolute inset-x-4 top-14 z-50">
      <View className="rounded-2xl border border-gold/40 bg-coal-800 px-4 py-3">
        <Text className="text-sm font-semibold leading-snug text-gold-400">{KITCHEN_BUSY_MESSAGE}</Text>
      </View>
    </View>
  );
}
