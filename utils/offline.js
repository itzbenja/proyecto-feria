import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { ventasService } from '../supabase';

const OFFLINE_QUEUE_KEY = 'offline_queue';
const OFFLINE_VENTAS_KEY = 'offline_ventas_cache';

/**
 * Servicio de modo offline
 */
export const offlineService = {
  /**
   * Verificar estado de conexión
   */
  async isOnline() {
    try {
      const networkState = await Network.getNetworkStateAsync();
      return networkState.isConnected && networkState.isInternetReachable;
    } catch (error) {
      console.error('Error al verificar conexión:', error);
      return false;
    }
  },

  /**
   * Guardar venta en cola offline
   */
  async queueVenta(ventaData) {
    try {
      const queue = await this.getOfflineQueue();
      const ventaConId = {
        ...ventaData,
        id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        fecha: ventaData.fecha || new Date().toISOString(),
        offline: true,
        synced: false
      };
      
      queue.push(ventaConId);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      
      return ventaConId;
    } catch (error) {
      console.error('Error al encolar venta:', error);
      throw error;
    }
  },

  /**
   * Obtener cola offline
   */
  async getOfflineQueue() {
    try {
      const queueStr = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      return queueStr ? JSON.parse(queueStr) : [];
    } catch (error) {
      console.error('Error al obtener cola offline:', error);
      return [];
    }
  },

  /**
   * Sincronizar cola offline con servidor
   */
  async syncQueue() {
    try {
      const isOnline = await this.isOnline();
      if (!isOnline) {
        return { synced: 0, failed: 0, message: 'Sin conexión a internet' };
      }

      const queue = await this.getOfflineQueue();
      if (queue.length === 0) {
        return { synced: 0, failed: 0, message: 'No hay ventas pendientes' };
      }

      let synced = 0;
      let failed = 0;
      const errors = [];

      for (const venta of queue) {
        try {
          // Intentar crear la venta en el servidor
          await ventasService.createVenta({
            cliente: venta.cliente,
            productos: venta.productos,
            metodo_pago: venta.metodo_pago,
            pagado: venta.pagado,
            abonos: venta.abonos || [],
            fecha: venta.fecha
          });

          // Marcar como sincronizada
          venta.synced = true;
          synced++;
        } catch (error) {
          console.error(`Error al sincronizar venta ${venta.id}:`, error);
          failed++;
          errors.push({ ventaId: venta.id, error: error.message });
        }
      }

      // Remover ventas sincronizadas de la cola
      const remainingQueue = queue.filter(v => !v.synced);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));

      return { synced, failed, errors, remaining: remainingQueue.length };
    } catch (error) {
      console.error('Error al sincronizar cola:', error);
      throw error;
    }
  },

  /**
   * Guardar ventas en caché local
   */
  async cacheVentas(ventas) {
    try {
      await AsyncStorage.setItem(OFFLINE_VENTAS_KEY, JSON.stringify({
        ventas,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error al guardar caché:', error);
    }
  },

  /**
   * Obtener ventas del caché local
   */
  async getCachedVentas(maxAge = 24 * 60 * 60 * 1000) { // 24 horas por defecto
    try {
      const cacheStr = await AsyncStorage.getItem(OFFLINE_VENTAS_KEY);
      if (!cacheStr) return null;

      const cache = JSON.parse(cacheStr);
      const age = Date.now() - cache.timestamp;

      if (age > maxAge) {
        // Caché expirado
        await AsyncStorage.removeItem(OFFLINE_VENTAS_KEY);
        return null;
      }

      return cache.ventas;
    } catch (error) {
      console.error('Error al obtener caché:', error);
      return null;
    }
  },

  /**
   * Cargar ventas (online primero, luego offline)
   */
  async loadVentas() {
    try {
      const isOnline = await this.isOnline();
      
      if (isOnline) {
        // Intentar cargar desde servidor
        try {
          const ventas = await ventasService.getAllVentas();
          await this.cacheVentas(ventas);
          return { ventas, source: 'online' };
        } catch (error) {
          console.error('Error al cargar desde servidor:', error);
          // Fallback a caché
          const cached = await this.getCachedVentas();
          if (cached) {
            return { ventas: cached, source: 'cache' };
          }
          throw error;
        }
      } else {
        // Modo offline: usar caché
        const cached = await this.getCachedVentas();
        if (cached) {
          return { ventas: cached, source: 'cache' };
        }
        
        // Si no hay caché, usar cola offline
        const queue = await this.getOfflineQueue();
        return { ventas: queue, source: 'offline_queue' };
      }
    } catch (error) {
      console.error('Error al cargar ventas:', error);
      throw error;
    }
  },

  /**
   * Limpiar cola offline (solo ventas sincronizadas)
   */
  async clearSyncedQueue() {
    try {
      const queue = await this.getOfflineQueue();
      const remaining = queue.filter(v => !v.synced);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
      return remaining.length;
    } catch (error) {
      console.error('Error al limpiar cola:', error);
      return 0;
    }
  },

  /**
   * Obtener estadísticas de sincronización
   */
  async getSyncStats() {
    try {
      const queue = await this.getOfflineQueue();
      const isOnline = await this.isOnline();
      
      return {
        isOnline,
        pending: queue.filter(v => !v.synced).length,
        total: queue.length
      };
    } catch (error) {
      console.error('Error al obtener stats:', error);
      return { isOnline: false, pending: 0, total: 0 };
    }
  }
};














