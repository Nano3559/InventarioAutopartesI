import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { UsuarioListado } from '../api/users';

const CARNETS_KEY = 'personal_carnets_map';

/**
 * Mapeo de Carnet de Identidad (C.I.) a `usuarioId`.
 * Permite reconocer al personal mediante su número de carnet sin depender
 * de biometría matemática propensa a fallos.
 */
export type CarnetMap = Record<string, number>;

// Carnets por defecto para las cuentas del sistema (pueden ser personalizados por el usuario)
const CARNETS_SEMILLA: CarnetMap = {
  '1': 1,
  '1001': 1,
  '2': 2,
  '1002': 2,
  '3': 3,
  '1003': 3,
  '4': 4,
  '1004': 4,
  '5': 5,
  '1005': 5,
};

/** Obtiene el diccionario completo de carnets registrados. */
export async function getCarnetMap(): Promise<CarnetMap> {
  try {
    const crudo =
      Platform.OS === 'web'
        ? localStorage.getItem(CARNETS_KEY)
        : await SecureStore.getItemAsync(CARNETS_KEY);

    if (!crudo) {
      return { ...CARNETS_SEMILLA };
    }

    const parseado = JSON.parse(crudo) as Record<string, unknown>;
    const res: CarnetMap = { ...CARNETS_SEMILLA };
    for (const [ci, uid] of Object.entries(parseado)) {
      if (typeof uid === 'number') {
        res[ci.trim()] = uid;
      }
    }
    return res;
  } catch {
    return { ...CARNETS_SEMILLA };
  }
}

/** Asocia permanentemente un número de carnet a un empleado. */
export async function guardarCarnet(ci: string, usuarioId: number): Promise<CarnetMap> {
  const limpio = ci.trim();
  if (!limpio) return getCarnetMap();

  const mapa = await getCarnetMap();
  mapa[limpio] = usuarioId;

  const crudo = JSON.stringify(mapa);
  if (Platform.OS === 'web') {
    localStorage.setItem(CARNETS_KEY, crudo);
  } else {
    await SecureStore.setItemAsync(CARNETS_KEY, crudo);
  }

  return mapa;
}

/** Busca un usuario dado su número de carnet o ID. */
export function buscarPorCarnet(
  ci: string,
  usuarios: UsuarioListado[],
  mapa: CarnetMap,
): UsuarioListado | null {
  const limpio = ci.trim().toLowerCase();
  if (!limpio) return null;

  // 1. Coincidencia directa en el mapa de carnets
  if (mapa[limpio]) {
    const encontrado = usuarios.find((u) => u.id === mapa[limpio]);
    if (encontrado) return encontrado;
  }

  // 2. Coincidencia por ID directo (ej: si escribe "3" y Marco es ID 3)
  const idNum = parseInt(limpio, 10);
  if (!isNaN(idNum)) {
    const porId = usuarios.find((u) => u.id === idNum);
    if (porId) return porId;
  }

  // 3. Coincidencia por email prefix o nombre
  const porTexto = usuarios.find((u) => {
    const username = u.email.split('@')[0].toLowerCase();
    return username === limpio;
  });
  if (porTexto) return porTexto;

  return null;
}

/** Obtiene el número de carnet asociado a un usuario (si existe). */
export function obtenerCarnetDeUsuario(
  usuarioId: number,
  mapa: CarnetMap,
): string | null {
  for (const [ci, uid] of Object.entries(mapa)) {
    // Ignoramos los números cortos de 1 dígito de la semilla para mostrar el carnet principal
    if (uid === usuarioId && ci.length >= 3) {
      return ci;
    }
  }
  for (const [ci, uid] of Object.entries(mapa)) {
    if (uid === usuarioId) return ci;
  }
  return null;
}
