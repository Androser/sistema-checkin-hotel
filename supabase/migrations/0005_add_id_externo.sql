-- Agregar ID externo para sincronización con tabla origen
ALTER TABLE public.asistentes
ADD COLUMN IF NOT EXISTS id_externo TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_asistentes_id_externo ON public.asistentes(id_externo);
