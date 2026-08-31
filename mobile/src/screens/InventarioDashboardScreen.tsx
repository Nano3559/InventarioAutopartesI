import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getDashboard, type DashboardData } from '../api/reportes';
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

export default function InventarioDashboardScreen() {
  const { user, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const statCardMinWidth = isSmallScreen ? '100%' : '46%';
  const actionCardMinWidth = isSmallScreen ? '100%' : width < 600 ? '46%' : '30%';
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getDashboard();
        setDashboard(data);
      } catch (e) {
        console.error('Error cargando dashboard:', e);
        setError('No se pudieron cargar los datos');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const inv = dashboard?.inventario;

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="AutoPartes Pro"
        subtitle={`Encargado de Inventario — ${user?.nombre}`}
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
          <Text style={styles.welcomeTitle}>Panel de Inventario</Text>
          <Text style={styles.welcomeSubtitle}>Gestión de stock, solicitudes y movimientos</Text>
        </View>

        {loading ? (
          <View style={{ padding: space.xl, alignItems: 'center', gap: space.md }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted }}>Cargando datos...</Text>
          </View>
        ) : error ? (
          <View style={{ padding: space.xl, alignItems: 'center', gap: space.md }}>
            <Ionicons name="alert-circle" size={iconSize['2xl']} color={colors.danger} />
            <Text style={{ fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.danger }}>{error}</Text>
          </View>
        ) : (
          <>
            {/* Stats Grid */}
            <Text style={styles.sectionTitle}>Resumen de Almacenes</Text>
            <View style={styles.statsGrid}>
              {almacenStats.map((stat, i) => (
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

            {/* Stock por Almacen */}
            {inv && inv.stockPorAlmacen.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Stock por Almacén</Text>
                <TableCard>
                  {inv.stockPorAlmacen.map((alm, i) => (
                    <TableRow key={alm.locationId} borderTop={i > 0} accessibilityLabel={`${alm.nombre}, ${alm.productos} productos, ${alm.totalStock} unidades`}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.requestProduct}>{alm.nombre}</Text>
                        <Text style={styles.requestMeta}>{alm.productos} productos · {alm.totalStock} unidades totales</Text>
                      </View>
                      <Badge variant={alm.totalStock === 0 ? 'danger' : alm.totalStock < 50 ? 'warning' : 'success'} size="sm">
                        {alm.totalStock} uds
                      </Badge>
                    </TableRow>
                  ))}
                </TableCard>
              </>
            )}

            {/* Stock por Tienda */}
            {inv && inv.stockPorTienda.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Stock por Tienda</Text>
                <TableCard>
                  {inv.stockPorTienda.map((tienda, i) => (
                    <TableRow key={tienda.locationId} borderTop={i > 0} accessibilityLabel={`${tienda.nombre}, ${tienda.productos} productos, ${tienda.totalStock} unidades`}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.requestProduct}>{tienda.nombre}</Text>
                        <Text style={styles.requestMeta}>{tienda.productos} productos · {tienda.totalStock} unidades totales</Text>
                      </View>
                      <Badge variant={tienda.totalStock === 0 ? 'danger' : tienda.totalStock < 30 ? 'warning' : 'success'} size="sm">
                        {tienda.totalStock} uds
                      </Badge>
                    </TableRow>
                  ))}
                </TableCard>
              </>
            )}

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
            <View style={styles.actionsGrid}>
              <ActionCard
                label="Gestionar Solicitudes"
                iconName="document-text"
                onPress={() => {}}
                minWidth={actionCardMinWidth}
                accessibilityLabel="Gestionar solicitudes"
              />
              <ActionCard
                label="Ver Inventario"
                iconName="analytics"
                onPress={() => {}}
                minWidth={actionCardMinWidth}
                accessibilityLabel="Ver inventario completo"
              />
            </View>
          </>
        )}
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
  requestMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  requestInfo: { flex: 1, minWidth: 0, gap: 2 },
  requestHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  requestProduct: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  requestMeta: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  actionBtn: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
  },
  actionBtnText: { color: colors.primary, fontFamily: fontFamily.sansSemiBold, fontSize: fontSize.captionStrong },
  alertInfo: { flex: 1, minWidth: 0, gap: 2 },
  alertProduct: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  alertLocation: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  alertDistribution: { fontSize: fontSize.caption, fontFamily: fontFamily.monoMedium, color: colors.textMuted },
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