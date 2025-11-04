import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ventasService } from "../supabase";

export default function Clientes() {
  const router = useRouter();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      const ventas = await ventasService.getAllVentas();
      
      // Agrupar por cliente y contar compras
      const clientesMap = {};
      ventas.forEach((venta) => {
        const nombre = venta.cliente;
        if (!clientesMap[nombre]) {
          clientesMap[nombre] = {
            nombre,
            totalCompras: 0,
            ultimaCompra: venta.fecha,
          };
        }
        clientesMap[nombre].totalCompras += 1;
        // Mantener la fecha más reciente
        if (new Date(venta.fecha) > new Date(clientesMap[nombre].ultimaCompra)) {
          clientesMap[nombre].ultimaCompra = venta.fecha;
        }
      });

      // Convertir a array y ordenar por última compra
      const clientesArray = Object.values(clientesMap).sort(
        (a, b) => new Date(b.ultimaCompra) - new Date(a.ultimaCompra)
      );

      setClientes(clientesArray);
    } catch (error) {
      console.error("Error al cargar clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (iso) => {
    const fecha = new Date(iso);
    return fecha.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={{ marginTop: 12, color: '#64748b' }}>Cargando clientes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.header}>👥 Clientes Registrados</Text>

      {clientes.length === 0 ? (
        <Text style={styles.empty}>Aún no hay clientes registrados.</Text>
      ) : (
        <FlatList
          data={clientes}
          keyExtractor={(item) => item.nombre}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.clienteCard}
              onPress={() =>
                router.push({
                  pathname: "/detalles",
                  params: { cliente: item.nombre },
                })
              }
            >
              <Text style={styles.clienteName}>👤 {item.nombre}</Text>
              <Text style={styles.clienteSub}>
                🛒 {item.totalCompras} {item.totalCompras === 1 ? 'compra' : 'compras'}
              </Text>
              <Text style={styles.clienteFecha}>
                📅 Última: {formatFecha(item.ultimaCompra)}
              </Text>
            </TouchableOpacity>
          )}
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
  header: { fontSize: 22, fontWeight: "800", color: "#065f46", marginBottom: 12, textAlign: "center" },
  clienteCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#d1fae5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clienteName: { fontSize: 18, fontWeight: "800", color: "#065f46", marginBottom: 4 },
  clienteSub: { color: "#374151", fontSize: 14, marginTop: 2 },
  clienteFecha: { color: "#64748b", fontSize: 13, marginTop: 4, fontStyle: 'italic' },
  empty: { textAlign: "center", marginTop: 20, color: "#64748b", fontSize: 16 },
  backBtn: {
    backgroundColor: "#16a34a",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  backText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
