import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, ActivityIndicator } from 'react-native';
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
import { useInventarioDashboard } from '../hooks/useDashboard';

const actions = [
  { label: 'Gestionar Solicitudes', iconName: 'document-text' },
  { label: 'Registrar Entrada', iconName: 'add-circle' },
  { label: 'Registrar Salida', iconName: 'remove-circle' },
  { label: 'Traslado Entre Almacenes', iconName: 'swap-horizontal' },
  { label: 'Ver Stock Global', iconName: 'stats-chart' },
  { label: 'Historial Movimientos', iconName: 'time' },
] as const;

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'primary' | 'info';

const getStatusStyle = (estado: string): { variant: BadgeVariant; icon: string } => {
  switch (estado) {
    case 'Pendiente':
      return { variant: 'warning', icon: 'time' };
    case 'En preparación':
      return { variant: 'primary', icon: 'cube' };
    case 'Enviado':
      return { variant: 'success', icon: 'checkmark-circle' };
    default:
      return { variant: 'default', icon: 'help-circle' };
  }
};

export default function InventarioDashboardScreen() {
  const { user, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const statCardMinWidth = isSmallScreen ? '100%' : '46%';
  const actionCardMinWidth = isSmallScreen ? '100%' : width < 600 ? '46%' : '30%';
  const { solicitudes, stats, loading, error, refetch } = useInventarioDashboard();

  const almacenStats = [
    { label: 'Solicitudes Pendientes', value: stats.pendientes.toString(), iconName: 'document-text' as const, color: colors.warning },
    { label: 'En Preparación', value: stats.enPreparacion.toString(), iconName: 'cube' as const, color: colors.primary },
    { label: 'Enviadas Hoy', value: stats.enviadasHoy.toString(), iconName: 'car-sport' as const, color: colors.success },
    { label: 'Productos Críticos', value: stats.criticos.toString(), iconName: 'alert-circle' as const, color: colors.danger },
  ] as const;

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

        {/* Primary CTA - Gestionar Solicitudes */}
        <PrimaryCTA
          label="Gestionar Solicitudes"
          hint={`${solicitudes.length} pendientes · ${solicitudes.filter(r => r.auto).length} auto`}
          iconName="document-text"
          color={colors.warning}
          onPress={() => {}}
          accessibilityLabel="Gestionar solicitudes de tiendas"
        />

        {/* Pending Requests */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Solicitudes de Tiendas</Text>
          <Pressable style={styles.seeAll} onPress={() => {}} accessibilityRole={a11y.button} accessibilityLabel="Ver todas las solicitudes">
            <Text style={styles.seeAllText}>Ver todas</Text>
            <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.primary} />
          </Pressable>
        </View>
        <TableCard>
          {solicitudes.slice(0, 10).map((req, i) => {
            const statusStyle = getStatusStyle(req.estado);
            return (
              <TableRow
                key={req.id}
                borderTop={i > 0}
                accessibilityLabel={`${req.producto?.producto || 'Producto'}, ${req.tienda?.nombre || 'Tienda'}, ${req.cantidad} unidades, ${req.estado}`}
              >
                <View style={styles.requestMain}>
                  <Badge variant={statusStyle.variant} size="sm" dot />
                  <View style={styles.requestInfo}>
                    <View style={styles.requestHeader}>
                      <Text style={styles.requestProduct}>{req.producto?.producto || 'Producto desconocido'}</Text>
                      {req.auto && (
                        <Badge variant="primary" size="sm">AUTO</Badge>
                      )}
                    </View>
                    <Text style={styles.requestMeta}>{req.tienda?.nombre || 'Tienda'} · {req.cantidad} und · {new Date(req.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                </View>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => {}}
                  accessibilityRole={a11y.button}
                  accessibilityLabel={`Gestionar solicitud de ${req.producto?.producto}`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  android_ripple={{ color: colors.primarySoft }}
                >
                  <Text style={styles.actionBtnText}>Gestionar</Text>
                </Pressable>
              </TableRow>
            );
          })}
        </TableCard>

        {/* Stock Alerts - Real data would need additional endpoint */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Alertas de Stock Crítico</Text>
          <Pressable style={styles.seeAll} onPress={() => {}} accessibilityRole={a11y.button} accessibilityLabel="Ver inventario completo">
            <Text style={styles.seeAllText}>Ver inventario completo</Text>
            <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.primary} />
          </Pressable>
        </View>
        <TableCard>
          {(stats.sinStock > 0 || stats.stockBajo > 0) ? [
            { producto: 'Productos sin stock', count: stats.sinStock, variant: 'danger' as const },
            { producto: 'Productos con stock bajo', count: stats.stockBajo, variant: 'warning' as const },
          ].map((alert, i) => (
            <TableRow
              key={i}
              borderTop={i > 0}
              accessibilityLabel={`${alert.producto}, ${alert.count}`}
            >
              <View style={styles.alertInfo}>
                <Text style={styles.alertProduct}>{alert.producto}</Text>
                <Text style={styles.alertLocation}>{alert.count} productos afectados</Text>
              </View>
              <Badge
                variant={alert.variant}
                size="md"
              >
                {alert.count === 0 ? 'OK' : `${alert.count} items`}
              </Badge>
            </TableRow>
          )) : (
            <TableRow borderTop={false} accessibilityLabel="Sin alertas de stock">
              <View style={styles.alertInfo}>
                <Text style={styles.alertProduct}>Sin alertas</Text>
                <Text style={styles.alertLocation}>Todos los productos tienen stock suficiente</Text>
              </View>
              <Badge variant="success" size="md">
                OK
              </Badge>
            </TableRow>
          )}
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