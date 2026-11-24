import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { success, tap, warn } from '../lib/feedback';

export function PinPad({ pin, title, onUnlock }: { pin: string; title: string; onUnlock: () => void }) {
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);

  const press = (d: string) => {
    tap();
    const next = (value + d).slice(0, pin.length);
    setValue(next);
    setWrong(false);
    if (next.length === pin.length) {
      if (next === pin) {
        success();
        onUnlock();
      } else {
        warn();
        setWrong(true);
        setTimeout(() => setValue(''), 350);
      }
    }
  };

  const Key = ({ k }: { k: string }) => (
    <Pressable accessibilityLabel={k} onPress={() => press(k)} className="h-16 w-[30%] items-center justify-center rounded-2xl bg-coal-700 active:bg-coal-500">
      <Text className="text-2xl font-semibold text-white">{k}</Text>
    </Pressable>
  );

  return (
    <View className="flex-1 items-center justify-center px-6">
      <View className="w-full max-w-xs items-center rounded-3xl border border-coal-600 bg-coal-800 p-6">
        <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-ember/15">
          <Ionicons name="lock-closed" size={26} color="#F05252" />
        </View>
        <Text className="text-2xl font-extrabold uppercase text-white">{title}</Text>
        <Text className="text-sm text-neutral-400">Protegido por PIN</Text>
        <View className="my-5 flex-row gap-3">
          {Array.from({ length: pin.length }).map((_, i) => (
            <View key={i} className={`h-4 w-4 rounded-full border-2 ${i < value.length ? (wrong ? 'border-ember bg-ember' : 'border-gold bg-gold') : 'border-coal-500'}`} />
          ))}
        </View>
        <View className="w-full flex-row flex-wrap justify-between gap-y-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
            <Key key={k} k={k} />
          ))}
          <View className="w-[30%]" />
          <Key k="0" />
          <Pressable accessibilityLabel="Apagar" onPress={() => setValue((v) => v.slice(0, -1))} className="h-16 w-[30%] items-center justify-center rounded-2xl bg-coal-800 active:bg-coal-600">
            <Ionicons name="backspace-outline" size={24} color="#d4d4d4" />
          </Pressable>
        </View>
        <Text className="mt-4 text-xs text-neutral-500">{wrong ? 'PIN incorreto.' : 'PIN de demonstração: 1234'}</Text>
      </View>
    </View>
  );
}
