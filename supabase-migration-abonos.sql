-- Migración: Agregar columna de abonos para pagos parciales
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columna abonos (array de objetos JSON)
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS abonos JSONB DEFAULT '[]'::jsonb;

-- 2. (Opcional) Si ya tenías ventas marcadas como 'pagado = true', 
-- podrías querer insertar un abono automático por el total, pero es complejo calcularlo aquí sin funciones.
-- Por ahora, iniciamos vacío.
