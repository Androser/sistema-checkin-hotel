import { config } from "dotenv";
config({ path: ".env.local" });

import { WebSocket } from "ws";
(globalThis as any).WebSocket = WebSocket;

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import * as XLSX from "xlsx";
import readline from "readline";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "❌ Faltan variables de entorno. Verifica NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

function normalizeId(value: any) {
  return String(value || "")
    .replace(/\D/g, "")
    .trim();
}

function normalizeText(value: any) {
  return String(value || "").trim();
}

function normalizeDate(value: any): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

function rowToRecord(row: Record<string, any>) {
  return {
    nombres: normalizeText(row["nombres"]),
    apellidos: normalizeText(row["apellidos"]),
    cedula: normalizeId(row["cedula"]) || null,
    estaca_distrito_mision: normalizeText(row["estaca_distrito_mision"]),
    fecha_nacimiento: normalizeDate(row["fecha_nacimiento"]),
    sexo: normalizeText(row["sexo"]) || null,
    celular: normalizeId(row["celular"]) || null,
    correo: normalizeText(row["correo"]) || null,
    tipo_alojamiento: normalizeText(row["tipo_alojamiento"]) || null,
    numero_habitacion: normalizeText(row["numero_habitacion"]) || null,
    cama_asignada: normalizeText(row["cama_asignada"]) || null,
    grupo_sanguineo: normalizeText(row["grupo_sanguineo"]) || null,
    eps_seguro: normalizeText(row["eps_seguro"]) || null,
    enfermedad_cronica: normalizeText(row["enfermedad_cronica"]) || null,
    tratamiento_medico: normalizeText(row["tratamiento_medico"]) || null,
    alergias: normalizeText(row["alergias"]) || null,
    contacto_emergencia_nombre: normalizeText(row["contacto_emergencia_nombre"]) || null,
    contacto_emergencia_telefono: normalizeId(row["contacto_emergencia_telefono"]) || null,
  };
}

async function findExisting(record: ReturnType<typeof rowToRecord>) {
  if (record.cedula) {
    const { data } = await supabase
      .from("asistentes")
      .select("*")
      .eq("cedula", record.cedula)
      .maybeSingle();
    if (data) return { existing: data, matchedBy: "cédula" };
  }

  if (record.celular) {
    const { data } = await supabase
      .from("asistentes")
      .select("*")
      .eq("celular", record.celular)
      .maybeSingle();
    if (data) return { existing: data, matchedBy: "celular" };
  }

  const { data } = await supabase
    .from("asistentes")
    .select("*")
    .ilike("nombres", record.nombres)
    .ilike("apellidos", record.apellidos)
    .maybeSingle();

  if (data) return { existing: data, matchedBy: "nombre y apellido" };

  return null;
}

function getChanges(existing: any, record: ReturnType<typeof rowToRecord>) {
  const changes: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    const existingValue = existing[key];
    const areEqual =
      (existingValue === null && value === null) ||
      String(existingValue || "").trim() === String(value || "").trim();

    if (!areEqual) {
      changes.push(
        `  ${key}: "${existingValue ?? "(vacío)"}" → "${value ?? "(vacío)"}"`
      );
    }
  }
  return changes;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const autoUpdate = args.includes("--yes") || args.includes("--auto-update");
  const filePath = args.find((a) => !a.startsWith("--"));

  if (!filePath || !fs.existsSync(filePath)) {
    console.error("❌ Debes indicar la ruta de un archivo Excel válido.");
    console.error("   Ejemplo: npm run import-excel -- ./data/asistentes.xlsx");
    console.error("   Opciones:");
    console.error("     --dry-run      Muestra qué cambiaría sin hacer nada.");
    console.error("     --yes          Actualiza duplicados automáticamente.");
    process.exit(1);
  }

  console.log(`📖 Leyendo ${filePath}...`);

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Record<string, any>[];

  console.log(`📝 Se encontraron ${rows.length} filas. Procesando...\n`);

  const records = rows.map(rowToRecord);
  const validos = records.filter(
    (r) => r.nombres && r.apellidos && r.estaca_distrito_mision
  );

  if (validos.length === 0) {
    console.error("❌ No se encontraron registros válidos para importar.");
    process.exit(1);
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let duplicatesExact = 0;
  let errors = 0;

  for (let i = 0; i < validos.length; i++) {
    const record = validos[i];
    const label = `${record.nombres} ${record.apellidos}`;
    console.log(`[${i + 1}/${validos.length}] ${label}`);

    const found = await findExisting(record);

    if (!found) {
      if (dryRun) {
        console.log("   🟡 Nuevo (se insertaría)");
        inserted++;
        continue;
      }

      const { error } = await supabase.from("asistentes").insert(record);
      if (error) {
        console.error(`   ❌ Error insertando: ${error.message}`);
        errors++;
      } else {
        console.log("   ✅ Insertado");
        inserted++;
      }
      continue;
    }

    const { existing, matchedBy } = found;
    console.log(`   ⚠️  Ya existe (coincidencia por ${matchedBy})`);

    const changes = getChanges(existing, record);

    if (changes.length === 0) {
      console.log("   ⏭️  Datos idénticos, se omite");
      duplicatesExact++;
      continue;
    }

    console.log("   📝 Diferencias encontradas:");
    changes.forEach((c) => console.log(c));

    if (dryRun) {
      console.log("   🟡 Se actualizaría\n");
      updated++;
      continue;
    }

    let decision = autoUpdate ? "a" : "";
    while (!["a", "s", "d"].includes(decision)) {
      decision = (
        await ask("   ¿Actualizar (a), saltar (s) o duplicar (d)? ")
      ).toLowerCase();
    }

    if (decision === "s") {
      console.log("   ⏭️  Saltado\n");
      skipped++;
    } else if (decision === "d") {
      const { error } = await supabase.from("asistentes").insert(record);
      if (error) {
        console.error(`   ❌ Error duplicando: ${error.message}\n`);
        errors++;
      } else {
        console.log("   ✅ Duplicado creado\n");
        inserted++;
      }
    } else {
      const updatePayload = { ...record };
      delete (updatePayload as any).id;

      const { error } = await supabase
        .from("asistentes")
        .update(updatePayload)
        .eq("id", existing.id);

      if (error) {
        console.error(`   ❌ Error actualizando: ${error.message}\n`);
        errors++;
      } else {
        console.log("   ✅ Actualizado\n");
        updated++;
      }
    }
  }

  rl.close();

  console.log("\n📊 Resumen:");
  console.log(`   Insertados: ${inserted}`);
  console.log(`   Actualizados: ${updated}`);
  console.log(`   Duplicados exactos omitidos: ${duplicatesExact}`);
  console.log(`   Saltados manualmente: ${skipped}`);
  console.log(`   Errores: ${errors}`);

  if (!dryRun && (inserted > 0 || updated > 0)) {
    console.log("\n💡 Recuerda ejecutar: npm run generate-qr");
  }
}

main().catch((err) => {
  console.error(err);
  rl.close();
  process.exit(1);
});
