import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_SALES_KEY = 'pending_sales';

export const offlineStorage = {
    // Guardar una venta pendiente
    async savePendingVenta(venta) {
        try {
            const pending = await this.getPendingVentas();
            // Agregar ID temporal si no tiene
            const ventaToSave = {
                ...venta,
                tempId: Date.now().toString(),
                timestamp: new Date().toISOString()
            };

            const newPending = [...pending, ventaToSave];
            await AsyncStorage.setItem(PENDING_SALES_KEY, JSON.stringify(newPending));
            return ventaToSave;
        } catch (error) {
            console.error('Error saving pending sale:', error);
            throw error;
        }
    },

    // Obtener todas las ventas pendientes
    async getPendingVentas() {
        try {
            const json = await AsyncStorage.getItem(PENDING_SALES_KEY);
            return json ? JSON.parse(json) : [];
        } catch (error) {
            console.error('Error getting pending sales:', error);
            return [];
        }
    },

    // Eliminar una venta pendiente (después de sincronizar)
    async removePendingVenta(tempId) {
        try {
            const pending = await this.getPendingVentas();
            const newPending = pending.filter(v => v.tempId !== tempId);
            await AsyncStorage.setItem(PENDING_SALES_KEY, JSON.stringify(newPending));
        } catch (error) {
            console.error('Error removing pending sale:', error);
            throw error;
        }
    },

    // Limpiar todas las pendientes
    async clearPendingVentas() {
        try {
            await AsyncStorage.removeItem(PENDING_SALES_KEY);
        } catch (error) {
            console.error('Error clearing pending sales:', error);
        }
    }
};
