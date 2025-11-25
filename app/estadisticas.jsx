import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVentas } from '../hooks/useVentas';
import { estadisticasService } from '../utils/estadisticas';
import { formatMoney } from '../utils/formatters';
import { pdfService } from '../utils/pdf';
import { ErrorHandler } from '../utils/errorHandler';

export default function Estadisticas() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ventas, loading } = useVentas();
  const [periodo, setPeriodo] = useState('mes');
  const [exportando, setExportando] = useState(false);

  const stats = useMemo(() => estadisticasService.calcularEstadisticasGenerales(ventas), [ventas]);
  const statsPorPeriodo = useMemo(() => estadisticasService.estadisticasPorPeriodo(ventas, periodo), [ventas, periodo]);
  const topClientes = useMemo(() => estadisticasService.topClientes(ventas, 10), [ventas]);
  const productosMasVendidos = useMemo(() => estadisticasService.productosMasVendidos(ventas, 10), [ventas]);
  const statsPorMetodo = useMemo(() => estadisticasService.estadisticasPorMetodoPago(ventas), [ventas]);

  const handleExportarPDF = async () => {
    setExportando(true);
    try {
      const pdfUri = await pdfService.generarPDFEstadisticas(ventas);
      await pdfService.compartirPDF(pdfUri, 'estadisticas_ventas.pdf');
      ErrorHandler.showSuccess('PDF generado correctamente');
    } catch (error) {
      ErrorHandler.showAlert(error.message, 'exportarPDF');
    } finally {
      setExportando(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={{ marginTop: 12, color: '#64748b' }}>Cargando estadísticas...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
      <Text style={styles.header}>📊 Estadísticas Detalladas</Text>

      {/* Resumen General */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumen General</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Ventas</Text>
            <Text style={styles.statValue}>{stats.totalVentas}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Recaudado</Text>
            <Text style={styles.statValue}>{formatMoney(stats.totalDinero)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Abonado</Text>
            <Text style={styles.statValue}>{formatMoney(stats.totalAbonado)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Pendiente</Text>
            <Text style={[styles.statValue, { color: '#ef4444' }]}>{formatMoney(stats.totalPendiente)}</Text>
          </View>
        </View>
      </View>

      {/* Estadísticas por Período */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Estadísticas por {periodo === 'mes' ? 'Mes' : periodo === 'semana' ? 'Semana' : 'Año'}</Text>
        <View style={styles.periodButtons}>
          {['mes', 'semana', 'año'].map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodButton, periodo === p && styles.periodButtonActive]}
              onPress={() => setPeriodo(p)}
            >
              <Text style={[styles.periodButtonText, periodo === p && styles.periodButtonTextActive]}>
                {p === 'mes' ? 'Mes' : p === 'semana' ? 'Semana' : 'Año'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {statsPorPeriodo.map(stat => (
          <View key={stat.periodo} style={styles.periodStat}>
            <Text style={styles.periodStatLabel}>{stat.periodo}</Text>
            <View style={styles.periodStatRow}>
              <Text style={styles.periodStatValue}>{stat.totalVentas} ventas</Text>
              <Text style={styles.periodStatValue}>{formatMoney(stat.totalDinero)}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Top Clientes */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top 10 Clientes</Text>
        {topClientes.map((cliente, index) => (
          <View key={cliente.cliente} style={styles.listItem}>
            <View style={styles.listItemLeft}>
              <Text style={styles.listItemRank}>#{index + 1}</Text>
              <View>
                <Text style={styles.listItemTitle}>{cliente.cliente}</Text>
                <Text style={styles.listItemSubtitle}>{cliente.totalVentas} ventas</Text>
              </View>
            </View>
            <Text style={styles.listItemValue}>{formatMoney(cliente.totalGastado)}</Text>
          </View>
        ))}
      </View>

      {/* Productos Más Vendidos */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Productos Más Vendidos</Text>
        {productosMasVendidos.map((producto, index) => (
          <View key={producto.producto} style={styles.listItem}>
            <View style={styles.listItemLeft}>
              <Text style={styles.listItemRank}>#{index + 1}</Text>
              <View>
                <Text style={styles.listItemTitle}>{producto.producto}</Text>
                <Text style={styles.listItemSubtitle}>{producto.cantidadTotal} unidades</Text>
              </View>
            </View>
            <Text style={styles.listItemValue}>{formatMoney(producto.ingresosTotales)}</Text>
          </View>
        ))}
      </View>

      {/* Métodos de Pago */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Por Método de Pago</Text>
        {statsPorMetodo.map(metodo => (
          <View key={metodo.metodo} style={styles.listItem}>
            <Text style={styles.listItemTitle}>{metodo.metodo}</Text>
            <View style={styles.listItemRight}>
              <Text style={styles.listItemSubtitle}>{metodo.cantidadVentas} ventas</Text>
              <Text style={styles.listItemValue}>{formatMoney(metodo.totalRecaudado)}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.exportButton, exportando && styles.buttonDisabled]}
        onPress={handleExportarPDF}
        disabled={exportando}
      >
        {exportando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.exportButtonText}>📄 Exportar a PDF</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>⬅ Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    padding: 12,
  },
  header: {
    fontSize: 22,
    fontWeight: '800',
    color: '#065f46',
    textAlign: 'center',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065f46',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16a34a',
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  periodButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#d1fae5',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  periodButtonText: {
    color: '#065f46',
    fontWeight: '700',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  periodStat: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  periodStatLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065f46',
    marginBottom: 4,
  },
  periodStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  periodStatValue: {
    fontSize: 14,
    color: '#374151',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listItemRight: {
    alignItems: 'flex-end',
  },
  listItemRank: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16a34a',
    marginRight: 12,
    minWidth: 30,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065f46',
  },
  listItemSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  listItemValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16a34a',
  },
  exportButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  backButton: {
    backgroundColor: '#16a34a',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});














