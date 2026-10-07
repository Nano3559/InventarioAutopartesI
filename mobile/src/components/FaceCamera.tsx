import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
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
import type { ArchivoLocal, RecorteCara } from '../api/client';

const NEGRO = '#000000';

/**
 * Mapea el óvalo de la guía (visto en la caja de la cámara) a un **cuadrado
 * centrado** en las coordenadas de la foto que se acaba de capturar.
 *
 * El preview de `CameraView` rellena su caja recortando la foto (aspectFill),
 * siempre centrado: por eso el centro del óvalo ~ centro de la foto y no hace
 * falta rastrear el offset. Se devuelve el cuadrado más grande que cabe, con el
 * tamaño del diámetro del óvalo convertido a píxeles de foto.
 */
function recorteDelOvalo(
  caja: { ancho: number; alto: number },
  anchoFoto: number,
  altoFoto: number,
  anchoOvalo: number,
  altoOvalo: number,
): RecorteCara | undefined {
  if (caja.ancho <= 0 || caja.alto <= 0 || !anchoFoto || !altoFoto) return undefined;
  const escala = Math.max(caja.ancho / anchoFoto, caja.alto / altoFoto);
  const diametroOvaloEnFoto = Math.max(anchoOvalo, altoOvalo) / escala;
  const tamano = Math.max(
    64,
    Math.min(anchoFoto, altoFoto, Math.round(diametroOvaloEnFoto)),
  );
  return {
    x: Math.round((anchoFoto - tamano) / 2),
    y: Math.round((altoFoto - tamano) / 2),
    tamano,
  };
}

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
  /** Acepta un array de estilos: la altura de la cámara depende del ancho. */
  style?: StyleProp<ViewStyle>;
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
  const [captureFailed, setCaptureFailed] = useState(false);
  const [tomando, setTomando] = useState(false);
  const [caja, setCaja] = useState({ ancho: 0, alto: 0 });
  const camaraRef = useRef<CameraView | null>(null);
  const ocupada = capturing || bloqueada || tomando;

  /**
   * El óvalo se dimensiona contra la caja real de la cámara y no con valores
   * fijos: la misma pantalla se usa en vertical (cámara angosta y alta) y en
   * horizontal sobre una tablet (cámara ancha y baja), y un óvalo de 220×280
   * fijo tapaba el encuadre en la segunda.
   */
  const medir = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCaja((prev) =>
      Math.abs(prev.ancho - width) < 1 && Math.abs(prev.alto - height) < 1
        ? prev
        : { ancho: width, alto: height },
    );
  }, []);

  const altoOvalo = Math.max(120, Math.min(320, Math.round(caja.alto * 0.66)));
  const anchoOvalo = Math.round(altoOvalo * 0.79);

  const capture = useCallback(async () => {
    if (!camaraRef.current || ocupada) return;
    setTomando(true);
    setCaptureFailed(false);
    try {
      const foto = await camaraRef.current.takePictureAsync({ quality: 0.8 });
      if (foto?.uri) {
        onCaptura({
          uri: foto.uri,
          name: `rostro-${Date.now()}.jpg`,
          type: 'image/jpeg',
          recorte: recorteDelOvalo(
            caja,
            foto.width,
            foto.height,
            anchoOvalo,
            altoOvalo,
          ),
        });
      } else {
        setCaptureFailed(true);
      }
    } catch {
      // Sin feedback la toma fallida es un botón mudo: el operador aprieta y no
      // pasa nada, que se lee como "la cámara no sirve". Mejor decirlo corto.
      setCaptureFailed(true);
    } finally {
      setTomando(false);
    }
  }, [caja, altoOvalo, anchoOvalo, ocupada, onCaptura]);

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
        {permission.canAskAgain ? (
          <Pressable
            style={({ pressed }) => [styles.permBtn, pressed && styles.pressed]}
            onPress={requestPermission}
            accessibilityRole={a11y.button}
            accessibilityLabel="Autorizar cámara"
          >
            <Text style={styles.permBtnText}>Autorizar cámara</Text>
          </Pressable>
        ) : (
          // Sin `canAskAgain` el botón "Autorizar" ya no abre el diálogo del sistema:
          // para que el error sea claro hay que mandar al operador a los ajustes.
          <Text style={styles.permDenied}>
            El permiso de la cámara fue denegado. Activalo en los ajustes del sistema para
            poder registrar el rostro.
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} onLayout={medir}>
      <CameraView
        ref={camaraRef}
        style={styles.camera}
        facing={facing}
        enableTorch={torch}
        onMountError={(event) => setMountError(event.message)}
      />

      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.guideWrap}>
          <View
            style={[
              styles.guideOval,
              { width: anchoOvalo, height: altoOvalo, borderRadius: anchoOvalo / 2 },
            ]}
          />
          <Text
            style={[
              styles.guideText,
              caja.ancho > 0
                ? { maxWidth: Math.max(160, caja.ancho - space['4xl']) }
                : null,
            ]}
          >
            {guideLabel}
          </Text>
        </View>
      </View>

      {contador ? (
        <View style={styles.contadorPill}>
          <Text style={styles.contadorText}>{contador}</Text>
        </View>
      ) : null}

      {/* La linterna solo existe en la cámara trasera: la delantera no tiene led.
          Mostrar el botón en el registro/marcaje (siempre frontal) sería un botón
          que no hace nada, que leído como un error de la app. */}
      {facing === 'back' ? (
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
      ) : null}

      {mountError || captureFailed ? (
        <View style={styles.errorBox} accessibilityRole={a11y.alert}>
          <Text style={styles.errorTitle}>
            {mountError ? 'No se pudo abrir la cámara' : 'No se pudo tomar la foto'}
          </Text>
          <Text style={styles.errorText}>
            {captureFailed
              ? 'Intentá de nuevo. Si sigue fallando, cerrá y volvé a abrir la pantalla.'
              : mountError}
          </Text>
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
    gap: space.xs,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: fontSize.captionStrong,
    fontFamily: fontFamily.sansSemiBold,
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
  permDenied: {
    color: colors.danger,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansSemiBold,
    lineHeight: fontSize.caption * lineHeight.relaxed,
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