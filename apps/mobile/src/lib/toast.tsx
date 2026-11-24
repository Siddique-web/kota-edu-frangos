import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

const Ctx = createContext<(text: string, kind?: 'ok' | 'err') => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ text: string; kind: 'ok' | 'err' } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((text: string, kind: 'ok' | 'err' = 'ok') => {
    if (timer.current) clearTimeout(timer.current);
    setT({ text, kind });
    timer.current = setTimeout(() => setT(null), 2200);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {t && (
        <View pointerEvents="none" className="absolute inset-x-4 bottom-28 items-center">
          <View className={`rounded-full border px-4 py-2.5 ${t.kind === 'ok' ? 'border-gold/40 bg-coal-700' : 'border-ember/60 bg-coal-700'}`}>
            <Text className={`text-sm font-semibold ${t.kind === 'ok' ? 'text-gold-400' : 'text-ember-400'}`}>{t.text}</Text>
          </View>
        </View>
      )}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
