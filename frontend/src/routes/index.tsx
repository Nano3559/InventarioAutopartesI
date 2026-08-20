import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { PlaceholderPage } from '../pages/placeholder/PlaceholderPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import {
  Boxes,
  ShoppingCart,
  ShoppingBag,
  ArrowLeftRight,
  ClipboardList,
  Tags,
  DollarSign,
  BarChart3,
  RotateCcw,
} from 'lucide-react';

export function AppRoutes() {
  return (
    <Routes>
      {/* Ruta pública */}
      <Route path="/login" element={<LoginPage />} />

      {/* Rutas protegidas dentro del MainLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Módulos de Marco (Web Admin) */}
        <Route
          path="inventario"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <PlaceholderPage
                title="Módulo de Inventario Global"
                description="Tabla de repuestos con filtros por marca, modelo, año, OEM y stock desglosado en 4 almacenes y 3 tiendas."
                milestoneCode="M2"
                responsible="Marco (Web Admin)"
                targetDay="Día 2 (Jue 20/08)"
                icon={<Boxes size={32} color="#38bdf8" />}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="precios"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <PlaceholderPage
                title="Gestión de Precios"
                description="Cálculo automático de Precio 1 y Precio 2 con porcentajes de margen configurables y exportación a Excel."
                milestoneCode="M8"
                responsible="Marco (Web Admin)"
                targetDay="Día 8 (Jue 27/08)"
                icon={<Tags size={32} color="#38bdf8" />}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="costos"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <PlaceholderPage
                title="Costos y Facturas de Compra"
                description="Registro de compras por factura y proveedor, actualización de stock y costos por ítem."
                milestoneCode="M7"
                responsible="Marco (Web Admin)"
                targetDay="Día 7 (Mié 26/08)"
                icon={<DollarSign size={32} color="#38bdf8" />}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="movimientos"
          element={
            <ProtectedRoute allowedRoles={['admin', 'inventario']}>
              <PlaceholderPage
                title="Movimientos y Traslados"
                description="Control de traslados entre almacenes y tiendas, confirmación de salidas e ingresos físicos."
                milestoneCode="M5"
                responsible="Marco (Web Admin)"
                targetDay="Día 5 (Lun 24/08)"
                icon={<ArrowLeftRight size={32} color="#38bdf8" />}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="reportes"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <PlaceholderPage
                title="Reportes y Estadísticas"
                description="Métricas de ventas diarias, mensuales, por tienda, por marca y reportes de rentabilidad."
                milestoneCode="M9"
                responsible="Marco (Web Admin)"
                targetDay="Día 9 (Vie 28/08)"
                icon={<BarChart3 size={32} color="#38bdf8" />}
              />
            </ProtectedRoute>
          }
        />

        {/* Módulos de Raúl (Web Tienda) */}
        <Route
          path="ventas"
          element={
            <ProtectedRoute allowedRoles={['admin', 'tienda']}>
              <PlaceholderPage
                title="Punto de Venta (POS)"
                description="Buscador rápido de repuestos, carrito, totalizador, cobro por efectivo/QR/transferencia y nota de venta."
                milestoneCode="R3"
                responsible="Raúl (Web Tienda)"
                targetDay="Día 3 (Vie 21/08)"
                icon={<ShoppingCart size={32} color="#60a5fa" />}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="ventas-mayor"
          element={
            <ProtectedRoute allowedRoles={['admin', 'tienda']}>
              <PlaceholderPage
                title="Ventas por Mayor"
                description="Carga rápida de pedidos por lista o importación de archivo Excel con validación de stock."
                milestoneCode="R7"
                responsible="Raúl (Web Tienda)"
                targetDay="Día 7 (Mié 26/08)"
                icon={<ShoppingBag size={32} color="#60a5fa" />}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="devoluciones"
          element={
            <ProtectedRoute allowedRoles={['admin', 'tienda']}>
              <PlaceholderPage
                title="Devoluciones de Mercadería"
                description="Registro de devoluciones de productos por venta previa y reincorporación al inventario."
                milestoneCode="R4"
                responsible="Raúl (Web Tienda)"
                targetDay="Día 4 (Sáb 22/08)"
                icon={<RotateCcw size={32} color="#60a5fa" />}
              />
            </ProtectedRoute>
          }
        />

        {/* Módulo Conjunto Almacén / Tiendas */}
        <Route
          path="solicitudes"
          element={
            <ProtectedRoute allowedRoles={['admin', 'tienda', 'inventario']}>
              <PlaceholderPage
                title="Solicitudes a Almacén"
                description="Gestión de solicitudes de mercadería entre tiendas y almacenes con control de estados."
                milestoneCode="M6 / R4"
                responsible="Marco (Web Admin)"
                targetDay="Día 6 (Mar 25/08)"
                icon={<ClipboardList size={32} color="#a78bfa" />}
              />
            </ProtectedRoute>
          }
        />

        {/* 404 para subrutas no coincidentes dentro del layout */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* 404 global */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
