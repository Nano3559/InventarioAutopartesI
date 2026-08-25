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

const tiendaStats = [
  { label: 'Ventas Hoy', value: '12', iconName: 'cash', color: colors.success },
  { label: 'Total Vendido', value: 'Bs 18,450', iconName: 'analytics', color: colors.primary },
  { label: 'Productos Vendidos', value: '47', iconName: 'cube', color: colors.primary },
  { label: 'Pendientes Factura', value: '3', iconName: 'document-text', color: colors.warning },
] as const;

const recentSales = [
  { id: 1, codigo: 'NV-000045', cliente: 'Cliente Varios', total: 1250.00, hora: '10:30', estado: 'Completada' },
  { id: 2, codigo: 'NV-000044', cliente: 'María García', total: 890.50, hora: '09:15', estado: 'Completada' },
  { id: 3, codigo: 'NV-000043', cliente: 'Carlos López', total: 2100.00, hora: 'Ayer 16:45', estado: 'Facturada' },
] as const;

const topProducts = [
  { producto: 'Farol Toyota Hilux', vendidos: 15, ingresos: 7200 },
  { producto: 'Guiñador Nissan NP300', vendidos: 12, ingresos: 2160 },
  { producto: 'Stop Toyota RAV4', vendidos: 8, ingresos: 1920 },
] as const;

const actions = [
  { label: 'Nueva Venta', iconName: 'add-circle', primary: true },
  { label: 'Buscar Producto', iconName: 'search', primary: false },
  { label: 'Ver Stock Local', iconName: 'cube', primary: false },
  { label: 'Devolución', iconName: 'refresh', primary: false },
  { label: 'Solicitar a Almacén', iconName: 'document', primary: false },
  { label: 'Facturar', iconName: 'document-text', primary: false },
] as const;

const getStatusVariant = (estado: string) => {
  switch (estado) {
    case 'Facturada': return 'success';
    case 'Completada': return 'primary';
    default: return 'default';
  }
};

export default function TiendaDashboardScreen() {
  const { user, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const statCardMinWidth = isSmallScreen ? '100%' : '46%';
  const actionCardMinWidth = isSmallScreen ? '100%' : width < 600 ? '46%' : '30%';

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="AutoPartes Pro"
        subtitle={`${user?.tienda?.nombre || 'Tienda'} — ${user?.nombre}`}
        rightAction={{
          label: 'Salir',
          onPress: signOut,
          variant: 'danger',
          icon: 'log-out',
        }}
      />

      <ScrollView contentContainerStyle={[styles.content, isSmallScreen && styles.contentSmall]} showsVerticalScrollIndicator={false}>
        {/* Welcome */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Panel de Tienda</Text>
          <Text style={styles.welcomeSubtitle}>Gestión de ventas y stock local</Text>
        </View>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Resumen de Hoy</Text>
        <View style={styles.statsGrid}>
          {tiendaStats.map((stat, i) => (
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

        {/* Primary CTA - Nueva Venta */}
        <PrimaryCTA
          label="Nueva Venta"
          hint="Buscar, agregar, cobrar"
          iconName="add-circle"
          color={colors.success}
          onPress={() => {}}
          accessibilityLabel="Crear nueva venta"
        />

        {/* Recent Sales */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Ventas Recientes</Text>
          <Pressable style={styles.seeAll} onPress={() => {}} accessibilityRole={a11y.button} accessibilityLabel="Ver historial de ventas">
            <Text style={styles.seeAllText}>Ver historial</Text>
            <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.primary} />
          </Pressable>
        </View>
        <TableCard>
          {recentSales.map((sale, i) => (
            <TableRow key={i} borderTop={i > 0} accessibilityLabel={`Venta ${sale.codigo}, ${sale.cliente}, Bs ${sale.total.toFixed(2)}, ${sale.estado}`}>
              <View style={styles.saleInfo}>
                <Text style={styles.saleCode}>{sale.codigo}</Text>
                <Text style={styles.saleMeta}>{sale.cliente} · {sale.hora}</Text>
              </View>
              <View style={styles.saleRight}>
                <Text style={styles.saleTotal}>Bs {sale.total.toFixed(2)}</Text>
                <Badge variant={getStatusVariant(sale.estado)} size="sm">
                  {sale.estado}
                </Badge>
              </View>
            </TableRow>
          ))}
        </TableCard>

        {/* Top Products */}
        <Text style={styles.sectionTitle}>Productos Más Vendidos</Text>
        <TableCard>
          {topProducts.map((p, i) => (
            <TableRow key={i} borderTop={i > 0} accessibilityLabel={`${p.producto}, ${p.vendidos} unidades, Bs ${p.ingresos.toLocaleString()}`}>
              <View style={styles.rank}>
                <Text style={styles.rankText}>#{i + 1}</Text>
              </View>
              <View style={styles.topInfo}>
                <Text style={styles.topName}>{p.producto}</Text>
                <Text style={styles.topMeta}>{p.vendidos} unidades vendidas</Text>
              </View>
              <View style={styles.topRevenue}>
                <Text style={styles.revenueLabel}>Ingresos</Text>
                <Text style={styles.revenueValue}>Bs {p.ingresos.toLocaleString()}</Text>
              </View>
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
              primary={a.primary}
              fullWidth={a.primary}
              minWidth={a.primary ? '100%' : actionCardMinWidth}
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
  saleRight: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.md, minWidth: 80 },
  saleTotal: { fontSize: fontSize.data, fontFamily: fontFamily.monoBold, color: colors.primary },
  rank: { width: 36, alignItems: 'center' },
  rankText: { fontSize: fontSize.captionStrong, fontFamily: fontFamily.monoMedium, color: colors.textMuted },
  topInfo: { flex: 1, minWidth: 0, gap: 2, marginLeft: space.sm },
  topName: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  topMeta: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  topRevenue: { alignItems: 'flex-end', paddingLeft: space.md, minWidth: 70 },
  revenueLabel: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  revenueValue: { fontSize: fontSize.data, fontFamily: fontFamily.monoBold, color: colors.success },
  contentSmall: { paddingHorizontal: space.md },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    marginTop: space.sm,
  },
});