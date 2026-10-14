import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTiendaActiva } from '../context/TiendaActivaContext';
import {
  colors,
  space,
  radius,
  fontFamily,
  fontSize,
  componentStyles,
  iconSize,
  a11y,
} from '../theme';

interface SelectorTiendaActivaProps {
  /** Texto del campo. Por defecto explica para qué se elige la tienda. */
  label?: string;
}

/**
 * Selector de "¿en qué tienda está el admin vendiendo?" (POS móvil).
 *
 * Se usa en el dashboard y en Ventas: elegir tienda en una pantalla la cambia
 * en las dos, porque el estado vive en `TiendaActivaContext` y se persiste en
 * el dispositivo. No se muestra al rol `tienda`, cuya tienda es fija en
 * `users.tiendaId`.
 *
 * No confundir con `TiendaSelector.tsx`, que es el picker del **tiqueador**
 * (tablet del kiosco, tarea R9) y controla otra cosa.
 */
export default function SelectorTiendaActiva({ label = 'Tienda donde estás vendiendo' }: SelectorTiendaActivaProps) {
  const { tiendas, tienda, seleccionar } = useTiendaActiva();
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.btn, componentStyles.inputBase, !tienda && styles.btnSinTienda]}
        onPress={() => setVisible(true)}
        accessibilityRole={a11y.button}
        accessibilityLabel={
          tienda
            ? `Tienda activa: ${tienda.nombre}. Toca para cambiar`
            : 'Seleccionar la tienda donde estás vendiendo'
        }
        accessibilityHint="Abre la lista de tiendas"
        android_ripple={{ color: colors.primarySoft }}
      >
        <Ionicons
          name="storefront"
          size={iconSize.md}
          color={tienda ? colors.primary : colors.warning}
        />
        <Text style={[styles.btnText, !tienda && styles.btnTextSinTienda]} numberOfLines={1}>
          {tienda ? tienda.nombre : 'Seleccionar tienda...'}
        </Text>
        <Ionicons name="chevron-down" size={iconSize.sm} color={colors.textMuted} />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>¿En qué tienda estás?</Text>
              <Pressable onPress={() => setVisible(false)} hitSlop={12} accessibilityRole={a11y.button} accessibilityLabel="Cerrar">
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>
            <FlatList
              data={tiendas}
              keyExtractor={(item) => String(item.id)}
              style={styles.list}
              renderItem={({ item }) => {
                const activa = tienda?.id === item.id;
                return (
                  <Pressable
                    style={[styles.item, activa && styles.itemActive]}
                    onPress={() => {
                      seleccionar(item);
                      setVisible(false);
                    }}
                    accessibilityRole={a11y.button}
                    accessibilityLabel={`Elegir tienda ${item.nombre}`}
                    accessibilityState={{ selected: activa }}
                  >
                    <Ionicons name="storefront-outline" size={iconSize.md} color={colors.primary} />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemText}>{item.nombre}</Text>
                      <Text style={styles.itemSub}>
                        {item.codigo}
                        {item.ubicacion ? ` · ${item.ubicacion}` : ''}
                      </Text>
                    </View>
                    {activa && (
                      <Ionicons name="checkmark-circle" size={iconSize.lg} color={colors.primary} />
                    )}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  label: {
    fontSize: fontSize.captionStrong,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  btnSinTienda: {
    borderColor: colors.warning,
  },
  btnText: {
    flex: 1,
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  btnTextSinTienda: {
    color: colors.warning,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.headline,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  close: { fontSize: 20, color: colors.textMuted, padding: space.xs },
  list: { maxHeight: 320 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  itemInfo: { flex: 1, minWidth: 0, gap: 2 },
  itemText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.sansSemiBold,
    color: colors.text,
  },
  itemSub: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
  },
});
