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

const DARK_SHEET_COLORS: SheetColors = {
  background: '#1E2630',
  text: '#F1F4F8',
  labelText: '#A8B3C2',
  messageText: '#CBD3DE',
  buttonBackground: '#323C49',
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
