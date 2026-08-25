import { notFound } from "next/navigation";
import Image from "next/image";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { formatFullName } from "@/lib/utils";

interface QrPageProps {
  searchParams: { token?: string };
}

export default async function QrPage({ searchParams }: QrPageProps) {
  const token = searchParams.token;

  if (!token) {
    notFound();
  }

  const supabase = createClient();
  const { data: asistente, error } = await supabase
    .from("asistentes")
    .select("*")
    .eq("qr_token", token)
    .single();

  if (error || !asistente) {
    notFound();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sistema-checkin-hotel-omega.vercel.app";
  const displayName = encodeURIComponent(formatFullName(asistente));
  const scanUrl = `${siteUrl}/escaner?token=${token}&n=${displayName}`;
  const qrDataUrl = await QRCode.toDataURL(scanUrl, {
    width: 400,
    margin: 2,
    type: "image/png",
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Código de acceso
          </h1>
          <p className="mt-1 text-slate-500">
            Muestra este QR al llegar al hotel
          </p>
        </div>

        <div className="mb-6 text-center">
          <p className="text-sm text-slate-400">Asistente</p>
          <p className="text-xl font-semibold text-slate-900">
            {formatFullName(asistente)}
          </p>
          {asistente.estaca_distrito_mision && (
            <p className="text-sm text-slate-500">
              {asistente.estaca_distrito_mision}
            </p>
          )}
        </div>

        <div className="mb-6 flex justify-center rounded-2xl border border-slate-100 bg-white p-4">
          <Image
            src={qrDataUrl}
            alt={`QR de ${formatFullName(asistente)}`}
            width={280}
            height={280}
            unoptimized
            className="rounded-lg"
          />
        </div>

        <div className="space-y-3 text-center text-sm text-slate-600">
          <p>
            Guarda esta pantalla o haz una captura de pantalla. El personal en
            la entrada la escaneará para registrar tu ingreso.
          </p>
        </div>

        {asistente.tipo_alojamiento && (
          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-center">
            <p className="text-xs text-slate-400">Alojamiento asignado</p>
            <p className="font-medium text-slate-900">
              {asistente.tipo_alojamiento}
              {asistente.numero_habitacion && ` · ${asistente.numero_habitacion}`}
              {asistente.cama_asignada && ` · Cama ${asistente.cama_asignada}`}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
