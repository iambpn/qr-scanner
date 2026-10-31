import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { addWifiNetwork, copyText, type WifiAddOutcome } from '../qr/qrActions';
import type { WifiContent } from '../qr/types';
import { ActionButton } from './ActionButton';

const OUTCOME_MESSAGES: Record<Exclude<WifiAddOutcome, 'cancelled'>, string> = {
  added: 'Android saved this network.',
  alreadySaved: 'Android already has this network.',
  failed: 'Android could not save this network.',
  manualSetup: 'Choose the network in Wi-Fi settings. If it needs a password, paste it there.',
};

/** Props of {@link WifiPrompt}. */
type WifiPromptProps = {
  wifi: WifiContent;
  onClose: () => void;
};

/**
 * Asks the user to add the Wi-Fi network from a QR code.
 *
 * @param props The network and the handler that closes the sheet.
 * @returns The question and its buttons.
 */
export function WifiPrompt({ wifi, onClose }: WifiPromptProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [outcomeMessage, setOutcomeMessage] = useState<string | null>(null);

  /** Starts the Wi-Fi add flow and shows its result. */
  const handleAddPress = async () => {
    setIsAdding(true);

    try {
      const outcome = await addWifiNetwork(wifi);
      if (outcome !== 'cancelled') {
        setOutcomeMessage(OUTCOME_MESSAGES[outcome]);
      }
    } catch (error) {
      Alert.alert('Could not add Wi-Fi', String(error));
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.question}>Add this Wi-Fi network?</Text>
      {outcomeMessage ? <Text style={styles.outcome}>{outcomeMessage}</Text> : null}
      <ActionButton
        isDisabled={isAdding}
        isPrimary
        label="Add Wi-Fi"
        onPress={() => void handleAddPress()}
      />
      {wifi.password ? (
        <ActionButton label="Copy password" onPress={() => void copyText(wifi.password, true)} />
      ) : null}
      <ActionButton label="Not now" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  question: {
    color: '#1B2430',
    fontSize: 17,
    fontWeight: '600',
  },
  outcome: {
    color: '#3D4A5C',
    fontSize: 15,
  },
});
