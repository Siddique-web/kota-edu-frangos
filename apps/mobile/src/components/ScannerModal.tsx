import { parseTableFromQr } from '@kota/shared';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { success, warn } from '../lib/feedback';
import { Button } from './ui';

/** Scanner de QR Code da mesa (ex.: https://…/?mesa=7  ou  mesa:7). */
export function ScannerModal({ visible, onClose, onTable }: { visible: boolean; onClose: () => void; onTable: (table: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  const onScan = ({ data }: { data: string }) => {
    if (handled.current) return;
    const table = parseTableFromQr(data);
    handled.current = true;
    if (table) {
      success();
      onTable(table);
      onClose();
    } else {
      warn();
    }
    setTimeout(() => (handled.current = false), 1500);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-coal">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-xl font-extrabold uppercase text-white">Ler QR da mesa</Text>
          <Pressable accessibilityLabel="Fechar" onPress={onClose} className="h-11 w-11 items-center justify-center rounded-full bg-coal-700">
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </View>
        {!permission ? (
          <View className="flex-1" />
        ) : !permission.granted ? (
          <View className="flex-1 items-center justify-center gap-4 px-8">
            <Ionicons name="camera-outline" size={56} color="#F59E0B" />
            <Text className="text-center text-base text-neutral-300">Precisamos da câmara para ler o QR Code colado na sua mesa.</Text>
            <Button label="Permitir câmara" onPress={() => requestPermission()} />
          </View>
        ) : (
          <View className="flex-1 overflow-hidden rounded-3xl">
            <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScan} />
            <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
              <View className="h-56 w-56 rounded-3xl border-4 border-gold" />
            </View>
          </View>
        )}
        <Text className="p-4 text-center text-sm text-neutral-400">Aponte para o QR Code da mesa. Também pode digitar o número no checkout.</Text>
      </SafeAreaView>
    </Modal>
  );
}
