import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Construction, ArrowLeft } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
  milestoneCode: string;
  responsible: 'Marco (Web Admin)' | 'Raúl (Web Tienda)' | 'Brian (Backend)';
  targetDay?: string;
  icon?: ReactNode;
}

export function PlaceholderPage({
  title,
  description,
  milestoneCode,
  responsible,
  targetDay,
  icon,
}: PlaceholderPageProps) {
  return (
    <div className="placeholder-container">
      <div className="placeholder-icon-box">
        {icon || <Construction size={32} />}
      </div>
      <h2 className="placeholder-title">{title}</h2>
      <p className="placeholder-desc">{description}</p>
      
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <span className="assigned-badge">
          📌 Tarea: <strong>{milestoneCode}</strong>
        </span>
        <span className="assigned-badge">
          👤 Responsable: <strong>{responsible}</strong>
        </span>
        {targetDay && (
          <span className="assigned-badge">
            📅 Plan: <strong>{targetDay}</strong>
          </span>
        )}
      </div>

      <NavLink
        to="/dashboard"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--accent)',
          fontSize: '0.9rem',
          fontWeight: 600,
        }}
      >
        <ArrowLeft size={16} />
        <span>Volver al Dashboard</span>
      </NavLink>
    </div>
  );
}
