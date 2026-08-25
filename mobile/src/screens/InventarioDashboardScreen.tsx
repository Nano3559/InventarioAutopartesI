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

const almacenStats = [
  { label: 'Solicitudes Pendientes', value: '8', iconName: 'document-text', color: colors.warning },
  { label: 'En Preparación', value: '3', iconName: 'cube', color: colors.primary },
  { label: 'Enviadas Hoy', value: '12', iconName: 'car-sport', color: colors.success },
  { label: 'Productos Críticos', value: '5', iconName: 'alert-circle', color: colors.danger },
] as const;

const pendingRequests = [
  { id: 1, producto: 'Farol Toyota Hilux', tienda: 'Tienda 1', cantidad: 5, estado: 'Pendiente', auto: true, fecha: 'Hoy 08:30' },
  { id: 2, producto: 'Guiñador Nissan NP300', tienda: 'Tienda 2', cantidad: 10, estado: 'Pendiente', auto: false, fecha: 'Hoy 09:15' },
  { id: 3, producto: 'Stop Toyota RAV4', tienda: 'Tienda 3', cantidad: 3, estado: 'En preparación', auto: true, fecha: 'Ayer 16:45' },
  { id: 4, producto: 'Espejo Mazda CX-5', tienda: 'Tienda 1', cantidad: 2, estado: 'Pendiente', auto: false, fecha: 'Ayer 14:20' },
] as const;

const inventoryAlerts = [
  { producto: 'Farol Toyota Hilux', almacen: 'Almacén 1', stock: 2, minimo: 5, ubicaciones: 'A1:2, A2:0, A3:1, A4:0' },
  { producto: 'Parachoques Dodge Ram', almacen: 'Almacén 2', stock: 1, minimo: 3, ubicaciones: 'A1:0, A2:1, A3:0, A4:0' },
  { producto: 'Radiador Jeep Grand Cherokee', almacen: 'Almacén 3', stock: 0, minimo: 2, ubicaciones: 'A1:0, A2:0, A3:0, A4:0' },
] as const;

const actions = [
  { label: 'Gestionar Solicitudes', iconName: 'document-text' },
  { label: 'Registrar Entrada', iconName: 'add-circle' },
  { label: 'Registrar Salida', iconName: 'remove-circle' },
  { label: 'Traslado Entre Almacenes', iconName: 'swap-horizontal' },
  { label: 'Ver Stock Global', iconName: 'analytics' },
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
          hint={`${pendingRequests.length} pendientes · ${pendingRequests.filter(r => r.auto).length} auto`}
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
          {pendingRequests.map((req, i) => {
            const statusStyle = getStatusStyle(req.estado);
            return (
              <TableRow
                key={i}
                borderTop={i > 0}
                accessibilityLabel={`${req.producto}, ${req.tienda}, ${req.cantidad} unidades, ${req.estado}`}
              >
                <View style={styles.requestMain}>
                  <Badge variant={statusStyle.variant} size="sm" dot />
                  <View style={styles.requestInfo}>
                    <View style={styles.requestHeader}>
                      <Text style={styles.requestProduct}>{req.producto}</Text>
                      {req.auto && (
                        <Badge variant="primary" size="sm">AUTO</Badge>
                      )}
                    </View>
                    <Text style={styles.requestMeta}>{req.tienda} · {req.cantidad} und · {req.fecha}</Text>
                  </View>
                </View>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => {}}
                  accessibilityRole={a11y.button}
                  accessibilityLabel={`Gestionar solicitud de ${req.producto}`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  android_ripple={{ color: colors.primarySoft }}
                >
                  <Text style={styles.actionBtnText}>Gestionar</Text>
                </Pressable>
              </TableRow>
            );
          })}
        </TableCard>

        {/* Stock Alerts */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Alertas de Stock Crítico</Text>
          <Pressable style={styles.seeAll} onPress={() => {}} accessibilityRole={a11y.button} accessibilityLabel="Ver inventario completo">
            <Text style={styles.seeAllText}>Ver inventario completo</Text>
            <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.primary} />
          </Pressable>
        </View>
        <TableCard>
          {inventoryAlerts.map((alert, i) => (
            <TableRow
              key={i}
              borderTop={i > 0}
              accessibilityLabel={`${alert.producto}, ${alert.almacen}, stock ${alert.stock}, mínimo ${alert.minimo}`}
            >
              <View style={styles.alertInfo}>
                <Text style={styles.alertProduct}>{alert.producto}</Text>
                <Text style={styles.alertLocation}>{alert.almacen}</Text>
                <Text style={styles.alertDistribution}>{alert.ubicaciones}</Text>
              </View>
              <Badge
                variant={alert.stock === 0 ? 'danger' : 'warning'}
                size="md"
              >
                {alert.stock === 0 ? 'SIN STOCK' : `Stock: ${alert.stock} (Mín: ${alert.minimo})`}
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
});