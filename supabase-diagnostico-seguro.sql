-- Script de diagnóstico SEGURO que funciona con cualquier estructura
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- 1. VER ESTRUCTURA DE LA TABLA
-- ============================================

SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'ventas'
ORDER BY ordinal_position;

-- ============================================
-- 2. BUSCAR DATOS ERRÓNEOS (SIN USAR identificacion)
-- ============================================

-- Buscar el texto extraño en cualquier columna de texto
SELECT *
FROM public.ventas
WHERE 
  cliente::text LIKE '%Adultos mayores%' OR
  metodo_pago::text LIKE '%Adultos mayores%' OR
  productos::text LIKE '%Adultos mayores%' OR
  abonos::text LIKE '%Adultos mayores%'
LIMIT 10;

-- ============================================
-- 3. VER TODOS LOS REGISTROS (PRIMEROS 10)
-- ============================================

SELECT *
FROM public.ventas
ORDER BY fecha DESC NULLS LAST
LIMIT 10;

-- ============================================
-- 4. CONTAR REGISTROS TOTALES
-- ============================================

SELECT COUNT(*) as total_ventas FROM public.ventas;

-- ============================================
-- 5. VER VALORES ÚNICOS EN CADA COLUMNA
-- ============================================

-- Valores únicos en cliente
SELECT DISTINCT cliente 
FROM public.ventas 
ORDER BY cliente 
LIMIT 20;

-- Valores únicos en metodo_pago
SELECT DISTINCT metodo_pago 
FROM public.ventas 
ORDER BY metodo_pago 
LIMIT 20;














