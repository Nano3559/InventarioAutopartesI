import { useState, useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getDashboard, type DashboardData } from '../api/reportes';
import {
  colors,
  space,
  radius,
  fontFamily,
  fontSize,
  shadows,
  a11y,
} from '../theme';
import { Header, StatCard, TableRow, TableCard, Badge } from '../components';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function InventarioDashboardScreen() {
  const { user, token } = useAuth();
  const navigation = useNavigation();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const openMenu = () => navigation.dispatch(DrawerActions.openDrawer());
  const goTo = (route: string) => navigation.navigate(route as never);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboard(token ?? undefined);
      setDashboard(data);
    } catch {
      setError('No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <Header title="AutoPartes Pro" onMenuPress={openMenu} />
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.centerText}>Cargando datos...</Text>
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
          <Pressable
            style={({ pressed }) => [s.retryBtn, pressed && { opacity: 0.8 }]}
            onPress={loadData}
          >
            <Ionicons name="refresh" size={20} color={colors.primary} />
            <Text style={s.retryBtnText}>Reintentar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const inv = dashboard?.inventario;

  return (
    <SafeAreaView style={s.safe}>
      <Header
        title="AutoPartes Pro"
        subtitle={`Inventario — ${user?.nombre}`}
        onMenuPress={openMenu}
      />

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* ── Banner ── */}
        <View style={s.banner}>
          <View style={s.bannerOverlay}>
            <View style={s.bannerTextWrap}>
              <Text style={s.bannerGreeting}>Hola, {user?.nombre?.split(' ')[0] || 'Inventario'}</Text>
              <Text style={s.bannerTitle}>Panel de Inventario</Text>
              <Text style={s.bannerSubtitle}>Gestión de stock, solicitudes y movimientos</Text>
            </View>
            <Pressable
              style={({ pressed }) => [s.ctaBtn, pressed && { opacity: 0.85 }]}
              onPress={() => goTo('Solicitudes')}
              accessibilityRole={a11y.button}
            >
              <Ionicons name="document-text" size={22} color={colors.white} />
              <Text style={s.ctaBtnText}>Ver Solicitudes</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={s.statsRow}>
          <StatCard label="Productos" value={`${inv?.totalProductos || 0}`} iconName="cube" color={colors.primary} minWidth="48%" />
          <StatCard label="Valor Inventario" value={`Bs ${inv?.valorInventario?.toLocaleString() || '0'}`} iconName="cash" color={colors.emerald} minWidth="48%" />
          <StatCard label="Stock Bajo" value={`${inv?.stockBajo || 0}`} iconName="alert-circle" color={colors.warning} minWidth="48%" />
          <StatCard label="Sin Stock" value={`${inv?.sinStock || 0}`} iconName="close-circle" color={colors.danger} minWidth="48%" />
        </View>

        {/* ── Stock por Almacén ── */}
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

        {/* ── Stock por Tienda ── */}
        {inv && inv.stockPorTienda.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Stock por Tienda</Text>
            </View>
            <TableCard>
              {inv.stockPorTienda.map((tienda, i) => (
                <TableRow key={tienda.locationId} borderTop={i > 0}>
                  <View style={s.dataRow}>
                    <View style={[s.rowIcon, { backgroundColor: `${colors.primary}15` }]}>
                      <Ionicons name="storefront" size={18} color={colors.primary} />
                    </View>
                    <View style={s.rowInfo}>
                      <Text style={s.rowName}>{tienda.nombre}</Text>
                      <Text style={s.rowMeta}>{tienda.productos} productos · {tienda.totalStock} uds.</Text>
                    </View>
                    <Badge variant={tienda.totalStock === 0 ? 'danger' : tienda.totalStock < 10 ? 'warning' : 'success'} size="sm">
                      {tienda.totalStock}
                    </Badge>
                  </View>
                </TableRow>
              ))}
            </TableCard>
          </>
        )}

        {/* ── Stock Crítico ── */}
        {inv && (inv.sinStock > 0 || inv.stockBajo > 0) && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Alertas de Stock</Text>
            </View>
            <TableCard>
              {[
                { label: 'Sin Stock', count: inv.sinStock, color: colors.danger, icon: 'close-circle' as const },
                { label: 'Stock Bajo', count: inv.stockBajo, color: colors.warning, icon: 'alert-circle' as const },
              ].filter(x => x.count > 0).map((item, i) => (
                <TableRow key={i} borderTop={i > 0}>
                  <View style={s.dataRow}>
                    <View style={[s.rowIcon, { backgroundColor: `${item.color}15` }]}>
                      <Ionicons name={item.icon} size={18} color={item.color} />
                    </View>
                    <View style={s.rowInfo}>
                      <Text style={s.rowName}>{item.label}</Text>
                      <Text style={s.rowMeta}>{item.count} productos afectados</Text>
                    </View>
                    <Badge variant={item.count > 5 ? 'danger' : 'warning'} size="sm">
                      {item.count}
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
          {([
            { label: 'Inventario', icon: 'cube-outline' as const, route: 'Inventario', color: colors.primary },
            { label: 'Solicitudes', icon: 'document-text-outline' as const, route: 'Solicitudes', color: '#a855f7' },
            { label: 'Reportes', icon: 'stats-chart-outline' as const, route: 'Reportes', color: colors.emerald },
          ]).map((a) => (
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
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: space.lg },
  retryBtnText: { color: colors.primary, fontFamily: fontFamily.sansSemiBold, fontSize: fontSize.body },

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

  // Data row
  dataRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1, minWidth: 0, gap: 2 },
  rowName: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  rowMeta: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },

  // Actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  actionCard: { width: '30%', minWidth: 100, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.lg, alignItems: 'center', justifyContent: 'center', gap: space.sm, ...shadows.level1 },
  actionIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: fontSize.caption, fontFamily: fontFamily.sansSemiBold, color: colors.text, textAlign: 'center' },
});
