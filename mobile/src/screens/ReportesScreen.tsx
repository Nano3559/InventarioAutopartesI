import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../context/AuthContext';
import { getDashboard, getReporteMensual, type DashboardData, type ReporteMensualItem } from '../api/reportes';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import { colors, space, radius, fontFamily, fontSize, shadows } from '../theme';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function ReportesScreen() {
  const navigation = useNavigation();
  const { token, user } = useAuth();
  const isAdmin = user?.rol === 'admin';

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [mensual, setMensual] = useState<ReporteMensualItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedYear] = useState(new Date().getFullYear());
  const [printLoading, setPrintLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [dashData, mensualData] = await Promise.all([
        getDashboard(token),
        getReporteMensual(selectedYear, token),
      ]);
      setDashboard(dashData);
      setMensual(mensualData);
    } catch (err) {
      console.error('Error cargando reportes:', err);
    }
  }, [token, selectedYear]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handlePrint = async () => {
    if (!dashboard) return;
    setPrintLoading(true);
    try {
      const ven = dashboard.ventas;
      const inv = dashboard.inventario;
      const html = `
        <html><head><title>Reporte - ${user?.nombre || 'Tienda'}</title>
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
          h1 { color: #0284c7; border-bottom: 2px solid #0284c7; padding-bottom: 8px; font-size: 20px; }
          h2 { color: #555; margin-top: 20px; font-size: 16px; }
          .stat { display: inline-block; width: 45%; margin: 5px 0; padding: 10px; background: #f8fafc; border-radius: 6px; }
          .stat .label { font-size: 11px; color: #777; }
          .stat .value { font-size: 16px; font-weight: bold; color: #0284c7; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; font-size: 12px; }
          th { background: #f1f5f9; }
          .footer { margin-top: 30px; font-size: 10px; color: #999; text-align: center; }
        </style></head><body>
          <h1>Reporte de Ventas — ${isAdmin ? 'Sistema' : user?.nombre || 'Tienda'}</h1>
          <p>Fecha: ${new Date().toLocaleDateString('es-BO')} | Año: ${selectedYear}</p>
          <div class="stat"><div class="label">Ventas del Mes</div><div class="value">Bs. ${ven?.mes?.total?.toFixed(2) || '0.00'}</div></div>
          <div class="stat"><div class="label">Ventas de Hoy</div><div class="value">Bs. ${ven?.hoy?.total?.toFixed(2) || '0.00'}</div></div>
          <div class="stat"><div class="label">Total Productos</div><div class="value">${inv?.totalProductos || 0}</div></div>
          <div class="stat"><div class="label">Sin Stock</div><div class="value" style="color:#ef4444">${inv?.sinStock || 0}</div></div>
          <h2>Ventas por Marca</h2>
          <table><thead><tr><th>Marca</th><th>Unidades</th><th>Total (Bs.)</th></tr></thead><tbody>
          ${(ven?.porMarca || []).map(m => `<tr><td>${m.marca}</td><td>${m.unidades}</td><td>${m.total.toFixed(2)}</td></tr>`).join('')}
          </tbody></table>
          <h2>Top Productos Más Vendidos</h2>
          <table><thead><tr><th>Producto</th><th>Marca</th><th>Unid.</th><th>Total</th></tr></thead><tbody>
          ${(dashboard.topProductos || []).map(p => `<tr><td>${p.producto}</td><td>${p.marca}</td><td>${p.unidadesVendidas}</td><td>${p.totalVendido.toFixed(2)}</td></tr>`).join('')}
          </tbody></table>
          <div class="footer">AutoRepuestos Pro — Reporte generado automáticamente</div>
        </body></html>`;

      const result = await Print.printToFileAsync({ html });
      if (result?.uri) {
        await Sharing.shareAsync(result.uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (err) {
      console.error('Error al imprimir:', err);
    } finally {
      setPrintLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando reportes...</Text>
      </View>
    );
  }

  const ven = dashboard?.ventas;
  const inv = dashboard?.inventario;
  const safeMensual = mensual.filter((m): m is ReporteMensualItem => m != null && m.mes != null);
  const maxMensual = Math.max(...safeMensual.map(m => m.total), 1);

  return (
    <View style={styles.container}>
      <Header
        title="Reportes"
        subtitle={isAdmin ? 'Métricas del sistema' : 'Resumen de mi tienda'}
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        rightAction={{
          label: printLoading ? 'Imprimiendo...' : 'Imprimir',
          onPress: handlePrint,
          variant: 'ghost',
          icon: printLoading ? undefined : 'print-outline',
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Stats Principales */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Ventas del Mes"
            value={`Bs. ${ven?.mes?.total?.toLocaleString() || '0'}`}
            iconName="trending-up"
            color={colors.emerald}
          />
          <StatCard
            label="Ventas de Hoy"
            value={`Bs. ${ven?.hoy?.total?.toLocaleString() || '0'}`}
            iconName="cash"
            color={colors.blue}
          />
          <StatCard
            label="Total Productos"
            value={`${inv?.totalProductos || 0}`}
            iconName="cube"
            color={colors.primary}
          />
          <StatCard
            label="Sin Stock"
            value={`${inv?.sinStock || 0}`}
            iconName="alert-circle"
            color={colors.danger}
          />
        </View>

        {/* Evolución Mensual */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Evolución Mensual ({selectedYear})</Text>
          <View style={styles.chartCard}>
            <View style={styles.barChart}>
              {safeMensual.map((item) => {
                const heightPercent = maxMensual > 0 ? (item.total / maxMensual) * 100 : 0;
                const isZero = item.total === 0;
                return (
                  <View key={item.mes} style={styles.barCol}>
                    {!isZero && (
                      <Text style={styles.barAmount}>
                        {item.total >= 1000 ? `${(item.total / 1000).toFixed(1)}k` : item.total.toFixed(0)}
                      </Text>
                    )}
                    <View
                      style={[
                        styles.bar,
                        {
                          height: isZero ? 4 : Math.max(8, (heightPercent / 100) * 120),
                          opacity: isZero ? 0.25 : 1,
                          backgroundColor: item.total === maxMensual ? colors.emerald : colors.primary,
                        },
                      ]}
                    />
                    <Text style={styles.barLabel}>{MESES[item.mes - 1]}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Resumen Mensual en Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle Mensual</Text>
          <View style={styles.monthlyGrid}>
            {safeMensual.filter(m => m.total > 0).map((item) => (
              <View key={item.mes} style={styles.monthCard}>
                <Text style={styles.monthName}>{MESES[item.mes - 1]}</Text>
                <Text style={styles.monthTotal}>Bs. {item.total.toLocaleString()}</Text>
                <Text style={styles.monthCount}>{item.cantidad} ventas</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Ventas por Marca */}
        {ven?.porMarca && ven.porMarca.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ventas por Marca</Text>
            <View style={styles.tableCard}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>Marca</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableRight]}>Unid.</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableRight]}>Total</Text>
              </View>
              {ven.porMarca.map((m, i) => (
                <View key={m.marca} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={styles.tableCell}>{m.marca}</Text>
                  <Text style={[styles.tableCell, styles.tableRight]}>{m.unidades}</Text>
                  <Text style={[styles.tableCell, styles.tableRight, styles.tableBold]}>Bs. {m.total.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Top Productos */}
        {dashboard?.topProductos && dashboard.topProductos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Productos Más Vendidos</Text>
            <View style={styles.tableCard}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>Producto</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableRight]}>Unid.</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableRight]}>Total</Text>
              </View>
              {dashboard.topProductos.map((p, i) => (
                <View key={p.id} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  <View style={[styles.tableCell, { flex: 2 }]}>
                    <Text style={styles.tableBold}>{p.producto}</Text>
                    <Text style={styles.tableSubtext}>{p.marca} {p.modelo}</Text>
                  </View>
                  <Text style={[styles.tableCell, styles.tableRight]}>{p.unidadesVendidas}</Text>
                  <Text style={[styles.tableCell, styles.tableRight, styles.tableBold]}>Bs. {p.totalVendido.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Stock por Tienda (solo admin) */}
        {isAdmin && inv?.stockPorTienda && inv.stockPorTienda.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stock por Tienda</Text>
            <View style={styles.tableCard}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>Tienda</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableRight]}>Prod.</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableRight]}>Stock</Text>
              </View>
              {inv.stockPorTienda.map((t, i) => (
                <View key={t.locationId} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={styles.tableCell}>{t.nombre}</Text>
                  <Text style={[styles.tableCell, styles.tableRight]}>{t.productos}</Text>
                  <Text style={[styles.tableCell, styles.tableRight, styles.tableBold]}>{t.totalStock}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  loadingText: {
    marginTop: space.md,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: space.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    marginBottom: space.lg,
  },
  section: {
    marginBottom: space.lg,
  },
  sectionTitle: {
    fontSize: fontSize.headline,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
    marginBottom: space.md,
  },
  chartCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.lg,
    ...shadows.level1,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
    paddingTop: space.lg,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 160,
  },
  barAmount: {
    fontSize: 9,
    fontFamily: fontFamily.mono,
    color: colors.textMuted,
    marginBottom: 2,
  },
  bar: {
    width: 16,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    marginTop: 4,
  },
  monthlyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  monthCard: {
    width: '30%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: space.md,
    alignItems: 'center',
  },
  monthName: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  monthTotal: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.monoBold,
    color: colors.primary,
    marginTop: 4,
  },
  monthCount: {
    fontSize: 10,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    marginTop: 2,
  },
  tableCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.level1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tableRowAlt: {
    backgroundColor: colors.bg,
  },
  tableHeader: {
    backgroundColor: colors.primarySoft,
  },
  tableCell: {
    flex: 1,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sans,
    color: colors.text,
  },
  tableHeaderText: {
    fontFamily: fontFamily.sansSemiBold,
    color: colors.primary,
  },
  tableRight: {
    textAlign: 'right',
  },
  tableBold: {
    fontFamily: fontFamily.sansSemiBold,
  },
  tableSubtext: {
    fontSize: 10,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    marginTop: 2,
  },
});
