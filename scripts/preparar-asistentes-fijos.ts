import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";
import * as XLSX from "xlsx";

(globalThis as any).WebSocket = WebSocket;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ");
}

function tokenSet(value: string) {
  return new Set(normalize(value).split(/\s+/).filter(Boolean));
}

function scoreMatch(a: string, b: string) {
  const tokensA = tokenSet(a);
  const tokensB = tokenSet(b);
  let common = 0;
  for (const t of tokensA) if (tokensB.has(t)) common++;
  return common / Math.max(tokensA.size, tokensB.size);
}

async function main() {
  // 1. Leer asistentes activos
  const { data: asistentes, error: err1 } = await supabase
    .from("asistentes")
    .select("id, nombres, apellidos, cedula, sexo, rol, cancelado")
    .eq("cancelado", false);

  if (err1 || !asistentes) {
    console.error("Error leyendo asistentes:", err1);
    process.exit(1);
  }

  // 2. Cancelar las 5 personas sin rol que no van
  const sinRolNombres = [
    "Skarly Michelle Caibe Loreto",
    "Geraldinne Geovanna Quina Rincón",
    "Ivonne Astrid Wilches Herrera",
    "Jordan Esteven Gil Torres",
    "Nixon Nicolas Ávila león",
  ];

  const idsCancelar: string[] = [];
  for (const nombre of sinRolNombres) {
    const matches = asistentes.filter((a: any) => {
      const full = `${a.nombres} ${a.apellidos}`;
      return scoreMatch(full, nombre) >= 0.8;
    });
    if (matches.length === 1) {
      idsCancelar.push(matches[0].id);
      console.log(`🚫 Cancelar: ${matches[0].nombres} ${matches[0].apellidos}`);
    } else if (matches.length === 0) {
      console.log(`❌ No encontrado para cancelar: ${nombre}`);
    } else {
      console.log(`⚠️ Varios candidatos para cancelar ${nombre}:`, matches.map((m: any) => `${m.nombres} ${m.apellidos}`));
    }
  }

  if (idsCancelar.length > 0) {
    const { error: errCancel } = await supabase
      .from("asistentes")
      .update({ cancelado: true } as any)
      .in("id", idsCancelar);
    if (errCancel) {
      console.error("Error cancelando:", errCancel);
      process.exit(1);
    }
    console.log(`✅ Cancelados ${idsCancelar.length} asistentes.\n`);
  }

  // 3. Leer asignaciones fijas del Excel
  const workbook = XLSX.readFile(
    "Leo ACOMODACION  FINAL  GRUPO DE 250 PAX  EN  ALOJAMIENTO.xlsx"
  );
  const worksheet = workbook.Sheets["TODOS ALOJAMIENTOS"];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

  let currentRoom: string | null = null;
  const fixedAssignments: { room: string; nombre: string; cedula: string }[] = [];

  for (const row of rows) {
    const [tipoRaw, , hab, nombreRaw, docRaw] = row;
    const habStr = String(hab).trim();
    const nombreStr = String(nombreRaw).trim();
    if (habStr && !nombreStr.toLowerCase().includes("huespedes")) {
      currentRoom = habStr;
    }
    if (currentRoom && nombreStr && !nombreStr.toLowerCase().includes("huespedes") && !nombreStr.toLowerCase().includes("documento")) {
      const doc = String(docRaw).trim();
      const names = nombreStr
        .split(/\s*[-–/]\s*|\s*\n\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const name of names) {
        fixedAssignments.push({ room: currentRoom, nombre: name, cedula: doc });
      }
    }
  }

  // 4. Actualizar cédulas vacías en BD desde el Excel
  let actualizadas = 0;
  for (const item of fixedAssignments) {
    if (!item.cedula) continue;

    const matches = asistentes.filter((a: any) => {
      const full = `${a.nombres} ${a.apellidos}`;
      return scoreMatch(full, item.nombre) >= 0.6;
    });

    const best = matches
      .map((a: any) => ({
        a,
        score: scoreMatch(`${a.nombres} ${a.apellidos}`, item.nombre),
      }))
      .sort((x, y) => y.score - x.score)[0];

    if (!best || best.score < 0.6) {
      console.log(`❌ Sin coincidencia: ${item.nombre} (hab ${item.room})`);
      continue;
    }

    const a = best.a;
    if (a.cedula && String(a.cedula).trim()) {
      console.log(`⏭️ Ya tiene cédula: ${a.nombres} ${a.apellidos} -> ${a.cedula}`);
      continue;
    }

    const { error: errUpdate } = await supabase
      .from("asistentes")
      .update({ cedula: item.cedula } as any)
      .eq("id", a.id);

    if (errUpdate) {
      console.error(`Error actualizando ${a.nombres} ${a.apellidos}:`, errUpdate);
      continue;
    }

    actualizadas++;
    console.log(`✏️ ${a.nombres} ${a.apellidos}: cédula actualizada a ${item.cedula}`);
  }

  console.log(`\n🎉 Listo. Cancelados: ${idsCancelar.length}. Cédulas actualizadas: ${actualizadas}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
