import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getTiqueadorActivo, setTiqueadorActivo } from '../storage/terminal';

interface TiqueadorContextValue {
  /** `true` = la app entera está en modo tiqueador (sin drawer). */
  activo: boolean;
  /**
   * `false` hasta que se leyó el flag persistido. Mientras es `false` la app NO debe
   * renderizar nada: si se mostrara la pantalla normal antes de saber que el
   * terminal está en modo kiosco, la sesión de admin se vería un instante.
   */
  listo: boolean;
  /** Entra al modo tiqueador. Solo debe llamarse tras validar la contraseña. */
  entrar: () => void;
  /** Sale del modo tiqueador. Solo debe llamarse tras validar la contraseña. */
  salir: () => void;
}

const TiqueadorContext = createContext<TiqueadorContextValue | null>(null);

/**
 * Estado del **modo tiqueador** (tarea R9).
 *
 * Vive fuera del navegador de navegación a propósito: en modo tiqueador la app
 * no debe renderizar el drawer ni el stack, porque en una tablet de tienda el
 * operador no tiene por qué ver el resto de la aplicación (ventas, reportes,
 * precios). `App.tsx` intercambia el árbol entero por la pantalla de marcaje.
 *
 * La contraseña la valida `AdminPasswordGate`; este contexto solo guarda si el
 * modo está abierto o cerrado.
 *
 * El estado además se **persiste** (ver `storage/terminal.ts`): si solo viviera
 * en memoria, reiniciar la app dejaría al descubierto la sesión de admin completa
 * guardada en esa misma tablet.
 */
export function TiqueadorProvider({ children }: { children: ReactNode }) {
  const [activo, setActivo] = useState(false);
  const [listo, setListo] = useState(false);

  // Al arrancar se lee el flag; hasta que responda, la app queda en el spinner de
  // carga en vez de mostrar la interfaz normal.
  useEffect(() => {
    let vigente = true;
    void (async () => {
      const guardado = await getTiqueadorActivo();
      if (!vigente) return;
      setActivo(guardado);
      setListo(true);
    })();
    return () => {
      vigente = false;
    };
  }, []);

  const entrar = useCallback(() => {
    setActivo(true);
    void setTiqueadorActivo(true);
  }, []);

  const salir = useCallback(() => {
    setActivo(false);
    void setTiqueadorActivo(false);
  }, []);

  const value = useMemo(
    () => ({ activo, listo, entrar, salir }),
    [activo, listo, entrar, salir],
  );

  return (
    <TiqueadorContext.Provider value={value}>{children}</TiqueadorContext.Provider>
  );
}

export function useTiqueador(): TiqueadorContextValue {
  const ctx = useContext(TiqueadorContext);
  if (!ctx) {
    throw new Error('useTiqueador debe usarse dentro de TiqueadorProvider');
  }
  return ctx;
}