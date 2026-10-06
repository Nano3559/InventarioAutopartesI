import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Configuración del **terminal de tiqueo** (tarea R9).
 *
 * Hay un único usuario `admin` y hay una tablet por tienda, todas logueadas con
 * esa misma cuenta. Por eso la tienda **no** puede salir de `users.tiendaId`: es
 * un dato del usuario, y si el admin la cambiara desde su celular, las tres
 * tablets empezarían a marcar en la misma tienda. La pertenencia del terminal es
 * un dato **del dispositivo**, y por eso vive acá y no en la base.
 *
 * Consecuencia asumida: si se desinstala la app o se cambia de tablet, hay que
 * volver a configurar la tienda.
 */

const TERMINAL_KEY = 'terminal_tiqueo';

export interface ConfigTerminal {
  /** Id de `locations` de la tienda a la que pertenece esta tablet. */
  tiendaId: number;
  /** Se cachean el nombre y el código para pintar la pantalla sin esperar la red. */
  tiendaNombre: string;
  tiendaCodigo: string;
  /** ISO de cuándo el admin asignó la tienda. Solo informativo. */
  configuradoEn: string;
}

function esConfig(valor: unknown): valor is ConfigTerminal {
  if (typeof valor !== 'object' || valor === null) return false;
  const c = valor as Partial<ConfigTerminal>;
  return (
    typeof c.tiendaId === 'number' &&
    Number.isFinite(c.tiendaId) &&
    typeof c.tiendaNombre === 'string' &&
    typeof c.tiendaCodigo === 'string'
  );
}

export async function getTerminal(): Promise<ConfigTerminal | null> {
  try {
    const crudo =
      Platform.OS === 'web'
        ? localStorage.getItem(TERMINAL_KEY)
        : await SecureStore.getItemAsync(TERMINAL_KEY);
    if (!crudo) return null;
    const parseado: unknown = JSON.parse(crudo);
    // Un JSON corrupto (quedó a medias una escritura) no debe romper la app:
    // se descarta y el terminal vuelve al estado "sin configurar".
    return esConfig(parseado) ? parseado : null;
  } catch {
    return null;
  }
}

export async function saveTerminal(config: ConfigTerminal): Promise<void> {
  const crudo = JSON.stringify(config);
  if (Platform.OS === 'web') {
    localStorage.setItem(TERMINAL_KEY, crudo);
    return;
  }
  await SecureStore.setItemAsync(TERMINAL_KEY, crudo);
}

export async function clearTerminal(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(TERMINAL_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TERMINAL_KEY);
}

// ── Modo kiosco ───────────────────────────────────────────────────────────────
//
// El flag va **persistido**, no en memoria: en una tablet que queda siempre en el
// mostrador, cerrar y volver a abrir la app no puede devolver el kiosk a la app
// completa de admin, porque el token de admin sigue guardado en el dispositivo y
// cualquiera que tome la tablet vería ventas, precios y reportes. Al arrancar, si
// el flag está activo, la app vuelve directa al tiqueador; la única forma de salir
// sigue siendo el botón "Salir" con la contraseña del administrador.

const MODO_KEY = 'tiqueador_activo';

export async function getTiqueadorActivo(): Promise<boolean> {
  try {
    const crudo =
      Platform.OS === 'web'
        ? localStorage.getItem(MODO_KEY)
        : await SecureStore.getItemAsync(MODO_KEY);
    return crudo === '1';
  } catch {
    return false;
  }
}

export async function setTiqueadorActivo(activo: boolean): Promise<void> {
  if (Platform.OS === 'web') {
    if (activo) localStorage.setItem(MODO_KEY, '1');
    else localStorage.removeItem(MODO_KEY);
    return;
  }
  if (activo) await SecureStore.setItemAsync(MODO_KEY, '1');
  else await SecureStore.deleteItemAsync(MODO_KEY);
}
