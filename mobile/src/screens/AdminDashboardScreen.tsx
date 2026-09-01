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
import { useAdminDashboard } from '../hooks/useDashboard';

const quickActions = [
  { label: 'Ventas', icon: 'cash-outline', route: 'Sales', color: colors.emerald },
  { label: 'Ventas por Mayor', icon: 'briefcase-outline', route: 'VentaMayor', color: colors.primary },
  { label: 'Devoluciones', icon: 'refresh-outline', route: 'Devoluciones', color: colors.warning },
  { label: 'Solicitudes', icon: 'document-text-outline', route: 'Solicitudes', color: '#a855f7' },
  { label: 'Reportes', icon: 'stats-chart-outline', route: 'Reportes', color: '#f472b6' },
  { label: 'Búsqueda Imagen', icon: 'camera-outline', route: 'SearchByImage', color: '#38bdf8' },
] as const;

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const { data, loading, error, refetch } = useAdminDashboard();

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

  const inv = data?.inventario;
  const ven = data?.ventas;

  return (
    <SafeAreaView style={s.safe}>
      <Header
        title="AutoPartes Pro"
        subtitle={`Administrador — ${user?.nombre}`}
        onMenuPress={openMenu}
      />

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Banner ── */}
        <View style={s.banner}>
          <View style={s.bannerOverlay}>
            <View style={s.bannerTextWrap}>
              <Text style={s.bannerGreeting}>Hola, {user?.nombre?.split(' ')[0] || 'Admin'}</Text>
              <Text style={s.bannerTitle}>Panel de Administración</Text>
              <Text style={s.bannerSubtitle}>Vista general del sistema</Text>
            </View>
            <Pressable
              style={({ pressed }) => [s.ctaBtn, pressed && { opacity: 0.85 }]}
              onPress={() => goTo('Sales')}
              accessibilityRole={a11y.button}
            >
              <Ionicons name="add-circle" size={22} color={colors.white} />
              <Text style={s.ctaBtnText}>Nueva Venta</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={s.statsRow}>
          <StatCard label="Productos" value={inv?.totalProductos?.toLocaleString() || '0'} iconName="cube" color={colors.primary} minWidth="48%" />
          <StatCard label="Ventas Hoy" value={`Bs ${ven?.hoy?.total?.toLocaleString() || '0'}`} iconName="cash" color={colors.emerald} minWidth="48%" />
          <StatCard label="Stock Bajo" value={`${inv?.stockBajo || 0}`} iconName="alert-circle" color={colors.warning} minWidth="48%" />
          <StatCard label="Sin Stock" value={`${inv?.sinStock || 0}`} iconName="close-circle" color={colors.danger} minWidth="48%" />
        </View>

        {/* ── Ventas por Tienda ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Ventas por Tienda</Text>
          <Pressable style={s.linkBtn} onPress={() => goTo('Sales')}>
            <Text style={s.linkText}>Ver ventas</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </Pressable>
        </View>
        <TableCard>
          {!ven?.porTienda?.length && (
            <TableRow borderTop={false}>
              <View style={s.emptyRow}>
                <Ionicons name="storefront-outline" size={32} color={colors.textMuted} />
                <Text style={s.emptyText}>Sin ventas registradas</Text>
              </View>
            </TableRow>
          )}
          {ven?.porTienda?.slice(0, 5).map((t, i) => (
            <TableRow key={i} borderTop={i > 0}>
              <View style={s.dataRow}>
                <View style={[s.rowIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Ionicons name="storefront" size={18} color={colors.primary} />
                </View>
                <View style={s.rowInfo}>
                  <Text style={s.rowName}>{t.nombre}</Text>
                  <Text style={s.rowMeta}>{t.cantidad} ventas este mes</Text>
                </View>
                <Text style={s.rowValue}>Bs {t.total.toLocaleString()}</Text>
              </View>
            </TableRow>
          ))}
        </TableCard>

        {/* ── Stock Crítico ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Stock Crítico</Text>
          <Pressable style={s.linkBtn} onPress={() => goTo('Reportes')}>
            <Text style={s.linkText}>Ver reportes</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </Pressable>
        </View>
        <TableCard>
          {inv && [
            { label: 'Sin Stock', count: inv.sinStock, color: colors.danger, icon: 'close-circle' as const },
            { label: 'Stock Bajo', count: inv.stockBajo, color: colors.warning, icon: 'alert-circle' as const },
          ].map((item, i) => (
            <TableRow key={i} borderTop={i > 0}>
              <View style={s.dataRow}>
                <View style={[s.rowIcon, { backgroundColor: `${item.color}15` }]}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <View style={s.rowInfo}>
                  <Text style={s.rowName}>{item.label}</Text>
                  <Text style={s.rowMeta}>{item.count} productos afectados</Text>
                </View>
                <Badge variant={item.count === 0 ? 'success' : item.count > 5 ? 'danger' : 'warning'} size="sm">
                  {item.count}
                </Badge>
              </View>
            </TableRow>
          ))}
        </TableCard>

        {/* ── Stock Almacenes ── */}
        {inv && inv.stockPorAlmacen.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Stock por Almacén</Text>
            </View>
            <TableCard>
              {inv.stockPorAlmacen.map((alm, i) => (
                <TableRow key={alm.locationId} borderTop={i > 0}>
                  <View style={s.dataRow}>
                    <View style={[s.rowIcon, { backgroundColor: `${colors.emerald}15` }]}>
                      <Ionicons name="business" size={18} color={colors.emerald} />
                    </View>
                    <View style={s.rowInfo}>
                      <Text style={s.rowName}>{alm.nombre}</Text>
                      <Text style={s.rowMeta}>{alm.productos} productos · {alm.totalStock} uds.</Text>
                    </View>
                    <Badge variant={alm.totalStock === 0 ? 'danger' : alm.totalStock < 20 ? 'warning' : 'success'} size="sm">
                      {alm.totalStock}
                    </Badge>
                  </View>
                </TableRow>
              ))}
            </TableCard>
          </>
        )}

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
  banner: { backgroundColor: colors.primary, borderRadius: radius.lg, overflow: 'hidden', ...shadows.level3 },
  bannerOverlay: { padding: space.xl, gap: space.lg },
  bannerTextWrap: { gap: 4 },
  bannerGreeting: { fontSize: fontSize.body, fontFamily: fontFamily.sans, color: 'rgba(255,255,255,0.7)' },
  bannerTitle: { fontSize: fontSize.display, fontFamily: fontFamily.sansBold, color: colors.white },
  bannerSubtitle: { fontSize: fontSize.body, fontFamily: fontFamily.sansMedium, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, backgroundColor: colors.white, paddingVertical: 14, borderRadius: radius.md },
  ctaBtnText: { color: colors.primary, fontSize: fontSize.bodyStrong, fontFamily: fontFamily.sansBold },

  // Stats
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },

  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: fontSize.headline, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { fontSize: fontSize.caption, fontFamily: fontFamily.sansSemiBold, color: colors.primary },

  // Data row
  dataRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1, minWidth: 0, gap: 2 },
  rowName: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  rowMeta: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  rowValue: { fontSize: fontSize.bodyStrong, fontFamily: fontFamily.monoBold, color: colors.primary },

  emptyRow: { flex: 1, alignItems: 'center', paddingVertical: space.lg, gap: space.sm },
  emptyText: { color: colors.textMuted, fontSize: fontSize.caption, fontFamily: fontFamily.sans },

  // Actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  actionCard: { width: '30%', minWidth: 100, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.lg, alignItems: 'center', justifyContent: 'center', gap: space.sm, ...shadows.level1 },
  actionIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: fontSize.caption, fontFamily: fontFamily.sansSemiBold, color: colors.text, textAlign: 'center' },
});
