import QrTools from '../../modules/qr-tools';
import { ResultSheet } from './ResultSheet';

/** Props of {@link ScanResultOverlay}. These props come from `ScanResultActivity`. */
type ScanResultOverlayProps = {
  /** The text decoded from the screen. */
  value: string;
};

/**
 * Shows the result sheet of a screen scan above the app that the user is reading.
 * Closing the sheet returns the user to that app.
 *
 * @param props The decoded value.
 * @returns The result sheet.
 */
export function ScanResultOverlay({ value }: ScanResultOverlayProps) {
  /** Closes the transparent activity that holds this sheet. */
  const handleClose = () => {
    void QrTools.closeScanResult();
  };

  return <ResultSheet onClose={handleClose} value={value} />;
}
