import { StyleSheet, Text, View } from 'react-native';
import { colors, space, radius, fontFamily, fontSize, componentStyles } from '../theme';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
}: BadgeProps) {
  const variantStyles = {
    default: { bg: colors.bg, text: colors.textMuted, border: colors.border },
    success: { bg: colors.successSoft, text: colors.success, border: colors.success },
    warning: { bg: colors.warningSoft, text: colors.warning, border: colors.warning },
    danger: { bg: colors.dangerSoft, text: colors.danger, border: colors.danger },
    primary: { bg: colors.primarySoft, text: colors.primary, border: colors.primary },
    info: { bg: colors.blueSoft, text: colors.blue, border: colors.blue },
  };

  const sizeStyles = {
    sm: { px: 8, py: 2, fs: fontSize.caption, dotSize: 6 },
    md: { px: 10, py: 3, fs: fontSize.captionStrong, dotSize: 8 },
    lg: { px: 12, py: 4, fs: fontSize.body, dotSize: 10 },
  };

  const v = variantStyles[variant];
  const s = sizeStyles[size];

  if (dot) {
    return (
      <View style={[styles.dot, { backgroundColor: v.text }, { width: s.dotSize, height: s.dotSize }]} />
    );
  }

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: v.bg, borderColor: v.border },
        { paddingHorizontal: s.px, paddingVertical: s.py },
      ]}
    >
      <Text style={[styles.text, { color: v.text, fontSize: s.fs }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.full,
    borderWidth: 1,
  },
  text: {
    fontFamily: fontFamily.sansSemiBold,
  },
  dot: {
    borderRadius: radius.full,
  },
});