import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="cli" options={{ title: 'Clientes' }} />
        <Stack.Screen name="detalles" options={{ title: 'Detalles' }} />
        <Stack.Screen name="pendientes" options={{ title: 'Pedidos Pendientes' }} />
        <Stack.Screen name="estadisticas" options={{ title: 'Estadísticas' }} />
        <Stack.Screen name="exportar" options={{ title: 'Exportar' }} />
        <Stack.Screen name="backup" options={{ title: 'Backup' }} />
      </Stack>
    </>
  );
}