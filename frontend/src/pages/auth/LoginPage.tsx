import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context';
import { Wrench, Mail, Lock, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import '../../styles/login.css';

export function LoginPage() {
  const [email, setEmail] = useState('admin@importadoras.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirigir a la ruta previa o al dashboard
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor complete todos los campos');
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Credenciales inválidas o error de conexión';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickFill = (testEmail: string, testPass: string) => {
    setEmail(testEmail);
    setPassword(testPass);
    setError(null);
  };

  return (
    <div className="login-wrapper">
      <div className="login-glow-orb-1" />
      <div className="login-glow-orb-2" />

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-container">
            <Wrench size={28} />
          </div>
          <h1 className="login-title">AutoRepuestos Pro</h1>
          <p className="login-subtitle">
            Sistema Integral de Inventario y Ventas
          </p>
        </div>

        {/* Quick Role Fillers for smooth team testing */}
        <div className="quick-roles-section">
          <span className="quick-roles-title">⚡ Acceso Rápido de Prueba (Demo)</span>
          <div className="quick-roles-grid">
            <button
              type="button"
              className="quick-role-btn"
              onClick={() => handleQuickFill('admin@importadoras.com', 'admin123')}
            >
              👑 Administrador
            </button>
            <button
              type="button"
              className="quick-role-btn"
              onClick={() => handleQuickFill('inventario@importadoras.com', 'inventario123')}
            >
              📦 Encargado Inventario
            </button>
            <button
              type="button"
              className="quick-role-btn"
              onClick={() => handleQuickFill('tienda1@importadoras.com', 'venta123')}
            >
              🛒 Vendedor Tienda 1
            </button>
            <button
              type="button"
              className="quick-role-btn"
              onClick={() => handleQuickFill('tienda2@importadoras.com', 'venta123')}
            >
              🛒 Vendedor Tienda 2
            </button>
            <button
              type="button"
              className="quick-role-btn"
              onClick={() => handleQuickFill('tienda3@importadoras.com', 'venta123')}
            >
              🛒 Vendedor Tienda 3
            </button>
          </div>
        </div>

        {error && (
          <div className="alert-error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Correo Electrónico
            </label>
            <div className="input-wrapper">
              <Mail className="input-icon" />
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="ejemplo@autorepuestos.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Contraseña
            </label>
            <div className="input-wrapper">
              <Lock className="input-icon" />
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-submit"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>Ingresar al Sistema</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
