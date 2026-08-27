import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
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
import { createSale, getNotaVenta, updateSale, getSale, type SaleItem, type SaleInput, type Sale } from '../api/sales';
import { getToken } from '../storage/token';
import {
  colors,
  space,
  radius,
  fontFamily,
  fontSize,
  lineHeight,
  button,
  input,
  componentStyles,
  opacity,
  shadows,
  touchTarget,
  iconSize,
  a11y,
} from '../theme';
import { Header, Badge, TableRow, TableCard, PrimaryCTA } from '../components';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const PAYMENT_METHODS = ['Efectivo', 'QR', 'Transferencia', 'Crédito'] as const;

const QUICK_PAYMENT_METHODS = [
  { id: 'Efectivo', label: 'Efectivo', icon: 'cash' },
  { id: 'QR', label: 'QR', icon: 'qr-code' },
  { id: 'Transferencia', label: 'Transferencia', icon: 'swap-horizontal' },
  { id: 'Crédito', label: 'Crédito', icon: 'card' },
] as const;

interface SalesScreenProps {
  initialSaleId?: number;
}

export default function SalesScreen({ initialSaleId }: SalesScreenProps) {
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Array<{ product: any; stock: number }>>([]);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [payments, setPayments] = useState<{ metodo: string; monto: number }[]>([]);
  const [cliente, setCliente] = useState({ nombre: '', ciNit: '', celular: '' });
  const [requiereFactura, setRequiereFactura] = useState(false);
  const [lugarEntrega, setLugarEntrega] = useState('');
  const [paraQuien, setParaQuien] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<number | null>(null);
  const [printing, setPrinting] = useState(false);
  const [loadingSale, setLoadingSale] = useState(false);
  const editingSaleId = initialSaleId ?? null;
  const isEditing = editingSaleId !== null;

  const loadProducts = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getProducts({ search: search || undefined }, token ?? undefined);
      setProducts(data.map(p => ({ product: p, stock: p.stockTotal })));
    } catch (e) {
      console.error('Error cargando productos:', e);
    } finally {
      setLoadingProducts(false);
    }
  }, [search]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Cargar venta existente si estamos en modo edición
  useEffect(() => {
    if (!isEditing || editingSaleId === null) return;
    
    async function loadSale() {
      setLoadingSale(true);
      try {
        const token = await getToken();
        if (!token) throw new Error('No hay sesión activa');
        const sale = await getSale(editingSaleId as number, token);
        
        // Poblar carrito con items de la venta
        const cartItems: SaleItem[] = sale.items.map((item: any) => ({
          productId: item.productId,
          cantidad: item.cantidad,
          precio: item.precio,
        }));
        setCart(cartItems);
        
        // Poblar pagos
        const paymentItems = sale.pagos.map((p: any) => ({
          metodo: p.metodo,
          monto: p.monto,
        }));
        setPayments(paymentItems.length > 0 ? paymentItems : [{ metodo: 'Efectivo', monto: 0 }]);
        
        // Poblar cliente
        if (sale.cliente) {
          setCliente({
            nombre: sale.cliente.nombre,
            ciNit: sale.cliente.ciNit ?? '',
            celular: sale.cliente.celular ?? '',
          });
        }
        
        // Poblar campos adicionales
        setRequiereFactura(sale.requiereFactura);
        setLugarEntrega(sale.lugarEntrega ?? '');
        setParaQuien(sale.paraQuien ?? '');
        
        setLastSaleId(sale.id);
      } catch (e) {
        console.error('Error loading sale:', e);
        Alert.alert('Error', 'Error al cargar la venta para editar');
      } finally {
        setLoadingSale(false);
      }
    }
    
    loadSale();
  }, [isEditing, editingSaleId]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p =>
      p.product.producto.toLowerCase().includes(q) ||
      p.product.marca.toLowerCase().includes(q) ||
      p.product.modelo.toLowerCase().includes(q) ||
      p.product.codigoFabrica.toLowerCase().includes(q) ||
      p.product.codigoOem?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const total = useMemo(() =>
    cart.reduce((sum, item) => sum + item.cantidad * item.precio, 0),
    [cart]
  );

  const totalPagado = useMemo(() =>
    payments.reduce((sum, p) => sum + p.monto, 0),
    [payments]
  );

  const change = totalPagado - total;
  const canSubmit = cart.length > 0 && payments.length > 0 && Math.abs(totalPagado - total) < 0.01;
  const hasStockViolation = cart.some((item) => {
    const p = products.find(pr => pr.product.id === item.productId);
    return p && item.cantidad > (p.stock ?? 0);
  });
  const canSubmitFinal = canSubmit && !hasStockViolation;
  const paymentMismatch = Math.abs(totalPagado - total) > 0.01;
  const remaining = total - totalPagado;

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      const available = product.stockTotal ?? 0;
      if (existing) {
        if (existing.cantidad >= available) {
          Alert.alert('Sin stock', `No hay mas stock disponible de "${product.producto}". Disponible: ${available}`);
          return prev;
        }
        return prev.map(i => i.productId === product.id
          ? { ...i, cantidad: i.cantidad + 1 }
          : i
        );
      }
      if (available <= 0) {
        Alert.alert('Sin stock', `"${product.producto}" no tiene stock disponible`);
        return prev;
      }
      return [...prev, { productId: product.id, cantidad: 1, precio: product.precio1 || 0 }];
    });
  };

  const updateCartQty = (productId: number, cantidad: number) => {
    if (cantidad <= 0) {
      setCart(prev => prev.filter(i => i.productId !== productId));
    } else {
      const product = products.find(p => p.product.id === productId);
      const available = product?.stock ?? 0;
      if (cantidad > available) {
        Alert.alert('Stock maximo', `Stock maximo disponible: ${available} unidades`);
        setCart(prev => prev.map(i => i.productId === productId ? { ...i, cantidad: available } : i));
      } else {
        setCart(prev => prev.map(i => i.productId === productId ? { ...i, cantidad } : i));
      }
    }
  };

  const updateCartPrice = (productId: number, precio: number) => {
    setCart(prev => prev.map(i => i.productId === productId ? { ...i, precio } : i));
  };

  const addPayment = () => {
    Alert.prompt(
      'Agregar pago',
      'Ingrese monto y seleccione método',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'OK',
          onPress: (montoStr?: string) => {
            if (!montoStr) return;
            const monto = parseFloat(montoStr);
            if (isNaN(monto) || monto <= 0) return Alert.alert('Error', 'Monto inválido');
            selectPaymentMethod().then(metodo => {
              if (metodo) setPayments(prev => [...prev, { metodo, monto }]);
            });
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const selectPaymentMethod = (): Promise<string | null> =>
    new Promise(resolve => {
      Alert.alert(
        'Método de pago',
        'Seleccione',
        [
          ...PAYMENT_METHODS.map(m => ({
            text: m,
            onPress: () => resolve(m),
          })),
          { text: 'Cancelar', style: 'cancel' as const, onPress: () => resolve(null) },
        ]
      );
    });

  const removePayment = (index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuickPayment = (method: string) => {
    setPayments([{ metodo: method, monto: total }]);
  };

  const handlePrintNota = async () => {
    if (!lastSaleId) return;
    setPrinting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('No hay sesión activa');
      const html = await getNotaVenta(lastSaleId, token);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Guardar/Imprimir Nota de Venta' });
    } catch (e) {
      Alert.alert('Error', 'No se pudo generar la nota de venta');
    } finally {
      setPrinting(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmitFinal) return;
    setSubmitting(true);
    try {
      const input: SaleInput = {
        tipo: 'menor',
        items: cart,
        pagos: payments,
        cliente: cliente.nombre ? cliente : undefined,
        requiereFactura,
        lugarEntrega: lugarEntrega || undefined,
        paraQuien: paraQuien || undefined,
        locationId: user?.tiendaId || undefined,
      };
      const token = await getToken();
      if (!token) throw new Error('No hay sesión activa');

      let sale: Sale;
      if (isEditing && editingSaleId !== null) {
        sale = await updateSale(editingSaleId, input, token);
        Alert.alert('Éxito', `Venta ${sale.codigo} actualizada correctamente`);
      } else {
        sale = await createSale(input, token);
        Alert.alert('Éxito', `Venta ${sale.codigo} registrada correctamente`);
      }
      
      setLastSaleId(sale.id);
      
      // Si no estamos editando, limpiar formulario para nueva venta
      if (!isEditing) {
        setCart([]);
        setPayments([]);
        setCliente({ nombre: '', ciNit: '', celular: '' });
        setRequiereFactura(false);
        setLugarEntrega('');
        setParaQuien('');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo procesar la venta');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderProductItem = useCallback(({ item }: { item: { product: any; stock: number } }) => {
    const outOfStock = item.stock <= 0;
    return (
    <TableRow
      onPress={() => !outOfStock && addToCart(item.product)}
      accessibilityLabel={`${item.product.producto}, ${item.product.marca} ${item.product.modelo}, ${item.stock === 0 ? 'Sin stock' : item.stock <= (item.product.stockMinimo || 1) ? `Stock bajo: ${item.stock}` : `Disponible: ${item.stock}`}, Bs ${item.product.precio1?.toFixed(2) || '—'}`}
      accessibilityHint={outOfStock ? 'Sin stock disponible' : "Tocar para agregar al carrito"}
      style={outOfStock ? { opacity: 0.5 } : undefined}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.product.producto}</Text>
        <Text style={styles.productDetail}>
          {item.product.marca} {item.product.modelo} · {item.product.codigoFabrica}
        </Text>
        <View style={styles.productMeta}>
          <Badge
            variant={
              item.stock === 0 ? 'danger' :
              item.stock > 0 && item.stock <= (item.product.stockMinimo || 1) ? 'warning' :
              'success'
            }
            size="sm"
          >
            {item.stock === 0 ? 'Sin stock' :
             item.stock <= (item.product.stockMinimo || 1) ? `Stock bajo: ${item.stock}` :
             `Disponible: ${item.stock}`}
          </Badge>
          <Text style={styles.priceText}>Bs {item.product.precio1?.toFixed(2) || '—'}</Text>
        </View>
      </View>
      <View style={styles.productAction}>
        {!outOfStock ? (
          <Ionicons name="add-circle" size={iconSize.xl} color={colors.primary} />
        ) : (
          <Ionicons name="close-circle" size={iconSize.xl} color={colors.danger} />
        )}
      </View>
    </TableRow>
    );
  }, []);

  const renderCartItem = useCallback(({ item }: { item: SaleItem }) => {
    const prod = products.find(p => p.product.id === item.productId)?.product;
    return (
      <TableRow borderTop={true} accessibilityLabel={`${prod?.producto || 'Producto'}, cantidad ${item.cantidad}, precio unitario Bs ${item.precio.toFixed(2)}`}>
        <View style={styles.cartItemInfo}>
          <Text style={styles.cartItemName}>{prod?.producto || 'Producto'}</Text>
          <View style={styles.cartItemControls}>
            <View style={styles.qtyControl}>
              <Pressable
                onPress={() => updateCartQty(item.productId, item.cantidad - 1)}
                style={styles.qtyBtn}
                accessibilityRole={a11y.button}
                accessibilityLabel="Disminuir cantidad"
                accessibilityState={{ disabled: item.cantidad <= 1 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                android_ripple={{ color: colors.primarySoft }}
              >
                <Ionicons name="remove" size={iconSize.md} color={colors.text} />
              </Pressable>
              <TextInput
                style={styles.qtyInput}
                value={String(item.cantidad)}
                onChangeText={t => updateCartQty(item.productId, parseInt(t) || 0)}
                keyboardType="numeric"
                maxLength={3}
                accessibilityLabel="Cantidad"
                editable={!submitting}
              />
              <Pressable
                onPress={() => updateCartQty(item.productId, item.cantidad + 1)}
                style={styles.qtyBtn}
                accessibilityRole={a11y.button}
                accessibilityLabel="Aumentar cantidad"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                android_ripple={{ color: colors.primarySoft }}
              >
                <Ionicons name="add" size={iconSize.md} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.priceControl}>
              <Text style={styles.priceLabel}>Precio unit.</Text>
              <TextInput
                style={styles.priceInput}
                value={String(item.precio)}
                onChangeText={t => updateCartPrice(item.productId, parseFloat(t) || 0)}
                keyboardType="decimal-pad"
                accessibilityLabel="Precio unitario"
                editable={!submitting}
              />
            </View>
          </View>
        </View>
        <View style={styles.cartItemTotal}>
          <Text style={styles.subtotalText}>Bs {(item.cantidad * item.precio).toFixed(2)}</Text>
          <Pressable
            onPress={() => updateCartQty(item.productId, 0)}
            style={styles.removeBtn}
            accessibilityRole={a11y.button}
            accessibilityLabel="Eliminar del carrito"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            android_ripple={{ color: colors.dangerSoft }}
          >
            <Ionicons name="trash" size={iconSize.md} color={colors.danger} />
          </Pressable>
        </View>
      </TableRow>
    );
  }, [products, submitting]);

  const renderPaymentItem = useCallback(({ item, index }: { item: { metodo: string; monto: number }; index: number }) => (
    <TableRow borderTop={index > 0} accessibilityLabel={`Pago ${item.metodo}, Bs ${item.monto.toFixed(2)}`}>
      <View style={styles.paymentInfo}>
        <Text style={styles.paymentMetodo}>{item.metodo}</Text>
        <Text style={styles.paymentMonto}>Bs {item.monto.toFixed(2)}</Text>
      </View>
      <Pressable
        onPress={() => removePayment(index)}
        style={styles.removePaymentBtn}
        accessibilityRole={a11y.button}
        accessibilityLabel="Eliminar este pago"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        android_ripple={{ color: colors.dangerSoft }}
      >
        <Ionicons name="trash" size={iconSize.md} color={colors.danger} />
      </Pressable>
    </TableRow>
  ), []);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Header title="Nueva Venta" />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Buscar producto</Text>
            <TextInput
              style={[
                styles.searchInput,
                componentStyles.inputBase,
                searchFocused && componentStyles.inputFocused,
                { fontFamily: fontFamily.sans },
              ]}
              placeholder="Código, nombre, marca, modelo, OEM..."
              value={search}
              onChangeText={setSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholderTextColor={colors.textPlaceholder}
              accessibilityLabel="Buscar producto"
              accessibilityHint="Escribe para filtrar productos"
              autoComplete="off"
            />
          </View>

          {/* Product List */}
          {loadingProducts ? (
            <View style={styles.loadingList}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>Cargando productos...</Text>
            </View>
          ) : (
            <TableCard>
              <FlatList
                data={filteredProducts}
                keyExtractor={item => String(item.product.id)}
                renderItem={renderProductItem}
                ListEmptyComponent={
                  <View style={styles.emptyList}>
                    <Ionicons name="search" size={iconSize['2xl']} color={colors.textMuted} />
                    <Text style={styles.emptyText}>No se encontraron productos</Text>
                  </View>
                }
                removeClippedSubviews
                maxToRenderPerBatch={10}
                windowSize={5}
                initialNumToRender={10}
              />
            </TableCard>
          )}

          {/* Cart */}
          {cart.length > 0 && (
            <View style={styles.section}>
              <View style={styles.cartHeader}>
                <Text style={styles.sectionTitle}>Carrito ({cart.length})</Text>
                <Text style={styles.cartTotal}>Total: Bs {total.toFixed(2)}</Text>
              </View>
              <TableCard>
                <FlatList
                  data={cart}
                  keyExtractor={item => String(item.productId)}
                  renderItem={renderCartItem}
                  removeClippedSubviews
                />
              </TableCard>
            </View>
          )}

          {/* Payments */}
          {cart.length > 0 && (
            <View style={styles.section}>
              <View style={styles.paymentHeader}>
                <Text style={styles.sectionTitle}>Pagos</Text>
                <Text style={[
                  styles.paymentTotal,
                  paymentMismatch && styles.paymentMismatch
                ]}>
                  Pagado: Bs {totalPagado.toFixed(2)} / Bs {total.toFixed(2)}
                </Text>
              </View>

              {/* Quick Payment Buttons */}
              <View style={styles.quickPayments}>
                {QUICK_PAYMENT_METHODS.map((method) => (
                  <Pressable
                    key={method.id}
                    style={[
                      styles.quickPayBtn,
                      payments.length === 1 && payments[0].metodo === method.id && payments[0].monto === total
                        ? styles.quickPayBtnActive
                        : null,
                    ]}
                    onPress={() => handleQuickPayment(method.id)}
                    disabled={cart.length === 0}
                    accessibilityRole={a11y.button}
                    accessibilityLabel={`Pagar total con ${method.label}`}
                    android_ripple={{ color: colors.primarySoft }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name={method.icon} size={iconSize.lg} color={colors.primary} />
                    <Text style={styles.quickPayBtnText}>{method.label}</Text>
                  </Pressable>
                ))}
              </View>

              {payments.length === 0 ? (
                <Pressable
                  style={styles.addPaymentBtn}
                  onPress={addPayment}
                  accessibilityRole={a11y.button}
                  accessibilityLabel="Agregar primer pago"
                  android_ripple={{ color: colors.primarySoft }}
                >
                  <Ionicons name="add" size={iconSize.md} color={colors.primary} />
                  <Text style={styles.addPaymentBtnText}>Agregar primer pago</Text>
                </Pressable>
              ) : (
                <>
                  <TableCard>
                    <FlatList
                      data={payments}
                      keyExtractor={(_, i) => String(i)}
                      renderItem={renderPaymentItem}
                    />
                  </TableCard>
                  <Pressable
                    style={styles.addPaymentBtn}
                    onPress={addPayment}
                    accessibilityRole={a11y.button}
                    accessibilityLabel="Agregar otro pago"
                    android_ripple={{ color: colors.primarySoft }}
                  >
                    <Ionicons name="add" size={iconSize.md} color={colors.primary} />
                    <Text style={styles.addPaymentBtnText}>Agregar otro pago</Text>
                  </Pressable>
                  {paymentMismatch && (
                    <Text style={styles.paymentError}>
                      {remaining > 0 ? `Faltan Bs ${remaining.toFixed(2)}` : `Exceso: Bs ${Math.abs(remaining).toFixed(2)}`}
                    </Text>
                  )}
                  {/* Vuelto/Cambio Display */}
                  {change !== 0 && (
                    <View style={styles.changeRow}>
                      <Text style={styles.changeLabel}>Vuelto:</Text>
                      <Text style={[
                        styles.changeValue,
                        change >= 0 ? styles.changePositive : styles.changeNegative
                      ]}>
                        Bs {Math.abs(change).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Facturación */}
          {cart.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Facturación</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.checkboxRow,
                  pressed && styles.checkboxRowPressed,
                ]}
                onPress={() => setRequiereFactura(!requiereFactura)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: requiereFactura }}
                accessibilityLabel="Requiere factura"
                android_ripple={{ color: colors.primarySoft }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <View style={[
                  styles.checkbox,
                  requiereFactura && styles.checkboxChecked,
                ]} />
                <Text style={styles.checkboxLabel}>Requiere factura</Text>
              </Pressable>

              {requiereFactura && (
                <>
                  <TextInput
                    style={[styles.input, componentStyles.inputBase, { fontFamily: fontFamily.sans }]}
                    placeholder="Nombre cliente"
                    value={cliente.nombre}
                    onChangeText={t => setCliente({ ...cliente, nombre: t })}
                    placeholderTextColor={colors.textPlaceholder}
                    accessibilityLabel="Nombre del cliente"
                    autoComplete="name"
                    editable={!submitting}
                  />
                  <TextInput
                    style={[styles.input, componentStyles.inputBase, { fontFamily: fontFamily.monoMedium }]}
                    placeholder="CI/NIT"
                    value={cliente.ciNit}
                    onChangeText={t => setCliente({ ...cliente, ciNit: t })}
                    placeholderTextColor={colors.textPlaceholder}
                    accessibilityLabel="CI o NIT del cliente"
                    autoComplete="off"
                    editable={!submitting}
                  />
                  <TextInput
                    style={[styles.input, componentStyles.inputBase, { fontFamily: fontFamily.monoMedium }]}
                    placeholder="Celular"
                    value={cliente.celular}
                    onChangeText={t => setCliente({ ...cliente, celular: t })}
                    placeholderTextColor={colors.textPlaceholder}
                    keyboardType="phone-pad"
                    accessibilityLabel="Celular del cliente"
                    autoComplete="tel"
                    editable={!submitting}
                  />
                </>
              )}

              <TextInput
                style={[styles.input, componentStyles.inputBase, { fontFamily: fontFamily.sans }]}
                placeholder="Lugar de entrega (opcional)"
                value={lugarEntrega}
                onChangeText={setLugarEntrega}
                placeholderTextColor={colors.textPlaceholder}
                accessibilityLabel="Lugar de entrega"
                editable={!submitting}
              />
              <TextInput
                style={[styles.input, componentStyles.inputBase, { fontFamily: fontFamily.sans }]}
                placeholder="Para quién es el pedido (opcional)"
                value={paraQuien}
                onChangeText={setParaQuien}
                placeholderTextColor={colors.textPlaceholder}
                accessibilityLabel="Para quién es el pedido"
                editable={!submitting}
              />
            </View>
          )}

          {/* Submit */}
          {cart.length > 0 && (
            <View style={styles.actionsSection}>
              {isEditing && (
                <View style={styles.editModeBanner}>
                  <Ionicons name="create" size={iconSize.md} color={colors.primary} />
                  <Text style={styles.editModeBannerText}>
                    Editando venta <Text style={styles.editModeBannerStrong}>#{editingSaleId}</Text> — Los cambios actualizarán la venta existente
                  </Text>
                </View>
              )}
              {lastSaleId && (
                <Pressable
                  style={({ pressed }) => [
                    styles.printBtn,
                    pressed && styles.printBtnPressed,
                    printing && styles.printBtnDisabled,
                  ]}
                  onPress={handlePrintNota}
                  disabled={printing}
                  accessibilityRole={a11y.button}
                  accessibilityLabel="Imprimir/guardar última nota de venta"
                  android_ripple={{ color: colors.primarySoft }}
                  hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
                >
                  {printing ? (
                    <ActivityIndicator color={colors.textOnPrimary} size="small" />
                  ) : (
                    <>
                      <Ionicons name="print" size={iconSize.md} color={colors.textOnPrimary} style={styles.printBtnIcon} />
                      <Text style={styles.printBtnText}>Imprimir Nota</Text>
                    </>
                  )}
                </Pressable>
              )}
              <PrimaryCTA
                label={isEditing ? 'Actualizar Venta' : 'Confirmar Venta'}
                hint={`Total: Bs ${total.toFixed(2)}`}
                iconName="checkmark-circle"
                color={canSubmitFinal ? colors.success : colors.textMuted}
                onPress={handleSubmit}
                disabled={!canSubmitFinal || submitting || loadingSale}
                accessibilityLabel={isEditing ? 'Actualizar la venta' : 'Confirmar y registrar la venta'}
                accessibilityHint={canSubmitFinal ? (isEditing ? 'Presiona para actualizar la venta' : 'Presiona para finalizar la venta') : 'Completa el carrito y los pagos para continuar'}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.xl },
  section: { gap: space.sm },
  sectionTitle: { fontSize: fontSize.headline, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  searchInput: {
    // inputBase provides styling
  },
  loadingList: { padding: space.xl, alignItems: 'center', gap: space.md },
  loadingText: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  emptyList: { padding: space.xl, alignItems: 'center', gap: space.md },
  emptyText: { fontSize: fontSize.body, fontFamily: fontFamily.sans, color: colors.textMuted },
  productInfo: { flex: 1, marginRight: space.md, minWidth: 0 },
  productName: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  productDetail: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted, marginTop: 2 },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xs, flexWrap: 'wrap' },
  priceText: { fontSize: fontSize.data, fontFamily: fontFamily.monoBold, color: colors.primary },
  productAction: { paddingHorizontal: space.md, paddingVertical: space.sm },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm },
  cartTotal: { fontSize: fontSize.dataLg, fontFamily: fontFamily.monoBold, color: colors.primary },
  cartItemInfo: { flex: 1, minWidth: 0 },
  cartItemName: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  cartItemControls: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xs, flexWrap: 'wrap' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.white },
  qtyBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  qtyInput: { width: 56, height: 44, textAlign: 'center', fontSize: fontSize.data, fontFamily: fontFamily.monoMedium, color: colors.text, backgroundColor: 'transparent' },
  priceControl: { marginLeft: 0, minWidth: 80, flexShrink: 1 },
  priceLabel: { fontSize: fontSize.caption, fontFamily: fontFamily.sans, color: colors.textMuted },
  priceInput: { width: 80, height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 8, fontSize: fontSize.data, fontFamily: fontFamily.monoMedium, color: colors.text, backgroundColor: colors.white },
  cartItemTotal: { alignItems: 'flex-end', paddingLeft: space.md },
  subtotalText: { fontSize: fontSize.data, fontFamily: fontFamily.monoBold, color: colors.primary },
  removeBtn: { padding: space.sm },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm },
  paymentTotal: { fontSize: fontSize.data, fontFamily: fontFamily.monoBold, color: colors.text },
  paymentMismatch: { color: colors.danger },
  paymentInfo: { flex: 1, minWidth: 0, gap: 2 },
  paymentMetodo: { fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold, color: colors.text },
  paymentMonto: { fontSize: fontSize.data, fontFamily: fontFamily.monoMedium, color: colors.primary },
  removePaymentBtn: { padding: space.sm },
  addPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: space.md,
    ...shadows.level1,
  },
  addPaymentBtnText: { color: colors.primary, fontFamily: fontFamily.sansSemiBold },
  paymentError: { color: colors.danger, fontSize: fontSize.caption, fontFamily: fontFamily.monoMedium, marginTop: space.xs, textAlign: 'center' },
  input: { marginTop: space.sm },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm },
  checkboxRowPressed: { opacity: opacity.pressed },
  checkbox: { width: 24, height: 24, borderWidth: 2, borderColor: colors.border, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxLabel: { marginLeft: space.sm, fontSize: fontSize.body, fontFamily: fontFamily.sans, color: colors.text },
  quickPayments: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  quickPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    ...shadows.level1,
  },
  quickPayBtnActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  quickPayBtnText: { color: colors.primary, fontFamily: fontFamily.sansSemiBold, fontSize: fontSize.captionStrong },
  changeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: space.sm,
  },
  changeLabel: { fontSize: fontSize.data, fontFamily: fontFamily.monoMedium, color: colors.text },
  changeValue: { fontSize: fontSize.dataLg, fontFamily: fontFamily.monoBold },
  changePositive: { color: colors.success },
  changeNegative: { color: colors.danger },
  actionsSection: { flexDirection: 'row', gap: space.md, marginTop: space.md },
  printBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    height: button.height.lg,
    borderRadius: button.radius,
    backgroundColor: colors.primary,
    paddingHorizontal: button.paddingX.lg,
    ...shadows.level2,
  },
  printBtnPressed: { opacity: opacity.pressed },
  printBtnDisabled: { opacity: 0.6 },
  printBtnIcon: { marginTop: 1 },
  printBtnText: { color: colors.textOnPrimary, fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold },
  editModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    marginBottom: space.md,
  },
  editModeBannerText: {
    flex: 1,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.primary,
  },
  editModeBannerStrong: {
    fontFamily: fontFamily.sansSemiBold,
    color: colors.primary,
  },
});