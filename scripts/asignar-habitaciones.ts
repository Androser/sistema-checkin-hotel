import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";
import * as XLSX from "xlsx";
import fs from "fs";

(globalThis as any).WebSocket = WebSocket;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const DRY_RUN = process.argv.includes("--dry-run");

// Mapa manual para los nombres fijos del Excel que no coinciden exactamente con la BD
const FIXED_NAME_OVERRIDES: Record<string, string> = {
  "Pablo Solano": "Juan Pablo Solano Rodríguez",
  "Dilan Mojica": "Dilan Andres Mojica Romero",
  "Juan Leiva": "Juan Camilo Leiva",
  "Andres Llinas": "Andrés Felipe Llinás Ramírez",
  "Jhon Cantor": "Jhon Madison Cantor Pardo",
  "Axel Ospino": "Axel Andreiev Ospino Herrera",
  "Daniel Cucaita": "Daniel Elías Cucaita Moreno",
  "Harrison Sanchez": "Harrison Sneider Sanchez Mancera",
  "Leonardo Gómez": "Andres Leonardo Gómez Gil",
  "Camila Vazquez": "Laura Camila Vasquez Moreno",
  "Kimberly Garcia": "Kimberly García Trujillo",
  "Nahomi Bernal": "Nahomy Bernal forero",
  "Aileen Gomez": "Aileen Gomez Massey",
  "Darlin Franco": "Darlín Franco Jaramillo",
  "Estefania Cely": "Belly Stefania Cely Hernández",
  "Angelin Rodriguez": "Angelin Rodriguez Torrealba",
  "Antonela Quintero": "Antonella Quintero Castañeda",
  "Sol Bocanegra": "Sol Brighid Bocanegra Núñez",
  "Luciana Arevalo": "Luciana Giselle Arevalo Angarita",
  "Emily Garcia": "Emily Alexandra López García",
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ");
}

function scoreMatch(nameA: string, nameB: string) {
  const a = normalize(nameA).split(/\s+/).filter(Boolean);
  const b = normalize(nameB).split(/\s+/).filter(Boolean);
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  const common = a.filter((t) => setB.has(t)).length;
  return common / Math.max(a.length, b.length);
}

function findBestMatch(
  target: string,
  candidates: { id: string; fullName: string; sexo?: string | null }[],
  minScore = 0.5
) {
  let best: { id: string; fullName: string; score: number } | null = null;
  for (const c of candidates) {
    const score = scoreMatch(target, c.fullName);
    if (score >= minScore && (!best || score > best.score)) {
      best = { id: c.id, fullName: c.fullName, score };
    }
  }
  return best;
}

function mapTipoAlojamiento(tipoRaw: string): string {
  const t = tipoRaw.toUpperCase().replace(/\s+/g, " ");
  if (t.includes("CABAÑA")) return "Cabaña";
  if (t.includes("APARTA SUITE")) return "Apartasuite";
  if (t.includes("APARTAMENTO TORRES")) return "Torres del Sol";
  if (t.includes("HABITACION MULTIFAMILIAR")) return "Habitaciones Multifamiliares";
  if (t.includes("SUITE DE PAREJA")) return "Torres del Sol";
  return tipoRaw;
}

type ParsedRoom = {
  rowIndex: number;
  tipoRaw: string;
  tipo: string;
  numero: string;
  capacidad: number;
  isSuite: boolean;
  fixedNames: { nombre: string; cedula: string; cama: string }[];
};

function parseRoomsFromExcel(path: string): ParsedRoom[] {
  const wb = XLSX.readFile(path);
  const ws = wb.Sheets["TODOS ALOJAMIENTOS"];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];

  const rooms: ParsedRoom[] = [];
  let currentRoom: ParsedRoom | null = null;
  let currentTipoRaw = "";
  let currentTipo = "";
  let roomRow = 0;

  for (let i = 0; i < rows.length; i++) {
    const [tipoRaw, , hab, nombreRaw, docRaw] = rows[i];
    const tipoStr = String(tipoRaw).trim();
    const habStr = String(hab).trim();
    const nombreStr = String(nombreRaw).trim();

    // Stop at notes section
    if (tipoStr.toLowerCase().includes("revisar")) break;

    if (
      tipoStr &&
      (tipoStr.toUpperCase().startsWith("CABAÑA") ||
        tipoStr.toUpperCase().startsWith("APARTA") ||
        tipoStr.toUpperCase().startsWith("APARTAMENTO") ||
        tipoStr.toUpperCase().startsWith("HABITACION") ||
        tipoStr.toUpperCase().startsWith("SUITE"))
    ) {
      currentTipoRaw = tipoStr;
      currentTipo = mapTipoAlojamiento(tipoStr);
    }

    if (habStr && !nombreStr.toLowerCase().includes("huespedes")) {
      if (currentRoom) rooms.push(currentRoom);
      currentRoom = {
        rowIndex: i + 1,
        tipoRaw: currentTipoRaw,
        tipo: currentTipo,
        numero: habStr,
        capacidad: 0,
        isSuite: currentTipoRaw.toUpperCase().includes("SUITE DE PAREJA"),
        fixedNames: [],
      };
      roomRow = 0;
    }

    if (currentRoom) {
      currentRoom.capacidad++;
      if (
        nombreStr &&
        !nombreStr.toLowerCase().includes("huespedes") &&
        !nombreStr.toLowerCase().includes("documento")
      ) {
        const cama = String(roomRow + 1);
        const names = nombreStr
          .split(/\s*[-–/]\s*|\s*\n\s*/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const name of names) {
          currentRoom.fixedNames.push({
            nombre: name,
            cedula: String(docRaw).trim(),
            cama,
          });
        }
      }
      roomRow++;
    }
  }

  if (currentRoom) rooms.push(currentRoom);
  return rooms;
}

