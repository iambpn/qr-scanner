import { useMemo } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { parseQrContent } from '../qr/parseQrContent';
import { copyText, getPrimaryAction, type QrAction } from '../qr/qrActions';
import { getQrPresentation } from '../qr/qrPresentation';
import { getSheetColors } from '../theme/sheetColors';
import { ActionButton } from './ActionButton';
import { WifiPrompt } from './WifiPrompt';

/** Props of {@link ResultSheet}. */
type ResultSheetProps = {
  /** The decoded QR text. Null hides the sheet. */
  value: string | null;
  onClose: () => void;
};

/**
 * Shows the content of a scanned QR code and the actions for its type.
 *
 * @param props The decoded value and the handler that closes the sheet.
 * @returns The modal sheet.
 */
export function ResultSheet({ value, onClose }: ResultSheetProps) {
  const colors = getSheetColors(useColorScheme());
  const content = useMemo(() => (value === null ? null : parseQrContent(value)), [value]);

  if (value === null || content === null) {
    return null;
  }

  const { title, rows } = getQrPresentation(content);
  const primaryAction = getPrimaryAction(content);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

          <ScrollView style={styles.details}>
            {rows.map((row) => (
              <View key={row.label} style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.labelText }]}>{row.label}</Text>
                <Text selectable style={[styles.rowValue, { color: colors.text }]}>
                  {row.value}
                </Text>
              </View>
            ))}
          </ScrollView>

          {content.kind === 'wifi' ? (
            <WifiPrompt onClose={onClose} wifi={content} />
          ) : (
            <View style={styles.actions}>
              {primaryAction ? (
                <ActionButton
                  isPrimary
                  label={primaryAction.label}
                  onPress={() => void runAction(primaryAction)}
                />
              ) : null}
              <ActionButton label="Copy" onPress={() => void copyText(value)} />
              <ActionButton label="Close" onPress={onClose} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

/**
 * Runs an action and shows a message if the action fails.
 *
 * @param action The action of the pressed button.
 */
async function runAction(action: QrAction): Promise<void> {
  try {
    await action.run();
  } catch {
    Alert.alert('Action failed', 'No app on this device can open this item.');
  }
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 14,
    maxHeight: '85%',
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  details: {
    flexGrow: 0,
  },
  row: {
    marginBottom: 12,
  },
  rowLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 16,
  },
  actions: {
    gap: 10,
  },
});
