import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { formatMoney } from '../utils/formatters';
import logo from '../assets/images/logo.jpg';

export default function TicketView({ venta }) {
    if (!venta) return null;

    const total = venta.productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
    const totalAbonado = (venta.abonos || []).reduce((sum, a) => sum + Number(a.monto), 0);
    const pendiente = total - totalAbonado;
    const fecha = new Date(venta.fecha).toLocaleString('es-ES');

    return (
        <View style={styles.container}>
            {/* Marca de agua */}
            <View style={styles.watermarkContainer}>
                <Image source={logo} style={styles.watermark} resizeMode="contain" />
            </View>

            <View style={styles.header}>
                <View style={styles.doubleLine} />
                <Text style={styles.info}>Cliente: {venta.cliente}</Text>

                <View style={styles.titleBox}>
                    <Text style={styles.titleText}>RECIBO DE VENTA</Text>
                </View>

                <Text style={styles.date}>Fecha: {fecha}</Text>
            </View>

            <View style={styles.productos}>
                {venta.productos.map((p, index) => (
                    <View key={index} style={styles.producto}>
                        <Text style={styles.productoText}>{p.cantidad} x {p.producto}</Text>
                        <Text style={styles.productoText}>{formatMoney(p.cantidad * p.precio)}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.line} />

            <View style={styles.totalSection}>
                <View style={styles.row}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalValue}>{formatMoney(total)}</Text>
                </View>

                {totalAbonado > 0 && (
                    <View style={styles.row}>
                        <Text style={styles.subLabel}>Abonado:</Text>
                        <Text style={styles.subValue}>{formatMoney(totalAbonado)}</Text>
                    </View>
                )}

                {pendiente > 0.01 && (
                    <View style={styles.row}>
                        <Text style={[styles.subLabel, styles.red]}>Pendiente:</Text>
                        <Text style={[styles.subValue, styles.red]}>{formatMoney(pendiente)}</Text>
                    </View>
                )}

                <View style={[styles.row, { marginTop: 8 }]}>
                    <Text style={styles.methodLabel}>Método de pago:</Text>
                    <Text style={styles.methodValue}>
                        {Array.isArray(venta.metodoPago)
                            ? venta.metodoPago.map(p => p.metodo).join(', ')
                            : venta.metodoPago || 'Efectivo'}
                    </Text>
                </View>
            </View>

            {venta.pagado && (
                <View style={styles.pagadoBadge}>
                    <Text style={styles.pagadoText}>✅ PAGADO</Text>
                </View>
            )}

            <View style={styles.doubleLine} />

            <View style={styles.footer}>
                <Text style={styles.footerText}>Gracias por su compra</Text>
                <Text style={styles.idText}>ID: {venta.id?.substring(0, 8)}...</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        padding: 20,
        width: 320, // Ancho fijo para consistencia en la imagen
        position: 'relative',
        overflow: 'hidden',
    },
    watermarkContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: -1,
        opacity: 0.08, // Muy sutil
    },
    watermark: {
        width: '80%',
        height: '80%',
    },
    header: {
        alignItems: 'center',
        marginBottom: 10,
    },
    doubleLine: {
        borderBottomWidth: 2,
        borderBottomColor: '#000',
        borderStyle: 'dashed',
        width: '100%',
        marginVertical: 10,
    },
    info: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
        alignSelf: 'flex-start',
    },
    titleBox: {
        backgroundColor: '#e0e0e0',
        paddingVertical: 5,
        paddingHorizontal: 20,
        marginVertical: 5,
        width: '100%',
        alignItems: 'center',
    },
    titleText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    date: {
        fontSize: 12,
        color: '#333',
    },
    productos: {
        marginVertical: 10,
    },
    producto: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    productoText: {
        fontSize: 14,
        fontFamily: 'monospace', // Simular fuente de ticket
    },
    line: {
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        borderStyle: 'dashed',
        marginVertical: 8,
    },
    totalSection: {
        marginTop: 5,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    totalValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    subLabel: {
        fontSize: 14,
    },
    subValue: {
        fontSize: 14,
    },
    red: {
        color: '#d32f2f',
    },
    methodLabel: {
        fontSize: 12,
        color: '#333',
    },
    methodValue: {
        fontSize: 12,
        color: '#333',
        fontWeight: 'bold',
    },
    pagadoBadge: {
        alignSelf: 'center',
        marginTop: 15,
        paddingVertical: 5,
        paddingHorizontal: 15,
        backgroundColor: '#4caf50',
        borderRadius: 4,
    },
    pagadoText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    footer: {
        alignItems: 'center',
        marginTop: 10,
    },
    footerText: {
        fontSize: 12,
        marginBottom: 4,
    },
    idText: {
        fontSize: 10,
        color: '#666',
    },
});
