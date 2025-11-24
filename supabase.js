import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

// Configuración usando variables de entorno
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

// Validar que las variables estén configuradas
export const hasConfig = supabaseUrl && supabaseAnonKey && supabaseUrl.length > 0 && supabaseAnonKey.length > 0

if (!hasConfig) {
  console.warn('⚠️ Variables de entorno de Supabase no configuradas.')
  console.warn('⚠️ La app puede no funcionar correctamente sin configuración de Supabase.')
}

// Crear cliente de Supabase (usará valores vacíos si no hay config, pero no crasheará)
export const supabase = hasConfig 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })

// Funciones para manejar las ventas
export const ventasService = {
  // Obtener todas las ventas
  async getAllVentas() {
    try {
      if (!hasConfig) {
        console.warn('⚠️ Supabase no configurado, retornando array vacío')
        return []
      }
      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .order('fecha', { ascending: false })

      if (error) {
        console.error('Error al obtener ventas:', error)
        return []
      }
      return data || []
    } catch (error) {
      console.error('Error al obtener ventas:', error)
      return []
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
          metodo_pago: ventaData.metodo_pago,
          pagado: ventaData.pagado || false,
          fecha: new Date().toISOString(),
          abonos: ventaData.abonos || [] // Incluir abonos iniciales
        }])
        .select()

      if (error) throw error
      return data[0]
    } catch (error) {
      console.error('Error al crear venta:', error)
      throw error
    }
  },

  // Actualizar estado de pago
  async updatePagado(ventaId, pagado) {
    try {
      const { data, error } = await supabase
        .from('ventas')
        .update({ pagado })
        .eq('id', ventaId)
        .select()

      if (error) {
        console.error('Error al actualizar pago:', JSON.stringify(error, null, 2));
        throw error;
      }
      return data[0]
    } catch (error) {
      console.error('Error al actualizar pago:', error)
      throw error
    }
  },

  // Agregar un abono a una venta
  async addAbono(ventaId, abono) {
    try {
      // 1. Obtener la venta actual
      const { data: venta, error: fetchError } = await supabase
        .from('ventas')
        .select('abonos, pagado, productos')
        .eq('id', ventaId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Calcular nuevo array de abonos
      const nuevosAbonos = [...(venta.abonos || []), abono];

      // 3. Calcular si ya está totalmente pagado
      const totalVenta = venta.productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
      const totalAbonado = nuevosAbonos.reduce((sum, a) => sum + Number(a.monto), 0);
      const estaPagado = totalAbonado >= totalVenta - 0.01; // Margen de error pequeño

      // 4. Actualizar venta
      const { data, error } = await supabase
        .from('ventas')
        .update({
          abonos: nuevosAbonos,
          pagado: estaPagado
        })
        .eq('id', ventaId)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error al agregar abono:', error);
      throw error;
    }
  },

  // Eliminar venta
  async deleteVenta(ventaId) {
    try {
      const { error } = await supabase
        .from('ventas')
        .delete()
        .eq('id', ventaId)

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
