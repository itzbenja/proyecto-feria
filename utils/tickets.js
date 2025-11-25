import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatMoney } from './formatters';

/**
 * Servicio de impresión de tickets y recibos
 */
export const ticketsService = {
  /**
   * Generar HTML para ticket
   */
  generarHTMLTicket(venta) {
    const total = venta.productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
    const totalAbonado = (venta.abonos || []).reduce((sum, a) => sum + Number(a.monto), 0);
    const pendiente = total - totalAbonado;
    const fecha = new Date(venta.fecha).toLocaleString('es-ES');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media print {
      @page { margin: 0; size: 80mm auto; }
      body { margin: 0; padding: 10px; }
    }
    body {
      font-family: 'Courier New', monospace;
      font-size: 14px;
      max-width: 80mm;
      margin: 0 auto;
      padding: 10px;
      color: #000;
    }
    .header {
      text-align: center;
      margin-bottom: 10px;
    }
    .title-box {
      background-color: #e0e0e0;
      padding: 5px;
      margin: 5px 0;
      text-align: center;
      font-weight: bold;
      font-size: 16px;
    }
    .info {
      margin: 5px 0;
    }
    .line {
      border-bottom: 1px dashed #000;
      margin: 8px 0;
    }
    .double-line {
      border-bottom: 2px dashed #000;
      margin: 8px 0;
    }
    .productos {
      margin: 10px 0;
    }
    .producto {
      margin: 5px 0;
      display: flex;
      justify-content: space-between;
    }
    .total-section {
      margin-top: 10px;
    }
    .row {
      display: flex; 
      justify-content: space-between;
      margin: 3px 0;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 10px;
    }
    .pagado-badge {
      text-align: center; 
      margin-top: 15px; 
      padding: 8px; 
      background: #4caf50; 
      color: white; 
      font-weight: bold;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="double-line"></div>
  
  <div class="info">
    <strong>Cliente:</strong> ${venta.cliente}
  </div>

  <div class="title-box">RECIBO DE VENTA</div>
  
  <div style="text-align: center; font-size: 12px;">
    Fecha: ${fecha}
  </div>
  
  <div class="productos">
    ${venta.productos.map(p => `
      <div class="producto">
        <div>${p.cantidad} x ${p.producto}</div>
        <div>${formatMoney(p.cantidad * p.precio)}</div>
      </div>
    `).join('')}
  </div>
  
  <div class="line"></div>
  
  <div class="total-section">
    <div class="row" style="font-weight: bold; font-size: 16px;">
      <span>Total:</span>
      <span>${formatMoney(total)}</span>
    </div>
    
    ${totalAbonado > 0 ? `
      <div class="row">
        <span>Abonado:</span>
        <span>${formatMoney(totalAbonado)}</span>
      </div>
    ` : ''}
    
    ${pendiente > 0.01 ? `
      <div class="row" style="color: #d32f2f;">
        <span>Pendiente:</span>
        <span>${formatMoney(pendiente)}</span>
      </div>
    ` : ''}
    
    <div class="row" style="margin-top: 5px; font-size: 12px;">
      <span>Método de pago:</span>
      <span>${Array.isArray(venta.metodoPago)
        ? venta.metodoPago.map(p => p.metodo).join(', ')
        : venta.metodoPago || 'Efectivo'}</span>
    </div>
  </div>
  
  ${venta.pagado ? `
    <div class="pagado-badge">
      ✅ PAGADO
    </div>
  ` : ''}
  
  <div class="double-line"></div>
  
  <div class="footer">
    <div>Gracias por su compra</div>
    <div style="margin-top: 5px; color: #666;">ID: ${venta.id.substring(0, 8)}...</div>
  </div>
</body>
</html>
    `.trim();
  },

  /**
   * Imprimir ticket
   */
  async imprimirTicket(venta) {
    try {
      const html = this.generarHTMLTicket(venta);

      const { uri } = await Print.printToFileAsync({ html });

      // En dispositivos móviles, compartir el PDF
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartir ticket'
        });
      }

      return uri;
    } catch (error) {
      console.error('Error al imprimir ticket:', error);
      throw error;
    }
  },

  /**
   * Generar ticket múltiple (varias ventas)
   */
  generarHTMLTicketsMultiples(ventas) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 10px;
    }
    .ticket {
      page-break-after: always;
      max-width: 80mm;
      margin: 0 auto 20px;
      padding: 10px;
      border: 1px dashed #ccc;
    }
  </style>
</head>
<body>
  ${ventas.map(venta => `
    <div class="ticket">
      ${this.generarHTMLTicket(venta).replace('<!DOCTYPE html>', '').replace('<html>', '').replace('<head>', '').replace('</head>', '').replace('<body>', '').replace('</body>', '').replace('</html>', '')}
    </div>
  `).join('')}
</body>
</html>
    `.trim();
  },

  /**
   * Imprimir múltiples tickets
   */
  async imprimirTicketsMultiples(ventas) {
    try {
      const html = this.generarHTMLTicketsMultiples(ventas);

      const { uri } = await Print.printToFileAsync({ html });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartir tickets'
        });
      }

      return uri;
    } catch (error) {
      console.error('Error al imprimir tickets:', error);
      throw error;
    }
  }
};














