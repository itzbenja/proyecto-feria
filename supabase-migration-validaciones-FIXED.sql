-- Migración: Validaciones en Base de Datos (VERSIÓN CORREGIDA)
-- Ejecutar en Supabase SQL Editor
-- ⚠️ IMPORTANTE: Haz un backup antes de ejecutar

-- ============================================
-- 1. CONSTRAINTS DE VALIDACIÓN
-- ============================================

-- Eliminar constraints existentes si hay conflictos
ALTER TABLE public.ventas DROP CONSTRAINT IF EXISTS check_cliente_not_empty;
ALTER TABLE public.ventas DROP CONSTRAINT IF EXISTS check_productos_valid;
ALTER TABLE public.ventas DROP CONSTRAINT IF EXISTS check_metodo_pago_valid;
ALTER TABLE public.ventas DROP CONSTRAINT IF EXISTS check_fecha_not_future;

-- Validar que cliente no esté vacío
ALTER TABLE public.ventas 
ADD CONSTRAINT check_cliente_not_empty 
CHECK (cliente IS NOT NULL AND LENGTH(TRIM(cliente)) > 0);

-- Validar que productos sea un array válido
ALTER TABLE public.ventas 
ADD CONSTRAINT check_productos_valid 
CHECK (productos IS NOT NULL AND jsonb_typeof(productos) = 'array' AND jsonb_array_length(productos) > 0);

-- ============================================
-- 2. FUNCIÓN DE VALIDACIÓN DE PRODUCTOS
-- ============================================

CREATE OR REPLACE FUNCTION validate_productos()
RETURNS TRIGGER AS $$
DECLARE
  producto_item JSONB;
BEGIN
  -- Verificar que productos sea un array
  IF jsonb_typeof(NEW.productos) != 'array' THEN
    RAISE EXCEPTION 'productos debe ser un array';
  END IF;

  -- Verificar que el array no esté vacío
  IF jsonb_array_length(NEW.productos) = 0 THEN
    RAISE EXCEPTION 'productos no puede estar vacío';
  END IF;

  -- Validar cada producto
  FOR producto_item IN SELECT * FROM jsonb_array_elements(NEW.productos)
  LOOP
    -- Verificar que tenga producto (nombre)
    IF NOT (producto_item ? 'producto') OR 
       producto_item->>'producto' IS NULL OR 
       LENGTH(TRIM(producto_item->>'producto')) = 0 THEN
      RAISE EXCEPTION 'Cada producto debe tener un nombre válido';
    END IF;

    -- Verificar cantidad
    IF NOT (producto_item ? 'cantidad') OR 
       (producto_item->>'cantidad')::numeric <= 0 THEN
      RAISE EXCEPTION 'Cada producto debe tener una cantidad mayor a 0';
    END IF;

    -- Verificar precio
    IF NOT (producto_item ? 'precio') OR 
       (producto_item->>'precio')::numeric < 0 THEN
      RAISE EXCEPTION 'Cada producto debe tener un precio válido (>= 0)';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para validar productos antes de insertar/actualizar
DROP TRIGGER IF EXISTS trigger_validate_productos ON public.ventas;
CREATE TRIGGER trigger_validate_productos
BEFORE INSERT OR UPDATE ON public.ventas
FOR EACH ROW
EXECUTE FUNCTION validate_productos();

-- ============================================
-- 3. VALIDACIÓN DE ABONOS
-- ============================================

CREATE OR REPLACE FUNCTION validate_abonos()
RETURNS TRIGGER AS $$
DECLARE
  abono_item JSONB;
  total_venta NUMERIC;
  total_abonado NUMERIC := 0;
BEGIN
  -- Si abonos es null, inicializar como array vacío
  IF NEW.abonos IS NULL THEN
    NEW.abonos := '[]'::jsonb;
  END IF;

  -- Validar que abonos sea un array
  IF jsonb_typeof(NEW.abonos) != 'array' THEN
    RAISE EXCEPTION 'abonos debe ser un array';
  END IF;

  -- Calcular total de la venta
  SELECT COALESCE(
    SUM((p->>'cantidad')::numeric * (p->>'precio')::numeric),
    0
  ) INTO total_venta
  FROM jsonb_array_elements(NEW.productos) p;

  -- Validar cada abono y calcular total abonado
  FOR abono_item IN SELECT * FROM jsonb_array_elements(NEW.abonos)
  LOOP
    -- Verificar que tenga monto
    IF NOT (abono_item ? 'monto') OR 
       (abono_item->>'monto')::numeric <= 0 THEN
      RAISE EXCEPTION 'Cada abono debe tener un monto mayor a 0';
    END IF;

    -- Verificar que tenga fecha
    IF NOT (abono_item ? 'fecha') OR 
       abono_item->>'fecha' IS NULL THEN
      RAISE EXCEPTION 'Cada abono debe tener una fecha';
    END IF;

    -- Sumar al total abonado
    total_abonado := total_abonado + (abono_item->>'monto')::numeric;
  END LOOP;

  -- Validar que el total abonado no exceda el total de la venta
  IF total_abonado > total_venta + 0.01 THEN
    RAISE EXCEPTION 'El total abonado (%.2f) no puede exceder el total de la venta (%.2f)', 
      total_abonado, total_venta;
  END IF;

  -- Actualizar estado de pagado automáticamente
  IF total_abonado >= total_venta - 0.01 THEN
    NEW.pagado := true;
  ELSE
    NEW.pagado := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para validar abonos
