-- Migración: agregar soporte para asistentes sin documento de identidad
-- Ejecutar este script si ya creaste la tabla con el schema original

ALTER TABLE public.asistentes
  ALTER COLUMN cedula DROP NOT NULL;

ALTER TABLE public.asistentes
  ADD COLUMN IF NOT EXISTS documento_pendiente BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_asistentes_documento_pendiente
  ON public.asistentes(documento_pendiente);
