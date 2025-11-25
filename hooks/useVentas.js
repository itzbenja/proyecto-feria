import { useState, useEffect, useCallback, useMemo } from 'react';
import { ventasService, supabase, subscribeToVentas } from '../supabase';
import { offlineService } from '../utils/offline';

// Función helper para mapear filas de Supabase a formato de la app
const mapRowToVenta = (row) => {
  return {
    id: row?.id ?? row?.identificacion ?? `temp-${Date.now()}`,
    cliente: row?.cliente ?? '',
    productos: Array.isArray(row?.productos) ? row.productos : [],
    metodoPago: row?.metodo_pago ?? 'Efectivo',
    fecha: row?.fecha ?? new Date().toISOString(),
    pagado: !!row?.pagado,
    abonos: Array.isArray(row?.abonos) ? row.abonos : [],
  };
};

/**
 * Hook personalizado para manejar ventas
 * Proporciona estado, carga, errores y funciones CRUD
 */
export function useVentas() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar ventas desde Supabase (con soporte offline)
  const loadVentas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Intentar cargar con modo offline
      const { ventas: ventasData, source } = await offlineService.loadVentas();
      setVentas(ventasData.map(mapRowToVenta));
      
      // Si estaba offline, intentar sincronizar
      if (source === 'cache' || source === 'offline_queue') {
        const syncResult = await offlineService.syncQueue();
        if (syncResult.synced > 0) {
          // Recargar después de sincronizar
          const data = await ventasService.getAllVentas();
          setVentas(data.map(mapRowToVenta));
        }
      }
    } catch (e) {
      const errorMessage = e?.message || 'Error al cargar ventas';
      setError(errorMessage);
      console.error('Error loading ventas:', e);
      
      // Intentar cargar desde caché si falla
      try {
        const cached = await offlineService.getCachedVentas();
        if (cached) {
          setVentas(cached.map(mapRowToVenta));
        }
      } catch (cacheError) {
        console.error('Error loading from cache:', cacheError);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar ventas al montar y suscribirse a cambios
  useEffect(() => {
    loadVentas();

    // Suscripción en tiempo real
    const channel = subscribeToVentas(async () => {
      try {
        const data = await ventasService.getAllVentas();
        setVentas(data.map(mapRowToVenta));
      } catch (e) {
        console.error('Error en suscripción:', e);
      }
    });

    return () => {
      try {
        if (channel) {
          supabase.removeChannel(channel);
        }
      } catch (e) {
        console.error('Error removing channel:', e);
      }
    };
  }, [loadVentas]);

  // Crear nueva venta (con soporte offline)
  const createVenta = useCallback(async (ventaData) => {
    try {
      setError(null);
      
      // Verificar conexión
      const isOnline = await offlineService.isOnline();
      
      if (!isOnline) {
        // Guardar en cola offline
        const ventaOffline = await offlineService.queueVenta(ventaData);
        const mapped = mapRowToVenta(ventaOffline);
        setVentas(prev => [mapped, ...prev]);
        return mapped;
      }
      
      // Crear en servidor
      const created = await ventasService.createVenta(ventaData);
      const mapped = mapRowToVenta(created);
      
      // Actualización optimista
      setVentas(prev => [mapped, ...prev]);
      
      return mapped;
    } catch (e) {
      // Si falla, intentar guardar offline
      try {
        const ventaOffline = await offlineService.queueVenta(ventaData);
        const mapped = mapRowToVenta(ventaOffline);
        setVentas(prev => [mapped, ...prev]);
        return mapped;
      } catch (offlineError) {
        const errorMessage = e?.message || 'Error al crear venta';
        setError(errorMessage);
        throw e;
      }
    }
  }, []);

  // Actualizar estado de pago
  const updatePagado = useCallback(async (ventaId, pagado) => {
    try {
      setError(null);
      
      // Actualización optimista
      setVentas(prev => prev.map(v => 
        v.id === ventaId ? { ...v, pagado } : v
      ));
      
      await ventasService.updatePagado(ventaId, pagado);
    } catch (e) {
      // Revertir si falla
      setVentas(prev => prev.map(v => 
        v.id === ventaId ? { ...v, pagado: !pagado } : v
      ));
      const errorMessage = e?.message || 'Error al actualizar pago';
      setError(errorMessage);
      throw e;
    }
  }, []);

  // Agregar abono
  const addAbono = useCallback(async (ventaId, abono) => {
    try {
      setError(null);
      const updated = await ventasService.addAbono(ventaId, abono);
      const mapped = mapRowToVenta(updated);
      
      setVentas(prev => prev.map(v => 
        v.id === ventaId ? mapped : v
      ));
      
      return mapped;
    } catch (e) {
      const errorMessage = e?.message || 'Error al agregar abono';
      setError(errorMessage);
      throw e;
    }
  }, []);

  // Actualizar venta completa
  const updateVenta = useCallback(async (ventaId, ventaData) => {
    try {
      setError(null);
      const updated = await ventasService.updateVenta(ventaId, ventaData);
      const mapped = mapRowToVenta(updated);
      
      setVentas(prev => prev.map(v => 
        v.id === ventaId ? mapped : v
      ));
      
      return mapped;
    } catch (e) {
      const errorMessage = e?.message || 'Error al actualizar venta';
      setError(errorMessage);
      throw e;
    }
  }, []);

  // Eliminar venta
  const deleteVenta = useCallback(async (ventaId) => {
    // Guardar copia para revertir si falla
    let ventaToDelete = null;
    
    try {
      setError(null);
      
      // Buscar la venta antes de eliminarla
      setVentas(prev => {
        ventaToDelete = prev.find(v => v.id === ventaId);
        return prev.filter(v => v.id !== ventaId);
      });
      
      await ventasService.deleteVenta(ventaId);
    } catch (e) {
      // Revertir si falla
      if (ventaToDelete) {
        setVentas(prev => [...prev, ventaToDelete].sort((a, b) => 
          new Date(b.fecha) - new Date(a.fecha)
        ));
      }
      const errorMessage = e?.message || 'Error al eliminar venta';
      setError(errorMessage);
      throw e;
    }
  }, []);

  // Obtener ventas por cliente
  const getVentasByCliente = useCallback((cliente) => {
    return ventas.filter(v => v.cliente === cliente);
  }, [ventas]);

  // Calcular total del día
  const totalDelDia = useMemo(() => {
    const hoy = new Date();
    return ventas
      .filter(v => {
        const fecha = new Date(v.fecha);
        return fecha.getDate() === hoy.getDate() &&
               fecha.getMonth() === hoy.getMonth() &&
               fecha.getFullYear() === hoy.getFullYear();
      })
      .reduce((acc, v) => {
        return acc + v.productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
      }, 0);
  }, [ventas]);

  // Número de ventas del día
  const numeroVentasDelDia = useMemo(() => {
    const hoy = new Date();
    return ventas.filter(v => {
      const fecha = new Date(v.fecha);
      return fecha.getDate() === hoy.getDate() &&
             fecha.getMonth() === hoy.getMonth() &&
             fecha.getFullYear() === hoy.getFullYear();
    }).length;
  }, [ventas]);

  return {
    ventas,
    loading,
    error,
    refresh: loadVentas,
    createVenta,
    updateVenta,
    updatePagado,
    addAbono,
    deleteVenta,
    getVentasByCliente,
    totalDelDia,
    numeroVentasDelDia,
  };
}

