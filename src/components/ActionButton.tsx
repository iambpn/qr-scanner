import { Pressable, StyleSheet, Text } from 'react-native';

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
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={[styles.button, isPrimary && styles.primaryButton, isDisabled && styles.disabled]}
    >
      <Text style={[styles.label, isPrimary && styles.primaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#EEF1F5',
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryButton: {
    backgroundColor: '#1565C0',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: '#1B2430',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
});
