import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

const CAMERA_HOST = 'camera';

/**
 * Runs a handler once for each deep link that the camera tile sends.
 *
 * The expo-linking module keeps the last URL until JavaScript clears it, and the
 * back button closes the activity but keeps that URL. This hook clears each URL
 * when it reads the URL, so an old link does not run again. A new activity can also
 * mount before Android stores its URL, so the hook reads again when the app
 * becomes active.
 *
 * @param onCameraTile The handler for a tap on the camera tile. Keep this function stable.
 */
export function useTileLink(onCameraTile: () => void): void {
  useEffect(() => {
    /** Reads, clears, and handles the latest link. */
    const consumeLatestLink = () => {
      const url = Linking.getLinkingURL();
      if (!url) {
        return;
      }

      Linking.clearInitialURL();

      if (Linking.parse(url).hostname === CAMERA_HOST) {
        onCameraTile();
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
  }, [onCameraTile]);
}
