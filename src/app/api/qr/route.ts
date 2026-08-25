import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const requestedName = searchParams.get("n");

    if (!token) {
      return NextResponse.json(
        { error: "El parámetro 'token' es requerido." },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { data: asistente, error } = await supabase
      .from("asistentes")
      .select("nombres, apellidos, qr_token")
      .eq("qr_token", token)
      .single();

    if (error || !asistente) {
      return NextResponse.json(
        { error: "Token no encontrado." },
        { status: 404 }
      );
    }

    const siteUrl = SITE_URL;
    const displayName = encodeURIComponent(
      requestedName ||
        `${asistente.nombres} ${asistente.apellidos}`.trim()
    );
    const qrUrl = `${siteUrl}/escaner?token=${token}&n=${displayName}`;

    const buffer = await QRCode.toBuffer(qrUrl, {
      width: 400,
      margin: 2,
      type: "png",
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err: any) {
    console.error("Error generando QR:", err);
    return NextResponse.json(
      { error: "Error al generar el QR." },
      { status: 500 }
    );
  }
}
