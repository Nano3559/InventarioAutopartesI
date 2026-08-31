import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
  colors,
  space,
  radius,
  fontFamily,
  fontSize,
  iconSize,
  shadows,
  a11y,
} from '../theme';
import { Header, StatCard, ActionCard, PrimaryCTA, TableRow, TableCard, Badge } from '../components';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAdminDashboard } from '../hooks/useDashboard';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

const actions = [
  { label: 'Inventario', iconName: 'cube', route: 'Inventario' },
  { label: 'Nueva Venta', iconName: 'cash', route: 'Sales' },
  { label: 'Solicitudes', iconName: 'document-text', route: 'Solicitudes' },
  { label: 'Mayorista', iconName: 'briefcase', route: 'VentaMayor' },
] as const;

export default function AdminDashboardScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const statCardMinWidth = isSmallScreen ? '100%' : '46%';
  const actionCardMinWidth = isSmallScreen ? '100%' : width < 600 ? '46%' : '30%';
  const { data, loading, error, refetch } = useAdminDashboard();

  const handleSignOut = () => {
    signOut();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={refetch} accessibilityRole={a11y.button}>
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const inventario = data?.inventario;
  const ventas = data?.ventas;

  const adminStats = inventario && ventas ? [
    { label: 'Total Productos', value: inventario.totalProductos.toLocaleString(), iconName: 'cube' as const, color: colors.primary },
    { label: 'Stock Bajo', value: inventario.stockBajo.toString(), iconName: 'alert-circle' as const, color: colors.warning },
    { label: 'Sin Stock', value: inventario.sinStock.toString(), iconName: 'close-circle' as const, color: colors.danger },
    { label: 'Ventas Hoy', value: `Bs ${ventas.hoy.total.toLocaleString()}`, iconName: 'cash' as const, color: colors.success },
  ] as const : [] as const;

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="AutoPartes Pro"
        subtitle={`Administrador — ${user?.nombre}`}
        rightAction={{
          label: 'Salir',
          onPress: handleSignOut,
          variant: 'danger',
          icon: 'log-out',
        }}
      />

<ScrollView contentContainerStyle={[styles.content, isSmallScreen && styles.contentSmall]} showsVerticalScrollIndicator={false}>
          {/* Welcome */}
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>Panel de Administración</Text>
            <Text style={styles.welcomeSubtitle}>Resumen general del sistema</Text>
          </View>

          {/* Primary CTA */}
          <PrimaryCTA
            label="Nueva Venta"
            hint="Registrar una venta rápidamente"
            iconName="add-circle"
            color={colors.success}
            onPress={() => {}}
            accessibilityLabel="Crear nueva venta"
          />

          {/* Stats Grid */}
          <Text style={styles.sectionTitle}>Resumen General</Text>
          <View style={styles.statsGrid}>
            {adminStats.map((stat, i) => (
              <StatCard
                key={i}
                label={stat.label}
                value={stat.value}
                iconName={stat.iconName}
                color={stat.color}
                minWidth={statCardMinWidth}
                accessibilityLabel={`${stat.label}: ${stat.value}`}
              />
            ))}
          </View>

          {/* Recent Sales */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Ventas Recientes</Text>
            <Pressable style={styles.seeAll} onPress={() => {}} accessibilityRole={a11y.button} accessibilityLabel="Ver todas las ventas">
              <Text style={styles.seeAllText}>Ver todas</Text>
              <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.primary} />
            </Pressable>
          </View>
          <TableCard>
            {ventas?.porTienda?.slice(0, 5).map((tienda, i) => (
              <TableRow key={i} borderTop={i > 0} accessibilityLabel={`Tienda ${tienda.nombre}, ${tienda.cantidad} ventas, Bs ${tienda.total.toFixed(2)}`}>
                <View style={styles.saleInfo}>
                  <Text style={styles.saleCode}>{tienda.nombre}</Text>
                  <Text style={styles.saleMeta}>{tienda.cantidad} ventas este mes</Text>
                </View>
                <View style={styles.saleRight}>
                  <Text style={styles.saleTotal}>Bs {tienda.total.toLocaleString()}</Text>
                  <Text style={styles.saleDate}>{tienda.cantidad} transacciones</Text>
                </View>
              </TableRow>
            ))}
          </TableCard>

          {/* Low Stock */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Stock Crítico</Text>
            <Pressable style={styles.seeAll} onPress={() => navigation.navigate('Inventario')} accessibilityRole={a11y.button} accessibilityLabel="Ver inventario completo">
              <Text style={styles.seeAllText}>Ver inventario</Text>
              <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.primary} />
            </Pressable>
          </View>
          <TableCard>
            {inventario && [
              { producto: 'Sin Stock', count: inventario.sinStock, variant: 'danger' as const },
              { producto: 'Stock Bajo', count: inventario.stockBajo, variant: 'warning' as const },
            ].map((item, i) => (
              <TableRow key={i} borderTop={i > 0} accessibilityLabel={`${item.producto}: ${item.count}`}>
                <View style={styles.alertInfo}>
                  <Text style={styles.alertName}>{item.producto}</Text>
                  <Text style={styles.alertLocation}>{item.count} productos afectados</Text>
                </View>
                <Badge variant={item.variant} size="md">
                  {item.count === 0 ? 'OK' : `${item.count} items`}
                </Badge>
              </TableRow>
            ))}
          </TableCard>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <View style={styles.actionsGrid}>
            {actions.map((a, i) => (
              <ActionCard
                key={i}
                label={a.label}
                iconName={a.iconName}
                onPress={() => navigation.navigate(a.route as any)}
                minWidth={actionCardMinWidth}
                accessibilityLabel={a.label}
              />
            ))}
          </View>
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space['2xl'] },
  welcomeCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: space['2xl'],
    ...shadows.level2,
  },
  welcomeTitle: { color: colors.white, fontSize: fontSize.title, fontFamily: fontFamily.sansBold },
  welcomeSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: fontSize.body, fontFamily: fontFamily.sans, marginTop: 4 },
  sectionTitle: { fontSize: fontSize.headline, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: space.xs, padding: space.xs },
  seeAllText: { color: colors.primary, fontFamily: fontFamily.sansSemiBold, fontSize: fontSize.captionStrong },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    marginTop: space.sm,
  },
  saleInfo: { flex: 1, minWidth: 0, gap: 2 },
  saleCode: { fontSize: fontSize.data, fontFamily: fontFamily.monoMedium, color: colors.text },
  saleMeta: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  saleRight: { alignItems: 'flex-end', gap: 2, paddingLeft: space.md, minWidth: 80 },
  saleTotal: { fontSize: fontSize.data, fontFamily: fontFamily.monoBold, color: colors.primary },
  saleDate: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  alertInfo: { flex: 1, minWidth: 0, gap: 2 },
  alertName: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  alertLocation: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  contentSmall: { paddingHorizontal: space.md },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    marginTop: space.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.md,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sans,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.lg,
    gap: space.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sans,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
  },
  retryBtnText: {
    color: colors.white,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
  },
});