import { getSauce, type SauceId } from '@kota/shared';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { tap } from '../lib/feedback';
import { SauceMark } from '../lib/marks';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const COLORS = { coal: '#111111', ember: '#DC2626', gold: '#F59E0B', muted: '#9ca3af' };

/** Botão com área de toque mínima de 44×44. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  className = '',
}: {
  label?: string;
  onPress: () => void;
  variant?: 'primary' | 'gold' | 'ghost' | 'success';
  icon?: IconName;
  disabled?: boolean;
  className?: string;
}) {
  const bg = { primary: 'bg-ember', gold: 'bg-gold', ghost: 'bg-coal-700 border border-coal-500', success: 'bg-green-600' }[variant];
  const fg = variant === 'gold' ? 'text-coal' : 'text-white';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      className={`min-h-[48px] min-w-[44px] flex-row items-center justify-center gap-2 rounded-xl px-4 active:opacity-80 ${bg} ${disabled ? 'opacity-40' : ''} ${className}`}
    >
      {icon && <Ionicons name={icon} size={18} color={variant === 'gold' ? COLORS.coal : '#fff'} />}
      {label && <Text className={`text-[15px] font-bold ${fg}`}>{label}</Text>}
    </Pressable>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`rounded-2xl border border-coal-600 bg-coal-800 ${className}`}>{children}</View>;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-neutral-400">{children}</Text>;
}

export function Pill({ children, tone = 'gold' }: { children: ReactNode; tone?: 'gold' | 'ember' | 'muted' }) {
  const cls = { gold: 'bg-gold/15 text-gold-400', ember: 'bg-ember/15 text-ember-400', muted: 'bg-coal-600 text-neutral-300' }[tone];
  const [bg, fg] = cls.split(' ');
  return (
    <View className={`self-start rounded-full px-2.5 py-0.5 ${bg}`}>
      <Text className={`text-xs font-semibold ${fg}`}>{children}</Text>
    </View>
  );
}

export function SauceTag({ id }: { id?: SauceId }) {
  const s = getSauce(id);
  if (!s) return null;
  return (
    <View className="self-start flex-row items-center gap-1 rounded-full px-2.5 py-0.5" style={{ backgroundColor: `${s.color}26`, borderWidth: 1, borderColor: `${s.color}55` }}>
      <SauceMark id={s.id} size={12} color={s.color} />
      <Text className="text-xs font-semibold" style={{ color: s.color }}>{s.short}</Text>
    </View>
  );
}

export function Qty({ qty, onMinus, onPlus }: { qty: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <View className="flex-row items-center rounded-xl border border-coal-500 bg-coal-900">
      <Pressable accessibilityLabel="Diminuir" onPress={() => { tap(); onMinus(); }} className="h-11 w-11 items-center justify-center active:bg-coal-600">
        <Ionicons name="remove" size={18} color="#e5e5e5" />
      </Pressable>
      <Text className="min-w-[28px] text-center text-sm font-bold text-white">{qty}</Text>
      <Pressable accessibilityLabel="Aumentar" onPress={() => { tap(); onPlus(); }} className="h-11 w-11 items-center justify-center active:bg-coal-600">
        <Ionicons name="add" size={18} color="#e5e5e5" />
      </Pressable>
    </View>
  );
}

export function ScreenTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <Text className="text-2xl font-extrabold uppercase tracking-wide text-white">{children}</Text>
      {right}
    </View>
  );
}

export function Empty({ icon, title, text, action }: { icon: ComponentProps<typeof MaterialCommunityIcons>['name']; title: string; text: string; action?: ReactNode }) {
  return (
    <View className="mx-4 mt-10 items-center rounded-2xl border border-coal-600 bg-coal-800 p-6">
      <MaterialCommunityIcons name={icon} size={42} color="#F05252" />
      <Text className="text-xl font-extrabold uppercase text-white">{title}</Text>
      <Text className="mt-1 text-center text-sm text-neutral-400">{text}</Text>
      {action && <View className="mt-4">{action}</View>}
    </View>
  );
}
