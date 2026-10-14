import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Tienda donde está el **admin** en el POS móvil.
 *
 * El admin no tiene `users.tiendaId` fijo porque supervisa las 7 tiendas, pero
 * el POS necesita saber en cuál está vendiendo: de ahí sale el stock mostrado y
 * el `locationId` de la venta. Esa tienda es una decisión del momento ("hoy
 * estoy en La Paz"), así que se guarda **en el dispositivo**, igual que la
 * configuración del terminal de tiqueo, y no en la BD: cambiarla desde el
 * celular del admin no puede mover la tienda de nadie más.
 *
 * No se reutiliza `storage/terminal.ts` a propósito: esa clave define a qué
 * tienda pertenece la **tablet del kiosco** y mezclarla con la sesión del admin
 * haría que cambiar la tienda del POS tocara el tiqueador.
 *
 * Consecuencia asumida: si se desinstala la app o se cambia de dispositivo, hay
 * que volver a elegir la tienda.
 */

const KEY = 'tienda_activa_admin';

export interface TiendaActiva {
  /** Id de `locations` de la tienda donde está el admin. */
  tiendaId: number;
  /** Se cachea el nombre para pintar el selector sin esperar la red. */
  tiendaNombre: string;
  /** ISO de cuándo se eligió. Solo informativo. */
  elegidaEn: string;
}

function esTiendaActiva(valor: unknown): valor is TiendaActiva {
  if (typeof valor !== 'object' || valor === null) return false;
  const t = valor as Partial<TiendaActiva>;
  return (
    typeof t.tiendaId === 'number' &&
    Number.isFinite(t.tiendaId) &&
    typeof t.tiendaNombre === 'string'
  );
}

export async function getTiendaActiva(): Promise<TiendaActiva | null> {
  try {
    const crudo =
      Platform.OS === 'web'
        ? localStorage.getItem(KEY)
        : await SecureStore.getItemAsync(KEY);
    if (!crudo) return null;
    const parseado: unknown = JSON.parse(crudo);
    // Un JSON corrupto no debe romper la app: se descarta y se vuelve a pedir
    // la elección.
    return esTiendaActiva(parseado) ? parseado : null;
  } catch {
    return null;
  }
}

export async function saveTiendaActiva(tienda: TiendaActiva): Promise<void> {
  const crudo = JSON.stringify(tienda);
  if (Platform.OS === 'web') {
    localStorage.setItem(KEY, crudo);
    return;
  }
  await SecureStore.setItemAsync(KEY, crudo);
}

export async function clearTiendaActiva(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(KEY);
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}
