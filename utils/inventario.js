import AsyncStorage from '@react-native-async-storage/async-storage';
import { productosService } from './productos';

const INVENTARIO_KEY = 'inventario_stock';
const MOVIMIENTOS_KEY = 'movimientos_inventario';

/**
 * Servicio de inventario y control de stock
 */
export const inventarioService = {
  /**
   * Obtener inventario completo
   */
  async getInventario() {
    try {
      const inventarioStr = await AsyncStorage.getItem(INVENTARIO_KEY);
      return inventarioStr ? JSON.parse(inventarioStr) : {};
    } catch (error) {
      console.error('Error al obtener inventario:', error);
      return {};
    }
  },

  /**
   * Guardar inventario
   */
  async saveInventario(inventario) {
    try {
      await AsyncStorage.setItem(INVENTARIO_KEY, JSON.stringify(inventario));
    } catch (error) {
      console.error('Error al guardar inventario:', error);
      throw error;
    }
  },

  /**
   * Obtener stock de un producto
   */
  async getStock(productoId) {
    try {
      const inventario = await this.getInventario();
      return inventario[productoId] || { cantidad: 0, minimo: 0, maximo: null };
    } catch (error) {
      console.error('Error al obtener stock:', error);
      return { cantidad: 0, minimo: 0, maximo: null };
    }
  },

  /**
   * Actualizar stock
   */
  async actualizarStock(productoId, cantidad, tipo = 'venta', motivo = '') {
    try {
      const inventario = await this.getInventario();
      const stockActual = inventario[productoId] || { cantidad: 0, minimo: 0, maximo: null };
      
      let nuevaCantidad;
      if (tipo === 'venta') {
        nuevaCantidad = stockActual.cantidad - cantidad;
      } else if (tipo === 'compra' || tipo === 'entrada') {
        nuevaCantidad = stockActual.cantidad + cantidad;
      } else if (tipo === 'ajuste') {
        nuevaCantidad = cantidad;
      } else {
        throw new Error('Tipo de movimiento inválido');
      }

      if (nuevaCantidad < 0) {
        throw new Error('No hay suficiente stock disponible');
      }

      inventario[productoId] = {
        ...stockActual,
        cantidad: nuevaCantidad,
        ultimaActualizacion: new Date().toISOString()
      };

      await this.saveInventario(inventario);

      // Registrar movimiento
      await this.registrarMovimiento({
        productoId,
        tipo,
        cantidad: tipo === 'venta' ? -cantidad : cantidad,
        stockAnterior: stockActual.cantidad,
        stockNuevo: nuevaCantidad,
        motivo,
        fecha: new Date().toISOString()
      });

      return inventario[productoId];
    } catch (error) {
      console.error('Error al actualizar stock:', error);
      throw error;
    }
  },

  /**
   * Configurar stock inicial
   */
  async configurarStock(productoId, cantidad, minimo = 0, maximo = null) {
    try {
      const inventario = await this.getInventario();
      inventario[productoId] = {
        cantidad,
        minimo,
        maximo,
        fechaCreacion: new Date().toISOString(),
        ultimaActualizacion: new Date().toISOString()
      };
      
      await this.saveInventario(inventario);
      return inventario[productoId];
    } catch (error) {
      console.error('Error al configurar stock:', error);
      throw error;
    }
  },

  /**
   * Verificar productos con stock bajo
   */
  async getProductosStockBajo() {
    try {
      const inventario = await this.getInventario();
      const productos = await productosService.getProductos();
      const stockBajo = [];

      for (const [productoId, stock] of Object.entries(inventario)) {
        if (stock.cantidad <= stock.minimo) {
          const producto = productos.find(p => p.id === productoId);
          if (producto) {
            stockBajo.push({
              producto,
              stock: stock.cantidad,
              minimo: stock.minimo
            });
          }
        }
      }

      return stockBajo;
    } catch (error) {
      console.error('Error al obtener productos con stock bajo:', error);
      return [];
    }
  },

  /**
   * Registrar movimiento de inventario
   */
  async registrarMovimiento(movimiento) {
    try {
      const movimientosStr = await AsyncStorage.getItem(MOVIMIENTOS_KEY);
      const movimientos = movimientosStr ? JSON.parse(movimientosStr) : [];
      
      movimientos.push({
        id: `mov_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        ...movimiento
      });
      
      await AsyncStorage.setItem(MOVIMIENTOS_KEY, JSON.stringify(movimientos));
      return movimiento;
    } catch (error) {
      console.error('Error al registrar movimiento:', error);
      throw error;
    }
  },

  /**
   * Obtener historial de movimientos
   */
  async getHistorialMovimientos(productoId = null, limite = 100) {
    try {
      const movimientosStr = await AsyncStorage.getItem(MOVIMIENTOS_KEY);
      let movimientos = movimientosStr ? JSON.parse(movimientosStr) : [];
      
      if (productoId) {
        movimientos = movimientos.filter(m => m.productoId === productoId);
      }
      
      return movimientos
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, limite);
    } catch (error) {
      console.error('Error al obtener historial:', error);
      return [];
    }
  },

  /**
   * Validar stock antes de venta
   */
  async validarStockParaVenta(productos) {
    try {
      const errores = [];
      
      for (const producto of productos) {
        const stock = await this.getStock(producto.productoId || producto.id);
        if (stock.cantidad < producto.cantidad) {
          errores.push({
            producto: producto.producto,
            stockDisponible: stock.cantidad,
            cantidadRequerida: producto.cantidad
          });
        }
      }
      
      return {
        valido: errores.length === 0,
        errores
      };
    } catch (error) {
      console.error('Error al validar stock:', error);
      return { valido: false, errores: [{ error: error.message }] };
    }
  },

  /**
   * Procesar venta y actualizar stock
   */
  async procesarVenta(productos) {
    try {
      // Validar stock
      const validacion = await this.validarStockParaVenta(productos);
      if (!validacion.valido) {
        throw new Error('Stock insuficiente: ' + JSON.stringify(validacion.errores));
      }

      // Actualizar stock para cada producto
      for (const producto of productos) {
        await this.actualizarStock(
          producto.productoId || producto.id,
          producto.cantidad,
          'venta',
          `Venta realizada`
        );
      }

      return true;
    } catch (error) {
      console.error('Error al procesar venta:', error);
      throw error;
    }
  }
};














