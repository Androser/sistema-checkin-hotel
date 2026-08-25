import { AsistenteInsert } from "./types";

export interface ParseDebugInfo {
  raw: string;
  columns: number;
  firstColumns: string[];
}

export interface ParseResult {
  rows: Partial<AsistenteInsert>[];
  errors: string[];
  debug?: ParseDebugInfo[];
}

export type DuplicateAction = "update" | "skip" | "duplicate";

export interface DuplicateMatch {
  existing: any;
  matchedBy: "cédula" | "celular" | "nombre";
  action: DuplicateAction;
}

export interface ParsedRow {
  row: Partial<AsistenteInsert>;
  match: DuplicateMatch | null;
}

function removeAccents(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeName(value: string) {
  return removeAccents(value.toLowerCase()).replace(/\s+/g, " ").trim();
}

export function normalizeId(value: string) {
  return value.replace(/\D/g, "").trim();
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "").trim();
  if (digits.length === 10 && !digits.startsWith("57")) {
    return `57${digits}`;
  }
  return digits;
}

export function findDuplicates(
  rows: Partial<AsistenteInsert>[],
  existing: any[]
): ParsedRow[] {
  return rows.map((row) => {
    const cedula = normalizeId(row.cedula || "");
    const celular = normalizePhone(row.celular || "");
    const name = normalizeName(`${row.nombres || ""} ${row.apellidos || ""}`);

    for (const ex of existing) {
      if (cedula && normalizeId(ex.cedula || "") === cedula) {
        return { row, match: { existing: ex, matchedBy: "cédula", action: "skip" } };
      }
      if (celular && normalizePhone(ex.celular || "") === celular) {
        return { row, match: { existing: ex, matchedBy: "celular", action: "skip" } };
      }
      const existingName = normalizeName(`${ex.nombres || ""} ${ex.apellidos || ""}`);
      if (existingName && existingName === name && name.length > 3) {
        return { row, match: { existing: ex, matchedBy: "nombre", action: "skip" } };
      }
    }

    return { row, match: null };
  });
}

export function hasMeaningfulChanges(
  existing: any,
  row: Partial<AsistenteInsert>
): boolean {
  const keys = Object.keys(row) as (keyof AsistenteInsert)[];
  for (const key of keys) {
    const a = String(existing[key] ?? "").trim();
    const b = String(row[key] ?? "").trim();
    if (a !== b) return true;
  }
  return false;
}

/**
 * Parsea una o varias filas copiadas desde una tabla (Excel, Forms, etc.)
 * usando tabulaciones como separador de columnas y saltos de línea como separador de filas.
 *
 * Soporta dos formatos:
 * - 23 columnas (con ID, Start time, Completion time al inicio)
 * - 20 columnas (sin las 3 primeras columnas)
 */
export function parseTablaPegada(text: string): ParseResult {
  let rawRows = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Si la primera fila parece header, saltarla
  if (rawRows.length > 0) {
    const firstColumns = rawRows[0].split("\t").map((c) => c.trim());
    if (looksLikeHeaderRow(firstColumns)) {
      rawRows = rawRows.slice(1);
    }
  }

  const rows: Partial<AsistenteInsert>[] = [];
  const errors: string[] = [];
  const debug: ParseDebugInfo[] = [];

  rawRows.forEach((line, index) => {
    const columns = line.split("\t").map((c) => c.trim());
    const parsed = parseFilaTabulada(line, { debug: false });

    debug.push({
      raw: line,
      columns: columns.length,
      firstColumns: columns.slice(0, 6),
    });

    if (!parsed) {
      errors.push(
        `Fila ${index + 1}: no se pudo reconocer el formato. ` +
          `Tiene ${columns.length} columnas. Primeras: ${columns
            .slice(0, 5)
            .map((c) => `"${c}"`)
            .join(", ")}`
      );
      return;
    }
    if (!parsed.nombres && !parsed.apellidos) {
      errors.push(
        `Fila ${index + 1}: faltan nombres y apellidos. ` +
          `Primeras columnas: ${columns
            .slice(0, 5)
            .map((c) => `"${c}"`)
            .join(", ")}`
      );
      return;
    }
    rows.push(parsed);
  });

  return { rows, errors, debug };
}

function looksLikeTimestamp(value: string): boolean {
  return /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(value) && value.includes(":");
}

