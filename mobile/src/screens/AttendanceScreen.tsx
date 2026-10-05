import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Header, Badge, PrimaryCTA } from '../components';
import FaceCamera from '../components/FaceCamera';
import {
  marcarAsistencia,
  marcarAsistenciaManual,
  type AttendanceCheck,
  type Asistencia,
} from '../api/attendance';
import { listarRostros } from '../api/users';
import { ApiError, type ArchivoLocal } from '../api/client';
import { getToken } from '../storage/token';
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
export default function AttendanceScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [foto, setFoto] = useState<ArchivoLocal | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<AttendanceCheck | null>(null);
  const [candidatos, setCandidatos] = useState<CandidatoResuelto[]>([]);
  const [resolviendo, setResolviendo] = useState(false);
  const [eligiendoId, setEligiendoId] = useState<number | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);

  const tiendaId = user?.tiendaId ?? null;

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Asistencia Facial"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.titulo}>Marcar asistencia</Text>
          <Text style={styles.subtitulo}>
            {registrado
              ? 'Marcaje registrado.'
              : 'La persona se para frente a la cámara y se toma una sola foto.'}
          </Text>

          {registrado ? (
            <MarcajeRegistrado
              asistencia={registrado}
              onRepetir={reiniciar}
            />
          ) : (
            <>
              <FaceCamera
                onCaptura={alCapturar}
                guideLabel="Encadre el rostro dentro del óvalo"
                style={styles.camera}
              />

              {foto ? (
                <View style={styles.fotoLista}>
                  <Ionicons
                    name="checkmark-circle"
                    size={iconSize.md}
                    color={colors.success}
                  />
                  <Text style={styles.fotoListaTexto}>
                    Foto lista para enviar
                  </Text>
                  <Pressable
                    onPress={reiniciar}
                    accessibilityRole={a11y.button}
                    accessibilityLabel="Descartar la foto y capturing otra"
                    hitSlop={8}
                  >
                    <Text style={styles.fotoListaCambiar}>Cambiar</Text>
                  </Pressable>
                </View>
              ) : null}

              {aviso ? (
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
              ) : null}

              {candidatos.length ? (
                <View style={styles.candidatos}>
                  <Text style={styles.candidatosTitulo}>
                    ¿A quién pertenece esta foto?
                  </Text>
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
                          <Text style={styles.candidatoNombre}>
                            {c.nombreCompleto}
                          </Text>
                          {/* El plan pide mostrar email/rol: con homónimos el nombre
                              completo no alcanza para elegir. */}
                          <Text style={styles.candidatoMeta}>
                            {c.email} · {c.rol}
                          </Text>
                        </View>
                        <Badge variant="info" size="sm">
                          {porcentaje(c.similitud)}
                        </Badge>
                        {eligiendoId === c.usuarioId ? (
                          <ActivityIndicator
                            size="small"
                            color={colors.primary}
                          />
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
              ) : null}

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
                disabled={!foto || ocupado}
              />
            </>
          )}
        </View>

        <View style={styles.nota}>
          <Ionicons
            name="information-circle-outline"
            size={iconSize.md}
            color={colors.blue}
          />
          <Text style={styles.notaTexto}>
            El primer marcaje del día se registra como <Text style={styles.negrita}>entrada</Text>{' '}
            y el segundo como <Text style={styles.negrita}>salida</Text>, sin que
            haya que elegir el tipo. Los marcajes manuales quedan sin confianza y
            con el administrador que los confirmó.
          </Text>
        </View>
      </ScrollView>
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

      <Text style={styles.resultadoNombre}>
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
      <Text style={styles.datoTexto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.lg, gap: space.lg, paddingBottom: space['3xl'] },

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

  camera: { height: 340, borderRadius: radius.lg, overflow: 'hidden' },

  fotoLista: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  fotoListaTexto: {
    flex: 1,
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
  candidatoInfo: { flex: 1 },
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

  resultado: { alignItems: 'center', gap: space.md },
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
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.text,
    lineHeight: lineHeight.relaxed,
  },
  negrita: { fontFamily: fontFamily.sansSemiBold },

  pressed: { opacity: opacity.pressed },
});