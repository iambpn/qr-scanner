/** Colors of the result sheet. */
type SheetColors = {
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

/**
 * Pure black colors of the result sheet. The sheet uses them in both light and dark system themes.
 *
 * - `background`: pure black behind the whole sheet.
 * - `text`: white for titles, QR values, and questions.
 * - `labelText`: light gray for the labels above the QR values.
 * - `messageText`: lighter gray for messages about the result of an action.
 * - `buttonBackground`: dark gray behind each button that is not the main action.
 */
export const SHEET_COLORS: SheetColors = {
  background: '#000000',
  text: '#FFFFFF',
  labelText: '#B3B3B3',
  messageText: '#D6D6D6',
  buttonBackground: '#2A2A2A',
};
