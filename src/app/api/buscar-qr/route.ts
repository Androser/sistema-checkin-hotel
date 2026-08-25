import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/importHelpers";

export const dynamic = "force-dynamic";

function normalizeId(value: string) {
  return value.replace(/\D/g, "").trim();
}

export async function POST(request: NextRequest) {
  try {
    const { identificador } = await request.json();
    const clean = normalizeId(identificador || "");
    const phone = normalizePhone(identificador || "");

    if (!clean) {
      return NextResponse.json(
        { error: "Ingresa una cédula o celular válido." },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const selectFields =
      "id, nombres, apellidos, cedula, qr_token, estaca_distrito_mision, celular, tipo_alojamiento, numero_habitacion, cama_asignada";

    // Buscar por cédula normalizada
    const { data: byCedula } = await supabase
      .from("asistentes")
      .select(selectFields)
      .eq("cedula", clean)
      .single();

    let asistente = byCedula;

    // Si no encuentra por cédula, buscar por celular normalizado (con y sin 57)
    if (!asistente?.qr_token) {
      const { data: byCelular } = await supabase
        .from("asistentes")
        .select(selectFields)
        .or(`celular.eq.${phone},celular.eq.${clean}`)
        .single();
      asistente = byCelular;
    }

    if (!asistente?.qr_token) {
      return NextResponse.json(
        { error: "No se encontró un asistente con ese dato." },
        { status: 404 }
      );
    }

    // Buscar compañeros de habitación
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
    console.error("Error buscando QR:", err);
    return NextResponse.json(
      { error: "Error al buscar el asistente." },
      { status: 500 }
    );
  }
}
