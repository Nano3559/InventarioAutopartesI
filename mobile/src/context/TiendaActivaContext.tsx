import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { getTiendas, type Location } from '../api/locations';
import { getToken } from '../storage/token';
import {
  clearTiendaActiva,
  getTiendaActiva,
  saveTiendaActiva,
} from '../storage/tiendaActiva';

interface TiendaActivaContextValue {
  /** Las 7 tiendas, para el picker. */
  tiendas: Location[];
  /** Tienda elegida en este dispositivo, o `null` si aún no se eligió. */
  tienda: { id: number; nombre: string } | null;
  /** Id de la tienda elegida (atajo para pasarlo a la API). */
  tiendaId: number | null;
  /** Elige la tienda donde está el admin y la persiste en el dispositivo. */
  seleccionar: (tienda: Location) => void;
  /** Borra la elección (vuelve a "sin tienda"). */
  limpiar: () => void;
}

const TiendaActivaContext = createContext<TiendaActivaContextValue | null>(null);

/**
 * Tienda activa del admin para el POS móvil (ver `storage/tiendaActiva.ts`).
 *
 * El rol `tienda` no la usa: su tienda es fija en `users.tiendaId` y el backend
 * rechaza ventas contra otra. Este contexto existe para el admin, que sí puede
 * vender en cualquiera de las 7 y quiere elegirlo desde la app.
 *
 * La lista de tiendas se carga al haber token (tras el login, porque el provider
 * monta antes de que exista la sesión) y se vuelve a leer de disco para
 * restaurar la última elección.
 */
export function TiendaActivaProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [tiendas, setTiendas] = useState<Location[]>([]);
  const [guardada, setGuardada] = useState<number | null>(null);
  const [nombreGuardado, setNombreGuardado] = useState('');

  useEffect(() => {
    let vigente = true;

    if (!token) {
      // Sin sesión no hay nada que elegir (y al cerrar sesión se limpia el
      // estado en memoria; lo persistido se re lee en el próximo login).
      setTiendas([]);
      setGuardada(null);
      setNombreGuardado('');
      return;
    }

    void (async () => {
      // En paralelo: la preferencia guardada (dispositivo) y las tiendas (red).
      const [config, tokenLimpio] = await Promise.all([getTiendaActiva(), getToken()]);
      const lista = await getTiendas(tokenLimpio ?? token).catch((e) => {
        console.error('Error cargando tiendas:', e);
        return [] as Location[];
      });
      if (!vigente) return;

      setTiendas(lista);
      // Si la tienda persistida ya no existe en el catálogo, se ignora y se
      // vuelve a pedir la elección en vez de vender contra algo dado de baja.
      const existe = !!config && lista.some((t) => t.id === config.tiendaId);
      setGuardada(existe && config ? config.tiendaId : null);
      setNombreGuardado(existe && config ? config.tiendaNombre : '');
    })();

    return () => {
      vigente = false;
    };
  }, [token]);

  const seleccionar = useCallback((tienda: Location) => {
    setGuardada(tienda.id);
    setNombreGuardado(tienda.nombre);
    void saveTiendaActiva({
      tiendaId: tienda.id,
      tiendaNombre: tienda.nombre,
      elegidaEn: new Date().toISOString(),
    });
  }, []);

  const limpiar = useCallback(() => {
    setGuardada(null);
    setNombreGuardado('');
    void clearTiendaActiva();
  }, []);

  const tienda = useMemo(() => {
    const encontrada = tiendas.find((t) => t.id === guardada);
    if (encontrada) return { id: encontrada.id, nombre: encontrada.nombre };
    // La lista de tiendas todavía no llegó: se usa el nombre cacheado para no
    // parpadear el selector entre "sin tienda" y la tienda elegida.
    if (guardada !== null && nombreGuardado) {
      return { id: guardada, nombre: nombreGuardado };
    }
    return null;
  }, [tiendas, guardada, nombreGuardado]);

  const value = useMemo(
    () => ({ tiendas, tienda, tiendaId: guardada, seleccionar, limpiar }),
    [tiendas, tienda, guardada, seleccionar, limpiar],
  );

  return (
    <TiendaActivaContext.Provider value={value}>
      {children}
    </TiendaActivaContext.Provider>
  );
}

export function useTiendaActiva(): TiendaActivaContextValue {
  const ctx = useContext(TiendaActivaContext);
  if (!ctx) {
    throw new Error('useTiendaActiva debe usarse dentro de TiendaActivaProvider');
  }
  return ctx;
}
