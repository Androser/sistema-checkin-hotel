import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { id, cedula } = await request.json();

    if (!id || !cedula) {
      return NextResponse.json(
        { error: "El ID y la cédula son requeridos." },
        { status: 400 }
      );
    }

    const cleanCedula = String(cedula).replace(/\D/g, "").trim();

    if (!cleanCedula) {
      return NextResponse.json(
        { error: "La cédula no es válida." },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Verificar que el asistente existe
    const { data: existing, error: findError } = await supabase
      .from("asistentes")
      .select("id")
      .eq("id", id)
      .single();

    if (findError || !existing) {
      return NextResponse.json(
        { error: "Asistente no encontrado." },
        { status: 404 }
      );
    }

    // Actualizar solo la cédula
    const { error } = await supabase
      .from("asistentes")
      .update({ cedula: cleanCedula })
      .eq("id", id);

    if (error) {
      console.error("Error actualizando cédula:", error);
      return NextResponse.json(
        { error: "Error al actualizar la cédula." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, cedula: cleanCedula });
  } catch (err: any) {
    console.error("Error en actualizar-cedula:", err);
    return NextResponse.json(
      { error: "Error al procesar la solicitud." },
      { status: 500 }
    );
  }
}