DROP TRIGGER IF EXISTS trigger_validate_abonos ON public.ventas;
CREATE TRIGGER trigger_validate_abonos
BEFORE INSERT OR UPDATE ON public.ventas
FOR EACH ROW
EXECUTE FUNCTION validate_abonos();

-- ============================================
-- 4. VALIDACIÓN DE MÉTODO DE PAGO
-- ============================================

-- Validar que metodo_pago sea uno de los valores permitidos
ALTER TABLE public.ventas 
ADD CONSTRAINT check_metodo_pago_valid 
CHECK (
  metodo_pago IS NOT NULL AND
  (
    metodo_pago::text IN ('Efectivo', 'Transferencia', 'Tarjeta') OR
    (jsonb_typeof(metodo_pago::jsonb) = 'array' AND 
     jsonb_array_length(metodo_pago::jsonb) > 0)
  )
);

-- ============================================
-- 5. VALIDACIÓN DE FECHAS
-- ============================================

-- Validar que fecha no sea futura (con margen de 1 hora para diferencias de zona horaria)
ALTER TABLE public.ventas 
ADD CONSTRAINT check_fecha_not_future 
CHECK (fecha <= NOW() + INTERVAL '1 hour');

-- ============================================
-- 6. ÍNDICES ADICIONALES PARA PERFORMANCE
-- ============================================

-- Índice para búsquedas por cliente (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_ventas_cliente_lower 
ON public.ventas(LOWER(cliente));

-- Índice para búsquedas en productos (usando GIN para JSONB)
CREATE INDEX IF NOT EXISTS idx_ventas_productos_gin 
ON public.ventas USING GIN (productos);

-- Índice para búsquedas en abonos
CREATE INDEX IF NOT EXISTS idx_ventas_abonos_gin 
ON public.ventas USING GIN (abonos);

-- ============================================
-- 7. FUNCIÓN PARA CALCULAR TOTALES
-- ============================================

CREATE OR REPLACE FUNCTION calcular_total_venta(productos_json JSONB)
RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT SUM((p->>'cantidad')::numeric * (p->>'precio')::numeric)
      FROM jsonb_array_elements(productos_json) p
    ),
    0
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 8. VISTA PARA ESTADÍSTICAS (SIN identificacion)
-- ============================================

-- Crear vista usando solo las columnas que existen
CREATE OR REPLACE VIEW ventas_estadisticas AS
SELECT 
  COALESCE(
    (SELECT column_name FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = 'ventas' 
     AND column_name IN ('id', 'identificacion') LIMIT 1),
    'id'
  ) as id_column_name,
  cliente,
  fecha,
  pagado,
  calcular_total_venta(productos) as total_venta,
  COALESCE(
    (
      SELECT SUM((a->>'monto')::numeric)
      FROM jsonb_array_elements(abonos) a
    ),
    0
  ) as total_abonado,
  calcular_total_venta(productos) - COALESCE(
    (
      SELECT SUM((a->>'monto')::numeric)
      FROM jsonb_array_elements(abonos) a
    ),
    0
  ) as pendiente
FROM public.ventas;

-- Versión simplificada de la vista (sin usar identificacion)
DROP VIEW IF EXISTS ventas_estadisticas;

-- Crear vista simple que funcione con cualquier estructura
CREATE OR REPLACE VIEW ventas_estadisticas AS
SELECT 
  cliente,
  fecha,
  pagado,
  calcular_total_venta(productos) as total_venta,
  COALESCE(
    (
      SELECT SUM((a->>'monto')::numeric)
      FROM jsonb_array_elements(abonos) a
    ),
    0
  ) as total_abonado,
  calcular_total_venta(productos) - COALESCE(
    (
      SELECT SUM((a->>'monto')::numeric)
      FROM jsonb_array_elements(abonos) a
    ),
    0
  ) as pendiente
FROM public.ventas;

-- ============================================
-- 9. COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON FUNCTION validate_productos() IS 
'Valida que los productos en una venta tengan todos los campos requeridos';

COMMENT ON FUNCTION validate_abonos() IS 
'Valida que los abonos sean correctos y actualiza automáticamente el estado de pagado';

COMMENT ON FUNCTION calcular_total_venta(JSONB) IS 
'Calcula el total de una venta basado en sus productos';

COMMENT ON VIEW ventas_estadisticas IS 
'Vista que incluye totales calculados para cada venta';

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que los triggers estén creados
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'ventas'
ORDER BY trigger_name;

-- Verificar constraints
SELECT 
  constraint_name, 
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'ventas'
ORDER BY constraint_name;

-- Verificar estructura de la tabla
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'ventas'
ORDER BY ordinal_position;














