import { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { getProductById, adjustStock, toggleActive, uploadProductImage, updateProduct } from '../api/products';
import { getLocations, type Location } from '../api/locations';
import { resolveImageUrl } from '../config';
import { Header, Badge } from '../components';
import {
  colors,
  space,
  radius,
  fontFamily,
  fontSize,
  shadows,
} from '../theme';
import type { Product } from '../types/product';
import type { RootStackParamList } from '../types/navigation';

type RouteParams = RouteProp<RootStackParamList, 'ProductDetail'>;

export default function ProductDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const { user, token } = useAuth();
  const productId = route.params?.productId;

  const [product, setProduct] = useState<Product | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add stock modal
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<number>(0);
  const [stockCantidad, setStockCantidad] = useState('1');
  const [stockModo, setStockModo] = useState<'sumar' | 'restar'>('sumar');
  const [savingStock, setSavingStock] = useState(false);

  // Image
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadData = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const [prod, locs] = await Promise.all([
        getProductById(productId, token ?? undefined),
        getLocations(token ?? undefined),
      ]);
      setProduct(prod);
      setLocations(locs);
      if (locs.length > 0) setSelectedLocationId(locs[0].id);
    } catch {
      setError('No se pudo cargar la información del producto');
    } finally {
      setLoading(false);
    }
  }, [productId, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddStock = async () => {
    if (!product || !selectedLocationId) return;
    const qty = parseInt(stockCantidad, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'La cantidad debe ser mayor a 0');
      return;
    }

    const currentStock = product.stockByLocation?.[selectedLocationId] ?? 0;
    const delta = stockModo === 'sumar' ? qty : -qty;

    if (stockModo === 'restar' && qty > currentStock) {
      Alert.alert('Error', `No puedes reducir más de lo que hay. Stock actual: ${currentStock}`);
      return;
    }

    try {
      setSavingStock(true);
      await adjustStock(product.id, selectedLocationId, delta, token ?? undefined);
      setStockModalVisible(false);
      setStockCantidad('1');
      setStockModo('sumar');
      await loadData();
      Alert.alert('Éxito', `Stock actualizado: ${stockModo === 'sumar' ? '+' : '-'}${qty} unidades`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo actualizar el stock');
    } finally {
      setSavingStock(false);
    }
  };

  const handleToggleActive = async () => {
    if (!product) return;
    try {
      await toggleActive(product.id, token ?? undefined);
      setProduct((prev) => prev ? { ...prev, activo: !prev.activo } : null);
      Alert.alert(
        'Éxito',
        product.activo ? 'Producto desactivado' : 'Producto activado',
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo cambiar el estado');
    }
  };

  const handlePickImage = async () => {
    if (!product) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para seleccionar una imagen.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    try {
      setUploadingImage(true);
      const res = await uploadProductImage(
        product.id,
        asset.uri,
        asset.fileName || 'image.jpg',
        asset.mimeType || 'image/jpeg',
        token ?? undefined,
      );
      if (res.imagen) {
        setProduct((prev) => prev ? { ...prev, imagen: resolveImageUrl(res.imagen) || res.imagen } : null);
        Alert.alert('Éxito', 'Imagen del producto actualizada');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleTakePhoto = async () => {
    if (!product) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para tomar una foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    try {
      setUploadingImage(true);
      const res = await uploadProductImage(
        product.id,
        asset.uri,
        asset.fileName || 'photo.jpg',
        asset.mimeType || 'image/jpeg',
        token ?? undefined,
      );
      if (res.imagen) {
        setProduct((prev) => prev ? { ...prev, imagen: resolveImageUrl(res.imagen) || res.imagen } : null);
        Alert.alert('Éxito', 'Imagen del producto actualizada');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Actualizar imagen', 'Elige una opción', [
      { text: 'Galería', onPress: handlePickImage },
      { text: 'Cámara', onPress: handleTakePhoto },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <Header title="Detalle" onMenuPress={() => navigation.goBack()} />
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.centerText}>Cargando producto...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={s.safe}>
        <Header title="Detalle" onMenuPress={() => navigation.goBack()} />
        <View style={s.center}>
          <Ionicons name="alert-circle" size={48} color={colors.danger} />
          <Text style={[s.centerText, { color: colors.danger }]}>{error || 'Producto no encontrado'}</Text>
          <Pressable style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backBtnText}>Volver</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const stockTotal = product.stockTotal ?? 0;
  const stockMinimo = product.stockMinimo ?? 1;
  const isOut = stockTotal === 0;
  const isLow = stockTotal > 0 && stockTotal <= stockMinimo;
  const stockByLoc = product.stockByLocation ?? {};

  const almacenes = locations.filter((l) => l.tipo === 'almacen');
  const tiendas = locations.filter((l) => l.tipo === 'tienda');

  return (
    <SafeAreaView style={s.safe}>
      <Header
        title={product.producto}
        subtitle={`${product.marca} ${product.modelo}`}
        onMenuPress={() => navigation.goBack()}
      />

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Imagen + Acciones */}
        <View style={s.imageSection}>
          <Pressable onPress={showImageOptions} style={s.imageBox}>
            {resolveImageUrl(product.imagen) ? (
              <Image source={{ uri: resolveImageUrl(product.imagen)! }} style={s.productImage} />
            ) : (
              <View style={s.imagePlaceholder}>
                <Ionicons name="image-outline" size={48} color={colors.textMuted} />
                <Text style={s.imagePlaceholderText}>Sin imagen</Text>
              </View>
            )}
            {uploadingImage && (
              <View style={s.imageOverlay}>
                <ActivityIndicator size="large" color={colors.white} />
              </View>
            )}
          </Pressable>
          <Pressable style={s.changeImageBtn} onPress={showImageOptions}>
            <Ionicons name="camera" size={18} color={colors.primary} />
            <Text style={s.changeImageBtnText}>Cambiar imagen</Text>
          </Pressable>
        </View>

        {/* Estado y Stock */}
        <View style={s.statusRow}>
          <Badge variant={isOut ? 'danger' : isLow ? 'warning' : 'success'} size="sm">
            {isOut ? 'Sin Stock' : `${stockTotal} uds.`}
          </Badge>
          <Badge variant={product.activo ? 'success' : 'danger'} size="sm">
            {product.activo ? 'Activo' : 'Inactivo'}
          </Badge>
        </View>

        {/* Info del producto */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Información</Text>
          <InfoRow label="Fabricante" value={product.fabricante} />
          <InfoRow label="Marca" value={product.marca} />
          <InfoRow label="Modelo" value={product.modelo} />
          {product.anio && <InfoRow label="Año" value={product.anio} />}
          {product.detalle && <InfoRow label="Detalle" value={product.detalle} />}
          <InfoRow label="Cód. Fábrica" value={product.codigoFabrica} mono />
          {product.codigoOem && <InfoRow label="Cód. OEM" value={product.codigoOem} mono />}
        </View>

        {/* Precios */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Precios (Bs.)</Text>
          <InfoRow label="Costo" value={`Bs. ${product.costo?.toFixed(2) || '0.00'}`} />
          <InfoRow label="Precio 1 (Mostrador)" value={`Bs. ${product.precio1?.toFixed(2) || '-'}`} />
          <InfoRow label="Precio 2 (Taller)" value={`Bs. ${product.precio2?.toFixed(2) || '-'}`} />
          <InfoRow label="Precio Mayorista" value={`Bs. ${product.precioMayor?.toFixed(2) || '-'}`} />
        </View>

        {/* Stock por ubicación */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Stock por Ubicación</Text>
          {almacenes.map((loc) => (
            <View key={loc.id} style={s.stockRow}>
              <Ionicons name="business" size={16} color={colors.emerald} />
              <Text style={s.stockLocName}>{loc.nombre}</Text>
              <Text style={[s.stockQty, (stockByLoc[loc.id] ?? 0) === 0 && { color: colors.danger }]}>
                {stockByLoc[loc.id] ?? 0} uds.
              </Text>
            </View>
          ))}
          {tiendas.map((loc) => (
            <View key={loc.id} style={s.stockRow}>
              <Ionicons name="storefront" size={16} color={colors.primary} />
              <Text style={s.stockLocName}>{loc.nombre}</Text>
              <Text style={[s.stockQty, (stockByLoc[loc.id] ?? 0) === 0 && { color: colors.danger }]}>
                {stockByLoc[loc.id] ?? 0} uds.
              </Text>
            </View>
          ))}
        </View>

        {/* Botones de acción */}
        <View style={s.actionsSection}>
          <Pressable
            style={({ pressed }) => [s.actionBtn, s.actionBtnPrimary, pressed && { opacity: 0.85 }]}
            onPress={() => setStockModalVisible(true)}
          >
            <Ionicons name="swap-vertical" size={22} color={colors.white} />
            <Text style={s.actionBtnText}>Ajustar Stock</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              s.actionBtn,
              product.activo ? s.actionBtnWarning : s.actionBtnSuccess,
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleToggleActive}
          >
            <Ionicons
              name={product.activo ? 'pause-circle' : 'play-circle'}
              size={22}
              color={colors.white}
            />
            <Text style={s.actionBtnText}>
              {product.activo ? 'Desactivar' : 'Activar'}
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modal de Ajustar Stock */}
      <Modal visible={stockModalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Ionicons name="swap-vertical" size={24} color={colors.primary} />
              <Text style={s.modalTitle}>Ajustar Stock</Text>
            </View>

            <Text style={s.modalProductName}>{product.producto}</Text>

            <Text style={s.modalLabel}>Ubicación</Text>
            <ScrollView style={s.locationList} nestedScrollEnabled>
              {locations.map((loc) => (
                <Pressable
                  key={loc.id}
                  style={[
                    s.locationOption,
                    selectedLocationId === loc.id && s.locationOptionSelected,
                  ]}
                  onPress={() => setSelectedLocationId(loc.id)}
                >
                  <Ionicons
                    name={loc.tipo === 'almacen' ? 'business' : 'storefront'}
                    size={18}
                    color={selectedLocationId === loc.id ? colors.white : colors.textMuted}
                  />
                  <View style={s.locationOptionInfo}>
                    <Text style={[s.locationOptionName, selectedLocationId === loc.id && { color: colors.white }]}>
                      {loc.nombre}
                    </Text>
                    <Text style={[s.locationOptionStock, selectedLocationId === loc.id && { color: 'rgba(255,255,255,0.8)' }]}>
                      Actual: {stockByLoc[loc.id] ?? 0} uds.
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={s.modalLabel}>Operación</Text>
            <View style={s.modoRow}>
              <Pressable
                style={[s.modoBtn, stockModo === 'sumar' && s.modoBtnSumar]}
                onPress={() => setStockModo('sumar')}
              >
                <Ionicons name="add" size={20} color={stockModo === 'sumar' ? colors.white : colors.textMuted} />
                <Text style={[s.modoBtnText, stockModo === 'sumar' && { color: colors.white }]}>Sumar</Text>
              </Pressable>
              <Pressable
                style={[s.modoBtn, stockModo === 'restar' && s.modoBtnRestar]}
                onPress={() => setStockModo('restar')}
              >
                <Ionicons name="remove" size={20} color={stockModo === 'restar' ? colors.white : colors.textMuted} />
                <Text style={[s.modoBtnText, stockModo === 'restar' && { color: colors.white }]}>Restar</Text>
              </Pressable>
            </View>

            <Text style={s.modalLabel}>Cantidad</Text>
            <TextInput
              style={s.stockInput}
              value={stockCantidad}
              onChangeText={setStockCantidad}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={colors.textPlaceholder}
            />

            {selectedLocationId > 0 && (
              <Text style={s.stockPreview}>
                Stock: {stockByLoc[selectedLocationId] ?? 0}{' '}
                <Text style={{ color: stockModo === 'sumar' ? colors.emerald : colors.danger, fontWeight: '700' }}>
                  {stockModo === 'sumar' ? `+ ${parseInt(stockCantidad, 10) || 0}` : `- ${parseInt(stockCantidad, 10) || 0}`}
                </Text>
                {' '}→ {Math.max(0, (stockByLoc[selectedLocationId] ?? 0) + (stockModo === 'sumar' ? 1 : -1) * (parseInt(stockCantidad, 10) || 0))} uds.
              </Text>
            )}

            <View style={s.modalActions}>
              <Pressable
                style={[s.modalBtn, s.modalBtnCancel]}
                onPress={() => {
                  setStockModalVisible(false);
                  setStockCantidad('1');
                  setStockModo('sumar');
                }}
              >
                <Text style={s.modalBtnCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[
                  s.modalBtn,
                  s.modalBtnConfirm,
                  savingStock && { opacity: 0.6 },
                  stockModo === 'restar' && { backgroundColor: colors.danger },
                ]}
                onPress={handleAddStock}
                disabled={savingStock}
              >
                {savingStock ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={s.modalBtnConfirmText}>
                    {stockModo === 'sumar' ? 'Sumar' : 'Restar'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, mono && { fontFamily: fontFamily.mono }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: space.lg, gap: space.xl },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.md, padding: space.xl },
  centerText: { color: colors.textMuted, fontSize: fontSize.body, fontFamily: fontFamily.sans },

  backBtn: {
    marginTop: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  backBtnText: { color: colors.white, fontFamily: fontFamily.sansBold, fontSize: fontSize.body },

  // Image
  imageSection: { alignItems: 'center', gap: space.sm },
  imageBox: {
    width: 200,
    height: 200,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.level2,
  },
  productImage: { width: '100%', height: '100%' },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.xs,
  },
  imagePlaceholderText: { color: colors.textMuted, fontSize: fontSize.caption, fontFamily: fontFamily.sans },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
  },
  changeImageBtnText: { color: colors.primary, fontSize: fontSize.caption, fontFamily: fontFamily.sansSemiBold },

  // Status
  statusRow: { flexDirection: 'row', gap: space.sm, justifyContent: 'center' },

  // Cards
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.sm,
    ...shadows.level1,
  },
  cardTitle: {
    fontSize: fontSize.headline,
    fontFamily: fontFamily.sansBold,
    color: colors.text,
    marginBottom: space.xs,
  },

  // Info
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { color: colors.textMuted, fontSize: fontSize.caption, fontFamily: fontFamily.sans },
  infoValue: { color: colors.text, fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, flex: 1, textAlign: 'right' },

  // Stock
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stockLocName: { flex: 1, color: colors.text, fontSize: fontSize.body, fontFamily: fontFamily.sans },
  stockQty: { color: colors.text, fontSize: fontSize.body, fontFamily: fontFamily.sansBold },

  // Actions
  actionsSection: { gap: space.md },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: 14,
    borderRadius: radius.md,
    ...shadows.level1,
  },
  actionBtnPrimary: { backgroundColor: colors.emerald },
  actionBtnWarning: { backgroundColor: colors.warning },
  actionBtnSuccess: { backgroundColor: colors.emerald },
  actionBtnText: { color: colors.white, fontSize: fontSize.bodyStrong, fontFamily: fontFamily.sansBold },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.xl,
    gap: space.md,
    maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  modalTitle: { fontSize: fontSize.title, fontFamily: fontFamily.sansBold, color: colors.text },
  modalProductName: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.textMuted },
  modalLabel: { fontSize: fontSize.caption, fontFamily: fontFamily.sansBold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  locationList: { maxHeight: 200 },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.xs,
  },
  locationOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  locationOptionInfo: { flex: 1 },
  locationOptionName: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  locationOptionStock: { fontSize: fontSize.caption, color: colors.textMuted },

  stockInput: {
    height: 48,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.lg,
    fontSize: fontSize.dataLg,
    fontFamily: fontFamily.sansBold,
    color: colors.text,
  },
  stockPreview: { fontSize: fontSize.caption, color: colors.textMuted, fontFamily: fontFamily.sans },

  modoRow: { flexDirection: 'row', gap: space.sm },
  modoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingVertical: 12,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  modoBtnSumar: { backgroundColor: colors.emerald, borderColor: colors.emerald },
  modoBtnRestar: { backgroundColor: colors.danger, borderColor: colors.danger },
  modoBtnText: { fontSize: fontSize.body, fontFamily: fontFamily.sansBold, color: colors.textMuted },

  modalActions: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  modalBtnCancel: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  modalBtnCancelText: { color: colors.text, fontFamily: fontFamily.sansSemiBold, fontSize: fontSize.body },
  modalBtnConfirm: { backgroundColor: colors.emerald },
  modalBtnConfirmText: { color: colors.white, fontFamily: fontFamily.sansBold, fontSize: fontSize.body },
});
