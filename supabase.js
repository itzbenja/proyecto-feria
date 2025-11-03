import { createClient } from '@supabase/supabase-js'

// Configuración usando variables de entorno
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Por favor configura las variables de entorno EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en el archivo .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Funciones para manejar las ventas
export const ventasService = {
  // Obtener todas las ventas
  async getAllVentas() {
    try {
      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .order('fecha', { ascending: false })
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error al obtener ventas:', error)
      throw error
    }
  },

  // Obtener ventas por cliente
  async getVentasByCliente(cliente) {
    try {
      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .eq('cliente', cliente)
        .order('fecha', { ascending: false })
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error al obtener ventas por cliente:', error)
      throw error
    }
  },

  // Crear nueva venta
  async createVenta(ventaData) {
    try {
      const { data, error } = await supabase
        .from('ventas')
        .insert([{
          cliente: ventaData.cliente,
          productos: ventaData.productos,
          método_pago: ventaData.metodo_pago, // Columna real en tu BD
          fecha: new Date().toISOString()
        }])
        .select()
      
      if (error) throw error
      return data[0]
    } catch (error) {
      console.error('Error al crear venta:', error)
      throw error
    }
  },

  // Actualizar estado de pago - La columna pagado no existe, removemos esta función
  async updatePagado(ventaId, pagado) {
    // Tu tabla no tiene columna 'pagado', esta función no hace nada por ahora
    console.warn('updatePagado: columna pagado no existe en la tabla');
    return null;
  },

  // Eliminar venta
  async deleteVenta(ventaId) {
    try {
      const { error } = await supabase
        .from('ventas')
        .delete()
        .eq('identificacion', ventaId)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('Error al eliminar venta:', error)
      throw error
    }
  },

  // Obtener estadísticas de ventas
  async getEstadisticas() {
    try {
      const { data, error } = await supabase
        .from('ventas')
        .select('*')
      
      if (error) throw error
      
      const totalVentas = data.length
      const ventasPagadas = data.filter(venta => venta.pagado).length
      const ventasPendientes = totalVentas - ventasPagadas
      
      // Calcular total de dinero (asumiendo que productos tiene información de precios)
      let totalDinero = 0
      data.forEach(venta => {
        if (venta.productos && Array.isArray(venta.productos)) {
          venta.productos.forEach(producto => {
            if (producto.precio && producto.cantidad) {
              totalDinero += producto.precio * producto.cantidad
            }
          })
        }
      })
      
      return {
        totalVentas,
        ventasPagadas,
        ventasPendientes,
        totalDinero
      }
    } catch (error) {
      console.error('Error al obtener estadísticas:', error)
      throw error
    }
  }
}

// Función para suscribirse a cambios en tiempo real
export const subscribeToVentas = (callback) => {
  return supabase
    .channel('ventas_changes')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'ventas' 
      }, 
      callback
    )
    .subscribe()
}
