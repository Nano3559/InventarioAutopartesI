import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDashboard, DashboardResponse } from '../api/reportes';
import { getSolicitudes, Solicitud } from '../api/solicitudes';
import { getSales, Sale } from '../api/sales';
import { getLocations, Location } from '../api/locations';

export function useAdminDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const dashboard = await getDashboard(token);
      setData(dashboard);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [token]);

  return { data, loading, error, refetch };
}

export function useInventarioDashboard() {
  const { token } = useAuth();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [stats, setStats] = useState<{
    pendientes: number;
    enPreparacion: number;
    enviadasHoy: number;
    criticos: number;
    sinStock: number;
    stockBajo: number;
  }>({ pendientes: 0, enPreparacion: 0, enviadasHoy: 0, criticos: 0, sinStock: 0, stockBajo: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [sols, dashboard] = await Promise.all([
        getSolicitudes(token),
        getDashboard(token),
      ]);
      setSolicitudes(sols);
      setStats({
        pendientes: sols.filter((s) => s.estado === 'Pendiente').length,
        enPreparacion: sols.filter((s) => s.estado === 'En preparación').length,
        enviadasHoy: sols.filter((s) => s.estado === 'Enviado' && isToday(s.fecha)).length,
        criticos: dashboard.inventario.sinStock + dashboard.inventario.stockBajo,
        sinStock: dashboard.inventario.sinStock,
        stockBajo: dashboard.inventario.stockBajo,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [token]);

  return { solicitudes, stats, loading, error, refetch };
}

export function useTiendaDashboard() {
  const { token, user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<{
    ventasHoy: number;
    totalVendido: number;
    productosVendidos: number;
    pendientesFactura: number;
  }>({ ventasHoy: 0, totalVendido: 0, productosVendidos: 0, pendientesFactura: 0 });
  const [topProducts, setTopProducts] = useState<Array<{ producto: string; vendidos: number; ingresos: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    if (!token || !user?.tiendaId) return;
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [ventas, dashboard] = await Promise.all([
        getSales(token, { desde: today, hasta: today, tiendaId: user.tiendaId }),
        getDashboard(token),
      ]);
      setSales(ventas);
      
      const totalVendido = ventas.reduce((a, v) => a + v.total, 0);
      const productosVendidos = ventas.reduce((a, v) => a + v.items.reduce((b, i) => b + i.cantidad, 0), 0);
      const pendientesFactura = ventas.filter((v) => !v.requiereFactura).length;

      setStats({
        ventasHoy: ventas.length,
        totalVendido,
        productosVendidos,
        pendientesFactura,
      });

      // Top productos del mes
      const mesActual = new Date().toISOString().slice(0, 7);
      const ventasMes = await getSales(token, { desde: `${mesActual}-01`, tiendaId: user.tiendaId });
      const productMap = new Map<number, { producto: string; vendidos: number; ingresos: number }>();
      for (const v of ventasMes) {
        for (const item of v.items) {
          const key = item.product.id;
          const existing = productMap.get(key) || { producto: item.product.producto, vendidos: 0, ingresos: 0 };
          existing.vendidos += item.cantidad;
          existing.ingresos += item.subtotal;
          productMap.set(key, existing);
        }
      }
      const sorted = Array.from(productMap.values())
        .sort((a, b) => b.vendidos - a.vendidos)
        .slice(0, 5);
      setTopProducts(sorted);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar dashboard tienda');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [token, user?.tiendaId]);

  return { sales, stats, topProducts, loading, error, refetch };
}

function isToday(fecha: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return fecha.startsWith(today);
}