import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "El token es requerido." },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data: asistente, error } = await supabase
      .from("asistentes")
      .select(
        "id, nombres, apellidos, cedula, qr_token, estaca_distrito_mision, celular, barrio, tipo_alojamiento, numero_habitacion, cama_asignada, compania_numero, rol"
      )
      .eq("qr_token", token)
      .single();

    if (error || !asistente) {
      return NextResponse.json(
        { error: "Token no encontrado." },
        { status: 404 }
      );
    }

    let companeros: any[] | null = null;
    let consejeros: any[] | null = null;

    if (asistente.compania_numero) {
      const { data: advisors } = await supabase
        .from("asistentes")
        .select("nombres, apellidos, celular, sexo")
        .eq("rol", "consejero")
        .eq("compania_numero", asistente.compania_numero);
      consejeros = advisors || null;

      const { data: companyMates } = await supabase
        .from("asistentes")
        .select("nombres, apellidos, estaca_distrito_mision, barrio, sexo")
        .eq("compania_numero", asistente.compania_numero)
        .neq("id", asistente.id)
        .neq("rol", "consejero");
      companeros = companyMates || null;
    }

    return NextResponse.json({ ...asistente, companeros, consejeros });
  } catch (err: any) {
    console.error("Error en qr-info:", err);
    return NextResponse.json(
      { error: "Error al cargar la información." },
      { status: 500 }
    );
  }
}
