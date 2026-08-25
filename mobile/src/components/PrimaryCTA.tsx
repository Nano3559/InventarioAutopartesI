import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, space, radius, fontFamily, fontSize, shadows, iconSize, opacity } from '../theme';
import Ionicons from '@expo/vector-icons/Ionicons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface PrimaryCTAProps {
  label: string;
  hint?: string;
  iconName: IoniconsName;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export default function PrimaryCTA({
  label,
  hint,
  iconName,
  onPress,
  color = colors.primary,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: PrimaryCTAProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: color },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
      android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
    >
      <View style={styles.content}>
        <Ionicons name={iconName} size={iconSize.xl} color={colors.white} />
        <View style={styles.textContainer}>
          <Text style={styles.label}>{label}</Text>
          {hint && <Text style={styles.hint}>{hint}</Text>}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={iconSize.lg} color={colors.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    padding: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.level2,
  },
  disabled: {
    opacity: opacity.disabled,
  },
  pressed: {
    opacity: opacity.pressed,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    flex: 1,
  },
  textContainer: {
    gap: 2,
  },
  label: {
    color: colors.white,
    fontSize: fontSize.headline,
    fontFamily: fontFamily.sansBold,
  },
  hint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
  },
});