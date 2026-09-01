import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getSales, getSale, getNotaVenta, type Sale, type SaleDetail, type PaymentDetail } from '../api/sales';
import { getToken } from '../storage/token';
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
import { Header, Badge, TableCard, TableRow } from '../components';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

type TipoFilter = '' | 'menor' | 'mayor';

export default function SalesHistoryScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [printing, setPrinting] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadSales = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (tipoFilter) params.tipo = tipoFilter;
      const data = await getSales(token, params);
      setSales(data);
    } catch (e) {
      console.error('Error cargando ventas:', e);
      showToast('Error al cargar las ventas', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, tipoFilter]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const handleViewDetail = async (sale: Sale) => {
    try {
      setDetailLoading(true);
      const token = await getToken();
      if (!token) return;
      const fullSale = await getSale(sale.id, token);
      setSelectedSale(fullSale);
    } catch {
      showToast('Error al cargar detalle', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handlePrintNota = async (saleId: number) => {
    try {
      setPrinting(true);
      const token = await getToken();
      if (!token) return;
      const html = await getNotaVenta(saleId, token);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Guardar/Imprimir Nota de Venta' });
    } catch {
      showToast('No se pudo generar la nota', 'error');
    } finally {
      setPrinting(false);
    }
  };

  const formatCurrency = (amount: number) => `Bs ${amount.toFixed(2)}`;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  };

  const renderSaleItem = useCallback(({ item }: { item: Sale }) => (
    <TableRow
      borderTop
      onPress={() => handleViewDetail(item)}
      accessibilityLabel={`Venta ${item.codigo}, ${formatCurrency(item.total)}`}
      accessibilityHint="Tocar para ver detalle"
    >
      <View style={styles.saleInfo}>
        <View style={styles.saleHeader}>
          <Text style={styles.saleCode}>{item.codigo}</Text>
          <Badge variant={item.tipo === 'mayor' ? 'warning' : 'success'} size="sm">
            {item.tipo === 'mayor' ? 'Mayor' : 'Menor'}
          </Badge>
        </View>
        <Text style={styles.saleClient}>{item.cliente?.nombre || 'Sin cliente'}</Text>
        <View style={styles.saleMeta}>
          <Text style={styles.saleDate}>{formatDate(item.fecha)}</Text>
          <Text style={styles.saleTime}>{formatTime(item.fecha)}</Text>
          <Text style={styles.saleItems}>{item.items.length} ítems</Text>
        </View>
      </View>
      <View style={styles.saleRight}>
        <Text style={styles.saleTotal}>{formatCurrency(item.total)}</Text>
        <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.textMuted} />
      </View>
    </TableRow>
  ), []);

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Historial de Ventas" onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())} />

      {toast && (
        <View style={[styles.toast, toast.type === 'error' ? styles.toastError : styles.toastSuccess]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filters}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={iconSize.sm} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Código, cliente, CI/NIT..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor={colors.textPlaceholder}
              onSubmitEditing={loadSales}
              returnKeyType="search"
            />
          </View>
        </View>
        <View style={styles.tipoRow}>
          {(['', 'menor', 'mayor'] as TipoFilter[]).map((tipo) => (
            <Pressable
              key={tipo}
              style={[styles.tipoBtn, tipoFilter === tipo && styles.tipoBtnActive]}
              onPress={() => setTipoFilter(tipo)}
            >
              <Text style={[styles.tipoBtnText, tipoFilter === tipo && styles.tipoBtnTextActive]}>
                {tipo === '' ? 'Todos' : tipo === 'menor' ? 'Menor' : 'Mayor'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Sales List */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Cargando ventas...</Text>
        </View>
      ) : sales.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={iconSize['2xl']} color={colors.textMuted} />
          <Text style={styles.emptyText}>No se encontraron ventas</Text>
        </View>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={item => String(item.id)}
          renderItem={renderSaleItem}
          contentContainerStyle={styles.list}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      )}

      {/* Detail Modal */}
      <Modal visible={selectedSale !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedSale && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedSale.codigo}</Text>
                  <Pressable onPress={() => setSelectedSale(null)}>
                    <Ionicons name="close" size={iconSize.lg} color={colors.textMuted} />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  {/* Info */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fecha</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedSale.fecha)} {formatTime(selectedSale.fecha)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tipo</Text>
                    <Badge variant={selectedSale.tipo === 'mayor' ? 'warning' : 'success'} size="sm">
                      {selectedSale.tipo === 'mayor' ? 'Venta por Mayor' : 'Venta al Detalle'}
                    </Badge>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Cliente</Text>
                    <Text style={styles.detailValue}>{selectedSale.cliente?.nombre || 'Sin cliente'}</Text>
                  </View>
                  {selectedSale.cliente?.ciNit && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>CI/NIT</Text>
                      <Text style={styles.detailValue}>{selectedSale.cliente.ciNit}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Vendedor</Text>
                    <Text style={styles.detailValue}>{selectedSale.usuario?.nombre || '—'}</Text>
                  </View>

                  {/* Products */}
                  <Text style={styles.sectionTitle}>Productos</Text>
                  {selectedSale.items.map((item: SaleDetail) => (
                    <View key={item.id} style={styles.productRow}>
                      <View style={styles.productInfo}>
                        <Text style={styles.productName}>{item.product?.producto || `Producto #${item.productId}`}</Text>
                        <Text style={styles.productDetail}>{item.cantidad} x {formatCurrency(item.precio)}</Text>
                      </View>
                      <Text style={styles.productSubtotal}>{formatCurrency(item.subtotal)}</Text>
                    </View>
                  ))}

                  {/* Total */}
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>{formatCurrency(selectedSale.total)}</Text>
                  </View>

                  {/* Payments */}
                  {selectedSale.pagos.length > 0 && (
                    <>
                      <Text style={styles.sectionTitle}>Pagos</Text>
                      {selectedSale.pagos.map((pago: PaymentDetail) => (
                        <View key={pago.id} style={styles.paymentRow}>
                          <Text style={styles.paymentMethod}>{pago.metodo}</Text>
                          <Text style={styles.paymentAmount}>{formatCurrency(pago.monto)}</Text>
                        </View>
                      ))}
                    </>
                  )}
                </ScrollView>

                <View style={styles.modalActions}>
                  <Pressable style={styles.modalBtn} onPress={() => handlePrintNota(selectedSale.id)} disabled={printing}>
                    {printing ? (
                      <ActivityIndicator color={colors.primary} size="small" />
                    ) : (
                      <>
                        <Ionicons name="print" size={iconSize.md} color={colors.primary} />
                        <Text style={styles.modalBtnText}>Imprimir Nota</Text>
                      </>
                    )}
                  </Pressable>
                  <Pressable style={[styles.modalBtn, styles.modalBtnClose]} onPress={() => setSelectedSale(null)}>
                    <Text style={styles.modalBtnCloseText}>Cerrar</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  filters: { padding: space.lg, gap: space.sm },
  searchRow: { flexDirection: 'row', gap: space.sm },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.md, gap: space.sm },
  searchInput: { flex: 1, height: 44, fontSize: fontSize.body, fontFamily: fontFamily.sans, color: colors.text },
  tipoRow: { flexDirection: 'row', gap: space.sm },
  tipoBtn: { flex: 1, paddingVertical: space.sm, alignItems: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  tipoBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tipoBtnText: { fontSize: fontSize.caption, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  tipoBtnTextActive: { color: colors.white },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  loadingText: { color: colors.textMuted, fontSize: fontSize.caption },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  emptyText: { color: colors.textMuted, fontSize: fontSize.body },
  list: { padding: space.lg, gap: space.sm },
  saleInfo: { flex: 1, minWidth: 0 },
  saleHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  saleCode: { fontSize: fontSize.body, fontFamily: fontFamily.monoBold, color: colors.text },
  saleClient: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted, marginTop: 2 },
  saleMeta: { flexDirection: 'row', gap: space.md, marginTop: space.xs },
  saleDate: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  saleTime: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  saleItems: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  saleRight: { alignItems: 'flex-end', gap: space.xs },
  saleTotal: { fontSize: fontSize.data, fontFamily: fontFamily.monoBold, color: colors.primary },
  toast: { marginHorizontal: space.lg, marginTop: space.md, padding: space.md, borderRadius: radius.md },
  toastSuccess: { backgroundColor: colors.successSoft, borderWidth: 1, borderColor: colors.success },
  toastError: { backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.danger },
  toastText: { fontSize: fontSize.body, fontFamily: fontFamily.sans, color: colors.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '85%', ...shadows.level3 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: space.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: fontSize.headline, fontFamily: fontFamily.sansBold, color: colors.text },
  modalScroll: { padding: space.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.sm },
  detailLabel: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  detailValue: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  sectionTitle: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.text, marginTop: space.lg, marginBottom: space.sm },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  productInfo: { flex: 1, minWidth: 0 },
  productName: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  productDetail: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  productSubtotal: { fontSize: fontSize.data, fontFamily: fontFamily.monoBold, color: colors.primary },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.md, borderTopWidth: 2, borderTopColor: colors.border, marginTop: space.sm },
  totalLabel: { fontSize: fontSize.headline, fontFamily: fontFamily.sansBold, color: colors.text },
  totalValue: { fontSize: fontSize.title, fontFamily: fontFamily.monoBold, color: colors.primary },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  paymentMethod: { fontSize: fontSize.body, fontFamily: fontFamily.sans, color: colors.text },
  paymentAmount: { fontSize: fontSize.data, fontFamily: fontFamily.monoMedium, color: colors.primary },
  modalActions: { flexDirection: 'row', gap: space.sm, padding: space.lg, borderTopWidth: 1, borderTopColor: colors.border },
  modalBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  modalBtnText: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.primary },
  modalBtnClose: { borderColor: colors.border, backgroundColor: colors.card },
  modalBtnCloseText: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.text },
});
