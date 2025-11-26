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
  Platform,
  Dimensions,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { supabase, ventasService, subscribeToVentas } from "../supabase";
import { formatMoney, parseCurrency, formatInputCurrency } from "../utils/formatters";
import TicketModal from "../components/TicketModal";
import EditVentaModal from "../components/EditVentaModal";
import AuthScreen from "../components/AuthScreen";
import { offlineStorage } from "../utils/offlineStorage";



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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ventas, setVentas] = useState([]);
  const [pendingVentas, setPendingVentas] = useState([]);

  const [cliente, setCliente] = useState("");
  const [producto, setProducto] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [precio, setPrecio] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");

  const [carrito, setCarrito] = useState([]);

  // Estados para modal de abono
  const [modalAbonoVisible, setModalAbonoVisible] = useState(false);
  const [ventaParaAbonar, setVentaParaAbonar] = useState(null);
  const [montoAbono, setMontoAbono] = useState("");

  // Estado para modal de ticket (imagen)
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [selectedVentaForTicket, setSelectedVentaForTicket] = useState(null);

  // Estado para modal de edición completa
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [ventaParaEditar, setVentaParaEditar] = useState(null);

  // Estado para saber si estamos abonando a una venta existente o creando una nueva con abono
  const [isAbonoInicial, setIsAbonoInicial] = useState(false);

  // --- Supabase: mapeo y carga inicial ---
  const mapRowToVenta = (row) => {
    return {
      id: row?.identificacion ?? row?.id ?? uid(),
      cliente: row?.cliente ?? "",
      productos: Array.isArray(row?.productos) ? row.productos : [],
      metodoPago: row?.metodo_pago ?? "Efectivo",
      fecha: row?.fecha ?? nowISO(),
      pagado: !!row?.pagado,
      abonos: Array.isArray(row?.abonos) ? row.abonos : [],
    };
  };

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
        } catch { }
      });
    })();
    return () => {
      try { channel && supabase.removeChannel(channel); } catch { }
    };
  }, []);

  // Cargar ventas pendientes offline
  useEffect(() => {
    loadPendingVentas();
  }, []);

  const loadPendingVentas = async () => {
    const pending = await offlineStorage.getPendingVentas();
    setPendingVentas(pending);
  };

  const syncVentas = async () => {
    if (pendingVentas.length === 0) return;

    // Mostrar indicador de carga o alerta no bloqueante si se prefiere
    // Alert.alert("Sincronizando", "Subiendo ventas pendientes...");

    let successCount = 0;
    const failedVentasList = [];
    const newSyncedVentas = [];
    const currentPending = [...pendingVentas];

    for (const venta of currentPending) {
      try {
        // Intentar crear la venta en Supabase
        const created = await ventasService.createVenta({
          cliente: venta.cliente,
          productos: venta.productos,
          metodo_pago: venta.metodo_pago,
          pagado: venta.pagado,
          abonos: venta.abonos
        });

        // Si tiene éxito, eliminar de offline
        await offlineStorage.removePendingVenta(venta.tempId);
        successCount++;

        // Agregar a lista temporal para update batch
        const nuevaVenta = mapRowToVenta(created);
        newSyncedVentas.push(nuevaVenta);

      } catch (e) {
        console.error("Error syncing venta:", e);
        failedVentasList.push(venta);
      }
    }

    // Batch update de ventas (una sola actualización de estado)
    if (newSyncedVentas.length > 0) {
      setVentas((prev) => [...newSyncedVentas, ...prev]);
    }

    await loadPendingVentas();

    if (failedVentasList.length === 0) {
      if (successCount > 0) {
        Alert.alert("✅ Sincronización", `Se subieron ${successCount} ventas correctamente.`);
      }
    } else {
      Alert.alert(
        "⚠️ Sincronización Incompleta",
        `Se subieron ${successCount} ventas.\nFallaron ${failedVentasList.length} ventas.`,
        [
          { text: "Reintentar luego", style: "cancel" },
          {
            text: "Descartar fallidas",
            style: "destructive",
            onPress: () => discardFailedVentas(failedVentasList)
          }
        ]
      );
    }
  };

  const discardFailedVentas = async (failedList) => {
    try {
      for (const v of failedList) {
        await offlineStorage.removePendingVenta(v.tempId);
      }
      await loadPendingVentas();
      Alert.alert("🗑️ Descartadas", "Se eliminaron las ventas que fallaron.");
    } catch (e) {
      Alert.alert("Error", "No se pudieron descartar las ventas.");
    }
  };

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

  const guardarPendiente = async () => {
    if (!cliente.trim()) {
      Alert.alert("Falta nombre", "Ingresa el nombre del cliente antes de guardar.");
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
        metodo_pago: metodoPago,
        pagado: false,
        abonos: []
      });
      const nuevaVenta = mapRowToVenta(created);
      setVentas((prev) => [nuevaVenta, ...prev]);

      Alert.alert("✅ Guardado", "Venta guardada como pendiente");

      // limpiar form y carrito
      setCliente("");
      setCarrito([]);
      setMetodoPago("Efectivo");
    } catch (_e) {
      console.error("Supabase insert error:", _e);

      // Guardar offline
      try {
        await offlineStorage.savePendingVenta({
          cliente: cliente.trim(),
          productos: carrito,
          metodo_pago: metodoPago,
          pagado: false,
          abonos: []
        });
        await loadPendingVentas();
        Alert.alert("⚠️ Sin conexión", "Venta guardada en el dispositivo. Sincroniza cuando tengas internet.");

        // limpiar form y carrito
        setCliente("");
        setCarrito([]);
        setMetodoPago("Efectivo");
      } catch (storageError) {
        Alert.alert("Error crítico", "No se pudo guardar la venta ni online ni offline.");
      }
    }
  };

  const pagarCompleto = async () => {
    if (!cliente.trim()) {
      Alert.alert("Falta nombre", "Ingresa el nombre del cliente antes de finalizar.");
      return;
    }
    if (carrito.length === 0) {
      Alert.alert("Carrito vacío", "Agrega al menos un producto.");
      return;
    }

    try {
      const total = carrito.reduce((sum, p) => sum + p.cantidad * p.precio, 0);

      const created = await ventasService.createVenta({
        cliente: cliente.trim(),
        productos: carrito,
        metodo_pago: metodoPago,
        pagado: true,
        abonos: [{
          monto: total,
          fecha: new Date().toISOString(),
          metodo: metodoPago
        }]
      });
      const nuevaVenta = mapRowToVenta(created);
      setVentas((prev) => [nuevaVenta, ...prev]);

      Alert.alert("✅ Pagado", `Venta registrada y pagada: ${formatMoney(total)}`);

      // limpiar form y carrito
      setCliente("");
      setCarrito([]);
      setMetodoPago("Efectivo");
    } catch (_e) {
      console.error("Supabase insert error:", _e);

      // Guardar offline
      try {
        const total = carrito.reduce((sum, p) => sum + p.cantidad * p.precio, 0);
        await offlineStorage.savePendingVenta({
          cliente: cliente.trim(),
          productos: carrito,
          metodo_pago: metodoPago,
          pagado: true,
          abonos: [{
            monto: total,
            fecha: new Date().toISOString(),
            metodo: metodoPago
          }]
        });
        await loadPendingVentas();
        Alert.alert("⚠️ Sin conexión", "Venta guardada en el dispositivo. Sincroniza cuando tengas internet.");

        // limpiar form y carrito
        setCliente("");
        setCarrito([]);
        setMetodoPago("Efectivo");
      } catch (storageError) {
        Alert.alert("Error crítico", "No se pudo guardar la venta ni online ni offline.");
      }
    }
  };

  const abonarAlCrear = () => {
    if (!cliente.trim()) {
      Alert.alert("Falta nombre", "Ingresa el nombre del cliente antes de abonar.");
      return;
    }
    if (carrito.length === 0) {
      Alert.alert("Carrito vacío", "Agrega al menos un producto.");
      return;
    }

    const total = carrito.reduce((sum, p) => sum + p.cantidad * p.precio, 0);

    // Preparar el modal para abono inicial
    setIsAbonoInicial(true);
    setVentaParaAbonar({
      cliente: cliente.trim(),
      productos: carrito,
      total: total // Propiedad temporal para mostrar en el modal
    });
    setMontoAbono("");
    setModalAbonoVisible(true);
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
        metodo_pago: metodoPago,
        pagado: false
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
    const venta = ventas.find((v) => v.id === id);
    if (!venta) return;

    const total = venta.productos.reduce((sum, p) => sum + p.cantidad * p.precio, 0);
    const totalAbonado = (venta.abonos || []).reduce((sum, a) => sum + Number(a.monto), 0);
    const pendiente = total - totalAbonado;

    const procederConPago = async () => {
      try {
        await ventasService.updatePagado(id, true);
        setVentas((prev) => prev.map((v) => (v.id === id ? { ...v, pagado: true } : v)));
      } catch (_e) {
        Alert.alert("Supabase", "No se pudo actualizar el estado de pago");
      }
    };

    if (pendiente > 0.01) {
      Alert.alert(
        "Confirmar Pago Forzado",
        `La persona debe ${formatMoney(pendiente)}.\n\n¿Estás seguro de marcar como pagado?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Sí, marcar pagado",
            style: "destructive",
            onPress: procederConPago
          }
        ]
      );
    } else {
      procederConPago();
    }
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

  const abonarVenta = (venta) => {
    setIsAbonoInicial(false);
    setVentaParaAbonar(venta);
    const total = venta.productos.reduce((sum, p) => sum + p.cantidad * p.precio, 0);
    const totalAbonado = (venta.abonos || []).reduce((sum, a) => sum + Number(a.monto), 0);
    const pendiente = total - totalAbonado;

    // No pre-llenar el monto, dejarlo vacío para que el usuario escriba
    setMontoAbono("");
    setModalAbonoVisible(true);
  };

  const confirmarAbono = async () => {
    if (!ventaParaAbonar) return;

    // Calcular totales dependiendo si es abono inicial o venta existente
    let total, totalAbonado, pendiente;

    if (isAbonoInicial) {
      total = ventaParaAbonar.total; // Usamos la propiedad temporal
      totalAbonado = 0;
      pendiente = total;
    } else {
      total = ventaParaAbonar.productos.reduce((sum, p) => sum + p.cantidad * p.precio, 0);
      totalAbonado = (ventaParaAbonar.abonos || []).reduce((sum, a) => sum + Number(a.monto), 0);
      pendiente = total - totalAbonado;
    }

    // Parsear el monto formateado (ej: "128.381" -> 128381)
    const monto = parseCurrency(montoAbono);
    if (!monto || monto <= 0) {
      Alert.alert("Error", "Ingresa un monto válido");
      return;
    }
    if (monto > pendiente + 0.01) {
      Alert.alert("Error", `El monto no puede ser mayor al pendiente (${formatMoney(pendiente)})`);
      return;
    }

    try {
      const nuevoAbono = {
        monto,
        fecha: new Date().toISOString(),
        metodo: metodoPago,
      };

      if (isAbonoInicial) {
        // Lógica para crear venta con abono inicial
        const estaPagado = monto >= total - 0.01;

        const created = await ventasService.createVenta({
          cliente: ventaParaAbonar.cliente,
          productos: ventaParaAbonar.productos,
          metodo_pago: metodoPago,
          pagado: estaPagado,
          abonos: [nuevoAbono]
        });
        const nuevaVenta = mapRowToVenta(created);
        setVentas((prev) => [nuevaVenta, ...prev]);

        // Limpiar
        setCliente("");
        setCarrito([]);
        setMetodoPago("Efectivo");
      } else {
        // Lógica existente para agregar abono a venta ya creada
        await ventasService.addAbono(ventaParaAbonar.id, nuevoAbono);

        // Recargar ventas
        const data = await ventasService.getAllVentas();
        setVentas(data.map(mapRowToVenta));
      }

      setModalAbonoVisible(false);
      setVentaParaAbonar(null);
      setMontoAbono("");
      setIsAbonoInicial(false);

      // Calcular nuevo total abonado y pendiente después del abono
      const nuevoTotalAbonado = totalAbonado + monto;
      const nuevoPendiente = total - nuevoTotalAbonado;

      // Mostrar resumen detallado del pago
      const mensaje = nuevoPendiente <= 0.01
        ? `¡Venta completamente pagada!\n\n` +
        `Total de la venta: ${formatMoney(total)}\n` +
        `Abono registrado: ${formatMoney(monto)}\n` +
        `Total pagado: ${formatMoney(nuevoTotalAbonado)}`
        : `Abono registrado exitosamente\n\n` +
        `Total de la venta: ${formatMoney(total)}\n` +
        `Abono registrado: ${formatMoney(monto)}\n` +
        `Total pagado: ${formatMoney(nuevoTotalAbonado)}\n` +
        `Pendiente: ${formatMoney(nuevoPendiente)}`;

      Alert.alert("✅ Éxito", mensaje);
    } catch (_e) {
      console.error("Error en abono:", _e);

      if (isAbonoInicial) {
        // Manejo offline para abono inicial
        try {
          const estaPagado = monto >= total - 0.01;
          await offlineStorage.savePendingVenta({
            cliente: ventaParaAbonar.cliente,
            productos: ventaParaAbonar.productos,
            metodo_pago: metodoPago,
            pagado: estaPagado,
            abonos: [{
              monto,
              fecha: new Date().toISOString(),
              metodo: metodoPago
            }]
          });
          await loadPendingVentas();
          Alert.alert("⚠️ Sin conexión", "Venta guardada en el dispositivo. Sincroniza cuando tengas internet.");

          setCliente("");
          setCarrito([]);
          setMetodoPago("Efectivo");
          setModalAbonoVisible(false);
          setVentaParaAbonar(null);
          setMontoAbono("");
          setIsAbonoInicial(false);
        } catch (storageError) {
          Alert.alert("Error crítico", "No se pudo guardar la venta ni online ni offline.");
        }
      } else {
        Alert.alert("Error", "No se pudo registrar el abono");
      }
    }
  };

  const editarVenta = (venta) => {
    setVentaParaEditar(venta);
    setEditModalVisible(true);
  };

  const handleVentaUpdated = (updatedVenta) => {
    // Actualizar la lista de ventas con la venta modificada
    setVentas((prev) =>
      prev.map((v) => (v.id === updatedVenta.id ? mapRowToVenta(updatedVenta) : v))
    );
  };

  // Memoizar el header para evitar re-renders que cierren el teclado
  const headerComponent = useMemo(() => (
    <>
      {/* LOGO */}
      <View style={styles.logoWrap}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
      </View>

      <Text style={styles.header}>📒 Registro de Ventas</Text>

      {/* Botón de Sincronización Offline */}
      {pendingVentas.length > 0 && (
        <TouchableOpacity style={styles.syncBtn} onPress={syncVentas}>
          <Text style={styles.syncBtnText}>
            ☁️ Sincronizar {pendingVentas.length} ventas pendientes
          </Text>
        </TouchableOpacity>
      )}

      {/* FORMULARIO */}
      <View style={styles.card}>
        <TextInput
          placeholder="Nombre del cliente"
          placeholderTextColor="#9ca3af"
          value={cliente}
          onChangeText={setCliente}
          style={styles.input}
        />

        <TextInput
          placeholder="Producto"
          placeholderTextColor="#9ca3af"
          value={producto}
          onChangeText={setProducto}
          style={styles.input}
        />

        <View style={styles.row}>
          <TextInput
            placeholder="Cantidad"
            placeholderTextColor="#9ca3af"
            value={cantidad}
            onChangeText={setCantidad}
            keyboardType="numeric"
            style={[styles.input, styles.inputHalf]}
          />
          <TextInput
            placeholder="Precio x unidad"
            placeholderTextColor="#9ca3af"
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
                  {p.producto} · {p.cantidad} x {formatMoney(p.precio)} = {formatMoney(p.cantidad * p.precio)}
                </Text>
                <TouchableOpacity
                  style={styles.cartRemove}
                  onPress={() => eliminarProductoDelCarrito(p.id)}
                >
                  <Text style={{ color: "#fff" }}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'right', color: '#065f46' }}>
                Total Carrito: {formatMoney(carrito.reduce((sum, p) => sum + (p.cantidad * p.precio), 0))}
              </Text>
            </View>
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
          onPress={() => router.push("/cli")}
        >
          <Text style={styles.btnText}>👥 Ver clientes registrados</Text>
        </TouchableOpacity>

        {/* Botones de navegación adicionales */}
        <View style={styles.navButtonsGrid}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.push("/pendientes")}
          >
            <Text style={styles.navButtonText}>📋 Pendientes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.push("/estadisticas")}
          >
            <Text style={styles.navButtonText}>📊 Estadísticas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.push("/exportar")}
          >
            <Text style={styles.navButtonText}>📥 Exportar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.push("/backup")}
          >
            <Text style={styles.navButtonText}>💾 Backup</Text>
          </TouchableOpacity>
        </View>


        {/* Botones de finalización de venta */}
        <Text style={styles.finalizarTitle}>Finalizar Venta:</Text>

        <View style={styles.finalizarButtons}>
          <TouchableOpacity
            style={[styles.btnPendiente, carrito.length === 0 && { opacity: 0.6 }]}
            onPress={guardarPendiente}
            disabled={carrito.length === 0}
          >
            <Text style={styles.btnText}>⏳ Guardar Pendiente</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnAbonar, carrito.length === 0 && { opacity: 0.6 }]}
            onPress={abonarAlCrear}
            disabled={carrito.length === 0}
          >
            <Text style={styles.btnText}>💵 Abonar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnGreen, carrito.length === 0 && { opacity: 0.6 }]}
            onPress={pagarCompleto}
            disabled={carrito.length === 0}
          >
            <Text style={styles.btnText}>✔️ Pagar Completo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* RESUMEN */}
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>📊 Resumen de hoy</Text>
        <Text style={styles.summaryText}>Ventas: {numeroVentasDelDia}</Text>
        <Text style={styles.summaryText}>Total: {formatMoney(totalDelDia)}</Text>
      </View>

      {/* HISTORIAL */}
      <Text style={styles.sectionTitle}>🕘 Historial de ventas</Text>
    </>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [cliente, producto, cantidad, precio, carrito, metodoPago, numeroVentasDelDia, totalDelDia]);

  if (!isAuthenticated) {
    return <AuthScreen onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <FlatList
        data={ventas}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={headerComponent}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
        removeClippedSubviews={false}
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
                  • {p.producto} ({p.cantidad} x {formatMoney(p.precio)})
                </Text>
              ))}

              <View style={styles.rowBetween}>
                <View>
                  {Array.isArray(item.metodoPago) && item.metodoPago.length > 1 ? (
                    <>
                      <Text style={styles.salePayment}>💳 Pagos mixtos:</Text>
                      {item.metodoPago.map((pago, idx) => (
                        <Text key={idx} style={styles.salePaymentDetail}>
                          • {pago.metodo}: {formatMoney(pago.monto)}
                        </Text>
                      ))}
                    </>
                  ) : (
                    <Text style={styles.salePayment}>
                      💳 {Array.isArray(item.metodoPago) ? item.metodoPago[0]?.metodo : item.metodoPago}
                    </Text>
                  )}
                </View>
                <Text style={styles.saleTotal}>Total: {formatMoney(total)}</Text>
              </View>

              {/* Mostrar información de abonos si existen */}
              {(item.abonos && item.abonos.length > 0) && (() => {
                const totalAbonado = item.abonos.reduce((sum, a) => sum + Number(a.monto), 0);
                const pendiente = total - totalAbonado;
                return (
                  <View style={styles.abonosInfo}>
                    <Text style={styles.abonosTitle}>💰 Abonos:</Text>
                    {item.abonos.map((abono, idx) => (
                      <Text key={idx} style={styles.abonoItem}>
                        • {formatMoney(Number(abono.monto))} - {new Date(abono.fecha).toLocaleDateString()}
                      </Text>
                    ))}
                    <View style={styles.abonosSummary}>
                      <Text style={styles.abonosAbonado}>Abonado: {formatMoney(totalAbonado)}</Text>
                      {pendiente > 0.01 && !item.pagado && (
                        <Text style={styles.abonosPendiente}>Pendiente: {formatMoney(pendiente)}</Text>
                      )}
                    </View>
                  </View>
                );
              })()}

              {/* Botones de acción */}
              <View style={styles.actionButtons}>
                {/* Primera fila: Estado de pago / Abonar */}
                <View style={styles.row}>
                  {(() => {
                    const totalAbonado = (item.abonos || []).reduce((sum, a) => sum + Number(a.monto), 0);
                    const estaPagado = item.pagado || totalAbonado >= total - 0.01;
                    const tieneAbono = totalAbonado > 0 && !estaPagado;

                    if (estaPagado) {
                      return (
                        <View style={styles.paidBadge}>
                          <Text style={styles.paidText}>✅ Pagado</Text>
                        </View>
                      );
                    } else if (tieneAbono) {
                      return (
                        <>
                          <TouchableOpacity
                            style={styles.abonarBtn}
                            onPress={() => abonarVenta(item)}
                          >
                            <Text style={styles.abonarBtnText}>💵 Abonar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.payBtn}
                            onPress={() => marcarPagado(item.id)}
                          >
                            <Text style={styles.payBtnText}>✔️ Pagar Total</Text>
                          </TouchableOpacity>
                        </>
                      );
                    } else {
                      return (
                        <>
                          <TouchableOpacity
                            style={styles.abonarBtn}
                            onPress={() => abonarVenta(item)}
                          >
                            <Text style={styles.abonarBtnText}>💵 Abonar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.payBtn}
                            onPress={() => marcarPagado(item.id)}
                          >
                            <Text style={styles.payBtnText}>✔️ Pagar Total</Text>
                          </TouchableOpacity>
                        </>
                      );
                    }
                  })()}
                </View>

                {/* Segunda fila: Editar y Eliminar */}
                <View style={styles.row}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => editarVenta(item)}
                  >
                    <Text style={styles.editText}>✏️ Editar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.editBtn, { backgroundColor: '#607d8b', marginLeft: 8 }]}
                    onPress={() => {
                      setSelectedVentaForTicket(item);
                      setTicketModalVisible(true);
                    }}
                  >
                    <Text style={styles.editText}>📄 Boleta</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => eliminarVenta(item.id)}
                  >
                    <Text style={styles.deleteText}>🗑️ Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Modal para abonar */}
      <Modal
        visible={modalAbonoVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setModalAbonoVisible(false);
          setVentaParaAbonar(null);
          setMontoAbono("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💵 Agregar Abono</Text>

            {ventaParaAbonar && (() => {
              const total = ventaParaAbonar.productos.reduce((sum, p) => sum + p.cantidad * p.precio, 0);
              const totalAbonado = (ventaParaAbonar.abonos || []).reduce((sum, a) => sum + Number(a.monto), 0);
              const pendiente = total - totalAbonado;

              return (
                <>
                  <View style={styles.modalInfo}>
                    <Text style={styles.modalInfoText}>Total: {formatMoney(total)}</Text>
                    <Text style={styles.modalInfoText}>Abonado: {formatMoney(totalAbonado)}</Text>
                    <Text style={[styles.modalInfoText, { color: '#dc2626', fontWeight: '800' }]}>
                      Pendiente: {formatMoney(pendiente)}
                    </Text>
                  </View>

                  <Text style={styles.modalLabel}>¿Cuánto desea abonar?</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={montoAbono}
                    onChangeText={(text) => setMontoAbono(formatInputCurrency(text))}
                    keyboardType="numeric"
                    placeholder="Ingresa el monto"
                    placeholderTextColor="#9ca3af"
                    autoFocus={true}
                  />

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={styles.modalBtnCancel}
                      onPress={() => {
                        setModalAbonoVisible(false);
                        setVentaParaAbonar(null);
                        setMontoAbono("");
                      }}
                    >
                      <Text style={styles.modalBtnCancelText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalBtnConfirm}
                      onPress={confirmarAbono}
                    >
                      <Text style={styles.modalBtnConfirmText}>Abonar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      <TicketModal
        visible={ticketModalVisible}
        onClose={() => setTicketModalVisible(false)}
        venta={selectedVentaForTicket}
      />

      <EditVentaModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        venta={ventaParaEditar}
        onVentaUpdated={handleVentaUpdated}
      />
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
    fontSize: 18,
    minHeight: 50,
    color: "#000", // Negro puro
    fontWeight: "600",
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

  // Sección de finalizar venta
  finalizarTitle: {
    fontWeight: "700",
    color: "#065f46",
    marginTop: 16,
    marginBottom: 8,
    fontSize: 16,
  },
  finalizarButtons: {
    gap: 8,
  },
  btnPendiente: {
    backgroundColor: "#f59e0b",
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
  btnAbonar: {
    backgroundColor: "#8b5cf6",
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

  // Navigation buttons grid
  navButtonsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  navButton: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: "#8b5cf6",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    minHeight: 50,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

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

  // Botón de abonar
  abonarBtn: {
    backgroundColor: "#f59e0b",
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
  abonarBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  // Botón de editar
  editBtn: {
    backgroundColor: "#3b82f6",
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
  editText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  // Contenedor de botones de acción
  actionButtons: {
    marginTop: 12,
    gap: 8,
  },

  // Información de abonos
  abonosInfo: {
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  abonosTitle: {
    fontWeight: "800",
    color: "#92400e",
    marginBottom: 8,
    fontSize: 14,
  },
  abonoItem: {
    color: "#78350f",
    fontSize: 13,
    marginBottom: 4,
    marginLeft: 8,
  },
  abonosSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#fde68a",
  },
  abonosAbonado: {
    color: "#16a34a",
    fontWeight: "700",
    fontSize: 14,
  },
  abonosPendiente: {
    color: "#dc2626",
    fontWeight: "700",
    fontSize: 14,
  },

  // Estilos para pagos mixtos
  pagoMixtoHeader: {
    marginTop: 12,
  },
  pagoHelper: {
    fontSize: 12,
    color: "#64748b",
    fontStyle: "italic",
    marginTop: 2,
  },
  pagosContainer: {
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  pagosTitle: {
    fontWeight: "700",
    color: "#92400e",
    marginBottom: 8,
  },
  pagoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  pagoText: {
    color: "#374151",
    fontWeight: "600",
  },
  pagoRemove: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pagoTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#fde68a",
  },
  pagoTotalLabel: {
    fontWeight: "600",
    color: "#92400e",
  },
  pagoTotalValue: {
    fontWeight: "800",
    color: "#16a34a",
    fontSize: 16,
  },
  pagoRestante: {
    marginTop: 6,
    fontWeight: "700",
    color: "#dc2626",
    textAlign: "center",
  },
  salePaymentDetail: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 8,
    marginTop: 2,
  },


  empty: { textAlign: "center", marginTop: 20, color: "#64748b" },

  // Estilos del modal de abono
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#065f46",
    marginBottom: 16,
    textAlign: "center",
  },
  modalInfo: {
    backgroundColor: "#ecfdf5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  modalInfoText: {
    fontSize: 16,
    color: "#065f46",
    fontWeight: "600",
    marginBottom: 4,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#065f46",
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 2,
    borderColor: "#22c55e",
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    backgroundColor: "#fff",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtnCancel: {
    flex: 1,
    backgroundColor: "#e5e7eb",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBtnCancelText: {
    color: "#111",
    fontWeight: "700",
    fontSize: 16,
  },
  modalBtnConfirm: {
    flex: 1,
    backgroundColor: "#16a34a",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBtnConfirmText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  syncBtn: {
    backgroundColor: "#f59e0b",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  syncBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
