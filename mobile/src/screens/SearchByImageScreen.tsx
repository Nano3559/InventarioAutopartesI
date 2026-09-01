import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { searchByImage, type ImageSearchResult } from '../api/products';
import { getToken } from '../storage/token';
import {
  colors,
  space,
  radius,
  fontFamily,
  fontSize,
  lineHeight,
  button,
  componentStyles,
  shadows,
  iconSize,
} from '../theme';
import { Header } from '../components';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function SearchByImageScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('photo.jpg');
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [results, setResults] = useState<ImageSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState<string | null>(null);

  const showToast = (message: string) => {
    setPermissionDenied(message);
    setTimeout(() => setPermissionDenied(null), 3000);
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast('Necesitamos acceso a la cámara para tomar fotos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setFileName(asset.fileName || 'photo.jpg');
      setMimeType(asset.mimeType || 'image/jpeg');
      setResults([]);
      setError(null);
      setHasSearched(false);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('Necesitamos acceso a la galería para seleccionar imágenes.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setFileName(asset.fileName || 'photo.jpg');
      setMimeType(asset.mimeType || 'image/jpeg');
      setResults([]);
      setError(null);
      setHasSearched(false);
    }
  };

  const handleSearch = async () => {
    if (!imageUri) return;
    setSearching(true);
    setError(null);
    setHasSearched(true);
    try {
      const token = await getToken();
      const data = await searchByImage(imageUri, fileName, mimeType, token ?? undefined);
      setResults(data);
    } catch (err: any) {
      setError(err?.message || 'Error al buscar productos');
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleClear = () => {
    setImageUri(null);
    setResults([]);
    setError(null);
    setHasSearched(false);
  };

  const renderResult = ({ item, index }: { item: ImageSearchResult; index: number }) => (
    <View style={styles.resultCard}>
      <Image
        source={{
          uri: item.product.imagen || `https://placehold.co/80x80/141b24/8b96a5?text=${index + 1}`,
        }}
        style={styles.resultThumb}
      />
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>{item.product.producto}</Text>
        <Text style={styles.resultDetail}>
          {item.product.marca} · {item.product.modelo} · {item.product.codigoFabrica}
        </Text>
        {item.product.codigoOem ? (
          <Text style={styles.resultDetail}>OEM: {item.product.codigoOem}</Text>
        ) : null}
        <View style={styles.resultBadges}>
          <View style={styles.badgeSimilitud}>
            <Text style={styles.badgeSimilitudText}>{item.similitud}%</Text>
          </View>
          <View style={[styles.badgeStock, item.stockTotal <= 0 && styles.badgeStockCritical]}>
            <Text style={[styles.badgeStockText, item.stockTotal <= 0 && styles.badgeStockTextCritical]}>
              Stock: {item.stockTotal}
            </Text>
          </View>
        </View>
        <View style={styles.resultPrices}>
          {item.product.precio1 != null ? (
            <Text style={styles.priceText}>P1: Bs. {item.product.precio1.toFixed(2)}</Text>
          ) : null}
          {item.product.precio2 != null ? (
            <Text style={styles.priceText}>P2: Bs. {item.product.precio2.toFixed(2)}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Búsqueda por Imagen" onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Upload Zone */}
        {!imageUri ? (
          <View style={styles.uploadZone}>
            <View style={styles.uploadIconCircle}>
              <Ionicons name="camera-outline" size={40} color={colors.primary} />
            </View>
            <Text style={styles.uploadText}>Busque productos por imagen</Text>
            <Text style={styles.uploadHint}>Tome una foto o seleccione de la galería</Text>
            <View style={styles.uploadButtons}>
              <Pressable style={styles.uploadBtn} onPress={pickFromCamera}>
                <Ionicons name="camera" size={20} color={colors.white} />
                <Text style={styles.uploadBtnText}>Cámara</Text>
              </Pressable>
              <Pressable style={[styles.uploadBtn, styles.uploadBtnSecondary]} onPress={pickFromGallery}>
                <Ionicons name="images" size={20} color={colors.primary} />
                <Text style={[styles.uploadBtnText, styles.uploadBtnTextSecondary]}>Galería</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            {/* Preview + Actions */}
            <View style={styles.previewCard}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
              <View style={styles.previewActions}>
                <Pressable
                  style={[styles.searchBtn, searching && styles.searchBtnDisabled]}
                  onPress={handleSearch}
                  disabled={searching}
                >
                  {searching ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Ionicons name="search" size={18} color={colors.white} />
                  )}
                  <Text style={styles.searchBtnText}>
                    {searching ? 'Buscando...' : 'Buscar productos'}
                  </Text>
                </Pressable>
                <Pressable style={styles.clearBtn} onPress={handleClear} disabled={searching}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Loading */}
            {searching && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Analizando imagen...</Text>
              </View>
            )}

            {/* Results */}
            {!searching && hasSearched && results.length === 0 && !error && (
              <View style={styles.emptyBox}>
                <Ionicons name="search-outline" size={36} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Sin coincidencias</Text>
                <Text style={styles.emptyHint}>Intente con otra imagen</Text>
              </View>
            )}

            {!searching && results.length > 0 && (
              <>
                <Text style={styles.resultsHeader}>
                  {results.length} producto(s) encontrado(s)
                </Text>
                {results.map((r, idx) => (
                  <View key={r.product.id}>
                    {renderResult({ item: r, index: idx })}
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {permissionDenied && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{permissionDenied}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: space.lg,
    gap: space.xl,
  },

  // Upload Zone
  uploadZone: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: space['4xl'],
    paddingHorizontal: space.xl,
    alignItems: 'center',
    gap: space.md,
  },
  uploadIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    fontSize: fontSize.headline,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
    textAlign: 'center',
  },
  uploadHint: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.sm,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: space.xl,
    borderRadius: button.radius,
    minWidth: 140,
  },
  uploadBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  uploadBtnText: {
    color: colors.white,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
  },
  uploadBtnTextSecondary: {
    color: colors.primary,
  },

  // Preview
  previewCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 220,
    resizeMode: 'contain',
    backgroundColor: colors.bg,
  },
  previewActions: {
    flexDirection: 'row',
    padding: space.md,
    gap: space.sm,
  },
  searchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: button.radius,
  },
  searchBtnDisabled: {
    opacity: 0.6,
  },
  searchBtnText: {
    color: colors.white,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
  },
  clearBtn: {
    width: button.height.md,
    height: button.height.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: button.radius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.crimsonSoft,
    borderWidth: 1,
    borderColor: colors.crimson,
    borderRadius: radius.sm,
    padding: space.md,
  },
  errorText: {
    flex: 1,
    color: colors.crimson,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
  },

  // Loading
  loadingBox: {
    alignItems: 'center',
    paddingVertical: space['3xl'],
    gap: space.md,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: fontSize.body,
  },

  // Empty
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
    color: colors.textMuted,
  },

  // Results
  resultsHeader: {
    fontSize: fontSize.bodyStrong,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.md,
    marginBottom: space.sm,
  },
  resultThumb: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
  },
  resultInfo: {
    flex: 1,
    gap: 2,
  },
  resultName: {
    fontSize: fontSize.bodyStrong,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  resultDetail: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  resultBadges: {
    flexDirection: 'row',
    gap: space.xs,
    marginTop: space.xs,
  },
  badgeSimilitud: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeSimilitudText: {
    color: colors.primary,
    fontSize: 11,
    fontFamily: fontFamily.sansSemiBold,
  },
  badgeStock: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeStockCritical: {
    backgroundColor: colors.crimsonSoft,
  },
  badgeStockText: {
    color: colors.emerald,
    fontSize: 11,
    fontFamily: fontFamily.sansSemiBold,
  },
  badgeStockTextCritical: {
    color: colors.crimson,
  },
  resultPrices: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.xs,
  },
  priceText: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  toast: {
    position: 'absolute',
    bottom: space.xl,
    left: space.lg,
    right: space.lg,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  toastText: {
    color: colors.white,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sans,
    textAlign: 'center',
  },
});
