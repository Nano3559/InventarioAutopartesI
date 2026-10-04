import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  colors,
  space,
  radius,
  fontFamily,
  fontSize,
  lineHeight,
  shadows,
  button,
  iconSize,
  a11y,
  opacity,
} from '../theme';
import type { ArchivoLocal } from '../api/client';

const NEGRO = '#000000';

interface FaceCameraProps {
  /** Se avisa al padre con cada foto capturada, ya lista para el multipart. */
  onCaptura: (foto: ArchivoLocal) => void;
  /** Bloquea la captura mientras se hace otra cosa (p. ej. durante el envío). */
  capturing?: boolean;
  /** Cuando el padre ya no admite más fotos. */
  bloqueada?: boolean;
  facing?: CameraType;
  /** Texto de la guía: dice qué tiene que encuadrar el operador. */
  guideLabel?: string;
  /** Contador sobre la cámara, p. ej. "2 de 5". */
  contador?: string;
  style?: ViewStyle;
}

/**
 * Cámara con encuadre guiado para rostros.
 *
 * No hay modelo detector de rostros: ArcFace espera un recorte de 112×112 y el backend
 * ya recorta, rota por EXIF y normaliza. Acá solo se le pide a la persona que ponga el
 * rostro dentro del óvalo, que es lo que hace que esos recortes sirvan.
 *
 * Permiso, linterna y captura viven acá porque el registro de rostros (R2) y el marcaje
 * de asistencia (R4) necesitan exactamente lo mismo, y duplicarlo fue lo que rompió el
 * escáner de códigos antes.
 */
export default function FaceCamera({
  onCaptura,
  capturing = false,
  bloqueada = false,
  facing = 'front',
  guideLabel = 'Encadre el rostro dentro del óvalo',
  contador,
  style,
}: FaceCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const [tomando, setTomando] = useState(false);
  const camaraRef = useRef<CameraView | null>(null);
  const ocupada = capturing || bloqueada || tomando;

  const capture = useCallback(async () => {
    if (!camaraRef.current || ocupada) return;
    setTomando(true);
    try {
      const foto = await camaraRef.current.takePictureAsync({ quality: 0.8 });
      if (foto?.uri) {
        onCaptura({
          uri: foto.uri,
          name: `rostro-${Date.now()}.jpg`,
          type: 'image/jpeg',
        });
      }
    } catch {
      // Si la toma falla no hay nada que reportar: el operador sigue encuadrando.
    } finally {
      setTomando(false);
    }
  }, [ocupada, onCaptura]);

  if (!permission) {
    return (
      <View style={[styles.permBox, style]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permBox, style]}>
        <Ionicons name="camera-outline" size={iconSize.xl} color={colors.textMuted} />
        <Text style={styles.permTitle}>Se necesita la cámara</Text>
        <Text style={styles.permText}>
          Para registrar el rostro hay que tomar fotos con la cámara del celular. La imagen se
          usa solo para el reconocimiento de asistencia.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.permBtn, pressed && styles.pressed]}
          onPress={requestPermission}
          accessibilityRole={a11y.button}
          accessibilityLabel="Autorizar cámara"
        >
          <Text style={styles.permBtnText}>Autorizar cámara</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <CameraView
        ref={camaraRef}
        style={styles.camera}
        facing={facing}
        enableTorch={torch}
        onMountError={(event) => setMountError(event.message)}
      />

      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.guideWrap}>
          <View style={styles.guideOval} />
          <Text style={styles.guideText}>{guideLabel}</Text>
        </View>
      </View>

      {contador ? (
        <View style={styles.contadorPill}>
          <Text style={styles.contadorText}>{contador}</Text>
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.torchBtn, pressed && styles.pressed]}
        onPress={() => setTorch((v) => !v)}
        accessibilityRole={a11y.button}
        accessibilityLabel={torch ? 'Apagar linterna' : 'Encender linterna'}
      >
        <Ionicons
          name={torch ? 'flash' : 'flash-off'}
          size={iconSize.md}
          color={colors.white}
        />
      </Pressable>

      {mountError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{mountError}</Text>
        </View>
      ) : null}

      <View style={styles.controls} pointerEvents="box-none">
        {tomando || capturing ? (
          <View style={styles.procesandoPill}>
            <ActivityIndicator size="small" color={colors.white} />
            <Text style={styles.procesandoText}>
              {capturing ? 'Registrando rostro...' : 'Tomando foto...'}
            </Text>
          </View>
        ) : null}
        <Pressable
          style={({ pressed }) => [
            styles.shutter,
            ocupada && styles.shutterDisabled,
            pressed && styles.pressed,
          ]}
          onPress={capture}
          disabled={ocupada}
          accessibilityRole={a11y.button}
          accessibilityLabel="Tomar foto del rostro"
          accessibilityState={{ disabled: ocupada }}
        >
          <Ionicons name="camera" size={iconSize.xl} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: NEGRO,
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
  guideWrap: {
    alignItems: 'center',
    gap: space.md,
  },
  guideOval: {
    width: 220,
    height: 280,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: colors.white,
    borderStyle: 'dashed',
    opacity: opacity.hover,
  },
  guideText: {
    color: colors.white,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    lineHeight: fontSize.caption * lineHeight.relaxed,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.sm,
    overflow: 'hidden',
    textAlign: 'center',
  },
  contadorPill: {
    position: 'absolute',
    top: space.md,
    left: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  contadorText: {
    color: colors.white,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.monoMedium,
  },
  torchBtn: {
    position: 'absolute',
    top: space.md,
    right: space.md,
    width: button.height.md,
    height: button.height.md,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  errorBox: {
    position: 'absolute',
    top: 64,
    left: space.md,
    right: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
  },
  controls: {
    position: 'absolute',
    bottom: space.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: space.md,
  },
  procesandoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  procesandoText: {
    color: colors.white,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.white,
  },
  shutterDisabled: {
    opacity: opacity.disabled,
  },
  pressed: {
    opacity: opacity.pressed,
  },
  permBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.xl,
    backgroundColor: colors.bg,
  },
  permTitle: {
    color: colors.text,
    fontSize: fontSize.title,
    fontFamily: fontFamily.sansBold,
  },
  permText: {
    color: colors.textMuted,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sans,
    lineHeight: fontSize.body * lineHeight.relaxed,
    textAlign: 'center',
  },
  permBtn: {
    ...shadows.level1,
    paddingHorizontal: space.xl,
    height: button.height.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  permBtnText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
  },
});