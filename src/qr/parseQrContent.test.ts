import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseQrContent } from './parseQrContent.ts';

describe('parseQrContent for Wi-Fi', () => {
  it('reads a WPA network', () => {
    assert.deepEqual(parseQrContent('WIFI:T:WPA;S:Home Net;P:secret123;;'), {
      kind: 'wifi',
      ssid: 'Home Net',
      password: 'secret123',
      security: 'wpa',
      isHidden: false,
    });
  });

  it('removes the backslash from escaped characters', () => {
    const content = parseQrContent('WIFI:S:My\\;Net\\:1;T:WPA;P:pa\\;ss\\\\word;;');

    assert.equal(content.kind, 'wifi');
    assert.equal(content.kind === 'wifi' && content.ssid, 'My;Net:1');
    assert.equal(content.kind === 'wifi' && content.password, 'pa;ss\\word');
  });

  it('keeps an unescaped colon in the password', () => {
    const content = parseQrContent('WIFI:T:WPA;S:Net;P:a:b:c;;');

    assert.equal(content.kind === 'wifi' && content.password, 'a:b:c');
  });

  it('reads an open hidden network', () => {
    const content = parseQrContent('wifi:t:nopass;s:Guest;h:true;;');

    assert.deepEqual(content, {
      kind: 'wifi',
      ssid: 'Guest',
      password: '',
      security: 'open',
      isHidden: true,
    });
  });

  it('maps each security type', () => {
    const securityByQrType = [
      ['WPA', 'wpa'],
      ['WPA2', 'wpa'],
      ['SAE', 'sae'],
      ['WPA3', 'sae'],
      ['WEP', 'other'],
      ['WPA2-EAP', 'other'],
    ];

    for (const [qrType, security] of securityByQrType) {
      const content = parseQrContent(`WIFI:T:${qrType};S:Net;P:secret123;;`);
      assert.equal(content.kind === 'wifi' && content.security, security);
    }
  });

  it('uses WPA when a password exists without a type', () => {
    const content = parseQrContent('WIFI:S:Net;P:secret123;;');

    assert.equal(content.kind === 'wifi' && content.security, 'wpa');
  });

  it('treats a Wi-Fi code without a network name as text', () => {
    assert.equal(parseQrContent('WIFI:T:WPA;P:secret123;;').kind, 'text');
  });
});

describe('parseQrContent for links and messages', () => {
  it('reads a URL', () => {
    assert.deepEqual(parseQrContent('https://example.com/a?b=1'), {
      kind: 'url',
      url: 'https://example.com/a?b=1',
    });
  });

  it('keeps text with spaces as text', () => {
    assert.equal(parseQrContent('https://example.com is my site').kind, 'text');
  });

  it('keeps other link schemes as text', () => {
    assert.equal(parseQrContent('javascript:alert(1)').kind, 'text');
  });

  it('reads a phone number', () => {
    assert.deepEqual(parseQrContent('TEL:+15551234567'), {
      kind: 'phone',
      phoneNumber: '+15551234567',
    });
  });

  it('reads a mailto link', () => {
    assert.deepEqual(parseQrContent('mailto:a@b.com?subject=Hi%20there&body=Line'), {
      kind: 'email',
      address: 'a@b.com',
      subject: 'Hi there',
      body: 'Line',
    });
  });

  it('reads a MATMSG email', () => {
    assert.deepEqual(parseQrContent('MATMSG:TO:a@b.com;SUB:Hi;BODY:Text;;'), {
      kind: 'email',
      address: 'a@b.com',
      subject: 'Hi',
      body: 'Text',
    });
  });

  it('reads both SMS forms', () => {
    const expected = { kind: 'sms', phoneNumber: '+1555', message: 'Hello there' };

    assert.deepEqual(parseQrContent('SMSTO:+1555:Hello there'), expected);
    assert.deepEqual(parseQrContent('sms:+1555?body=Hello%20there'), expected);
  });

  it('reads an SMS without a message', () => {
    assert.deepEqual(parseQrContent('sms:+1555'), {
      kind: 'sms',
      phoneNumber: '+1555',
      message: '',
    });
  });

  it('reads a location', () => {
    assert.deepEqual(parseQrContent('geo:-33.87,151.21?q=Sydney'), {
      kind: 'location',
      geoUri: 'geo:-33.87,151.21?q=Sydney',
      latitude: '-33.87',
      longitude: '151.21',
      label: 'Sydney',
    });
  });

  it('does not throw on bad percent encoding', () => {
    const content = parseQrContent('mailto:a@b.com?subject=100%');

    assert.equal(content.kind === 'email' && content.subject, '100%');
  });
});

