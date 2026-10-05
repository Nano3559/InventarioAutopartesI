import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Header, Badge } from '../components';
import {
  listarAsistencia,
  type Asistencia,
  type AttendanceFilters,
} from '../api/attendance';
import { ApiError } from '../api/client';
import { getToken } from '../storage/token';
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

const POR_PAGINA = 20;
const HORA = { hour: '2-digit', minute: '2-digit' } as const;

function porcentaje(valor: number | null): string {
  return valor == null ? '—' : `${(valor * 100).toFixed(1)}%`;
}

/**
 * Historial de marcajes (tarea R4). Consume `GET /attendance`, que es paginado
 * con `{ data, total, page, limit, pages }`.
 *
 * Los filtros viajan como query y el backend devuelve 400 si `tipo` o `metodo`
 * no son valores válidos, así que acá solo se ofrecen los que existen en
 * `common/constants.ts`.
 */
export default function AttendanceHistoryScreen() {
  const navigation = useNavigation();

  const [items, setItems] = useState<Asistencia[]>([]);
  const [pages, setPages] = useState(1);
  const [pagina, setPagina] = useState(1);
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState<'' | 'entrada' | 'salida'>('');
  const [metodo, setMetodo] = useState<'' | 'automatico' | 'manual'>('');

  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Evita que una búsqueda-old pise el resultado de una más nueva. */
  const pedidoActual = useRef(0);

  const filtros = useCallback(
    (page: number): AttendanceFilters => ({
      page,
      limit: POR_PAGINA,
      search: search.trim() || undefined,
      tipo: tipo || undefined,
      metodo: metodo || undefined,
    }),
    [search, tipo, metodo],
  );

  const cargar = useCallback(
    async (page: number, modo: 'inicial' | 'refresh' | 'more') => {
      const ticket = ++pedidoActual.current;
      if (modo === 'inicial') setCargando(true);
      if (modo === 'refresh') setRefrescando(true);
      if (modo === 'more') setCargandoMas(true);
      setError(null);

      try {
        const token = await getToken();
        const res = await listarAsistencia(filtros(page), token);
        // Una respuesta vieja no debe pisar una nueva.
        if (ticket !== pedidoActual.current) return;

        setPagina(res.page);
        setPages(res.pages);
        setItems((prev) =>
          modo === 'more' ? [...prev, ...res.data] : res.data,
        );
      } catch (err) {
        if (ticket !== pedidoActual.current) return;
        setError(
          err instanceof ApiError
            ? err.message
            : 'No se pudo cargar el historial.',
        );
      } finally {
        if (ticket === pedidoActual.current) {
          setCargando(false);
          setRefrescando(false);
          setCargandoMas(false);
        }
      }
    },
    [filtros],
  );

  // Cada cambio de filtro vuelve a la página 1. El debounce evita una request
  // por tecla: `search` va como ILIKE contra nombre, apellido y email.
  useEffect(() => {
    const timer = setTimeout(() => {
      void cargar(1, 'inicial');
    }, search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [cargar, search, tipo, metodo]);

  const refrescar = useCallback(() => {
    void cargar(1, 'refresh');
  }, [cargar]);

  const cargarMas = useCallback(() => {
    if (cargando || cargandoMas || pagina >= pages) return;
    void cargar(pagina + 1, 'more');
  }, [cargar, cargando, cargandoMas, pagina, pages]);

  const renderItem = useCallback(
    ({ item }: { item: Asistencia }) => (
      <Fila asistencia={item} />
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Historial de Asistencia"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      />

      <View style={styles.filtros}>
        <View style={styles.buscador}>
          <Ionicons name="search" size={iconSize.sm} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Buscar por nombre o email"
            placeholderTextColor={colors.textPlaceholder}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Buscar marcajes por nombre o email"
          />
          {search ? (
            <Pressable
              onPress={() => setSearch('')}
              accessibilityRole={a11y.button}
              accessibilityLabel="Limpiar búsqueda"
              hitSlop={8}
            >
              <Ionicons
                name="close-circle"
                size={iconSize.md}
                color={colors.textMuted}
              />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.chipsFiltro}>
          <Chip
            texto="Todos"
            activo={tipo === ''}
            onPress={() => setTipo('')}
          />
          <Chip
            texto="Entradas"
            activo={tipo === 'entrada'}
            onPress={() => setTipo(tipo === 'entrada' ? '' : 'entrada')}
          />
          <Chip
            texto="Salidas"
            activo={tipo === 'salida'}
            onPress={() => setTipo(tipo === 'salida' ? '' : 'salida')}
          />
          <View style={styles.separadorChip} />
          <Chip
            texto="Automáticos"
            activo={metodo === 'automatico'}
            onPress={() =>
              setMetodo(metodo === 'automatico' ? '' : 'automatico')
            }
          />
          <Chip
            texto="Manuales"
            activo={metodo === 'manual'}
            onPress={() => setMetodo(metodo === 'manual' ? '' : 'manual')}
          />
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.lista}
        ItemSeparatorComponent={Separador}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={refrescar}
            tintColor={colors.primary}
          />
        }
        onEndReached={cargarMas}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          cargando ? null : <Vacio hayFiltros={Boolean(search || tipo || metodo)} />
        }
        ListFooterComponent={
          <View style={styles.pie}>
            {cargandoMas ? (
              <ActivityIndicator color={colors.primary} />
            ) : error ? (
              <Pressable
                onPress={refrescar}
                accessibilityRole={a11y.button}
                style={({ pressed }) => [
                  styles.reintentar,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="refresh"
                  size={iconSize.sm}
                  color={colors.danger}
                />
                <Text style={styles.reintentarTexto}>
                  {error} — tocar para reintentar
                </Text>
              </Pressable>
            ) : pagina < pages ? (
              <Text style={styles.pieTexto}>Cargando más marcajes…</Text>
            ) : items.length ? (
              <Text style={styles.pieTexto}>
                {items.length} marcaje{items.length === 1 ? '' : 's'}
              </Text>
            ) : null}
          </View>
        }
      />

      {cargando ? (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.overlayTexto}>Cargando historial…</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function Separador() {
  return <View style={styles.separador} />;
}

function Fila({ asistencia }: { asistencia: Asistencia }) {
  const manual = asistencia.metodo === 'manual';
  const fecha = new Date(asistencia.fecha);

  return (
    <View style={styles.fila}>
      <View style={styles.filaEncabezado}>
        <View style={styles.filaQuien}>
          <Ionicons
            name="person-circle-outline"
            size={iconSize.lg}
            color={colors.textMuted}
          />
          <View style={styles.filaNombres}>
            <Text style={styles.filaNombre} numberOfLines={1}>
              {asistencia.nombreCompleto || `Usuario #${asistencia.usuarioId}`}
            </Text>
            {asistencia.usuario ? (
              <Text style={styles.filaEmail} numberOfLines={1}>
                {asistencia.usuario.email} · {asistencia.usuario.rol}
              </Text>
            ) : null}
          </View>
        </View>
        <Badge
          variant={asistencia.tipo === 'entrada' ? 'success' : 'warning'}
          size="sm"
        >
          {asistencia.tipo === 'entrada' ? 'Entrada' : 'Salida'}
        </Badge>
      </View>

      <View style={styles.filaDatos}>
        <Dato
          icon="time-outline"
          texto={`${fecha.toLocaleTimeString('es-BO', HORA)} · ${fecha.toLocaleDateString('es-BO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}`}
        />
        <Dato
          icon="location-outline"
          texto={asistencia.location?.nombre ?? 'Sin tienda registrada'}
        />
        <Dato
          icon={manual ? 'hand-left-outline' : 'finger-print-outline'}
          texto={
            manual
              ? 'Marcaje manual'
              : `Reconocido con ${porcentaje(asistencia.confianza)} de confianza`
          }
        />
        {asistencia.confirmadoPor ? (
          <Dato
            icon="shield-checkmark-outline"
            texto={`Confirmado por ${[
              asistencia.confirmadoPor.nombre,
              asistencia.confirmadoPor.apellido,
            ]
              .filter(Boolean)
              .join(' ')}`}
          />
        ) : null}
      </View>
    </View>
  );
}

function Dato({
  icon,
  texto,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  texto: string;
}) {
  return (
    <View style={styles.dato}>
      <Ionicons name={icon} size={iconSize.sm} color={colors.textMuted} />
      <Text style={styles.datoTexto}>{texto}</Text>
    </View>
  );
}

function Chip({
  texto,
  activo,
  onPress,
}: {
  texto: string;
  activo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={a11y.button}
      accessibilityState={{ selected: activo }}
      style={({ pressed }) => [
        styles.chip,
        activo && styles.chipActivo,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>
        {texto}
      </Text>
    </Pressable>
  );
}

function Vacio({ hayFiltros }: { hayFiltros: boolean }) {
  return (
    <View style={styles.vacio}>
      <Ionicons
        name={hayFiltros ? 'search-outline' : 'calendar-outline'}
        size={iconSize.lg}
        color={colors.textMuted}
      />
      <Text style={styles.vacioTitulo}>
        {hayFiltros ? 'Sin resultados' : 'Todavía no hay marcajes'}
      </Text>
      <Text style={styles.vacioTexto}>
        {hayFiltros
          ? 'Probá con otro nombre o quitá los filtros.'
          : 'Los marcajes que se registren desde la pantalla de asistencia van a aparecer acá.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  filtros: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sans,
    color: colors.text,
  },

  chipsFiltro: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.xs },
  separadorChip: { width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: space.xs },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  chipActivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTexto: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansMedium,
    color: colors.textMuted,
  },
  chipTextoActivo: { color: colors.white, fontFamily: fontFamily.sansSemiBold },

  lista: { padding: space.lg, paddingBottom: space.xl },
  separador: { height: space.sm },

  fila: {
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: space.sm,
    ...shadows.level1,
  },
  filaEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  filaQuien: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flex: 1,
  },
  filaNombres: { flex: 1 },
  filaNombre: {
    fontSize: fontSize.bodyStrong,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  filaEmail: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
  },
  filaDatos: { gap: space.xs },

  dato: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  datoTexto: {
    flex: 1,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    lineHeight: lineHeight.relaxed,
  },

  pie: { paddingVertical: space.lg, alignItems: 'center' },
  pieTexto: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
  },
  reintentar: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  reintentarTexto: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansMedium,
    color: colors.danger,
    textAlign: 'center',
  },

  vacio: { alignItems: 'center', gap: space.sm, paddingVertical: space['3xl'] },
  vacioTitulo: {
    fontSize: fontSize.headline,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  vacioTexto: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: lineHeight.body,
    paddingHorizontal: space.lg,
  },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    backgroundColor: colors.bg,
  },
  overlayTexto: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
  },

  pressed: { opacity: opacity.pressed },
});