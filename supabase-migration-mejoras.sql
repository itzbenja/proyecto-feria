-- Migración: Mejoras críticas a la base de datos
-- Ejecutar en Supabase SQL Editor DESPUÉS de las migraciones anteriores
-- ⚠️ IMPORTANTE: Haz un backup antes de ejecutar

-- ============================================
-- 1. ARREGLAR INCONSISTENCIA ID/IDENTIFICACION
-- ============================================

-- Opción A: Si la tabla usa 'identificacion' como PK, agregar columna 'id' que apunte a ella
DO $$
BEGIN
  -- Verificar si existe columna 'id'
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ventas' 
    AND column_name = 'id'
  ) THEN
    -- Agregar columna id
    ALTER TABLE public.ventas ADD COLUMN id UUID;
    
    -- Copiar valores de identificacion a id
    UPDATE public.ventas SET id = identificacion WHERE id IS NULL;
    
    -- Hacer id NOT NULL y único
    ALTER TABLE public.ventas 
      ALTER COLUMN id SET NOT NULL,
      ADD CONSTRAINT unique_ventas_id UNIQUE (id);
    
    -- Crear índice
    CREATE INDEX IF NOT EXISTS idx_ventas_id ON public.ventas(id);
    
    RAISE NOTICE 'Columna id agregada y sincronizada con identificacion';
  ELSE
    RAISE NOTICE 'Columna id ya existe';
  END IF;
END $$;

-- ============================================
-- 2. AGREGAR ÍNDICES PARA MEJORAR PERFORMANCE
-- ============================================

-- Índice para búsquedas por cliente
CREATE INDEX IF NOT EXISTS idx_ventas_cliente 
ON public.ventas(cliente);

-- Índice para ordenar por fecha (ya se usa DESC en queries)
CREATE INDEX IF NOT EXISTS idx_ventas_fecha_desc 
ON public.ventas(fecha DESC);

-- Índice para filtrar por estado de pago
CREATE INDEX IF NOT EXISTS idx_ventas_pagado 
ON public.ventas(pagado) WHERE pagado = false;

-- Índice compuesto para búsquedas comunes (cliente + fecha)
CREATE INDEX IF NOT EXISTS idx_ventas_cliente_fecha 
ON public.ventas(cliente, fecha DESC);

-- Índice GIN para búsquedas en JSONB (productos y abonos)
CREATE INDEX IF NOT EXISTS idx_ventas_productos_gin 
ON public.ventas USING GIN (productos);

CREATE INDEX IF NOT EXISTS idx_ventas_abonos_gin 
ON public.ventas USING GIN (abonos);

-- ============================================
-- 3. AGREGAR CONSTRAINTS DE VALIDACIÓN
-- ============================================

-- Validar que cliente no esté vacío
ALTER TABLE public.ventas 
  DROP CONSTRAINT IF EXISTS check_cliente_not_empty;

ALTER TABLE public.ventas 
  ADD CONSTRAINT check_cliente_not_empty 
  CHECK (LENGTH(TRIM(cliente)) > 0);

-- Validar que productos sea un array no vacío
ALTER TABLE public.ventas 
  DROP CONSTRAINT IF EXISTS check_productos_not_empty;

ALTER TABLE public.ventas 
  ADD CONSTRAINT check_productos_not_empty 
  CHECK (
    jsonb_typeof(productos) = 'array' 
    AND jsonb_array_length(productos) > 0
  );

-- Validar que fecha no sea futura (con margen de 1 día para zonas horarias)
ALTER TABLE public.ventas 
  DROP CONSTRAINT IF EXISTS check_fecha_valid;

ALTER TABLE public.ventas 
  ADD CONSTRAINT check_fecha_valid 
  CHECK (fecha <= NOW() + INTERVAL '1 day');

-- ============================================
-- 4. FUNCIÓN PARA VALIDAR ESTRUCTURA DE PRODUCTOS
-- ============================================

