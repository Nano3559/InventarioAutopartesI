import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type DimensionValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Header, PrimaryCTA, Badge } from '../components';
import FaceCamera from '../components/FaceCamera';
import {
  registrarRostro,
  listarUsuarios,
  usuariosSinRostro,
  FOTOS_MINIMO,
  FOTOS_MAXIMO,
  FOTOS_RECOMENDADAS,
  type RostroRegistrado,
  type UsuarioListado,
} from '../api/users';
import {
  ApiError,
  type ArchivoLocal,
  type ProgresoSubida,
  type ResumenUsuario,
} from '../api/client';
import { getToken } from '../storage/token';
import {
  colors,
  space,
  radius,
  fontFamily,
  fontSize,
  lineHeight,
  shadows,
  input,
  button,
  iconSize,
  a11y,
  opacity,
  touchTarget,
} from '../theme';

type Aviso =
  | { tono: 'error' | 'warning' | 'info'; titulo: string; texto: string }
  | null;

/**
 * Registro facial: asocia N fotos de un rostro a un usuario **ya creado** en `users`.
 *
 * No crea usuarios a propósito (decisión del plan). Hay dos caminos para llegar
 * al usuario, y el primero es el que se usa casi siempre:
 *
 * 1. **Elegirlo de la lista** de personal que todavía no tiene rostro. Es lo que
 *    hace la pantalla al abrir: el operador ve a quién le falta y lo toca. No
 *    hay nombres mal escritos ni homónimos, que son los dos 404/409 que
 *    frenaban el registro. Se manda `usuarioId` y el backend lo resuelve por id.
 * 2. **Escribir nombre + apellido** a mano, con el desplegable "No está en la
 *    lista". Es el respaldo para cuando la lista es larga y uno ya sabe a quién
 *    busca, y el camino del que vienen las sugerencias del 404.
 *
 * El consentimiento de la Ley 26935 va **antes** de la cámara y es obligatorio: sin el
 * tilde no se habilita la captura. Son datos biométricos y en Bolivia eso no es opcional.
 */
