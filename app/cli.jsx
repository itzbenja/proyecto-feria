import React from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function Clientes({ route }) {
  const router = useRouter();
  const { ventas } = route?.params || { ventas: [] }; // recibimos ventas desde app.jsx

  return (
    <View style={styles.screen}>
      <Text style={styles.header}>👥 Clientes Registrados</Text>

      {ventas.length === 0 ? (
        <Text style={styles.empty}>Aún no hay clientes registrados.</Text>
      ) : (
        <FlatList
          data={ventas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.clienteCard}
              onPress={() =>
                router.push({
                  pathname: "/detalles",
                  params: { cliente: item.cliente, productos: JSON.stringify(item.productos) },
                })
              }
            >
              <Text style={styles.clienteName}>👤 {item.cliente}</Text>
              <Text style={styles.clienteSub}>🛒 {item.productos.length} productos</Text>
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
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  clienteName: { fontSize: 18, fontWeight: "800", color: "#065f46" },
  clienteSub: { color: "#374151", marginTop: 4 },
  empty: { textAlign: "center", marginTop: 20, color: "#64748b" },
  backBtn: {
    backgroundColor: "#16a34a",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  backText: { color: "#fff", fontWeight: "800" },
});
