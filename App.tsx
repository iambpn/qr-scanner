import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';

import { ResultSheet } from './src/components/ResultSheet';
import { ScannerScreen } from './src/components/ScannerScreen';
import { useTileLink } from './src/hooks/useTileLink';

/**
 * Time that the camera ignores a closed QR code. Without this wait, a code that
 * stays in view opens the sheet again at once.
 */
const REPEAT_SCAN_DELAY_MS = 3000;

/**
 * Root of the app: the camera with the result sheet above it.
 *
 * @returns The app element.
 */
export default function App() {
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const closedScanRef = useRef({ value: '', ignoreUntilMs: 0 });

  /** Shows the camera when the user taps the camera tile. */
  const handleCameraTile = useCallback(() => {
    setScannedValue(null);
  }, []);

  useTileLink(handleCameraTile);

  /** Shows a camera scan, unless the user just closed the same code. */
  const handleQrScanned = (value: string) => {
    const closedScan = closedScanRef.current;
    const isRepeatScan = value === closedScan.value && Date.now() < closedScan.ignoreUntilMs;

    if (!isRepeatScan) {
      setScannedValue(value);
    }
  };

  /** Closes the sheet and starts the wait for a repeat of the same code. */
  const handleResultClose = () => {
    closedScanRef.current = {
      value: scannedValue ?? '',
      ignoreUntilMs: Date.now() + REPEAT_SCAN_DELAY_MS,
    };
    setScannedValue(null);
  };

  return (
    <>
      <ScannerScreen isPaused={scannedValue !== null} onQrScanned={handleQrScanned} />
      <ResultSheet onClose={handleResultClose} value={scannedValue} />
      <StatusBar style="light" />
    </>
  );
}
