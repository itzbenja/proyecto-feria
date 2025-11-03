# Feria App

Registro de ventas móvil construido con Expo + React Native y Supabase.

## Características

- Registro de ventas con carrito de productos
- Métodos de pago (Efectivo, Transferencia, Tarjeta)
- Listado de clientes y detalle de ventas
- Persistencia con Supabase (tabla `public.ventas`)
- Diseño optimizado para móvil y teclado (KeyboardAvoidingView)

## Requisitos

- Node.js LTS
- Git
- Una cuenta de GitHub (para publicar el repo)
- Proyecto de Supabase (URL + anon key)

## Configuración

1) Dependencias

```bash
npm install
```

2) Variables de entorno

Duplica `.env.example` como `.env` y completa los valores:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

> Nota: `.env` ya está ignorado por Git.

3) Ejecutar en desarrollo

```bash
npx expo start
```

Escanea el QR con Expo Go en tu teléfono.

## Estructura

- `app/_layout.jsx`: Layout y navegación con `expo-router`
- `app/index.jsx`: Pantalla principal (registro y listado)
- `app/cli.jsx`: Vista de clientes
- `app/detalles.jsx`: Detalle de venta
- `supabase.js`: Cliente y helpers para Supabase

## Supabase

Tabla `public.ventas` (campos sugeridos):

- `identificacion` uuid (PK, default uuid_generate_v4())
- `cliente` text
- `productos` jsonb
- `metodo_pago` text
- `fecha` timestamptz
- `pagado` boolean

Políticas RLS (modo abierto para prototipo):

```sql
CREATE POLICY "Enable all operations" ON public.ventas
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);
```

## Publicar

Este repo está listo para subirse a GitHub. Pasos rápidos:

```bash
git branch -M main
git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
git push -u origin main
```

---

Hecho con ❤️ con Expo + React Native.
