import { useState, useEffect, type ReactNode } from 'react';
import { AuthContext } from './AuthContextDefinition';
import { api, ApiError } from '../api/client';
import type { User, LoginCredentials, AuthResponse, UserRole } from '../types/auth.types';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// Mock users para facilitar pruebas locales si el backend no está corriendo
const MOCK_USERS: Record<string, { user: User; token: string }> = {
  'admin@autorepuestos.com': {
    token: 'mock-jwt-admin-token-xyz',
    user: {
      id: 1,
      nombre: 'Marco Admin',
      email: 'admin@autorepuestos.com',
      rol: 'admin',
      tiendaId: null,
      tienda: null,
    },
  },
  'tienda1@autorepuestos.com': {
    token: 'mock-jwt-tienda-token-xyz',
    user: {
      id: 2,
      nombre: 'Raúl Vendedor',
      email: 'tienda1@autorepuestos.com',
      rol: 'tienda',
      tiendaId: 1,
      tienda: {
        id: 1,
        nombre: 'Tienda Central #1',
        tipo: 'tienda',
      },
    },
  },
  'almacen@autorepuestos.com': {
    token: 'mock-jwt-inventario-token-xyz',
    user: {
      id: 3,
      nombre: 'Brian Almacenero',
      email: 'almacen@autorepuestos.com',
      rol: 'inventario',
      tiendaId: null,
      tienda: null,
    },
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved) as User;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      // 1. Intentar autenticación con el backend de NestJS
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    } catch (err) {
      // 2. Si el backend está apagado o falla la red, soporte de login de prueba para desarrollo
      const normalizedEmail = credentials.email.toLowerCase().trim();
      if (MOCK_USERS[normalizedEmail]) {
        const mock = MOCK_USERS[normalizedEmail];
        setToken(mock.token);
        setUser(mock.user);
        localStorage.setItem(TOKEN_KEY, mock.token);
        localStorage.setItem(USER_KEY, JSON.stringify(mock.user));
        return;
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.rol);
    }
    return user.rol === roles;
  };

  // Validar sesión al cargar
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      // Si es un token mock, lo dejamos pasar
      if (storedToken.startsWith('mock-jwt-')) {
        setIsLoading(false);
        return;
      }

      try {
        const userProfile = await api.get<User>('/auth/me');
        setUser(userProfile);
        localStorage.setItem(USER_KEY, JSON.stringify(userProfile));
      } catch (err) {
        console.warn('Sesión expirada o backend inaccesible:', err);
        if (err instanceof ApiError && err.status === 401) {
          logout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
