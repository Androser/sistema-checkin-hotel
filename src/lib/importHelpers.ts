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
 * Parsea texto TSV respetando comillas dobles.
 * Permite saltos de línea y tabulaciones dentro de celdas entrecomilladas.
 * Soporta "" como escape para una comilla doble literal.
 */
function parseTSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && nextChar === '"') {
      currentCell += '"';
      i++; // saltar la segunda comilla
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === '\t' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // saltar el \n del \r\n
      }
      currentRow.push(currentCell);
      if (currentRow.some((c) => c.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  // Vaciar lo que quede al final
  currentRow.push(currentCell);
  if (currentRow.some((c) => c.trim().length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Parsea una o varias filas copiadas desde una tabla (Excel, Forms, etc.)
 * usando tabulaciones como separador de columnas.
 *
 * Soporta celdas con saltos de línea si vienen entrecomilladas.
 * Soporta dos formatos:
 * - 23 columnas (con ID, Start time, Completion time al inicio)
 * - 20 columnas (sin las 3 primeras columnas)
 */
export function parseTablaPegada(text: string): ParseResult {
  let rawRows = parseTSV(text).map((row) => row.map((c) => c.trim()));
  rawRows = rawRows.filter((row) => row.some((c) => c.length > 0));

  // Si la primera fila parece header, saltarla
  if (rawRows.length > 0 && looksLikeHeaderRow(rawRows[0])) {
    rawRows = rawRows.slice(1);
  }

  const rows: Partial<AsistenteInsert>[] = [];
  const errors: string[] = [];
  const debug: ParseDebugInfo[] = [];

  rawRows.forEach((columns, index) => {
    const parsed = parseFilaTabulada(columns, { debug: false });

    debug.push({
      raw: columns.join("\t"),
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
  columns: string[],
  options: { debug?: boolean } = {}
): Partial<AsistenteInsert> | null {
  const trimmedColumns = columns.map((c) => c.trim());

  if (trimmedColumns.length < 10) {
    if (options.debug) {
      console.warn("[parseFilaTabulada] menos de 10 columnas:", trimmedColumns);
    }
    return null;
  }

  // Intentar ambos offsets y quedarse con el que produzca mejor parseo.
  const candidates = [
    { offset: 3, result: parseWithOffset(trimmedColumns, 3) },
    { offset: 0, result: parseWithOffset(trimmedColumns, 0) },
  ];

  candidates.sort((a, b) => scoreParse(b.result) - scoreParse(a.result));
  const best = candidates[0];

  if (options.debug) {
    console.log(
      "[parseFilaTabulada] columnas:",
      trimmedColumns.length,
      "candidatos:",
      candidates
    );
  }

  return best.result;
}

function parseFecha(value: string): string | null {
  if (!value) return null;

  // Ya está en formato ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  // Soporta / o - como separador
  const match = value.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match) return null;

  let first = parseInt(match[1], 10);
  let second = parseInt(match[2], 10);
  const year = match[3];

  let day: number;
  let month: number;

  // Detectar formato según valores imposibles:
  // - Si first > 12, first es el día → formato dd/mm/yyyy
  // - Si second > 12, second es el día → formato mm/dd/yyyy
  // - Si ambos <= 12, asumimos dd/mm/yyyy (formato latino)
  if (first > 12 && second <= 12) {
    day = first;
    month = second;
  } else if (second > 12 && first <= 12) {
    day = second;
    month = first;
  } else {
    day = first;
    month = second;
  }

  // Validación básica de rango
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
