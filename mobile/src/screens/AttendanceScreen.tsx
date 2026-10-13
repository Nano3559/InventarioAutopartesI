import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  type AttendanceCheck,
  type Asistencia,
} from '../api/attendance';
import {
  listarUsuarios,
  type UsuarioListado,
} from '../api/users';
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
import {
  getCarnetMap,
  guardarCarnet,
  buscarPorCarnet,
  obtenerCarnetDeUsuario,
  type CarnetMap,
} from '../storage/carnets';
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
 * El flujo tiene un solo camino de ida y dos finales, según lo que conteste
 * `POST /attendance/check`:
 *
 * 1. **Reconocido** → queda registrado el marcaje y se muestra nombre, hora exacta
 *    y tienda.
 * 2. **Desconocido** (similitud < 80%) → el backend **no inserta nada**: la
 *    pantalla avisa "usuario desconocido" y pide registrarse primero. No hay
 *    selector de personal: un desconocido no puede marcarse a mano.
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
  const [aviso, setAviso] = useState<Aviso>(null);

  // ── Identificación por Carnet (C.I.) y Selección de Personal ──────────────
  const [empleados, setEmpleados] = useState<UsuarioListado[]>([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<UsuarioListado | null>(null);
  const [carnetTexto, setCarnetTexto] = useState('');
  const [carnetMap, setCarnetMap] = useState<CarnetMap>({});
  const [carnetVinculando, setCarnetVinculando] = useState<string | null>(null);
  const [eligiendoEmpleado, setEligiendoEmpleado] = useState(false);
  const [busquedaEmpleado, setBusquedaEmpleado] = useState('');

  // ── Tienda del terminal (tarea R9) ──────────────────────────────────────────
  const [terminal, setTerminal] = useState<ConfigTerminal | null>(null);
  const [cargandoTerminal, setCargandoTerminal] = useState(true);
  const [eligiendoTienda, setEligiendoTienda] = useState(false);
  const [pidiendoSalida, setPidiendoSalida] = useState(false);
  const [pidiendoConfig, setPidiendoConfig] = useState(false);

  // Cargar mapa de carnets guardados
  useEffect(() => {
    let vigente = true;
    void (async () => {
      const mapa = await getCarnetMap();
      if (vigente) {
        setCarnetMap(mapa);
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

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

  // Cargar lista de empleados activos y seleccionar al usuario por defecto
  useEffect(() => {
    let vigente = true;
    void (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const lista = await listarUsuarios(token);
        if (vigente) {
          const activos = lista.filter((u) => u.activo);
          setEmpleados(activos);
          const actual = activos.find((u) => u.id === user?.id);
          if (actual) {
            setEmpleadoSeleccionado(actual);
            const miCarnet = obtenerCarnetDeUsuario(actual.id, carnetMap);
            if (miCarnet && !carnetTexto) {
              setCarnetTexto(miCarnet);
            }
          }
        }
      } catch {
        // Silencioso si no hay red inmediata
      }
    })();
    return () => {
      vigente = false;
    };
  }, [user?.id, carnetMap]);

  const tiendaId = terminal?.tiendaId ?? user?.tiendaId ?? null;
  const nombreTienda = terminal?.tiendaNombre ?? user?.tienda?.nombre ?? null;
  const codigoTienda = terminal?.tiendaCodigo ?? user?.tienda?.codigo ?? null;
  const esAdmin = user?.rol === 'admin';

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
    setFoto(null);
    setResultado(null);
    setAviso(null);
  }, []);

  const manejarCambioCarnet = useCallback(
    (texto: string) => {
      setCarnetTexto(texto);
      setFoto(null);
      setResultado(null);
      setAviso(null);
      const limpio = texto.trim();
      if (!limpio) {
        setEmpleadoSeleccionado(null);
        return;
      }
      const encontrado = buscarPorCarnet(limpio, empleados, carnetMap);
      if (encontrado) {
        setEmpleadoSeleccionado(encontrado);
      } else {
        setEmpleadoSeleccionado(null);
      }
    },
    [empleados, carnetMap],
  );

  const reiniciar = useCallback(() => {
    setFoto(null);
    setResultado(null);
    setAviso(null);
    if (modoTiqueador) {
      setCarnetTexto('');
      setEmpleadoSeleccionado(null);
    }
  }, [modoTiqueador]);

  const alCapturar = useCallback((captura: ArchivoLocal) => {
    setFoto(captura);
    setResultado(null);
    setAviso(null);
  }, []);

  const registrar = useCallback(async () => {
    if (!foto || enviando) return;
    if (!empleadoSeleccionado) {
      setAviso({
        tono: 'warning',
        titulo: 'Selecciona un empleado',
        texto: 'Debes indicar qué empleado está registrando su asistencia.',
      });
      return;
    }
    setEnviando(true);
    setAviso(null);

    try {
      const inmediato = await esperarServidorVivo(15_000);
      if (!inmediato) {
        setAviso({
          tono: 'info',
          titulo: 'Despertando el servidor…',
          texto:
            'El primer uso del día puede tardar hasta un minuto. Se reintenta automáticamente.',
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
      const data = await marcarAsistencia(
        {
          fotoUri: foto.uri,
          fileName: foto.name,
          locationId: tiendaId,
          usuarioId: empleadoSeleccionado.id,
          recorte: foto.recorte,
        },
        token,
      );

      setResultado(data);

      if (data.reconocido && data.asistencia) {
        setAviso(null);
        return;
      }

      setAviso({
        tono: 'error',
        titulo: 'No se pudo registrar',
        texto: 'No se pudo confirmar la asistencia. Por favor intenta nuevamente.',
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
    }
  }, [empleadoSeleccionado, enviando, foto, tiendaId]);

  const registrado = resultado?.reconocido ? resultado.asistencia : undefined;
  const ocupado = enviando;

  const empleadosFiltrados = empleados.filter((e) => {
    const q = busquedaEmpleado.trim().toLowerCase();
    if (!q) return true;
    return (
      e.nombreCompleto.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.rol.toLowerCase().includes(q)
    );
  });

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

  const CardIdentificacionCarnet = (
    <View style={styles.carnetCard}>
      <View style={styles.carnetHead}>
        <View style={styles.carnetIcono}>
          <Ionicons name="card-outline" size={iconSize.md} color={colors.primary} />
        </View>
        <View style={styles.carnetHeadTexto}>
          <Text style={styles.carnetTitulo}>Identificación por Carnet (C.I.)</Text>
          <Text style={styles.carnetSubtitulo}>
            Ingresa tu número de documento para reconocerte en el sistema
          </Text>
        </View>
      </View>

      <View style={styles.carnetInputFila}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={styles.carnetInputIcono} />
        <TextInput
          style={styles.carnetInput}
          placeholder="Escribe tu Nº de carnet (C.I.)…"
          placeholderTextColor={colors.textMuted}
          value={carnetTexto}
          onChangeText={manejarCambioCarnet}
          keyboardType="default"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!ocupado}
        />
        {carnetTexto.length > 0 ? (
          <Pressable
            onPress={() => {
              setCarnetTexto('');
              setEmpleadoSeleccionado(null);
              setFoto(null);
            }}
            style={styles.carnetBtnLimpiar}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Estado del reconocimiento */}
      {empleadoSeleccionado ? (
        <View style={styles.carnetReconocido}>
          <View style={styles.carnetAvatar}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          </View>
          <View style={styles.carnetInfo}>
            <Text style={styles.carnetNombre} numberOfLines={1}>
              {empleadoSeleccionado.nombreCompleto}
            </Text>
            <Text style={styles.carnetDetalle} numberOfLines={1}>
              Personal Reconocido · Rol: {empleadoSeleccionado.rol} · C.I.: {carnetTexto || obtenerCarnetDeUsuario(empleadoSeleccionado.id, carnetMap) || empleadoSeleccionado.id}
            </Text>
          </View>
          <Pressable
            onPress={() => setEligiendoEmpleado(true)}
            style={styles.carnetBtnCambiar}
            hitSlop={8}
          >
            <Text style={styles.carnetBtnCambiarTexto}>Cambiar</Text>
          </Pressable>
        </View>
      ) : carnetTexto.trim().length > 0 ? (
        <View style={styles.carnetNoEncontrado}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
          <View style={styles.carnetNoEncontradoInfo}>
            <Text style={styles.carnetNoEncontradoTexto}>
              Carnet "{carnetTexto}" no reconocido en el personal.
            </Text>
            <Pressable
              onPress={() => {
                setCarnetVinculando(carnetTexto.trim());
                setEligiendoEmpleado(true);
              }}
              style={styles.btnVincular}
            >
              <Text style={styles.btnVincularTexto}>Vincular carnet a mi nombre</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => setEligiendoEmpleado(true)}
          style={styles.linkListaPersonal}
          hitSlop={8}
        >
          <Text style={styles.linkListaPersonalTexto}>
            ¿No recuerdas tu número? Seleccionar de la lista de personal →
          </Text>
        </Pressable>
      )}
    </View>
  );

  const GuiaCondiciones = (
    <View style={styles.condicionesCard}>
      <Text style={styles.condicionesTitulo}>Validación de captura en tiempo real:</Text>
      <View style={styles.condicionFila}>
        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        <Text style={styles.condicionTexto}>Rostro centrado de frente en el óvalo</Text>
      </View>
      <View style={styles.condicionFila}>
        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        <Text style={styles.condicionTexto}>Buena luz y sin gorras ni accesorios</Text>
      </View>
    </View>
  );

  const Encabezado = (
    <>
      <Text style={styles.titulo}>Registro de asistencia</Text>
      <Text style={styles.subtitulo}>
        {registrado
          ? 'Asistencia registrada correctamente.'
          : 'Enfoca tu rostro dentro del óvalo con buena iluminación para registrar tu foto de asistencia.'}
      </Text>
    </>
  );

  const FotoLista = foto ? (
    <View style={styles.fotoLista}>
      <Image source={{ uri: foto.uri }} style={styles.fotoPreviewThumb} />
      <View style={styles.fotoListaInfo}>
        <View style={styles.fotoListaHead}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.fotoListaTexto}>Foto testigo lista</Text>
        </View>
        <Text style={styles.fotoListaDetalle} numberOfLines={1}>
          {empleadoSeleccionado?.nombreCompleto ?? 'Empleado seleccionado'}
        </Text>
      </View>
      <Pressable
        onPress={reiniciar}
        accessibilityRole={a11y.button}
        accessibilityLabel="Descartar la foto y tomar otra"
        hitSlop={8}
        style={styles.btnCambiarFoto}
      >
        <Text style={styles.fotoListaCambiar}>Tomar otra</Text>
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

  const AccionMarcar = (
    <PrimaryCTA
      label={
        enviando
          ? 'Registrando asistencia…'
          : !empleadoSeleccionado
            ? 'Ingresa tu carnet para identificarte'
            : foto
              ? `Confirmar marcaje de ${empleadoSeleccionado.nombre.split(' ')[0]}`
              : 'Tomar foto de marcaje'
      }
      iconName="finger-print"
      onPress={() => registrar()}
      disabled={!foto || ocupado || faltaTienda || !empleadoSeleccionado}
    />
  );

  const Nota = faltaTienda ? null : (
    <View style={styles.nota}>
      <Ionicons
        name="shield-checkmark-outline"
        size={iconSize.md}
        color={colors.primary}
      />
      <Text style={styles.notaTexto}>
        <Text style={styles.negrita}>Acreditación en tiempo real:</Text> La foto se
        registra como documento personal de asistencia validando tu presencia y hora oficial en la tienda.
      </Text>
    </View>
  );

  const Marcaje = registrado ? (
    <MarcajeRegistrado
      asistencia={registrado}
      carnet={carnetTexto || obtenerCarnetDeUsuario(registrado.usuarioId, carnetMap)}
      onRepetir={reiniciar}
    />
  ) : null;

  const ModalSelectorEmpleado = (
    <Modal
      visible={eligiendoEmpleado}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setEligiendoEmpleado(false);
        setCarnetVinculando(null);
      }}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHead}>
            <View style={styles.modalHeadTexto}>
              <Text style={styles.modalTitulo}>Seleccionar personal</Text>
              <Text style={styles.modalSubtitulo}>
                {carnetVinculando
                  ? `Vincula el carnet "${carnetVinculando}" a tu nombre`
                  : '¿Quién va a marcar asistencia?'}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setEligiendoEmpleado(false);
                setCarnetVinculando(null);
              }}
              hitSlop={8}
              style={styles.modalCerrar}
            >
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <TextInput
            style={styles.busquedaInput}
            placeholder="Buscar por nombre o correo…"
            placeholderTextColor={colors.textMuted}
            value={busquedaEmpleado}
            onChangeText={setBusquedaEmpleado}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />

          <ScrollView style={styles.modalLista} showsVerticalScrollIndicator={false}>
            {empleadosFiltrados.map((emp) => {
              const seleccionado = empleadoSeleccionado?.id === emp.id;
              const ciDeEmp = obtenerCarnetDeUsuario(emp.id, carnetMap);
              return (
                <Pressable
                  key={emp.id}
                  style={({ pressed }) => [
                    styles.empleadoItem,
                    seleccionado && styles.empleadoItemActivo,
                    pressed && styles.pressed,
                  ]}
                  onPress={async () => {
                    setEmpleadoSeleccionado(emp);
                    setEligiendoEmpleado(false);
                    setAviso(null);
                    const aVincular =
                      carnetVinculando ||
                      (carnetTexto.trim() &&
                      !buscarPorCarnet(carnetTexto.trim(), empleados, carnetMap)
                        ? carnetTexto.trim()
                        : null);

                    if (aVincular) {
                      const nuevoMapa = await guardarCarnet(aVincular, emp.id);
                      setCarnetMap(nuevoMapa);
                      setCarnetTexto(aVincular);
                    } else if (ciDeEmp) {
                      setCarnetTexto(ciDeEmp);
                    }
                    setCarnetVinculando(null);
                  }}
                >
                  <View
                    style={[
                      styles.empleadoItemAvatar,
                      seleccionado && styles.empleadoItemAvatarActivo,
                    ]}
                  >
                    <Ionicons
                      name="person"
                      size={18}
                      color={seleccionado ? colors.white : colors.primary}
                    />
                  </View>
                  <View style={styles.empleadoItemInfo}>
                    <Text style={styles.empleadoItemNombre} numberOfLines={1}>
                      {emp.nombreCompleto}
                    </Text>
                    <Text style={styles.empleadoItemRol} numberOfLines={1}>
                      C.I.: {ciDeEmp ?? emp.id} · {emp.rol}
                    </Text>
                  </View>
                  {seleccionado ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Header
        title={modoTiqueador ? 'Tiqueador' : 'Control de Asistencia'}
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
        <View style={styles.panes}>
          <View style={styles.paneVisual}>
            {Marcaje ?? (
              <FaceCamera
                onCaptura={alCapturar}
                guideLabel="Centra tu rostro dentro del óvalo"
                shutterLabel="Tomar foto de marcaje"
              />
            )}
          </View>

          <ScrollView
            style={styles.paneAcciones}
            contentContainerStyle={styles.scrollAcciones}
            showsVerticalScrollIndicator={false}
          >
            {BarraTienda}
            {CardIdentificacionCarnet}
            <View style={styles.card}>
              {Encabezado}
              {Marcaje ? null : (
                <>
                  {GuiaCondiciones}
                  {FotoLista}
                  {BloqueAviso}
                  {AccionMarcar}
                </>
              )}
            </View>
            {Nota}
          </ScrollView>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.columna} onLayout={medirContenido}>
            {BarraTienda}
            {CardIdentificacionCarnet}

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
                      guideLabel="Centra tu rostro dentro del óvalo"
                      shutterLabel="Tomar foto de marcaje"
                      style={[styles.camera, { height: altoCamara }]}
                    />
                    {GuiaCondiciones}
                    {FotoLista}
                    {BloqueAviso}
                    {AccionMarcar}
                  </>
                )}
              </View>
            ) : null}

            {Nota}
          </View>
        </ScrollView>
      )}

      {ModalSelectorEmpleado}

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
  carnet,
  onRepetir,
}: {
  asistencia: Asistencia;
  carnet?: string | null;
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

      <Text style={styles.resultadoConfirmacion}>Asistencia registrada</Text>
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
        {carnet ? (
          <Dato
            icon="card-outline"
            texto={`Documento (C.I.): ${carnet}`}
          />
        ) : null}
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

  resultado: { alignItems: 'center', alignSelf: 'stretch', gap: space.md, paddingHorizontal: space.sm },
  resultadoIcono: { marginTop: space.sm },
  resultadoConfirmacion: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.success,
    textAlign: 'center',
  },
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

  // ── Tarjeta de Identificación por Carnet (C.I.) ─────────────────────────
  carnetCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
    ...shadows.level1,
  },
  carnetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  carnetIcono: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carnetHeadTexto: {
    flex: 1,
    minWidth: 0,
  },
  carnetTitulo: {
    fontSize: fontSize.bodyStrong,
    fontFamily: fontFamily.sansBold,
    color: colors.text,
  },
  carnetSubtitulo: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    lineHeight: lineHeight.body,
  },
  carnetInputFila: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    paddingHorizontal: space.md,
  },
  carnetInputIcono: {
    marginRight: space.xs,
  },
  carnetInput: {
    flex: 1,
    height: 44,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  carnetBtnLimpiar: {
    padding: space.xs,
  },
  carnetReconocido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.primarySoft,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  carnetAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  carnetInfo: {
    flex: 1,
    minWidth: 0,
  },
  carnetNombre: {
    fontSize: fontSize.bodyStrong,
    fontFamily: fontFamily.sansBold,
    color: colors.text,
  },
  carnetDetalle: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    marginTop: 2,
  },
  carnetBtnCambiar: {
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  carnetBtnCambiarTexto: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.primary,
  },
  carnetNoEncontrado: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    backgroundColor: colors.warningSoft,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  carnetNoEncontradoInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  carnetNoEncontradoTexto: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.text,
  },
  btnVincular: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  btnVincularTexto: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.primary,
  },
  linkListaPersonal: {
    alignSelf: 'center',
    paddingVertical: space.xs,
  },
  linkListaPersonalTexto: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.primary,
  },

  // ── Selector de empleado / identificación ────────────────────────────────
  empleadoBarra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    ...shadows.level1,
  },
  empleadoBarraVacia: {
    borderColor: colors.warning,
    backgroundColor: colors.warningSoft,
  },
  empleadoAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empleadoBarraInfo: {
    flex: 1,
    minWidth: 0,
  },
  empleadoBarraLabel: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
  },
  empleadoBarraNombre: {
    fontSize: fontSize.bodyStrong,
    fontFamily: fontFamily.sansBold,
    color: colors.text,
  },
  cambiarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  cambiarPillTexto: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.primary,
  },

  // ── Validación y condiciones en tiempo real ──────────────────────────────
  condicionesCard: {
    backgroundColor: colors.bg,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.xs,
  },
  condicionesTitulo: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
    marginBottom: 2,
  },
  condicionFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  condicionTexto: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
  },

  // ── Preview de foto testigo ──────────────────────────────────────────────
  fotoPreviewThumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
  },
  fotoListaInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  fotoListaHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fotoListaDetalle: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
  },
  btnCambiarFoto: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },

  // ── Modal de selección de empleado ───────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '80%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    ...shadows.level2,
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeadTexto: {
    flex: 1,
    minWidth: 0,
  },
  modalTitulo: {
    fontSize: fontSize.headline,
    fontFamily: fontFamily.sansBold,
    color: colors.text,
  },
  modalSubtitulo: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
  },
  modalCerrar: {
    padding: space.xs,
  },
  busquedaInput: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sans,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  modalLista: {
    maxHeight: 320,
  },
  empleadoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
  },
  empleadoItemActivo: {
    backgroundColor: colors.primarySoft,
  },
  empleadoItemAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empleadoItemAvatarActivo: {
    backgroundColor: colors.primary,
  },
  empleadoItemInfo: {
    flex: 1,
    minWidth: 0,
  },
  empleadoItemNombre: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  empleadoItemRol: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
  },
});

