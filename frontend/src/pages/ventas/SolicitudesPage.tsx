import { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  RefreshCw,
  Package,
  Truck,
  AlertTriangle,
  CheckCircle2,
  History,
  XCircle,
  Filter,
  Loader2,
} from 'lucide-react';
import { getSolicitudes, createSolicitud, updateSolicitudEstado, type Solicitud, type CreateSolicitudInput, type UpdateSolicitudEstadoInput } from '../../api/solicitudes';
import { productsService } from '../../services/products.service';
import { getAlmacenes, getTiendas } from '../../api/locations';
import { useAuth } from '../../context';
import type { Product } from '../../types/product.types';
import '../../styles/inventory.css';

const ESTADOS_SOLICITUD = ['Pendiente', 'En preparación', 'Enviado', 'Recibido', 'Cancelado'] as const;

const ESTADO_STYLES: Record<string, 'badge-info' | 'badge-warning' | 'badge-primary' | 'badge-success' | 'badge-danger'> = {
  Pendiente: 'badge-warning',
  'En preparación': 'badge-primary',
  Enviado: 'badge-info',
  Recibido: 'badge-success',
  Cancelado: 'badge-danger',
};

export function SolicitudesPage() {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);
  const [filterEstado, setFilterEstado] = useState<string>('');

  const [products, setProducts] = useState<Product[]>([]);
  const [almacenes, setAlmacenes] = useState<Array<{ id: number; nombre: string; tipo: string }>>([]);
  const [tiendas, setTiendas] = useState<Array<{ id: number; nombre: string; tipo: string }>>([]);

  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingSolicitud, setEditingSolicitud] = useState<Solicitud | null>(null);
  const [estadoModalOpen, setEstadoModalOpen] = useState<{ solicitud: Solicitud; origenId?: number } | null>(null);

  const [formData, setFormData] = useState<CreateSolicitudInput>({
    productId: 0,
    cantidad: 1,
    tiendaId: undefined,
  });

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isTienda = user?.rol === 'tienda';
  const isAdminOrInventario = ['admin', 'inventario'].includes(user?.rol || '');

  const getAvailableStock = (productId: number): number => {
    const product = products.find((p) => p.id === productId);
    if (!product) return 0;
    return product.stockTotal ?? 0;
  };

  const selectedAvailable = getAvailableStock(formData.productId);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await productsService.getProducts({});
        setProducts(data);
      } catch (err) {
        console.error('Error cargando productos:', err);
      }
    }
    loadProducts();
  }, []);

  useEffect(() => {
    async function loadAlmacenes() {
      try {
        const data = await getAlmacenes();
        setAlmacenes(data);
      } catch (err) {
        console.error('Error cargando almacenes:', err);
      }
    }
    loadAlmacenes();
  }, []);

  useEffect(() => {
    async function loadTiendas() {
      try {
        const data = await getTiendas();
        setTiendas(data);
      } catch (err) {
        console.error('Error cargando tiendas:', err);
      }
    }
    loadTiendas();
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        const data = await getSolicitudes();
        if (isMounted) {
          setSolicitudes(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error cargando solicitudes:', err);
        if (isMounted) setLoading(false);
      }
    }
    fetchData();
    return () => { isMounted = false; };
  }, [reloadTrigger]);

  const handleRefresh = () => {
    setLoading(true);
    setReloadTrigger((prev) => prev + 1);
  };

  const handleOpenNew = () => {
    setEditingSolicitud(null);
    setFormData({ productId: 0, cantidad: 1, tiendaId: user?.tiendaId ?? undefined });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId || formData.cantidad <= 0) {
      showToast('Complete todos los campos requeridos', 'error');
      return;
    }
    if (selectedAvailable > 0 && formData.cantidad > selectedAvailable) {
      showToast(`La cantidad no puede superar el stock disponible (${selectedAvailable})`, 'error');
      return;
    }
    setSubmitting(true);
    try {
      await createSolicitud(formData);
      showToast('Solicitud creada correctamente');
      handleRefresh();
      setFormOpen(false);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Error al crear solicitud';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingSolicitud(null);
  };

  const handleOpenEstadoModal = (sol: Solicitud, origenId?: number) => {
    setEstadoModalOpen({ solicitud: sol, origenId });
  };

  const handleCloseEstadoModal = () => {
    setEstadoModalOpen(null);
  };

  const handleUpdateEstado = async (estado: UpdateSolicitudEstadoInput['estado'], origenId?: number) => {
    if (!estadoModalOpen) return;
    setSubmitting(true);
    try {
      await updateSolicitudEstado(estadoModalOpen.solicitud.id, { estado, origenId });
      showToast(`Estado actualizado a ${estado}`);
      handleRefresh();
      handleCloseEstadoModal();
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Error al actualizar estado';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSolicitudes = solicitudes.filter((s) =>
    filterEstado ? s.estado === filterEstado : true
  );

  const pendingCount = solicitudes.filter((s) => s.estado === 'Pendiente').length;
  const preparandoCount = solicitudes.filter((s) => s.estado === 'En preparación').length;
  const enviadasCount = solicitudes.filter((s) => s.estado === 'Enviado').length;

  return (
    <div className="inventory-page-container">
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            zIndex: 200,
            background: toast.type === 'success' ? '#065f46' : '#7f1d1d',
            border: `1px solid ${toast.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: '#ffffff',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.88rem',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} color="#34d399" /> : <AlertTriangle size={18} color="#f87171" />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Solicitudes a Almacén</h1>
          <p className="page-subtitle">
            Gestión de solicitudes de mercadería entre tiendas y almacenes con control de estados
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" onClick={handleRefresh} title="Recargar" disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>
          {isTienda && (
            <button type="button" className="btn-primary" onClick={handleOpenNew}>
              <Plus size={15} />
              <span>Nueva Solicitud</span>
            </button>
          )}
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <ClipboardList size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Pendientes</span>
            <span className="stat-value" style={{ color: '#fbbf24' }}>{pendingCount}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            <Package size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">En Preparación</span>
            <span className="stat-value" style={{ color: '#c084fc' }}>{preparandoCount}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <Truck size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Enviadas</span>
            <span className="stat-value" style={{ color: '#60a5fa' }}>{enviadasCount}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <History size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Solicitudes</span>
            <span className="stat-value">{solicitudes.length}</span>
          </div>
        </div>
      </div>

      <div className="card-section" style={{ marginBottom: '1.5rem' }}>
        <div className="card-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 className="card-section-title">
            <Filter size={18} style={{ display: 'inline', marginRight: '8px', color: '#38bdf8' }} />
            Filtrar por Estado
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className={`btn-secondary ${!filterEstado ? 'btn-primary' : ''}`}
              onClick={() => setFilterEstado('')}
            >
              Todos
            </button>
            {ESTADOS_SOLICITUD.map((estado) => (
              <button
                key={estado}
                className={`btn-secondary ${filterEstado === estado ? 'btn-primary' : ''}`}
                onClick={() => setFilterEstado(estado)}
              >
                {estado}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card-section">
        <div className="card-section-header">
          <h2 className="card-section-title">
            <History size={18} style={{ display: 'inline', marginRight: '8px', color: '#38bdf8' }} />
            Lista de Solicitudes
          </h2>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={24} className="animate-spin" style={{ marginBottom: '0.5rem', display: 'block', margin: '0 auto 0.5rem' }} />
            Cargando solicitudes...
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Tienda</th>
                  <th>Cantidad</th>
                  <th>Estado</th>
                  <th>Almacén Origen</th>
                  <th>Solicitado por</th>
                  {isAdminOrInventario && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filteredSolicitudes.length === 0 ? (
                  <tr>
                    <td colSpan={isAdminOrInventario ? 9 : 8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      {filterEstado ? `No hay solicitudes con estado "${filterEstado}"` : 'No hay solicitudes registradas'}
                    </td>
                  </tr>
                ) : (
                  filteredSolicitudes.map((sol) => (
                    <tr key={sol.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{sol.id}</td>
                      <td>{new Date(sol.fecha).toLocaleString()}</td>
                      <td>
                        <strong>{sol.producto?.producto}</strong>
                        <br />
                        <small style={{ color: 'var(--text-muted)' }}>
                          {sol.producto?.marca} {sol.producto?.modelo} ({sol.producto?.codigoFabrica})
                        </small>
                      </td>
                      <td>{sol.tienda?.nombre}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{sol.cantidad}</td>
                      <td>
                        <span className={`badge ${ESTADO_STYLES[sol.estado] || 'badge-default'}`}>
                          {sol.estado}
                        </span>
                        {sol.auto && <span className="badge badge-primary" style={{ marginLeft: '0.25rem', fontSize: '0.65rem' }}>AUTO</span>}
                      </td>
                      <td>{sol.origen?.nombre || (sol.origenId ? 'Asignado' : '—')}</td>
                      <td>{sol.usuario?.nombre}</td>
                      {isAdminOrInventario && (
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {sol.estado === 'Pendiente' && (
                              <button
                                className="btn-icon"
                                onClick={() => handleOpenEstadoModal(sol)}
                                title="Iniciar preparación"
                              >
                                <Package size={16} />
                              </button>
                            )}
                            {sol.estado === 'En preparación' && (
                              <button
                                className="btn-icon"
                                onClick={() => handleOpenEstadoModal(sol)}
                                title="Marcar como enviado"
                              >
                                <Truck size={16} />
                              </button>
                            )}
                            {sol.estado === 'Enviado' && (
                              <button
                                className="btn-icon"
                                onClick={() => handleUpdateEstado('Recibido')}
                                title="Marcar como recibido"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            )}
                            {(sol.estado === 'Pendiente' || sol.estado === 'En preparación') && (
                              <button
                                className="btn-icon"
                                style={{ color: '#ef4444' }}
                                onClick={() => handleUpdateEstado('Cancelado')}
                                title="Cancelar"
                              >
                                <XCircle size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
      <div className="modal-overlay" onClick={handleCloseForm}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{editingSolicitud ? 'Editar Solicitud' : 'Nueva Solicitud a Almacén'}</h3>
            <button className="modal-close" onClick={handleCloseForm}>&times;</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="productId">Producto <span className="required">*</span></label>
                <select
                  id="productId"
                  className="form-input"
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: Number(e.target.value) })}
                  required
                >
                  <option value={0}>Seleccionar producto...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.producto} — {p.marca} {p.modelo} ({p.codigoFabrica}) [Disponible: {p.stockTotal ?? 0}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="cantidad">
                    Cantidad <span className="required">*</span>
                    {formData.productId > 0 && (
                      <span style={{ fontWeight: 400, fontSize: '0.78rem', color: '#38bdf8', marginLeft: '0.5rem' }}>
                        (Disponible: {selectedAvailable})
                      </span>
                    )}
                  </label>
                  <input
                    id="cantidad"
                    type="number"
                    className="form-input"
                    value={formData.cantidad}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setFormData({ ...formData, cantidad: val > selectedAvailable && selectedAvailable > 0 ? selectedAvailable : val });
                    }}
                    min="1"
                    max={selectedAvailable > 0 ? selectedAvailable : undefined}
                    required
                  />
                  {formData.productId > 0 && selectedAvailable === 0 && (
                    <small style={{ color: '#f87171', fontSize: '0.78rem' }}>Sin stock disponible</small>
                  )}
                </div>

                {isTienda ? null : (
                  <div className="form-group">
                    <label htmlFor="tiendaId">Tienda <span className="required">*</span></label>
                    <select
                      id="tiendaId"
                      className="form-input"
                      value={formData.tiendaId || ''}
                      onChange={(e) => setFormData({ ...formData, tiendaId: Number(e.target.value) || undefined })}
                      required
                    >
                      <option value="">Seleccionar tienda...</option>
                      {tiendas.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={handleCloseForm} disabled={submitting}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Crear Solicitud</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      )}

      {estadoModalOpen && (
        <div className="modal-overlay open" onClick={handleCloseEstadoModal}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cambiar Estado: Solicitud #{estadoModalOpen.solicitud.id}</h3>
              <button className="modal-close" onClick={handleCloseEstadoModal}>&times;</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: '1rem' }}>
                Producto: <strong>{estadoModalOpen.solicitud.producto?.producto}</strong>
              </p>
              <p style={{ marginBottom: '1rem' }}>
                Tienda: <strong>{estadoModalOpen.solicitud.tienda?.nombre}</strong>
              </p>
              <p style={{ marginBottom: '1rem' }}>
                Cantidad: <strong>{estadoModalOpen.solicitud.cantidad}</strong>
              </p>
              <p style={{ marginBottom: '1.5rem' }}>
                Estado actual: <span className={`badge ${ESTADO_STYLES[estadoModalOpen.solicitud.estado] || 'badge-default'}`}>
                  {estadoModalOpen.solicitud.estado}
                </span>
              </p>

              {estadoModalOpen.solicitud.estado === 'Pendiente' && (
                <button
                  className="btn-primary"
                  onClick={() => handleUpdateEstado('En preparación')}
                  disabled={submitting}
                  style={{ width: '100%' }}
                >
                  <Package size={16} />
                  <span> Iniciar Preparación</span>
                </button>
              )}

              {estadoModalOpen.solicitud.estado === 'En preparación' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ textAlign: 'left', fontWeight: 600 }}>Seleccionar Almacén de Origen:</label>
                  <select
                    className="form-input"
                    value={estadoModalOpen.origenId || ''}
                    onChange={(e) => setEstadoModalOpen({ ...estadoModalOpen, origenId: Number(e.target.value) || undefined })}
                    required
                  >
                    <option value="">Seleccionar almacén...</option>
                    {almacenes.map((alm) => (
                      <option key={alm.id} value={alm.id}>
                        {alm.nombre}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn-primary"
                    onClick={() => handleUpdateEstado('Enviado', estadoModalOpen.origenId)}
                    disabled={submitting || !estadoModalOpen.origenId}
                    style={{ width: '100%' }}
                  >
                    <Truck size={16} />
                    <span> Marcar como Enviado</span>
                  </button>
                </div>
              )}

              {estadoModalOpen.solicitud.estado === 'Enviado' && (
                <button
                  className="btn-primary"
                  onClick={() => handleUpdateEstado('Recibido')}
                  disabled={submitting}
                  style={{ width: '100%' }}
                >
                  <CheckCircle2 size={16} />
                  <span> Marcar como Recibido</span>
                </button>
              )}

              {['Pendiente', 'En preparación'].includes(estadoModalOpen.solicitud.estado) && (
                <button
                  className="btn-secondary"
                  onClick={() => handleUpdateEstado('Cancelado')}
                  disabled={submitting}
                  style={{ width: '100%', marginTop: '0.5rem', color: '#ef4444', borderColor: '#ef4444' }}
                >
                  <XCircle size={16} />
                  <span> Cancelar Solicitud</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}