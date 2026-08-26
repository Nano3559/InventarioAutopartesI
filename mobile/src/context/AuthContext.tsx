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
import { login as apiLogin, me as apiMe } from '../api/auth';
import { saveToken, getToken, deleteToken } from '../storage/token';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  token: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const storedToken = await getToken();
      if (storedToken && active) {
        try {
          const userData = await apiMe(storedToken);
          setUser(userData);
          setTokenState(storedToken);
        } catch {
          await deleteToken();
        }
      }
      if (active) setLoading(false);
    }

    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { token: newToken, user: userData } = await apiLogin(email.trim(), password);
    await saveToken(newToken);
    setUser(userData);
    setTokenState(newToken);
  }, []);

  const signOut = useCallback(async () => {
    await deleteToken();
    setUser(null);
    setTokenState(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, token, signIn, signOut }),
    [user, loading, token, signIn, signOut],
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