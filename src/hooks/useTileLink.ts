import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

const CAMERA_HOST = 'camera';
const SCAN_RESULT_HOST = 'scan-result';

/**
 * A request from a Quick Settings tile.
 *
 * - `showCamera`: The user tapped the camera tile. Show the camera.
 * - `showScanResult`: The screen tile found a QR code. Show its value.
 */
export type TileLink = { kind: 'showCamera' } | { kind: 'showScanResult'; value: string };

/**
 * Runs a handler once for each deep link that a Quick Settings tile sends.
 *
 * The expo-linking module keeps the last URL until JavaScript clears it, and the
 * back button closes the activity but keeps that URL. This hook clears each URL
 * when it reads the URL, so an old result does not return. A new activity can also
 * mount before Android stores its URL, so the hook reads again when the app
 * becomes active.
 *
 * @param onTileLink The handler for a tile request. Keep this function stable.
 */
export function useTileLink(onTileLink: (tileLink: TileLink) => void): void {
  useEffect(() => {
    /** Reads, clears, and handles the latest link. */
    const consumeLatestLink = () => {
      const url = Linking.getLinkingURL();
      if (!url) {
        return;
      }

      Linking.clearInitialURL();

      const tileLink = parseTileLink(url);
      if (tileLink) {
        onTileLink(tileLink);
      }
    };

    /**
     * Reads the latest link when the app returns to the foreground.
     *
     * @param appState The new app state.
     */
    const handleAppStateChange = (appState: AppStateStatus) => {
      if (appState === 'active') {
        consumeLatestLink();
      }
    };

    const urlSubscription = Linking.addEventListener('url', consumeLatestLink);
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    consumeLatestLink();

    return () => {
      appStateSubscription.remove();
      urlSubscription.remove();
    };
  }, [onTileLink]);
}

/**
 * Converts a deep link into a tile request.
 *
 * @param url The deep link.
 * @returns The request, or null if the link has a different form.
 */
function parseTileLink(url: string): TileLink | null {
  const { hostname, queryParams } = Linking.parse(url);

  if (hostname === CAMERA_HOST) {
    return { kind: 'showCamera' };
  }

  const value = queryParams?.value;
  if (hostname === SCAN_RESULT_HOST && typeof value === 'string') {
    return { kind: 'showScanResult', value };
  }

  return null;
}
