import {
  BRAND,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  CATEGORY_SHORT,
  cartCount,
  formatMT,
  getSauce,
  itemHasDetails,
  quickSauce,
  type Category,
  type MenuItem,
} from '@kota/shared';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScannerModal } from '../components/ScannerModal';
import { Pill } from '../components/ui';
import { success, tap } from '../lib/feedback';
import { actions, useAppState } from '../lib/store';
import { useToast } from '../lib/toast';
import type { TabParamList } from '../navigation/types';
import { CategoryMark, ItemMark } from '../lib/marks';
import { SauceModal } from './SauceModal';

type Row = { key: string; type: 'header'; cat: Category } | { key: string; type: 'items'; items: MenuItem[] };

export default function HomeMenuScreen({ navigation }: BottomTabScreenProps<TabParamList, 'Menu'>) {
  const { menu, cart, session } = useAppState();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const cols = width >= 1000 ? 3 : width >= 700 ? 2 : 1; // telemóvel 1 · tablet 2 · grande 3
  const [cat, setCat] = useState<Category | 'todos'>('todos');
  const [sauceItem, setSauceItem] = useState<MenuItem | null>(null);
  const [scanner, setScanner] = useState(false);

  const categories = useMemo(() => CATEGORY_ORDER.filter((c) => menu.some((m) => m.category === c)), [menu]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const c of categories) {
      if (cat !== 'todos' && c !== cat) continue;
      out.push({ key: `h-${c}`, type: 'header', cat: c });
      const items = menu.filter((m) => m.category === c);
      for (let i = 0; i < items.length; i += cols) out.push({ key: `r-${c}-${i}`, type: 'items', items: items.slice(i, i + cols) });
    }
    return out;
  }, [menu, categories, cat, cols]);

  const qtyById = useMemo(() => {
    const m = new Map<string, number>();
    cart.forEach((l) => m.set(l.itemId, (m.get(l.itemId) ?? 0) + l.qty));
    return m;
  }, [cart]);

  const add = useCallback(
    (item: MenuItem) => {
      if (!item.available) return;
      const sauce = quickSauce(item);
      const r = actions.addToCart(item.id, { sauce });
      if (r.ok) {
        success();
        const sauceName = sauce ? getSauce(sauce)?.short : undefined;
        toast(sauceName ? `${item.name} adicionado · ${sauceName}` : `${item.name} adicionado`);
      } else toast(r.error ?? 'Erro', 'err');
    },
    [toast],
  );

  const count = cartCount(cart);

  const renderRow = useCallback(
    ({ item: row }: { item: Row }) => {
      if (row.type === 'header') {
        return <Text className="mb-2 mt-4 px-4 text-lg font-extrabold uppercase tracking-wide text-gold-400">{CATEGORY_LABEL[row.cat]}</Text>;
      }
      return (
        <View className="mb-3 flex-row gap-3 px-4">
          {row.items.map((m) => (
            <ItemCard key={m.id} item={m} inCart={qtyById.get(m.id) ?? 0} onAdd={add} onDetails={setSauceItem} />
          ))}
          {row.items.length < cols && Array.from({ length: cols - row.items.length }).map((_, i) => <View key={i} className="flex-1" />)}
        </View>
      );
    },
    [add, cols, qtyById, setSauceItem],
  );

  return (
    <SafeAreaView className="flex-1 bg-coal" edges={['top']}>
      <View className="flex-row items-center gap-3 border-b border-coal-600 px-4 py-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-ember">
          <MaterialCommunityIcons name="food-drumstick" size={24} color="#fff" />
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-extrabold uppercase leading-none text-white">Kota Edu Frangos</Text>
          <Text className="mt-1 text-[15px] font-extrabold uppercase leading-none text-gold">Rei dos Molhos</Text>
          <Text className="mt-1 text-[11px] italic text-neutral-400" numberOfLines={1}>{BRAND.slogans[1]}</Text>
        </View>
        <Pressable
          accessibilityLabel="Ler QR Code da mesa"
          onPress={() => {
            tap();
            setScanner(true);
          }}
          className="h-11 w-11 items-center justify-center rounded-full border border-coal-500 bg-coal-700 active:opacity-70"
        >
          <Ionicons name="qr-code-outline" size={22} color="#F59E0B" />
        </Pressable>
      </View>

      {/* Carrossel horizontal de categorias */}
      <View className="border-b border-coal-700 py-2">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['todos', ...categories] as Array<Category | 'todos'>}
          keyExtractor={(c) => c}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item: c }) => {
            const on = cat === c;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  tap();
                  setCat(c);
                }}
                className={`min-h-[44px] flex-row items-center gap-1.5 rounded-full border px-4 ${on ? 'border-ember bg-ember' : 'border-coal-500 bg-coal-800'}`}
              >
                <CategoryMark id={c} size={16} color={on ? '#fff' : '#d4d4d4'} />
                <Text className={`text-sm font-bold ${on ? 'text-white' : 'text-neutral-300'}`}>{c === 'todos' ? 'Todos' : CATEGORY_SHORT[c]}</Text>
              </Pressable>
            );
          }}
        />
      </View>

      <FlatList
        key={`cols-${cols}`}
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={renderRow}
        initialNumToRender={8}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={{ paddingBottom: count > 0 ? 150 : 40 }}
        ListHeaderComponent={
          <View className="mx-4 mt-4 overflow-hidden rounded-3xl bg-ember p-5">
            <Text className="text-[11px] font-semibold uppercase tracking-[3px] text-white/80">Beira · Moçambique</Text>
            <Text className="mt-1 text-3xl font-extrabold uppercase leading-9 text-white">{BRAND.slogans[0]}</Text>
            <View className="mt-2 flex-row items-center gap-1.5">
              <MaterialCommunityIcons name="fire" size={16} color="#fff" />
              <Text className="text-sm text-white/90">Linha exclusiva <Text className="font-bold">{BRAND.sauceLine}</Text></Text>
            </View>
            {session.table && (
              <View className="mt-3"><Pill tone="gold">Mesa {session.table} · QR detetado</Pill></View>
            )}
          </View>
        }
        ListFooterComponent={<Text className="mt-6 text-center text-sm italic text-neutral-500">“{BRAND.slogans[4]}”</Text>}
      />

      {count > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Carrinho')}
          className="absolute inset-x-4 bottom-4 h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-ember active:opacity-85"
          style={{ shadowColor: '#DC2626', shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 }}
        >
          <Ionicons name="cart" size={20} color="#fff" />
          <Text className="text-base font-bold text-white">Ver carrinho · {count} {count === 1 ? 'item' : 'itens'}</Text>
        </Pressable>
      )}

      <SauceModal item={sauceItem} onClose={() => setSauceItem(null)} />
      <ScannerModal
        visible={scanner}
        onClose={() => setScanner(false)}
        onTable={(t) => {
          actions.setTable(t);
          toast(`Mesa ${t} detetada!`);
        }}
      />
    </SafeAreaView>
  );
}

