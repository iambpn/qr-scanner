import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useEffect } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from './ActionButton';

const QR_SCANNER_SETTINGS = { barcodeTypes: ['qr' as const] };

/** Props of {@link ScannerScreen}. */
type ScannerScreenProps = {
  /** True while the camera must not report QR codes. */
  isPaused: boolean;
  onQrScanned: (value: string) => void;
};

/**
 * Shows the camera and reports each QR code that it reads. The screen requests
 * camera access when the app opens for the first time.
 *
 * @param props The pause state and the scan handler.
 * @returns The camera, or a message if the app has no camera access.
 */
export function ScannerScreen({ isPaused, onQrScanned }: ScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const permissionStatus = permission?.status;

  useEffect(() => {
    if (permissionStatus === 'undetermined') {
      void requestPermission();
    }
  }, [permissionStatus, requestPermission]);

  if (!permission) {
    return <View style={styles.screen} />;
  }

  if (!permission.granted) {
    /** Asks again if Android allows it. Otherwise, opens the app settings. */
    const handleAllowPress = () => {
      void (permission.canAskAgain ? requestPermission() : Linking.openSettings());
    };

    return (
      <View style={[styles.screen, styles.permissionMessage]}>
        <Text style={styles.permissionText}>QR Scanner needs the camera to read QR codes.</Text>
        <ActionButton isPrimary label="Allow camera" onPress={handleAllowPress} />
      </View>
    );
  }

  /**
   * Passes the original text of a detected QR code to the parent. On Android,
   * `data` is display text without the Wi-Fi or other QR format, so `raw` comes first.
   */
  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    onQrScanned(result.raw ?? result.data);
  };

  return (
    <View style={styles.screen}>
      <CameraView
        barcodeScannerSettings={QR_SCANNER_SETTINGS}
        onBarcodeScanned={isPaused ? undefined : handleBarcodeScanned}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.scanFrame} />
        <Text style={styles.hint}>Point the camera at a QR code</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#000000',
    flex: 1,
  },
  permissionMessage: {
    gap: 20,
    justifyContent: 'center',
    padding: 24,
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 17,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    gap: 20,
    justifyContent: 'center',
  },
  scanFrame: {
    borderColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 3,
    height: 260,
    width: 260,
  },
  hint: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
