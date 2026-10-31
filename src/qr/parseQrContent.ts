import type {
  CalendarEventContent,
  ContactContent,
  QrContent,
  WifiContent,
  WifiSecurity,
} from './types';

/** One `NAME:value` line of a vCard or iCalendar text. */
type ContentLine = {
  name: string;
  value: string;
};

/** A date from an iCalendar text. */
type CalendarDate = {
  timeMs: number;
  isAllDay: boolean;
};

/** Reads one QR format. Returns null if the text uses a different format. */
type ContentParser = (text: string) => QrContent | null;

const CONTENT_PARSERS: ContentParser[] = [
  parseWifi,
  parseUrl,
  parsePhone,
  parseMailto,
  parseEmailMessage,
  parseSms,
  parseLocation,
  parseVCard,
  parseMeCard,
  parseCalendarEvent,
];

/**
 * Finds the meaning of a QR code value.
 *
 * @param value The decoded text of the QR code.
 * @returns The structured content, or `text` content if no format matches.
 */
export function parseQrContent(value: string): QrContent {
  const text = value.trim();

  for (const parseContent of CONTENT_PARSERS) {
    const content = parseContent(text);
    if (content) {
      return content;
    }
  }

  return { kind: 'text', text: value };
}

/**
 * Reads a Wi-Fi QR code, such as `WIFI:T:WPA;S:Home;P:secret;;`.
 *
 * @param text The trimmed QR code text.
 * @returns The Wi-Fi content, or null if the text has no network name.
 */
function parseWifi(text: string): WifiContent | null {
  if (!/^WIFI:/i.test(text)) {
    return null;
  }

  const fields = parseDelimitedFields(text.slice('WIFI:'.length));
  const ssid = fields.get('S');
  if (!ssid) {
    return null;
  }

  const password = fields.get('P') ?? '';

  return {
    kind: 'wifi',
    ssid,
    password,
    security: parseWifiSecurity(fields.get('T'), password),
    isHidden: fields.get('H')?.toLowerCase() === 'true',
  };
}

/**
 * Converts the `T` field of a Wi-Fi QR code.
 *
 * @param securityType The value of the `T` field, if it exists.
 * @param password The network password. Some QR codes omit `T` for WPA networks.
 * @returns The security type.
 */
function parseWifiSecurity(securityType: string | undefined, password: string): WifiSecurity {
  const normalizedType = securityType?.toUpperCase();

  if (normalizedType === undefined || normalizedType === '') {
    return password ? 'wpa' : 'open';
  }

  switch (normalizedType) {
    case 'NOPASS':
      return 'open';
    case 'WPA':
    case 'WPA2':
      return 'wpa';
    case 'SAE':
    case 'WPA3':
      return 'sae';
    default:
      return 'other';
  }
}

/**
 * Reads the `KEY:value;KEY:value;;` format of Wi-Fi, MECARD, and MATMSG codes.
 * A backslash makes the next character literal.
 *
 * @param body The text after the format prefix.
 * @returns The values by uppercase key. If a key repeats, the first value stays.
 */
function parseDelimitedFields(body: string): Map<string, string> {
  const fields = new Map<string, string>();
  let fieldKey: string | null = null;
  let fieldText = '';

  /** Saves the current field and starts a new field. */
  const closeField = () => {
    const key = fieldKey?.toUpperCase();
    if (key && !fields.has(key)) {
      fields.set(key, fieldText);
    }

    fieldKey = null;
    fieldText = '';
  };

  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];

    if (character === '\\' && index + 1 < body.length) {
      index += 1;
      fieldText += body[index];
    } else if (character === ':' && fieldKey === null) {
      fieldKey = fieldText;
      fieldText = '';
    } else if (character === ';') {
      closeField();
    } else {
      fieldText += character;
    }
  }

  closeField();

  return fields;
}

/**
 * Reads a web link.
 *
 * @param text The trimmed QR code text.
 * @returns The URL content, or null if the text is not an http or https link.
 */
function parseUrl(text: string): QrContent | null {
  return /^https?:\/\/\S+$/i.test(text) ? { kind: 'url', url: text } : null;
}

/**
 * Reads a `tel:` phone link.
 *
 * @param text The trimmed QR code text.
 * @returns The phone content, or null if the format does not match.
 */
function parsePhone(text: string): QrContent | null {
  const match = /^tel:(.+)$/i.exec(text);
  return match ? { kind: 'phone', phoneNumber: match[1] } : null;
}

