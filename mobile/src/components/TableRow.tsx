import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, space, radius, fontFamily, fontSize, shadows, opacity, a11y } from '../theme';

interface TableRowProps {
  children: React.ReactNode;
  onPress?: () => void;
  borderTop?: boolean;
  padding?: 'md' | 'lg';
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export default function TableRow({
  children,
  onPress,
  borderTop = false,
  padding = 'md',
  accessibilityLabel,
  accessibilityHint,
}: TableRowProps) {
  const Component = onPress ? Pressable : View;

  return (
    <Component
      style={[
        styles.row,
        borderTop && styles.rowBorder,
        padding === 'lg' && styles.rowPaddingLg,
      ]}
      onPress={onPress}
      accessibilityRole={onPress ? a11y.button : 'none'}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      hitSlop={onPress ? { top: 8, bottom: 8, left: 8, right: 8 } : undefined}
      android_ripple={onPress ? { color: colors.primarySoft } : undefined}
    >
      {children}
    </Component>
  );
}

interface TableCardProps {
  children: React.ReactNode;
  style?: object;
}

export function TableCard({ children, style }: TableCardProps) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.card,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowPaddingLg: {
    paddingVertical: space.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.level1,
  },
});