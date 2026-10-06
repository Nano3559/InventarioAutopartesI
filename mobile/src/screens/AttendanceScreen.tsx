import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Header, Badge, PrimaryCTA } from '../components';
import FaceCamera from '../components/FaceCamera';
import AdminPasswordGate from '../components/AdminPasswordGate';
import TiendaSelector from '../components/TiendaSelector';
import {
  marcarAsistencia,
  marcarAsistenciaManual,
  type AttendanceCheck,
  type Asistencia,
} from '../api/attendance';
import { listarRostros } from '../api/users';
import {
  ApiError,
  SIN_CONEXION,
  esperarServidorVivo,
  type ArchivoLocal,
} from '../api/client';
import type { Location } from '../api/locations';
import { getToken } from '../storage/token';
import {
  getTerminal,
  saveTerminal,
  type ConfigTerminal,
} from '../storage/terminal';
import { useAuth } from '../context/AuthContext';
import {
  colors,
  space,
  radius,
  fontFamily,
  fontSize,
  lineHeight,
  shadows,
  iconSize,
  a11y,
  opacity,
  breakpoints,
} from '../theme';

type Aviso = {
  tono: 'error' | 'warning' | 'info' | 'success';
  titulo: string;
  texto: string;
} | null;

/** Candidato de `check` ya resuelto con los datos del catálogo de personal. */
interface CandidatoResuelto {
  usuarioId: number;
  similitud: number;
  nombreCompleto: string;
  email: string;
  rol: string;
}

const HORA = { hour: '2-digit', minute: '2-digit' } as const;

function horaDe(fecha: string): string {
  return new Date(fecha).toLocaleTimeString('es-BO', HORA);
}

