import { Pressable, StyleSheet, Text, useColorScheme } from 'react-native';

import { getSheetColors } from '../theme/sheetColors';

const PRIMARY_BUTTON_COLOR = '#1565C0';
const PRIMARY_LABEL_COLOR = '#FFFFFF';

/** Props of {@link ActionButton}. */
type ActionButtonProps = {
  label: string;
  onPress: () => void;
  /** True for the main action of the sheet. */
  isPrimary?: boolean;
  isDisabled?: boolean;
};

/**
 * Shows a full-width button.
 *
 * @param props The button label, press handler, and style options.
 * @returns The button element.
 */
export function ActionButton({ label, onPress, isPrimary, isDisabled }: ActionButtonProps) {
  const colors = getSheetColors(useColorScheme());
  const backgroundColor = isPrimary ? PRIMARY_BUTTON_COLOR : colors.buttonBackground;
  const labelColor = isPrimary ? PRIMARY_LABEL_COLOR : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={[styles.button, { backgroundColor }, isDisabled && styles.disabled]}
    >
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 14,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
