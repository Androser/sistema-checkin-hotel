import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";
import * as XLSX from "xlsx";
import { google } from "googleapis";
import fs from "fs";

(globalThis as any).WebSocket = WebSocket;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, serviceRoleKey);

const SHEET_ID = process.env.GOOGLE_SHEET_ID || "1DLC9wBFYh-nIp1XlGTjF2WTSSi_3B_ar";
const SHEET_NAME = "TODOS ALOJAMIENTOS";
const SERVICE_ACCOUNT_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
const SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ");
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
  rowStart: number; // 1-based sheet row where this room starts
  tipoRaw: string;
  tipo: string;
  numero: string;
  capacidad: number;
  isSuite: boolean;
};

function parseRoomBlocks(path: string): RoomBlock[] {
  const wb = XLSX.readFile(path);
  const ws = wb.Sheets[SHEET_NAME];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];

  const rooms: RoomBlock[] = [];
  let currentTipoRaw = "";
  let currentTipo = "";
  let current: RoomBlock | null = null;

  for (let i = 0; i < rows.length; i++) {
    const [tipoRaw, , hab, nombreRaw] = rows[i];
    const tipoStr = String(tipoRaw).trim();
    const habStr = String(hab).trim();
    const nombreStr = String(nombreRaw).trim();

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

async function main() {
  if (!SERVICE_ACCOUNT_PATH && !SERVICE_ACCOUNT_JSON) {
    console.error(
      "❌ Necesitas configurar una cuenta de servicio de Google.\n" +
        "Opciones:\n" +
        '1. Guarda el JSON de la cuenta de servicio en un archivo y define GOOGLE_SERVICE_ACCOUNT_KEY_PATH=ruta/al/archivo.json\n' +
        '2. Pega el contenido JSON en la variable de entorno GOOGLE_SERVICE_ACCOUNT_JSON\n' +
        "3. Comparte el Google Sheet con el email de la cuenta de servicio (lectura/escritura)."
    );
    process.exit(1);
  }

  let credentials: any;
  if (SERVICE_ACCOUNT_PATH && fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));
  } else if (SERVICE_ACCOUNT_JSON) {
    credentials = JSON.parse(SERVICE_ACCOUNT_JSON);
  } else {
    console.error("No se encontró el archivo de credenciales");
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  // 1. Leer asignaciones de la BD
  const { data: asistentes, error: err1 } = await supabase
    .from("asistentes")
    .select("id, nombres, apellidos, cedula, sexo, rol, tipo_alojamiento, numero_habitacion, cama_asignada")
    .eq("cancelado", false);

  if (err1 || !asistentes) {
    console.error("Error leyendo asistentes:", err1);
    process.exit(1);
  }

  // 2. Parsear bloques de habitación del Excel
  const rooms = parseRoomBlocks("Leo ACOMODACION  FINAL  GRUPO DE 250 PAX  EN  ALOJAMIENTO.xlsx");

  // 3. Agrupar asignaciones por habitación y cama
  const ocupantesPorHabitacion = new Map<string, { cama: string; personas: any[] }[]>();
  for (const a of asistentes as any[]) {
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

  // 4. Construir actualizaciones por fila del sheet
  const updates: { range: string; values: string[][] }[] = [];

  for (const room of rooms) {
    const dbNumero = room.isSuite ? `Suite ${room.numero}` : room.numero;
    const key = `${room.tipo}||${dbNumero}`;
    const camas = ocupantesPorHabitacion.get(key) || [];
    // ordenar camas numéricamente
    camas.sort((a, b) => Number(a.cama) - Number(b.cama));

    for (let i = 0; i < room.capacidad; i++) {
      const sheetRow = room.rowStart + i;
      const cama = String(i + 1);
      const entry = camas.find((c) => c.cama === cama);
      const personas = entry ? entry.personas : [];
      const nombre = personas.map((p) => `${p.nombres} ${p.apellidos}`).join(" - ") || "";
      const documento = personas.map((p) => p.cedula || "").filter(Boolean).join(" / ") || "";
      updates.push({
        range: `${SHEET_NAME}!D${sheetRow}:E${sheetRow}`,
        values: [[nombre, documento]],
      });
    }
  }

  // 5. Limpiar columnas D/E desde la fila 4 hasta la última fila con habitaciones + margen
  const lastRow = rooms[rooms.length - 1].rowStart + rooms[rooms.length - 1].capacidad + 5;

  console.log(`🧹 Limpiando D4:E${lastRow}...`);
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!D4:E${lastRow}`,
  });

  console.log(`📝 Escribiendo ${updates.length} filas...`);
  for (const batch of chunk(updates, 50)) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: batch,
      },
    });
  }

  console.log("✅ Google Sheet actualizado.");
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
