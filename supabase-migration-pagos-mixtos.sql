-- Migración: Cambiar metodo_pago de TEXT a JSONB para soportar pagos mixtos
-- Ejecutar este SQL en Supabase SQL Editor

-- 1. Crear una nueva columna temporal tipo JSONB
ALTER TABLE public.ventas ADD COLUMN metodos_pago JSONB;

-- 2. Migrar datos existentes de metodo_pago a metodos_pago
-- Convertir el texto simple a un array con un solo objeto
UPDATE public.ventas 
SET metodos_pago = jsonb_build_array(
  jsonb_build_object(
    'metodo', metodo_pago,
    'monto', (
      SELECT SUM((p->>'cantidad')::numeric * (p->>'precio')::numeric)
      FROM jsonb_array_elements(productos) AS p
    )
  )
)
WHERE metodos_pago IS NULL;

-- 3. Eliminar la columna antigua
ALTER TABLE public.ventas DROP COLUMN metodo_pago;

-- 4. Renombrar la nueva columna
ALTER TABLE public.ventas RENAME COLUMN metodos_pago TO metodo_pago;

-- 5. Hacer que la columna sea obligatoria
ALTER TABLE public.ventas ALTER COLUMN metodo_pago SET NOT NULL;
ALTER TABLE public.ventas ALTER COLUMN metodo_pago SET DEFAULT '[]'::jsonb;

-- Verificar los datos migrados
SELECT id, cliente, metodo_pago, fecha FROM public.ventas ORDER BY fecha DESC LIMIT 5;
