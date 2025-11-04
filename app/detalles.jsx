import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ventasService } from "../supabase";

export default function Detalles() {
  const router = useRouter();
  const { cliente } = useLocalSearchParams();
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalGastado, setTotalGastado] = useState(0);

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
      <Text style={styles.header}>📦 Historial de {cliente}</Text>
      
      <View style={styles.resumen}>
        <Text style={styles.resumenText}>
          🛒 Total de compras: {ventas.length}
        </Text>
        <Text style={styles.resumenTotal}>
          💰 Total gastado: ${totalGastado.toFixed(2)}
        </Text>
      </View>

      {ventas.length === 0 ? (
        <Text style={styles.empty}>No tiene compras registradas.</Text>
      ) : (
        <FlatList
          data={ventas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const totalVenta = item.productos.reduce(
              (sum, p) => sum + p.cantidad * p.precio,
              0
            );
            return (
              <View style={styles.ventaCard}>
                <View style={styles.ventaHeader}>
                  <Text style={styles.ventaFecha}>📅 {formatFecha(item.fecha)}</Text>
                  <View>
                    {Array.isArray(item.metodo_pago) && item.metodo_pago.length > 1 ? (
                      <>
                        <Text style={styles.ventaMetodo}>💳 Pagos mixtos</Text>
                        {item.metodo_pago.map((pago, idx) => (
                          <Text key={idx} style={styles.ventaMetodoDetalle}>
                            • {pago.metodo}: ${pago.monto.toFixed(2)}
                          </Text>
                        ))}
                      </>
                    ) : (
                      <Text style={styles.ventaMetodo}>
                        💳 {Array.isArray(item.metodo_pago) ? item.metodo_pago[0]?.metodo : item.metodo_pago}
                      </Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.productosContainer}>
                  {item.productos.map((p) => (
                    <Text key={p.id} style={styles.productoItem}>
                      • {p.producto} ({p.cantidad} x ${p.precio.toFixed(2)})
                    </Text>
                  ))}
                </View>
                
                <View style={styles.ventaFooter}>
                  <Text style={styles.ventaTotal}>Total: ${totalVenta.toFixed(2)}</Text>
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
              </View>
            );
          }}
        />
      )}

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>⬅ Volver</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f0fdf4", padding: 12 },
  header: { 
    fontSize: 22, 
    fontWeight: "800", 
    color: "#065f46", 
    marginBottom: 16, 
    textAlign: "center" 
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
  ventaMetodoDetalle: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 8,
    marginTop: 2,
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
    marginTop: 20,
  },
  backText: { 
    color: "#fff", 
    fontWeight: "800",
    fontSize: 16,
  },
});
