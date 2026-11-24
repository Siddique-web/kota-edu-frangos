import {
  formatClock,
  formatDuration,
  formatMT,
  formatOrderNumber,
  loyaltyStatus,
  modeDetail,
  PAYMENT_ACCOUNTS,
  PAYMENT_LABEL,
  paymentSummary,
  selectMyOrders,
  STATUS_FLOW,
  STATUS_LABEL,
  statusIndex,
  useNow,
  type Order,
} from '@kota/shared';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Empty, Label, SauceTag } from '../components/ui';
import { pasteFromClipboard, success } from '../lib/feedback';
import { actions, useAppState } from '../lib/store';
import { useToast } from '../lib/toast';
import type { TabParamList } from '../navigation/types';

const STEP_ICONS: Array<keyof typeof Ionicons.glyphMap> = ['receipt', 'flame', 'bag-check', 'checkmark-circle'];

export default function LiveTrackerScreen({ navigation }: BottomTabScreenProps<TabParamList, 'Pedido'>) {
  const state = useAppState();
  const mine = selectMyOrders(state);
  const now = useNow(1000);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const current = mine.find((o) => o.id === selectedId) ?? mine.find((o) => o.status !== 'entregue') ?? mine[0];

  // Vibração de sucesso quando o estado do pedido muda
  const lastStatus = useRef<string | undefined>(current?.status);
  useEffect(() => {
    if (current && lastStatus.current && lastStatus.current !== current.status) success();
    lastStatus.current = current?.status;
  }, [current?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) {
    return (
      <SafeAreaView className="flex-1 bg-coal" edges={['top']}>
        <Empty icon="fire" title="Ainda sem pedidos" text="Quando fizer um pedido, acompanha-o aqui em tempo real." action={<Button label="Pedir agora" onPress={() => navigation.navigate('Menu')} />} />
      </SafeAreaView>
    );
  }

  const stats = loyaltyStatus(state.orders, current.customerPhone);

  return (
    <SafeAreaView className="flex-1 bg-coal" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="w-full max-w-xl gap-4 self-center">
          <View>
            <Label>Os seus pedidos · {mine.length}</Label>
            <View className="gap-2">
              {mine.map((o) => {
                const on = o.id === current.id;
                return (
                  <Pressable key={o.id} onPress={() => setSelectedId(o.id)} accessibilityState={{ selected: on }}>
                    <Card className={`flex-row items-center justify-between px-4 py-3 ${on ? 'border-ember' : ''}`}>
                      <View className="flex-1">
                        <Text className="font-bold text-white">{formatOrderNumber(o.number)} · {modeDetail(o)}</Text>
                        <Text className="text-xs text-neutral-400">{formatClock(o.createdAt)} · {STATUS_LABEL[o.status]} · {paymentSummary(o)}</Text>
                      </View>
                      <Text className="text-lg font-extrabold text-gold-400">{formatMT(o.total)}</Text>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <TrackerCard order={current} now={now} />
          <PaymentProof order={current} />

          <Card className="p-4">
            <Text className="text-xs font-bold uppercase tracking-widest text-gold-400">Clube Fidelidade</Text>
            <View className="my-3 flex-row justify-between">
              {Array.from({ length: stats.goal }).map((_, i) => (
                <View key={i} className={`h-12 w-12 items-center justify-center rounded-2xl border-2 ${i < stats.stamps ? 'border-gold bg-gold/15' : 'border-dashed border-coal-500 bg-coal-900'}`}>
                  {i < stats.stamps ? <Ionicons name="flame" size={22} color="#DC2626" /> : <Text className="text-neutral-600">{i + 1}</Text>}
                </View>
              ))}
            </View>
            <Text className="text-sm text-neutral-300">
              {stats.rewardReady ? 'Prémio disponível. Escolha-o no carrinho.' : `Faltam ${stats.remaining} pedido(s) entregues para 1 Refresco Txoti ou Sande de Queijo grátis.`}
            </Text>
          </Card>

          {current.status === 'entregue' && <Button label="Pedir outra vez" onPress={() => navigation.navigate('Menu')} />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PaymentProof({ order }: { order: Order }) {
  const method = order.payment.method;
  const digital = method === 'emola' || method === 'mpesa';
  const toast = useToast();
  const [text, setText] = useState(order.payment.smsCode ?? '');
  useEffect(() => setText(order.payment.smsCode ?? ''), [order.id, order.payment.smsCode]);
  if (!digital) return null;
  if (order.payment.confirmed) {
    return <Card className="p-4"><Text className="text-sm text-green-300">Pagamento validado pela equipa.</Text></Card>;
  }
  const acc = PAYMENT_ACCOUNTS[method];
  const send = () => {
    const res = actions.submitPaymentProof(order.id, text);
    if (!res.ok) toast(res.error, 'err');
    else {
      success();
      toast('Comprovativo enviado. O administrador vai validar.');
    }
  };
  const paste = async () => {
    const t = (await pasteFromClipboard()).trim();
    if (t) setText(t.slice(0, 500));
    else toast('Nada para colar — cole a mensagem', 'err');
  };
  return (
    <Card className="gap-3 p-4">
      <Text className="text-sm text-neutral-200">
        Transfira {formatMT(order.total)} por {PAYMENT_LABEL[order.payment.method]} para {acc.number}, na aplicação, fora deste site.
      </Text>
      <Text className="text-sm text-neutral-300">Depois de transferir, cole a mensagem de confirmação para o administrador validar.</Text>
      <TextInput
        value={text}
        onChangeText={(v) => setText(v.slice(0, 500))}
        placeholder="Cole aqui a SMS de confirmação"
        placeholderTextColor="#737373"
        multiline
        className="min-h-[96px] rounded-xl border border-coal-500 bg-coal-900 px-3.5 py-3 text-base text-white"
        style={{ textAlignVertical: 'top' }}
      />
      <Button variant="ghost" icon="clipboard-outline" label="Colar mensagem" onPress={paste} />
      <Button label={order.payment.smsCode ? 'Actualizar comprovativo' : 'Já transferi'} onPress={send} />
    </Card>
  );
}

function TrackerCard({ order, now }: { order: Order; now: number }) {
  const idx = statusIndex(order.status);
  const done = order.status === 'entregue';
  const elapsed = (done ? order.timeline.entregue ?? now : now) - order.createdAt;
  const progress = useRef(new Animated.Value(idx / 3)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: idx / 3, duration: 600, useNativeDriver: false }).start();
  }, [idx, progress]);

  const labels = STATUS_FLOW.map((s) => (s === 'pronto' && order.mode !== 'delivery' ? 'Pronto' : STATUS_LABEL[s]));
  const hint: Record<string, string> = {
    recebido: 'A cozinha recebeu o seu pedido.',
    na_grelha: 'O seu frango está na brasa.',
    pronto: order.mode === 'delivery' ? 'O estafeta saiu com o seu pedido.' : order.mode === 'mesa' ? 'A caminho da sua mesa.' : 'Pode levantar o seu pedido ao balcão.',
    entregue: 'Pedido entregue. Bom apetite.',
  };

  return (
    <Card className="overflow-hidden">
      <View className="flex-row items-start justify-between bg-ember/25 p-4">
        <View>
          <Text className="text-xs font-bold uppercase tracking-widest text-neutral-300">Pedido</Text>
          <Text className="text-4xl font-extrabold text-white">{formatOrderNumber(order.number)}</Text>
          <Text className="mt-1 text-sm text-neutral-300">{modeDetail(order)}</Text>
        </View>
        <View className="items-end">
          <Text className="text-3xl font-extrabold text-gold-400" style={{ fontVariant: ['tabular-nums'] }}>{formatDuration(elapsed)}</Text>
          <Text className="text-xs text-neutral-400">{done ? 'tempo total' : 'a decorrer'}</Text>
        </View>
      </View>

      <View className="px-4 pb-2 pt-5">
        <View>
          <View className="absolute left-[12.5%] right-[12.5%] top-5 h-1 rounded-full bg-coal-600" />
          <Animated.View
            className="absolute left-[12.5%] top-5 h-1 rounded-full bg-gold"
            style={{ width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '75%'] }) }}
          />
          <View className="flex-row">
            {STATUS_FLOW.map((s, i) => {
              const reached = i <= idx;
              const icon: keyof typeof Ionicons.glyphMap = s === 'pronto' && order.mode === 'delivery' ? 'bicycle' : STEP_ICONS[i];
              return (
                <View key={s} className="flex-1 items-center gap-2">
                  <View className={`h-11 w-11 items-center justify-center rounded-full border-2 ${reached ? 'border-gold bg-ember' : 'border-coal-500 bg-coal-800'}`}>
                    <Ionicons name={icon} size={18} color={reached ? '#fff' : '#737373'} />
                  </View>
                  <Text className={`text-center text-[11px] font-bold leading-tight ${reached ? 'text-white' : 'text-neutral-500'}`}>{labels[i]}</Text>
                  {!!order.timeline[s] && <Text className="text-[10px] text-neutral-500">{formatClock(order.timeline[s]!)}</Text>}
                </View>
              );
            })}
          </View>
        </View>
        <Text className="mt-4 rounded-xl bg-coal-900 px-3 py-2.5 text-center text-sm text-neutral-200">{hint[order.status]}</Text>
      </View>

      <View className="mt-3 gap-2 border-t border-coal-600 p-4">
        {order.lines.map((l) => (
          <View key={l.lineId} className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-1">
              <Text className="text-sm text-white"><Text className="font-bold">{l.qty}× </Text>{l.name}</Text>
              <SauceTag id={l.sauce} />
            </View>
            <Text className="text-sm text-neutral-300">{l.reward ? 'GRÁTIS' : formatMT(l.unitPrice * l.qty)}</Text>
          </View>
        ))}
        <View className="mt-1 flex-row items-center justify-between border-t border-coal-600 pt-2">
          <Text className="flex-1 text-sm font-semibold text-white">Total · {paymentSummary(order)}</Text>
          <Text className="text-lg font-extrabold text-gold-400">{formatMT(order.total)}</Text>
        </View>
      </View>
    </Card>
  );
}
