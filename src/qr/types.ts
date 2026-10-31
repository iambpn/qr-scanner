/**
 * Security type of a Wi-Fi network.
 *
 * - `open`: The network has no password.
 * - `wpa`: The network uses WPA or WPA2 with a password.
 * - `sae`: The network uses WPA3 with a password.
 * - `other`: The network uses WEP, enterprise login, or an unknown type. The app
 *   cannot save these networks, so the user must connect in Android settings.
 */
export type WifiSecurity = 'open' | 'wpa' | 'sae' | 'other';

/** Wi-Fi network details from a QR code. */
export type WifiContent = {
  kind: 'wifi';
  ssid: string;
  password: string;
  security: WifiSecurity;
  isHidden: boolean;
};

/** Contact details from a vCard or MECARD QR code. Missing values are empty strings. */
export type ContactContent = {
  kind: 'contact';
  name: string;
  phoneNumber: string;
  email: string;
  organization: string;
  jobTitle: string;
  address: string;
};

/** Event details from an iCalendar QR code. Times are milliseconds since the Unix epoch. */
export type CalendarEventContent = {
  kind: 'calendarEvent';
  title: string;
  location: string;
  description: string;
  startTimeMs: number | null;
  endTimeMs: number | null;
  isAllDay: boolean;
};

/** The meaning of a QR code value. The `kind` field selects the shape. */
export type QrContent =
  | WifiContent
  | ContactContent
  | CalendarEventContent
  | { kind: 'url'; url: string }
  | { kind: 'phone'; phoneNumber: string }
  | { kind: 'email'; address: string; subject: string; body: string }
  | { kind: 'sms'; phoneNumber: string; message: string }
  | { kind: 'location'; geoUri: string; latitude: string; longitude: string; label: string }
  | { kind: 'text'; text: string };
