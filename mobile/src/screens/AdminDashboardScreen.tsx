import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
  colors,
  space,
  radius,
  fontFamily,
  fontSize,
  lineHeight,
  componentStyles,
  shadows,
  opacity,
  iconSize,
  a11y,
} from '../theme';
import { Header, StatCard, ActionCard, PrimaryCTA, TableRow, TableCard, Badge } from '../components';
import Ionicons from '@expo/vector-icons/Ionicons';

const statCards = [
  { label: 'Total Productos', value: '1,247', iconName: 'cube', color: colors.primary },
  { label: 'Stock Bajo', value: '23', iconName: 'alert-circle', color: colors.warning },
  { label: 'Sin Stock', value: '5', iconName: 'close-circle', color: colors.danger },
  { label: 'Ventas Hoy', value: 'Bs 45,230', iconName: 'cash', color: colors.success },
] as const;

const recentSales = [
  { id: 1, codigo: 'NV-000001', cliente: 'Juan Pérez', total: 1250.00, fecha: 'Hoy 10:30', tienda: 'Tienda 1' },
  { id: 2, codigo: 'NV-000002', cliente: 'María García', total: 890.50, fecha: 'Hoy 09:15', tienda: 'Tienda 2' },
  { id: 3, codigo: 'NV-000003', cliente: 'Carlos López', total: 2100.00, fecha: 'Ayer 16:45', tienda: 'Tienda 1' },
] as const;

const lowStockProducts = [
  { id: 1, producto: 'Farol Toyota Hilux', stock: 0, ubicacion: 'Tienda 1' },
  { id: 2, producto: 'Guiñador Nissan NP300', stock: 1, ubicacion: 'Almacén 2' },
  { id: 3, producto: 'Stop Toyota RAV4', stock: 2, ubicacion: 'Tienda 3' },
  { id: 4, producto: 'Espejo Mazda CX-5', stock: 1, ubicacion: 'Almacén 1' },
] as const;

const actions = [
  { label: 'Inventario', iconName: 'cube' },
  { label: 'Nueva Venta', iconName: 'cash' },
  { label: 'Reportes', iconName: 'analytics' },
  { label: 'Movimientos', iconName: 'swap-horizontal' },
  { label: 'Precios', iconName: 'pricetag' },
  { label: 'Costos', iconName: 'wallet' },
] as const;

export default function AdminDashboardScreen() {
  const { user, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const statCardMinWidth = isSmallScreen ? '100%' : '46%';
  const actionCardMinWidth = isSmallScreen ? '100%' : width < 600 ? '46%' : '30%';

  const handleSignOut = () => {
    signOut();
  };

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
          {statCards.map((stat, i) => (
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
          {recentSales.map((sale, i) => (
            <TableRow key={i} borderTop={i > 0} accessibilityLabel={`Venta ${sale.codigo}, ${sale.cliente}, ${sale.tienda}, Bs ${sale.total.toFixed(2)}`}>
              <View style={styles.saleInfo}>
                <Text style={styles.saleCode}>{sale.codigo}</Text>
                <Text style={styles.saleMeta}>{sale.cliente} · {sale.tienda}</Text>
              </View>
              <View style={styles.saleRight}>
                <Text style={styles.saleTotal}>Bs {sale.total.toFixed(2)}</Text>
                <Text style={styles.saleDate}>{sale.fecha}</Text>
              </View>
            </TableRow>
          ))}
        </TableCard>

        {/* Low Stock */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Stock Crítico</Text>
          <Pressable style={styles.seeAll} onPress={() => {}} accessibilityRole={a11y.button} accessibilityLabel="Ver inventario completo">
            <Text style={styles.seeAllText}>Ver inventario</Text>
            <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.primary} />
          </Pressable>
        </View>
        <TableCard>
          {lowStockProducts.map((p, i) => (
            <TableRow key={i} borderTop={i > 0} accessibilityLabel={`${p.producto}, ${p.ubicacion}, ${p.stock === 0 ? 'Sin stock' : `Stock: ${p.stock}`}`}>
              <View style={styles.alertInfo}>
                <Text style={styles.alertName}>{p.producto}</Text>
                <Text style={styles.alertLocation}>{p.ubicacion}</Text>
              </View>
              <Badge
                variant={p.stock === 0 ? 'danger' : 'warning'}
                size="md"
              >
                {p.stock === 0 ? 'SIN STOCK' : `Stock: ${p.stock}`}
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
              onPress={() => {}}
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
});