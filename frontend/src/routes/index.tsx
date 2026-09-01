import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { InventoryPage } from '../pages/inventory/InventoryPage';
import { ProductDetailPage } from '../pages/inventory/ProductDetailPage';
import { SalesPage } from '../pages/ventas/SalesPage';
import { DevolucionesPage } from '../pages/ventas/DevolucionesPage';
import { SolicitudesPage } from '../pages/ventas/SolicitudesPage';
import { VentaMayorPage } from '../pages/ventas/VentaMayorPage';
import { MovimientosPage } from '../pages/movimientos/MovimientosPage';
import { CostosPage } from '../pages/costos/CostosPage';
import { PreciosPage } from '../pages/precios/PreciosPage';
import { ReportesPage } from '../pages/reportes/ReportesPage';

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

        {/* Módulos de Inventario de Marco (M2 y M3) */}
        <Route
          path="inventario"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="inventario/:id"
          element={
            <ProtectedRoute allowedRoles={['admin', 'tienda', 'inventario']}>
              <ProductDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Módulo de Precios de Marco (M8) */}
        <Route
          path="precios"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <PreciosPage />
            </ProtectedRoute>
          }
        />

        {/* Módulo de Costos de Marco (M7) */}
        <Route
          path="costos"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <CostosPage />
            </ProtectedRoute>
          }
        />

        {/* Módulo de Movimientos de Marco (M5) */}
        <Route
          path="movimientos"
          element={
            <ProtectedRoute allowedRoles={['admin', 'inventario']}>
              <MovimientosPage />
            </ProtectedRoute>
          }
        />

        {/* Módulo de Reportes (Admin ve todo, Tienda ve sus reportes) */}
        <Route
          path="reportes"
          element={
            <ProtectedRoute allowedRoles={['admin', 'tienda']}>
              <ReportesPage />
            </ProtectedRoute>
          }
        />

        {/* Módulos de Raúl (Web Tienda) */}
        <Route
          path="ventas"
          element={
            <ProtectedRoute allowedRoles={['admin', 'tienda']}>
              <SalesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="ventas/:id/editar"
          element={
            <ProtectedRoute allowedRoles={['admin', 'tienda']}>
              <SalesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="ventas-mayor"
          element={
            <ProtectedRoute allowedRoles={['admin', 'tienda']}>
              <VentaMayorPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="devoluciones"
          element={
            <ProtectedRoute allowedRoles={['admin', 'tienda']}>
              <DevolucionesPage />
            </ProtectedRoute>
          }
        />

        {/* Módulo Conjunto Almacén / Tiendas */}
        <Route
          path="solicitudes"
          element={
            <ProtectedRoute allowedRoles={['admin', 'tienda', 'inventario']}>
              <SolicitudesPage />
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
