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
import Ionicons from '@expo/vector-icons/Ionicons';
import { getProducts } from '../api/products';
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

const MARCAS_POPULARES = ['Todas', 'Toyota', 'Nissan', 'Suzuki', 'Hyundai', 'Jeep', 'Dodge', 'Renault', 'Mitsubishi', 'Mazda'];

const MOCK_LOCATIONS = [
  { id: 1, nombre: 'Almacén 1 (Central El Alto)', tipo: 'almacen' },
  { id: 2, nombre: 'Almacén 2 (Norte)', tipo: 'almacen' },
  { id: 3, nombre: 'Almacén 3 (Sur)', tipo: 'almacen' },
  { id: 4, nombre: 'Almacén 4 (Distribución)', tipo: 'almacen' },
  { id: 5, nombre: 'Tienda 1 (Av. Principal)', tipo: 'tienda' },
  { id: 6, nombre: 'Tienda 2 (Comercial Repuestos)', tipo: 'tienda' },
  { id: 7, nombre: 'Tienda 3 (Zona Sur)', tipo: 'tienda' },
];

export default function InventarioScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedMarca, setSelectedMarca] = useState<string>('Todas');
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProducts();
      if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (e) {
      console.error('Error al cargar productos móvil:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedMarca !== 'Todas' && p.marca.toLowerCase() !== selectedMarca.toLowerCase()) {
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

        {/* Botón para expandir stock de las 7 ubicaciones */}
        <Pressable
          style={styles.expandButton}
          onPress={() => toggleExpand(item.id)}
        >
          <Text style={styles.expandButtonText}>
            {isExpanded ? 'Ocultar stock por ubicación' : 'Ver stock en 7 ubicaciones'}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.primary}
          />
        </Pressable>

        {/* Desglose de Stock por Ubicación */}
        {isExpanded && (
          <View style={styles.stockBreakdownContainer}>
            <Text style={styles.breakdownHeader}>Distribución en 4 Almacenes y 3 Tiendas:</Text>
            {MOCK_LOCATIONS.map((loc) => {
              const locStock = Math.max(0, Math.floor(stockTotal / 7));

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
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Catálogo e Inventario"
        subtitle={`${filteredProducts.length} repuestos disponibles`}
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
          data={MARCAS_POPULARES}
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
});
