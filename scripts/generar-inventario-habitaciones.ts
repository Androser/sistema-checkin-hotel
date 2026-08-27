import * as XLSX from "xlsx";
import fs from "fs";

const SHEET_NAME = "TODOS ALOJAMIENTOS";

function mapTipo(tipoRaw: string) {
  const t = tipoRaw.toUpperCase().replace(/\s+/g, " ");
  if (t.includes("CABAÑA")) return "Cabaña";
  if (t.includes("APARTA SUITE")) return "Apartasuite";
  if (t.includes("APARTAMENTO TORRES")) return "Torres del Sol";
  if (t.includes("HABITACION MULTIFAMILIAR")) return "Habitaciones Multifamiliares";
  if (t.includes("SUITE DE PAREJA")) return "Torres del Sol";
  return tipoRaw;
}

type Room = {
  tipo: string;
  numero: string;
  capacidad: number;
  zona: "mujeres" | "hombres" | "staff" | "mixto";
};

function main() {
  const wb = XLSX.readFile("Leo ACOMODACION  FINAL  GRUPO DE 250 PAX  EN  ALOJAMIENTO.xlsx");
  const ws = wb.Sheets[SHEET_NAME];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];

  const rooms: Room[] = [];
  let currentTipoRaw = "";
  let currentTipo = "";
  let current: { tipo: string; numero: string; capacidad: number; isSuite: boolean } | null = null;

  for (let i = 0; i < rows.length; i++) {
    const [tipoRaw, , hab] = rows[i];
    const tipoStr = String(tipoRaw).trim();
    const habStr = String(hab).trim();

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

    if (habStr && currentTipo) {
      if (current) {
        rooms.push({
          tipo: current.tipo,
          numero: current.isSuite ? `Suite ${current.numero}` : current.numero,
          capacidad: current.isSuite ? current.capacidad * 2 : current.capacidad,
          zona: current.isSuite
            ? "mixto"
            : current.tipo === "Cabaña"
            ? "mujeres"
            : current.tipo === "Apartasuite"
            ? "staff"
            : "hombres",
        });
      }
      current = {
        tipo: currentTipo,
        numero: habStr,
        capacidad: 0,
        isSuite: currentTipoRaw.toUpperCase().includes("SUITE DE PAREJA"),
      };
    }

    if (current) current.capacidad++;
  }

  if (current) {
    rooms.push({
      tipo: current.tipo,
      numero: current.isSuite ? `Suite ${current.numero}` : current.numero,
      capacidad: current.isSuite ? current.capacidad * 2 : current.capacidad,
      zona: current.isSuite
        ? "mixto"
        : current.tipo === "Cabaña"
        ? "mujeres"
        : current.tipo === "Apartasuite"
        ? "staff"
        : "hombres",
    });
  }

  // Ajustes manuales según reglas de negocio
  // A1 es staff mujeres que se queda en Torres del Sol
  const a1 = rooms.find((r) => r.tipo === "Torres del Sol" && r.numero === "A1");
  if (a1) a1.zona = "staff";

  const content = `// Generado automáticamente desde scripts/generar-inventario-habitaciones.ts
// No editar manualmente.

export type ZonaHabitacion = "mujeres" | "hombres" | "staff" | "mixto";

export interface Habitacion {
  tipo: string;
  numero: string;
  capacidad: number;
  zona: ZonaHabitacion;
}

export const HABITACIONES: Habitacion[] = ${JSON.stringify(rooms, null, 2)};
`;

  fs.writeFileSync("src/lib/habitaciones.ts", content);
  console.log(`✅ Inventario generado con ${rooms.length} habitaciones.`);
}

main();
