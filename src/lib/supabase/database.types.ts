export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      asistentes: {
        Row: {
          id: string;
          nombres: string;
          apellidos: string;
          cedula: string | null;
          documento_pendiente: boolean;
          estaca_distrito_mision: string;
          fecha_nacimiento: string | null;
          sexo: string | null;
          celular: string | null;
          correo: string | null;
          rol: string | null;
          rol_descripcion: string | null;
          compania_numero: number | null;
          compania_pareja_id: string | null;
          link_whatsapp: string | null;
          barrio: string | null;
          tipo_alojamiento: string | null;
          numero_habitacion: string | null;
          cama_asignada: string | null;
          qr_token: string | null;
          estado_checkin: boolean;
          checkin_at: string | null;
          estado_checkout: boolean;
          checkout_at: string | null;
          cancelado: boolean;
          grupo_sanguineo: string | null;
          eps_seguro: string | null;
          enfermedad_cronica: string | null;
          tratamiento_medico: string | null;
          alergias: string | null;
          contacto_emergencia_nombre: string | null;
          contacto_emergencia_telefono: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nombres: string;
          apellidos: string;
          cedula?: string | null;
          documento_pendiente?: boolean;
          estaca_distrito_mision: string;
          fecha_nacimiento?: string | null;
          sexo?: string | null;
          celular?: string | null;
          correo?: string | null;
          rol?: string | null;
          rol_descripcion?: string | null;
          compania_numero?: number | null;
          compania_pareja_id?: string | null;
          link_whatsapp?: string | null;
          barrio?: string | null;
          tipo_alojamiento?: string | null;
          numero_habitacion?: string | null;
          cama_asignada?: string | null;
          qr_token?: string | null;
          estado_checkin?: boolean;
          checkin_at?: string | null;
          estado_checkout?: boolean;
          checkout_at?: string | null;
          cancelado?: boolean;
          grupo_sanguineo?: string | null;
          eps_seguro?: string | null;
          enfermedad_cronica?: string | null;
          tratamiento_medico?: string | null;
          alergias?: string | null;
          contacto_emergencia_nombre?: string | null;
          contacto_emergencia_telefono?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nombres?: string;
          apellidos?: string;
          cedula?: string | null;
          documento_pendiente?: boolean;
          estaca_distrito_mision?: string;
          fecha_nacimiento?: string | null;
          sexo?: string | null;
          celular?: string | null;
          correo?: string | null;
          rol?: string | null;
          rol_descripcion?: string | null;
          compania_numero?: number | null;
          compania_pareja_id?: string | null;
          link_whatsapp?: string | null;
          barrio?: string | null;
          tipo_alojamiento?: string | null;
          numero_habitacion?: string | null;
          cama_asignada?: string | null;
          qr_token?: string | null;
          estado_checkin?: boolean;
          checkin_at?: string | null;
          estado_checkout?: boolean;
          checkout_at?: string | null;
          cancelado?: boolean;
          grupo_sanguineo?: string | null;
          eps_seguro?: string | null;
          enfermedad_cronica?: string | null;
          tratamiento_medico?: string | null;
          alergias?: string | null;
          contacto_emergencia_nombre?: string | null;
          contacto_emergencia_telefono?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
