import { NavLink } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="placeholder-container" style={{ minHeight: '60vh' }}>
      <div className="placeholder-icon-box" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
        <AlertTriangle size={36} />
      </div>
      <h1 className="placeholder-title" style={{ fontSize: '2rem' }}>404 - Página no encontrada</h1>
      <p className="placeholder-desc">
        La ruta a la que intentas acceder no existe en el sistema o ha sido movida.
      </p>

      <NavLink
        to="/dashboard"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.65rem 1.25rem',
          background: 'var(--accent)',
          color: '#000000',
          fontWeight: 600,
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.9rem',
        }}
      >
        <Home size={16} />
        <span>Ir al Dashboard</span>
      </NavLink>
    </div>
  );
}
