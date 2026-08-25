import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, space, radius, fontFamily, fontSize, shadows, iconSize } from '../theme';
import Ionicons from '@expo/vector-icons/Ionicons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface StatCardProps {
  label: string;
  value: string;
  iconName: IoniconsName;
  color: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  minWidth?: string;
}

export default function StatCard({
  label,
  value,
  iconName,
  color,
  onPress,
  accessibilityLabel,
  minWidth = '48%',
}: StatCardProps) {
  const Component = onPress ? Pressable : View;

  return (
    <Component
      style={[styles.card, { minWidth: minWidth as any }]}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'none'}
      accessibilityLabel={accessibilityLabel || `${label}: ${value}`}
      hitSlop={onPress ? { top: 8, bottom: 8, left: 8, right: 8 } : undefined}
      android_ripple={onPress ? { color: `${color}20` } : undefined}
    >
      <View style={[styles.icon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={iconName} size={iconSize.xl} color={color} />
      </View>
      <View style={styles.info}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </Component>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    ...shadows.level1,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  value: {
    fontSize: fontSize.dataLg,
    fontFamily: fontFamily.monoBold,
    color: colors.text,
  },
  label: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    marginTop: 2,
  },
});