/**
 * Reads a `mailto:` link.
 *
 * @param text The trimmed QR code text.
 * @returns The email content, or null if the format does not match.
 */
function parseMailto(text: string): QrContent | null {
  const match = /^mailto:([^?]*)(?:\?(.*))?$/is.exec(text);
  if (!match) {
    return null;
  }

  const parameters = parseQueryParameters(match[2] ?? '');

  return {
    kind: 'email',
    address: decodeUriText(match[1]),
    subject: parameters.get('subject') ?? '',
    body: parameters.get('body') ?? '',
  };
}

/**
 * Reads the MATMSG email format.
 *
 * @param text The trimmed QR code text.
 * @returns The email content, or null if the format does not match.
 */
function parseEmailMessage(text: string): QrContent | null {
  if (!/^MATMSG:/i.test(text)) {
    return null;
  }

  const fields = parseDelimitedFields(text.slice('MATMSG:'.length));

  return {
    kind: 'email',
    address: fields.get('TO') ?? '',
    subject: fields.get('SUB') ?? '',
    body: fields.get('BODY') ?? '',
  };
}

/**
 * Reads an SMS link, such as `SMSTO:+123:Hello` or `sms:+123?body=Hello`.
 *
 * @param text The trimmed QR code text.
 * @returns The SMS content, or null if the format does not match.
 */
function parseSms(text: string): QrContent | null {
  const match = /^(?:sms|smsto|mms|mmsto):([^:?]*)(.*)$/is.exec(text);
  if (!match) {
    return null;
  }

  const [, phoneNumber, messagePart] = match;
  const parameters = parseQueryParameters(messagePart.slice(1));
  const message = messagePart.startsWith('?') ? parameters.get('body') : messagePart.slice(1);

  return { kind: 'sms', phoneNumber, message: message ?? '' };
}

/**
 * Reads a `geo:` location link.
 *
 * @param text The trimmed QR code text.
 * @returns The location content, or null if the coordinates are not valid.
 */
function parseLocation(text: string): QrContent | null {
  const match = /^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:[,;?](.*))?$/is.exec(text);
  if (!match) {
    return null;
  }

  const [, latitude, longitude, optionsText] = match;
  const parameters = parseQueryParameters(optionsText ?? '');

  return {
    kind: 'location',
    geoUri: text,
    latitude,
    longitude,
    label: parameters.get('q') ?? '',
  };
}

/**
 * Reads a vCard. The result keeps the first phone number and the first email.
 *
 * @param text The trimmed QR code text.
 * @returns The contact content, or null if the format does not match.
 */
function parseVCard(text: string): ContactContent | null {
  if (!/^BEGIN:VCARD/i.test(text)) {
    return null;
  }

  const lines = parseContentLines(text);
  const structuredName = readLineValue(lines, 'N');
  const fullName = readLineValue(lines, 'FN');
  const address = readLineValue(lines, 'ADR');

  return {
    kind: 'contact',
    name: fullName || joinStructuredName(structuredName, ';'),
    phoneNumber: readLineValue(lines, 'TEL'),
    email: readLineValue(lines, 'EMAIL'),
    organization: readLineValue(lines, 'ORG').replaceAll(';', ', '),
    jobTitle: readLineValue(lines, 'TITLE'),
    address: joinAddress(address),
  };
}

/**
 * Reads a MECARD contact, such as `MECARD:N:Doe,Jane;TEL:123;;`.
 *
 * @param text The trimmed QR code text.
 * @returns The contact content, or null if the format does not match.
 */
function parseMeCard(text: string): ContactContent | null {
  if (!/^MECARD:/i.test(text)) {
    return null;
  }

  const fields = parseDelimitedFields(text.slice('MECARD:'.length));
  const structuredName = fields.get('N') ?? '';

  return {
    kind: 'contact',
    name: joinStructuredName(structuredName, ','),
    phoneNumber: fields.get('TEL') ?? '',
    email: fields.get('EMAIL') ?? '',
    organization: fields.get('ORG') ?? '',
    jobTitle: fields.get('TITLE') ?? '',
    address: fields.get('ADR') ?? '',
  };
}

/**
 * Converts `last<separator>first` into `first last`.
 *
 * @param structuredName The name in structured order.
 * @param separator The character between name parts.
 * @returns The display name.
 */
function joinStructuredName(structuredName: string, separator: string): string {
  const [lastName = '', firstName = ''] = structuredName.split(separator);
  return [firstName, lastName].filter(Boolean).join(' ');
}

