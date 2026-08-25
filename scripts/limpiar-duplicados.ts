import { config } from "dotenv";
config({ path: ".env.local" });

import { WebSocket } from "ws";
(globalThis as any).WebSocket = WebSocket;

import { createClient } from "@supabase/supabase-js";
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

function removeAccents(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeName(value: string) {
  return removeAccents(value.toLowerCase())
    .replace(/\s+/g, " ")
    .trim();
}

function countFilledFields(record: any) {
  return Object.values(record).filter((v) => v !== null && v !== "" && v !== false).length;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const autoYes = args.includes("--yes");

  console.log("📂 Cargando asistentes...");
  const { data: asistentes, error } = await supabase.from("asistentes").select("*");

  if (error) {
    console.error("❌ Error cargando asistentes:", error.message);
    process.exit(1);
  }

  if (!asistentes || asistentes.length === 0) {
    console.log("No hay asistentes para limpiar.");
    rl.close();
    return;
  }

  const grouped = new Map<string, any[]>();
  for (const a of asistentes) {
    const key = normalizeName(`${a.nombres || ""} ${a.apellidos || ""}`);
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(a);
  }

  const duplicates = Array.from(grouped.entries()).filter(([_, list]) => list.length > 1);

  if (duplicates.length === 0) {
    console.log("✅ No se encontraron duplicados por nombre completo.");
    rl.close();
    return;
  }

  console.log(`\n⚠️  Se encontraron ${duplicates.length} grupos de posibles duplicados:\n`);

  let removed = 0;
  let kept = 0;

  for (const [key, list] of duplicates) {
    console.log(`Grupo: "${key}"`);
    list.forEach((a, idx) => {
      const fields = countFilledFields(a);
      console.log(
        `  [${idx + 1}] ${a.nombres} ${a.apellidos} | cédula: ${a.cedula || "(vacía)"} | celular: ${a.celular || "(vacío)"} | campos llenos: ${fields} | creado: ${new Date(a.created_at).toLocaleDateString()}`
      );
    });

    // Elegir el registro a conservar: más campos llenos, y en empate el más antiguo
    const sorted = [...list].sort((a, b) => {
      const diff = countFilledFields(b) - countFilledFields(a);
      if (diff !== 0) return diff;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    const keeper = sorted[0];
    const toDelete = sorted.slice(1);

    console.log(`\n   💡 Se conservará: ${keeper.nombres} ${keeper.apellidos} (más completo/antiguo)`);
    console.log(`   🗑️  Se eliminarán: ${toDelete.length} registro(s)`);

    if (dryRun) {
      console.log("   🟡 Modo simulacro: no se eliminó nada\n");
      removed += toDelete.length;
      kept += 1;
      continue;
    }

    let decision = autoYes ? "s" : "";
    if (!autoYes) {
      while (!["s", "n", "m"].includes(decision)) {
        decision = (
          await ask("   ¿Eliminar duplicados (s), omitir grupo (n) o elegir manual (m)? ")
        ).toLowerCase();
      }
    }

    if (decision === "n") {
      console.log("   ⏭️  Grupo omitido\n");
      continue;
    }

    let chosenKeeper = keeper;
    if (decision === "m") {
      const choice = await ask(`   Elige el número a conservar (1-${list.length}): `);
      const idx = parseInt(choice, 10) - 1;
      if (idx >= 0 && idx < list.length) {
        chosenKeeper = list[idx];
      } else {
        console.log("   Opción inválida. Se conservará el sugerido.");
      }
    }

    const idsToDelete = list
      .filter((a) => a.id !== chosenKeeper.id)
      .map((a) => a.id);

    if (idsToDelete.length === 0) {
      console.log("   ⏭️  Sin cambios\n");
      continue;
    }

    const { error: deleteError } = await supabase
      .from("asistentes")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      console.error(`   ❌ Error eliminando: ${deleteError.message}\n`);
    } else {
      console.log(`   ✅ Eliminados ${idsToDelete.length} duplicado(s)\n`);
      removed += idsToDelete.length;
      kept += 1;
    }
  }

  rl.close();

  console.log("\n📊 Resumen:");
  console.log(`   Grupos con duplicados: ${duplicates.length}`);
  if (dryRun) {
    console.log(`   Se conservarían: ${kept}`);
    console.log(`   Se eliminarían: ${removed}`);
  } else {
    console.log(`   Conservados: ${kept}`);
    console.log(`   Eliminados: ${removed}`);
  }

  if (!dryRun && removed > 0) {
    console.log("\n💡 Recuerda ejecutar: npm run generate-qr");
  }
}

main().catch((err) => {
  console.error(err);
  rl.close();
  process.exit(1);
});
