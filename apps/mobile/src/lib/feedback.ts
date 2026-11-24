import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

export const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
export const success = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
export const warn = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}

export async function pasteFromClipboard(): Promise<string> {
  try {
    return (await Clipboard.getStringAsync()) ?? '';
  } catch {
    return '';
  }
}
