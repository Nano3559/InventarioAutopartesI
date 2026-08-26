import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
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
import { useAuth } from '../context/AuthContext';
import { getProducts } from '../api/products';
import { getAlmacenes } from '../api/locations';
import { getSolicitudes, createSolicitud, updateSolicitudEstado, type Solicitud, type CreateSolicitudInput } from '../api/solicitudes';
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

const ESTADOS_SOLICITUD = ['Pendiente', 'En preparación', 'Enviado', 'Recibido', 'Cancelado'] as const;

const ESTADO_BADGE: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'primary' | 'info'> = {
  Pendiente: 'warning',
  'En preparación': 'primary',
  Enviado: 'info',
  Recibido: 'success',
  Cancelado: 'danger',
};

export default function SolicitudesScreen() {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterEstado, setFilterEstado] = useState<string>('');
  const [formVisible, setFormVisible] = useState(false);
  const [products, setProducts] = useState<Array<{ id: number; producto: string; marca: string; modelo: string; codigoFabrica: string }>>([]);
  const [almacenes, setAlmacenes] = useState<Array<{ id: number; nombre: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [estadoModal, setEstadoModal] = useState<{ solicitud: Solicitud; origenId?: number } | null>(null);

  const [formData, setFormData] = useState<CreateSolicitudInput>({
    productId: 0,
    cantidad: 1,
    tiendaId: undefined,
  });

  const isTienda = user?.rol === 'tienda';
  const isAdminOrInventario = ['admin', 'inventario'].includes(user?.rol || '');

  const loadData = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error('No hay sesión activa');
      const [sols, prods, alms] = await Promise.all([
        getSolicitudes(token),
        getProducts({}, token),
        getAlmacenes(token),
      ]);
      setSolicitudes(sols);
      setProducts(prods);
      setAlmacenes(alms);
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
    if (!formData.productId || formData.cantidad <= 0) {
      showToast('Complete todos los campos requeridos', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('No hay sesión activa');
      await createSolicitud(formData, token);
      showToast('Solicitud creada correctamente');
      setFormVisible(false);
      setFormData({ productId: 0, cantidad: 1, tiendaId: user?.tiendaId ?? undefined });
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Error al crear solicitud', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateEstado = async (estado: 'Pendiente' | 'En preparación' | 'Enviado' | 'Recibido' | 'Cancelado', origenId?: number) => {
    if (!estadoModal) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('No hay sesión activa');
      await updateSolicitudEstado(estadoModal.solicitud.id, { estado, origenId }, token);
      showToast(`Estado actualizado a ${estado}`);
      setEstadoModal(null);
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Error al actualizar estado', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSolicitudes = solicitudes.filter((s) =>
    filterEstado ? s.estado === filterEstado : true
  );

  const pendingCount = solicitudes.filter((s) => s.estado === 'Pendiente').length;
  const preparandoCount = solicitudes.filter((s) => s.estado === 'En preparación').length;
  const enviadasCount = solicitudes.filter((s) => s.estado === 'Enviado').length;

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
        <Header
          title="Solicitudes a Almacén"
          subtitle={isTienda ? 'Mis solicitudes' : 'Gestión de solicitudes'}
        />

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
              <View style={[styles.statIcon, { backgroundColor: colors.warningSoft }]}>
                <Ionicons name="time" size={iconSize.lg} color={colors.warning} />
              </View>
              <Text style={styles.statLabel}>Pendientes</Text>
              <Text style={styles.statValue}>{pendingCount}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="cube" size={iconSize.lg} color={colors.primary} />
              </View>
              <Text style={styles.statLabel}>En Preparación</Text>
              <Text style={styles.statValue}>{preparandoCount}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.blueSoft }]}>
                <Ionicons name="car-sport" size={iconSize.lg} color={colors.blue} />
              </View>
              <Text style={styles.statLabel}>Enviadas</Text>
              <Text style={styles.statValue}>{enviadasCount}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.successSoft }]}>
                <Ionicons name="clipboard" size={iconSize.lg} color={colors.success} />
              </View>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue}>{solicitudes.length}</Text>
            </View>
          </View>

          {/* Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Filtrar por estado</Text>
            <View style={styles.filterChips}>
              <Pressable
                style={[
                  styles.filterChip,
                  !filterEstado && styles.filterChipActive,
                ]}
                onPress={() => setFilterEstado('')}
                accessibilityRole={a11y.button}
                accessibilityState={{ selected: !filterEstado }}
              >
                <Text style={[
                  styles.filterChipText,
                  !filterEstado && styles.filterChipTextActive,
                ]}>Todos</Text>
              </Pressable>
              {ESTADOS_SOLICITUD.map((estado) => (
                <Pressable
                  key={estado}
                  style={[
                    styles.filterChip,
                    filterEstado === estado && styles.filterChipActive,
                  ]}
                  onPress={() => setFilterEstado(estado)}
                  accessibilityRole={a11y.button}
                  accessibilityState={{ selected: filterEstado === estado }}
                >
                  <Text style={[
                    styles.filterChipText,
                    filterEstado === estado && styles.filterChipTextActive,
                  ]}>{estado}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Form for tienda users */}
          {isTienda && (
            <>
              <PrimaryCTA
                label={formVisible ? 'Ocultar Formulario' : 'Nueva Solicitud'}
                iconName={formVisible ? 'remove-circle' : 'add-circle'}
                color={colors.primary}
                onPress={() => setFormVisible(!formVisible)}
                accessibilityLabel={formVisible ? 'Ocultar formulario de solicitud' : 'Mostrar formulario de solicitud'}
              />

              {formVisible && (
                <View style={styles.formCard}>
                  <Text style={styles.formTitle}>Nueva Solicitud a Almacén</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Producto *</Text>
                    <TextInput
                      style={[styles.input, componentStyles.inputBase]}
                      placeholder="Seleccionar producto..."
                      editable={false}
                      value={products.find((p) => p.id === formData.productId)?.producto || ''}
                    />
                    <Text style={styles.pickerHint}>Toca para seleccionar</Text>
                  </View>

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

                  {!isTienda && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Tienda *</Text>
                      <TextInput
                        style={[styles.input, componentStyles.inputBase]}
                        placeholder="Seleccionar tienda..."
                        editable={false}
                        value={formData.tiendaId ? `Tienda ${formData.tiendaId}` : ''}
                      />
                    </View>
                  )}

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
                        <Text style={styles.submitBtnText}>Crear Solicitud</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}
            </>
          )}

          {/* List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Solicitudes</Text>
            {filteredSolicitudes.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="clipboard" size={iconSize['2xl']} color={colors.textMuted} />
                <Text style={styles.emptyText}>
                  {filterEstado ? `No hay solicitudes "${filterEstado}"` : 'No hay solicitudes registradas'}
                </Text>
              </View>
            ) : (
              <TableCard>
                <FlatList
                  data={filteredSolicitudes}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => (
                    <TableRow
                      borderTop={item.id !== filteredSolicitudes[0].id}
                      accessibilityLabel={`Solicitud ${item.id}, ${item.producto?.producto}, ${item.cantidad} unidades, ${item.estado}`}
                    >
                      <View style={styles.itemMain}>
                        <View style={styles.itemInfo}>
                          <View style={styles.itemHeader}>
                            <Badge variant={ESTADO_BADGE[item.estado] || 'default'} size="sm" dot />
                            <Text style={styles.itemProduct}>{item.producto?.producto}</Text>
                            {item.auto && <Badge variant="primary" size="sm">AUTO</Badge>}
                          </View>
                          <Text style={styles.itemDetail}>
                            {item.producto?.marca} {item.producto?.modelo} · {item.producto?.codigoFabrica}
                          </Text>
                          <View style={styles.itemMeta}>
                            <Text style={styles.itemMetaText}>{item.tienda?.nombre}</Text>
                            <Text style={styles.itemMetaText}>x{item.cantidad}</Text>
                            <Text style={styles.itemMetaText}>{new Date(item.fecha).toLocaleDateString()}</Text>
                          </View>
                        </View>
                        <View style={styles.itemRight}>
                          <Text style={styles.itemOrigen}>
                            {item.origen?.nombre || item.origenId ? 'Asignado' : '—'}
                          </Text>
                          <Badge variant={ESTADO_BADGE[item.estado] || 'default'} size="md">
                            {item.estado}
                          </Badge>
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

      {/* Estado Modal */}
      {estadoModal && (
        <Pressable style={styles.modalOverlay} onPress={() => setEstadoModal(null)} accessibilityRole={a11y.button}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cambiar Estado</Text>
              <Pressable onPress={() => setEstadoModal(null)} accessibilityRole={a11y.button} hitSlop={16}>
                <Ionicons name="close" size={iconSize.lg} color={colors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalProduct}>{estadoModal.solicitud.producto?.producto}</Text>
              <Text style={styles.modalMeta}>{estadoModal.solicitud.tienda?.nombre} · x{estadoModal.solicitud.cantidad}</Text>
              <View style={styles.modalEstadoRow}>
                <Text style={styles.modalEstadoLabel}>Estado actual:</Text>
                <Badge variant={ESTADO_BADGE[estadoModal.solicitud.estado] || 'default'} size="md">
                  {estadoModal.solicitud.estado}
                </Badge>
              </View>

              {estadoModal.solicitud.estado === 'Pendiente' && (
                <Pressable
                  style={({ pressed }) => [
                    styles.modalActionBtn,
                    componentStyles.btnPrimary,
                    pressed && styles.btnPressed,
                  ]}
                  onPress={() => handleUpdateEstado('En preparación')}
                  disabled={submitting}
                  accessibilityRole={a11y.button}
                >
                  <Ionicons name="cube" size={iconSize.md} color={colors.textOnPrimary} style={styles.modalBtnIcon} />
                  <Text style={styles.modalBtnText}>Iniciar Preparación</Text>
                </Pressable>
              )}

              {estadoModal.solicitud.estado === 'En preparación' && (
                <>
                  <View style={styles.modalAlmacenPicker}>
                    <Text style={styles.modalLabel}>Almacén de Origen *</Text>
                    <TextInput
                      style={[styles.input, componentStyles.inputBase]}
                      placeholder="Seleccionar almacén..."
                      editable={false}
                      value={almacenes.find((a) => a.id === estadoModal.origenId)?.nombre || ''}
                    />
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.modalActionBtn,
                      componentStyles.btnPrimary,
                      pressed && styles.btnPressed,
                      !estadoModal.origenId && styles.btnDisabled,
                    ]}
                    onPress={() => handleUpdateEstado('Enviado', estadoModal.origenId)}
                    disabled={submitting || !estadoModal.origenId}
                    accessibilityRole={a11y.button}
                  >
                    <Ionicons name="car-sport" size={iconSize.md} color={colors.textOnPrimary} style={styles.modalBtnIcon} />
                    <Text style={styles.modalBtnText}>Marcar como Enviado</Text>
                  </Pressable>
                </>
              )}

              {estadoModal.solicitud.estado === 'Enviado' && (
                <Pressable
                  style={({ pressed }) => [
                    styles.modalActionBtn,
                    { ...componentStyles.btnPrimary, backgroundColor: colors.success },
                    pressed && styles.btnPressed,
                  ]}
                  onPress={() => handleUpdateEstado('Recibido')}
                  disabled={submitting}
                  accessibilityRole={a11y.button}
                >
                  <Ionicons name="checkmark-circle" size={iconSize.md} color={colors.textOnPrimary} style={styles.modalBtnIcon} />
                  <Text style={styles.modalBtnText}>Marcar como Recibido</Text>
                </Pressable>
              )}

              {['Pendiente', 'En preparación'].includes(estadoModal.solicitud.estado) && (
                <Pressable
                  style={({ pressed }) => [
                    styles.modalActionBtn,
                    { ...componentStyles.btnPrimary, backgroundColor: colors.danger },
                    pressed && styles.btnPressed,
                  ]}
                  onPress={() => handleUpdateEstado('Cancelado')}
                  disabled={submitting}
                  accessibilityRole={a11y.button}
                >
                  <Ionicons name="close-circle" size={iconSize.md} color={colors.textOnPrimary} style={styles.modalBtnIcon} />
                  <Text style={styles.modalBtnText}>Cancelar Solicitud</Text>
                </Pressable>
              )}
            </View>
          </View>
        </Pressable>
      )}

      {toast && (
        <View style={[
          styles.toast,
          toast.type === 'success' ? styles.toastSuccess : styles.toastError,
        ]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}
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
    flexWrap: 'wrap',
    gap: space.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
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
  filterSection: { gap: space.sm },
  filterTitle: { fontSize: fontSize.captionStrong, fontFamily: fontFamily.sansSemiBold, color: colors.textMuted },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  filterChip: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: { fontSize: fontSize.caption, fontFamily: fontFamily.sansMedium, color: colors.text },
  filterChipTextActive: { color: colors.textOnPrimary },
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
  itemMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemInfo: { flex: 1, minWidth: 0, gap: 2 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  itemProduct: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  itemDetail: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  itemMeta: { flexDirection: 'row', gap: space.sm, marginTop: space.xs, flexWrap: 'wrap' },
  itemMetaText: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  itemRight: { alignItems: 'flex-end', gap: space.sm, paddingLeft: space.md, minWidth: 80 },
  itemOrigen: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.lg,
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    ...shadows.level3,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md },
  modalTitle: { fontSize: fontSize.title, fontFamily: fontFamily.sansBold, color: colors.text },
  modalBody: { gap: space.md },
  modalProduct: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.text, textAlign: 'center' },
  modalMeta: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted, textAlign: 'center' },
  modalEstadoRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  modalEstadoLabel: { fontSize: fontSize.captionStrong, fontFamily: fontFamily.sansSemiBold, color: colors.textMuted },
  modalAlmacenPicker: { marginTop: space.sm },
  modalLabel: { fontSize: fontSize.captionStrong, fontFamily: fontFamily.sansSemiBold, color: colors.text, marginBottom: space.xs },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    height: button.height.lg,
    borderRadius: button.radius,
    ...shadows.level2,
  },
  modalBtnIcon: { marginTop: 1 },
  modalBtnText: { color: colors.textOnPrimary, fontFamily: fontFamily.sansSemiBold, fontSize: fontSize.body },
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
});