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
        "id, nombres, apellidos, cedula, qr_token, estaca_distrito_mision, celular, tipo_alojamiento, numero_habitacion, cama_asignada"
      )
      .eq("qr_token", token)
      .single();

    if (error || !asistente) {
      return NextResponse.json(
        { error: "Token no encontrado." },
        { status: 404 }
      );
    }

    let companeros = null;
    if (asistente.tipo_alojamiento && asistente.numero_habitacion) {
      const { data: roommates } = await supabase
        .from("asistentes")
        .select("nombres, apellidos, cama_asignada, celular")
        .eq("tipo_alojamiento", asistente.tipo_alojamiento)
        .eq("numero_habitacion", asistente.numero_habitacion)
        .neq("id", asistente.id);
      companeros = roommates;
    }

    return NextResponse.json({ ...asistente, companeros });
  } catch (err: any) {
    console.error("Error en qr-info:", err);
    return NextResponse.json(
      { error: "Error al cargar la información." },
      { status: 500 }
    );
  }
}
