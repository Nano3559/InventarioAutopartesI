import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { getProductByBarcode } from '../api/products';
import { ApiError } from '../api/client';
import { getToken } from '../storage/token';
import { resolveImageUrl } from '../config';
import type { Product } from '../types/product';
import {
  colors,
  space,
  radius,
  fontFamily,
  fontSize,
  button,
  iconSize,
  a11y,
} from '../theme';
import { Header, Badge } from '../components';
import Ionicons from '@expo/vector-icons/Ionicons';

/** Ventana durante la cual se ignora una relectura del mismo código. */
const REPEAT_WINDOW_MS = 2500;

interface ScanResult {
  key: string;
  codigo: string;
  scannedAt: Date;
  product?: Product;
  error?: string;
  notFound?: boolean;
}

function Corner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const vertical = position.startsWith('t') ? styles.cornerTop : styles.cornerBottom;
  const horizontal = position.endsWith('l') ? styles.cornerLeft : styles.cornerRight;
  return <View style={[styles.corner, vertical, horizontal]} />;
}

export default function ScannerScreen() {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastScan = useRef<{ codigo: string; at: number } | null>(null);
  const counter = useRef(0);

  const selected = results.find((r) => r.key === selectedKey) ?? results[0] ?? null;

  const upsert = useCallback((entry: ScanResult) => {
    setResults((prev) => {
      const existing = prev.findIndex((r) => r.codigo === entry.codigo);
      if (existing === -1) return [entry, ...prev];
      const next = [...prev];
      next[existing] = entry;
      return next;
    });
  }, []);

  const handleBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      const codigo = result.data?.trim();
      if (!codigo || busy) return;

      const now = Date.now();
      if (
        lastScan.current &&
        lastScan.current.codigo === codigo &&
        now - lastScan.current.at < REPEAT_WINDOW_MS
      ) {
        return;
      }
      lastScan.current = { codigo, at: now };

      const key = `scan-${(counter.current += 1)}`;
      setBusy(true);
      setSelectedKey(key);
      try {
        const token = await getToken();
        const product = await getProductByBarcode(codigo, token ?? undefined);
        upsert({ key, codigo, scannedAt: new Date(), product });
      } catch (err) {
        const notFound = err instanceof ApiError && err.status === 404;
        upsert({
          key,
          codigo,
          scannedAt: new Date(),
          notFound,
          error: notFound
            ? 'Código no registrado en el sistema.'
            : err instanceof ApiError
              ? err.message
              : 'No se pudo consultar el producto.',
        });
      } finally {
        setBusy(false);
      }
    },
    [busy, upsert],
  );

  const handleClear = () => {
    setResults([]);
    setSelectedKey(null);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header
          title="Escáner de Barras"
          onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header
          title="Escáner de Barras"
          onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        />
        <View style={styles.centered}>
          <View style={styles.permissionIcon}>
            <Ionicons name="camera-outline" size={40} color={colors.primary} />
          </View>
          <Text style={styles.permissionTitle}>Se necesita la cámara</Text>
          <Text style={styles.permissionBody}>
            Autoriza el uso de la cámara para escanear las etiquetas de los repuestos.
          </Text>
          {permission.canAskAgain ? (
            <Pressable
              style={({ pressed }) => [styles.permissionBtn, pressed && styles.btnPressed]}
              onPress={requestPermission}
              accessibilityRole={a11y.button}
              accessibilityLabel="Autorizar cámara"
            >
              <Ionicons name="camera" size={iconSize.md} color={colors.white} />
              <Text style={styles.permissionBtnText}>Autorizar cámara</Text>
            </Pressable>
          ) : (
            <Text style={styles.permissionBody}>
              El permiso fue denegado. Actívalo en los ajustes del sistema.
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Escáner de Barras"
        subtitle="Apunte a la etiqueta del repuesto"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        rightAction={
          results.length > 0
            ? { label: 'Limpiar', icon: 'trash-outline', variant: 'danger', onPress: handleClear }
            : undefined
        }
      />

      <View style={styles.cameraBox}>
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['code128'] }}
          onBarcodeScanned={busy ? undefined : handleBarcodeScanned}
          onMountError={(event) => setCameraError(event.message)}
        />

        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.frame}>
            <Corner position="tl" />
            <Corner position="tr" />
            <Corner position="bl" />
            <Corner position="br" />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.torchBtn, torch && styles.torchBtnOn, pressed && styles.btnPressed]}
          onPress={() => setTorch((prev) => !prev)}
          accessibilityRole={a11y.button}
          accessibilityLabel={torch ? 'Apagar linterna' : 'Encender linterna'}
        >
          <Ionicons
            name={torch ? 'flashlight' : 'flashlight-outline'}
            size={iconSize.md}
            color={torch ? colors.textOnPrimary : colors.white}
          />
        </Pressable>

        <View style={styles.statusPill} pointerEvents="none">
          {busy ? (
            <>
              <ActivityIndicator size="small" color={colors.white} />
              <Text style={styles.statusPillText}>Consultando...</Text>
            </>
          ) : (
            <Text style={styles.statusPillText}>Buscando código de barras</Text>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {cameraError ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>No se pudo abrir la cámara: {cameraError}</Text>
          </View>
        ) : null}

        {!selected ? (
          <View style={styles.emptyBox}>
            <Ionicons name="barcode-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Sin escaneos</Text>
            <Text style={styles.emptyHint}>
              Encuadre la etiqueta para ver el nombre, el precio y el stock del repuesto.
            </Text>
          </View>
        ) : (
          <ResultCard result={selected} />
        )}

        {results.length > 1 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Escaneados ({results.length})</Text>
            {results.map((r) => (
              <Pressable
                key={r.key}
                style={({ pressed }) => [
                  styles.listRow,
                  r.key === selected?.key && styles.listRowActive,
                  pressed && styles.btnPressed,
                ]}
                onPress={() => setSelectedKey(r.key)}
                accessibilityRole={a11y.button}
                accessibilityLabel={`Ver ${r.product?.producto ?? r.codigo}`}
              >
                <Ionicons
                  name={r.product ? 'cube-outline' : 'alert-circle-outline'}
                  size={iconSize.sm}
                  color={r.product ? colors.primary : colors.danger}
                />
                <View style={styles.listRowInfo}>
                  <Text style={styles.listRowTitle} numberOfLines={1}>
                    {r.product?.producto ?? r.codigo}
                  </Text>
                  <Text style={styles.listRowSubtitle} numberOfLines={1}>
                    {r.codigo}
                  </Text>
                </View>
                {r.product && (
                  <Text
                    style={[
                      styles.listRowQty,
                      r.product.stockTotal <= 0 && styles.listRowQtyOut,
                    ]}
                  >
                    {r.product.stockTotal}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={{ height: space.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultCard({ result }: { result: ScanResult }) {
  if (result.error) {
    return (
      <View style={[styles.card, result.notFound ? styles.cardWarning : styles.cardDanger]}>
        <View style={styles.cardHeader}>
          <Ionicons
            name={result.notFound ? 'help-circle-outline' : 'alert-circle'}
            size={iconSize.lg}
            color={result.notFound ? colors.warning : colors.danger}
          />
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>
              {result.notFound ? 'Código no registrado' : 'No se pudo consultar'}
            </Text>
            <Text style={styles.cardSubtitle}>{result.error}</Text>
          </View>
        </View>
        <View style={styles.codeRow}>
          <Text style={styles.codeLabel}>Código leído</Text>
          <Text style={styles.codeValue}>{result.codigo}</Text>
        </View>
      </View>
    );
  }

  const product = result.product!;
  const stockTotal = product.stockTotal ?? 0;
  const isOut = stockTotal <= 0;
  const isLow = !isOut && stockTotal <= (product.stockMinimo || 0);
  const image = resolveImageUrl(product.imagen);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {image ? (
          <Image source={{ uri: image }} style={styles.thumb} />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons name="image-outline" size={26} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {product.producto}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {[product.marca, product.modelo].filter(Boolean).join(' · ')}
          </Text>
          <View style={styles.badgeRow}>
            <Badge variant={isOut ? 'danger' : isLow ? 'warning' : 'success'} size="sm">
              {isOut ? 'Sin stock' : `${stockTotal} uds.`}
            </Badge>
            {product.activo ? (
              <Badge variant="info" size="sm">
                Activo
              </Badge>
            ) : (
              <Badge variant="default" size="sm">
                Inactivo
              </Badge>
            )}
          </View>
        </View>
      </View>

      {isOut ? (
        <View style={styles.noticeBox}>
          <Ionicons name="alert-circle" size={18} color={colors.danger} />
          <Text style={styles.noticeText}>
            Sin stock en ninguna tienda. Considere generar una solicitud de reposición.
          </Text>
        </View>
      ) : null}

      <View style={styles.codeRow}>
        <Text style={styles.codeLabel}>Código de barras</Text>
        <Text style={styles.codeValue}>{product.codigo ?? result.codigo}</Text>
      </View>
      <View style={styles.codeRow}>
        <Text style={styles.codeLabel}>Cód. fábrica</Text>
        <Text style={styles.codeValue}>{product.codigoFabrica}</Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>Precios (Bs.)</Text>
      <View style={styles.priceGrid}>
        {product.precio1 != null ? (
          <PriceCell label="Mostrador" value={product.precio1} />
        ) : null}
        {product.precio2 != null ? <PriceCell label="Taller" value={product.precio2} /> : null}
        {product.precioMayor != null ? (
          <PriceCell label="Mayorista" value={product.precioMayor} />
        ) : null}
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>Stock por tienda</Text>
      {product.stockLocationDetails && product.stockLocationDetails.length > 0 ? (
        product.stockLocationDetails.map((loc) => (
          <View key={loc.locationId} style={styles.stockRow}>
            <Ionicons
              name={loc.tipo === 'tienda' ? 'storefront-outline' : 'business-outline'}
              size={iconSize.sm}
              color={loc.cantidad > 0 ? colors.emerald : colors.textMuted}
            />
            <Text style={styles.stockName} numberOfLines={1}>
              {loc.ubicacion}
            </Text>
            <Text style={[styles.stockQty, loc.cantidad <= 0 && styles.stockQtyOut]}>
              {loc.cantidad} uds.
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.stockEmpty}>Este producto no tiene registros de inventario.</Text>
      )}
    </View>
  );
}

function PriceCell({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.priceCell}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={styles.priceValue}>Bs. {value.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.md,
  },
  btnPressed: {
    opacity: 0.7,
  },

  // Permiso
  permissionIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTitle: {
    fontSize: fontSize.headline,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
    textAlign: 'center',
  },
  permissionBody: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    textAlign: 'center',
  },
  permissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: space.xl,
    borderRadius: button.radius,
    marginTop: space.sm,
  },
  permissionBtnText: {
    color: colors.white,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
  },

  // Cámara
  cameraBox: {
    height: 260,
    backgroundColor: '#0b0f14',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 230,
    height: 150,
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: colors.primary,
  },
  cornerTop: {
    top: 0,
    borderTopWidth: 3,
  },
  cornerBottom: {
    bottom: 0,
    borderBottomWidth: 3,
  },
  cornerLeft: {
    left: 0,
    borderLeftWidth: 3,
  },
  cornerRight: {
    right: 0,
    borderRightWidth: 3,
  },
  torchBtn: {
    position: 'absolute',
    top: space.md,
    right: space.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  torchBtnOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusPill: {
    position: 'absolute',
    bottom: space.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  statusPillText: {
    color: colors.white,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansSemiBold,
  },

  // Contenido
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: space.lg,
    gap: space.lg,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    padding: space.md,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: space['3xl'],
    gap: space.sm,
  },
  emptyTitle: {
    fontSize: fontSize.headline,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  emptyHint: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Tarjeta de resultado
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.sm,
  },
  cardWarning: {
    borderColor: colors.warning,
  },
  cardDanger: {
    borderColor: colors.danger,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'flex-start',
  },
  cardHeaderText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: fontSize.bodyStrong,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
  },
  thumbPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: space.xs,
    marginTop: space.xs,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
    padding: space.md,
  },
  noticeText: {
    flex: 1,
    color: colors.danger,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  codeLabel: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
  },
  codeValue: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.monoBold,
    color: colors.text,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: space.xs,
  },
  sectionLabel: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  priceCell: {
    flexGrow: 1,
    minWidth: 96,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: space.md,
    gap: 2,
  },
  priceLabel: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
  },
  priceValue: {
    fontSize: fontSize.data,
    fontFamily: fontFamily.sansBold,
    color: colors.text,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 3,
  },
  stockName: {
    flex: 1,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.text,
  },
  stockQty: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.emerald,
  },
  stockQtyOut: {
    color: colors.danger,
  },
  stockEmpty: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
  },

  // Historial
  section: {
    gap: space.xs,
  },
  sectionTitle: {
    fontSize: fontSize.bodyStrong,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    minHeight: 56,
  },
  listRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  listRowInfo: {
    flex: 1,
  },
  listRowTitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  listRowSubtitle: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.mono,
    color: colors.textMuted,
  },
  listRowQty: {
    fontSize: fontSize.data,
    fontFamily: fontFamily.sansBold,
    color: colors.emerald,
  },
  listRowQtyOut: {
    color: colors.danger,
  },
});
