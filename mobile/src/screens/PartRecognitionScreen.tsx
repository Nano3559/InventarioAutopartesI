import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type DimensionValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { predictPart } from '../api/part-recognition';
import type {
  RecognitionImage,
  RecognitionResult,
} from '../types/recognition';
import Header from '../components/Header';
import {
  breakpoints,
  colors,
  fontFamily,
  fontSize,
  iconSize,
  lineHeight,
  opacity,
  radius,
  shadows,
  space,
  touchTarget,
} from '../theme';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const confidenceLabels = {
  high: 'Confianza alta',
  medium: 'Confianza media',
  low: 'Confianza baja',
} as const;

function percentage(value: number): string {
  const bounded = Math.min(99.9, Math.max(0, value * 100));
  return `${bounded.toLocaleString('es-BO', { maximumFractionDigits: 1 })}%`;
}

function fallbackName(type: string): string {
  if (type === 'image/png') return 'autoparte.png';
  if (type === 'image/webp') return 'autoparte.webp';
  return 'autoparte.jpg';
}

export default function PartRecognitionScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width >= breakpoints.tablet;
  const [image, setImage] = useState<RecognitionImage | null>(null);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function selectAsset(asset: ImagePicker.ImagePickerAsset) {
    const type = asset.mimeType ?? 'image/jpeg';
    if (!ALLOWED_TYPES.includes(type)) {
      setError('Selecciona una imagen JPG, PNG o WebP.');
      return;
    }
    if (asset.fileSize != null && asset.fileSize > MAX_IMAGE_BYTES) {
      setError('La imagen debe pesar como máximo 10 MB.');
      return;
    }
    if (!asset.uri) {
      setError('No se pudo leer la imagen seleccionada. Prueba con otra.');
      return;
    }
    setImage({
      uri: asset.uri,
      name: asset.fileName ?? fallbackName(type),
      type,
      size: asset.fileSize,
    });
    setResult(null);
    setError(null);
  }

  async function takePhoto() {
    if (busy) return;
    setError(null);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Necesitamos acceso a la cámara para fotografiar la autoparte.');
        return;
      }
      const picked = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
      });
      if (!picked.canceled && picked.assets[0]) selectAsset(picked.assets[0]);
    } catch {
      setError('No se pudo abrir la cámara. Intenta nuevamente.');
    }
  }

  async function pickFromGallery() {
    if (busy) return;
    setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Necesitamos acceso a tus fotos para elegir una imagen.');
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });
      if (!picked.canceled && picked.assets[0]) selectAsset(picked.assets[0]);
    } catch {
      setError('No se pudo abrir la galería. Intenta nuevamente.');
    }
  }

  async function analyze() {
    if (!image || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await predictPart(image, token));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo analizar la imagen. Intenta nuevamente.',
      );
    } finally {
      setBusy(false);
    }
  }

  function clearImage() {
    if (busy) return;
    setImage(null);
    setResult(null);
    setError(null);
  }

  const part = result?.prediction.class_info;
  const confidence = result?.prediction.confidence ?? 0;
  const progressWidth = `${Math.min(100, Math.max(0, confidence * 100))}%` as DimensionValue;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="Reconocimiento IA"
        subtitle="Identifica autopartes con una fotografía"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.columns, isTablet && styles.columnsTablet]}>
          <View style={styles.column}>
            <View style={styles.introCard}>
              <View style={styles.introIcon}>
                <Ionicons name="scan" size={iconSize.xl} color={colors.primaryStrong} />
              </View>
              <View style={styles.flexText}>
                <Text style={styles.introTitle}>Fotografía del repuesto</Text>
                <Text style={styles.introText}>
                  Ubica la pieza completa sobre un fondo limpio y con buena iluminación.
                </Text>
              </View>
            </View>

            {image ? (
              <View style={styles.previewCard}>
                <View style={styles.previewFrame}>
                  <Image
                    source={{ uri: image.uri }}
                    style={styles.previewImage}
                    resizeMode="cover"
                    accessibilityLabel="Fotografía seleccionada de la autoparte"
                    onError={() => {
                      setImage(null);
                      setResult(null);
                      setError('No se pudo leer la imagen. Selecciona otra fotografía.');
                    }}
                  />
                  <View style={styles.readyBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.readyText}>Lista para analizar</Text>
                  </View>
                </View>
                <Text style={styles.fileName} numberOfLines={1}>{image.name}</Text>
                <View style={styles.smallActions}>
                  <Pressable
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                    onPress={pickFromGallery}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel="Cambiar fotografía"
                  >
                    <Ionicons name="images-outline" size={18} color={colors.primaryStrong} />
                    <Text style={styles.secondaryButtonText}>Cambiar</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                    onPress={clearImage}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel="Eliminar fotografía"
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    <Text style={styles.deleteButtonText}>Eliminar</Text>
                  </Pressable>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.analyzeButton,
                    busy && styles.disabled,
                    pressed && !busy && styles.pressed,
                  ]}
                  onPress={analyze}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="Identificar repuesto"
                  accessibilityState={{ busy, disabled: busy }}
                >
                  {busy ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Ionicons name="sparkles" size={20} color={colors.white} />
                  )}
                  <Text style={styles.analyzeButtonText}>
                    {busy ? 'Analizando imagen...' : 'Identificar repuesto'}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.uploadCard}>
                <View style={styles.uploadIcon}>
                  <Ionicons name="image-outline" size={44} color={colors.primary} />
                </View>
                <Text style={styles.uploadTitle}>Agrega una imagen clara</Text>
                <Text style={styles.uploadText}>JPG, PNG o WebP · Máximo 10 MB</Text>
                <View style={styles.uploadActions}>
                  <Pressable
                    style={({ pressed }) => [styles.cameraButton, pressed && styles.pressed]}
                    onPress={takePhoto}
                    accessibilityRole="button"
                    accessibilityLabel="Tomar fotografía"
                  >
                    <Ionicons name="camera" size={21} color={colors.white} />
                    <Text style={styles.cameraButtonText}>Tomar foto</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.galleryButton, pressed && styles.pressed]}
                    onPress={pickFromGallery}
                    accessibilityRole="button"
                    accessibilityLabel="Elegir fotografía de la galería"
                  >
                    <Ionicons name="images" size={21} color={colors.primaryStrong} />
                    <Text style={styles.galleryButtonText}>Galería</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {error ? (
              <View style={styles.errorCard} accessibilityRole="alert">
                <Ionicons name="alert-circle" size={22} color={colors.danger} />
                <View style={styles.flexText}>
                <Text style={styles.errorTitle}>No pudimos completar el análisis</Text>
                  <Text style={styles.errorText}>{error}</Text>
                  {image ? (
                    <Pressable
                      style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
                      onPress={analyze}
                      disabled={busy}
                      accessibilityRole="button"
                    >
                      <Ionicons name="refresh" size={16} color={colors.danger} />
                      <Text style={styles.retryText}>Reintentar</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.column} accessibilityLiveRegion="polite">
            {busy ? (
              <View style={styles.stateCard}>
                <View style={styles.loadingRing}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
                <Text style={styles.stateTitle}>Analizando la pieza</Text>
                <Text style={styles.stateText}>
                  Estamos comparando tu fotografía con las clases aprendidas por el modelo.
                </Text>
              </View>
            ) : result && part ? (
              <View style={styles.resultsStack}>
                <View style={styles.resultCard}>
                  <View style={styles.resultTopRow}>
                    <View style={[
                      styles.confidenceBadge,
                      result.confidence_state === 'high'
                        ? styles.confidenceHigh
                        : result.confidence_state === 'medium'
                          ? styles.confidenceMedium
                          : styles.confidenceLow,
                    ]}>
                      <View style={[
                        styles.confidenceDot,
                        result.confidence_state === 'high'
                          ? styles.dotHigh
                          : result.confidence_state === 'medium'
                            ? styles.dotMedium
                            : styles.dotLow,
                      ]} />
                      <Text style={styles.confidenceBadgeText}>
                        {confidenceLabels[result.confidence_state]}
                      </Text>
                    </View>
                    <Ionicons name="sparkles" size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.resultEyebrow}>COINCIDENCIA PRINCIPAL</Text>
                  <Text style={styles.partName}>{part.spanish_name || part.original_name}</Text>
                  {part.spanish_name ? (
                    <Text style={styles.originalName}>Clase original: {part.original_name}</Text>
                  ) : null}
                  <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Confianza de la predicción</Text>
                    <Text style={styles.scoreValue}>{percentage(confidence)}</Text>
                  </View>
                  <View
                    style={styles.progressTrack}
                    accessibilityRole="progressbar"
                    accessibilityValue={{ min: 0, max: 100, now: Math.round(confidence * 100) }}
                  >
                    <View style={[styles.progressFill, { width: progressWidth }]} />
                  </View>
                  <View style={result.conclusive ? styles.conclusiveBox : styles.inconclusiveBox}>
                    <Ionicons
                      name={result.conclusive ? 'checkmark-circle' : 'information-circle'}
                      size={19}
                      color={result.conclusive ? colors.success : colors.warning}
                    />
                    <Text style={styles.conclusionText}>
                      {result.conclusive
                        ? 'Esta es la clase más probable. La predicción puede contener errores.'
                        : 'Resultado no concluyente. Prueba otra foto y revisa las alternativas.'}
                    </Text>
                  </View>
                </View>

                <View style={styles.alternativesCard}>
                  <Text style={styles.sectionTitle}>Mejores coincidencias</Text>
                  <Text style={styles.sectionHint}>Las tres clases más probables</Text>
                  <View style={styles.predictionsList}>
                    {result.top_predictions.slice(0, 3).map((prediction, index) => (
                      <View style={styles.predictionRow} key={`${prediction.class_info.id}-${index}`}>
                        <View style={[styles.rank, index === 0 && styles.rankFirst]}>
                          <Text style={[styles.rankText, index === 0 && styles.rankTextFirst]}>{index + 1}</Text>
                        </View>
                        <View style={styles.predictionInfo}>
                          <Text style={styles.predictionName} numberOfLines={2}>
                            {prediction.class_info.spanish_name || prediction.class_info.original_name}
                          </Text>
                          {prediction.class_info.spanish_name ? (
                            <Text style={styles.predictionOriginal} numberOfLines={1}>
                              {prediction.class_info.original_name}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={styles.predictionScore}>{percentage(prediction.confidence)}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.disclaimerCard}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
                  <Text style={styles.disclaimerText}>
                    La clasificación corresponde al dataset. No determina compatibilidad, precio ni existencias del catálogo.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.stateCard}>
                <View style={styles.emptyIllustration}>
                  <Ionicons name="scan-outline" size={52} color={colors.primary} />
                </View>
                <Text style={styles.stateTitle}>Tu repuesto, identificado</Text>
                <Text style={styles.stateText}>
                  Toma una foto o elige una de tu galería para ver la coincidencia principal y otras posibilidades.
                </Text>
                <View style={styles.tipRow}>
                  <Ionicons name="sunny-outline" size={18} color={colors.warning} />
                  <Text style={styles.tipText}>Evita sombras fuertes y objetos que tapen la pieza.</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: {
    padding: space.lg,
    paddingBottom: space['3xl'],
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
  },
  columns: { gap: space.lg },
  columnsTablet: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { flex: 1, minWidth: 0, gap: space.md },
  flexText: { flex: 1, minWidth: 0 },
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.28)',
  },
  introIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  introTitle: { color: colors.text, fontSize: fontSize.bodyStrong, fontFamily: fontFamily.sansSemiBold },
  introText: { color: colors.textMuted, fontSize: fontSize.caption, fontFamily: fontFamily.sans, lineHeight: 18, marginTop: 2 },
  uploadCard: {
    minHeight: 310,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    ...shadows.level1,
  },
  uploadIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    marginBottom: space.lg,
  },
  uploadTitle: { color: colors.text, fontSize: fontSize.headline, fontFamily: fontFamily.sansSemiBold, textAlign: 'center' },
  uploadText: { color: colors.textMuted, fontSize: fontSize.caption, fontFamily: fontFamily.sans, marginTop: space.xs, textAlign: 'center' },
  uploadActions: { flexDirection: 'row', gap: space.sm, width: '100%', marginTop: space.xl },
  cameraButton: {
    flex: 1,
    minHeight: touchTarget.buttonHeight.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
  },
  cameraButtonText: { color: colors.white, fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold },
  galleryButton: {
    flex: 1,
    minHeight: touchTarget.buttonHeight.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
  },
  galleryButtonText: { color: colors.primaryStrong, fontSize: fontSize.body, fontFamily: fontFamily.sansSemiBold },
  previewCard: {
    padding: space.md,
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.level1,
  },
  previewFrame: { aspectRatio: 4 / 3, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.border, position: 'relative' },
  previewImage: { width: '100%', height: '100%' },
  readyBadge: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  readyText: { color: colors.text, fontSize: fontSize.caption, fontFamily: fontFamily.sansSemiBold },
  fileName: { color: colors.textMuted, fontSize: fontSize.caption, fontFamily: fontFamily.sans, textAlign: 'center' },
  smallActions: { flexDirection: 'row', gap: space.sm },
  secondaryButton: {
    flex: 1,
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  secondaryButtonText: { color: colors.primaryStrong, fontSize: fontSize.caption, fontFamily: fontFamily.sansSemiBold },
  deleteButton: {
    flex: 1,
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
  },
  deleteButtonText: { color: colors.danger, fontSize: fontSize.caption, fontFamily: fontFamily.sansSemiBold },
  analyzeButton: {
    minHeight: touchTarget.buttonHeight.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primaryStrong,
    ...shadows.level2,
  },
  analyzeButtonText: { color: colors.white, fontSize: fontSize.body, fontFamily: fontFamily.sansBold },
  pressed: { opacity: opacity.pressed },
  disabled: { opacity: opacity.disabled },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: colors.dangerSoft,
  },
  errorTitle: { color: colors.text, fontSize: fontSize.captionStrong, fontFamily: fontFamily.sansSemiBold },
  errorText: { color: colors.textMuted, fontSize: fontSize.caption, fontFamily: fontFamily.sans, lineHeight: 18, marginTop: 2 },
  retryButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: space.xs, alignSelf: 'flex-start', marginTop: space.sm, paddingHorizontal: space.sm },
  retryText: { color: colors.danger, fontSize: fontSize.caption, fontFamily: fontFamily.sansSemiBold },
  stateCard: {
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    ...shadows.level1,
  },
  loadingRing: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, marginBottom: space.lg },
  emptyIllustration: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, marginBottom: space.lg },
  stateTitle: { color: colors.text, fontSize: fontSize.title, fontFamily: fontFamily.sansBold, textAlign: 'center' },
  stateText: { color: colors.textMuted, fontSize: fontSize.body, fontFamily: fontFamily.sans, lineHeight: lineHeight.body, textAlign: 'center', marginTop: space.sm, maxWidth: 380 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xl, padding: space.md, borderRadius: radius.md, backgroundColor: colors.warningSoft },
  tipText: { flex: 1, minWidth: 0, color: colors.text, fontSize: fontSize.caption, fontFamily: fontFamily.sans, lineHeight: 18 },
  resultsStack: { gap: space.md },
  resultCard: { padding: space.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.card, ...shadows.level2 },
  resultTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  confidenceBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.sm, paddingVertical: 6, borderRadius: radius.full },
  confidenceHigh: { backgroundColor: colors.successSoft },
  confidenceMedium: { backgroundColor: colors.warningSoft },
  confidenceLow: { backgroundColor: colors.dangerSoft },
  confidenceDot: { width: 7, height: 7, borderRadius: 4 },
  dotHigh: { backgroundColor: colors.success },
  dotMedium: { backgroundColor: colors.warning },
  dotLow: { backgroundColor: colors.danger },
  confidenceBadgeText: { color: colors.text, fontSize: fontSize.caption, fontFamily: fontFamily.sansSemiBold },
  resultEyebrow: { color: colors.primaryStrong, fontSize: 11, fontFamily: fontFamily.sansBold, letterSpacing: 0.8, marginTop: space.lg },
  partName: { color: colors.text, fontSize: fontSize.display, fontFamily: fontFamily.sansBold, lineHeight: 34, marginTop: space.xs },
  originalName: { color: colors.textMuted, fontSize: fontSize.caption, fontFamily: fontFamily.sans, marginTop: space.xs },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginTop: space.xl },
  scoreLabel: { flex: 1, minWidth: 0, color: colors.textMuted, fontSize: fontSize.caption, fontFamily: fontFamily.sans },
  scoreValue: { color: colors.primaryStrong, fontSize: fontSize.dataLg, fontFamily: fontFamily.sansBold },
  progressTrack: { height: 8, borderRadius: radius.full, backgroundColor: colors.border, overflow: 'hidden', marginTop: space.sm },
  progressFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.primary },
  conclusiveBox: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.successSoft, marginTop: space.lg },
  inconclusiveBox: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.warningSoft, marginTop: space.lg },
  conclusionText: { flex: 1, minWidth: 0, color: colors.text, fontSize: fontSize.caption, fontFamily: fontFamily.sans, lineHeight: 18 },
  alternativesCard: { padding: space.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, ...shadows.level1 },
  sectionTitle: { color: colors.text, fontSize: fontSize.headline, fontFamily: fontFamily.sansSemiBold },
  sectionHint: { color: colors.textMuted, fontSize: fontSize.caption, fontFamily: fontFamily.sans, marginTop: 2 },
  predictionsList: { marginTop: space.md },
  predictionRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 64, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rank: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.systemSecondaryContainer },
  rankFirst: { backgroundColor: colors.primary },
  rankText: { color: colors.textMuted, fontSize: fontSize.caption, fontFamily: fontFamily.sansBold },
  rankTextFirst: { color: colors.white },
  predictionInfo: { flex: 1, minWidth: 0 },
  predictionName: { color: colors.text, fontSize: fontSize.captionStrong, fontFamily: fontFamily.sansSemiBold },
  predictionOriginal: { color: colors.textMuted, fontSize: 11, fontFamily: fontFamily.sans, marginTop: 2 },
  predictionScore: { color: colors.primaryStrong, fontSize: fontSize.bodyStrong, fontFamily: fontFamily.sansBold },
  disclaimerCard: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.systemSecondaryContainer },
  disclaimerText: { flex: 1, minWidth: 0, color: colors.textMuted, fontSize: fontSize.caption, fontFamily: fontFamily.sans, lineHeight: 18 },
});