function looksLikeHeaderRow(columns: string[]): boolean {
  const first = columns[0].toLowerCase();
  return first.includes("id") && first.includes("start");
}

function parseWithOffset(
  columns: string[],
  offset: number
): Partial<AsistenteInsert> | null {
  if (columns.length < offset + 10) return null;

  const get = (index: number) => columns[index + offset] || "";

  const nombres = get(0);
  const apellidos = get(1);
  const nombrePreferencia = get(2);
  const pagoRolRaw = get(4);
  const estaca = get(5);
  const fechaNacimientoRaw = get(6);
  const sexoRaw = get(7);
  const celular = get(8);
  const correo = get(9);
  const barrioRama = get(13);
  const grupoSanguineoRaw = get(14);
  const enfermedadCronicaRaw = get(15);
  const tratamientoMedicoRaw = get(16);
  const seguroMedico = get(17);
  const contactoNombre = get(18);
  const contactoTelefono = get(19);

  if (!nombres && !apellidos && !estaca) return null;

  const { rol, rol_descripcion } = parseRol(pagoRolRaw);

  return {
    nombres: nombres || nombrePreferencia,
    apellidos,
    cedula: null,
    documento_pendiente: true,
    rol,
    rol_descripcion,
    estaca_distrito_mision: estaca,
    fecha_nacimiento: parseFecha(fechaNacimientoRaw),
    sexo: parseSexo(sexoRaw),
    celular: limpiarTelefono(celular),
    correo,
    barrio: barrioRama || null,
    grupo_sanguineo: parseGrupoSanguineo(grupoSanguineoRaw),
    eps_seguro: seguroMedico || null,
    enfermedad_cronica: parseSiNoTexto(enfermedadCronicaRaw),
    tratamiento_medico: parseSiNoTexto(tratamientoMedicoRaw),
    contacto_emergencia_nombre: contactoNombre,
    contacto_emergencia_telefono: limpiarTelefono(contactoTelefono),
  };
}

function scoreParse(result: Partial<AsistenteInsert> | null): number {
  if (!result) return 0;
  let score = 0;
  if (result.nombres) score += 2;
  if (result.apellidos) score += 2;
  if (result.estaca_distrito_mision) score += 1;
  if (result.sexo) score += 1;
  if (result.celular) score += 1;
  return score;
}

export function parseFilaTabulada(
  text: string,
  options: { debug?: boolean } = {}
): Partial<AsistenteInsert> | null {
  const columns = text.split("\t").map((c) => c.trim());

  if (columns.length < 10) {
    if (options.debug) {
      console.warn("[parseFilaTabulada] menos de 10 columnas:", columns);
    }
    return null;
  }

  // Intentar ambos offsets y quedarse con el que produzca mejor parseo.
  const candidates = [
    { offset: 3, result: parseWithOffset(columns, 3) },
    { offset: 0, result: parseWithOffset(columns, 0) },
  ];

  candidates.sort((a, b) => scoreParse(b.result) - scoreParse(a.result));
  const best = candidates[0];

  if (options.debug) {
    console.log("[parseFilaTabulada] columnas:", columns.length, "candidatos:", candidates);
  }

  return best.result;
}

function parseFecha(value: string): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return null;
}

function parseRol(value: string): { rol: string; rol_descripcion: string | null } {
  const lower = value.toLowerCase();
  if (lower.includes("consejero")) return { rol: "consejero", rol_descripcion: null };
  if (lower.includes("staff") || lower.includes("coordinador")) {
    return { rol: "coordinador", rol_descripcion: null };
  }
  return { rol: "participante", rol_descripcion: null };
}

function parseSexo(value: string): string | null {
  const lower = value.toLowerCase();
  if (lower.includes("masculino") || lower === "m") return "M";
  if (lower.includes("femenino") || lower === "f") return "F";
  return null;
}

function parseGrupoSanguineo(value: string): string | null {
  if (!value) return null;
  return value.replace(/\s+/g, "").toUpperCase();
}

function parseSiNoTexto(value: string): string | null {
  if (!value) return null;
  const lower = value.toLowerCase().trim();
  if (lower === "no" || lower === "no aplica" || lower === "ninguna") return null;
  return value;
}

function limpiarTelefono(value: string): string | null {
  if (!value) return null;
  return value.replace(/\s+/g, "").replace(/[^\d+]/g, "");
}
