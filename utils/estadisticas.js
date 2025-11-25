/**
 * Utilidades para estadísticas y reportes
 */

export const estadisticasService = {
  /**
   * Calcular estadísticas generales
   */
  calcularEstadisticasGenerales(ventas) {
    const totalVentas = ventas.length;
    let totalDinero = 0;
    let totalAbonado = 0;
    let ventasPagadas = 0;
    let ventasPendientes = 0;
    let ventasConAbono = 0;

    ventas.forEach(venta => {
      const total = venta.productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
      const abonado = (venta.abonos || []).reduce((sum, a) => sum + Number(a.monto), 0);
      
      totalDinero += total;
      totalAbonado += abonado;
      
      if (venta.pagado || abonado >= total - 0.01) {
        ventasPagadas++;
      } else if (abonado > 0) {
        ventasConAbono++;
      } else {
        ventasPendientes++;
      }
    });

    return {
      totalVentas,
      totalDinero,
      totalAbonado,
      totalPendiente: totalDinero - totalAbonado,
      ventasPagadas,
      ventasPendientes,
      ventasConAbono,
      porcentajePagado: totalDinero > 0 ? (totalAbonado / totalDinero) * 100 : 0
    };
  },

  /**
   * Estadísticas por período (día, semana, mes, año)
   */
  estadisticasPorPeriodo(ventas, periodo = 'mes') {
    const grupos = {};
    
    ventas.forEach(venta => {
      const fecha = new Date(venta.fecha);
      let key;

      switch (periodo) {
        case 'dia':
          key = fecha.toISOString().split('T')[0];
          break;
        case 'semana':
          const semana = this.getSemana(fecha);
          key = `${semana.año}-W${semana.semana}`;
          break;
        case 'mes':
          key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'año':
          key = fecha.getFullYear().toString();
          break;
        default:
          key = fecha.toISOString().split('T')[0];
      }

      if (!grupos[key]) {
        grupos[key] = {
          periodo: key,
          ventas: [],
          totalVentas: 0,
          totalDinero: 0,
          totalAbonado: 0
        };
      }

      const total = venta.productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
      const abonado = (venta.abonos || []).reduce((sum, a) => sum + Number(a.monto), 0);

      grupos[key].ventas.push(venta);
      grupos[key].totalVentas++;
      grupos[key].totalDinero += total;
      grupos[key].totalAbonado += abonado;
    });

    return Object.values(grupos).sort((a, b) => a.periodo.localeCompare(b.periodo));
  },

  /**
   * Top clientes
   */
  topClientes(ventas, limite = 10) {
    const clientesMap = {};

    ventas.forEach(venta => {
      if (!clientesMap[venta.cliente]) {
        clientesMap[venta.cliente] = {
          cliente: venta.cliente,
          totalVentas: 0,
          totalGastado: 0,
          totalAbonado: 0,
          ventas: []
        };
      }

      const total = venta.productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
      const abonado = (venta.abonos || []).reduce((sum, a) => sum + Number(a.monto), 0);

      clientesMap[venta.cliente].totalVentas++;
      clientesMap[venta.cliente].totalGastado += total;
      clientesMap[venta.cliente].totalAbonado += abonado;
      clientesMap[venta.cliente].ventas.push(venta);
    });

    return Object.values(clientesMap)
      .sort((a, b) => b.totalGastado - a.totalGastado)
      .slice(0, limite);
  },

  /**
   * Productos más vendidos
   */
  productosMasVendidos(ventas, limite = 10) {
    const productosMap = {};

    ventas.forEach(venta => {
      venta.productos.forEach(producto => {
        const nombre = producto.producto;
        if (!productosMap[nombre]) {
          productosMap[nombre] = {
            producto: nombre,
            cantidadTotal: 0,
            vecesVendido: 0,
            ingresosTotales: 0
          };
        }

        productosMap[nombre].cantidadTotal += producto.cantidad;
        productosMap[nombre].vecesVendido++;
        productosMap[nombre].ingresosTotales += producto.cantidad * producto.precio;
      });
    });

    return Object.values(productosMap)
      .sort((a, b) => b.cantidadTotal - a.cantidadTotal)
      .slice(0, limite);
  },

  /**
   * Estadísticas por método de pago
   */
  estadisticasPorMetodoPago(ventas) {
    const metodosMap = {};

    ventas.forEach(venta => {
      let metodos = [];
      
      if (Array.isArray(venta.metodoPago)) {
        metodos = venta.metodoPago.map(m => m.metodo || m);
      } else {
        metodos = [venta.metodoPago || 'Efectivo'];
      }

      metodos.forEach(metodo => {
        if (!metodosMap[metodo]) {
          metodosMap[metodo] = {
            metodo,
            cantidadVentas: 0,
            totalRecaudado: 0
          };
        }

        const total = venta.productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
        metodosMap[metodo].cantidadVentas++;
        metodosMap[metodo].totalRecaudado += total;
      });
    });

    return Object.values(metodosMap);
  },

  /**
   * Obtener número de semana
   */
  getSemana(fecha) {
    const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const semana = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return { año: d.getUTCFullYear(), semana };
  },

  /**
   * Comparar períodos
   */
  compararPeriodos(ventas, periodo1, periodo2) {
    const stats1 = this.estadisticasPorPeriodo(
      ventas.filter(v => this.estaEnPeriodo(v.fecha, periodo1)),
      'mes'
    )[0] || { totalDinero: 0, totalVentas: 0 };

    const stats2 = this.estadisticasPorPeriodo(
      ventas.filter(v => this.estaEnPeriodo(v.fecha, periodo2)),
      'mes'
    )[0] || { totalDinero: 0, totalVentas: 0 };

    const diferenciaDinero = stats2.totalDinero - stats1.totalDinero;
    const diferenciaVentas = stats2.totalVentas - stats1.totalVentas;
    const porcentajeCambio = stats1.totalDinero > 0 
      ? (diferenciaDinero / stats1.totalDinero) * 100 
      : 0;

    return {
      periodo1: stats1,
      periodo2: stats2,
      diferenciaDinero,
      diferenciaVentas,
      porcentajeCambio
    };
  },

  /**
   * Verificar si una fecha está en un período
   */
  estaEnPeriodo(fecha, periodo) {
    // Implementación simplificada - se puede mejorar
    const fechaVenta = new Date(fecha);
    const fechaPeriodo = new Date(periodo);
    
    return fechaVenta.getMonth() === fechaPeriodo.getMonth() &&
           fechaVenta.getFullYear() === fechaPeriodo.getFullYear();
  }
};