export default function FaceRegisterScreen() {
  const navigation = useNavigation();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [elegido, setElegido] = useState<UsuarioListado | null>(null);
  const [modoManual, setModoManual] = useState(false);
  const [pendientes, setPendientes] = useState<UsuarioListado[] | null>(null);
  const [errorPendientes, setErrorPendientes] = useState<string | null>(null);
  const [fotos, setFotos] = useState<ArchivoLocal[]>([]);
  const [consentido, setConsentido] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [candidatos, setCandidatos] = useState<ResumenUsuario[]>([]);
  const [sugerencias, setSugerencias] = useState<ResumenUsuario[]>([]);
  const [progreso, setProgreso] = useState<ProgresoSubida | null>(null);
  const [resultado, setResultado] = useState<RostroRegistrado | null>(null);

  /** A quién se le va a asociar el rostro: de la lista, o escrito a mano. */
  const hayDestino =
    elegido !== null || (nombre.trim().length > 0 && apellido.trim().length > 0);

  const completa =
    fotos.length >= FOTOS_MINIMO && hayDestino && consentido;

  /**
   * El personal que todavía no tiene rostro. Se recarga después de cada registro
   * para que la lista no ofrezca otra vez a quien ya quedó cargado.
   */
  const cargarPendientes = useCallback(async () => {
    setErrorPendientes(null);
    try {
      const token = await getToken();
      if (!token) return;
      setPendientes(usuariosSinRostro(await listarUsuarios(token)));
    } catch {
      setPendientes(null);
      setErrorPendientes(
        'No se pudo leer el personal. Podés escribir el nombre a mano.',
      );
    }
  }, []);

  useEffect(() => {
    void cargarPendientes();
  }, [cargarPendientes]);

  const agregarFoto = useCallback((foto: ArchivoLocal) => {
    setAviso(null);
    setFotos((prev) =>
      prev.length >= FOTOS_MAXIMO ? prev : [...prev, foto],
    );
  }, []);

  const quitarFoto = useCallback((indice: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== indice));
  }, []);

  /** Respaldo cuando la cámara no sirve: la persona ya tiene una foto buena del rostro. */
  const elegirDeGaleria = useCallback(async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      setAviso({
        tono: 'warning',
        titulo: 'Sin acceso a las fotos',
        texto:
          'Se necesita permiso para elegir imágenes. Podés tomar las fotos con la cámara.',
      });
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      selectionLimit: Math.max(1, FOTOS_MAXIMO - fotos.length),
    });
    if (picked.canceled) return;
    for (const asset of picked.assets) {
      if (fotos.length >= FOTOS_MAXIMO) break;
      agregarFoto({
        uri: asset.uri,
        name: asset.fileName ?? `rostro-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      });
    }
  }, [agregarFoto, fotos.length]);

  /**
   * Toca un usuario de la lista. Deja limpio el formulario a mano: son dos caminos
   * excluyentes y el `enviar` manda el `usuarioId` si hay alguien elegido.
   */
  const elegirUsuario = useCallback((u: UsuarioListado) => {
    setElegido(u);
    setNombre('');
    setApellido('');
    setModoManual(false);
    setCandidatos([]);
    setSugerencias([]);
    setAviso(null);
  }, []);

  const elegirCandidato = useCallback((nombreCompleto: string) => {
    const partes = nombreCompleto.trim().split(/\s+/);
    setNombre(partes[0] ?? '');
    setApellido(partes.slice(1).join(' '));
    setElegido(null);
    setModoManual(true);
    setCandidatos([]);
    setSugerencias([]);
    setAviso({
      tono: 'info',
      titulo: 'Nombre actualizado',
      texto: `Se registrará el rostro de ${nombreCompleto}.`,
    });
  }, []);

  const enviar = useCallback(async () => {
    if (!completa || enviando) return;
    setEnviando(true);
    setAviso(null);
    setCandidatos([]);
    setSugerencias([]);
    setProgreso(null);
    try {
      const token = await getToken();
      if (!token) {
        setAviso({
          tono: 'error',
          titulo: 'Sesión vencida',
          texto: 'Volvé a iniciar sesión para registrar un rostro.',
        });
        return;
      }
      const destino = elegido
        ? { usuarioId: elegido.id }
        : { nombre, apellido };
      const data = await registrarRostro(destino, fotos, token, (p) =>
        setProgreso(p),
      );
      setResultado(data);
      setElegido(null);
      setModoManual(false);
      setFotos([]);
    } catch (err) {
      if (err instanceof ApiError) {
        // 409 con candidatos: hay homónimos y el registro NO se hizo, hay que elegir.
        if (err.extras.candidatos?.length) {
          setCandidatos(err.extras.candidatos);
          setAviso({
            tono: 'warning',
            titulo: 'Varias personas con ese nombre',
            texto:
              'Elegí a cuál corresponde antes de continuar. El rostro no se registró todavía.',
          });
          return;
        }
        if (err.status === 404) {
          setSugerencias(err.extras.sugerencias ?? []);
          setAviso({
            tono: 'error',
            titulo: 'Usuario no encontrado',
            texto: err.extras.sugerencias?.length
              ? 'Revisá el nombre: estos son los usuarios más parecidos. Tocá uno para ' +
                'usarlo, o pedí al administrador que cree el usuario.'
              : 'El registro facial solo funciona con personal ya creado. Verificá el ' +
                'nombre y el apellido, o pedí al administrador que cree el usuario.',
          });
          return;
        }
        if (err.status === 400) {
          setAviso({
            tono: 'error',
            titulo: 'Fotos incorrectas',
            texto: err.message,
          });
          return;
        }
        setAviso({ tono: 'error', titulo: 'No se pudo registrar', texto: err.message });
        return;
      }
      setAviso({
        tono: 'error',
        titulo: 'No se pudo registrar',
        texto: 'Ocurrió un error inesperado. Intentá de nuevo.',
      });
    } finally {
      setEnviando(false);
      setProgreso(null);
    }
  }, [apellido, completa, elegido, enviando, fotos, nombre]);

  const reiniciar = useCallback(() => {
    setResultado(null);
    setFotos([]);
    setNombre('');
    setApellido('');
    setElegido(null);
    setModoManual(false);
    setConsentido(false);
    setAviso(null);
    setCandidatos([]);
    setSugerencias([]);
    // La persona recién registrada ya no tiene que aparecer en la lista.
    void cargarPendientes();
  }, [cargarPendientes]);

  /**
   * Lista de personas para que el operador elija a cuál se le asocia el rostro.
   * Sirve para los homónimos (409, `candidatos`) y para las sugerencias del 404.
   */
  const listaUsuarios = (titulo: string, items: ResumenUsuario[]) =>
    items.length ? (
      <View style={styles.candidatosBox}>
        <Text style={styles.candidatosTitulo}>{titulo}</Text>
        {items.map((c) => (
          <Pressable
            key={c.id}
            style={({ pressed }) => [
              styles.candidato,
              pressed && styles.pressed,
            ]}
            onPress={() => elegirCandidato(c.nombreCompleto)}
            accessibilityRole={a11y.button}
            accessibilityLabel={`Elegir a ${c.nombreCompleto}`}
          >
            <View style={styles.candidatoTexto}>
              <Text style={styles.candidatoNombre}>{c.nombreCompleto}</Text>
              <Text style={styles.candidatoDetalle}>
                {c.email} · {c.rol}
                {c.tieneRostro ? ' · ya tiene rostro' : ''}
                {c.activo ? '' : ' · dado de baja'}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={iconSize.md}
              color={colors.textMuted}
            />
          </Pressable>
        ))}
      </View>
    ) : null;

  const Ciclo = resultado ? 'resultado' : 'captura';

  /**
   * La cámara vive dentro del scroll, así que no puede pedir `flex: 1`: en un
   * contenido que crece no hay alto libre que repartir y el bloque se quedaba
   * pegado empujando todo lo demás fuera de pantalla. El alto sale del ancho
   * (retrato) con un techo, para que en horizontal la cámara no se lleve toda
   * la altura disponible.
   */
  const { width: anchoPantalla } = useWindowDimensions();
  const anchoCamara = Math.min(anchoPantalla - space.lg * 2, 480);
  const altoCamara = Math.round(
    Math.max(300, Math.min(anchoCamara * 1.2, 440)),
  );

  // Subida 0→100% y después ArcFace en el servidor, que ya no manda bytes.
  const porcentaje = Math.round((progreso?.fraccion ?? 0) * 100);
  const procesando = enviando && porcentaje >= 100;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Registrar rostro"
        subtitle="Una sola vez por persona"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {Ciclo === 'resultado' && resultado ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.okCard}>
              <View style={styles.okHead}>
                <Ionicons name="checkmark-circle" size={iconSize.xl} color={colors.success} />
                <Text style={styles.okTitle}>Rostro registrado</Text>
              </View>
              <View style={styles.fotoRow}>
                {resultado.fotoUrl ? (
                  <Image
                    source={{ uri: resultado.fotoUrl }}
                    style={styles.foto}
                    accessibilityLabel={`Foto de ${resultado.nombreCompleto}`}
                  />
                ) : null}
                <View style={styles.fotoDatos}>
                  <Text style={styles.nombreCompleto}>{resultado.nombreCompleto}</Text>
                  <Text style={styles.datoSuave}>{resultado.email}</Text>
                  <View style={styles.badgeRow}>
                    <Badge
                      variant={resultado.reconoce ? 'warning' : 'success'}
                      size="sm"
                    >
                      {resultado.reconoce ? 'Rostro reemplazado' : 'Primer registro'}
                    </Badge>
                    <Badge variant="info" size="sm">
                      {resultado.fotosRegistradas}{' '}
                      {resultado.fotosRegistradas === 1 ? 'foto' : 'fotos'}
                    </Badge>
                    <Badge variant="default" size="sm">
                      {resultado.embeddingDimension} dim
                    </Badge>
                  </View>
                </View>
              </View>
              <Text style={styles.datoSuave}>
                Ya puede marcar asistencia desde la pantalla de marcaje.
              </Text>
            </View>

            {resultado.avisos?.length ? (
              <View style={styles.avisoBox}>
                {resultado.avisos.map((a) => (
                  <Text key={a} style={styles.avisoTexto}>
                    • {a}
                  </Text>
                ))}
              </View>
            ) : null}

            <PrimaryCTA
              label="Registrar otro rostro"
              iconName="person-add"
              onPress={reiniciar}
            />
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollBare}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formBox}>
              <Text style={styles.fieldLabel}>¿A quién le tomás la foto?</Text>

              {errorPendientes ? (
                <View style={styles.pendingWarn} accessibilityRole={a11y.alert}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={iconSize.sm}
                    color={colors.warning}
                  />
                  <Text style={styles.pendingWarnText}>{errorPendientes}</Text>
                </View>
              ) : pendientes === null ? (
                <View style={styles.pendingCargando}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : pendientes.length === 0 ? (
                <View style={styles.pendingVacio}>
                  <Ionicons
                    name="checkmark-circle"
                    size={iconSize.md}
                    color={colors.success}
                  />
                  <Text style={styles.pendingVacioText}>
                    Todo el personal activo ya tiene rostro registrado.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.pendingList}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
                  {pendientes.map((u) => {
                    const activo = elegido?.id === u.id;
                    return (
                      <Pressable
                        key={u.id}
                        style={({ pressed }) => [
                          styles.pendingRow,
                          activo && styles.pendingRowOn,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => elegirUsuario(u)}
                        disabled={enviando}
                        accessibilityRole={a11y.button}
                        accessibilityState={{ selected: activo }}
                        accessibilityLabel={`Elegir a ${u.nombreCompleto}`}
                      >
                        <Ionicons
                          name={activo ? 'radio-button-on' : 'person-outline'}
                          size={iconSize.md}
                          color={activo ? colors.primary : colors.textMuted}
                        />
                        <View style={styles.pendingRowInfo}>
                          <Text style={styles.pendingRowNombre} numberOfLines={1}>
                            {u.nombreCompleto}
                          </Text>
                          <Text style={styles.pendingRowMeta} numberOfLines={1}>
                            {u.email} · {u.rol}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              {/* Respaldo: el nombre a mano, con el riesgo de 404/409 que la lista
                  evita. Se abre explícitamente para no competir con la lista. */}
              <Pressable
                style={({ pressed }) => [styles.manualToggle, pressed && styles.pressed]}
                onPress={() => {
                  setModoManual((v) => !v);
                  setElegido(null);
                  setCandidatos([]);
                  setSugerencias([]);
                  setAviso(null);
                }}
                disabled={enviando}
                accessibilityRole={a11y.button}
                accessibilityState={{ expanded: modoManual }}
              >
                <Text style={styles.manualToggleText}>
                  {modoManual ? 'Ocultar' : 'No está en la lista, escribir el nombre'}
                </Text>
                <Ionicons
                  name={modoManual ? 'chevron-up' : 'chevron-down'}
                  size={iconSize.sm}
                  color={colors.primary}
                />
              </Pressable>

              {modoManual ? (
                <>
                  <Text style={styles.fieldLabel}>Nombre</Text>
                  <TextInput
                    style={styles.field}
                    value={nombre}
                    onChangeText={setNombre}
                    placeholder="Ej. Marco"
                    placeholderTextColor={colors.textPlaceholder}
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!enviando}
                    accessibilityLabel="Nombre"
                  />

                  <Text style={styles.fieldLabel}>Apellido</Text>
                  <TextInput
                    style={styles.field}
                    value={apellido}
                    onChangeText={setApellido}
                    placeholder="Ej. Salinas"
                    placeholderTextColor={colors.textPlaceholder}
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!enviando}
                    accessibilityLabel="Apellido"
                  />
                  <Text style={styles.fieldHint}>
                    Debe coincidir con un usuario ya creado. Este registro no crea personal.
                  </Text>
                </>
              ) : null}

              <Pressable
                style={({ pressed }) => [styles.consentRow, pressed && styles.pressed]}
                onPress={() => setConsentido((v) => !v)}
                disabled={enviando}
                accessibilityRole={a11y.checkbox}
                accessibilityState={{ checked: consentido }}
                accessibilityLabel="Consentimiento para el uso de la imagen"
              >
                <View style={[styles.checkbox, consentido && styles.checkboxOn]}>
                  {consentido ? (
                    <Ionicons name="checkmark" size={iconSize.sm} color={colors.white} />
                  ) : null}
                </View>
                <Text style={styles.consentText}>
                  La persona autoriza el uso de su imagen y datos biométricos para el
                  control de asistencia (Ley 26935).
                </Text>
              </Pressable>
            </View>

            {aviso ? (
              <View
                style={[
                  styles.noticeBox,
                  aviso.tono === 'error' && styles.noticeError,
                  aviso.tono === 'warning' && styles.noticeWarning,
                  aviso.tono === 'info' && styles.noticeInfo,
                ]}
                accessibilityRole={a11y.alert}
                accessibilityLiveRegion="polite"
              >
                <Text style={styles.noticeTitle}>{aviso.titulo}</Text>
                <Text style={styles.noticeText}>{aviso.texto}</Text>
              </View>
            ) : null}

            {listaUsuarios('¿A cuál corresponde?', candidatos)}

            {listaUsuarios('¿Querías decir alguno de estos?', sugerencias)}

            {consentido ? (
              <>
                <View style={styles.fotosHead}>
                  <Text style={styles.fieldLabel}>
                    Fotos del rostro ({fotos.length}/{FOTOS_RECOMENDADAS})
                  </Text>
                  <Pressable
                    style={({ pressed }) => [styles.galeriaBtn, pressed && styles.pressed]}
                    onPress={elegirDeGaleria}
                    disabled={enviando || fotos.length >= FOTOS_MAXIMO}
                    accessibilityRole={a11y.button}
                    accessibilityLabel="Elegir fotos de la galería"
                  >
                    <Ionicons name="images" size={iconSize.sm} color={colors.primary} />
                    <Text style={styles.galeriaBtnText}>Galería</Text>
                  </Pressable>
                </View>

                <View style={styles.thumbs}>
                  {fotos.map((foto, i) => (
                    <Pressable
                      key={foto.uri}
                      style={styles.thumbWrap}
                      onPress={() => quitarFoto(i)}
                      disabled={enviando}
                      accessibilityRole={a11y.button}
                      accessibilityLabel={`Quitar foto ${i + 1}`}
                    >
                      <Image source={{ uri: foto.uri }} style={styles.thumb} />
                      <View style={styles.thumbX}>
                        <Ionicons name="close" size={12} color={colors.white} />
                      </View>
                    </Pressable>
                  ))}
                  {fotos.length < FOTOS_RECOMENDADAS ? (
                    <View style={styles.thumbSlot}>
                      <Text style={styles.thumbSlotText}>
                        {fotos.length}/{FOTOS_RECOMENDADAS}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={[styles.camBox, { height: altoCamara }]}>
                  <FaceCamera
                    onCaptura={agregarFoto}
                    capturing={enviando}
                    bloqueada={fotos.length >= FOTOS_MAXIMO}
                    contador={`${fotos.length} de ${FOTOS_RECOMENDADAS}`}
                    guideLabel="Rostro de frente, sin lentes ni sombrero"
                  />
                </View>
              </>
            ) : (
              <View style={styles.consentAviso}>
                <Ionicons name="shield-checkmark" size={iconSize.md} color={colors.textMuted} />
                <Text style={styles.consentAvisoText}>
                  Marcá el consentimiento para habilitar la cámara.
                </Text>
              </View>
            )}

            {enviando ? (
              <View style={styles.enviandoBox} accessibilityLiveRegion="polite">
                <View style={styles.progresoHead}>
                  <Text style={styles.enviandoText}>
                    {procesando
                      ? 'Subida lista. Procesando con el modelo de reconocimiento…'
                      : `Subiendo foto ${progreso?.foto ?? 1} de ${fotos.length}…`}
                  </Text>
                  {procesando ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <Text style={styles.progresoPct}>{porcentaje}%</Text>
                  )}
                </View>
                <View
                  style={styles.progresoTrack}
                  accessibilityRole="progressbar"
                  accessibilityValue={{ min: 0, max: 100, now: porcentaje }}
                >
                  <View
                    style={[
                      styles.progresoBar,
                      { width: `${porcentaje}%` as DimensionValue },
                    ]}
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.ctaBox}>
              {/* Repite quién quedó elegido arriba de la acción: es la última
                  pantalla antes de subir y evita registrar el rostro equivocado. */}
              {elegido ? (
                <Text style={styles.destinoHint} numberOfLines={2}>
                  Rostro de{' '}
                  <Text style={styles.negrita}>{elegido.nombreCompleto}</Text>
                </Text>
              ) : null}
              <PrimaryCTA
                label={
                  enviando
                    ? 'Registrando...'
                    : `Registrar rostro (${fotos.length} ${
                        fotos.length === 1 ? 'foto' : 'fotos'
                      })`
                }
                iconName="camera"
                onPress={enviar}
                disabled={!completa || enviando}
              />
              {fotos.length < FOTOS_RECOMENDADAS ? (
                <Text style={styles.ctaHint}>
                  Con menos de {FOTOS_RECOMENDADAS} fotos el reconocimiento puede fallar.
                </Text>
              ) : null}
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scrollContent: { padding: space.lg, gap: space.lg, paddingBottom: space.xl },
  // La rama de captura lleva sus propios márgenes horizontales (`formBox`,
  // `noticeBox`, `camBox`, `ctaBox`), así que el scroll no agrega más.
  scrollBare: { paddingBottom: space.xl },
  pressed: { opacity: opacity.pressed },

  formBox: {
    margin: space.lg,
    marginBottom: space.md,
    padding: space.lg,
    gap: space.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.level1,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: fontSize.captionStrong,
    fontFamily: fontFamily.sansSemiBold,
    marginTop: space.xs,
  },
  field: {
    height: input.height,
    paddingHorizontal: input.paddingHorizontal,
    borderRadius: input.radius,
    borderWidth: input.borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sans,
  },
  fieldHint: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    lineHeight: fontSize.caption * lineHeight.relaxed,
  },

  // ── Lista de personal pendiente de rostro (tarea R9) ─────────────────────
  pendingList: { maxHeight: 260 },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: touchTarget.listRow,
  },
  pendingRowOn: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  pendingRowInfo: { flex: 1, minWidth: 0, gap: 2 },
  pendingRowNombre: {
    color: colors.text,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
  },
  pendingRowMeta: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
  },
  pendingCargando: { paddingVertical: space.lg, alignItems: 'center' },
  pendingVacio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.sm,
    backgroundColor: colors.successSoft,
  },
  pendingVacioText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    lineHeight: fontSize.caption * lineHeight.relaxed,
  },
  pendingWarn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.sm,
    backgroundColor: colors.warningSoft,
  },
  pendingWarnText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    lineHeight: fontSize.caption * lineHeight.relaxed,
  },
  manualToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  manualToggleText: {
    flex: 1,
    color: colors.primary,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansSemiBold,
  },
  destinoHint: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    textAlign: 'center',
  },
  negrita: { fontFamily: fontFamily.sansSemiBold, color: colors.text },

  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    marginTop: space.md,
    padding: space.md,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.xs,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  checkboxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  consentText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    lineHeight: fontSize.caption * lineHeight.relaxed,
  },

  noticeBox: {
    marginHorizontal: space.lg,
    marginBottom: space.md,
    padding: space.md,
    gap: 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  noticeError: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  noticeWarning: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
  },
  noticeInfo: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  noticeTitle: {
    color: colors.text,
    fontSize: fontSize.bodyStrong,
    fontFamily: fontFamily.sansSemiBold,
  },
  noticeText: {
    color: colors.text,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    lineHeight: fontSize.caption * lineHeight.relaxed,
  },

  candidatosBox: {
    marginHorizontal: space.lg,
    marginBottom: space.md,
    padding: space.md,
    gap: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  candidatosTitulo: {
    color: colors.text,
    fontSize: fontSize.bodyStrong,
    fontFamily: fontFamily.sansSemiBold,
  },
  candidato: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  candidatoTexto: { flex: 1, gap: 2 },
  candidatoNombre: {
    color: colors.text,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
  },
  candidatoDetalle: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
  },

  fotosHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    marginTop: space.xs,
  },
  galeriaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  galeriaBtnText: {
    color: colors.primaryStrong,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansSemiBold,
  },

  thumbs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  thumbWrap: { position: 'relative' },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  thumbX: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
  },
  thumbSlot: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  thumbSlotText: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.monoMedium,
  },

  // Sin `flex: 1`: la altura la manda el padre con `height` calculado desde el
  // ancho de la pantalla (el contenido está en un ScrollView).
  camBox: {
    marginHorizontal: space.lg,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },

  consentAviso: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingVertical: space.xl,
  },
  consentAvisoText: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    textAlign: 'center',
  },

  enviandoBox: {
    marginHorizontal: space.lg,
    marginTop: space.md,
    padding: space.md,
    gap: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progresoHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  progresoPct: {
    color: colors.primary,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    fontWeight: '700',
  },
  progresoTrack: {
    height: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progresoBar: {
    height: '100%',
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  enviandoText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    lineHeight: fontSize.caption * lineHeight.relaxed,
  },

  ctaBox: { padding: space.lg, gap: space.sm },
  ctaHint: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    textAlign: 'center',
  },

  okCard: {
    padding: space.lg,
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.success,
    ...shadows.level1,
  },
  okHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  okTitle: {
    color: colors.text,
    fontSize: fontSize.headline,
    fontFamily: fontFamily.sansBold,
  },
  fotoRow: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  foto: {
    width: 84,
    height: 100,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  fotoDatos: { flex: 1, gap: space.xs },
  nombreCompleto: {
    color: colors.text,
    fontSize: fontSize.title,
    fontFamily: fontFamily.sansBold,
  },
  datoSuave: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    lineHeight: fontSize.caption * lineHeight.relaxed,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xs },
  avisoBox: {
    padding: space.md,
    gap: space.xs,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  avisoTexto: {
    color: colors.text,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    lineHeight: fontSize.caption * lineHeight.relaxed,
  },
});
