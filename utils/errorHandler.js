import { Alert } from 'react-native';

/**
 * Manejador centralizado de errores
 * Proporciona funciones para manejar y mostrar errores de forma consistente
 */
export const ErrorHandler = {
  /**
   * Procesa un error y retorna un mensaje amigable
   * @param {Error|Object} error - El error a procesar
   * @param {string} context - Contexto donde ocurrió el error (opcional)
   * @returns {string} - Mensaje de error amigable
   */
  handle(error, context = '') {
    console.error(`[${context || 'Error'}]`, error);

    // Extraer mensaje del error
    let message = 'Error desconocido';
    
    if (typeof error === 'string') {
      message = error;
    } else if (error?.message) {
      message = error.message;
    } else if (error?.error?.message) {
      message = error.error.message;
    } else if (error?.details) {
      message = error.details;
    }

    // Mapear errores comunes de Supabase a mensajes amigables
    const errorMappings = {
      // Errores de RLS (Row Level Security)
      'new row violates row-level security policy': 
        'No tienes permisos para realizar esta operación. Verifica tu autenticación.',
      
      'permission denied for table': 
        'No tienes permisos para acceder a esta tabla.',
      
      // Errores de red
      'Network request failed': 
        'Error de conexión. Verifica tu conexión a internet.',
      
      'Failed to fetch': 
        'No se pudo conectar con el servidor. Verifica tu conexión.',
      
      // Errores de validación
      'violates check constraint': 
        'Los datos ingresados no son válidos. Verifica los campos.',
      
      'violates foreign key constraint': 
        'Referencia inválida. El registro relacionado no existe.',
      
      'duplicate key value violates unique constraint': 
        'Ya existe un registro con estos datos.',
      
      // Errores de JSON
      'invalid input syntax for type json': 
        'Error en el formato de datos. Intenta nuevamente.',
      
      // Errores de timeout
      'timeout': 
        'La operación tardó demasiado. Intenta nuevamente.',
      
      'Request timeout': 
        'El servidor no respondió a tiempo. Intenta nuevamente.',
    };

    // Buscar mapeo específico
    const lowerMessage = message.toLowerCase();
    for (const [key, friendlyMessage] of Object.entries(errorMappings)) {
      if (lowerMessage.includes(key.toLowerCase())) {
        return friendlyMessage;
      }
    }

    // Si no hay mapeo, retornar el mensaje original (limitado a 200 caracteres)
    return message.length > 200 ? message.substring(0, 200) + '...' : message;
  },

  /**
   * Muestra un Alert con el error procesado
   * @param {Error|Object} error - El error a mostrar
   * @param {string} context - Contexto donde ocurrió el error (opcional)
   * @param {string} title - Título del alert (por defecto "Error")
   */
  showAlert(error, context = '', title = 'Error') {
    const message = this.handle(error, context);
    Alert.alert(title, message);
  },

  /**
   * Muestra un Alert de confirmación antes de una acción destructiva
   * @param {string} message - Mensaje a mostrar
   * @param {Function} onConfirm - Callback cuando se confirma
   * @param {Function} onCancel - Callback cuando se cancela (opcional)
   */
  showConfirm(message, onConfirm, onCancel) {
    Alert.alert(
      'Confirmar',
      message,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: onConfirm,
        },
      ],
      { cancelable: true }
    );
  },

  /**
   * Muestra un Alert de éxito
   * @param {string} message - Mensaje a mostrar
   * @param {string} title - Título del alert (por defecto "Éxito")
   */
  showSuccess(message, title = 'Éxito') {
    Alert.alert(title, message);
  },

  /**
   * Loggea el error sin mostrar alert (útil para errores no críticos)
   * @param {Error|Object} error - El error a loggear
   * @param {string} context - Contexto donde ocurrió el error
   */
  log(error, context = '') {
    console.error(`[${context || 'Error'}]`, error);
  },
};

/**
 * Wrapper para funciones async que maneja errores automáticamente
 * @param {Function} asyncFn - Función async a ejecutar
 * @param {Object} options - Opciones { context, showAlert, onError }
 * @returns {Promise} - Promise que resuelve con el resultado o rechaza con error manejado
 */
export const withErrorHandling = async (asyncFn, options = {}) => {
  const {
    context = '',
    showAlert = true,
    onError = null,
    alertTitle = 'Error',
  } = options;

  try {
    return await asyncFn();
  } catch (error) {
    const handledError = ErrorHandler.handle(error, context);
    
    if (showAlert) {
      ErrorHandler.showAlert(error, context, alertTitle);
    }
    
    if (onError) {
      onError(handledError, error);
    }
    
    throw new Error(handledError);
  }
};
















