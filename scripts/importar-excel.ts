import "dotenv/config";
import { WebSocket } from "ws";
(globalThis as any).WebSocket = WebSocket;

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import * as XLSX from "xlsx";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "❌ Faltan variables de entorno. Verifica NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

/**
 * Script de importación masiva desde Excel.
 *
 * Uso:
 *   npm run import-excel -- ruta/al/archivo.xlsx
 *
 * El archivo debe tener las siguientes columnas (nombres exactos):
 *   nombres, apellidos, cedula, estaca_distrito_mision, fecha_nacimiento,
 *   sexo, celular, correo, tipo_alojamiento, numero_habitacion, cama_asignada,
 *   grupo_sanguineo, eps_seguro, enfermedad_cronica, tratamiento_medico,
 *   alergias, contacto_emergencia_nombre, contacto_emergencia_telefono
 *
 * Ajusta este mapeo según la estructura real de tu Excel.
 */

async function main() {
  const filePath = process.argv[2];

  if (!filePath || !fs.existsSync(filePath)) {
    console.error("❌ Debes indicar la ruta de un archivo Excel válido.");
    console.error("   Ejemplo: npm run import-excel -- ./data/asistentes.xlsx");
    process.exit(1);
  }

  console.log(`📖 Leyendo ${filePath}...`);

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Record<string, any>[];

  console.log(`📝 Se encontraron ${rows.length} filas. Procesando...`);

  const registros = rows.map((row) => ({
    nombres: String(row["nombres"] || "").trim(),
    apellidos: String(row["apellidos"] || "").trim(),
    cedula: String(row["cedula"] || "").trim(),
    estaca_distrito_mision: String(row["estaca_distrito_mision"] || "").trim(),
    fecha_nacimiento: row["fecha_nacimiento"]
      ? new Date(row["fecha_nacimiento"]).toISOString().split("T")[0]
      : null,
    sexo: String(row["sexo"] || "").trim() || null,
    celular: String(row["celular"] || "").trim() || null,
    correo: String(row["correo"] || "").trim() || null,
    tipo_alojamiento: String(row["tipo_alojamiento"] || "").trim() || null,
    numero_habitacion: String(row["numero_habitacion"] || "").trim() || null,
    cama_asignada: String(row["cama_asignada"] || "").trim() || null,
    grupo_sanguineo: String(row["grupo_sanguineo"] || "").trim() || null,
    eps_seguro: String(row["eps_seguro"] || "").trim() || null,
    enfermedad_cronica: String(row["enfermedad_cronica"] || "").trim() || null,
    tratamiento_medico: String(row["tratamiento_medico"] || "").trim() || null,
    alergias: String(row["alergias"] || "").trim() || null,
    contacto_emergencia_nombre: String(row["contacto_emergencia_nombre"] || "").trim() || null,
    contacto_emergencia_telefono: String(row["contacto_emergencia_telefono"] || "").trim() || null,
  }));

  // Filtrar filas vacías
  const validos = registros.filter(
    (r) => r.nombres && r.apellidos && r.cedula && r.estaca_distrito_mision
  );

  if (validos.length === 0) {
    console.error("❌ No se encontraron registros válidos para importar.");
    process.exit(1);
  }

  const { data, error } = await supabase
    .from("asistentes")
    .insert(validos)
    .select("cedula");

  if (error) {
    console.error("❌ Error al insertar en Supabase:", error.message);
    process.exit(1);
  }

  console.log(`✅ Se importaron ${data?.length || validos.length} asistentes correctamente.`);
  console.log("💡 Ahora ejecuta: npm run generate-qr");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
