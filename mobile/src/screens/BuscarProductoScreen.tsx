import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import ScannerScreen from './ScannerScreen';
import SearchByImageScreen from './SearchByImageScreen';
import { colors, space, radius, fontFamily, fontSize, iconSize, a11y } from '../theme';
import { Header } from '../components';
import Ionicons from '@expo/vector-icons/Ionicons';

type Pestana = 'codigo' | 'imagen';

const PESTANAS = [
  { id: 'codigo' as const, label: 'Código de barras', icon: 'barcode-outline' as const },
  { id: 'imagen' as const, label: 'Imagen', icon: 'camera-outline' as const },
];

/**
 * Pantalla única de búsqueda de producto: el drawer tenía dos entradas
 * separadas (Escáner de Barras y Búsqueda por Imagen) para dos caminos de
 * consulta del mismo objetivo. Acá se agrupan en pestañas.
 *
 * Cada pestaña monta su pantalla original con `embebido`: esa bandera quita el
 * SafeArea/Header propios porque el chrome lo aporta esta pantalla. Se desmonta
 * la pestaña inactiva a propósito —ambas usan cámaras y no deben quedar dos
 * activas—; el costo es que al volver se empieza de cero (permiso de cámara ya
 * concedido, no se vuelve a pedir).
 */
export default function BuscarProductoScreen() {
  const navigation = useNavigation();
  const [pestana, setPestana] = useState<Pestana>('codigo');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Buscar Producto"
        subtitle="Por código de barras o por foto"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      />

      <View style={styles.tabs}>
        {PESTANAS.map((t) => {
          const activa = pestana === t.id;
          return (
            <Pressable
              key={t.id}
              style={[styles.tab, activa && styles.tabActiva]}
              onPress={() => setPestana(t.id)}
              accessibilityRole={a11y.button}
              accessibilityLabel={t.label}
              accessibilityState={{ selected: activa }}
              android_ripple={{ color: colors.primarySoft }}
            >
              <Ionicons
                name={t.icon}
                size={iconSize.sm}
                color={activa ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.tabText, activa && styles.tabTextActiva]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {pestana === 'codigo' ? <ScannerScreen embebido /> : <SearchByImageScreen embebido />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  tabs: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  tabActiva: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.sans,
    color: colors.textMuted,
  },
  tabTextActiva: {
    fontFamily: fontFamily.sansSemiBold,
    color: colors.primary,
  },
});
