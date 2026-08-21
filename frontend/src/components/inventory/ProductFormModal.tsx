import { useState } from 'react';
import { X, Wrench, Save, Loader2 } from 'lucide-react';
import type { Product, CreateProductDto } from '../../types/product.types';
import { MOCK_LOCATIONS } from '../../services/locations.service';

interface ProductFormModalProps {
  productToEdit?: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateProductDto) => Promise<void>;
}

export function ProductFormModal({
  productToEdit,
  isOpen,
  onClose,
  onSave,
}: ProductFormModalProps) {
  if (!isOpen) return null;

  return (
    <ProductFormModalContent
      key={productToEdit ? `edit-${productToEdit.id}` : 'create-new'}
      productToEdit={productToEdit}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function ProductFormModalContent({
  productToEdit,
  onClose,
  onSave,
}: {
  productToEdit?: Product | null;
  onClose: () => void;
  onSave: (data: CreateProductDto) => Promise<void>;
}) {
  const isEditing = !!productToEdit;

  const [formData, setFormData] = useState<CreateProductDto>(() => {
    if (productToEdit) {
      return {
        producto: productToEdit.producto,
        fabricante: productToEdit.fabricante,
        empresaFabricante: productToEdit.empresaFabricante || '',
        marca: productToEdit.marca,
        modelo: productToEdit.modelo,
        anio: productToEdit.anio || '',
        detalle: productToEdit.detalle || '',
        codigoOem: productToEdit.codigoOem || '',
        codigoFabrica: productToEdit.codigoFabrica,
        imagen: productToEdit.imagen || '',
        costo: productToEdit.costo || 0,
        precio1: productToEdit.precio1 || 0,
        precio2: productToEdit.precio2 || 0,
        precioMayor: productToEdit.precioMayor || 0,
        stockMinimo: productToEdit.stockMinimo || 2,
        stock: {} as Record<number, number>,
      };
    }
    return {
      producto: '',
      fabricante: 'Depo',
      empresaFabricante: '',
      marca: 'Toyota',
      modelo: '',
      anio: '',
      detalle: '',
      codigoOem: '',
      codigoFabrica: '',
      imagen: '',
      costo: 0,
      precio1: 0,
      precio2: 0,
      precioMayor: 0,
      stockMinimo: 2,
      stock: {
        1: 5,
        2: 3,
        5: 2,
      } as Record<number, number>,
    };
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    field: keyof CreateProductDto,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleStockChange = (locId: number, qty: number) => {
    setFormData((prev) => ({
      ...prev,
      stock: {
        ...prev.stock,
        [locId]: Math.max(0, qty),
      },
    }));
  };

  // Cálculo automático de márgenes para sugerir precios
  const handleCostoChange = (val: number) => {
    const costo = Math.max(0, val);
    setFormData((prev) => ({
      ...prev,
      costo,
      precio1: Math.round(costo * 1.4),
      precio2: Math.round(costo * 1.3),
      precioMayor: Math.round(costo * 1.15),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.producto.trim() || !formData.codigoFabrica.trim() || !formData.marca.trim() || !formData.modelo.trim()) {
      setError('Por favor complete los campos obligatorios (*)');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div className="modal-dialog" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <Wrench size={22} color="#38bdf8" />
            <span>{isEditing ? 'Editar Repuesto' : 'Registrar Nuevo Repuesto'}</span>
          </h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert-error" style={{ marginBottom: '1rem' }}>
                <span>{error}</span>
              </div>
            )}

            {/* SECCIÓN 1: Datos del Repuesto */}
            <div className="form-section-heading">1. Información del Repuesto</div>
            <div className="form-grid-2cols">
              <div className="form-group">
                <label className="form-label">Nombre del Producto / Repuesto *</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  placeholder="Ej. Farol delantero derecho con proyector"
                  value={formData.producto}
                  onChange={(e) => handleChange('producto', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Fabricante / Marca Pieza *</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  placeholder="Ej. Depo, TYC, Denso, Koyo, Toyota"
                  value={formData.fabricante}
                  onChange={(e) => handleChange('fabricante', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Detalle / Especificaciones / Procedencia</label>
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '1rem' }}
                placeholder="Ej. Fondo negro con LED, calidad taiwanesa garantizada"
                value={formData.detalle || ''}
                onChange={(e) => handleChange('detalle', e.target.value)}
              />
            </div>

            {/* SECCIÓN 2: Compatibilidad de Vehículo */}
            <div className="form-section-heading">2. Vehículo Compatible</div>
            <div className="form-grid-2cols">
              <div className="form-group">
                <label className="form-label">Marca de Vehículo *</label>
                <select
                  className="filter-select"
                  style={{ padding: '0.75rem 1rem' }}
                  value={formData.marca}
                  onChange={(e) => handleChange('marca', e.target.value)}
                  required
                >
                  <option value="Toyota">Toyota</option>
                  <option value="Nissan">Nissan</option>
                  <option value="Jeep">Jeep</option>
                  <option value="Dodge">Dodge</option>
                  <option value="Renault">Renault</option>
                  <option value="Hyundai">Hyundai</option>
                  <option value="Mitsubishi">Mitsubishi</option>
                  <option value="Mazda">Mazda</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Modelo del Vehículo *</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  placeholder="Ej. Hilux, Corolla, Sentra, Tucson..."
                  value={formData.modelo}
                  onChange={(e) => handleChange('modelo', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-grid-2cols">
              <div className="form-group">
                <label className="form-label">Año o Rango de Años</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  placeholder="Ej. 2016-2020"
                  value={formData.anio || ''}
                  onChange={(e) => handleChange('anio', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">URL de Imagen (Opcional)</label>
                <input
                  type="url"
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  placeholder="https://..."
                  value={formData.imagen || ''}
                  onChange={(e) => handleChange('imagen', e.target.value)}
                />
              </div>
            </div>

            {/* SECCIÓN 3: Códigos de Identificación */}
            <div className="form-section-heading">3. Códigos de Pieza</div>
            <div className="form-grid-2cols">
              <div className="form-group">
                <label className="form-label">Código de Fábrica * (Único)</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '1rem', fontFamily: 'monospace' }}
                  placeholder="Ej. DEP-212-11V6R"
                  value={formData.codigoFabrica}
                  onChange={(e) => handleChange('codigoFabrica', e.target.value)}
                  required
                  disabled={isEditing}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Código Original OEM</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '1rem', fontFamily: 'monospace' }}
                  placeholder="Ej. 81110-0KD10"
                  value={formData.codigoOem || ''}
                  onChange={(e) => handleChange('codigoOem', e.target.value)}
                />
              </div>
            </div>

            {/* SECCIÓN 4: Precios y Costos */}
            <div className="form-section-heading">4. Costos y Precios de Venta (Bs.)</div>
            <div className="form-grid-2cols">
              <div className="form-group">
                <label className="form-label">Costo Base de Compra (Bs.)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  value={formData.costo}
                  onChange={(e) => handleCostoChange(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Precio 1 (Mostrador / Minorista)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  value={formData.precio1 || ''}
                  onChange={(e) => handleChange('precio1', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="form-grid-2cols">
              <div className="form-group">
                <label className="form-label">Precio 2 (Taller / Preferencial)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  value={formData.precio2 || ''}
                  onChange={(e) => handleChange('precio2', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Precio Mayorista (Distribución)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  value={formData.precioMayor || ''}
                  onChange={(e) => handleChange('precioMayor', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* SECCIÓN 5: Stock Inicial (solo en creación) */}
            {!isEditing && (
              <>
                <div className="form-section-heading">5. Stock Inicial por Ubicación</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem' }}>
                  {MOCK_LOCATIONS.map((loc) => (
                    <div key={loc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'var(--bg-alt)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{loc.nombre}</span>
                      <input
                        type="number"
                        min="0"
                        style={{ width: '60px', padding: '0.25rem 0.4rem', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px', textAlign: 'right' }}
                        value={formData.stock?.[loc.id] || 0}
                        onChange={(e) => handleStockChange(loc.id, parseInt(e.target.value, 10) || 0)}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary-action" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{isEditing ? 'Guardar Cambios' : 'Registrar Producto'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
