import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ventasService } from "../supabase";
import { formatMoney } from "../utils/formatters";
import { ticketsService } from "../utils/tickets";
import TicketModal from "../components/TicketModal";

export default function Detalles() {
  const router = useRouter();
  const { cliente } = useLocalSearchParams();
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalGastado, setTotalGastado] = useState(0);

  // Estado para selección múltiple
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Estado para modal de ticket (imagen)
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [selectedVentasForTicket, setSelectedVentasForTicket] = useState([]);

  useEffect(() => {
    cargarHistorialCliente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente]);

  const cargarHistorialCliente = async () => {
    try {
      const todasVentas = await ventasService.getAllVentas();
      const ventasCliente = todasVentas.filter((v) => v.cliente === cliente);

      // Calcular total gastado
      const total = ventasCliente.reduce((acc, venta) => {
        const totalVenta = venta.productos.reduce(
          (sum, p) => sum + p.cantidad * p.precio,
          0
        );
        return acc + totalVenta;
      }, 0);

      setVentas(ventasCliente);
      setTotalGastado(total);
    } catch (error) {
      console.error("Error al cargar historial:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (iso) => {
    const fecha = new Date(iso);
    return fecha.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleSelection = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);

    // Si no hay nada seleccionado, salir del modo selección
    if (newSelected.size === 0) {
      setIsSelectionMode(false);
    } else {
      setIsSelectionMode(true);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === ventas.length) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      const allIds = new Set(ventas.map(v => v.id));
      setSelectedIds(allIds);
      setIsSelectionMode(true);
    }
  };

  const shareSelected = async () => {
    if (selectedIds.size === 0) return;

    try {
      const selectedVentas = ventas.filter(v => selectedIds.has(v.id));
      setSelectedVentasForTicket(selectedVentas);
      setTicketModalVisible(true);

      // Limpiar selección después de compartir (opcional, quizás mejor hacerlo al cerrar el modal)
      // setSelectedIds(new Set());
      // setIsSelectionMode(false);
    } catch (error) {
      Alert.alert("Error", "No se pudieron generar las boletas");
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={{ marginTop: 12, color: '#64748b' }}>Cargando historial...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>📦 Historial de {cliente}</Text>

        {ventas.length > 0 && (
          <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllBtn}>
            <Text style={styles.selectAllText}>
              {selectedIds.size === ventas.length ? "Deseleccionar" : "Seleccionar Todo"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.resumen}>
        <Text style={styles.resumenText}>
          🛒 Total de compras: {ventas.length}
        </Text>
        <Text style={styles.resumenTotal}>
          💰 Total gastado: {formatMoney(totalGastado)}
        </Text>
      </View>

      {/* Botón flotante para compartir seleccionados */}
      {selectedIds.size > 0 && (
        <TouchableOpacity style={styles.shareFloatingBtn} onPress={shareSelected}>
          <Text style={styles.shareFloatingText}>
            📄 Compartir ({selectedIds.size})
          </Text>
        </TouchableOpacity>
      )}

      {ventas.length === 0 ? (
        <Text style={styles.empty}>No tiene compras registradas.</Text>
      ) : (
        <FlatList
          data={ventas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => {
            const totalVenta = item.productos.reduce(
              (sum, p) => sum + p.cantidad * p.precio,
              0
            );
            const isSelected = selectedIds.has(item.id);

            return (
              <TouchableOpacity
                style={[styles.ventaCard, isSelected && styles.ventaCardSelected]}
                onPress={() => toggleSelection(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.ventaHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* Checkbox visual */}
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.ventaFecha}>📅 {formatFecha(item.fecha)}</Text>
                  </View>
                  <Text style={styles.ventaMetodo}>
                    💳 {item.metodo_pago || "Efectivo"}
                  </Text>
                </View>

                <View style={styles.productosContainer}>
                  {item.productos.map((p) => (
                    <Text key={p.id} style={styles.productoItem}>
                      • {p.producto} ({p.cantidad} x {formatMoney(p.precio)})
                    </Text>
                  ))}
                </View>

                <View style={styles.ventaFooter}>
                  <Text style={styles.ventaTotal}>Total: {formatMoney(totalVenta)}</Text>
                  {item.pagado ? (
                    <View style={styles.pagadoBadge}>
                      <Text style={styles.pagadoText}>✅ Pagado</Text>
                    </View>
                  ) : (
                    <View style={styles.pendienteBadge}>
                      <Text style={styles.pendienteText}>⏳ Pendiente</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>⬅ Volver</Text>
      </TouchableOpacity>
      <TicketModal
        visible={ticketModalVisible}
        onClose={() => {
          setTicketModalVisible(false);
          // Limpiar selección al cerrar el modal si se desea
          setSelectedIds(new Set());
          setIsSelectionMode(false);
        }}
        ventas={selectedVentasForTicket}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f0fdf4", padding: 12 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: "800",
    color: "#065f46",
    flex: 1,
  },
  selectAllBtn: {
    padding: 8,
  },
  selectAllText: {
    color: "#16a34a",
    fontWeight: "600",
  },
  resumen: {
    backgroundColor: "#ecfdf5",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  resumenText: {
    fontSize: 16,
    color: "#065f46",
    fontWeight: "600",
    marginBottom: 8,
  },
  resumenTotal: {
    fontSize: 20,
    color: "#16a34a",
    fontWeight: "800",
  },
  ventaCard: {
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
  ventaCardSelected: {
    borderColor: "#16a34a",
    backgroundColor: "#f0fdf4",
    borderWidth: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },
  checkmark: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  ventaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  ventaFecha: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  ventaMetodo: {
    fontSize: 14,
    color: "#64748b",
  },
  productosContainer: {
    marginBottom: 12,
  },
  productoItem: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
    paddingLeft: 8,
  },
  ventaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  ventaTotal: {
    fontSize: 18,
    color: "#16a34a",
    fontWeight: "800",
  },
  pagadoBadge: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pagadoText: {
    color: "#065f46",
    fontWeight: "700",
    fontSize: 12,
  },
  pendienteBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pendienteText: {
    color: "#92400e",
    fontWeight: "700",
    fontSize: 12,
  },
  empty: {
    textAlign: "center",
    marginTop: 20,
    color: "#64748b",
    fontSize: 16,
  },
  backBtn: {
    backgroundColor: "#16a34a",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    position: 'absolute',
    bottom: 20,
    left: 12,
    right: 12,
    elevation: 5,
  },
  backText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  shareFloatingBtn: {
    backgroundColor: "#607d8b",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  shareFloatingText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
