import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { formatMoney } from './formatters';
import { estadisticasService } from './estadisticas';

/**
 * Servicio de exportación a PDF
 */
export const pdfService = {
  /**
   * Generar HTML para PDF de reporte
   */
  generarHTMLReporte(ventas, tipo = 'general') {
    const stats = estadisticasService.calcularEstadisticasGenerales(ventas);
    const fecha = new Date().toLocaleString('es-ES');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #16a34a;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #065f46;
      margin-bottom: 10px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    .stat-card {
      background: #f0fdf4;
      padding: 15px;
      border-radius: 8px;
      border: 1px solid #d1fae5;
    }
    .stat-label {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 20px;
      font-weight: bold;
      color: #16a34a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #16a34a;
      color: white;
      font-weight: bold;
    }
    tr:hover {
      background: #f9fafb;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">Reporte de Ventas</div>
    <div style="color: #64748b; margin-top: 5px;">Generado: ${fecha}</div>
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-label">Total de Ventas</div>
      <div class="stat-value">${stats.totalVentas}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Recaudado</div>
      <div class="stat-value">${formatMoney(stats.totalDinero)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Abonado</div>
      <div class="stat-value">${formatMoney(stats.totalAbonado)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Pendiente</div>
      <div class="stat-value" style="color: #ef4444;">${formatMoney(stats.totalPendiente)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Cliente</th>
        <th>Fecha</th>
        <th>Total</th>
        <th>Abonado</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
      ${ventas.map(venta => {
        const total = venta.productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
        const abonado = (venta.abonos || []).reduce((sum, a) => sum + Number(a.monto), 0);
        const fecha = new Date(venta.fecha).toLocaleDateString('es-ES');
        const estado = venta.pagado ? '✅ Pagado' : (abonado > 0 ? '💰 Abono' : '⏳ Pendiente');
        
        return `
          <tr>
            <td>${venta.cliente}</td>
            <td>${fecha}</td>
            <td>${formatMoney(total)}</td>
            <td>${formatMoney(abonado)}</td>
            <td>${estado}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="footer">
    <div>Reporte generado automáticamente por Feria App</div>
    <div style="margin-top: 5px;">Total de registros: ${ventas.length}</div>
  </div>
</body>
</html>
    `.trim();
  },

  /**
   * Generar PDF de reporte
   */
  async generarPDFReporte(ventas, tipo = 'general') {
    try {
      const html = this.generarHTMLReporte(ventas, tipo);
      
      const { uri } = await Print.printToFileAsync({ 
        html,
        base64: false
      });
      
      return uri;
    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw error;
    }
  },

  /**
   * Compartir PDF
   */
  async compartirPDF(pdfUri, nombreArchivo = 'reporte_ventas.pdf') {
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartir reporte PDF'
        });
      }
      
      return pdfUri;
    } catch (error) {
      console.error('Error al compartir PDF:', error);
      throw error;
    }
  },

  /**
   * Generar PDF de estadísticas
   */
  async generarPDFEstadisticas(ventas) {
    try {
      const stats = estadisticasService.calcularEstadisticasGenerales(ventas);
      const topClientes = estadisticasService.topClientes(ventas, 10);
      const productosMasVendidos = estadisticasService.productosMasVendidos(ventas, 10);
      const statsPorMes = estadisticasService.estadisticasPorPeriodo(ventas, 'mes');

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .header { text-align: center; border-bottom: 3px solid #16a34a; padding-bottom: 20px; margin-bottom: 30px; }
    .section { margin: 30px 0; }
    .section-title { font-size: 20px; font-weight: bold; color: #065f46; margin-bottom: 15px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #16a34a; color: white; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Reporte de Estadísticas</h1>
    <p>Generado: ${new Date().toLocaleString('es-ES')}</p>
  </div>

  <div class="section">
    <div class="section-title">Resumen General</div>
    <table>
      <tr><th>Métrica</th><th>Valor</th></tr>
      <tr><td>Total de Ventas</td><td>${stats.totalVentas}</td></tr>
      <tr><td>Total Recaudado</td><td>${formatMoney(stats.totalDinero)}</td></tr>
      <tr><td>Total Abonado</td><td>${formatMoney(stats.totalAbonado)}</td></tr>
      <tr><td>Total Pendiente</td><td>${formatMoney(stats.totalPendiente)}</td></tr>
      <tr><td>Ventas Pagadas</td><td>${stats.ventasPagadas}</td></tr>
      <tr><td>Ventas Pendientes</td><td>${stats.ventasPendientes}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Top 10 Clientes</div>
    <table>
      <tr><th>Cliente</th><th>Ventas</th><th>Total Gastado</th></tr>
      ${topClientes.map(c => `
        <tr>
          <td>${c.cliente}</td>
          <td>${c.totalVentas}</td>
          <td>${formatMoney(c.totalGastado)}</td>
        </tr>
      `).join('')}
    </table>
  </div>

  <div class="section">
    <div class="section-title">Productos Más Vendidos</div>
    <table>
      <tr><th>Producto</th><th>Cantidad</th><th>Ingresos</th></tr>
      ${productosMasVendidos.map(p => `
        <tr>
          <td>${p.producto}</td>
          <td>${p.cantidadTotal}</td>
          <td>${formatMoney(p.ingresosTotales)}</td>
        </tr>
      `).join('')}
    </table>
  </div>
</body>
</html>
      `.trim();

      const { uri } = await Print.printToFileAsync({ html });
      return uri;
    } catch (error) {
      console.error('Error al generar PDF de estadísticas:', error);
      throw error;
    }
  }
};














