import { useCallback, useEffect, useMemo, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getProducts } from '../api/products';
import {
  createSale,
  importExcel,
  previewExcel,
  type SaleItem,
  type WholesalePreviewResult,
} from '../api/sales';
import { getToken } from '../storage/token';
import { colors, componentStyles, fontFamily, fontSize, iconSize, radius, shadows, space } from '../theme';
import { Header, Badge, PrimaryCTA, TableCard, TableRow } from '../components';
import Ionicons from '@expo/vector-icons/Ionicons';

type Mode = 'manual' | 'excel';
type Product = { id: number; producto: string; marca: string; modelo: string; codigoFabrica: string; codigoOem?: string; precioMayor?: number; precio1?: number; costo?: number; stockTotal?: number };
type Payment = { metodo: string; monto: number };
type PickedFile = { uri: string; name: string; type: string };

const paymentMethods = ['Efectivo', 'QR', 'Transferencia', 'Crédito'];

export default function VentaMayorScreen() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('manual');
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([{ metodo: 'Efectivo', monto: 0 }]);
  const [clientName, setClientName] = useState('');
  const [clientCiNit, setClientCiNit] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [deliveryPlace, setDeliveryPlace] = useState('');
  const [forWhom, setForWhom] = useState('');
  const [requiresInvoice, setRequiresInvoice] = useState(false);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [preview, setPreview] = useState<WholesalePreviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<number | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      const token = await getToken();
      setProducts(await getProducts({}, token ?? undefined));
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo cargar el catálogo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => [product.producto, product.marca, product.modelo, product.codigoFabrica, product.codigoOem].some((value) => value?.toLowerCase().includes(query)));
  }, [products, search]);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.cantidad * item.precio, 0), [cart]);
  const previewTotal = preview?.total ?? 0;
  const activeTotal = mode === 'manual' ? total : previewTotal;
  const paid = payments.reduce((sum, payment) => sum + payment.monto, 0);
  const hasPaymentMismatch = Math.abs(paid - activeTotal) > 0.01;
  const hasStockError = cart.some((item) => item.cantidad > (products.find((product) => product.id === item.productId)?.stockTotal ?? 0));

  function addProduct(product: Product) {
    const available = product.stockTotal ?? 0;
    if (available < 1) {
      Alert.alert('Sin stock', `${product.producto} no tiene stock disponible.`);
      return;
    }
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.cantidad >= available) return current;
        return current.map((item) => item.productId === product.id ? { ...item, cantidad: item.cantidad + 1 } : item);
      }
      return [...current, { productId: product.id, cantidad: 1, precio: product.precioMayor ?? product.precio1 ?? product.costo ?? 0 }];
    });
  }

  function changeQuantity(productId: number, delta: number) {
    setCart((current) => current.flatMap((item) => {
      if (item.productId !== productId) return [item];
      const available = products.find((product) => product.id === productId)?.stockTotal ?? 0;
      const quantity = Math.min(available, item.cantidad + delta);
      return quantity > 0 ? [{ ...item, cantidad: quantity }] : [];
    }));
  }

  function setQuickPayment(method: string) {
    setPayments([{ metodo: method, monto: activeTotal }]);
  }

  async function pickExcel() {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'], copyToCacheDirectory: true });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setFile({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream' });
      setPreview(null);
    }
  }

  async function handlePreview() {
    if (!file) return;
    setWorking(true);
    try {
      const token = await getToken();
      setPreview(await previewExcel(file, token ?? ''));
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo procesar el archivo');
    } finally {
      setWorking(false);
    }
  }

  async function submitSale() {
    if (mode === 'manual' && (cart.length === 0 || hasStockError)) {
      Alert.alert('Venta incompleta', 'Agrega productos válidos y verifica el stock.');
      return;
    }
    if (mode === 'excel' && (!file || !preview?.ok || preview.items.length === 0)) {
      Alert.alert('Archivo incompleto', 'Selecciona un archivo válido y genera su vista previa.');
      return;
    }
    if (hasPaymentMismatch) {
      Alert.alert('Pagos incompletos', `El total pagado debe coincidir con Bs ${activeTotal.toFixed(2)}.`);
      return;
    }
    setWorking(true);
    try {
      const token = await getToken();
      const client = clientName ? { nombre: clientName, ciNit: clientCiNit || undefined, celular: clientPhone || undefined } : undefined;
      const meta = { cliente: client, requiereFactura: requiresInvoice, lugarEntrega: deliveryPlace || undefined, paraQuien: forWhom || undefined, locationId: user?.tiendaId ?? undefined, pagos: payments };
      const sale = mode === 'manual' ? await createSale({ tipo: 'mayor', items: cart, ...meta }, token ?? '') : await importExcel(file!, meta, token ?? '');
      setLastSaleId(sale.id);
      setCart([]);
      setFile(null);
      setPreview(null);
      setPayments([{ metodo: 'Efectivo', monto: 0 }]);
      Alert.alert('Venta registrada', `${sale.codigo} fue registrada correctamente.`);
    } catch (error) {
      Alert.alert('No se pudo registrar', error instanceof Error ? error.message : 'Intenta nuevamente');
    } finally {
      setWorking(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Venta por Mayor" subtitle="Pedido manual o importación Excel" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.modeRow}>
          <Pressable style={[styles.modeButton, mode === 'manual' && styles.modeActive]} onPress={() => setMode('manual')}><Ionicons name="cart" size={iconSize.md} color={mode === 'manual' ? colors.white : colors.primary} /><Text style={[styles.modeText, mode === 'manual' && styles.modeTextActive]}>Manual</Text></Pressable>
          <Pressable style={[styles.modeButton, mode === 'excel' && styles.modeActive]} onPress={() => setMode('excel')}><Ionicons name="document-text" size={iconSize.md} color={mode === 'excel' ? colors.white : colors.primary} /><Text style={[styles.modeText, mode === 'excel' && styles.modeTextActive]}>Excel</Text></Pressable>
        </View>

        {mode === 'manual' ? (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Agregar productos</Text>
            <TextInput style={componentStyles.inputBase} value={search} onChangeText={setSearch} placeholder="Nombre, marca, OEM o código fábrica" placeholderTextColor={colors.textPlaceholder} />
            {loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : filteredProducts.slice(0, 12).map((product) => (
              <Pressable key={product.id} style={styles.productRow} onPress={() => addProduct(product)}>
                <View style={styles.flex}><Text style={styles.productName}>{product.producto}</Text><Text style={styles.muted}>{product.marca} {product.modelo} · {product.codigoFabrica}</Text></View><Badge variant={(product.stockTotal ?? 0) > 0 ? 'success' : 'danger'} size="sm">{product.stockTotal ?? 0}</Badge><Ionicons name="add-circle" size={iconSize.lg} color={colors.primary} />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Importar pedido Excel</Text>
            <Pressable style={styles.uploadButton} onPress={pickExcel}><Ionicons name="cloud-upload" size={iconSize.xl} color={colors.primary} /><Text style={styles.uploadText}>{file ? file.name : 'Seleccionar .xlsx, .xls o .csv'}</Text></Pressable>
            <PrimaryCTA label="Generar vista previa" iconName="eye" color={colors.primary} onPress={handlePreview} accessibilityLabel="Generar vista previa del Excel" />
            {preview && <View style={styles.previewBox}><Text style={styles.sectionTitle}>{preview.ok ? 'Archivo válido' : 'Archivo con errores'}</Text>{preview.errors.map((message) => <Text key={message} style={styles.errorText}>{message}</Text>)}{preview.items.map((item) => <Text key={`${item.productId}-${item.codigoFabrica}`} style={styles.muted}>{item.producto} · {item.cantidad} x Bs {item.precio.toFixed(2)}</Text>)}<Text style={styles.total}>Total: Bs {preview.total.toFixed(2)}</Text></View>}
          </View>
        )}

        {mode === 'manual' && <View style={styles.panel}><Text style={styles.sectionTitle}>Pedido ({cart.length} productos)</Text>{cart.length === 0 ? <Text style={styles.muted}>Todavía no agregaste productos.</Text> : <TableCard>{cart.map((item, index) => { const product = products.find((candidate) => candidate.id === item.productId); return <TableRow key={item.productId} borderTop={index > 0}><View style={styles.flex}><Text style={styles.productName}>{product?.producto ?? `Producto #${item.productId}`}</Text><Text style={styles.muted}>Bs {item.precio.toFixed(2)} · Subtotal Bs {(item.precio * item.cantidad).toFixed(2)}</Text></View><Pressable onPress={() => changeQuantity(item.productId, -1)}><Ionicons name="remove-circle-outline" size={iconSize.lg} color={colors.primary} /></Pressable><Text style={styles.quantity}>{item.cantidad}</Text><Pressable onPress={() => changeQuantity(item.productId, 1)}><Ionicons name="add-circle-outline" size={iconSize.lg} color={colors.primary} /></Pressable></TableRow>; })}</TableCard>}<Text style={styles.total}>Total: Bs {total.toFixed(2)}</Text></View>}

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Cliente y entrega</Text>
          <TextInput style={componentStyles.inputBase} value={clientName} onChangeText={setClientName} placeholder="Nombre del cliente" placeholderTextColor={colors.textPlaceholder} />
          <TextInput style={componentStyles.inputBase} value={clientCiNit} onChangeText={setClientCiNit} placeholder="CI/NIT" placeholderTextColor={colors.textPlaceholder} />
          <TextInput style={componentStyles.inputBase} value={clientPhone} onChangeText={setClientPhone} placeholder="Celular" placeholderTextColor={colors.textPlaceholder} keyboardType="phone-pad" />
          <TextInput style={componentStyles.inputBase} value={forWhom} onChangeText={setForWhom} placeholder="Para quién es el pedido" placeholderTextColor={colors.textPlaceholder} />
          <TextInput style={componentStyles.inputBase} value={deliveryPlace} onChangeText={setDeliveryPlace} placeholder="Lugar de entrega" placeholderTextColor={colors.textPlaceholder} />
          <Pressable style={styles.checkRow} onPress={() => setRequiresInvoice(!requiresInvoice)}><Ionicons name={requiresInvoice ? 'checkbox' : 'square-outline'} size={iconSize.lg} color={colors.primary} /><Text style={styles.muted}>Requiere factura</Text></Pressable>
        </View>

        <View style={styles.panel}><Text style={styles.sectionTitle}>Pagos</Text><View style={styles.quickPayments}>{paymentMethods.map((method) => <Pressable key={method} style={styles.quickPayment} onPress={() => setQuickPayment(method)}><Text style={styles.muted}>{method}</Text></Pressable>)}</View>{payments.map((payment, index) => <View key={index} style={styles.paymentRow}><TextInput style={[componentStyles.inputBase, styles.paymentMethod]} value={payment.metodo} onChangeText={(value) => setPayments((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, metodo: value } : entry))} /><TextInput style={[componentStyles.inputBase, styles.paymentAmount]} value={String(payment.monto || '')} onChangeText={(value) => setPayments((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, monto: Number(value) || 0 } : entry))} keyboardType="decimal-pad" placeholder="Monto" placeholderTextColor={colors.textPlaceholder} /></View>)}<Text style={[styles.muted, hasPaymentMismatch && styles.errorText]}>Pagado: Bs {paid.toFixed(2)} · Falta: Bs {Math.max(0, activeTotal - paid).toFixed(2)}</Text></View>

        {working ? <ActivityIndicator color={colors.primary} size="large" /> : <PrimaryCTA label="Confirmar venta por mayor" iconName="checkmark-circle" color={colors.success} onPress={submitSale} accessibilityLabel="Confirmar venta por mayor" />}
        {lastSaleId && <Text style={styles.successText}>Venta #{lastSaleId} confirmada. Puedes generar su nota desde ventas.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.lg },
  panel: { backgroundColor: colors.card, borderRadius: radius.md, padding: space.lg, gap: space.md, ...shadows.level1 },
  modeRow: { flexDirection: 'row', gap: space.sm },
  modeButton: { flex: 1, minHeight: 48, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: space.sm },
  modeActive: { backgroundColor: colors.primary },
  modeText: { color: colors.primary, fontFamily: fontFamily.sansSemiBold, fontSize: fontSize.body },
  modeTextActive: { color: colors.white },
  sectionTitle: { color: colors.text, fontFamily: fontFamily.sansSemiBold, fontSize: fontSize.headline },
  productRow: { minHeight: 58, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  productName: { color: colors.text, fontFamily: fontFamily.sansSemiBold, fontSize: fontSize.body },
  muted: { color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.caption },
  flex: { flex: 1, minWidth: 0 },
  loader: { padding: space.lg },
  uploadButton: { minHeight: 100, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', gap: space.sm, padding: space.lg },
  uploadText: { color: colors.text, fontFamily: fontFamily.sansMedium, textAlign: 'center' },
  previewBox: { backgroundColor: colors.primarySoft, padding: space.md, borderRadius: radius.sm, gap: space.xs },
  errorText: { color: colors.danger, fontFamily: fontFamily.sans, fontSize: fontSize.caption },
  total: { color: colors.text, fontFamily: fontFamily.sansBold, fontSize: fontSize.title, textAlign: 'right' },
  quantity: { color: colors.text, fontFamily: fontFamily.sansSemiBold, minWidth: 24, textAlign: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  quickPayments: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  quickPayment: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.sm, padding: space.sm },
  paymentRow: { flexDirection: 'row', gap: space.sm },
  paymentMethod: { flex: 1 },
  paymentAmount: { width: 120 },
  successText: { color: colors.success, fontFamily: fontFamily.sansMedium, textAlign: 'center' },
});
