import React, { useRef, useState } from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Alert, ScrollView } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import TicketView from './TicketView';

export default function TicketModal({ visible, onClose, venta, ventas }) {
    const viewShotRef = useRef();
    const [sharing, setSharing] = useState(false);

    const shareImage = async () => {
        try {
            setSharing(true);

            // Capturar la vista como imagen
            const uri = await captureRef(viewShotRef, {
                format: 'jpg',
                quality: 0.9,
                result: 'tmpfile'
            });

            // Compartir la imagen
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'image/jpeg',
                    dialogTitle: 'Compartir Boleta'
                });
            }
        } catch (error) {
            console.error("Error al compartir imagen:", error);
            Alert.alert("Error", "No se pudo generar la imagen de la boleta");
        } finally {
            setSharing(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Vista Previa</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.ticketWrapper}>
                            <ViewShot ref={viewShotRef} options={{ format: "jpg", quality: 0.9 }} style={{ backgroundColor: '#fff' }}>
                                {ventas && ventas.length > 0 ? (
                                    ventas.map((v, index) => (
                                        <View key={v.id}>
                                            <TicketView venta={v} />
                                            {index < ventas.length - 1 && (
                                                <View style={{ height: 2, backgroundColor: '#000', borderStyle: 'dashed', borderWidth: 1, borderColor: '#000', marginVertical: 10 }} />
                                            )}
                                        </View>
                                    ))
                                ) : (
                                    <TicketView venta={venta} />
                                )}
                            </ViewShot>
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.shareBtn, sharing && styles.disabledBtn]}
                            onPress={shareImage}
                            disabled={sharing}
                        >
                            {sharing ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.shareText}>📤 Compartir Imagen</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        width: '100%',
        maxHeight: '80%',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeBtn: {
        padding: 5,
    },
    closeText: {
        fontSize: 20,
        color: '#666',
    },
    scrollContent: {
        padding: 20,
        alignItems: 'center',
    },
    ticketWrapper: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    shareBtn: {
        backgroundColor: '#2196f3',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    disabledBtn: {
        opacity: 0.7,
    },
    shareText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
