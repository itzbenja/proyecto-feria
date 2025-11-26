import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVentas } from "../hooks/useVentas";
import { formatMoney } from "../utils/formatters";
import { ErrorHandler } from "../utils/errorHandler";

const formatDate = (iso) => new Date(iso).toLocaleString('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

export default function Pendientes() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ventas, loading: ventasLoading, refresh } = useVentas();
  const [filtroEstado, setFiltroEstado] = useState("Todos"); // Todos, Pagado, Pendiente, Abono

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Filtrar ventas según el estado seleccionado
  const ventasFiltradas = useMemo(() => {
    if (filtroEstado === "Todos") {
      return ventas;
    }

    return ventas.filter((venta) => {
      const total = venta.productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
      const totalAbonado = (venta.abonos || []).reduce((sum, a) => sum + Number(a.monto || 0), 0);
      const estaCompletamentePagado = venta.pagado || totalAbonado >= total - 0.01;
      const tieneAbonoParcial = !estaCompletamentePagado && totalAbonado > 0.01;
      const faltaPagar = !estaCompletamentePagado; // Cualquier venta no completamente pagada

      // DEBUG LOG
      if (venta.cliente === 'papa' || venta.cliente === 'ins') {
        console.log(`DEBUG: ID: ${venta.id}, Cliente: ${venta.cliente}, Pagado: ${venta.pagado}, Total: ${total}, Abonado: ${totalAbonado}, Completo: ${estaCompletamentePagado}, Filtro: ${filtroEstado}`);
      }

      if (filtroEstado === "Pagado") {
        return estaCompletamentePagado;
      } else if (filtroEstado === "Pendiente") {
        // Todas las ventas que tienen algo pendiente de pagar (con o sin abono)
        return faltaPagar;
      } else if (filtroEstado === "Abono") {
        // Ventas con abono parcial (tiene abono pero no está pagado completo)
        return tieneAbonoParcial;
      }
      return true;
    });
  }, [ventas, filtroEstado]);

  // Calcular estadísticas
  const estadisticas = useMemo(() => {
    let total = 0;
    let totalAbonado = 0;

    ventasFiltradas.forEach((v) => {
      // Calcular total de la venta
      const totalVenta = v.productos.reduce((sum, p) => {
        const cantidad = Number(p.cantidad) || 0;
        const precio = Number(p.precio) || 0;
        return sum + (cantidad * precio);
      }, 0);
      total += totalVenta;

      // Calcular total abonado - verificar diferentes formatos
      let abonadoVenta = 0;

      if (Array.isArray(v.abonos) && v.abonos.length > 0) {
        abonadoVenta = v.abonos.reduce((sum, a) => {
          // Manejar diferentes formatos de abono
          const monto = a?.monto || a?.amount || 0;
          return sum + Number(monto);
        }, 0);
      }

      totalAbonado += abonadoVenta;
    });

    const totalPendiente = Math.max(0, total - totalAbonado);

    return {
      total,
      totalAbonado,
      totalPendiente,
      cantidad: ventasFiltradas.length
    };
  }, [ventasFiltradas]);

  if (ventasLoading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={{ marginTop: 12, color: '#64748b' }}>Cargando pedidos...</Text>
      </View>
    );
  }

  return (

    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Text style={styles.header}>📋 Pedidos por Estado</Text>

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filtersTitle}>Filtrar por estado:</Text>
        <View style={styles.filtersRow}>
          {["Todos", "Pagado", "Pendiente", "Abono"].map((estado) => (
            <TouchableOpacity
              key={estado}
              onPress={() => setFiltroEstado(estado)}
              style={[
                styles.filterPill,
                filtroEstado === estado ? styles.filterPillActive : styles.filterPillInactive,
              ]}
            >
              <Text
                style={
                  filtroEstado === estado
                    ? styles.filterPillTextActive
                    : styles.filterPillTextInactive
                }
              >
                {estado}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Lista de pedidos */}
      {ventasFiltradas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {filtroEstado === "Todos"
              ? "No hay pedidos registrados"
              : `No hay pedidos con estado "${filtroEstado}"`}
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>⬅ Volver</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={ventasFiltradas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          renderItem={({ item }) => {
            const total = item.productos.reduce(
              (acc, p) => acc + p.cantidad * p.precio,
              0
            );
            const totalAbonado = (item.abonos || []).reduce((sum, a) => sum + Number(a.monto), 0);
            const faltaPagar = !item.pagado && totalAbonado < total - 0.01;

            return (
              <View style={styles.saleCard}>
                <View style={styles.saleHeader}>
                  <Text style={styles.saleClient}>👤 {item.cliente}</Text>
                  <Text style={styles.saleDate}>{formatDate(item.fecha)}</Text>
                </View>

                {item.productos.map((p) => (
                  <Text key={p.id} style={styles.saleLine}>
                    • {p.producto} ({p.cantidad} x {formatMoney(p.precio)})
                  </Text>
                ))}

                <View style={styles.saleFooter}>
                  <View>
                    <Text style={styles.saleTotal}>Total: {formatMoney(total)}</Text>
                    {faltaPagar && (
                      <Text style={styles.saleAbonado}>
                        Abonado: {formatMoney(totalAbonado)} / Pendiente: {formatMoney(total - totalAbonado)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.statusBadge}>
                    {item.pagado || totalAbonado >= total - 0.01 ? (
                      <Text style={styles.statusTextPaid}>✅ Pagado</Text>
                    ) : totalAbonado > 0 ? (
                      <Text style={styles.statusTextPartial}>💰 Abono</Text>
                    ) : (
                      <Text style={styles.statusTextPending}>⏳ Pendiente</Text>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() => router.push({ pathname: "/detalles", params: { cliente: item.cliente } })}
                >
                  <Text style={styles.viewBtnText}>Ver Detalles</Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListFooterComponent={
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backText}>⬅ Volver</Text>
            </TouchableOpacity>
          }
        />
      )}
    </View>
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
    marginBottom: 16,
    textAlign: "center",
  },
  filtersContainer: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  filtersTitle: {
    fontWeight: "700",
    color: "#065f46",
    marginBottom: 8,
  },
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterPill: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 2,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillActive: {
    backgroundColor: "#22c55e",
    borderColor: "#16a34a",
  },
  filterPillInactive: {
    backgroundColor: "#fff",
    borderColor: "#d1fae5",
  },
  filterPillTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  filterPillTextInactive: {
    color: "#065f46",
    fontWeight: "600",
  },
  statsContainer: {
    backgroundColor: "#ecfdf5",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  statsTitle: {
    fontWeight: "800",
    color: "#065f46",
    marginBottom: 12,
    fontSize: 18,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statsLabel: {
    color: "#065f46",
    fontWeight: "600",
  },
  statsValue: {
    color: "#16a34a",
    fontWeight: "800",
  },
  saleCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  saleClient: {
    fontWeight: "800",
    color: "#065f46",
    fontSize: 16,
  },
  saleDate: {
    color: "#64748b",
    fontSize: 12,
  },
  saleLine: {
    color: "#374151",
    marginBottom: 4,
  },
  saleFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  saleTotal: {
    color: "#16a34a",
    fontWeight: "800",
    fontSize: 16,
  },
  saleAbonado: {
    color: "#d97706",
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  statusTextPaid: {
    color: "#16a34a",
    fontWeight: "700",
    fontSize: 12,
  },
  statusTextPartial: {
    color: "#f59e0b",
    fontWeight: "700",
    fontSize: 12,
  },
  statusTextPending: {
    color: "#ef4444",
    fontWeight: "700",
    fontSize: 12,
  },
  viewBtn: {
    backgroundColor: "#3b82f6",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  viewBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 16,
  },
  backBtn: {
    backgroundColor: "#16a34a",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  backText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});

