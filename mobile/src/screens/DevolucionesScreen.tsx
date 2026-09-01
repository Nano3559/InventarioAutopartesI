import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getProducts } from '../api/products';
import { getLocations } from '../api/locations';
import { getDevoluciones, createDevolucion, type Devolucion, type CreateDevolucionInput } from '../api/devoluciones';
import { getToken } from '../storage/token';
import {
  colors,
  space,
  radius,
  fontFamily,
  fontSize,
  lineHeight,
  componentStyles,
  opacity,
  shadows,
  iconSize,
  a11y,
  button,
} from '../theme';
import { Header, Badge, TableRow, TableCard, PrimaryCTA } from '../components';
import Ionicons from '@expo/vector-icons/Ionicons';

const MOTIVOS_DEVOLUCION = ['Defectuoso', 'Error de pedido', 'Cliente insatisfecho', 'Daño en transporte', 'Producto incorrecto', 'Otro'] as const;
const METODOS_REEMBOLSO = ['Efectivo', 'Transferencia', 'Nota de crédito', 'Tarjeta'] as const;

export default function DevolucionesScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [products, setProducts] = useState<Array<{ id: number; producto: string; marca: string; modelo: string; codigoFabrica: string }>>([]);
  const [locations, setLocations] = useState<Array<{ id: number; nombre: string; tipo: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState<CreateDevolucionInput>({
    productId: 0,
    motivo: '',
    cantidad: 1,
    monto: 0,
    metodo: 'Efectivo',
    locationId: undefined,
  });

  const [pickerVisible, setPickerVisible] = useState<'producto' | 'motivo' | 'metodo' | 'ubicacion' | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error('No hay sesión activa');
      const [devs, prods, locs] = await Promise.all([
        getDevoluciones(token),
        getProducts({}, token),
        getLocations(token),
      ]);
      setDevoluciones(devs);
      setProducts(prods);
      setLocations(locs.filter((l) => l.tipo === 'tienda' || l.tipo === 'almacen'));
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async () => {
    if (!formData.productId || !formData.motivo || formData.cantidad <= 0 || formData.monto <= 0) {
      showToast('Complete todos los campos requeridos', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('No hay sesión activa');
      await createDevolucion(formData, token);
      showToast('Devolución registrada correctamente');
      setFormVisible(false);
      setFormData({ productId: 0, motivo: '', cantidad: 1, monto: 0, metodo: 'Efectivo', locationId: undefined });
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Error al registrar devolución', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalDevueltos = devoluciones.reduce((sum, d) => sum + d.cantidad, 0);
  const totalMonto = devoluciones.reduce((sum, d) => sum + d.monto, 0);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Header title="Devoluciones" subtitle="Gestión de devoluciones de mercadería" onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())} />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[colors.primary]} />
          }
        >
          {/* Stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="refresh" size={iconSize.lg} color={colors.primary} />
              </View>
              <Text style={styles.statLabel}>Total Devoluciones</Text>
              <Text style={styles.statValue}>{devoluciones.length}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.successSoft }]}>
                <Ionicons name="cube" size={iconSize.lg} color={colors.success} />
              </View>
              <Text style={styles.statLabel}>Unidades Devueltas</Text>
              <Text style={styles.statValue}>{totalDevueltos} uds.</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.warningSoft }]}>
                <Ionicons name="cash" size={iconSize.lg} color={colors.warning} />
              </View>
              <Text style={styles.statLabel}>Monto Reembolsado</Text>
              <Text style={styles.statValue}>Bs {totalMonto.toFixed(2)}</Text>
            </View>
          </View>

          {/* Form */}
          <PrimaryCTA
            label={formVisible ? 'Ocultar Formulario' : 'Nueva Devolución'}
            iconName={formVisible ? 'remove-circle' : 'add-circle'}
            color={colors.primary}
            onPress={() => setFormVisible(!formVisible)}
            accessibilityLabel={formVisible ? 'Ocultar formulario de devolución' : 'Mostrar formulario de devolución'}
          />

          {formVisible && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Registrar Devolución</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Producto *</Text>
                <Pressable
                  style={[styles.pickerBtn, componentStyles.inputBase]}
                  onPress={() => { setPickerVisible('producto'); setPickerSearch(''); }}
                >
                  <Text style={formData.productId ? styles.pickerValue : styles.pickerPlaceholder}>
                    {products.find((p) => p.id === formData.productId)?.producto || 'Seleccionar producto...'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Motivo *</Text>
                <Pressable
                  style={[styles.pickerBtn, componentStyles.inputBase]}
                  onPress={() => setPickerVisible('motivo')}
                >
                  <Text style={formData.motivo ? styles.pickerValue : styles.pickerPlaceholder}>
                    {formData.motivo || 'Seleccionar motivo...'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.formRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Cantidad *</Text>
                  <TextInput
                    style={[styles.input, componentStyles.inputBase, { fontFamily: fontFamily.monoMedium }]}
                    value={String(formData.cantidad)}
                    onChangeText={(t) => setFormData({ ...formData, cantidad: parseInt(t) || 0 })}
                    keyboardType="numeric"
                    placeholder="1"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Monto (Bs) *</Text>
                  <TextInput
                    style={[styles.input, componentStyles.inputBase, { fontFamily: fontFamily.monoMedium }]}
                    value={String(formData.monto)}
                    onChangeText={(t) => setFormData({ ...formData, monto: parseFloat(t) || 0 })}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Método Reembolso *</Text>
                  <Pressable
                    style={[styles.pickerBtn, componentStyles.inputBase]}
                    onPress={() => setPickerVisible('metodo')}
                  >
                    <Text style={styles.pickerValue}>{formData.metodo}</Text>
                  </Pressable>
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Ubicación *</Text>
                  <Pressable
                    style={[styles.pickerBtn, componentStyles.inputBase]}
                    onPress={() => { setPickerVisible('ubicacion'); setPickerSearch(''); }}
                  >
                    <Text style={formData.locationId ? styles.pickerValue : styles.pickerPlaceholder}>
                      {locations.find((l) => l.id === formData.locationId)?.nombre || 'Seleccionar...'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.formActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setFormVisible(false)} accessibilityRole={a11y.button}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.submitBtn,
                    componentStyles.btnPrimary,
                    pressed && styles.btnPressed,
                    submitting && styles.btnDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={submitting}
                  accessibilityRole={a11y.button}
                  accessibilityState={{ busy: submitting }}
                >
                  {submitting ? (
                    <ActivityIndicator color={colors.textOnPrimary} size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Registrar</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {/* List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historial de Devoluciones</Text>
            {devoluciones.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="refresh" size={iconSize['2xl']} color={colors.textMuted} />
                <Text style={styles.emptyText}>No hay devoluciones registradas</Text>
                <Text style={styles.emptySubtext}>Las devoluciones aparecerán aquí</Text>
              </View>
            ) : (
              <TableCard>
                <FlatList
                  data={devoluciones}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => (
                    <TableRow
                      borderTop={item.id !== devoluciones[0].id}
                      accessibilityLabel={`Devolución ${item.id}, ${item.producto?.producto}, ${item.cantidad} unidades, Bs ${item.monto.toFixed(2)}`}
                    >
                      <View style={styles.itemMain}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemProduct}>{item.producto?.producto}</Text>
                          <Text style={styles.itemDetail}>
                            {item.producto?.marca} {item.producto?.modelo} · {item.producto?.codigoFabrica}
                          </Text>
                          <View style={styles.itemMeta}>
                            <Badge variant="info" size="sm">{item.motivo}</Badge>
                            <Badge variant="primary" size="sm">{item.metodo}</Badge>
                          </View>
                        </View>
                        <View style={styles.itemRight}>
                          <Text style={styles.itemQty}>x{item.cantidad}</Text>
                          <Text style={styles.itemMonto}>Bs {item.monto.toFixed(2)}</Text>
                          <Text style={styles.itemLocation}>{item.location?.nombre}</Text>
                          <Text style={styles.itemDate}>{new Date(item.fecha).toLocaleDateString()}</Text>
                        </View>
                      </View>
                    </TableRow>
                  )}
                  removeClippedSubviews
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  initialNumToRender={10}
                />
              </TableCard>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {toast && (
        <View style={[
          styles.toast,
          toast.type === 'success' ? styles.toastSuccess : styles.toastError,
        ]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      {/* Picker Modals */}
      <Modal visible={pickerVisible !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pickerVisible === 'producto' ? 'Seleccionar Producto' :
                 pickerVisible === 'motivo' ? 'Motivo de Devolución' :
                 pickerVisible === 'metodo' ? 'Método de Reembolso' :
                 'Ubicación'}
              </Text>
              <Pressable onPress={() => setPickerVisible(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            {pickerVisible === 'producto' && (
              <>
                <TextInput
                  style={[styles.modalSearch, componentStyles.inputBase]}
                  placeholder="Buscar producto..."
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                  placeholderTextColor={colors.textPlaceholder}
                  autoFocus
                />
                <FlatList
                  data={products.filter(p =>
                    !pickerSearch || p.producto.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                    p.marca.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                    p.codigoFabrica.toLowerCase().includes(pickerSearch.toLowerCase())
                  )}
                  keyExtractor={(item) => String(item.id)}
                  style={styles.modalList}
                  renderItem={({ item }) => (
                    <Pressable
                      style={[styles.modalItem, formData.productId === item.id && styles.modalItemActive]}
                      onPress={() => { setFormData({ ...formData, productId: item.id }); setPickerVisible(null); }}
                    >
                      <Text style={styles.modalItemText}>{item.producto}</Text>
                      <Text style={styles.modalItemSub}>{item.marca} · {item.codigoFabrica}</Text>
                    </Pressable>
                  )}
                />
              </>
            )}

            {pickerVisible === 'motivo' && (
              <View style={styles.modalOptions}>
                {MOTIVOS_DEVOLUCION.map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.modalOption, formData.motivo === m && styles.modalOptionActive]}
                    onPress={() => { setFormData({ ...formData, motivo: m }); setPickerVisible(null); }}
                  >
                    <Text style={[styles.modalOptionText, formData.motivo === m && styles.modalOptionTextActive]}>{m}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {pickerVisible === 'metodo' && (
              <View style={styles.modalOptions}>
                {METODOS_REEMBOLSO.map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.modalOption, formData.metodo === m && styles.modalOptionActive]}
                    onPress={() => { setFormData({ ...formData, metodo: m }); setPickerVisible(null); }}
                  >
                    <Text style={[styles.modalOptionText, formData.metodo === m && styles.modalOptionTextActive]}>{m}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {pickerVisible === 'ubicacion' && (
              <>
                <TextInput
                  style={[styles.modalSearch, componentStyles.inputBase]}
                  placeholder="Buscar ubicación..."
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                  placeholderTextColor={colors.textPlaceholder}
                  autoFocus
                />
                <FlatList
                  data={locations.filter(l =>
                    !pickerSearch || l.nombre.toLowerCase().includes(pickerSearch.toLowerCase())
                  )}
                  keyExtractor={(item) => String(item.id)}
                  style={styles.modalList}
                  renderItem={({ item }) => (
                    <Pressable
                      style={[styles.modalItem, formData.locationId === item.id && styles.modalItemActive]}
                      onPress={() => { setFormData({ ...formData, locationId: item.id }); setPickerVisible(null); }}
                    >
                      <Text style={styles.modalItemText}>{item.nombre}</Text>
                      <Text style={styles.modalItemSub}>{item.tipo}</Text>
                    </Pressable>
                  )}
                />
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
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.xl },
  statsGrid: {
    flexDirection: 'row',
    gap: space.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    alignItems: 'center',
    gap: space.xs,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted, textAlign: 'center' },
  statValue: { fontSize: fontSize.dataLg, fontFamily: fontFamily.monoBold, color: colors.text },
  formCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.md,
  },
  formTitle: { fontSize: fontSize.headline, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  inputGroup: { gap: space.xs },
  label: { fontSize: fontSize.captionStrong, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  input: { height: 44 },
  pickerHint: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  formRow: { flexDirection: 'row', gap: space.md },
  formActions: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
  cancelBtn: {
    flex: 1,
    height: button.height.lg,
    borderRadius: button.radius,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { color: colors.text, fontFamily: fontFamily.sansSemiBold, fontSize: fontSize.body },
  submitBtn: {
    flex: 1,
    height: button.height.lg,
    borderRadius: button.radius,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.level2,
  },
  btnPressed: { opacity: opacity.pressed },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: colors.textOnPrimary, fontFamily: fontFamily.sansSemiBold, fontSize: fontSize.body },
  section: { gap: space.sm },
  sectionTitle: { fontSize: fontSize.headline, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  emptyState: { padding: space.xl, alignItems: 'center', gap: space.md },
  emptyText: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  emptySubtext: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  itemMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemInfo: { flex: 1, minWidth: 0, gap: 2 },
  itemProduct: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  itemDetail: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  itemMeta: { flexDirection: 'row', gap: space.xs, marginTop: space.xs },
  itemRight: { alignItems: 'flex-end', gap: 2, paddingLeft: space.md, minWidth: 80 },
  itemQty: { fontSize: fontSize.data, fontFamily: fontFamily.monoMedium, color: colors.text },
  itemMonto: { fontSize: fontSize.data, fontFamily: fontFamily.monoBold, color: colors.primary },
  itemLocation: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  itemDate: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  toast: {
    position: 'absolute',
    bottom: space.xl,
    left: space.lg,
    right: space.lg,
    padding: space.md,
    borderRadius: radius.md,
    ...shadows.level3,
  },
  toastSuccess: { backgroundColor: colors.success, borderWidth: 1, borderColor: colors.success },
  toastError: { backgroundColor: colors.danger, borderWidth: 1, borderColor: colors.danger },
  toastText: { color: colors.white, fontSize: fontSize.body, fontFamily: fontFamily.sans, textAlign: 'center' },
  pickerBtn: {
    height: 44,
    justifyContent: 'center',
  },
  pickerValue: { fontSize: fontSize.body, fontFamily: fontFamily.sans, color: colors.text },
  pickerPlaceholder: { fontSize: fontSize.body, fontFamily: fontFamily.sans, color: colors.textPlaceholder },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.xl,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: { fontSize: fontSize.headline, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  modalClose: { fontSize: 20, color: colors.textMuted, padding: space.xs },
  modalSearch: { height: 44 },
  modalList: { maxHeight: 300 },
  modalItem: {
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalItemActive: { backgroundColor: colors.primarySoft },
  modalItemText: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  modalItemSub: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted, marginTop: 2 },
  modalOptions: { gap: space.xs },
  modalOption: {
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modalOptionText: { fontSize: fontSize.body, fontFamily: fontFamily.sans, color: colors.text },
  modalOptionTextActive: { color: colors.white },
});