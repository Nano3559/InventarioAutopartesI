import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User, UserRole } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const LOCAL_CREDENTIALS: Record<string, { email: string; password: string; role: UserRole }> = {
  admin: {
    email: 'admin@autorepuestos.com',
    password: 'Admin1234!',
    role: 'admin',
  },
  tienda: {
    email: 'tienda1@autorepuestos.com',
    password: 'Tienda1234!',
    role: 'tienda',
  },
  inventario: {
    email: 'almacen@autorepuestos.com',
    password: 'Almacen1234!',
    role: 'inventario',
  },
};

const mockUsers: Record<string, User> = {
  admin: {
    id: 1,
    nombre: 'Administrador',
    email: 'admin@autorepuestos.com',
    rol: 'admin',
    tienda: null,
    tiendaId: null,
    createdAt: new Date().toISOString(),
  },
  tienda: {
    id: 2,
    nombre: 'Usuario Tienda',
    email: 'tienda1@autorepuestos.com',
    rol: 'tienda',
    tienda: { id: 1, nombre: 'Tienda 1', tipo: 'tienda', numero: 1, codigo: 'T-001' },
    tiendaId: 1,
    createdAt: new Date().toISOString(),
  },
  inventario: {
    id: 3,
    nombre: 'Encargado Inventario',
    email: 'almacen@autorepuestos.com',
    rol: 'inventario',
    tienda: { id: 1, nombre: 'Almacén 1', tipo: 'almacen', numero: 1, codigo: 'W-001' },
    tiendaId: 1,
    createdAt: new Date().toISOString(),
  },
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const storedUser = localStorage.getItem('__mock_user__');
      if (storedUser && active) {
        setUser(JSON.parse(storedUser));
      }
      if (active) setLoading(false);
    }

    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    for (const [role, creds] of Object.entries(LOCAL_CREDENTIALS)) {
      if (creds.email === email && creds.password === password) {
        const user = mockUsers[role];
        setUser(user);
        localStorage.setItem('__mock_user__', JSON.stringify(user));
        return;
      }
    }
    throw new Error('Credenciales incorrectas');
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    localStorage.removeItem('__mock_user__');
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signOut }),
    [user, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}