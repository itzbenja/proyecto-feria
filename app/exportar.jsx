import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVentas } from "../hooks/useVentas";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import XLSX from "xlsx";

// Helper para convertir array de bytes a base64 (compatible con React Native)
const arrayToBase64 = (bytes) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  while (i < bytes.length) {
    const a = bytes[i++];
    const b = i < bytes.length ? bytes[i++] : 0;
    const c = i < bytes.length ? bytes[i++] : 0;
    const bitmap = (a << 16) | (b << 8) | c;
    result += chars.charAt((bitmap >> 18) & 63);
    result += chars.charAt((bitmap >> 12) & 63);
    result += i - 2 < bytes.length ? chars.charAt((bitmap >> 6) & 63) : '=';
    result += i - 1 < bytes.length ? chars.charAt(bitmap & 63) : '=';
  }
  return result;
};

export default function Exportar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ventas, loading: ventasLoading } = useVentas();
  const [isExporting, setIsExporting] = useState(false);

  // Preparar datos para Excel
  const datosExcel = useMemo(() => {
    const datos = [];

    // Encabezados
    datos.push([
      "ID Venta",
      "Cliente",
      "Fecha",
      "Productos",
      "Cantidad Total",
      "Total Venta",
      "Total Abonado",
      "Pendiente",
      "Estado",
      "Método de Pago",
      "Abonos"
    ]);

    // Datos de cada venta
    ventas.forEach((venta) => {
      const productosTexto = venta.productos
        .map((p) => `${p.producto} (${p.cantidad} x $${p.precio})`)
        .join("; ");

      const cantidadTotal = venta.productos.reduce((sum, p) => sum + p.cantidad, 0);
      const totalVenta = venta.productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
      const totalAbonado = (venta.abonos || []).reduce((sum, a) => sum + Number(a.monto), 0);
      const pendiente = totalVenta - totalAbonado;

      const estado = venta.pagado || totalAbonado >= totalVenta - 0.01
        ? "Pagado"
        : totalAbonado > 0
          ? "Abono"
          : "Pendiente";

      const metodoPago = Array.isArray(venta.metodoPago)
        ? venta.metodoPago.map((p) => `${p.metodo}: $${p.monto}`).join("; ")
        : venta.metodoPago || "Efectivo";

      const abonosTexto = (venta.abonos || [])
        .map((a) => `${new Date(a.fecha).toLocaleDateString()}: $${a.monto} (${a.metodo || "Abono"})`)
        .join("; ") || "N/A";

      datos.push([
        venta.id,
        venta.cliente,
        new Date(venta.fecha).toLocaleString('es-ES'),
        productosTexto,
        cantidadTotal,
        totalVenta,
        totalAbonado,
        pendiente,
        estado,
        metodoPago,
        abonosTexto
      ]);
    });

    return datos;
  }, [ventas]);

  // Estadísticas para el resumen
  const estadisticas = useMemo(() => {
    const totalVentas = ventas.length;
    const ventasPagadas = ventas.filter((v) => {
      const total = v.productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
      const abonado = (v.abonos || []).reduce((sum, a) => sum + Number(a.monto), 0);
      return v.pagado || abonado >= total - 0.01;
    }).length;
    const ventasPendientes = totalVentas - ventasPagadas;

    const totalGeneral = ventas.reduce((sum, v) => {
      return sum + v.productos.reduce((s, p) => s + (p.cantidad * p.precio), 0);
    }, 0);

    const totalAbonado = ventas.reduce((sum, v) => {
      return sum + (v.abonos || []).reduce((s, a) => s + Number(a.monto), 0);
    }, 0);

    return {
      totalVentas,
      ventasPagadas,
      ventasPendientes,
      totalGeneral,
      totalAbonado,
      totalPendiente: totalGeneral - totalAbonado
    };
  }, [ventas]);

  const exportarExcel = async () => {
    if (ventas.length === 0) {
      Alert.alert("Sin datos", "No hay ventas para exportar");
      return;
    }

    setIsExporting(true);
    try {
      // Crear workbook
      const wb = XLSX.utils.book_new();

      // Hoja 1: Resumen
      const resumenData = [
        ["REPORTE DE VENTAS - SISTEMA DE GESTIÓN"],
        ["Generado el:", new Date().toLocaleString('es-ES')],
        ["Empresa:", "Rivera Galvez SPA"],
        [""],
        ["═══════════════════════════════════════"],
        ["ESTADÍSTICAS GENERALES"],
        ["═══════════════════════════════════════"],
        ["Total de Ventas:", estadisticas.totalVentas],
        ["Ventas Pagadas:", estadisticas.ventasPagadas],
        ["Ventas Pendientes:", estadisticas.ventasPendientes],
        ["Ventas con Abono:", ventas.filter((v) => {
          const total = v.productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
          const abonado = (v.abonos || []).reduce((sum, a) => sum + Number(a.monto), 0);
          return !v.pagado && abonado > 0 && abonado < total - 0.01;
        }).length],
        [""],
        ["═══════════════════════════════════════"],
        ["RESUMEN FINANCIERO"],
        ["═══════════════════════════════════════"],
        ["Total General de Ventas:", `$${estadisticas.totalGeneral.toFixed(2)}`],
        ["Total Abonado:", `$${estadisticas.totalAbonado.toFixed(2)}`],
        ["Total Pendiente por Cobrar:", `$${estadisticas.totalPendiente.toFixed(2)}`],
        ["Porcentaje Pagado:", `${((estadisticas.totalAbonado / estadisticas.totalGeneral) * 100).toFixed(2)}%`],
        [""],
        ["═══════════════════════════════════════"],
        ["NOTAS"],
        ["═══════════════════════════════════════"],
        ["• Este reporte incluye todas las ventas registradas en el sistema"],
        ["• Los montos pendientes requieren seguimiento"],
        ["• Ver hoja 'Ventas Detalladas' para información completa"],
        ["• Ver hoja 'Por Cliente' para resumen por cliente"],
      ];

      const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);

      // Aplicar ancho de columnas
      wsResumen['!cols'] = [{ wch: 35 }, { wch: 25 }];

      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

      // Hoja 2: Detalle de Ventas
      const wsVentas = XLSX.utils.aoa_to_sheet(datosExcel);

      // Aplicar ancho de columnas
      wsVentas['!cols'] = [
        { wch: 15 }, // ID
        { wch: 20 }, // Cliente
        { wch: 20 }, // Fecha
        { wch: 40 }, // Productos
        { wch: 15 }, // Cantidad
        { wch: 15 }, // Total
        { wch: 15 }, // Abonado
        { wch: 15 }, // Pendiente
        { wch: 12 }, // Estado
        { wch: 20 }, // Método
        { wch: 30 }, // Abonos
      ];

      // Congelar primera fila (encabezados)
      wsVentas['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomRight' };

      XLSX.utils.book_append_sheet(wb, wsVentas, "Ventas Detalladas");

      // Hoja 3: Por Cliente
      const clientesMap = {};
      ventas.forEach((venta) => {
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

        clientesMap[venta.cliente].totalVentas += 1;
        clientesMap[venta.cliente].totalGastado += total;
        clientesMap[venta.cliente].totalAbonado += abonado;
        clientesMap[venta.cliente].ventas.push(venta);
      });

      const clientesData = [
        ["Cliente", "Total Ventas", "Total Gastado", "Total Abonado", "Pendiente"]
      ];

      Object.values(clientesMap).forEach((cliente) => {
        clientesData.push([
          cliente.cliente,
          cliente.totalVentas,
          cliente.totalGastado,
          cliente.totalAbonado,
          cliente.totalGastado - cliente.totalAbonado
        ]);
      });

      const wsClientes = XLSX.utils.aoa_to_sheet(clientesData);
      wsClientes['!cols'] = [
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 }
      ];
      wsClientes['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomRight' };

      XLSX.utils.book_append_sheet(wb, wsClientes, "Por Cliente");

      // Generar archivo como base64 directamente
      const wbout = XLSX.write(wb, {
        type: 'base64',
        bookType: 'xlsx'
      });

      // Guardar archivo
      const fecha = new Date().toISOString().split('T')[0];
      const filename = `Ventas_${fecha}.xlsx`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      // Escribir archivo base64 usando API legacy
      // La API legacy acepta base64 directamente como string
      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Compartir archivo
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Compartir archivo Excel'
        });
        Alert.alert("✅ Éxito", `Archivo Excel generado: ${filename}\n\nEl archivo se ha compartido correctamente.`);
      } else {
        Alert.alert("✅ Éxito", `Archivo guardado en:\n${fileUri}`);
      }
    } catch (error) {
      console.error("Error al exportar:", error);
      Alert.alert("Error", "No se pudo generar el archivo Excel");
    } finally {
      setIsExporting(false);
    }
  };

  if (ventasLoading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={{ marginTop: 12, color: '#64748b' }}>Cargando datos...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.header}>📊 Exportar a Excel</Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>📋 Información del Reporte</Text>
        <Text style={styles.infoText}>
          El archivo Excel incluirá:
        </Text>
        <Text style={styles.infoItem}>• Hoja 1: Resumen con estadísticas generales</Text>
        <Text style={styles.infoItem}>• Hoja 2: Detalle completo de todas las ventas</Text>
        <Text style={styles.infoItem}>• Hoja 3: Resumen por cliente</Text>
        <Text style={styles.infoItem}>• Datos: Clientes, fechas, productos, pagos, abonos</Text>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>📈 Estadísticas Actuales</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Total Ventas:</Text>
          <Text style={styles.statsValue}>{estadisticas.totalVentas}</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Ventas Pagadas:</Text>
          <Text style={[styles.statsValue, { color: '#16a34a' }]}>
            {estadisticas.ventasPagadas}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Ventas Pendientes:</Text>
          <Text style={[styles.statsValue, { color: '#ef4444' }]}>
            {estadisticas.ventasPendientes}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Total General:</Text>
          <Text style={styles.statsValue}>
            ${estadisticas.totalGeneral.toFixed(2)}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Total Abonado:</Text>
          <Text style={styles.statsValue}>
            ${estadisticas.totalAbonado.toFixed(2)}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Total Pendiente:</Text>
          <Text style={[styles.statsValue, { color: '#ef4444', fontWeight: '800' }]}>
            ${estadisticas.totalPendiente.toFixed(2)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.exportBtn, isExporting && { opacity: 0.6 }]}
        onPress={exportarExcel}
        disabled={isExporting || ventas.length === 0}
      >
        {isExporting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.exportBtnText}>📥 Exportar a Excel</Text>
            <Text style={styles.exportBtnSubtext}>
              {ventas.length} {ventas.length === 1 ? 'venta' : 'ventas'} disponibles
            </Text>
          </>
        )}
      </TouchableOpacity>

      {ventas.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No hay ventas para exportar
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>⬅ Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f0fdf4",
    padding: 12,
  },
  header: {
    fontSize: 22,
    fontWeight: "800",
    color: "#065f46",
    marginBottom: 20,
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  infoTitle: {
    fontWeight: "800",
    color: "#065f46",
    marginBottom: 12,
    fontSize: 18,
  },
  infoText: {
    color: "#374151",
    marginBottom: 8,
    fontWeight: "600",
  },
  infoItem: {
    color: "#64748b",
    marginBottom: 4,
    marginLeft: 8,
  },
  statsCard: {
    backgroundColor: "#ecfdf5",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  statsTitle: {
    fontWeight: "800",
    color: "#065f46",
    marginBottom: 16,
    fontSize: 18,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#d1fae5",
  },
  statsLabel: {
    color: "#065f46",
    fontWeight: "600",
  },
  statsValue: {
    color: "#16a34a",
    fontWeight: "800",
  },
  exportBtn: {
    backgroundColor: "#16a34a",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  exportBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 4,
  },
  exportBtnSubtext: {
    color: "#fff",
    fontSize: 12,
    opacity: 0.9,
  },
  emptyCard: {
    backgroundColor: "#fef3c7",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  emptyText: {
    textAlign: "center",
    color: "#92400e",
    fontWeight: "600",
  },
  backBtn: {
    backgroundColor: "#16a34a",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  backText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});

