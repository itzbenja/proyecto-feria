import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { backupService } from '../utils/backup';
import { ErrorHandler } from '../utils/errorHandler';

export default function Backup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    const meta = await backupService.getBackupMetadata();
    setMetadata(meta);
  };

  const handleCrearBackup = async () => {
    setLoading(true);
    try {
      await backupService.createBackup();
      await loadMetadata();
      ErrorHandler.showSuccess('Backup creado correctamente');
    } catch (error) {
      ErrorHandler.showAlert(error.message, 'crearBackup');
    } finally {
      setLoading(false);
    }
  };

  const handleExportarBackup = async () => {
    setLoading(true);
    try {
      await backupService.exportBackupToFile();
      ErrorHandler.showSuccess('Backup exportado correctamente');
    } catch (error) {
      ErrorHandler.showAlert(error.message, 'exportarBackup');
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurarBackup = () => {
    Alert.alert(
      'Restaurar Backup',
      '¿Estás seguro de que quieres restaurar desde un archivo? Esto agregará las ventas del backup a las existentes.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: async () => {
            // Aquí se podría implementar un selector de archivos
            ErrorHandler.showAlert('Funcionalidad de restauración desde archivo pendiente de implementar', 'restaurarBackup');
          }
        }
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top }]}
      contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 80 }}
    >
      <Text style={styles.header}>💾 Respaldo de Datos</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Información del Respaldo</Text>
        {metadata ? (
          <View style={styles.metadata}>
            <Text style={styles.metadataText}>Último respaldo: {new Date(metadata.fecha).toLocaleString('es-ES')}</Text>
            <Text style={styles.metadataText}>Total de ventas: {metadata.totalVentas}</Text>
            <Text style={styles.metadataText}>Tamaño: {(metadata.tamaño / 1024).toFixed(2)} KB</Text>
          </View>
        ) : (
          <Text style={styles.noBackup}>No hay respaldo disponible</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Acciones</Text>

        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
          onPress={handleCrearBackup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>📦 Guardar Respaldo Local</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary, loading && styles.buttonDisabled]}
          onPress={handleExportarBackup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>📤 Exportar Respaldo a Archivo</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonWarning, loading && styles.buttonDisabled]}
          onPress={handleRestaurarBackup}
          disabled={loading}
        >
          <Text style={styles.buttonText}>📥 Restaurar desde Archivo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>ℹ️ ¿Qué es un Respaldo?</Text>
        <Text style={styles.warningText}>
          Un respaldo es una copia de seguridad de todas tus ventas.{'\n\n'}
          • Te permite guardar tus datos por si algo pasa{'\n'}
          • Puedes exportarlo a un archivo para guardarlo en otro lugar{'\n'}
          • Si pierdes datos, puedes restaurarlos desde un respaldo{'\n\n'}
          <Text style={{ fontWeight: '800' }}>Recomendación:</Text> Exporta un respaldo cada semana para mayor seguridad.
        </Text>
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>⬅ Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    // padding removed here, moved to contentContainerStyle
  },
  header: {
    fontSize: 22,
    fontWeight: '800',
    color: '#065f46',
    textAlign: 'center',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065f46',
    marginBottom: 12,
  },
  metadata: {
    marginTop: 8,
  },
  metadataText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
  },
  noBackup: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 50,
  },
  buttonPrimary: {
    backgroundColor: '#16a34a',
  },
  buttonSecondary: {
    backgroundColor: '#3b82f6',
  },
  buttonWarning: {
    backgroundColor: '#f59e0b',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: '#16a34a',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});

