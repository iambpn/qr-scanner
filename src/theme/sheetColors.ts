/** Colors of the result sheet. Each color changes with the system theme. */
export type SheetColors = {
  /** Background of the sheet. */
  background: string;
  /** Titles, QR values, and questions. */
  text: string;
  /** Labels above the QR values. */
  labelText: string;
  /** Messages about the result of an action. */
  messageText: string;
  /** Background of each button that is not the main action. */
  buttonBackground: string;
};

const LIGHT_SHEET_COLORS: SheetColors = {
  background: '#FFFFFF',
  text: '#1B2430',
  labelText: '#5B6878',
  messageText: '#3D4A5C',
  buttonBackground: '#EEF1F5',
};

/** Pure black background with neutral white and gray colors. */
const DARK_SHEET_COLORS: SheetColors = {
  background: '#000000',
  text: '#FFFFFF',
  labelText: '#B3B3B3',
  messageText: '#D6D6D6',
  buttonBackground: '#2A2A2A',
};

/**
 * Selects the sheet colors for the system theme.
 *
 * @param colorScheme The value of `useColorScheme`.
 * @returns The dark colors for `dark`. Otherwise, the light colors.
 */
export function getSheetColors(colorScheme: string | null | undefined): SheetColors {
  return colorScheme === 'dark' ? DARK_SHEET_COLORS : LIGHT_SHEET_COLORS;
}
