import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ventasService } from '../supabase';

const BACKUP_KEY = 'feria_backup_data';
const BACKUP_METADATA_KEY = 'feria_backup_metadata';

/**
 * Sistema de Backup y Recuperación
 * Permite exportar e importar todos los datos de la aplicación
 */

export const backupService = {
  /**
   * Crear backup completo de todas las ventas
   */
  async createBackup() {
    try {
      // Obtener todas las ventas
      const ventas = await ventasService.getAllVentas();
      
      // Crear objeto de backup con metadata
      const backup = {
        version: '1.0.0',
        fecha: new Date().toISOString(),
        totalVentas: ventas.length,
        datos: ventas,
        metadata: {
          appVersion: '1.0.0',
          timestamp: Date.now()
        }
      };

      // Guardar en AsyncStorage
      await AsyncStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
      
      // Guardar metadata
      const metadata = {
        fecha: backup.fecha,
        totalVentas: backup.totalVentas,
        tamaño: JSON.stringify(backup).length
      };
      await AsyncStorage.setItem(BACKUP_METADATA_KEY, JSON.stringify(metadata));

      return backup;
    } catch (error) {
      console.error('Error al crear backup:', error);
      throw new Error('No se pudo crear el backup: ' + error.message);
    }
  },

  /**
   * Exportar backup a archivo JSON
   */
  async exportBackupToFile() {
    try {
      const backup = await this.createBackup();
      
      // Crear nombre de archivo con fecha
      const fecha = new Date().toISOString().split('T')[0];
      const filename = `backup_feria_${fecha}.json`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      // Escribir archivo
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backup, null, 2));
      
      // Compartir archivo
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Compartir backup'
        });
      }
      
      return { fileUri, backup };
    } catch (error) {
      console.error('Error al exportar backup:', error);
      throw new Error('No se pudo exportar el backup: ' + error.message);
    }
  },

  /**
   * Obtener backup guardado localmente
   */
  async getLocalBackup() {
    try {
      const backupStr = await AsyncStorage.getItem(BACKUP_KEY);
      if (!backupStr) return null;
      
      return JSON.parse(backupStr);
    } catch (error) {
      console.error('Error al obtener backup local:', error);
      return null;
    }
  },

  /**
   * Obtener metadata del último backup
   */
  async getBackupMetadata() {
    try {
      const metadataStr = await AsyncStorage.getItem(BACKUP_METADATA_KEY);
      if (!metadataStr) return null;
      
      return JSON.parse(metadataStr);
    } catch (error) {
      console.error('Error al obtener metadata:', error);
      return null;
    }
  },

  /**
   * Restaurar desde backup
   */
  async restoreFromBackup(backupData, options = { replace: false }) {
    try {
      if (!backupData || !backupData.datos) {
        throw new Error('Formato de backup inválido');
      }

      const ventas = backupData.datos;
      
      if (options.replace) {
        // Eliminar todas las ventas existentes primero
        // Nota: Esto requiere una función en ventasService para eliminar todas
        console.warn('Opción de reemplazo completo no implementada aún');
      }

      // Restaurar ventas una por una
      const restored = [];
      for (const venta of ventas) {
        try {
          // Intentar crear la venta
          const restoredVenta = await ventasService.createVenta({
            cliente: venta.cliente,
            productos: venta.productos,
            metodo_pago: venta.metodo_pago || venta.metodoPago,
            pagado: venta.pagado,
            abonos: venta.abonos || [],
            fecha: venta.fecha // Mantener fecha original
          });
          restored.push(restoredVenta);
        } catch (error) {
          console.error(`Error al restaurar venta ${venta.id}:`, error);
        }
      }

      return {
        total: ventas.length,
        restored: restored.length,
        failed: ventas.length - restored.length
      };
    } catch (error) {
      console.error('Error al restaurar backup:', error);
      throw new Error('No se pudo restaurar el backup: ' + error.message);
    }
  },

  /**
   * Restaurar desde archivo JSON
   */
  async restoreFromFile(fileUri) {
    try {
      // Leer archivo
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const backupData = JSON.parse(fileContent);
      
      // Restaurar
      return await this.restoreFromBackup(backupData);
    } catch (error) {
      console.error('Error al restaurar desde archivo:', error);
      throw new Error('No se pudo restaurar desde archivo: ' + error.message);
    }
  },

  /**
   * Verificar integridad del backup
   */
  async verifyBackup(backupData) {
    try {
      if (!backupData) return { valid: false, errors: ['Backup vacío'] };
      
      const errors = [];
      
      // Verificar estructura
      if (!backupData.datos || !Array.isArray(backupData.datos)) {
        errors.push('Estructura de datos inválida');
      }
      
      // Verificar ventas
      if (backupData.datos) {
        backupData.datos.forEach((venta, index) => {
          if (!venta.cliente) errors.push(`Venta ${index}: falta cliente`);
          if (!venta.productos || !Array.isArray(venta.productos)) {
            errors.push(`Venta ${index}: productos inválidos`);
          }
        });
      }
      
      return {
        valid: errors.length === 0,
        errors,
        totalVentas: backupData.datos?.length || 0,
        fecha: backupData.fecha
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error.message]
      };
    }
  },

  /**
   * Auto-backup programado (se ejecuta en background)
   */
  async scheduleAutoBackup(intervalHours = 24) {
    try {
      const lastBackup = await this.getBackupMetadata();
      if (!lastBackup) {
        // Crear primer backup
        await this.createBackup();
        return;
      }

      const hoursSinceBackup = (Date.now() - new Date(lastBackup.fecha).getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceBackup >= intervalHours) {
        await this.createBackup();
      }
    } catch (error) {
      console.error('Error en auto-backup:', error);
    }
  }
};














