import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { getProducts } from '../api/products';
import { getLocations, type Location } from '../api/locations';
import type { Product } from '../types/product';
import {
  colors,
  space,
  radius,
  fontFamily,
  fontSize,
  shadows,
} from '../theme';
import { Header, Badge } from '../components';

export default function InventarioScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedMarca, setSelectedMarca] = useState<string>('Todas');
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // `GET /products` exige JWT (`@UseGuards(JwtAuthGuard, RolesGuard)` en
  // `products.controller.ts`): sin el token el backend responde 401 y la lista
  // quedaba vacía sin ningún aviso en pantalla.
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [data, locs] = await Promise.all([
        getProducts({}, token ?? undefined),
        getLocations(token ?? undefined),
      ]);
      if (Array.isArray(data)) {
        setProducts(data);
      }
      if (Array.isArray(locs)) {
        setLocations(locs);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el inventario.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Atajos de marca, derivados de los productos REALES cargados y no de una
  // lista fija.
  //
  // Salen de `p.marca`, que es donde vive la marca del VEHÍCULO (Toyota,
  // Nissan), igual que en el resto de la app (filtros web, reporte "Ventas por
  // Marca de Vehículo", ficha de producto). Una lista fija no servía: podía
  // quedar desalineada con el catálogo y no había forma de saberlo.
  const marcas = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const marca = p.marca?.trim();
      if (marca) set.add(marca);
    }
    return ['Todas', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'es'))];
  }, [products]);

  // Si la marca seleccionada ya no existe en el catálogo (porque cambiaron los
  // productos), se vuelve a "Todas": si no, el filtro quedaría apuntando a una
  // marca sin chips y la lista daría 0 resultados sin motivo visible.
  useEffect(() => {
    if (selectedMarca !== 'Todas' && !marcas.includes(selectedMarca)) {
      setSelectedMarca('Todas');
    }
  }, [marcas, selectedMarca]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (
        selectedMarca !== 'Todas' &&
        p.marca?.trim().toLowerCase() !== selectedMarca.toLowerCase()
      ) {
        return false;
      }
      if (search.trim()) {
        const s = search.toLowerCase();
        const matches =
          p.producto.toLowerCase().includes(s) ||
          p.marca.toLowerCase().includes(s) ||
          p.modelo.toLowerCase().includes(s) ||
          p.codigoFabrica.toLowerCase().includes(s) ||
          (p.codigoOem && p.codigoOem.toLowerCase().includes(s)) ||
          p.fabricante.toLowerCase().includes(s);
        if (!matches) return false;
      }
      return true;
    });
  }, [products, selectedMarca, search]);

  const toggleExpand = (id: number) => {
    setExpandedProductId((prev) => (prev === id ? null : id));
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const isExpanded = expandedProductId === item.id;
    const stockTotal = item.stockTotal || 0;
    const stockVariant = stockTotal === 0 ? 'danger' : stockTotal <= 3 ? 'warning' : 'success';

    // Cantidad real por ubicación, tal como la calcula el backend
    // (`products.service.ts:162`, tabla `inventory` agrupada por locationId).
    const stockPorUbicacion: Record<number, number> = {};
    for (const d of item.stockLocationDetails ?? []) {
      stockPorUbicacion[d.locationId] = (stockPorUbicacion[d.locationId] ?? 0) + d.cantidad;
    }

    // Se listan TODAS las ubicaciones de la BD (las sin stock quedan en 0), con los
    // almacenes primero y después las tiendas. Iterar solo sobre las que tienen
    // stock ocultaría sucursales y rompería la relación con el total.
    const locationsOrdenadas = [...locations].sort((a, b) => {
      if (a.tipo !== b.tipo) return a.tipo === 'almacen' ? -1 : 1;
      return a.numero - b.numero;
    });
    const almacenes = locations.filter((l) => l.tipo === 'almacen').length;
    const tiendas = locations.filter((l) => l.tipo === 'tienda').length;

    return (
      <View style={styles.card}>
        {/* Cabecera del Repuesto */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productTitle}>{item.producto}</Text>
            <Text style={styles.productSubtitle}>
              {item.marca} {item.modelo} {item.anio ? `(${item.anio})` : ''} • {item.fabricante}
            </Text>
          </View>
          <Badge variant={stockVariant} size="sm">
            {`${stockTotal} uds.`}
          </Badge>
        </View>

        {/* Códigos y Precios */}
        <View style={styles.tagsRow}>
          <View style={styles.codePill}>
            <Text style={styles.codeText}>{item.codigoFabrica}</Text>
          </View>
          {item.codigoOem && (
            <View style={[styles.codePill, { backgroundColor: '#f1f5f9' }]}>
              <Text style={[styles.codeText, { color: '#64748b' }]}>OEM: {item.codigoOem}</Text>
            </View>
          )}
        </View>

        <View style={styles.pricesRow}>
          <View>
            <Text style={styles.priceLabel}>Precio 1 (Mostrador)</Text>
            <Text style={styles.priceValue}>
              Bs. {item.precio1 ? item.precio1.toFixed(2) : '—'}
            </Text>
          </View>
          <View>
            <Text style={styles.priceLabel}>Precio 2 (Taller)</Text>
            <Text style={styles.priceValue}>
              Bs. {item.precio2 ? item.precio2.toFixed(2) : '—'}
            </Text>
          </View>
          {item.precioMayor && (
            <View>
              <Text style={styles.priceLabel}>Mayorista</Text>
              <Text style={[styles.priceValue, { color: '#8b5cf6' }]}>
                Bs. {item.precioMayor.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {/* Conteo real de ubicaciones: salen de la BD, no de una constante */}
        <Pressable
          style={styles.expandButton}
          onPress={() => toggleExpand(item.id)}
        >
          <Text style={styles.expandButtonText}>
            {isExpanded
              ? 'Ocultar stock por ubicación'
              : `Ver stock en ${locations.length} ubicación${locations.length === 1 ? '' : 'es'}`}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.primary}
          />
        </Pressable>

        {/* Desglose de Stock por Ubicación.

            Antes iteraba sobre `MOCK_LOCATIONS` (7 ubicaciones falsas) y calculaba
            `Math.floor(stockTotal / 7)`, que reparte el total con redondeo y por eso
            no cuadraba con las unidades disponibles. Ahora se itera sobre las
            ubicaciones REALES y se lee la cantidad que ya trae el backend en
            `stockLocationDetails`; las que no tienen fila quedan en 0, así que la
            suma de la lista siempre es igual a `stockTotal`. */}
        {isExpanded && (
          <View style={styles.stockBreakdownContainer}>
            <Text style={styles.breakdownHeader}>
              {`Distribución en ${almacenes} almacén${almacenes === 1 ? '' : 'es'} y ${tiendas} tienda${tiendas === 1 ? '' : 's'}`}
            </Text>
            {locationsOrdenadas.map((loc) => {
              const locStock = stockPorUbicacion[loc.id] ?? 0;
              return (
                <View key={loc.id} style={styles.locationRow}>
                  <View style={styles.locationInfo}>
                    <Ionicons
                      name={loc.tipo === 'almacen' ? 'business-outline' : 'storefront-outline'}
                      size={14}
                      color={loc.tipo === 'almacen' ? colors.primary : colors.success}
                    />
                    <Text style={styles.locationName}>{loc.nombre}</Text>
                  </View>
                  <Text style={[styles.locationQty, locStock === 0 ? { color: colors.danger } : {}]}>
                    {locStock} uds.
                  </Text>
                </View>
              );
            })}
            <View style={styles.locationTotalRow}>
              <Text style={styles.locationTotalLabel}>Total</Text>
              <Text style={styles.locationTotalValue}>{stockTotal} uds.</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Sin `onMenuPress` el Header no dibuja el botón de menú (`Header.tsx:43`),
          y al no ser pantalla raíz del drawer no hay otra forma de reabrirlo. */}
      <Header
        title="Catálogo e Inventario"
        subtitle={`${filteredProducts.length} repuestos disponibles`}
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      />

      {/* Barra de Búsqueda */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por repuesto, código, modelo..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filtro Horizontal de Marcas */}
      <View style={styles.chipsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={marcas}
          keyExtractor={(m) => m}
          contentContainerStyle={styles.chipsContent}
          renderItem={({ item: marca }) => {
            const isSelected = selectedMarca === marca;
            return (
              <Pressable
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => setSelectedMarca(marca)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {marca}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Lista de Productos */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Consultando catálogo de autopartes...</Text>
        </View>
      ) : error && products.length === 0 ? (
        // Sin datos y con error no tiene sentido mostrar "No se encontraron
        // repuestos": eso se leía como un catálogo vacío y no como un fallo.
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No se pudo cargar el inventario</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}
            onPress={loadData}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No se encontraron repuestos</Text>
          <Text style={styles.emptySubtitle}>
            Prueba ajustando la búsqueda o seleccionando otra marca.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(p) => String(p.id)}
          renderItem={renderProductItem}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadData}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchContainer: {
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.text,
  },
  chipsContainer: {
    marginVertical: space.xs,
  },
  chipsContent: {
    paddingHorizontal: space.md,
    gap: space.xs,
  },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: space.md,
    gap: space.md,
    paddingBottom: space['2xl'],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.level1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.sm,
    marginBottom: space.xs,
  },
  productTitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansBold,
    color: colors.text,
  },
  productSubtitle: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: space.xs,
    marginVertical: space.xs,
  },
  codePill: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: space.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  codeText: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.monoBold,
    color: colors.primary,
  },
  pricesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: space.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: space.xs,
  },
  priceLabel: {
    fontSize: 10,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  priceValue: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansBold,
    color: colors.text,
    marginTop: 1,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    marginTop: space.sm,
    paddingTop: space.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  expandButtonText: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.primary,
  },
  stockBreakdownContainer: {
    marginTop: space.sm,
    padding: space.sm,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  breakdownHeader: {
    fontSize: 11,
    fontFamily: fontFamily.sansBold,
    color: colors.textMuted,
    marginBottom: space.xs,
    textTransform: 'uppercase',
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationName: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.text,
  },
  locationQty: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansBold,
    color: colors.primary,
  },
  locationTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  locationTotalLabel: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansBold,
    color: colors.text,
  },
  locationTotalValue: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansBold,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  loadingText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.xs,
  },
  emptyTitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansBold,
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: space.md,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
  },
  retryText: {
    color: colors.white,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
  },
});
