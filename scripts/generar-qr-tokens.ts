import "dotenv/config";
import { WebSocket } from "ws";
(globalThis as any).WebSocket = WebSocket;

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "❌ Faltan variables de entorno. Verifica NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log("🔍 Buscando asistentes sin token QR...");

  const { data: asistentes, error } = await supabase
    .from("asistentes")
    .select("id, nombres, apellidos, cedula, qr_token")
    .is("qr_token", null);

  if (error) {
    console.error("❌ Error al consultar Supabase:", error.message);
    process.exit(1);
  }

  if (!asistentes || asistentes.length === 0) {
    console.log("✅ Todos los asistentes ya tienen token QR.");
    return;
  }

  console.log(`📝 Se encontraron ${asistentes.length} asistentes sin token.`);

  const outputDir = path.join(__dirname, "../public/qr-codes");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const a of asistentes) {
    const token = randomUUID();
    const displayName = encodeURIComponent(`${a.nombres} ${a.apellidos}`.trim());
    const qrUrl = `${siteUrl}/escaner?token=${token}&n=${displayName}`;

    // Actualizar token en la base de datos
    const { error: updateError } = await supabase
      .from("asistentes")
      .update({ qr_token: token })
      .eq("id", a.id);

    if (updateError) {
      console.error(`❌ Error actualizando ${a.cedula}:`, updateError.message);
      continue;
    }

    // Generar imagen QR
    const fileName = `${a.cedula}-${token.slice(0, 8)}.png`;
    const filePath = path.join(outputDir, fileName);
    await QRCode.toFile(filePath, qrUrl, { width: 400, margin: 2 });

    console.log(
      `✅ ${a.nombres} ${a.apellidos} (${a.cedula}) → ${fileName}`
    );
  }

  console.log("\n🎉 Proceso completado.");
  console.log(`📁 Imágenes QR guardadas en: ${outputDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
