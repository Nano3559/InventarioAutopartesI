import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  tienda: 'Usuario de tienda',
  inventario: 'Encargado de inventario',
};

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>AutoRepuestos Pro</Text>
          <Text style={styles.role}>
            {user ? roleLabels[user.rol] : ''}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
          onPress={signOut}
          testID="logout"
        >
          <Text style={styles.logoutText}>Salir</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>Hola, {user?.nombre}</Text>
        <Text style={styles.muted}>{user?.email}</Text>

        {user?.tienda ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Ubicación</Text>
            <Text style={styles.cardValue}>{user.tienda.nombre}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Sesión iniciada</Text>
          <Text style={styles.cardValue}>
            Cliente API conectado al backend NestJS
          </Text>
        </View>

        <Text style={styles.hint}>
          Los módulos (Dashboard, Venta, Inventario, etc.) se habilitarán en las
          siguientes tareas según el rol del usuario.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  role: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  logout: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  pressed: {
    opacity: 0.6,
  },
  logoutText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  muted: {
    fontSize: 14,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.xs,
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
  },
});