import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getTiendas, type Location } from '../api/locations';
import { getToken } from '../storage/token';
import Badge from './Badge';
import {
  colors,
  space,
  radius,
  fontFamily,
  fontSize,
  shadows,
  iconSize,
  a11y,
  opacity,
} from '../theme';

interface TiendaSelectorProps {
  visible: boolean;
  /** Tienda ya configurada en esta tablet, para marcarla en la lista. */
  seleccionadaId?: number | null;
  onCancel: () => void;
  onSelect: (tienda: Location) => void;
}

/**
 * Pregunta a qué tienda pertenece **esta tablet** (tarea R9).
 *
 * Es un `GET /locations` filtrado por `tipo = 'tienda'`:
 * `locations.controller.ts` solo exige JWT (no `@Roles`), así que no hace falta
 * ningún endpoint nuevo.
 */
export default function TiendaSelector({
  visible,
  seleccionadaId,
  onCancel,
  onSelect,
}: TiendaSelectorProps) {
  const [tiendas, setTiendas] = useState<Location[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setTiendas(null);
    setError(null);
    try {
      const token = await getToken();
      setTiendas(await getTiendas(token ?? undefined));
    } catch {
      setError('No se pudo leer la lista de tiendas.');
    }
  }, []);

  useEffect(() => {
    if (visible) void cargar();
  }, [visible, cargar]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <Pressable
          style={styles.fuera}
          onPress={onCancel}
          accessibilityRole={a11y.button}
          accessibilityLabel="Cerrar"
        />
        <View style={styles.lamina}>
          <View style={styles.cabecera}>
            <View style={styles.cabeceraInfo}>
              <Text style={styles.titulo} numberOfLines={1}>
                Tienda de esta tablet
              </Text>
              <Text style={styles.subtitulo} numberOfLines={2}>
                Todos los marcajes que se hagan desde acá quedan en la tienda que
                elijas.
              </Text>
            </View>
            <Pressable
              onPress={onCancel}
              hitSlop={12}
              accessibilityRole={a11y.button}
              accessibilityLabel={a11y.close}
            >
              <Ionicons name="close" size={iconSize.lg} color={colors.textMuted} />
            </Pressable>
          </View>

          {tiendas === null ? (
            <View style={styles.cargando}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.error} accessibilityRole={a11y.alert}>
              <Ionicons name="alert-circle" size={iconSize.md} color={colors.danger} />
              <Text style={styles.errorTexto}>{error}</Text>
            </View>
          ) : tiendas.length === 0 ? (
            <Text style={styles.vacio}>No hay tiendas cargadas en el sistema.</Text>
          ) : (
            <ScrollView
              contentContainerStyle={styles.lista}
              showsVerticalScrollIndicator={false}
            >
              {tiendas.map((t) => {
                const activa = t.id === seleccionadaId;
                return (
                  <Pressable
                    key={t.id}
                    style={({ pressed }) => [
                      styles.fila,
                      activa && styles.filaActiva,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => onSelect(t)}
                    accessibilityRole={a11y.button}
                    accessibilityLabel={`Tienda ${t.nombre}`}
                    accessibilityState={{ selected: activa }}
                  >
                    <View style={styles.filaInfo}>
                      <Text style={styles.filaNombre} numberOfLines={1}>
                        {t.nombre}
                      </Text>
                      <Text style={styles.filaMeta} numberOfLines={1}>
                        {t.codigo}
                        {t.ubicacion ? ` · ${t.ubicacion}` : ''}
                      </Text>
                    </View>
                    {activa ? (
                      <Badge variant="success" size="sm">
                        Actual
                      </Badge>
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={iconSize.md}
                        color={colors.textMuted}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  fuera: { flex: 1 },
  lamina: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.lg,
    gap: space.lg,
    maxHeight: '80%',
    ...shadows.level4,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.md,
  },
  cabeceraInfo: { flex: 1, minWidth: 0 },
  titulo: {
    fontSize: fontSize.title,
    fontFamily: fontFamily.sansBold,
    color: colors.text,
  },
  subtitulo: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    marginTop: space.xs,
  },
  cargando: { paddingVertical: space['3xl'], alignItems: 'center' },
  lista: { gap: space.sm, paddingBottom: space.lg },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  filaActiva: { borderColor: colors.success, backgroundColor: colors.successSoft },
  filaInfo: { flex: 1, minWidth: 0 },
  filaNombre: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  filaMeta: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    marginTop: 2,
  },
  error: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorTexto: {
    flex: 1,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sansMedium,
    color: colors.danger,
  },
  vacio: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: space['3xl'],
  },
  pressed: { opacity: opacity.pressed },
});
