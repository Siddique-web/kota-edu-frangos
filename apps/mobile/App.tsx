import './global.css';

import { cartCount, selectMyActiveOrder } from '@kota/shared';
import { Ionicons } from '@expo/vector-icons';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KitchenDelayNotice } from './src/components/KitchenDelayNotice';
import { useAppState } from './src/lib/store';
import { ToastProvider } from './src/lib/toast';
import type { TabParamList } from './src/navigation/types';
import CartCheckoutScreen from './src/screens/CartCheckoutScreen';
import DeliveryRiderScreen from './src/screens/DeliveryRiderScreen';
import HomeMenuScreen from './src/screens/HomeMenuScreen';
import LiveTrackerScreen from './src/screens/LiveTrackerScreen';

const Tab = createBottomTabNavigator<TabParamList>();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#111111', card: '#0a0a0a', border: '#2b2b2b', primary: '#DC2626', text: '#ffffff' },
};

const ICONS: Record<keyof TabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Menu: ['restaurant-outline', 'restaurant'],
  Carrinho: ['cart-outline', 'cart'],
  Pedido: ['bicycle-outline', 'bicycle'],
  Equipa: ['people-outline', 'people'],
};

function Tabs() {
  const state = useAppState();
  const count = cartCount(state.cart);
  const active = selectMyActiveOrder(state);
  const live = !!active && active.status !== 'entregue';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#F05252',
        tabBarInactiveTintColor: '#8b8b8b',
        tabBarStyle: { backgroundColor: '#0a0a0a', borderTopColor: '#2b2b2b', height: 64, paddingTop: 6, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarBadgeStyle: { backgroundColor: '#F59E0B', color: '#111', fontWeight: '800' },
        tabBarIcon: ({ focused, color }) => <Ionicons name={ICONS[route.name][focused ? 1 : 0]} size={24} color={color} />,
      })}
    >
      <Tab.Screen name="Menu" component={HomeMenuScreen} options={{ title: 'Menu' }} />
      <Tab.Screen name="Carrinho" component={CartCheckoutScreen} options={{ tabBarBadge: count > 0 ? count : undefined }} />
      <Tab.Screen name="Pedido" component={LiveTrackerScreen} options={{ tabBarBadge: live ? '●' : undefined, title: 'Pedido' }} />
      <Tab.Screen name="Equipa" component={DeliveryRiderScreen} options={{ title: 'Equipa' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <NavigationContainer theme={theme}>
          <StatusBar style="light" />
          <View className="flex-1">
            <Tabs />
            <KitchenDelayNotice />
          </View>
        </NavigationContainer>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
