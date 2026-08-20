import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context';
import type { UserRole } from '../types/auth.types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          background: 'var(--bg)',
          color: 'var(--text-muted)',
          gap: '1rem',
        }}
      >
        <Loader2 size={36} color="var(--accent)" className="animate-spin" />
        <span>Verificando sesión...</span>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    // Si no tiene el rol permitido, redirigir al dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
