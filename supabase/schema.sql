-- Schema para el Sistema de Check-in / Check-out Hotelero
-- Ejecutar este script en el SQL Editor de Supabase

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla principal de asistentes
CREATE TABLE IF NOT EXISTS public.asistentes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  cedula TEXT UNIQUE,
  documento_pendiente BOOLEAN DEFAULT FALSE,
  estaca_distrito_mision TEXT NOT NULL,
  fecha_nacimiento DATE,
  sexo TEXT CHECK (sexo IN ('M', 'F', 'Otro')),
  celular TEXT,
  correo TEXT,

  -- Alojamiento
  tipo_alojamiento TEXT CHECK (tipo_alojamiento IN ('Cabaña', 'Apartasuite', 'Torres del Sol', 'Habitaciones Multifamiliares')),
  numero_habitacion TEXT,
  cama_asignada TEXT,

  -- QR y estados
  qr_token TEXT UNIQUE,
  estado_checkin BOOLEAN DEFAULT FALSE,
  checkin_at TIMESTAMPTZ,
  estado_checkout BOOLEAN DEFAULT FALSE,
  checkout_at TIMESTAMPTZ,
  cancelado BOOLEAN DEFAULT FALSE,

  -- Ficha médica
  grupo_sanguineo TEXT,
  eps_seguro TEXT,
  enfermedad_cronica TEXT,
  tratamiento_medico TEXT,
  alergias TEXT,

  -- Contacto de emergencia
  contacto_emergencia_nombre TEXT,
  contacto_emergencia_telefono TEXT,

  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_asistentes_cedula ON public.asistentes(cedula);
CREATE INDEX IF NOT EXISTS idx_asistentes_qr_token ON public.asistentes(qr_token);
CREATE INDEX IF NOT EXISTS idx_asistentes_estaca ON public.asistentes(estaca_distrito_mision);
CREATE INDEX IF NOT EXISTS idx_asistentes_checkin ON public.asistentes(estado_checkin);
CREATE INDEX IF NOT EXISTS idx_asistentes_checkout ON public.asistentes(estado_checkout);
CREATE INDEX IF NOT EXISTS idx_asistentes_documento_pendiente ON public.asistentes(documento_pendiente);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_asistentes_updated_at ON public.asistentes;
CREATE TRIGGER update_asistentes_updated_at
  BEFORE UPDATE ON public.asistentes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar Realtime para la tabla asistentes
ALTER TABLE public.asistentes REPLICA IDENTITY FULL;
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.asistentes;

-- Políticas RLS: permitir todo el acceso anónimo por simplicidad inicial.
-- NOTA: En producción se recomienda habilitar autenticación y restringir.
ALTER TABLE public.asistentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous select" ON public.asistentes
  FOR SELECT USING (TRUE);

CREATE POLICY "Allow anonymous insert" ON public.asistentes
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Allow anonymous update" ON public.asistentes
  FOR UPDATE USING (TRUE);

CREATE POLICY "Allow anonymous delete" ON public.asistentes
  FOR DELETE USING (TRUE);
