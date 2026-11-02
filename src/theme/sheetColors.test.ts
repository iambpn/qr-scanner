import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getSheetColors } from './sheetColors.ts';

const MIN_TEXT_CONTRAST = 4.5;

/**
 * Calculates the WCAG relative luminance of a color.
 *
 * @param hexColor A color in `#RRGGBB` format.
 * @returns The luminance from 0 for black to 1 for white.
 */
function getLuminance(hexColor: string): number {
  const channels = [1, 3, 5].map((start) => {
    const channelHex = hexColor.slice(start, start + 2);
    const channel = parseInt(channelHex, 16) / 255;
    const scaledChannel = (channel + 0.055) / 1.055;

    return channel <= 0.03928 ? channel / 12.92 : scaledChannel ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * Calculates the WCAG contrast ratio of two colors.
 *
 * @param firstColor A color in `#RRGGBB` format.
 * @param secondColor A color in `#RRGGBB` format.
 * @returns The ratio from 1 to 21.
 */
function getContrast(firstColor: string, secondColor: string): number {
  const luminances = [getLuminance(firstColor), getLuminance(secondColor)];
  const lighter = Math.max(...luminances);
  const darker = Math.min(...luminances);

  return (lighter + 0.05) / (darker + 0.05);
}

describe('getSheetColors', () => {
  it('uses the dark colors only for the dark scheme', () => {
    const lightColors = getSheetColors('light');

    assert.notDeepEqual(getSheetColors('dark'), lightColors);
    assert.deepEqual(getSheetColors('unspecified'), lightColors);
    assert.deepEqual(getSheetColors(null), lightColors);
    assert.deepEqual(getSheetColors(undefined), lightColors);
  });

  it('uses pure black and neutral grays for the dark scheme', () => {
    const darkColors = getSheetColors('dark');

    assert.equal(darkColors.background, '#000000');

    for (const color of Object.values(darkColors)) {
      const channels = [color.slice(1, 3), color.slice(3, 5), color.slice(5, 7)];

      assert.equal(new Set(channels).size, 1, `${color} has a color tint`);
    }
  });

  for (const scheme of ['light', 'dark']) {
    it(`keeps the ${scheme} text readable`, () => {
      const colors = getSheetColors(scheme);
      const textPairs = [
        [colors.text, colors.background],
        [colors.labelText, colors.background],
        [colors.messageText, colors.background],
        [colors.text, colors.buttonBackground],
      ];

      for (const [textColor, backgroundColor] of textPairs) {
        assert.ok(getContrast(textColor, backgroundColor) >= MIN_TEXT_CONTRAST);
      }
    });
  }
});
