import { formatMT, getSauce, SAUCES, type MenuItem, type SauceId } from '@kota/shared';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Label, Qty } from '../components/ui';
import { success, tap } from '../lib/feedback';
import { ItemMark, SauceMark } from '../lib/marks';
import { actions, useAppState } from '../lib/store';
import { useToast } from '../lib/toast';

/** Personalizador "Rei dos Molhos" — molho obrigatório (frangos) ou opcional. */
export function SauceModal({ item, onClose }: { item: MenuItem | null; onClose: () => void }) {
  const toast = useToast();
  const [sauce, setSauce] = useState<SauceId | undefined>();
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    setSauce(undefined);
    setNotes('');
    setQty(1);
    setError('');
  }, [item?.id]);

  const { menu } = useAppState();
  const required = item?.sauceMode === 'required';
  const asksSauce = !!item && item.sauceMode !== 'none';
  const included = (item?.comboOf ?? [])
    .map((id) => menu.find((m) => m.id === id)?.name)
    .filter((name): name is string => !!name);

  const confirm = () => {
    if (!item) return;
    const res = actions.addToCart(item.id, { sauce, notes, qty });
    if (!res.ok) {
      setError(res.error ?? 'Não foi possível adicionar.');
      return;
    }
    success();
    toast(`${qty}× ${item.name} adicionado${sauce ? ` · ${getSauce(sauce)?.short}` : ''}`);
    onClose();
  };

  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/70">
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Fechar" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView edges={['bottom']} className="max-h-[92%] w-full self-center rounded-t-3xl border border-coal-500 bg-coal-800 md:max-w-xl">
            <View className="mt-2 h-1.5 w-10 self-center rounded-full bg-coal-500" />
            <View className="flex-row items-center justify-between px-5 pb-2 pt-3">
              <Text className="text-xl font-extrabold uppercase tracking-wide text-white">Detalhes</Text>
              <Pressable accessibilityLabel="Fechar" onPress={onClose} className="h-11 w-11 items-center justify-center rounded-full bg-coal-700">
                <Ionicons name="close" size={20} color="#d4d4d4" />
              </Pressable>
            </View>

            <ScrollView className="px-5" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 12 }}>
              {item && (
                <View className="mb-4 flex-row items-center gap-3 rounded-2xl bg-coal-700/60 p-3">
                  <View className="h-12 w-12 items-center justify-center rounded-xl bg-ember">
                    <ItemMark item={item} size={24} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-white" numberOfLines={1}>{item.name}</Text>
                    <Text className="text-sm text-gold-400">{formatMT(item.price)}</Text>
                  </View>
                </View>
              )}
              {!!item?.description && <Text className="mb-3 text-sm leading-snug text-neutral-300">{item.description}</Text>}
              {included.length > 0 && (
                <Text className="mb-3 text-sm text-neutral-300">
                  <Text className="font-bold text-white">Inclui: </Text>
                  {included.join(' · ')}
                </Text>
              )}

              {asksSauce && (
                <>
              <Label>
                Escolha o molho {required ? '· obrigatório' : '· opcional'}
              </Label>
              <View className="gap-2">
                {SAUCES.map((s) => {
                  const on = sauce === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      onPress={() => {
                        tap();
                        setSauce(on && !required ? undefined : s.id);
                        setError('');
                      }}
                      className={`min-h-[60px] flex-row items-center gap-3 rounded-2xl border px-3 py-2 ${on ? 'border-gold bg-gold/10' : 'border-coal-500 bg-coal-900'}`}
                    >
                      <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${s.color}26` }}>
                        <SauceMark id={s.id} size={18} color={s.color} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-bold leading-tight text-white">{s.name}</Text>
                        <Text className="text-xs text-neutral-400">{s.description}</Text>
                      </View>
                      {s.heat > 0 && (
                        <View className="flex-row">
                          {[1, 2, 3].map((n) => (
                            <Ionicons key={n} name="flame" size={14} color={n <= s.heat ? '#DC2626' : '#3a3a3a'} />
                          ))}
                        </View>
                      )}
                      <View className={`h-6 w-6 items-center justify-center rounded-full border ${on ? 'border-gold bg-gold' : 'border-coal-500'}`}>
                        {on && <Ionicons name="checkmark" size={14} color="#111" />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
                </>
              )}
              {!!error && <Text className="mt-1.5 text-sm text-ember-400">{error}</Text>}

              <View className="mt-4">
                <Label>Observações</Label>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Ex.: bem passado, sem cebola…"
                  placeholderTextColor="#737373"
                  multiline
                  maxLength={140}
                  className="min-h-[72px] rounded-xl border border-coal-500 bg-coal-900 px-3.5 py-2.5 text-base text-white"
                  style={{ textAlignVertical: 'top' }}
                />
              </View>
            </ScrollView>

            <View className="flex-row items-center gap-3 border-t border-coal-600 px-5 pt-3">
              <Qty qty={qty} onMinus={() => setQty((q) => Math.max(1, q - 1))} onPlus={() => setQty((q) => Math.min(20, q + 1))} />
              <Button className="flex-1 h-12" label={`Adicionar · ${item ? formatMT(item.price * qty) : ''}`} onPress={confirm} disabled={required && !sauce} />
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