CREATE OR REPLACE FUNCTION validate_productos(productos_json JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar que sea un array
  IF jsonb_typeof(productos_json) != 'array' THEN
    RETURN false;
  END IF;
  
  -- Verificar que tenga al menos un elemento
  IF jsonb_array_length(productos_json) = 0 THEN
    RETURN false;
  END IF;
  
  -- Validar cada producto
  RETURN NOT EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(productos_json) AS p
    WHERE 
      -- Debe tener campo 'producto' (nombre)
      (p->>'producto')::text IS NULL 
      OR LENGTH(TRIM((p->>'producto')::text)) = 0
      -- Cantidad debe ser > 0
      OR (p->>'cantidad')::numeric IS NULL
      OR (p->>'cantidad')::numeric <= 0
      -- Precio debe ser >= 0
      OR (p->>'precio')::numeric IS NULL
      OR (p->>'precio')::numeric < 0
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 5. TRIGGER PARA VALIDAR ANTES DE INSERTAR/ACTUALIZAR
-- ============================================

CREATE OR REPLACE FUNCTION check_venta_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar productos
  IF NOT validate_productos(NEW.productos) THEN
    RAISE EXCEPTION 'Productos inválidos: cada producto debe tener nombre (no vacío), cantidad > 0 y precio >= 0';
  END IF;
  
  -- Validar abonos si existen
  IF NEW.abonos IS NOT NULL AND jsonb_typeof(NEW.abonos) = 'array' THEN
    -- Verificar que cada abono tenga monto válido
    IF EXISTS (
      SELECT 1 
      FROM jsonb_array_elements(NEW.abonos) AS a
      WHERE 
        (a->>'monto')::numeric IS NULL
        OR (a->>'monto')::numeric <= 0
        OR (a->>'fecha')::text IS NULL
    ) THEN
      RAISE EXCEPTION 'Abonos inválidos: cada abono debe tener monto > 0 y fecha válida';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger si existe
DROP TRIGGER IF EXISTS validate_venta_before_insert ON public.ventas;

-- Crear trigger
CREATE TRIGGER validate_venta_before_insert
BEFORE INSERT OR UPDATE ON public.ventas
FOR EACH ROW 
EXECUTE FUNCTION check_venta_data();

-- ============================================
-- 6. FUNCIÓN PARA CALCULAR TOTAL DE VENTA
-- ============================================

CREATE OR REPLACE FUNCTION calcular_total_venta(productos_json JSONB)
RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT SUM((p->>'cantidad')::numeric * (p->>'precio')::numeric)
      FROM jsonb_array_elements(productos_json) AS p
    ),
    0
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 7. FUNCIÓN PARA CALCULAR TOTAL ABONADO
-- ============================================

CREATE OR REPLACE FUNCTION calcular_total_abonado(abonos_json JSONB)
RETURNS NUMERIC AS $$
BEGIN
  IF abonos_json IS NULL OR jsonb_typeof(abonos_json) != 'array' THEN
    RETURN 0;
  END IF;
  
  RETURN COALESCE(
    (
      SELECT SUM((a->>'monto')::numeric)
      FROM jsonb_array_elements(abonos_json) AS a
    ),
    0
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 8. VISTA PARA ESTADÍSTICAS (OPCIONAL)
-- ============================================

CREATE OR REPLACE VIEW ventas_con_totales AS
SELECT 
  v.*,
  calcular_total_venta(v.productos) AS total_venta,
  calcular_total_abonado(v.abonos) AS total_abonado,
  calcular_total_venta(v.productos) - calcular_total_abonado(v.abonos) AS restante
FROM public.ventas v;

-- ============================================
-- 9. VERIFICACIONES FINALES
-- ============================================

-- Verificar estructura de la tabla
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'ventas'
ORDER BY ordinal_position;

-- Verificar índices creados
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'ventas'
ORDER BY indexname;

-- Verificar constraints
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.ventas'::regclass
ORDER BY conname;

-- Verificar triggers
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'ventas'
ORDER BY trigger_name;

RAISE NOTICE '✅ Migración de mejoras completada exitosamente';
















