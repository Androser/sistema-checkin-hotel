import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function normalize(value: string) {
  return value.replace(/\D/g, "").trim();
}

export async function POST(request: NextRequest) {
  try {
    const { identificador } = await request.json();
    const clean = normalize(identificador || "");

    if (!clean) {
      return NextResponse.json(
        { error: "Ingresa una cédula válida." },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const selectFields =
      "id, nombres, apellidos, cedula, qr_token, estaca_distrito_mision";

    // Buscar por cédula normalizada
    const { data: byCedula } = await supabase
      .from("asistentes")
      .select(selectFields)
      .eq("cedula", clean)
      .single();

    if (byCedula?.qr_token) {
      return NextResponse.json(byCedula);
    }

    // Respaldo por celular normalizado (no se muestra en el formulario, pero permite flexibilidad)
    const { data: byCelular } = await supabase
      .from("asistentes")
      .select(selectFields)
      .eq("celular", clean)
      .single();

    if (byCelular?.qr_token) {
      return NextResponse.json(byCelular);
    }

    return NextResponse.json(
      { error: "No se encontró un asistente con esa cédula." },
      { status: 404 }
    );
  } catch (err: any) {
    console.error("Error buscando QR:", err);
    return NextResponse.json(
      { error: "Error al buscar el asistente." },
      { status: 500 }
    );
  }
}
