-- Script para diagnosticar y corregir datos erróneos en la tabla ventas
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- 1. VERIFICAR ESTRUCTURA DE LA TABLA
-- ============================================

-- Ver todas las columnas de la tabla
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'ventas'
ORDER BY ordinal_position;

-- ============================================
-- 2. BUSCAR DATOS ERRÓNEOS
-- ============================================

-- Buscar registros con texto extraño en cualquier columna
SELECT 
  identificacion,
  cliente,
  productos,
  metodo_pago,
  fecha,
  pagado,
  abonos
FROM public.ventas
WHERE 
  cliente::text LIKE '%Adultos mayores%' OR
  metodo_pago::text LIKE '%Adultos mayores%' OR
  productos::text LIKE '%Adultos mayores%' OR
  abonos::text LIKE '%Adultos mayores%'
LIMIT 10;

-- ============================================
-- 3. VERIFICAR SI LA COLUMNA "pagado" EXISTE
-- ============================================

-- Si la columna se llama diferente, buscar columnas booleanas
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'ventas'
  AND data_type = 'boolean';

-- ============================================
-- 4. CORREGIR DATOS ERRÓNEOS (EJECUTAR CON CUIDADO)
-- ============================================

-- OPCIÓN A: Si el texto está en la columna "cliente"
-- UPDATE public.ventas
-- SET cliente = 'Cliente Desconocido'
-- WHERE cliente::text LIKE '%Adultos mayores%';

-- OPCIÓN B: Si el texto está en "metodo_pago"
-- UPDATE public.ventas
-- SET metodo_pago = 'Efectivo'
-- WHERE metodo_pago::text LIKE '%Adultos mayores%';

-- OPCIÓN C: Eliminar registros con datos erróneos (¡CUIDADO! Hace backup primero)
-- DELETE FROM public.ventas
-- WHERE cliente::text LIKE '%Adultos mayores%' 
--    OR metodo_pago::text LIKE '%Adultos mayores%';

-- ============================================
-- 5. VERIFICAR DATOS DESPUÉS DE LA CORRECCIÓN
-- ============================================

-- Contar registros totales
SELECT COUNT(*) as total_ventas FROM public.ventas;

-- Ver algunos registros normales
SELECT 
  identificacion,
  cliente,
  metodo_pago,
  fecha,
  pagado
FROM public.ventas
ORDER BY fecha DESC
LIMIT 5;














