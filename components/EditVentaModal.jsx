import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { formatMoney, formatInputCurrency, parseCurrency } from '../utils/formatters';
import { ventasService } from '../supabase';

export default function EditVentaModal({ visible, onClose, venta, onVentaUpdated }) {
    const [cliente, setCliente] = useState('');
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(false);

    // Estado para nuevo producto
    const [newProducto, setNewProducto] = useState('');
    const [newCantidad, setNewCantidad] = useState('');
    const [newPrecio, setNewPrecio] = useState('');

    useEffect(() => {
        if (venta) {
            setCliente(venta.cliente);
            setProductos(JSON.parse(JSON.stringify(venta.productos))); // Deep copy
        }
    }, [venta]);

    const handleUpdateProducto = (index, field, value) => {
        const updatedProductos = [...productos];
        updatedProductos[index] = { ...updatedProductos[index], [field]: value };
        setProductos(updatedProductos);
    };

    const handleDeleteProducto = (index) => {
        const updatedProductos = productos.filter((_, i) => i !== index);
        setProductos(updatedProductos);
    };

    const handleAddProducto = () => {
        if (!newProducto.trim() || !newCantidad || !newPrecio) {
            Alert.alert("Error", "Completa todos los campos del producto");
            return;
        }

        const cantidad = parseFloat(newCantidad);
        const precio = parseFloat(newPrecio);

        if (isNaN(cantidad) || isNaN(precio) || cantidad <= 0 || precio < 0) {
            Alert.alert("Error", "Cantidad y precio deben ser números válidos");
            return;
        }

        setProductos([...productos, {
            id: Math.random().toString(36).substr(2, 9),
            producto: newProducto.trim(),
            cantidad,
            precio
        }]);

        // Limpiar campos
        setNewProducto('');
        setNewCantidad('');
        setNewPrecio('');
    };

    const handleSave = async () => {
        if (!cliente.trim()) {
            Alert.alert("Error", "El nombre del cliente es obligatorio");
            return;
        }
        if (productos.length === 0) {
            Alert.alert("Error", "La venta debe tener al menos un producto");
            return;
        }

        try {
            setLoading(true);
            const updatedVenta = await ventasService.updateVenta(venta.id, {
                cliente: cliente.trim(),
                productos: productos
            });

            Alert.alert("✅ Éxito", "Venta actualizada correctamente");
            onVentaUpdated(updatedVenta);
            onClose();
        } catch (error) {
            Alert.alert("Error", "No se pudo actualizar la venta");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const total = productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.modalOverlay}
            >
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>✏️ Editar Venta</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContent}>
                        {/* Cliente */}
                        <Text style={styles.label}>Cliente:</Text>
                        <TextInput
                            style={styles.input}
                            value={cliente}
                            onChangeText={setCliente}
                            placeholder="Nombre del cliente"
                        />

                        {/* Lista de Productos */}
                        <Text style={styles.label}>Productos:</Text>
                        {productos.map((p, index) => (
                            <View key={index} style={styles.productRow}>
                                <View style={styles.productInfo}>
                                    <TextInput
                                        style={[styles.inputSmall, { flex: 2 }]}
                                        value={p.producto}
                                        onChangeText={(text) => handleUpdateProducto(index, 'producto', text)}
                                    />
                                    <View style={styles.row}>
                                        <TextInput
                                            style={[styles.inputSmall, { width: 60 }]}
                                            value={String(p.cantidad)}
                                            onChangeText={(text) => handleUpdateProducto(index, 'cantidad', parseFloat(text) || 0)}
                                            keyboardType="numeric"
                                        />
                                        <Text style={{ marginHorizontal: 5 }}>x</Text>
                                        <TextInput
                                            style={[styles.inputSmall, { flex: 1 }]}
                                            value={String(p.precio)}
                                            onChangeText={(text) => handleUpdateProducto(index, 'precio', parseFloat(text) || 0)}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <Text style={styles.productTotal}>{formatMoney(p.cantidad * p.precio)}</Text>
                                </View>
                                <TouchableOpacity onPress={() => handleDeleteProducto(index)} style={styles.deleteBtn}>
                                    <Text style={styles.deleteText}>🗑️</Text>
                                </TouchableOpacity>
                            </View>
                        ))}

                        {/* Agregar Producto */}
                        <View style={styles.addProductContainer}>
                            <Text style={styles.subLabel}>Agregar Producto:</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Nombre producto"
                                value={newProducto}
                                onChangeText={setNewProducto}
                            />
                            <View style={styles.row}>
                                <TextInput
                                    style={[styles.input, { flex: 1, marginRight: 8 }]}
                                    placeholder="Cant."
                                    value={newCantidad}
                                    onChangeText={setNewCantidad}
                                    keyboardType="numeric"
                                />
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    placeholder="Precio"
                                    value={newPrecio}
                                    onChangeText={setNewPrecio}
                                    keyboardType="numeric"
                                />
                            </View>
                            <TouchableOpacity style={styles.addBtn} onPress={handleAddProducto}>
                                <Text style={styles.addBtnText}>➕ Agregar</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.totalContainer}>
                            <Text style={styles.totalLabel}>Nuevo Total:</Text>
                            <Text style={styles.totalValue}>{formatMoney(total)}</Text>
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.saveBtn, loading && styles.disabledBtn]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            <Text style={styles.saveBtnText}>{loading ? "Guardando..." : "Guardar Cambios"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        maxHeight: '90%',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#f8fafc',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    closeBtn: {
        padding: 5,
    },
    closeText: {
        fontSize: 20,
        color: '#64748b',
    },
    scrollContent: {
        padding: 16,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#334155',
    },
    subLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#475569',
    },
    input: {
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    inputSmall: {
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 6,
        padding: 6,
        fontSize: 14,
        backgroundColor: '#fff',
    },
    productRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        backgroundColor: '#f1f5f9',
        padding: 8,
        borderRadius: 8,
    },
    productInfo: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    productTotal: {
        fontWeight: 'bold',
        marginTop: 4,
        color: '#059669',
    },
    deleteBtn: {
        padding: 8,
        marginLeft: 8,
    },
    deleteText: {
        fontSize: 18,
    },
    addProductContainer: {
        marginTop: 16,
        padding: 12,
        backgroundColor: '#fff7ed',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#fed7aa',
    },
    addBtn: {
        backgroundColor: '#f59e0b',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    addBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    totalContainer: {
        marginTop: 20,
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    totalValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#16a34a',
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        backgroundColor: '#f8fafc',
    },
    cancelBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        backgroundColor: '#e2e8f0',
        marginRight: 8,
        alignItems: 'center',
    },
    cancelBtnText: {
        fontWeight: 'bold',
        color: '#475569',
    },
    saveBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        backgroundColor: '#16a34a',
        marginLeft: 8,
        alignItems: 'center',
    },
    saveBtnText: {
        fontWeight: 'bold',
        color: '#fff',
    },
    disabledBtn: {
        opacity: 0.7,
    },
});
