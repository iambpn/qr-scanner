import type { QrContent, WifiSecurity } from './types';

/** One labeled value in the result sheet. */
export type DetailRow = {
  label: string;
  value: string;
};

/** The text that the result sheet shows for a QR code. */
export type QrPresentation = {
  title: string;
  rows: DetailRow[];
};

const WIFI_SECURITY_LABELS: Record<WifiSecurity, string> = {
  open: 'Open (no password)',
  wpa: 'WPA/WPA2',
  sae: 'WPA3',
  other: 'Other',
};

/**
 * Builds the sheet title and rows for a QR code.
 *
 * @param content The parsed QR code.
 * @returns The title and the rows that have a value.
 */
export function getQrPresentation(content: QrContent): QrPresentation {
  const { title, rows } = buildPresentation(content);
  return { title, rows: rows.filter((row) => row.value !== '') };
}

/**
 * Builds the title and all rows, including rows with empty values.
 *
 * @param content The parsed QR code.
 * @returns The title and the rows.
 */
function buildPresentation(content: QrContent): QrPresentation {
  switch (content.kind) {
    case 'wifi':
      return {
        title: 'Wi-Fi network',
        rows: [
          { label: 'Network', value: content.ssid },
          { label: 'Password', value: content.password },
          { label: 'Security', value: WIFI_SECURITY_LABELS[content.security] },
        ],
      };
    case 'url':
      return { title: 'Link', rows: [{ label: 'URL', value: content.url }] };
    case 'phone':
      return { title: 'Phone number', rows: [{ label: 'Number', value: content.phoneNumber }] };
    case 'email':
      return {
        title: 'Email',
        rows: [
          { label: 'To', value: content.address },
          { label: 'Subject', value: content.subject },
          { label: 'Message', value: content.body },
        ],
      };
    case 'sms':
      return {
        title: 'SMS',
        rows: [
          { label: 'To', value: content.phoneNumber },
          { label: 'Message', value: content.message },
        ],
      };
    case 'location':
      return {
        title: 'Location',
        rows: [
          { label: 'Place', value: content.label },
          { label: 'Coordinates', value: `${content.latitude}, ${content.longitude}` },
        ],
      };
    case 'contact':
      return {
        title: 'Contact',
        rows: [
          { label: 'Name', value: content.name },
          { label: 'Phone', value: content.phoneNumber },
          { label: 'Email', value: content.email },
          { label: 'Company', value: content.organization },
          { label: 'Job title', value: content.jobTitle },
          { label: 'Address', value: content.address },
        ],
      };
    case 'calendarEvent':
      return {
        title: 'Calendar event',
        rows: [
          { label: 'Title', value: content.title },
          { label: 'Starts', value: formatEventTime(content.startTimeMs, content.isAllDay) },
          { label: 'Ends', value: formatEventTime(content.endTimeMs, content.isAllDay) },
          { label: 'Location', value: content.location },
          { label: 'Details', value: content.description },
        ],
      };
    case 'text':
      return { title: 'Text', rows: [{ label: 'Content', value: content.text }] };
  }
}

/**
 * Formats an event time for the device locale.
 *
 * @param timeMs The time in milliseconds since the Unix epoch, or null.
 * @param isAllDay True if the event has dates but no times.
 * @returns The formatted time, or an empty string if the time is null.
 */
function formatEventTime(timeMs: number | null, isAllDay: boolean): string {
  if (timeMs === null) {
    return '';
  }

  const date = new Date(timeMs);
  return isAllDay ? date.toLocaleDateString() : date.toLocaleString();
}
