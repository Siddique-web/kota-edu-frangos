import {
  BRAND,
  buildWhatsAppMessage,
  cartCount,
  cartSubtotal,
  computeTotals,
  DIGITAL_PAYMENTS,
  emptyDraft,
  formatMT,
  getUpsells,
  mapsPinUrl,
  validateDeliveryPin,
  hasErrors,
  lineTotal,
  loyaltyStatus,
  MODE_LABEL,
  PAYMENT_ACCOUNTS,
  PAYMENT_LABEL,
  rewardOptions,
  validateCheckout,
  whatsappLink,
  type CheckoutDraft,
  type CheckoutErrors,
  type OrderMode,
  type PaymentMethod,
} from '@kota/shared';
import { Ionicons } from '@expo/vector-icons';
import { ItemMark } from '../lib/marks';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Empty, Label, Qty, SauceTag, ScreenTitle } from '../components/ui';
import { copyToClipboard, pasteFromClipboard, success, tap, warn } from '../lib/feedback';
import { actions, useAppState } from '../lib/store';
import { useToast } from '../lib/toast';
import type { TabParamList } from '../navigation/types';

const STEPS = ['Carrinho', 'Entrega', 'Pagamento'];
const MODE_ICON: Record<OrderMode, keyof typeof Ionicons.glyphMap> = { mesa: 'restaurant', takeaway: 'bag-handle', delivery: 'bicycle' };
const PAY_ICON: Record<PaymentMethod, keyof typeof Ionicons.glyphMap> = { mpesa: 'phone-portrait', emola: 'phone-portrait', cash: 'cash', pos: 'card' };