function fechaDe(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function porcentaje(valor: number | null | undefined): string {
  return valor == null ? '—' : `${(valor * 100).toFixed(1)}%`;
}

/**
 * Marcaje de asistencia (tarea R4).
 *
 * El flujo tiene un solo camino de ida y tres finales, según lo que conteste
 * `POST /attendance/check`:
 *
 * 1. **Reconocido** → queda registrado el marcaje y se muestra nombre, hora exacta
 *    y tienda.
 * 2. **Bajo umbral** → el backend **no inserta nada**: devuelve candidatos y la
 *    pantalla deja que el operador elija a mano. Al elegir se reenvía el mismo
 *    multipart con `usuarioId`, que registra `metodo:'manual'`.
 * 3. **Sin coincidencias** → no hay rostros registrados (o ninguno parecido).
 *
 * Los candidatos del backend traen solo `usuarioId` y `similitud`
 * (`CandidatoRostro`), así que el nombre se resuelve contra `GET /users/rostros`.
 */
export default function AttendanceScreen({
  modoTiqueador = false,
  onSalir,
}: {
  /** Renderiza la pantalla como terminal de tiqueo de una tablet (tarea R9). */
  modoTiqueador?: boolean;
  /** Cierra el modo tiqueador. Solo se usa si `modoTiqueador`. */
  onSalir?: () => void;
}) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { width, height } = useWindowDimensions();

  /**
   * La tablet del tiqueador se usa **apoyada en horizontal** (tarea R9): es más
   * cómodo para el que marca y deja la cámara a la vista de la fila. Con
   * `breakpoints.tablet` como corte, no con el modelo del dispositivo: un
   * teléfono rotado también entra, y una tablet en vertical no.
   */
  const apaisado = width > height;
  const dosPaneles = apaisado && width >= breakpoints.tablet;

  // En vertical la cámara no tiene una altura fija: se deriva del ancho real del
  // contenido para que en una tablet no quede una franja de 340px en el medio.
  const [anchoContenido, setAnchoContenido] = useState(0);
  const altoCamara = Math.max(
    300,
    Math.min(560, Math.round(anchoContenido * 0.62)),
  );
  const medirContenido = useCallback((e: LayoutChangeEvent) => {
    const nuevo = e.nativeEvent.layout.width;
    setAnchoContenido((prev) => (Math.abs(prev - nuevo) < 1 ? prev : nuevo));
  }, []);

  const [foto, setFoto] = useState<ArchivoLocal | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<AttendanceCheck | null>(null);
  const [candidatos, setCandidatos] = useState<CandidatoResuelto[]>([]);
  const [resolviendo, setResolviendo] = useState(false);
  const [eligiendoId, setEligiendoId] = useState<number | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);

  // ── Tienda del terminal (tarea R9) ──────────────────────────────────────────
  // La tienda sale primero de la config del **dispositivo** y no de
  // `user.tiendaId`. Hay un solo admin y una tablet por tienda, todas con esa
  // misma cuenta: si la tienda fuera del usuario, el admin tendría una sola y las
  // tres tablets marcarían siempre en la misma. En producción el admin además
  // tiene `tiendaId = NULL`, así que este camino es el único que puede dar tienda.
  //
  // `user.tiendaId` queda solo como último recurso para el rol `tienda`, que sí
  // tiene una tienda propia por definición.
  const [terminal, setTerminal] = useState<ConfigTerminal | null>(null);
  const [cargandoTerminal, setCargandoTerminal] = useState(true);
  const [eligiendoTienda, setEligiendoTienda] = useState(false);
  const [pidiendoSalida, setPidiendoSalida] = useState(false);
  const [pidiendoConfig, setPidiendoConfig] = useState(false);

  useEffect(() => {
    let vigente = true;
    void (async () => {
      const config = await getTerminal();
      if (vigente) {
        setTerminal(config);
        setCargandoTerminal(false);
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  const tiendaId = terminal?.tiendaId ?? user?.tiendaId ?? null;
  const nombreTienda = terminal?.tiendaNombre ?? user?.tienda?.nombre ?? null;
  const codigoTienda = terminal?.tiendaCodigo ?? user?.tienda?.codigo ?? null;
  const esAdmin = user?.rol === 'admin';

  /**
   * Sin tienda no se puede marcar: el marcaje quedaría sin tienda y después no se
   * sabría a cuál atribuirlo. Para el admin esto es normal hasta que configure la
   * tablet; para el rol `tienda` significa que la BD no le tiene tienda asignada.
   */
  const faltaTienda = tiendaId === null;

  const elegirTienda = useCallback(async (tienda: Location) => {
    const config: ConfigTerminal = {
      tiendaId: tienda.id,
      tiendaNombre: tienda.nombre,
      tiendaCodigo: tienda.codigo,
      configuradoEn: new Date().toISOString(),
    };
    await saveTerminal(config);
    setTerminal(config);
    setEligiendoTienda(false);
    // Si ya había una foto capturada, era para otra tienda: se descarta.
    setFoto(null);
    setResultado(null);
    setCandidatos([]);
    setAviso(null);
  }, []);

  const reiniciar = useCallback(() => {
    setFoto(null);
    setResultado(null);
    setCandidatos([]);
    setAviso(null);
  }, []);

  const alCapturar = useCallback((captura: ArchivoLocal) => {
    setFoto(captura);
    setResultado(null);
    setCandidatos([]);
    setAviso(null);
  }, []);

  /**
   * El índice en memoria del backend solo guarda `usuarioId → embedding`, así que
   * los candidatos llegan sin nombre. `GET /users/rostros` es el catálogo de
   * quienes tienen rostro registrado: es lo que permite al operador elegir bien
   * entre homónimos.
   */
  const resolverCandidatos = useCallback(async (ids: number[]) => {
    setResolviendo(true);
    try {
      const token = await getToken();
      const roster = await listarRostros(token ?? '');
      const porId = new Map(roster.map((r) => [r.id, r]));
      return ids.map((usuarioId) => {
        const persona = porId.get(usuarioId);
        return {
          usuarioId,
          nombreCompleto: persona?.nombreCompleto ?? `Usuario #${usuarioId}`,
          email: persona?.email ?? 'Sin email',
          rol: persona?.rol ?? '—',
        };
      });
    } catch {
      // Si el catálogo no se puede leer, el operador igual puede elegir por id.
      return ids.map((usuarioId) => ({
        usuarioId,
        nombreCompleto: `Usuario #${usuarioId}`,
        email: 'Sin email',
        rol: '—',
      }));
    } finally {
      setResolviendo(false);
    }
  }, []);

  const registrar = useCallback(
    async (usuarioId?: number) => {
      if (!foto || enviando || (usuarioId !== undefined && eligiendoId !== null)) return;
      if (usuarioId !== undefined) setEligiendoId(usuarioId);
      else setEnviando(true);
      setAviso(null);

      try {
        // Cold start de Render (~52.7 s) vs timeout de red del teléfono (~10 s):
        // si el servidor quedó dormido, el multipart real moriría con
        // "sin conexión" (status 0) aunque el backend esté por responder. Primero
        // se espera a que conteste y la pantalla lo avisa en lugar de fallar seco.
        const inmediato = await esperarServidorVivo(15_000);
        if (!inmediato) {
          setAviso({
            tono: 'info',
            titulo: 'Despertando el servidor…',
            texto:
              'El primer uso del día puede tardar hasta un minuto. Se reintenta ' +
              'automáticamente.',
          });
          const despierto = await esperarServidorVivo(90_000);
          if (!despierto) {
            setAviso({
              tono: 'error',
              titulo: 'No se pudo marcar',
              texto: SIN_CONEXION,
            });
            return;
          }
        }

        const token = await getToken();
        const data =
          usuarioId === undefined
            ? await marcarAsistencia(
                { fotoUri: foto.uri, fileName: foto.name, locationId: tiendaId },
                token,
              )
            : await marcarAsistenciaManual(
                {
                  fotoUri: foto.uri,
                  fileName: foto.name,
                  locationId: tiendaId,
                  usuarioId,
                },
                token,
              );

        setResultado(data);

        if (data.reconocido && data.asistencia) {
          setCandidatos([]);
          setAviso(null);
          return;
        }

        const crudos = data.candidatos ?? [];
        if (crudos.length) {
          const resueltos = await resolverCandidatos(
            crudos.map((c) => c.usuarioId),
          );
          setCandidatos(
            resueltos.map((r, i) => ({ ...r, similitud: crudos[i].similitud })),
          );
          setAviso({
            tono: 'warning',
            titulo: 'No se reconoció con confianza',
            texto:
              `La mejor coincidencia quedó por debajo del umbral ` +
              `(${porcentaje(data.umbral)}). Elegí a quién corresponde la foto: ` +
              'quedará registrada como marcaje manual.',
          });
          return;
        }

        setCandidatos([]);
        setAviso({
          tono: 'info',
          titulo: 'Rostro no reconocido',
          texto:
            'No hay ningún rostro registrado que se parezca a esta foto. ' +
            'Registralo primero desde "Registro Facial".',
        });
      } catch (err) {
        setAviso({
          tono: 'error',
          titulo: 'No se pudo marcar',
          texto:
            err instanceof ApiError
              ? err.message
              : 'Ocurrió un error inesperado. Intentá de nuevo.',
        });
      } finally {
        setEnviando(false);
        setEligiendoId(null);
      }
    },
    [eligiendoId, enviando, foto, resolverCandidatos, tiendaId],
  );

  const registrado = resultado?.reconocido ? resultado.asistencia : undefined;
  const ocupado = enviando || eligiendoId !== null || resolviendo;

  // Sin tienda configurada no se puede marcar: el marcaje quedaría sin tienda.
  const SinTienda = (
    <View style={styles.card}>
      <View style={styles.sinTiendaIcono}>
        <Ionicons name="storefront-outline" size={iconSize.xl} color={colors.warning} />
      </View>
      <Text style={styles.titulo}>Esta tablet no tiene tienda asignada</Text>
      <Text style={styles.subtitulo}>
        Los marcajes necesitan saber en qué tienda se están tomando. Elegí la
        tienda a la que pertenece esta tablet: queda guardado en el dispositivo y
        solo hay que configurarlo una vez.
      </Text>
      {esAdmin ? (
        <PrimaryCTA
          label="Configurar tienda"
          iconName="storefront"
          onPress={() => setPidiendoConfig(true)}
        />
      ) : (
        <Text style={styles.sinTiendaAviso}>
          Pedile a un administrador que asigne tu tienda, o entrá al Tiqueador para
          configurarla desde esta tablet.
        </Text>
      )}
    </View>
  );

  // ── Piezas compartidas por las dos disposiciones ────────────────────────────
  // Vertical y horizontal muestran lo mismo; solo cambia cómo se acomoda. Armar
  // los bloques una vez evita que las dos ramas se desincronicen.
  const BarraTienda = nombreTienda ? (
    <Pressable
      style={({ pressed }) => [styles.tiendaBarra, pressed && styles.pressed]}
      onPress={esAdmin ? () => setPidiendoConfig(true) : undefined}
      disabled={ocupado || !esAdmin}
      accessibilityRole={a11y.button}
      accessibilityLabel={`Tienda ${nombreTienda}. ${esAdmin ? 'Cambiar tienda' : ''}`}
    >
      <Ionicons name="storefront" size={iconSize.md} color={colors.primary} />
      <View style={styles.tiendaBarraInfo}>
        <Text style={styles.tiendaBarraLabel}>Marcando en</Text>
        <Text style={styles.tiendaBarraNombre} numberOfLines={1}>
          {nombreTienda}
          {codigoTienda ? ` · ${codigoTienda}` : ''}
        </Text>
      </View>
      {esAdmin ? <Text style={styles.tiendaBarraCambiar}>Cambiar</Text> : null}
    </Pressable>
  ) : null;

  const Encabezado = (
    <>
      <Text style={styles.titulo}>Marcar asistencia</Text>
      <Text style={styles.subtitulo}>
        {registrado
          ? 'Marcaje registrado.'
          : 'La persona se para frente a la cámara y se toma una sola foto.'}
      </Text>
    </>
  );

  const FotoLista = foto ? (
    <View style={styles.fotoLista}>
      <Ionicons
        name="checkmark-circle"
        size={iconSize.md}
        color={colors.success}
      />
      <Text style={styles.fotoListaTexto}>Foto lista para enviar</Text>
      <Pressable
        onPress={reiniciar}
        accessibilityRole={a11y.button}
        accessibilityLabel="Descartar la foto y tomar otra"
        hitSlop={8}
      >
        <Text style={styles.fotoListaCambiar}>Cambiar</Text>
      </Pressable>
    </View>
  ) : null;

  const BloqueAviso = aviso ? (
    <View
      style={[
        styles.aviso,
        aviso.tono === 'error' && styles.avisoError,
        aviso.tono === 'warning' && styles.avisoWarning,
        aviso.tono === 'info' && styles.avisoInfo,
      ]}
      accessibilityRole={a11y.alert}
    >
      <Ionicons
        name={
          aviso.tono === 'error'
            ? 'alert-circle'
            : aviso.tono === 'warning'
              ? 'warning'
              : 'information-circle'
        }
        size={iconSize.md}
        color={
          aviso.tono === 'error'
            ? colors.danger
            : aviso.tono === 'warning'
              ? colors.warning
              : colors.blue
        }
      />
      <Text style={styles.avisoTexto}>
        <Text style={styles.avisoTitulo}>{aviso.titulo}. </Text>
        {aviso.texto}
      </Text>
    </View>
  ) : null;

  const BloqueCandidatos = candidatos.length ? (
    <View style={styles.candidatos}>
      <Text style={styles.candidatosTitulo}>¿A quién pertenece esta foto?</Text>
      {resolviendo ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        candidatos.map((c) => (
          <Pressable
            key={c.usuarioId}
            style={({ pressed }) => [
              styles.candidato,
              pressed && styles.pressed,
            ]}
            onPress={() => registrar(c.usuarioId)}
            disabled={ocupado}
            accessibilityRole={a11y.button}
            accessibilityLabel={`Registrar marcaje de ${c.nombreCompleto}`}
          >
            <View style={styles.candidatoInfo}>
              {/* El plan pide mostrar email/rol: con homónimos el nombre completo
                  no alcanza para elegir. Con `numberOfLines` un email largo
                  recorta en vez de empujar el badge y el chevron fuera de la fila. */}
              <Text style={styles.candidatoNombre} numberOfLines={1}>
                {c.nombreCompleto}
              </Text>
              <Text style={styles.candidatoMeta} numberOfLines={1}>
                {c.email} · {c.rol}
              </Text>
            </View>
            <Badge variant="info" size="sm">
              {porcentaje(c.similitud)}
            </Badge>
            {eligiendoId === c.usuarioId ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name="chevron-forward"
                size={iconSize.md}
                color={colors.textMuted}
              />
            )}
          </Pressable>
        ))
      )}
    </View>
  ) : null;

  const AccionMarcar = (
    <PrimaryCTA
      label={
        enviando
          ? 'Reconociendo…'
          : foto
            ? 'Marcar asistencia'
            : 'Tomar foto y marcar'
      }
      iconName="finger-print"
      onPress={() => registrar()}
      disabled={!foto || ocupado || faltaTienda}
    />
  );

  const Nota = faltaTienda ? null : (
    <View style={styles.nota}>
      <Ionicons
        name="information-circle-outline"
        size={iconSize.md}
        color={colors.blue}
      />
      <Text style={styles.notaTexto}>
        El primer marcaje del día se registra como{' '}
        <Text style={styles.negrita}>entrada</Text> y el segundo como{' '}
        <Text style={styles.negrita}>salida</Text>, sin que haya que elegir el
        tipo. Los marcajes manuales quedan sin confianza y con el administrador
        que los confirmó.
      </Text>
    </View>
  );

  const Marcaje = registrado ? (
    <MarcajeRegistrado asistencia={registrado} onRepetir={reiniciar} />
  ) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Header
        title={modoTiqueador ? 'Tiqueador' : 'Asistencia Facial'}
        subtitle={nombreTienda ?? undefined}
        onMenuPress={
          modoTiqueador
            ? undefined
            : () => navigation.dispatch(DrawerActions.openDrawer())
        }
        rightAction={
          modoTiqueador
            ? {
                label: 'Salir',
                icon: 'lock-open-outline',
                variant: 'ghost',
                onPress: () => setPidiendoSalida(true),
              }
            : undefined
        }
      />

      {dosPaneles && !cargandoTerminal && !faltaTienda ? (
        // ── Horizontal sobre tablet: cámara a la izquierda, acciones a la derecha.
        // La cámara toma todo el alto disponible y el resultado se muestra en el
        // panel grande, que es donde la persona está mirando.
        <View style={styles.panes}>
          <View style={styles.paneVisual}>
            {Marcaje ?? (
              <FaceCamera onCaptura={alCapturar} guideLabel="Encadre el rostro dentro del óvalo" />
            )}
          </View>

          <ScrollView
            style={styles.paneAcciones}
            contentContainerStyle={styles.scrollAcciones}
            showsVerticalScrollIndicator={false}
          >
            {BarraTienda}
            <View style={styles.card}>
              {Encabezado}
              {Marcaje ? null : (
                <>
                  {FotoLista}
                  {BloqueAviso}
                  {BloqueCandidatos}
                  {AccionMarcar}
                </>
              )}
            </View>
            {Nota}
          </ScrollView>
        </View>
      ) : (
        // ── Vertical (o estados que no dependen del ancho: cargando / sin tienda).
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.columna} onLayout={medirContenido}>
            {BarraTienda}

            {cargandoTerminal ? (
              <View style={styles.card}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null}

            {faltaTienda ? SinTienda : null}

            {!cargandoTerminal && !faltaTienda ? (
              <View style={styles.card}>
                {Encabezado}
                {Marcaje ?? (
                  <>
                    <FaceCamera
                      onCaptura={alCapturar}
                      guideLabel="Encadre el rostro dentro del óvalo"
                      style={[styles.camera, { height: altoCamara }]}
                    />
                    {FotoLista}
                    {BloqueAviso}
                    {BloqueCandidatos}
                    {AccionMarcar}
                  </>
                )}
              </View>
            ) : null}

            {Nota}
          </View>
        </ScrollView>
      )}

      <TiendaSelector
        visible={eligiendoTienda}
        seleccionadaId={terminal?.tiendaId ?? null}
        onCancel={() => setEligiendoTienda(false)}
        onSelect={elegirTienda}
      />

      {/* Elegir o cambiar la tienda de la tablet pide la contraseña del admin: es
          la configuración que decide dónde caen todos los marcajes del terminal,
          así que no puede tocarla cualquiera que tenga la tablet en la mano. */}
      <AdminPasswordGate
        visible={pidiendoConfig}
        motivo="Elegí la tienda a la que pertenece esta tablet. Todos los marcajes que se hagan desde acá quedan registrados en esa tienda."
        confirmar="Elegir tienda"
        onCancel={() => setPidiendoConfig(false)}
        onSuccess={() => setEligiendoTienda(true)}
      />

      <AdminPasswordGate
        visible={pidiendoSalida}
        motivo="Para volver a la aplicación completa necesitás la contraseña del administrador."
        confirmar="Salir del tiqueador"
        onCancel={() => setPidiendoSalida(false)}
        onSuccess={() => {
          setPidiendoSalida(false);
          onSalir?.();
        }}
      />
    </SafeAreaView>
  );
}

/** Tarjeta de éxito: quién, a qué hora y en qué tienda. */
function MarcajeRegistrado({
  asistencia,
  onRepetir,
}: {
  asistencia: Asistencia;
  onRepetir: () => void;
}) {
  const manual = asistencia.metodo === 'manual';
  return (
    <View style={styles.resultado}>
      <View style={styles.resultadoIcono}>
        <Ionicons
          name="checkmark-circle"
          size={iconSize.lg}
          color={colors.success}
        />
      </View>

      <Text style={styles.resultadoNombre} numberOfLines={2}>
        {asistencia.nombreCompleto || `Usuario #${asistencia.usuarioId}`}
      </Text>

      <View style={styles.resultadoHora}>
        <Text style={styles.resultadoHoraTexto}>{horaDe(asistencia.fecha)}</Text>
      </View>

      <View style={styles.chips}>
        <Badge variant={asistencia.tipo === 'entrada' ? 'success' : 'warning'}>
          {asistencia.tipo === 'entrada' ? 'Entrada' : 'Salida'}
        </Badge>
        <Badge variant={manual ? 'warning' : 'default'}>
          {manual ? 'Manual' : 'Automático'}
        </Badge>
        {!manual ? (
          <Badge variant="info">Confianza {porcentaje(asistencia.confianza)}</Badge>
        ) : null}
      </View>

      <View style={styles.datos}>
        <Dato
          icon="calendar-outline"
          texto={fechaDe(asistencia.fecha)}
        />
        <Dato
          icon="location-outline"
          texto={asistencia.location?.nombre ?? 'Sin tienda registrada'}
        />
        {asistencia.confirmadoPor ? (
          <Dato
            icon="shield-checkmark-outline"
            texto={`Confirmado por ${[asistencia.confirmadoPor.nombre, asistencia.confirmadoPor.apellido]
              .filter(Boolean)
              .join(' ')}`}
          />
        ) : null}
      </View>

      <PrimaryCTA
        label="Marcar otra persona"
        iconName="camera"
        onPress={onRepetir}
        color={colors.text}
      />
    </View>
  );
}

function Dato({ icon, texto }: { icon: React.ComponentProps<typeof Ionicons>['name']; texto: string }) {
  return (
    <View style={styles.dato}>
      <Ionicons name={icon} size={iconSize.sm} color={colors.textMuted} />
      <Text style={styles.datoTexto} numberOfLines={2}>
        {texto}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.lg, paddingBottom: space['4xl'] },
  columna: { gap: space.lg },

  // ── Horizontal sobre tablet: dos paneles (R9) ────────────────────────────
  panes: {
    flex: 1,
    flexDirection: 'row',
    gap: space.lg,
    padding: space.lg,
  },
  paneVisual: {
    flex: 3,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
    // Centra el resultado en vertical; la cámara tiene `flex: 1` y llena igual.
    justifyContent: 'center',
  },
  paneAcciones: { flex: 2 },
  scrollAcciones: {
    paddingBottom: space['2xl'],
    gap: space.lg,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.lg,
    ...shadows.level1,
  },
  titulo: {
    fontSize: fontSize.title,
    fontFamily: fontFamily.sansBold,
    color: colors.text,
  },
  subtitulo: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    lineHeight: lineHeight.body,
    marginTop: -space.sm,
  },

  camera: { borderRadius: radius.lg, overflow: 'hidden' },

  fotoLista: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  fotoListaTexto: {
    flex: 1,
    minWidth: 0,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansMedium,
    color: colors.text,
  },
  fotoListaCambiar: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.primary,
  },

  aviso: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  avisoError: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
  avisoWarning: { backgroundColor: colors.warningSoft, borderColor: colors.warning },
  avisoInfo: { backgroundColor: colors.blueSoft, borderColor: colors.blue },
  avisoTexto: {
    flex: 1,
    minWidth: 0,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sans,
    color: colors.text,
    lineHeight: lineHeight.body,
  },
  avisoTitulo: { fontFamily: fontFamily.sansSemiBold },

  candidatos: { gap: space.sm },
  candidatosTitulo: {
    fontSize: fontSize.bodyStrong,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  candidato: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  candidatoInfo: { flex: 1, minWidth: 0 },
  candidatoNombre: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  candidatoMeta: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
  },

  resultado: { alignItems: 'center', alignSelf: 'stretch', gap: space.md, paddingHorizontal: space.sm },
  resultadoIcono: { marginTop: space.sm },
  resultadoNombre: {
    fontSize: fontSize.headline,
    fontFamily: fontFamily.sansBold,
    color: colors.text,
    textAlign: 'center',
  },
  resultadoHora: {
    paddingHorizontal: space.lg,
    paddingVertical: space.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  resultadoHoraTexto: {
    fontSize: fontSize.display,
    fontFamily: fontFamily.sansBold,
    color: colors.primary,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, justifyContent: 'center' },

  datos: { alignSelf: 'stretch', gap: space.sm, paddingTop: space.sm },
  dato: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  datoTexto: {
    flex: 1,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
  },

  nota: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.blueSoft,
  },
  notaTexto: {
    flex: 1,
    minWidth: 0,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.text,
    lineHeight: lineHeight.relaxed,
  },
  negrita: { fontFamily: fontFamily.sansSemiBold },

  pressed: { opacity: opacity.pressed },

  tiendaBarra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  tiendaBarraInfo: { flex: 1, minWidth: 0 },
  tiendaBarraLabel: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
  },
  tiendaBarraNombre: {
    fontSize: fontSize.bodyStrong,
    fontFamily: fontFamily.sansBold,
    color: colors.text,
  },
  tiendaBarraCambiar: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.primary,
    flexShrink: 0,
  },

  sinTiendaIcono: { alignSelf: 'center', paddingVertical: space.sm },
  sinTiendaAviso: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
