/**
 * Utilidades de búsqueda avanzada
 */

export const searchService = {
  /**
   * Buscar ventas por múltiples criterios
   */
  searchVentas(ventas, filters) {
    let results = [...ventas];

    // Filtro por cliente
    if (filters.cliente && filters.cliente.trim()) {
      const clienteLower = filters.cliente.toLowerCase().trim();
      results = results.filter(v => 
        v.cliente.toLowerCase().includes(clienteLower)
      );
    }

    // Filtro por producto
    if (filters.producto && filters.producto.trim()) {
      const productoLower = filters.producto.toLowerCase().trim();
      results = results.filter(v => 
        v.productos.some(p => 
          p.producto.toLowerCase().includes(productoLower)
        )
      );
    }

    // Filtro por rango de fechas
    if (filters.fechaDesde) {
      const desde = new Date(filters.fechaDesde);
      results = results.filter(v => new Date(v.fecha) >= desde);
    }
    if (filters.fechaHasta) {
      const hasta = new Date(filters.fechaHasta);
      hasta.setHours(23, 59, 59, 999); // Incluir todo el día
      results = results.filter(v => new Date(v.fecha) <= hasta);
    }

    // Filtro por monto mínimo
    if (filters.montoMin !== undefined && filters.montoMin !== null) {
      results = results.filter(v => {
        const total = v.productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
        return total >= filters.montoMin;
      });
    }

    // Filtro por monto máximo
    if (filters.montoMax !== undefined && filters.montoMax !== null) {
      results = results.filter(v => {
        const total = v.productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
        return total <= filters.montoMax;
      });
    }

    // Filtro por estado de pago
    if (filters.estadoPago) {
      results = results.filter(v => {
        const total = v.productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
        const totalAbonado = (v.abonos || []).reduce((sum, a) => sum + Number(a.monto), 0);
        
        if (filters.estadoPago === 'Pagado') {
          return v.pagado || totalAbonado >= total - 0.01;
        } else if (filters.estadoPago === 'Pendiente') {
          return !v.pagado && totalAbonado === 0;
        } else if (filters.estadoPago === 'Abono') {
          return !v.pagado && totalAbonado > 0 && totalAbonado < total - 0.01;
        }
        return true;
      });
    }

    // Filtro por método de pago
    if (filters.metodoPago) {
      results = results.filter(v => {
        const metodo = Array.isArray(v.metodoPago) 
          ? v.metodoPago[0]?.metodo || v.metodoPago 
          : v.metodoPago;
        return metodo === filters.metodoPago;
      });
    }

    // Ordenamiento
    if (filters.ordenarPor) {
      results.sort((a, b) => {
        let aValue, bValue;

        switch (filters.ordenarPor) {
          case 'fecha':
            aValue = new Date(a.fecha).getTime();
            bValue = new Date(b.fecha).getTime();
            break;
          case 'cliente':
            aValue = a.cliente.toLowerCase();
            bValue = b.cliente.toLowerCase();
            break;
          case 'monto':
            aValue = a.productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
            bValue = b.productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return filters.orden === 'asc' ? -1 : 1;
        if (aValue > bValue) return filters.orden === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return results;
  },

  /**
   * Búsqueda rápida (texto libre)
   */
  quickSearch(ventas, query) {
    if (!query || !query.trim()) return ventas;

    const queryLower = query.toLowerCase().trim();
    
    return ventas.filter(v => {
      // Buscar en cliente
      if (v.cliente.toLowerCase().includes(queryLower)) return true;
      
      // Buscar en productos
      if (v.productos.some(p => 
        p.producto.toLowerCase().includes(queryLower)
      )) return true;
      
      return false;
    });
  }
};














