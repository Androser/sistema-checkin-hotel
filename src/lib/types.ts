import { Database } from "./supabase/database.types";

export type AsistenteRow = Database["public"]["Tables"]["asistentes"]["Row"];
export type AsistenteInsert = Database["public"]["Tables"]["asistentes"]["Insert"];
export type AsistenteUpdate = Database["public"]["Tables"]["asistentes"]["Update"];

export interface Asistente extends AsistenteRow {}

export const TIPOS_ALOJAMIENTO = [
  "Cabaña",
  "Apartasuite",
  "Torres del Sol",
  "Habitaciones Multifamiliares",
] as const;

export type TipoAlojamiento = (typeof TIPOS_ALOJAMIENTO)[number];

export const ESTADOS_CHECKIN = [
  "todos",
  "pendientes",
  "ingresados",
  "checkout",
] as const;

export type EstadoCheckinFilter = (typeof ESTADOS_CHECKIN)[number];

export const SEXOS = ["M", "F", "Otro"] as const;
export type Sexo = (typeof SEXOS)[number];

export const ROLES = ["participante", "consejero", "coordinador"] as const;
export type Rol = (typeof ROLES)[number];

export const GRUPOS_SANGUINEOS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

export type GrupoSanguineo = (typeof GRUPOS_SANGUINEOS)[number];

export interface ScanResult {
  type: "success" | "warning" | "error";
  title: string;
  message: string;
  asistente?: Asistente;
  scannedName?: string;
  timestamp?: string;
}
