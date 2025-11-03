import React from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function Detalles() {
  const router = useRouter();
  const { cliente, productos } = useLocalSearchParams();
  const productosList = JSON.parse(productos || "[]");

  return (
    <View style={styles.screen}>
      <Text style={styles.header}>📦 Detalles de {cliente}</Text>

      {productosList.length === 0 ? (
        <Text style={styles.empty}>No tiene productos registrados.</Text>
      ) : (
        <FlatList
          data={productosList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              <Text style={styles.productName}>
                🛒 {item.producto} ({item.cantidad} x ${item.precio})
              </Text>
              <Text style={styles.productTotal}>
                Total: ${(item.cantidad * item.precio).toFixed(2)}
              </Text>
            </View>
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
  productCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  productName: { fontWeight: "700", color: "#374151" },
  productTotal: { color: "#16a34a", fontWeight: "800", marginTop: 4 },
  empty: { textAlign: "center", marginTop: 20, color: "#64748b" },
  backBtn: { backgroundColor: "#16a34a", padding: 12, borderRadius: 10, alignItems: "center", marginTop: 20 },
  backText: { color: "#fff", fontWeight: "800" },
});
