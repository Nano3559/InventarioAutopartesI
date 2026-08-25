import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, space, radius, fontFamily, fontSize, shadows, componentStyles, opacity, iconSize, a11y } from '../theme';
import Ionicons from '@expo/vector-icons/Ionicons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: {
    label: string;
    onPress: () => void;
    variant?: 'danger' | 'primary' | 'ghost';
    icon?: IoniconsName;
  };
  showBack?: boolean;
}

export default function Header({
  title,
  subtitle,
  onBack,
  rightAction,
  showBack = false,
}: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {showBack && onBack && (
          <Pressable
            style={styles.backBtn}
            onPress={onBack}
            accessibilityRole={a11y.button}
            accessibilityLabel={a11y.back}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            android_ripple={{ color: colors.primarySoft }}
          >
            <Ionicons name="chevron-back" size={iconSize.lg} color={colors.primary} />
          </Pressable>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightAction && (
        <Pressable
          style={({ pressed }) => [
            styles.rightBtn,
            componentStyles[rightAction.variant === 'danger' ? 'btnDanger' : rightAction.variant === 'primary' ? 'btnPrimary' : 'btnGhost'],
            pressed && styles.rightBtnPressed,
          ]}
          onPress={rightAction.onPress}
          accessibilityRole={a11y.button}
          accessibilityLabel={rightAction.label}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          android_ripple={{ color: rightAction.variant === 'danger' ? colors.dangerSoft : colors.primarySoft }}
        >
          {rightAction.icon && (
            <Ionicons name={rightAction.icon} size={iconSize.md} color={rightAction.variant === 'danger' ? colors.white : colors.primary} style={styles.rightBtnIcon} />
          )}
          <Text style={[
            styles.rightBtnText,
            rightAction.variant === 'danger' && styles.rightBtnTextDanger,
            rightAction.variant === 'primary' && styles.rightBtnTextPrimary,
            rightAction.variant === 'ghost' && styles.rightBtnTextGhost,
          ]}>
            {rightAction.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    ...shadows.level1,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: space.sm,
    minWidth: 0,
  },
  backBtn: {
    padding: space.xs,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.headline,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.primary,
    flexShrink: 1,
  },
  subtitle: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    marginTop: 1,
  },
  rightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.sm,
    minWidth: 64,
    minHeight: 40,
    flexShrink: 0,
    justifyContent: 'center',
  },
  rightBtnPressed: {
    opacity: opacity.pressed,
  },
  rightBtnIcon: {
    marginRight: space.xs,
  },
  rightBtnText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
    flexShrink: 1,
  },
  rightBtnTextDanger: {
    color: colors.white,
  },
  rightBtnTextPrimary: {
    color: colors.white,
  },
  rightBtnTextGhost: {
    color: colors.primary,
  },
});