/**
 * Joins the `;`-separated parts of a vCard address.
 *
 * @param address The value of the `ADR` line.
 * @returns The address with empty parts removed.
 */
function joinAddress(address: string): string {
  return address.split(';').filter(Boolean).join(', ');
}

/**
 * Reads an iCalendar event. Times with a `TZID` parameter use the device time zone.
 *
 * @param text The trimmed QR code text.
 * @returns The event content, or null if the format does not match.
 */
function parseCalendarEvent(text: string): CalendarEventContent | null {
  if (!/^BEGIN:(VEVENT|VCALENDAR)/i.test(text)) {
    return null;
  }

  const lines = parseContentLines(text);
  const startDate = parseCalendarDate(readLineValue(lines, 'DTSTART'));
  const endDate = parseCalendarDate(readLineValue(lines, 'DTEND'));

  return {
    kind: 'calendarEvent',
    title: readLineValue(lines, 'SUMMARY'),
    location: readLineValue(lines, 'LOCATION'),
    description: readLineValue(lines, 'DESCRIPTION'),
    startTimeMs: startDate?.timeMs ?? null,
    endTimeMs: endDate?.timeMs ?? null,
    isAllDay: startDate?.isAllDay ?? false,
  };
}

/**
 * Reads an iCalendar date, such as `20261231` or `20261231T090000Z`.
 *
 * @param value The date text.
 * @returns The date, or null if the text is not valid.
 */
function parseCalendarDate(value: string): CalendarDate | null {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value);
  if (!match) {
    return null;
  }

  const [, year, month, day, hours, minutes, seconds, utcMarker] = match;
  const monthIndex = Number(month) - 1;
  const dateParts = [
    Number(year),
    monthIndex,
    Number(day),
    Number(hours ?? 0),
    Number(minutes ?? 0),
    Number(seconds ?? 0),
  ] as const;

  const timeMs = utcMarker ? Date.UTC(...dateParts) : new Date(...dateParts).getTime();

  return { timeMs, isAllDay: hours === undefined };
}

/**
 * Splits a vCard or iCalendar text into lines. The function joins folded lines
 * and removes line parameters and group prefixes from the names.
 *
 * @param text The full text.
 * @returns The lines that have a `NAME:value` form.
 */
function parseContentLines(text: string): ContentLine[] {
  const normalizedText = text.replace(/\r\n?/g, '\n');
  const unfoldedText = normalizedText.replace(/\n[ \t]/g, '');

  return unfoldedText.split('\n').flatMap(parseContentLine);
}

/**
 * Reads one line of a vCard or iCalendar text.
 *
 * @param line The line text.
 * @returns A list with one item, or an empty list if the line has no colon.
 */
function parseContentLine(line: string): ContentLine[] {
  const separatorIndex = line.indexOf(':');
  if (separatorIndex < 0) {
    return [];
  }

  const [nameWithGroup] = line.slice(0, separatorIndex).split(';');
  const name = nameWithGroup.split('.').at(-1) ?? nameWithGroup;

  return [{ name: name.toUpperCase(), value: line.slice(separatorIndex + 1) }];
}

/**
 * Finds the first line that has a name and removes its escape characters.
 *
 * @param lines The parsed lines.
 * @param name The uppercase line name.
 * @returns The value, or an empty string if the line does not exist.
 */
function readLineValue(lines: ContentLine[], name: string): string {
  const line = lines.find((contentLine) => contentLine.name === name);
  return line ? unescapeLineValue(line.value) : '';
}

/**
 * Removes vCard and iCalendar escapes, such as `\,` and `\n`.
 *
 * @param value The escaped value.
 * @returns The plain text.
 */
function unescapeLineValue(value: string): string {
  return value.replace(/\\(.)/g, (_match, character: string) =>
    character.toLowerCase() === 'n' ? '\n' : character,
  );
}

/**
 * Reads `key=value&key=value` text.
 *
 * @param query The text after the `?` of a link.
 * @returns The decoded values by lowercase key.
 */
function parseQueryParameters(query: string): Map<string, string> {
  const parameters = new Map<string, string>();

  for (const pair of query.split('&')) {
    const separatorIndex = pair.indexOf('=');

    if (separatorIndex > 0) {
      const key = pair.slice(0, separatorIndex).toLowerCase();
      parameters.set(key, decodeUriText(pair.slice(separatorIndex + 1)));
    }
  }

  return parameters;
}

/**
 * Decodes percent-encoded text.
 *
 * @param text The encoded text.
 * @returns The decoded text, or the original text if the encoding is not valid.
 */
function decodeUriText(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}