async function main() {
  console.log(DRY_RUN ? "🔍 MODO SIMULACIÓN" : "🚀 MODO REAL");

  // 1. Leer habitaciones
  const rooms = parseRoomsFromExcel(
    "Leo ACOMODACION  FINAL  GRUPO DE 250 PAX  EN  ALOJAMIENTO.xlsx"
  );
  console.log(`📋 ${rooms.length} habitaciones parseadas`);

  // 2. Leer asistentes activos
  const { data: asistentes, error: err1 } = await supabase
    .from("asistentes")
    .select("id, nombres, apellidos, cedula, sexo, rol")
    .eq("cancelado", false);

  if (err1 || !asistentes) {
    console.error("Error leyendo asistentes:", err1);
    process.exit(1);
  }

  const candidates = (asistentes as any[]).map((a) => ({
    id: a.id,
    fullName: `${a.nombres} ${a.apellidos}`,
    sexo: a.sexo,
    rol: a.rol,
  }));

  // 3. Resolver asignaciones fijas
  const assignedIds = new Set<string>();
  const assignments: {
    id: string;
    tipo: string;
    numero: string;
    cama: string;
    nombre: string;
  }[] = [];
  const warnings: string[] = [];

  for (const room of rooms) {
    for (const fn of room.fixedNames) {
      let matchId: string | null = null;
      let matchName: string | null = null;

      const override = FIXED_NAME_OVERRIDES[fn.nombre];
      if (override) {
        const direct = candidates.find(
          (c) => normalize(c.fullName) === normalize(override)
        );
        if (direct) {
          matchId = direct.id;
          matchName = direct.fullName;
        }
      }

      if (!matchId) {
        const fuzzy = findBestMatch(fn.nombre, candidates, 0.4);
        if (fuzzy) {
          matchId = fuzzy.id;
          matchName = fuzzy.fullName;
        }
      }

      if (!matchId) {
        warnings.push(
          `No se encontró coincidencia para "${fn.nombre}" en ${room.tipo} ${room.numero}`
        );
        continue;
      }
      if (assignedIds.has(matchId)) {
        warnings.push(
          `"${fn.nombre}" en ${room.tipo} ${room.numero} ya fue asignado antes`
        );
        continue;
      }
      assignedIds.add(matchId);
      assignments.push({
        id: matchId,
        tipo: room.tipo,
        numero: room.numero,
        cama: fn.cama,
        nombre: matchName!,
      });
    }
  }

  // 4. Pools
  const isStaff = (a: any) => a.rol === "coordinador" || a.rol === "consejero";
  const staffPool = (asistentes as any[]).filter(
    (a) => isStaff(a) && !assignedIds.has(a.id)
  );
  const participantPool = (asistentes as any[]).filter(
    (a) => !isStaff(a) && !assignedIds.has(a.id)
  );

  // 5. Asignar staff restante a Apartasuites (S3-S6)
  const staffRooms = rooms.filter(
    (r) => r.tipo === "Apartasuite" && !["S1", "S2"].includes(r.numero)
  );

  function nextBed(room: ParsedRoom, usedBeds: Map<string, string[]>) {
    const beds = usedBeds.get(room.numero) || [];
    for (let i = 1; i <= room.capacidad; i++) {
      const bed = String(i);
      // Suites de pareja: allow 2 per bed; others 1 per bed
      const maxPerBed = room.isSuite ? 2 : 1;
      const count = beds.filter((b) => b === bed).length;
      if (count < maxPerBed) return bed;
    }
    return null;
  }

  const usedBeds = new Map<string, string[]>();
  function addOccupant(room: ParsedRoom, bed: string) {
    const list = usedBeds.get(room.numero) || [];
    list.push(bed);
    usedBeds.set(room.numero, list);
  }

  // Pre-fill used beds from fixed assignments
  for (const a of assignments) {
    const room = rooms.find((r) => r.numero === a.numero && r.tipo === a.tipo);
    if (room) addOccupant(room, a.cama);
  }

  function roomGender(room: ParsedRoom) {
    const occupants = assignments.filter(
      (a) => a.numero === room.numero && a.tipo === room.tipo
    );
    // Prefer fixed gender if any
    for (const occ of occupants) {
      const person = (asistentes as any[]).find((p) => p.id === occ.id);
      if (person?.sexo) return person.sexo;
    }
    return null;
  }

  function assignStaff() {
    // Fill S2 remaining beds with staff women first (since S2 is female)
    const s2 = rooms.find((r) => r.tipo === "Apartasuite" && r.numero === "S2");
    if (!s2) {
      console.error("DEBUG: S2 not found. Rooms count:", rooms.length);
      console.error(rooms.filter((r) => r.tipo === "Apartasuite").map((r) => r.numero));
      throw new Error("S2 no encontrada");
    }
    const s2Women = staffPool.filter((a) => a.sexo === "F");
    while (nextBed(s2, usedBeds) && s2Women.length > 0) {
      const person = s2Women.shift()!;
      const bed = nextBed(s2, usedBeds)!;
      addOccupant(s2, bed);
      assignments.push({
        id: person.id,
        tipo: s2.tipo,
        numero: s2.numero,
        cama: bed,
        nombre: `${person.nombres} ${person.apellidos}`,
      });
      staffPool.splice(staffPool.indexOf(person), 1);
    }

    // Fill S3-S6
    for (const room of staffRooms) {
      while (staffPool.length > 0) {
        const bed = nextBed(room, usedBeds);
        if (!bed) break;
        const currentGender = roomGender(room);
        const candidate = staffPool.find((a) => {
          if (!currentGender) return true;
          return a.sexo === currentGender;
        });
        if (!candidate) break;
        addOccupant(room, bed);
        assignments.push({
          id: candidate.id,
          tipo: room.tipo,
          numero: room.numero,
          cama: bed,
          nombre: `${candidate.nombres} ${candidate.apellidos}`,
        });
        staffPool.splice(staffPool.indexOf(candidate), 1);
      }
    }
  }
  assignStaff();

  if (staffPool.length > 0) {
    warnings.push(`${staffPool.length} miembros del staff no pudieron ser asignados a Apartasuites`);
  }

  // 6. Asignar participantes por género
  const women = participantPool.filter((a) => a.sexo === "F");
  const men = participantPool.filter((a) => a.sexo === "M");

  const womenRooms = rooms.filter((r) => r.tipoRaw.toUpperCase().startsWith("CABAÑA"));
  const menRooms = rooms.filter(
    (r) =>
      (r.tipo === "Torres del Sol" && !r.isSuite && r.numero !== "A1") ||
      r.tipo === "Habitaciones Multifamiliares"
  );

  const overflowWomen: any[] = [];
  const overflowMen: any[] = [];

  function assignToRooms(people: any[], roomList: ParsedRoom[], overflow: any[]) {
    const sortedRooms = roomList.sort((a, b) => {
      const an = parseInt(a.numero) || 0;
      const bn = parseInt(b.numero) || 0;
      return an - bn;
    });

    let personIndex = 0;
    for (const room of sortedRooms) {
      while (personIndex < people.length) {
        const bed = nextBed(room, usedBeds);
        if (!bed) break;
        const person = people[personIndex++];
        addOccupant(room, bed);
        assignments.push({
          id: person.id,
          tipo: room.tipo,
          numero: room.numero,
          cama: bed,
          nombre: `${person.nombres} ${person.apellidos}`,
        });
      }
    }
    while (personIndex < people.length) {
      overflow.push(people[personIndex++]);
    }
  }

  assignToRooms(women, womenRooms, overflowWomen);
  assignToRooms(men, menRooms, overflowMen);

  // 7. Overflow: hasta 3 camas spare de Apartasuites, mismos sexos
  const apartasuiteSpareRooms = rooms.filter(
    (r) => r.tipo === "Apartasuite" && !["S1", "S2"].includes(r.numero)
  );
  let spareUsed = 0;
  const MAX_SPARE = 3;

  function assignSpare(overflow: any[]) {
    while (overflow.length > 0 && spareUsed < MAX_SPARE) {
      const person = overflow[0];
      const room = apartasuiteSpareRooms.find((r) => {
        const bed = nextBed(r, usedBeds);
        if (!bed) return false;
        const g = roomGender(r);
        return !g || g === person.sexo;
      });
      if (!room) break;
      const bed = nextBed(room, usedBeds)!;
      addOccupant(room, bed);
      assignments.push({
        id: person.id,
        tipo: room.tipo,
        numero: room.numero,
        cama: bed,
        nombre: `${person.nombres} ${person.apellidos}`,
      });
      overflow.shift();
      spareUsed++;
    }
  }

  assignSpare(overflowWomen);
  assignSpare(overflowMen);

  // 8. Restante del overflow en Suites de pareja (mismo sexo, 2 por cama)
  const suiteRooms = rooms.filter((r) => r.isSuite);

  function assignSuites(overflow: any[]) {
    while (overflow.length > 0) {
      const room = suiteRooms.find((r) => {
        const bed = nextBed(r, usedBeds);
        if (!bed) return false;
        const g = roomGender(r);
        return !g || g === overflow[0].sexo;
      });
      if (!room) break;
      const bed = nextBed(room, usedBeds)!;
      const person1 = overflow.shift()!;
      addOccupant(room, bed);
      assignments.push({
        id: person1.id,
        tipo: room.tipo,
        numero: `Suite ${room.numero}`,
        cama: bed,
        nombre: `${person1.nombres} ${person1.apellidos}`,
      });
      if (overflow.length > 0 && overflow[0].sexo === person1.sexo) {
        const person2 = overflow.shift()!;
        addOccupant(room, bed);
        assignments.push({
          id: person2.id,
          tipo: room.tipo,
          numero: `Suite ${room.numero}`,
          cama: bed,
          nombre: `${person2.nombres} ${person2.apellidos}`,
        });
      }
    }
  }

  assignSuites(overflowWomen);
  assignSuites(overflowMen);

  // 9. Reporte
  console.log("\n--- Resumen ---");
  console.log("Asistentes activos:", asistentes.length);
  console.log("Asignaciones fijas resueltas:", assignedIds.size);
  console.log("Mujeres sin cama:", overflowWomen.length);
  console.log("Hombres sin cama:", overflowMen.length);
  console.log("Staff sin asignar:", staffPool.length);
  console.log("Total asignado:", assignments.length);

  if (warnings.length > 0) {
    console.log("\n⚠️ Advertencias:");
    warnings.forEach((w) => console.log(" -", w));
  }

  if (overflowWomen.length > 0 || overflowMen.length > 0 || staffPool.length > 0) {
    console.log("\n❌ No todos los asistentes pudieron ser asignados. Revisa las advertencias.");
    process.exit(1);
  }

  // 10. Actualizar BD
  if (!DRY_RUN) {
    console.log("\n💾 Actualizando base de datos...");
    for (const a of assignments) {
      const { error } = await supabase
        .from("asistentes")
        .update({
          tipo_alojamiento: a.tipo,
          numero_habitacion: a.numero,
          cama_asignada: a.cama,
        } as any)
        .eq("id", a.id);
      if (error) {
        console.error(`Error actualizando ${a.nombre}:`, error);
      }
    }
    console.log("✅ Base de datos actualizada.");
  }

  // 11. Generar Excel de reporte
  const reportRows = assignments.map((a) => {
    const person = (asistentes as any[]).find((p) => p.id === a.id);
    return {
      Tipo: a.tipo,
      Habitacion: a.numero,
      Cama: a.cama,
      Nombres: person?.nombres || "",
      Apellidos: person?.apellidos || "",
      Cedula: person?.cedula || "",
      Sexo: person?.sexo || "",
      Rol: person?.rol || "",
    };
  });

  const wbOut = XLSX.utils.book_new();
  const wsOut = XLSX.utils.json_to_sheet(reportRows);
  XLSX.utils.book_append_sheet(wbOut, wsOut, "Asignaciones");

  // Resumen por habitación
  const roomSummary = rooms
    .filter((r) => !r.tipoRaw.toUpperCase().includes("SUITE DE PAREJA") || r.fixedNames.length > 0 || (usedBeds.get(r.numero)?.length || 0) > 0)
    .map((r) => {
      const occ = assignments.filter((a) => a.numero === r.numero || a.numero === `Suite ${r.numero}`);
      return {
        Tipo: r.tipo,
        Habitacion: r.numero,
        Capacidad: r.capacidad,
        Ocupados: occ.length,
        Libres: r.capacidad - occ.length,
        Huespedes: occ.map((o) => o.nombre).join(", "),
      };
    });
  const wsSummary = XLSX.utils.json_to_sheet(roomSummary);
  XLSX.utils.book_append_sheet(wbOut, wsSummary, "Resumen");

  const outPath = `asignaciones-habitaciones-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wbOut, outPath);
  console.log(`📄 Reporte generado: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
