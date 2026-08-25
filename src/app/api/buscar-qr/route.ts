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
        { error: "Ingresa una cédula o número de celular." },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Buscar por cédula normalizada
    const { data: byCedula } = await supabase
      .from("asistentes")
      .select("qr_token")
      .eq("cedula", clean)
      .single();

    if (byCedula?.qr_token) {
      return NextResponse.json({ token: byCedula.qr_token });
    }

    // Buscar por celular normalizado
    const { data: byCelular } = await supabase
      .from("asistentes")
      .select("qr_token")
      .eq("celular", clean)
      .single();

    if (byCelular?.qr_token) {
      return NextResponse.json({ token: byCelular.qr_token });
    }

    return NextResponse.json(
      { error: "No se encontró un asistente con ese dato." },
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
