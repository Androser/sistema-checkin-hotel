-- Agregar campo cancelado a asistentes
ALTER TABLE public.asistentes
ADD COLUMN IF NOT EXISTS cancelado BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_asistentes_cancelado ON public.asistentes(cancelado);
