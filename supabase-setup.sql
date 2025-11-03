-- Script SQL para configurar la tabla ventas en Supabase
-- Ejecutar en SQL Editor de Supabase

-- 1. Verificar/crear la tabla ventas si no existe
CREATE TABLE IF NOT EXISTS public.ventas (
  identificacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente TEXT NOT NULL,
  productos JSONB NOT NULL DEFAULT '[]'::jsonb,
  metodo_pago TEXT NOT NULL DEFAULT 'Efectivo',
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pagado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;

-- 3. ELIMINAR políticas antiguas si existen (para evitar duplicados)
DROP POLICY IF EXISTS "anon can select ventas" ON public.ventas;
DROP POLICY IF EXISTS "anon can insert ventas" ON public.ventas;
DROP POLICY IF EXISTS "anon can update ventas" ON public.ventas;
DROP POLICY IF EXISTS "anon can delete ventas" ON public.ventas;
DROP POLICY IF EXISTS "Enable all operations" ON public.ventas;

-- 4. CREAR políticas nuevas para permitir todas las operaciones al rol anon
-- (esto es para desarrollo/prototipo - ajustar cuando agregues autenticación)

CREATE POLICY "anon can select ventas"
ON public.ventas
AS PERMISSIVE FOR SELECT
TO anon
USING (true);

CREATE POLICY "anon can insert ventas"
ON public.ventas
AS PERMISSIVE FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "anon can update ventas"
ON public.ventas
AS PERMISSIVE FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "anon can delete ventas"
ON public.ventas
AS PERMISSIVE FOR DELETE
TO anon
USING (true);

-- 5. Verificar la estructura de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'ventas'
ORDER BY ordinal_position;

-- 6. Verificar las políticas activas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'ventas';
