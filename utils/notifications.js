import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Configurar notificaciones
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Servicio de notificaciones
 */
export const notificationService = {
  /**
   * Solicitar permisos
   */
  async requestPermissions() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },

  /**
   * Programar recordatorio de pago pendiente
   */
  async schedulePaymentReminder(venta, dias = 7) {
    try {
      const total = venta.productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
      const abonado = (venta.abonos || []).reduce((sum, a) => sum + Number(a.monto), 0);
      const pendiente = total - abonado;

      if (pendiente <= 0) return null;

      const fechaRecordatorio = new Date();
      fechaRecordatorio.setDate(fechaRecordatorio.getDate() + dias);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💰 Recordatorio de Pago Pendiente',
          body: `${venta.cliente} tiene un saldo pendiente de $${pendiente.toFixed(2)}`,
          data: { ventaId: venta.id, tipo: 'pago_pendiente' },
          sound: true,
        },
        trigger: fechaRecordatorio,
      });

      return notificationId;
    } catch (error) {
      console.error('Error al programar recordatorio:', error);
      return null;
    }
  },

  /**
   * Programar recordatorios para todos los pagos pendientes
   */
  async scheduleAllPaymentReminders(ventas, dias = 7) {
    const pendientes = ventas.filter(v => {
      const total = v.productos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
      const abonado = (v.abonos || []).reduce((sum, a) => sum + Number(a.monto), 0);
      return !v.pagado && abonado < total - 0.01;
    });

    const ids = [];
    for (const venta of pendientes) {
      const id = await this.schedulePaymentReminder(venta, dias);
      if (id) ids.push(id);
    }

    return ids;
  },

  /**
   * Enviar notificación inmediata
   */
  async sendNotification(titulo, mensaje, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: titulo,
          body: mensaje,
          data,
          sound: true,
        },
        trigger: null, // Inmediata
      });
    } catch (error) {
      console.error('Error al enviar notificación:', error);
    }
  },

  /**
   * Cancelar todas las notificaciones programadas
   */
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  /**
   * Obtener notificaciones programadas
   */
  async getScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
  },

  /**
   * Cancelar notificación específica
   */
  async cancelNotification(notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  /**
   * Configurar listener para notificaciones recibidas
   */
  addNotificationReceivedListener(listener) {
    return Notifications.addNotificationReceivedListener(listener);
  },

  /**
   * Configurar listener para cuando se toca una notificación
   */
  addNotificationResponseReceivedListener(listener) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }
};














