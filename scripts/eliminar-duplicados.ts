import { config } from "dotenv";
config({ path: ".env.local" });

import { WebSocket } from "ws";
(globalThis as any).WebSocket = WebSocket;

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "❌ Faltan variables de entorno. Verifica NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function fullName(a: any) {
  return normalizeName(`${a.nombres || ""} ${a.apellidos || ""}`);
}

function completenessScore(a: any): number {
  const fields = [
    "cedula",
    "celular",
    "correo",
    "estaca_distrito_mision",
    "fecha_nacimiento",
    "sexo",
    "barrio",
    "grupo_sanguineo",
    "eps_seguro",
    "contacto_emergencia_nombre",
    "contacto_emergencia_telefono",
    "tipo_alojamiento",
    "numero_habitacion",
    "cama_asignada",
  ];
  return fields.filter((f) => {
    const v = a[f];
    return v !== null && v !== undefined && String(v).trim() !== "";
  }).length;
}

async function main() {
  const dryRun = !process.argv.includes("--confirm");

  console.log("📂 Cargando asistentes desde Supabase...");
  const { data: asistentes, error } = await supabase
    .from("asistentes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error cargando asistentes:", error.message);
    process.exit(1);
  }

  if (!asistentes || asistentes.length === 0) {
    console.log("ℹ️ No hay asistentes en la base de datos.");
    process.exit(0);
  }

  console.log(`   ${asistentes.length} asistentes cargados.\n`);

  // Agrupar por nombre completo normalizado
  const groups = new Map<string, any[]>();
  for (const a of asistentes) {
    const key = fullName(a);
    if (!key || key.length < 3) continue; // ignorar nombres muy cortos
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }

  const duplicateGroups = Array.from(groups.entries()).filter(
    ([, list]) => list.length > 1
  );

  if (duplicateGroups.length === 0) {
    console.log("✅ No se encontraron duplicados por nombre completo.");
    process.exit(0);
  }

  console.log(`⚠️  Se encontraron ${duplicateGroups.length} grupos de duplicados.\n`);

  const toDelete: any[] = [];

  for (const [key, list] of duplicateGroups) {
    // Ordenar por completitud descendente, luego por fecha de creación descendente
    const sorted = [...list].sort((a, b) => {
      const scoreDiff = completenessScore(b) - completenessScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      );
    });

    const keeper = sorted[0];
    const duplicates = sorted.slice(1);

    console.log(`👤 ${key}`);
    console.log(`   ✅ Se mantiene: ${keeper.nombres} ${keeper.apellidos} (completitud: ${completenessScore(keeper)})`);
    for (const d of duplicates) {
      console.log(`   🗑️  Se eliminaría: ${d.nombres} ${d.apellidos} (completitud: ${completenessScore(d)})`);
      toDelete.push(d);
    }
    console.log("");
  }

  console.log(`\n📊 Total a eliminar: ${toDelete.length} asistentes.`);

  if (dryRun) {
    console.log("\n🔒 Esto fue un simulacro (dry run).");
    console.log("   Para eliminar de verdad, ejecuta: npx ts-node scripts/eliminar-duplicados.ts --confirm");
    process.exit(0);
  }

  // Confirmación adicional: el usuario debe haber pasado --confirm
  console.log("\n⚠️  MODO REAL: eliminando duplicados...");

  const idsToDelete = toDelete.map((d) => d.id);
  const { error: deleteError } = await supabase
    .from("asistentes")
    .delete()
    .in("id", idsToDelete);

  if (deleteError) {
    console.error("❌ Error eliminando duplicados:", deleteError.message);
    process.exit(1);
  }

  console.log(`✅ Se eliminaron ${idsToDelete.length} asistentes duplicados.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
