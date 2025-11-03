import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { supabase, ventasService, subscribeToVentas } from "../supabase";
import logo from "../assets/images/logo.jpg";

const { width } = Dimensions.get('window');

const uid = () => Math.random().toString(36).slice(2, 10);
const nowISO = () => new Date().toISOString();
const formatDate = (iso) => new Date(iso).toLocaleString();
const isToday = (iso) => {
  const d = new Date(iso);
  const t = new Date();
  return (
    d.getDate() === t.getDate() &&
    d.getMonth() === t.getMonth() &&
    d.getFullYear() === t.getFullYear()
  );
};

export default function Index() {
  const [ventas, setVentas] = useState([]);

  const [cliente, setCliente] = useState("");
  const [producto, setProducto] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [precio, setPrecio] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");

  const [carrito, setCarrito] = useState([]);

  // --- Supabase: mapeo y carga inicial ---
  const mapRowToVenta = (row) => ({
    id: row?.identificacion ?? row?.id ?? uid(),
    cliente: row?.cliente ?? "",
    productos: Array.isArray(row?.productos) ? row.productos : [],
    metodoPago: row?.metodo_pago ?? "Efectivo",
    fecha: row?.fecha ?? nowISO(),
    pagado: false, // Tu tabla no tiene esta columna, siempre false
  });

  useEffect(() => {
    let channel;
    (async () => {
      try {
        const data = await ventasService.getAllVentas();
        setVentas(data.map(mapRowToVenta));
      } catch (e) {
        console.warn("Supabase: no se pudieron cargar ventas:", e?.message);
      }

      // Suscripción en tiempo real
      channel = subscribeToVentas(async () => {
        try {
          const data = await ventasService.getAllVentas();
          setVentas(data.map(mapRowToVenta));
        } catch {}
      });
    })();
    return () => {
      try { channel && supabase.removeChannel(channel); } catch {}
    };
  }, []);

  const totalDelDia = useMemo(() => {
    return ventas
      .filter((v) => isToday(v.fecha))
      .reduce(
        (acc, v) =>
          acc + v.productos.reduce((s, p) => s + p.cantidad * p.precio, 0),
        0
      );
  }, [ventas]);

  const numeroVentasDelDia = useMemo(
    () => ventas.filter((v) => isToday(v.fecha)).length,
    [ventas]
  );

  const agregarProducto = () => {
    if (!producto.trim() || !cantidad || !precio) {
      Alert.alert("Faltan datos", "Completa producto, cantidad y precio.");
      return;
    }
    const c = parseFloat(cantidad);
    const p = parseFloat(precio);
    if (!(c > 0) || !(p >= 0)) {
      Alert.alert(
        "Valores inválidos",
        "Cantidad y precio deben ser números válidos."
      );
      return;
    }

    setCarrito((prev) => [
      ...prev,
      { id: uid(), producto: producto.trim(), cantidad: c, precio: p },
    ]);
    setProducto("");
    setCantidad("");
    setPrecio("");
  };

  const eliminarProductoDelCarrito = (id) => {
    setCarrito((prev) => prev.filter((p) => p.id !== id));
  };

  const cancelarCarrito = () => {
    setCarrito([]);
  };

  const finalizarVenta = async () => {
    if (!cliente.trim()) {
      Alert.alert(
        "Falta nombre",
        "Ingresa el nombre del cliente antes de finalizar."
      );
      return;
    }
    if (carrito.length === 0) {
      Alert.alert("Carrito vacío", "Agrega al menos un producto.");
      return;
    }

    try {
      const created = await ventasService.createVenta({
        cliente: cliente.trim(),
        productos: carrito,
        metodo_pago: metodoPago
      });
      const nuevaVenta = mapRowToVenta(created);
      setVentas((prev) => [nuevaVenta, ...prev]);
    } catch (_e) {
      // Mostrar el motivo real para poder corregir rápido (RLS, columna, etc.)
      console.error("Supabase insert error:", _e);
      const msg = typeof _e?.message === "string" ? _e.message : JSON.stringify(_e);
      Alert.alert("Supabase", `No se pudo guardar la venta en la base de datos\n\n${msg}`);
      return;
    }

    // limpiar form y carrito
    setCliente("");
    setCarrito([]);
    setMetodoPago("Efectivo");
  };

  const marcarPagado = async (id) => {
    // Solo actualización local, tu tabla no tiene columna pagado
    setVentas((prev) => prev.map((v) => (v.id === id ? { ...v, pagado: true } : v)));
  };

  const eliminarVenta = (id) => {
    Alert.alert("Eliminar venta", "Seguro quieres eliminar esta venta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await ventasService.deleteVenta(id);
            setVentas((prev) => prev.filter((v) => v.id !== id));
          } catch (_e) {
            Alert.alert("Supabase", "No se pudo eliminar la venta");
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      {/* LOGO */}
      <View style={styles.logoWrap}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
      </View>

      <Text style={styles.header}>📒 Registro de Ventas</Text>

      {/* FORMULARIO */}
      <View style={styles.card}>
        <TextInput
          placeholder="Nombre del cliente"
          value={cliente}
          onChangeText={setCliente}
          style={styles.input}
        />

        <TextInput
          placeholder="Producto"
          value={producto}
          onChangeText={setProducto}
          style={styles.input}
        />

        <View style={styles.row}>
          <TextInput
            placeholder="Cantidad"
            value={cantidad}
            onChangeText={setCantidad}
            keyboardType="numeric"
            style={[styles.input, styles.inputHalf]}
          />
          <TextInput
            placeholder="Precio x unidad"
            value={precio}
            onChangeText={setPrecio}
            keyboardType="numeric"
            style={[styles.input, styles.inputHalf]}
          />
        </View>

        <View style={styles.rowButtons}>
          <TouchableOpacity style={styles.btnYellow} onPress={agregarProducto}>
            <Text style={styles.btnText}>➕ Agregar producto</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnGray, { marginLeft: 8 }]}
            onPress={cancelarCarrito}
            disabled={carrito.length === 0}
          >
            <Text style={styles.btnTextGray}>✖ Cancelar carrito</Text>
          </TouchableOpacity>
        </View>

        {/* Carrito temporal */}
        {carrito.length > 0 && (
          <View style={styles.cart}>
            <Text style={styles.cartTitle}>🛒 Carrito ({carrito.length})</Text>
            {carrito.map((p) => (
              <View key={p.id} style={styles.cartRow}>
                <Text style={styles.cartText}>
                  {p.producto} · {p.cantidad} x ${p.precio.toFixed(2)} = $
                  {(p.cantidad * p.precio).toFixed(2)}
                </Text>
                <TouchableOpacity
                  style={styles.cartRemove}
                  onPress={() => eliminarProductoDelCarrito(p.id)}
                >
                  <Text style={{ color: "#fff" }}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Método de pago */}
        <Text style={styles.label}>Método de pago</Text>
        <View style={styles.row}>
          {["Efectivo", "Transferencia", "Tarjeta"].map((mp) => (
            <TouchableOpacity
              key={mp}
              onPress={() => setMetodoPago(mp)}
              style={[
                styles.pill,
                metodoPago === mp ? styles.pillActive : styles.pillInactive,
              ]}
            >
              <Text
                style={
                  metodoPago === mp
                    ? styles.pillTextActive
                    : styles.pillTextInactive
                }
              >
                {mp}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Botón para ver clientes */}
        <TouchableOpacity
          style={[styles.btnBlue, { marginTop: 12 }]}
          onPress={() =>
            router.push({
              pathname: "/cli",
              params: { ventas: JSON.stringify(ventas) },
            })
          }
        >
          <Text style={styles.btnText}>👥 Ver clientes registrados</Text>
        </TouchableOpacity>

        {/* Botón para finalizar */}
        <TouchableOpacity
          style={[styles.btnGreen, carrito.length === 0 && { opacity: 0.6 }]}
          onPress={finalizarVenta}
          disabled={carrito.length === 0}
        >
          <Text style={styles.btnText}>✔️ Continuar / Finalizar venta</Text>
        </TouchableOpacity>
      </View>

      {/* RESUMEN */}
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>📊 Resumen de hoy</Text>
        <Text style={styles.summaryText}>Ventas: {numeroVentasDelDia}</Text>
        <Text style={styles.summaryText}>Total: ${totalDelDia.toFixed(2)}</Text>
      </View>

      {/* HISTORIAL */}
      <Text style={styles.sectionTitle}>🕘 Historial de ventas</Text>
      <FlatList
        data={ventas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={<Text style={styles.empty}>Aún no hay ventas.</Text>}
        renderItem={({ item }) => {
          const total = item.productos.reduce(
            (acc, p) => acc + p.cantidad * p.precio,
            0
          );
          return (
            <View style={styles.saleCard}>
              <View style={styles.saleHeader}>
                <Text style={styles.saleClient}>👤 {item.cliente}</Text>
                <Text style={styles.saleDate}>{formatDate(item.fecha)}</Text>
              </View>

              {item.productos.map((p) => (
                <Text key={p.id} style={styles.saleLine}>
                  • {p.producto} ({p.cantidad} x ${p.precio})
                </Text>
              ))}

              <View style={styles.rowBetween}>
                <Text style={styles.salePayment}>💳 {item.metodoPago}</Text>
                <Text style={styles.saleTotal}>Total: ${total.toFixed(2)}</Text>
              </View>

              <View style={styles.row}>
                {!item.pagado ? (
                  <TouchableOpacity
                    style={styles.payBtn}
                    onPress={() => marcarPagado(item.id)}
                  >
                    <Text style={styles.payBtnText}>✔️ Marcar como pagado</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.paidBadge}>
                    <Text style={styles.paidText}>✅ Pagado</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => eliminarVenta(item.id)}
                >
                  <Text style={styles.deleteText}>🗑️ Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { 
    flex: 1, 
    backgroundColor: "#f0fdf4" 
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 100, // Espacio extra al final para el teclado
  },
  logoWrap: { 
    alignItems: "center", 
    marginBottom: 8 
  },
  logo: { 
    width: Math.min(width * 0.4, 160), 
    height: Math.min(width * 0.28, 110) 
  },
  header: {
    fontSize: 22,
    fontWeight: "800",
    color: "#065f46",
    textAlign: "center",
    marginBottom: 8,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#d1fae5",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  input: {
    borderWidth: 2,
    borderColor: "#22c55e",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#fff",
    marginBottom: 12,
    fontSize: 16,
    minHeight: 50,
  },
  row: { 
    flexDirection: "row", 
    alignItems: "center",
    marginBottom: 8,
  },
  inputHalf: { 
    flex: 1, 
    marginRight: 8,
  },

  rowButtons: { 
    flexDirection: "row", 
    marginBottom: 12,
    gap: 8,
  },
  btnYellow: {
    flex: 1,
    backgroundColor: "#facc15",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    minHeight: 50,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  btnGray: {
    backgroundColor: "#e5e7eb",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    minHeight: 50,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  btnGreen: {
    backgroundColor: "#16a34a",
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    alignItems: "center",
    minHeight: 50,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  btnBlue: {
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    minHeight: 50,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  btnText: { color: "#fff", fontWeight: "700" },
  btnTextGray: { color: "#111", fontWeight: "700" },

  cart: {
    backgroundColor: "#ecfdf5",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  cartTitle: { fontWeight: "800", color: "#065f46", marginBottom: 6 },
  cartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cartText: { color: "#064e3b" },
  cartRemove: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },

  label: {
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 6,
    color: "#065f46",
  },
  pill: {
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    marginRight: 8,
    marginBottom: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  pillActive: { backgroundColor: "#22c55e", borderColor: "#16a34a" },
  pillInactive: { backgroundColor: "#fff", borderColor: "#d1fae5" },
  pillTextActive: { color: "#fff", fontWeight: "800" },
  pillTextInactive: { color: "#065f46", fontWeight: "700" },

  summary: {
    backgroundColor: "#ecfdf5",
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  summaryTitle: { fontWeight: "800", marginBottom: 6, color: "#065f46" },
  summaryText: { color: "#065f46", fontWeight: "700" },

  sectionTitle: { fontWeight: "800", color: "#065f46", marginBottom: 6 },

  saleCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  saleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  saleClient: { fontWeight: "800", color: "#065f46" },
  saleDate: { color: "#64748b", fontSize: 12 },
  saleLine: { color: "#374151" },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 8,
  },
  salePayment: { color: "#065f46", fontWeight: "700" },
  saleTotal: { color: "#16a34a", fontWeight: "800" },

  payBtn: {
    backgroundColor: "#16a34a",
    padding: 12,
    borderRadius: 12,
    flex: 1,
    marginRight: 8,
    alignItems: "center",
    minHeight: 44,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  payBtnText: { 
    color: "#fff", 
    fontWeight: "800",
    fontSize: 14,
  },
  paidBadge: {
    backgroundColor: "#d1fae5",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    minHeight: 44,
  },
  paidText: { 
    color: "#065f46", 
    fontWeight: "800",
    fontSize: 14,
  },

  deleteBtn: {
    backgroundColor: "#ef4444",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    minHeight: 44,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deleteText: { 
    color: "#fff", 
    fontWeight: "800",
    fontSize: 14,
  },

  empty: { textAlign: "center", marginTop: 20, color: "#64748b" },
});
