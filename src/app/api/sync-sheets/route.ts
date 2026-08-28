import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = "TODOS ALOJAMIENTOS";

// Fuzzy match logic
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
  candidates: { id: string; fullName: string; cedula?: string | null }[],
  minScore = 0.45
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

function mapTipo(tipoRaw: string) {
  const t = tipoRaw.toUpperCase().replace(/\s+/g, " ");
  if (t.includes("CABAÑA")) return "Cabaña";
  if (t.includes("APARTA SUITE")) return "Apartasuite";
  if (t.includes("APARTAMENTO TORRES")) return "Torres del Sol";
  if (t.includes("HABITACION MULTIFAMILIAR")) return "Habitaciones Multifamiliares";
  if (t.includes("SUITE DE PAREJA")) return "Torres del Sol";
  return tipoRaw;
}

type RoomBlock = {
  rowStart: number;
  tipoRaw: string;
  tipo: string;
  numero: string;
  capacidad: number;
  isSuite: boolean;
};

function parseRoomBlocks(rows: any[][]): RoomBlock[] {
  const rooms: RoomBlock[] = [];
  let currentTipoRaw = "";
  let currentTipo = "";
  let current: RoomBlock | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    const tipoRaw = row[0];
    const hab = row[2];
    const nombreRaw = row[3];
    
    const tipoStr = String(tipoRaw || "").trim();
    const habStr = String(hab || "").trim();
    const nombreStr = String(nombreRaw || "").trim();

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
      currentTipo = mapTipo(tipoStr);
    }

    if (habStr && !nombreStr.toLowerCase().includes("huespedes")) {
      if (current) rooms.push(current);
      current = {
        rowStart: i + 1,
        tipoRaw: currentTipoRaw,
        tipo: currentTipo,
        numero: habStr,
        capacidad: 0,
        isSuite: currentTipoRaw.toUpperCase().includes("SUITE DE PAREJA"),
      };
    }

    if (current) current.capacidad++;
  }
  if (current) rooms.push(current);
  return rooms;
}