/** Carrinho + checkout em 3 etapas rápidas (sem rolagem excessiva). */
export default function CartCheckoutScreen({ navigation }: BottomTabScreenProps<TabParamList, 'Carrinho'>) {
  const { cart, menu, zones, orders, profile, session, settings } = useAppState();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<CheckoutDraft>(() => emptyDraft(session.table, profile));
  const [errors, setErrors] = useState<CheckoutErrors>({});

  useEffect(() => {
    if (session.table) setDraft((d) => ({ ...d, mode: 'mesa', table: session.table! }));
  }, [session.table]);

  const patch = (p: Partial<CheckoutDraft>) => {
    setDraft((d) => ({ ...d, ...p }));
    setErrors((e) => {
      const n = { ...e };
      (Object.keys(p) as Array<keyof CheckoutDraft>).forEach((k) => delete n[k]);
      return n;
    });
  };

  const totals = computeTotals(cart, draft.mode, zones, draft.zoneId);
  const loyalty = loyaltyStatus(orders, draft.phone || profile.phone);
  const upsells = getUpsells(cart, menu);
  const hasReward = cart.some((l) => l.reward);

  if (cart.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-coal" edges={['top']}>
        <Empty
          icon="cart"
          title="O carrinho está vazio"
          text="Escolha o seu frango e o molho do Kota."
          action={<Button label="Ver cardápio" onPress={() => navigation.navigate('Menu')} />}
        />
      </SafeAreaView>
    );
  }

  const next = () => {
    if (step === 0) return setStep(1);
    if (step === 1) {
      const e = validateCheckout(draft, 1, cart);
      setErrors(e);
      if (hasErrors(e)) return warn();
      setStep(2);
    }
  };

  const submit = () => {
    const res = actions.placeOrder(draft);
    if (!res.ok) {
      setErrors(res.errors);
      warn();
      if (res.errors.cart) toast(res.errors.cart, 'err');
      if (res.errors.name || res.errors.phone || res.errors.table || res.errors.zoneId || res.errors.address || res.errors.lat) setStep(1);
      return;
    }
    success();
    toast('Pedido enviado para a cozinha!');
    if (draft.sendWhatsapp) {
      Linking.openURL(whatsappLink(settings.whatsapp || BRAND.whatsapp, buildWhatsAppMessage(res.order))).catch(() => toast('WhatsApp indisponível', 'err'));
    }
    setStep(0);
    setDraft(emptyDraft(session.table, { name: draft.name, phone: draft.phone }));
    navigation.navigate('Pedido');
  };

  return (
    <SafeAreaView className="flex-1 bg-coal" edges={['top']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Etapas */}
        <View className="flex-row gap-1 border-b border-coal-600 bg-coal-900 px-3 py-3">
          {STEPS.map((s, i) => (
            <Pressable
              key={s}
              disabled={i >= step}
              onPress={() => setStep(i)}
              accessibilityState={{ selected: i === step }}
              className={`min-h-[44px] flex-1 flex-row items-center justify-center gap-1 rounded-xl ${i === step ? 'bg-ember' : i < step ? 'bg-coal-600' : 'bg-coal-800'}`}
            >
              {i < step ? <Ionicons name="checkmark" size={14} color="#FBBF24" /> : <Text className="text-[11px] text-white/70">{i + 1}</Text>}
              <Text className={`text-[13px] font-bold ${i === step ? 'text-white' : i < step ? 'text-gold-400' : 'text-neutral-500'}`}>{s}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <View className="w-full max-w-xl self-center">
            {step === 0 && (
              <View>
                <ScreenTitle>O seu pedido</ScreenTitle>
                <Card className="px-4">
                  {cart.map((l, i) => (
                    <View key={l.lineId} className={`flex-row items-start gap-3 py-3 ${i > 0 ? 'border-t border-coal-600' : ''}`}>
                      <View className="flex-1 gap-1">
                        <View className="flex-row items-center gap-1">
                          {l.reward && <Ionicons name="gift" size={14} color="#F59E0B" />}
                          <Text className="text-[15px] font-bold text-white">{l.name}</Text>
                        </View>
                        <SauceTag id={l.sauce} />
                        {!!l.notes && <Text className="text-xs italic text-neutral-400">“{l.notes}”</Text>}
                        <Text className="text-sm font-semibold text-gold-400">{l.reward ? 'GRÁTIS' : formatMT(lineTotal(l))}</Text>
                      </View>
                      {l.reward ? (
                        <Pressable accessibilityLabel="Remover prémio" onPress={() => actions.removeLine(l.lineId)} className="h-11 w-11 items-center justify-center">
                          <Ionicons name="trash-outline" size={20} color="#9ca3af" />
                        </Pressable>
                      ) : (
                        <Qty qty={l.qty} onMinus={() => (l.qty === 1 ? actions.removeLine(l.lineId) : actions.changeQty(l.lineId, -1))} onPlus={() => actions.changeQty(l.lineId, 1)} />
                      )}
                    </View>
                  ))}
                </Card>

                {loyalty.rewardReady && !hasReward && (
                  <View className="mt-4 rounded-2xl border border-gold/40 bg-gold/10 p-3">
                    <Text className="text-sm font-bold text-gold-400">Tem um prémio de fidelidade. Escolha o seu grátis:</Text>
                    <View className="mt-2 flex-row flex-wrap gap-2">
                      {rewardOptions(menu).map((m) => (
                        <Button key={m.id} variant="gold" label={m.name} onPress={() => actions.setReward(m.id)} />
                      ))}
                    </View>
                  </View>
                )}

                {upsells.length > 0 && (
                  <View className="mt-4">
                    <Label>Combina bem com…</Label>
                    <View className="gap-2">
                      {upsells.map(({ item, reason }) => (
                        <Pressable
                          key={item.id}
                          onPress={() => {
                            tap();
                            actions.addToCart(item.id);
                          }}
                          className="min-h-[56px] flex-row items-center gap-3 rounded-2xl border border-dashed border-gold/50 bg-gold/5 px-3 py-2 active:bg-gold/10"
                        >
                          <ItemMark item={item} size={22} color="#FBBF24" />
                          <View className="flex-1">
                            <Text className="text-sm font-bold text-white">{item.name}</Text>
                            <Text className="text-xs text-neutral-400">{reason}</Text>
                          </View>
                          <Text className="text-sm font-bold text-gold-400">+ {formatMT(item.price)}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
                <Pressable onPress={() => actions.clearCart()} className="mt-4 min-h-[44px] items-center justify-center">
                  <Text className="text-xs text-neutral-500">Esvaziar carrinho</Text>
                </Pressable>
              </View>
            )}

            {step === 1 && (
              <View className="gap-4">
                <ScreenTitle>Entrega</ScreenTitle>
                <View>
                  <Label>Como quer receber?</Label>
                  <View className="flex-row gap-2">
                    {(['mesa', 'takeaway', 'delivery'] as OrderMode[]).map((m) => {
                      const on = draft.mode === m;
                      return (
                        <Pressable
                          key={m}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: on }}
                          onPress={() => {
                            tap();
                            patch({ mode: m });
                          }}
                          className={`min-h-[76px] flex-1 items-center justify-center gap-1 rounded-2xl border ${on ? 'border-ember bg-ember/15' : 'border-coal-500 bg-coal-900'}`}
                        >
                          <Ionicons name={MODE_ICON[m]} size={24} color={on ? '#F05252' : '#a3a3a3'} />
                          <Text className={`text-[13px] font-bold ${on ? 'text-white' : 'text-neutral-300'}`}>{MODE_LABEL[m]}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {draft.mode === 'mesa' && (
                  <Field label="Nº da mesa" error={errors.table}>
                    <Input value={draft.table} onChangeText={(v) => patch({ table: v.replace(/\D/g, '').slice(0, 3) })} keyboardType="number-pad" placeholder="Ex.: 7" />
                    {!!session.table && (
                      <View className="mt-1.5 flex-row items-center gap-1">
                        <Ionicons name="checkmark" size={13} color="#FBBF24" />
                        <Text className="text-xs text-gold-400">Mesa {session.table} detetada pelo QR Code.</Text>
                      </View>
                    )}
                  </Field>
                )}

                {draft.mode === 'takeaway' && (
                  <Card className="flex-row gap-3 p-3">
                    <Ionicons name="location" size={18} color="#F05252" />
                    <Text className="flex-1 text-sm text-neutral-200">
                      <Text className="font-bold">Levante em: </Text>{BRAND.address}, {BRAND.city}. Avisamos por telemóvel quando estiver pronto.
                    </Text>
                  </Card>
                )}

                {draft.mode === 'delivery' && (
                  <>
                    <View>
                      <Label>Bairro (taxa automática)</Label>
                      <View className="flex-row flex-wrap gap-2">
                        {zones.map((z) => {
                          const on = draft.zoneId === z.id;
                          return (
                            <Pressable
                              key={z.id}
                              accessibilityRole="radio"
                              accessibilityState={{ selected: on }}
                              onPress={() => {
                                tap();
                                patch({ zoneId: z.id });
                              }}
                              className={`min-h-[52px] w-[48%] justify-center rounded-xl border px-3 ${on ? 'border-gold bg-gold/10' : 'border-coal-500 bg-coal-900'}`}
                            >
                              <Text className="text-sm font-bold text-white">{z.name}</Text>
                              <Text className="text-xs text-gold-400">+ {formatMT(z.fee)}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      {!!errors.zoneId && <Text className="mt-1.5 text-sm text-ember-400">{errors.zoneId}</Text>}
                    </View>
                    <Field label="Referência / morada" error={errors.address}>
                      <Input value={draft.address} onChangeText={(v) => patch({ address: v })} placeholder="Rua, nº da casa, ponto de referência…" multiline />
                    </Field>
                    <LocationMark lat={draft.lat} lng={draft.lng} accuracy={draft.accuracy} error={errors.lat} onPin={(pin) => patch(pin)} />
                  </>
                )}

                <Field label="O seu nome" error={errors.name}>
                  <Input value={draft.name} onChangeText={(v) => patch({ name: v })} placeholder="Nome" autoComplete="name" />
                </Field>
                <Field label="Telemóvel" error={errors.phone}>
                  <Input value={draft.phone} onChangeText={(v) => patch({ phone: v })} placeholder="84 123 4567" keyboardType="phone-pad" autoComplete="tel" />
                </Field>
                <Field label="Observações do pedido (opcional)">
                  <Input value={draft.notes} onChangeText={(v) => patch({ notes: v })} placeholder="Ex.: ligar ao chegar" maxLength={140} />
                </Field>
              </View>
            )}

            {step === 2 && (
              <View className="gap-4">
                <ScreenTitle>Pagamento</ScreenTitle>
                <View className="flex-row flex-wrap gap-2">
                  {(['mpesa', 'emola', 'cash', 'pos'] as PaymentMethod[]).map((m) => {
                    const on = draft.payment === m;
                    return (
                      <Pressable
                        key={m}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on }}
                        onPress={() => {
                          tap();
                          patch({ payment: m });
                        }}
                        className={`min-h-[56px] w-[48%] flex-row items-center gap-2.5 rounded-2xl border px-3 ${on ? 'border-ember bg-ember/15' : 'border-coal-500 bg-coal-900'}`}
                      >
                        <Ionicons name={PAY_ICON[m]} size={20} color={on ? '#F05252' : '#a3a3a3'} />
                        <Text className={`text-sm font-bold ${on ? 'text-white' : 'text-neutral-300'}`}>{PAYMENT_LABEL[m]}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {DIGITAL_PAYMENTS.includes(draft.payment) && (
                  <MobileMoneyBox method={draft.payment as 'mpesa' | 'emola'} total={totals.total} code={draft.smsCode} error={errors.smsCode} onCode={(v) => patch({ smsCode: v })} />
                )}
                {draft.payment === 'cash' && <Note>Pague em dinheiro {draft.mode === 'delivery' ? 'ao estafeta' : 'no balcão / à mesa'}.</Note>}
                {draft.payment === 'pos' && <Note>Pague com cartão no terminal P.O.S {draft.mode === 'delivery' ? 'levado pelo estafeta' : 'no balcão / à mesa'}.</Note>}

                <Card className="min-h-[56px] flex-row items-center gap-3 px-3">
                  <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                  <Text className="flex-1 text-sm text-neutral-200">Enviar também o resumo por <Text className="font-bold">WhatsApp</Text></Text>
                  <Switch value={draft.sendWhatsapp} onValueChange={(v) => patch({ sendWhatsapp: v })} trackColor={{ true: '#25D366', false: '#3a3a3a' }} />
                </Card>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Rodapé fixo: totais + ação */}
        <View className="border-t border-coal-600 bg-coal-900 px-4 pb-3 pt-3">
          <View className="w-full max-w-xl self-center">
            <View className="mb-1 flex-row justify-between">
              <Text className="text-sm text-neutral-300">Subtotal ({cartCount(cart)} itens)</Text>
              <Text className="text-sm text-neutral-300">{formatMT(cartSubtotal(cart))}</Text>
            </View>
            {draft.mode === 'delivery' && (
              <View className="mb-1 flex-row justify-between">
                <Text className="text-sm text-neutral-300">Entrega{draft.zoneId ? '' : ' (escolha o bairro)'}</Text>
                <Text className="text-sm text-neutral-300">{draft.zoneId ? formatMT(totals.deliveryFee) : '—'}</Text>
              </View>
            )}
            <View className="mb-3 flex-row items-baseline justify-between border-t border-coal-600 pt-2">
              <Text className="text-lg font-extrabold uppercase text-white">Total</Text>
              <Text className="text-2xl font-extrabold text-gold-400">{formatMT(totals.total)}</Text>
            </View>
            <View className="flex-row gap-2">
              {step > 0 && <Button variant="ghost" label="Voltar" onPress={() => setStep(step - 1)} />}
              {step < 2 ? (
                <Button className="flex-1" label="Continuar" onPress={next} />
              ) : (
                <Button className="flex-1" label={`Confirmar pedido · ${formatMT(totals.total)}`} onPress={submit} />
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function readGps(): Promise<{ lat: number; lng: number; accuracy: number }> {
  const geo = (globalThis as { navigator?: { geolocation?: { getCurrentPosition: (ok: (p: { coords: { latitude: number; longitude: number; accuracy: number } }) => void, err: (e: { code: number }) => void, opts: object) => void } } }).navigator?.geolocation;
  if (!geo) return Promise.reject({ code: 0 });
  return new Promise((resolve, reject) => {
    geo.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

function LocationMark({ lat, lng, accuracy, error, onPin }: { lat: number | null; lng: number | null; accuracy: number | null; error?: string; onPin: (pin: { lat: number; lng: number; accuracy: number }) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const live = lat != null ? validateDeliveryPin(lat, lng, accuracy) : null;
  const mark = async () => {
    setBusy(true);
    try {
      const pin = await readGps();
      onPin(pin);
      success();
    } catch (err) {
      const code = (err as { code?: number }).code;
      toast(code === 1 ? 'Autorize a localização para marcar a entrega.' : code === 0 ? 'Neste telemóvel, marque a localização no site.' : 'Não foi possível ler o GPS. Tente outra vez ao ar livre.', 'err');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View className="gap-2">
      <Label>Localização da entrega</Label>
      <Button label={busy ? 'A ler o GPS…' : lat != null ? 'Marcar outra vez' : 'Marcar a minha localização'} icon="locate" onPress={mark} />
      {lat != null && lng != null && !live && (
        <Text className="text-sm text-green-300">
          Localização marcada{accuracy != null && Number.isFinite(accuracy) ? ` · precisão ${Math.round(accuracy)} m` : ''}.{' '}
          <Text className="underline" onPress={() => Linking.openURL(mapsPinUrl(lat, lng))}>Confirmar no mapa</Text>
        </Text>
      )}
      {!!(error || live) && <Text className="text-sm text-ember-400">{error || live}</Text>}
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor="#737373"
      {...props}
      className="min-h-[48px] rounded-xl border border-coal-500 bg-coal-900 px-3.5 text-base text-white"
      style={props.multiline ? { minHeight: 76, textAlignVertical: 'top', paddingTop: 12 } : undefined}
    />
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <View>
      <Label>{label}</Label>
      {children}
      {!!error && <Text className="mt-1.5 text-sm text-ember-400">{error}</Text>}
    </View>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <Card className="p-3"><Text className="text-sm text-neutral-300">{children}</Text></Card>;
}

function MobileMoneyBox({ method, total, code, error, onCode }: { method: 'mpesa' | 'emola'; total: number; code: string; error?: string; onCode: (v: string) => void }) {
  const acc = PAYMENT_ACCOUNTS[method];
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    // Botão nativo: copia o número sem espaços, pronto a colar no M-Pesa / E-Mola
    const ok = await copyToClipboard(acc.raw);
    if (ok) {
      success();
      setCopied(true);
      toast(`Número ${PAYMENT_LABEL[method]} copiado`);
      setTimeout(() => setCopied(false), 2000);
    } else toast('Não foi possível copiar', 'err');
  };
  const paste = async () => {
    const t = (await pasteFromClipboard()).trim();
    if (t) onCode(t.slice(0, 500));
    else toast('Nada para colar — cole a mensagem', 'err');
  };

  return (
    <View className="gap-3 rounded-2xl border border-gold/30 bg-gold/5 p-3.5">
      <Text className="text-sm text-neutral-300">
        <Text className="font-bold text-gold-400">1. </Text>Na aplicação {PAYMENT_LABEL[method]}, fora deste site, envie <Text className="font-bold text-white">{formatMT(total)}</Text> para:
      </Text>
      <View className="flex-row items-center gap-3 rounded-xl bg-coal-900 p-3">
        <View className="flex-1">
          <Text className="text-2xl font-extrabold tracking-wider text-white">{acc.number}</Text>
          <Text className="text-xs text-neutral-400">Titular: <Text className="font-bold text-neutral-200">{acc.holder}</Text></Text>
        </View>
        <Button variant={copied ? 'success' : 'gold'} icon={copied ? 'checkmark' : 'copy-outline'} label={copied ? 'Copiado' : 'Copiar'} onPress={copy} />
      </View>
      <Text className="text-sm text-neutral-300">
        <Text className="font-bold text-gold-400">2. </Text>Depois de transferir, cole a <Text className="font-bold text-white">mensagem de confirmação</Text> para o administrador validar.
      </Text>
      <Input value={code} onChangeText={(v) => onCode(v.slice(0, 500))} placeholder="Cole aqui a SMS de confirmação" multiline autoCorrect={false} />
      <Button variant="ghost" icon="clipboard-outline" label="Colar mensagem" onPress={paste} />
      {error ? <Text className="text-sm text-ember-400">{error}</Text> : <Text className="text-xs text-neutral-500">Pode confirmar o pedido e colar a mensagem depois, no ecrã do pedido.</Text>}
    </View>
  );
}
