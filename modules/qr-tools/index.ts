import { requireNativeModule } from 'expo';

/**
 * Result of the Android prompt that saves a Wi-Fi network.
 *
 * - `added`: Android saved the network.
 * - `alreadySaved`: Android already had the network.
 * - `failed`: Android could not save the network.
 * - `cancelled`: The user closed the prompt.
 */
export type WifiAddResult = 'added' | 'alreadySaved' | 'failed' | 'cancelled';

/** Wi-Fi details for the Android prompt. Android supports these security types here. */
export type WifiNetworkRequest = {
  ssid: string;
  password: string;
  security: 'open' | 'wpa' | 'sae';
  isHidden: boolean;
};

/** Values that fill the Android contact form. */
export type ContactFormRequest = {
  name: string;
  phoneNumber: string;
  email: string;
  organization: string;
  jobTitle: string;
  address: string;
};

/** Values that fill the Android calendar form. Times are milliseconds since the Unix epoch. */
export type CalendarEventFormRequest = {
  title: string;
  location: string;
  description: string;
  startTimeMs: number | null;
  endTimeMs: number | null;
  isAllDay: boolean;
};

/** Functions of the native QrTools module. */
type QrToolsNativeModule = {
  addWifiNetwork(network: WifiNetworkRequest): Promise<WifiAddResult>;
  openContactForm(contact: ContactFormRequest): Promise<void>;
  openCalendarEventForm(event: CalendarEventFormRequest): Promise<void>;
};

/** Native module for the Android Wi-Fi, contact, and calendar forms. */
export default requireNativeModule<QrToolsNativeModule>('QrTools');
