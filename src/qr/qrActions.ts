import * as Clipboard from 'expo-clipboard';
import { Linking, Platform, ToastAndroid } from 'react-native';

import QrTools, { type WifiAddResult } from '../../modules/qr-tools';
import type { QrContent, WifiContent } from './types';

const MIN_ANDROID_API_FOR_WIFI_PROMPT = 30;
const MIN_ANDROID_API_FOR_CLIPBOARD_PREVIEW = 33;
const WIFI_SETTINGS_ACTION = 'android.settings.WIFI_SETTINGS';

/** A button in the result sheet. */
export type QrAction = {
  label: string;
  run: () => Promise<unknown>;
};

/**
 * Result of the Wi-Fi add flow.
 *
 * Includes each {@link WifiAddResult} value and `manualSetup`. The `manualSetup`
 * value means that the app copied the password and opened Android Wi-Fi settings.
 */
export type WifiAddOutcome = WifiAddResult | 'manualSetup';

/**
 * Finds the main action for a QR code. Wi-Fi codes have no main action because
 * the Wi-Fi prompt shows its own buttons. Plain text has nothing to open.
 *
 * @param content The parsed QR code.
 * @returns The action, or null if the content has no main action.
 */
export function getPrimaryAction(content: QrContent): QrAction | null {
  switch (content.kind) {
    case 'url':
      return { label: 'Open link', run: () => Linking.openURL(content.url) };
    case 'phone':
      return { label: 'Call', run: () => Linking.openURL(`tel:${content.phoneNumber}`) };
    case 'email':
      return { label: 'Send email', run: () => Linking.openURL(createMailtoUrl(content)) };
    case 'sms':
      return { label: 'Send SMS', run: () => Linking.openURL(createSmsUrl(content)) };
    case 'location':
      return { label: 'Open map', run: () => Linking.openURL(content.geoUri) };
    case 'contact':
      return { label: 'Save contact', run: () => QrTools.openContactForm(content) };
    case 'calendarEvent':
      return { label: 'Add to calendar', run: () => QrTools.openCalendarEventForm(content) };
    case 'wifi':
    case 'text':
      return null;
  }
}

/**
 * Builds a `mailto:` link.
 *
 * @param email The email address, subject, and body.
 * @returns The link for the email app.
 */
function createMailtoUrl(email: { address: string; subject: string; body: string }): string {
  const encodedAddress = encodeURI(email.address);
  const encodedSubject = encodeURIComponent(email.subject);
  const encodedBody = encodeURIComponent(email.body);

  return `mailto:${encodedAddress}?subject=${encodedSubject}&body=${encodedBody}`;
}

/**
 * Builds an `sms:` link.
 *
 * @param sms The phone number and message.
 * @returns The link for the messaging app.
 */
function createSmsUrl(sms: { phoneNumber: string; message: string }): string {
  const encodedMessage = encodeURIComponent(sms.message);
  return `sms:${sms.phoneNumber}?body=${encodedMessage}`;
}

/**
 * Copies text. Android 13 and later show their own clipboard preview, so the
 * function shows a confirmation only on earlier versions.
 *
 * @param text The text to copy.
 * @param isSensitive True for passwords. Android then hides the text in its preview.
 */
export async function copyText(text: string, isSensitive = false): Promise<void> {
  await Clipboard.setStringAsync(text, { android: { isSensitive } });

  if (Number(Platform.Version) < MIN_ANDROID_API_FOR_CLIPBOARD_PREVIEW) {
    ToastAndroid.show('Copied', ToastAndroid.SHORT);
  }
}

/**
 * Saves a Wi-Fi network through the Android prompt.
 *
 * Android 10 and earlier have no prompt. The same is true for `other` security,
 * because the prompt does not support WEP and enterprise networks. In these cases,
 * the function copies the password and opens Android Wi-Fi settings.
 *
 * @param wifi The network from the QR code.
 * @returns The result of the flow.
 */
export async function addWifiNetwork(wifi: WifiContent): Promise<WifiAddOutcome> {
  const hasWifiPrompt = Number(Platform.Version) >= MIN_ANDROID_API_FOR_WIFI_PROMPT;

  if (!hasWifiPrompt || wifi.security === 'other') {
    await openManualWifiSetup(wifi);
    return 'manualSetup';
  }

  return QrTools.addWifiNetwork({
    ssid: wifi.ssid,
    password: wifi.password,
    security: wifi.security,
    isHidden: wifi.isHidden,
  });
}

/**
 * Copies the password, if one exists, and opens Android Wi-Fi settings.
 *
 * @param wifi The network from the QR code.
 */
async function openManualWifiSetup(wifi: WifiContent): Promise<void> {
  if (wifi.password) {
    await copyText(wifi.password, true);
  }

  await Linking.sendIntent(WIFI_SETTINGS_ACTION);
}