async function getSheetsClient() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  let credentials: any;
  if (keyPath) {
    const resolvedPath = path.isAbsolute(keyPath)
      ? keyPath
      : path.join(process.cwd(), keyPath);
    if (fs.existsSync(resolvedPath)) {
      credentials = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
    }
  }
  if (!credentials && keyJson) {
    credentials = JSON.parse(keyJson);
  }

  if (!credentials) {
    throw new Error("No Google credentials configured.");
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (!supabaseUrl || !serviceRoleKey || !SHEET_ID) {
      return NextResponse.json(
        { error: "Configuration variables missing." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const sheets = await getSheetsClient();

    // Fetch active attendees from DB
    const { data: asistentes, error: dbErr } = await supabase
      .from("asistentes")
      .select("id, nombres, apellidos, cedula, sexo, rol, tipo_alojamiento, numero_habitacion, cama_asignada")
      .eq("cancelado", false);

    if (dbErr || !asistentes) {
      return NextResponse.json({ error: "Failed to read database." }, { status: 500 });
    }

    // Fetch Google Sheet values
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:E`,
    });
    const rows = response.data.values || [];
    const rooms = parseRoomBlocks(rows);

    if (action === "import") {
      // 1. Google Sheets -> Supabase
      const candidates = asistentes.map((a) => ({
        id: a.id,
        fullName: `${a.nombres} ${a.apellidos}`,
        cedula: a.cedula,
      }));

      const updates: { id: string; tipo_alojamiento: string | null; numero_habitacion: string | null; cama_asignada: string | null; cedula?: string }[] = [];
      const assignedIds = new Set<string>();

      for (const room of rooms) {
        const dbNumero = room.isSuite ? `Suite ${room.numero}` : room.numero;

        for (let i = 0; i < room.capacidad; i++) {
          const sheetRow = room.rowStart + i;
          const cama = String(i + 1);
          const rowData = rows[sheetRow - 1]; // 0-based
          const nombreRaw = rowData && rowData[3] ? String(rowData[3]).trim() : "";
          const docRaw = rowData && rowData[4] ? String(rowData[4]).trim() : "";

          if (nombreRaw && !nombreRaw.toLowerCase().includes("huespedes") && !nombreRaw.toLowerCase().includes("documento")) {
            // Split name and doc (supports double bed assignments)
            const names = nombreRaw.split(/\s*[-–/]\s*|\s*\n\s*/).map((s) => s.trim()).filter(Boolean);
            const docs = docRaw.split(/\s*[-–/]\s*|\s*\n\s*/).map((s) => s.trim()).filter(Boolean);

            for (let j = 0; j < names.length; j++) {
              const name = names[j];
              const doc = docs[j] || "";

              // Try matching by doc first, then fuzzy match name
              let matched: { id: any; fullName: string; cedula?: any } | null | undefined =
                candidates.find((c) => doc && c.cedula === doc.replace(/\D/g, "").trim());
              if (!matched) {
                const fuzzy = findBestMatch(name, candidates, 0.45);
                if (fuzzy) matched = { id: fuzzy.id, fullName: fuzzy.fullName };
              }

              if (matched) {
                assignedIds.add(matched.id);
                const updatePayload: any = {
                  id: matched.id,
                  tipo_alojamiento: room.tipo,
                  numero_habitacion: dbNumero,
                  cama_asignada: cama,
                };
                if (doc) {
                  updatePayload.cedula = doc.replace(/\D/g, "").trim();
                }
                updates.push(updatePayload);
              }
            }
          }
        }
      }

      // Also identify anyone who was unassigned (present in DB with assignments, but not matched in the Sheet)
      for (const a of asistentes) {
        if (!assignedIds.has(a.id) && (a.tipo_alojamiento || a.numero_habitacion)) {
          updates.push({
            id: a.id,
            tipo_alojamiento: null,
            numero_habitacion: null,
            cama_asignada: null,
          });
        }
      }

      // Run database updates in parallel
      for (const upd of updates) {
        const payload: any = {
          tipo_alojamiento: upd.tipo_alojamiento,
          numero_habitacion: upd.numero_habitacion,
          cama_asignada: upd.cama_asignada,
        };
        if (upd.cedula) {
          payload.cedula = upd.cedula;
        }
        await supabase.from("asistentes").update(payload).eq("id", upd.id);
      }

      return NextResponse.json({
        success: true,
        message: `Importados ${updates.filter(u => u.tipo_alojamiento !== null).length} asignaciones y desasignados ${updates.filter(u => u.tipo_alojamiento === null).length} asistentes.`,
      });

    } else if (action === "export") {
      // 2. Supabase -> Google Sheets (incorporando cédulas actualizadas en la DB)
      const ocupantesPorHabitacion = new Map<string, { cama: string; personas: any[] }[]>();
      for (const a of asistentes) {
        const key = `${a.tipo_alojamiento}||${a.numero_habitacion}`;
        if (!ocupantesPorHabitacion.has(key)) ocupantesPorHabitacion.set(key, []);
        const camas = ocupantesPorHabitacion.get(key)!;
        let camaEntry = camas.find((c) => c.cama === a.cama_asignada);
        if (!camaEntry) {
          camaEntry = { cama: a.cama_asignada, personas: [] };
          camas.push(camaEntry);
        }
        camaEntry.personas.push(a);
      }

      const sheetUpdates: { range: string; values: string[][] }[] = [];

      for (const room of rooms) {
        const dbNumero = room.isSuite ? `Suite ${room.numero}` : room.numero;
        const key = `${room.tipo}||${dbNumero}`;
        const camas = ocupantesPorHabitacion.get(key) || [];
        camas.sort((a, b) => Number(a.cama) - Number(b.cama));

        for (let i = 0; i < room.capacidad; i++) {
          const sheetRow = room.rowStart + i;
          const cama = String(i + 1);
          const entry = camas.find((c) => c.cama === cama);
          const personas = entry ? entry.personas : [];
          const nombre = personas.map((p) => `${p.nombres} ${p.apellidos}`).join(" - ") || "";
          const documento = personas.map((p) => p.cedula || "").filter(Boolean).join(" / ") || "";
          sheetUpdates.push({
            range: `${SHEET_NAME}!D${sheetRow}:E${sheetRow}`,
            values: [[nombre, documento]],
          });
        }
      }

      // Clear columns D/E first
      const lastRow = rooms[rooms.length - 1].rowStart + rooms[rooms.length - 1].capacidad + 5;
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!D4:E${lastRow}`,
      });

      // Write changes in batches of 50
      for (let i = 0; i < sheetUpdates.length; i += 50) {
        const batch = sheetUpdates.slice(i, i + 50);
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: SHEET_ID,
          requestBody: {
            valueInputOption: "USER_ENTERED",
            data: batch,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Google Sheets actualizado con los datos actuales de la base de datos.",
      });

    } else {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }
  } catch (err: any) {
    console.error("Error in sync-sheets API:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
