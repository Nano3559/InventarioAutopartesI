import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
  colors,
  space,
  radius,
  fontFamily,
  fontSize,
  shadows,
  iconSize,
  a11y,
} from '../theme';
import { Header, StatCard, TableRow, TableCard, Badge } from '../components';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTiendaDashboard } from '../hooks/useDashboard';

const quickActions = [
  { label: 'Ventas por Mayor', icon: 'briefcase-outline', route: 'VentaMayor', color: colors.primary },
  { label: 'Devoluciones', icon: 'refresh-outline', route: 'Devoluciones', color: colors.warning },
  { label: 'Solicitudes', icon: 'document-text-outline', route: 'Solicitudes', color: '#a855f7' },
  { label: 'Reportes', icon: 'stats-chart-outline', route: 'Reportes', color: colors.emerald },
  { label: 'Búsqueda Imagen', icon: 'camera-outline', route: 'SearchByImage', color: '#f472b6' },
] as const;

const getStatusVariant = (estado: string) => {
  switch (estado) {
    case 'Facturada': return 'success';
    case 'Completada': return 'primary';
    default: return 'default';
  }
};

export default function TiendaDashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isSmall = width < 380;
  const { sales, stats, topProducts, loading, error, refetch } = useTiendaDashboard();

  const openMenu = () => navigation.dispatch(DrawerActions.openDrawer());
  const goTo = (route: string) => navigation.navigate(route as never);

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <Header title="AutoPartes Pro" onMenuPress={openMenu} />
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.centerText}>Cargando dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={s.safe}>
        <Header title="AutoPartes Pro" onMenuPress={openMenu} />
        <View style={s.center}>
          <Ionicons name="cloud-offline" size={48} color={colors.danger} />
          <Text style={[s.centerText, { color: colors.danger }]}>{error}</Text>
          <Pressable style={s.retryBtn} onPress={refetch}>
            <Text style={s.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <Header
        title="AutoPartes Pro"
        subtitle={`${user?.tienda?.nombre || 'Tienda'} — ${user?.nombre}`}
        onMenuPress={openMenu}
      />

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Banner bienvenida + CTA ── */}
        <View style={s.banner}>
          <View style={s.bannerOverlay}>
            <View style={s.bannerTextWrap}>
              <Text style={s.bannerGreeting}>Hola, {user?.nombre?.split(' ')[0] || 'Vendedor'}</Text>
              <Text style={s.bannerTitle}>Punto de Venta</Text>
              <Text style={s.bannerSubtitle}>{user?.tienda?.nombre || 'Tu tienda'}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [s.ctaBtn, pressed && { opacity: 0.85 }]}
              onPress={() => goTo('Sales')}
              accessibilityRole={a11y.button}
              accessibilityLabel="Nueva venta"
            >
              <Ionicons name="add-circle" size={22} color={colors.white} />
              <Text style={s.ctaBtnText}>Nueva Venta</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={s.statsRow}>
          <StatCard label="Ventas Hoy" value={stats.ventasHoy.toString()} iconName="cash" color={colors.emerald} minWidth="48%" />
          <StatCard label="Ingresos" value={`Bs ${stats.totalVendido.toLocaleString()}`} iconName="wallet" color={colors.primary} minWidth="48%" />
          <StatCard label="Productos" value={stats.productosVendidos.toString()} iconName="cube" color="#a855f7" minWidth="48%" />
          <StatCard label="Pendientes" value={stats.pendientesFactura.toString()} iconName="receipt" color={colors.warning} minWidth="48%" />
        </View>

        {/* ── Ventas Recientes ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Ventas Recientes</Text>
          <Pressable style={s.linkBtn} onPress={() => goTo('Sales')}>
            <Text style={s.linkText}>Ver todo</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </Pressable>
        </View>
        <TableCard>
          {sales.length === 0 && (
            <TableRow borderTop={false}>
              <View style={{ flex: 1, alignItems: 'center', paddingVertical: space.lg }}>
                <Ionicons name="receipt-outline" size={32} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, marginTop: space.sm, fontSize: fontSize.caption }}>Sin ventas registradas hoy</Text>
              </View>
            </TableRow>
          )}
          {sales.slice(0, 5).map((sale, i) => (
            <TableRow key={sale.id} borderTop={i > 0}>
              <View style={s.saleRow}>
                <View style={s.saleIcon}>
                  <Ionicons name="cart" size={18} color={colors.primary} />
                </View>
                <View style={s.saleInfo}>
                  <Text style={s.saleCode}>{sale.codigo}</Text>
                  <Text style={s.saleMeta}>
                    {sale.cliente?.nombre || 'Cliente Varios'} · {new Date(sale.fecha).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={s.saleRight}>
                  <Text style={s.saleTotal}>Bs {sale.total.toFixed(2)}</Text>
                  <Badge variant={getStatusVariant(sale.requiereFactura ? 'Facturada' : 'Completada')} size="sm">
                    {sale.requiereFactura ? 'Facturada' : 'Hecha'}
                  </Badge>
                </View>
              </View>
            </TableRow>
          ))}
        </TableCard>

        {/* ── Top Productos ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Más Vendidos</Text>
        </View>
        <TableCard>
          {topProducts.length === 0 && (
            <TableRow borderTop={false}>
              <View style={{ flex: 1, alignItems: 'center', paddingVertical: space.lg }}>
                <Ionicons name="bar-chart-outline" size={32} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, marginTop: space.sm, fontSize: fontSize.caption }}>Sin datos este mes</Text>
              </View>
            </TableRow>
          )}
          {topProducts.slice(0, 5).map((p, i) => (
            <TableRow key={i} borderTop={i > 0}>
              <View style={s.topRow}>
                <View style={[s.rankBadge, i === 0 && s.rankGold, i === 1 && s.rankSilver]}>
                  <Text style={[s.rankText, i === 0 && s.rankTextGold]}>{i + 1}</Text>
                </View>
                <View style={s.topInfo}>
                  <Text style={s.topName}>{p.producto}</Text>
                  <Text style={s.topMeta}>{p.vendidos} unidades vendidas</Text>
                </View>
                <Text style={s.topRevenue}>Bs {p.ingresos.toLocaleString()}</Text>
              </View>
            </TableRow>
          ))}
        </TableCard>

        {/* ── Acciones Rápidas ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Acciones Rápidas</Text>
        </View>
        <View style={s.actionsGrid}>
          {quickActions.map((a) => (
            <Pressable
              key={a.route}
              style={({ pressed }) => [s.actionCard, pressed && { opacity: 0.8 }]}
              onPress={() => goTo(a.route)}
            >
              <View style={[s.actionIcon, { backgroundColor: `${a.color}15` }]}>
                <Ionicons name={a.icon} size={24} color={a.color} />
              </View>
              <Text style={s.actionLabel}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: space.lg, gap: space.xl },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.md, padding: space.xl },
  centerText: { color: colors.textMuted, fontSize: fontSize.body, fontFamily: fontFamily.sans },
  retryBtn: { backgroundColor: colors.primary, paddingHorizontal: space.xl, paddingVertical: space.md, borderRadius: radius.md, marginTop: space.sm },
  retryText: { color: colors.white, fontFamily: fontFamily.sansSemiBold, fontSize: fontSize.body },

  // Banner
  banner: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.level3,
  },
  bannerOverlay: {
    padding: space.xl,
    gap: space.lg,
  },
  bannerTextWrap: { gap: 4 },
  bannerGreeting: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sans,
    color: 'rgba(255,255,255,0.7)',
  },
  bannerTitle: {
    fontSize: fontSize.display,
    fontFamily: fontFamily.sansBold,
    color: colors.white,
  },
  bannerSubtitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansMedium,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.white,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  ctaBtnText: {
    color: colors.primary,
    fontSize: fontSize.bodyStrong,
    fontFamily: fontFamily.sansBold,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.headline,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.primary,
  },

  // Sale row
  saleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  saleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saleInfo: { flex: 1, minWidth: 0, gap: 2 },
  saleCode: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  saleMeta: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  saleRight: { alignItems: 'flex-end', gap: 4 },
  saleTotal: { fontSize: fontSize.bodyStrong, fontFamily: fontFamily.monoBold, color: colors.primary },

  // Top row
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankGold: { backgroundColor: '#FEF3C7' },
  rankSilver: { backgroundColor: '#F1F5F9' },
  rankText: { fontSize: fontSize.caption, fontFamily: fontFamily.monoBold, color: colors.textMuted },
  rankTextGold: { color: '#D97706' },
  topInfo: { flex: 1, minWidth: 0, gap: 2 },
  topName: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  topMeta: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  topRevenue: { fontSize: fontSize.body, fontFamily: fontFamily.monoBold, color: colors.success },

  // Actions grid
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  actionCard: {
    width: '30%',
    minWidth: 100,
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
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
    textAlign: 'center',
  },
});
