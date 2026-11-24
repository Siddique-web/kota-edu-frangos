import {
  formatClock,
  formatDuration,
  formatMT,
  formatOrderNumber,
  formatPhoneMZ,
  kdsActionLabel,
  orderMapsUrl,
  modeDetail,
  paymentSummary,
  startOfBusinessDay,
  STATUS_LABEL,
  useNow,
  type Order,
  type OrderStatus,
} from '@kota/shared';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PinPad } from '../components/PinPad';
import { Button, Card, Empty, Pill, SauceTag } from '../components/ui';
import { success } from '../lib/feedback';
import { actions, useAppState } from '../lib/store';
import { useToast } from '../lib/toast';

type Mode = 'estafeta' | 'cozinha';
type KitchenFilter = 'todos' | OrderStatus;

const KITCHEN_FILTERS: Array<{ id: KitchenFilter; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'recebido', label: 'Novos' },
  { id: 'na_grelha', label: 'Grelha' },
  { id: 'pronto', label: 'Prontos' },
  { id: 'entregue', label: 'Concluídos' },
];

/**
 * Modo Equipa (protegido por PIN):
 *  • Estafeta  → confirma entregas e pagamentos
 *  • Cozinha   → dá baixa rápida nos pedidos pelo telemóvel
 */
export default function DeliveryRiderScreen() {
  const { settings, orders } = useAppState();
  const [unlocked, setUnlocked] = useState(false);
  const [mode, setMode] = useState<Mode>('estafeta');
  const [kitchenFilter, setKitchenFilter] = useState<KitchenFilter>('todos');
  const now = useNow(1000);
  const toast = useToast();

  if (!unlocked) {
    return (
      <SafeAreaView className="flex-1 bg-coal" edges={['top']}>
        <PinPad pin={settings.adminPin} title="Modo Equipa" onUnlock={() => setUnlocked(true)} />
      </SafeAreaView>
    );
  }

  const deliveries = orders.filter((o) => o.mode === 'delivery' && (o.status === 'pronto' || o.status === 'na_grelha' || o.status === 'recebido')).sort((a, b) => a.createdAt - b.createdAt);
  const readyDeliveries = deliveries.filter((o) => o.status === 'pronto');
  const todayStart = startOfBusinessDay(now);
  const kitchen = orders
    .filter((o) => (o.status === 'entregue' ? o.createdAt >= todayStart : true))
    .filter((o) => kitchenFilter === 'todos' || o.status === kitchenFilter)
    .sort((a, b) => {
      if (a.status === 'entregue' && b.status !== 'entregue') return 1;
      if (b.status === 'entregue' && a.status !== 'entregue') return -1;
      if (a.status === 'entregue' && b.status === 'entregue') return (b.timeline.entregue ?? 0) - (a.timeline.entregue ?? 0);
      return a.createdAt - b.createdAt;
    });
  const list = mode === 'estafeta' ? deliveries : kitchen;

  return (
    <SafeAreaView className="flex-1 bg-coal" edges={['top']}>
      <View className="flex-row items-center gap-3 border-b border-coal-600 px-4 py-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-gold">
          <Ionicons name="bicycle" size={24} color="#111" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-extrabold uppercase text-white">Modo Equipa</Text>
          <Text className="text-xs text-green-400">● ao vivo · {formatClock(now)}</Text>
        </View>
        <Pressable accessibilityLabel="Bloquear" onPress={() => setUnlocked(false)} className="h-11 flex-row items-center gap-1.5 rounded-xl border border-coal-500 bg-coal-700 px-3 active:opacity-70">
          <Ionicons name="lock-closed" size={16} color="#d4d4d4" />
          <Text className="text-sm font-semibold text-neutral-200">Bloquear</Text>
        </Pressable>
      </View>

      <View className="flex-row gap-2 px-4 py-3">
        {([['estafeta', 'Estafeta', readyDeliveries.length], ['cozinha', 'Cozinha', orders.filter((o) => o.status === 'recebido').length]] as Array<[Mode, string, number]>).map(([id, label, n]) => (
          <Pressable key={id} accessibilityState={{ selected: mode === id }} onPress={() => setMode(id)} className={`min-h-[48px] flex-1 flex-row items-center justify-center gap-2 rounded-xl ${mode === id ? 'bg-ember' : 'bg-coal-800'}`}>
            <Text className={`text-[15px] font-bold ${mode === id ? 'text-white' : 'text-neutral-300'}`}>{label}</Text>
            {n > 0 && (
              <View className="h-5 min-w-[20px] items-center justify-center rounded-full bg-gold px-1">
                <Text className="text-[11px] font-bold text-coal">{n}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {mode === 'cozinha' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, maxHeight: 52 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {KITCHEN_FILTERS.map((f) => {
            const n = orders.filter((o) => (f.id === 'todos' ? o.status !== 'entregue' || o.createdAt >= todayStart : o.status === f.id && (f.id !== 'entregue' || o.createdAt >= todayStart))).length;
            const on = kitchenFilter === f.id;
            return (
              <Pressable key={f.id} accessibilityState={{ selected: on }} onPress={() => setKitchenFilter(f.id)} className={`h-10 flex-row items-center gap-2 rounded-full px-3 ${on ? 'bg-ember' : 'bg-coal-800'}`}>
                <Text className={`text-sm font-bold ${on ? 'text-white' : 'text-neutral-300'}`}>{f.label}</Text>
                <Text className={`text-[11px] font-bold ${on ? 'text-white' : 'text-neutral-400'}`}>{n}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
        <View className="w-full max-w-xl gap-3 self-center">
          {mode === 'cozinha' && (
            <Button variant="ghost" icon="add-circle-outline" label="Simular pedido" onPress={() => { actions.simulateOrder(); toast('Pedido simulado criado'); }} />
          )}
          {list.length === 0 && <Empty icon={mode === 'estafeta' ? 'motorbike' : 'fire'} title="Tudo em dia" text={mode === 'estafeta' ? 'Sem entregas pendentes.' : 'Sem pedidos na cozinha.'} />}
          {list.map((o) => (
            <TeamCard key={o.id} order={o} now={now} mode={mode} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TeamCard({ order: o, now, mode }: { order: Order; now: number; mode: Mode }) {
  const toast = useToast();
  const mins = (now - o.createdAt) / 60_000;
  const urgent = mins >= 20;
  const action = kdsActionLabel(o);
  const digital = o.payment.method === 'mpesa' || o.payment.method === 'emola';
  const needsPay = !o.payment.confirmed;
  const isDelivery = o.mode === 'delivery';
  const busy = useRef(false);

  const advance = () => {
    if (busy.current) return;
    busy.current = true;
    actions.advanceOrder(o.id);
    success();
    setTimeout(() => (busy.current = false), 400);
  };

  const call = () => Linking.openURL(`tel:${o.customerPhone.replace(/\s/g, '')}`).catch(() => toast('Não foi possível ligar', 'err'));
  const map = () => {
    const url = orderMapsUrl(o);
    if (!url) return;
    Linking.openURL(url).catch(() => toast('Não foi possível abrir o mapa', 'err'));
  };

  const btnVariant = o.status === 'recebido' ? 'primary' : o.status === 'na_grelha' ? 'gold' : 'success';

  return (
    <Card className={urgent ? 'border-ember' : ''}>
      <View className="p-3">
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-2xl font-extrabold text-white">{formatOrderNumber(o.number)}</Text>
            <Text className="mt-0.5 text-xs font-bold uppercase tracking-wide text-neutral-300">{modeDetail(o)}</Text>
          </View>
          <View className="items-end">
            <View className={`rounded-lg px-2 py-1 ${urgent ? 'bg-ember' : mins >= 10 ? 'bg-gold' : 'bg-coal-600'}`}>
              <Text className={`text-lg font-extrabold ${mins >= 10 && !urgent ? 'text-coal' : urgent ? 'text-white' : 'text-green-400'}`}>{formatDuration(now - o.createdAt)}</Text>
            </View>
            <Text className="mt-0.5 text-[11px] text-neutral-500">{formatClock(o.createdAt)} · {STATUS_LABEL[o.status]}</Text>
          </View>
        </View>

        <View className="mt-3 gap-2 border-t border-coal-600 pt-2.5">
          {o.lines.map((l) => (
            <View key={l.lineId} className="gap-1">
              <Text className="text-sm font-bold text-white"><Text className="text-gold-400">{l.qty}× </Text>{l.name}</Text>
              {(!!l.sauce || !!l.notes) && (
                <View className="flex-row flex-wrap items-center gap-1.5">
                  <SauceTag id={l.sauce} />
                  {!!l.notes && <Pill tone="gold">{l.notes}</Pill>}
                </View>
              )}
            </View>
          ))}
        </View>
        {!!o.notes && <Text className="mt-2 rounded-lg bg-gold/10 px-2 py-1.5 text-xs text-gold-400">{o.notes}</Text>}

        <View className="mt-3 gap-1 border-t border-coal-600 pt-2">
          <Text className="text-xs text-neutral-400">{o.customerName} · {formatPhoneMZ(o.customerPhone)}</Text>
          {!!o.address && <Text className="text-xs text-neutral-400">{o.address}</Text>}
          <View className="flex-row items-center justify-between">
            <Text className={`flex-1 text-xs ${needsPay ? 'font-bold text-gold-400' : 'text-neutral-400'}`}>{paymentSummary(o)}</Text>
            <Text className="text-base font-extrabold text-white">{formatMT(o.total)}</Text>
          </View>
          {!!o.payment.smsCode && (o.payment.method === 'emola' || o.payment.method === 'mpesa') && (
            <Text className="rounded-lg bg-coal-900 px-2 py-1.5 text-xs text-neutral-200">Comprovativo: {o.payment.smsCode}</Text>
          )}
          {needsPay && !digital && isDelivery && <Text className="text-xs font-bold text-gold-400">Cobrar {formatMT(o.total)} ao cliente na entrega</Text>}
        </View>

        <View className="mt-3 flex-row gap-2">
          {action && <Button className="flex-1" variant={btnVariant} label={mode === 'estafeta' && o.status === 'pronto' ? 'Confirmar entrega' : action} onPress={advance} />}
        </View>
        <View className="mt-2 flex-row gap-2">
          {isDelivery && <Button className="flex-1" variant="ghost" icon="call" label="Ligar" onPress={call} />}
          {isDelivery && <Button className="flex-1" variant="ghost" icon="navigate" label="Mapa" onPress={map} />}
          {needsPay && digital && <Button className="flex-1" variant="ghost" icon="wallet" label="Pago" onPress={() => { actions.confirmPayment(o.id); toast('Pagamento confirmado'); }} />}
        </View>
      </View>
    </Card>
  );
}