describe('parseQrContent for contacts', () => {
  it('reads a vCard', () => {
    const vCard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN:Jane Doe',
      'ORG:Acme;Sales',
      'TITLE:Manager',
      'TEL;TYPE=CELL:+15551234567',
      'TEL;TYPE=WORK:+15550000000',
      'item1.EMAIL;TYPE=WORK:jane@acme.com',
      'ADR:;;1 Main St;Springfield;;12345;USA',
      'END:VCARD',
    ].join('\r\n');

    assert.deepEqual(parseQrContent(vCard), {
      kind: 'contact',
      name: 'Jane Doe',
      phoneNumber: '+15551234567',
      email: 'jane@acme.com',
      organization: 'Acme, Sales',
      jobTitle: 'Manager',
      address: '1 Main St, Springfield, 12345, USA',
    });
  });

  it('builds the vCard name from the N line', () => {
    const content = parseQrContent('BEGIN:VCARD\nN:Doe;Jane;;;\nEND:VCARD');

    assert.equal(content.kind === 'contact' && content.name, 'Jane Doe');
  });

  it('reads a MECARD', () => {
    const content = parseQrContent('MECARD:N:Doe,Jane;TEL:123;EMAIL:j@a.com;ORG:Acme;;');

    assert.deepEqual(content, {
      kind: 'contact',
      name: 'Jane Doe',
      phoneNumber: '123',
      email: 'j@a.com',
      organization: 'Acme',
      jobTitle: '',
      address: '',
    });
  });
});

describe('parseQrContent for calendar events', () => {
  it('reads an event with UTC times', () => {
    const event = [
      'BEGIN:VEVENT',
      'SUMMARY:Launch\\, phase 1',
      'LOCATION:Room 1',
      'DESCRIPTION:First line\\nSecond line',
      'DTSTART:20261231T090000Z',
      'DTEND:20261231T100000Z',
      'END:VEVENT',
    ].join('\n');

    assert.deepEqual(parseQrContent(event), {
      kind: 'calendarEvent',
      title: 'Launch, phase 1',
      location: 'Room 1',
      description: 'First line\nSecond line',
      startTimeMs: Date.UTC(2026, 11, 31, 9),
      endTimeMs: Date.UTC(2026, 11, 31, 10),
      isAllDay: false,
    });
  });

  it('reads an event in a calendar wrapper with a folded line', () => {
    const event = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'SUMMARY:Long',
      '  title',
      'DTSTART;VALUE=DATE:20261231',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');
    const content = parseQrContent(event);

    assert.equal(content.kind === 'calendarEvent' && content.title, 'Long title');
    assert.equal(content.kind === 'calendarEvent' && content.isAllDay, true);
    assert.equal(
      content.kind === 'calendarEvent' && content.startTimeMs,
      new Date(2026, 11, 31).getTime(),
    );
  });

  it('accepts an event with no dates', () => {
    const content = parseQrContent('BEGIN:VEVENT\nSUMMARY:Later\nEND:VEVENT');

    assert.equal(content.kind === 'calendarEvent' && content.startTimeMs, null);
  });
});

describe('parseQrContent for plain text', () => {
  it('keeps the original text with its spaces', () => {
    assert.deepEqual(parseQrContent('  hello  '), { kind: 'text', text: '  hello  ' });
  });
});