const ItemCard = memo(function ItemCard({
  item,
  inCart,
  onAdd,
  onDetails,
}: {
  item: MenuItem;
  inCart: number;
  onAdd: (m: MenuItem) => void;
  onDetails: (m: MenuItem) => void;
}) {
  const off = !item.available;
  const details = itemHasDetails(item);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={off ? `${item.name} esgotado` : `Adicionar ${item.name}`}
      disabled={off}
      onPress={() => onAdd(item)}
      className={`flex-1 flex-row items-center gap-3 rounded-2xl border border-coal-600 bg-coal-800 p-3 active:opacity-85 ${off ? 'opacity-55' : ''}`}
    >
      <View className="h-[68px] w-[68px] items-center justify-center rounded-2xl bg-ember/90">
        <ItemMark item={item} size={32} />
        {inCart > 0 && (
          <View className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-gold px-1">
            <Text className="text-[11px] font-bold text-coal">{inCart}</Text>
          </View>
        )}
      </View>
      <View className="flex-1">
        <View className="mb-0.5 flex-row flex-wrap gap-1">
          {off && <Pill tone="muted">Esgotado hoje</Pill>}
          {!off && item.badge && <Pill tone="gold">{item.badge}</Pill>}
        </View>
        <Text className="text-[15px] font-bold leading-snug text-white" numberOfLines={2}>{item.name}</Text>
        {!!item.description && <Text className="text-[12px] leading-snug text-neutral-400" numberOfLines={2}>{item.description}</Text>}
        <Text className="mt-1 text-lg font-extrabold text-gold-400">{formatMT(item.price)}</Text>
      </View>
      {details && !off && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ver detalhes de ${item.name}`}
          onPress={() => onDetails(item)}
          className="h-11 w-11 items-center justify-center rounded-full bg-coal-700 active:opacity-70"
        >
          <Ionicons name="information-circle-outline" size={24} color="#F59E0B" />
        </Pressable>
      )}
    </Pressable>
  );
});
