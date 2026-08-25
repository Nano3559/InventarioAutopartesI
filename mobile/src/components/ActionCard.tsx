import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, space, radius, fontFamily, fontSize, shadows, iconSize, opacity } from '../theme';
import Ionicons from '@expo/vector-icons/Ionicons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface ActionCardProps {
  label: string;
  iconName: IoniconsName;
  onPress: () => void;
  primary?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  disabled?: boolean;
  minWidth?: string;
}

export default function ActionCard({
  label,
  iconName,
  onPress,
  primary = false,
  fullWidth = false,
  accessibilityLabel,
  disabled = false,
  minWidth = '48%',
}: ActionCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { minWidth: minWidth as any },
        primary && styles.cardPrimary,
        fullWidth && styles.cardFullWidth,
        disabled && styles.cardDisabled,
        pressed && !disabled && styles.cardPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      android_ripple={{ color: primary ? 'rgba(255,255,255,0.15)' : colors.primarySoft }}
    >
      <Ionicons name={iconName} size={iconSize.xl} color={primary ? colors.white : colors.primary} />
      <Text style={[styles.label, primary && styles.labelPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    ...shadows.level1,
  },
  cardPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cardFullWidth: {
    flexDirection: 'row',
    minWidth: '100%',
    aspectRatio: undefined,
    justifyContent: 'center',
    paddingVertical: space.md,
  },
  cardDisabled: {
    opacity: opacity.disabled,
  },
  cardPressed: {
    opacity: opacity.pressed,
  },
  label: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
    textAlign: 'center',
  },
  labelPrimary: {
    color: colors.white,
  },
});