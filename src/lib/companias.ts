export type Asistente = any;

export const PAREJAS_CONSEJEROS: { numero: number; hombre: string; mujer: string }[] = [
  { numero: 1, hombre: "Ronald David Gallego Pineda", mujer: "Damarys Punce" },
  { numero: 2, hombre: "Camilo Morales", mujer: "Mariana Estrada" },
  { numero: 3, hombre: "Oscar Romero", mujer: "Elizabeth Penagos" },
  { numero: 4, hombre: "Maicol Saavedra", mujer: "Ximena Guarnizo" },
  { numero: 5, hombre: "Dylan Muñoz", mujer: "Alejandra Sarmiento" },
  { numero: 6, hombre: "Carlos Espinel", mujer: "Dayana Acosta" },
  { numero: 7, hombre: "Jimmy Combita", mujer: "Danielle Vargas" },
  { numero: 8, hombre: "Yeison Celis", mujer: "Camila Huertas" },
];

function normalizeFullName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export async function asignarConsejeros(supabase: any) {
  const { data: consejeros, error } = await supabase
    .from("asistentes")
    .select("id, nombres, apellidos, sexo, rol")
    .eq("rol", "consejero");

  if (error) throw error;
  if (!consejeros || consejeros.length === 0) {
    console.log("⚠️ No hay consejeros para asignar.");
    return;
  }

  const byName = new Map<string, Asistente>();
  for (const c of consejeros) {
    const full = normalizeFullName(`${c.nombres} ${c.apellidos}`);
    byName.set(full, c);
  }

  for (const pareja of PAREJAS_CONSEJEROS) {
    const hombreName = normalizeFullName(pareja.hombre);
    const mujerName = normalizeFullName(pareja.mujer);
    const hombre = byName.get(hombreName);
    const mujer = byName.get(mujerName);

    if (!hombre || !mujer) {
      console.warn(`⚠️ No se encontró la pareja de la compañía ${pareja.numero}: ${pareja.hombre} / ${pareja.mujer}`);
      continue;
    }

    await supabase
      .from("asistentes")
      .update({ compania_numero: pareja.numero, compania_pareja_id: mujer.id })
      .eq("id", hombre.id);

    await supabase
      .from("asistentes")
      .update({ compania_numero: pareja.numero, compania_pareja_id: hombre.id })
      .eq("id", mujer.id);

    console.log(`✅ Compañía ${pareja.numero}: ${hombre.nombres} + ${mujer.nombres}`);
  }
}

function dividirEnGrupos<T>(lista: T[], numGrupos: number): T[][] {
  const grupos: T[][] = Array.from({ length: numGrupos }, () => []);
  if (lista.length === 0) return grupos;
  const porGrupo = Math.ceil(lista.length / numGrupos);
  for (let i = 0; i < lista.length; i++) {
    const grupoIndex = Math.min(Math.floor(i / porGrupo), numGrupos - 1);
    grupos[grupoIndex].push(lista[i]);
  }
  return grupos;
}

export async function generarCompanias(
  supabase: any,
  options: { soloNuevos?: boolean } = {}
) {
  let query = supabase
    .from("asistentes")
    .select("id, nombres, apellidos, sexo, fecha_nacimiento, compania_numero, rol")
    .eq("rol", "participante");

  if (options.soloNuevos) {
    query = query.is("compania_numero", null);
  }

  const { data: participantes, error } = await query;

  if (error) throw error;
  if (!participantes || participantes.length === 0) {
    console.log("✅ No hay participantes pendientes por asignar a compañías.");
    return;
  }

  // Ordenar por edad: más jóvenes primero (fecha de nacimiento más reciente)
  const sorted = [...participantes].sort((a, b) => {
    const da = a.fecha_nacimiento ? new Date(a.fecha_nacimiento).getTime() : 0;
    const db = b.fecha_nacimiento ? new Date(b.fecha_nacimiento).getTime() : 0;
    return db - da;
  });

  // Separar por género para mantener equilibrio dentro de cada compañía
  const hombres = sorted.filter((p) => (p.sexo || "").toLowerCase() === "m");
  const mujeres = sorted.filter((p) => (p.sexo || "").toLowerCase() === "f");

  // Dividir cada género en 8 grupos contiguos por edad.
  // Grupo 0 → compañía 1 (más jóvenes), grupo 7 → compañía 8 (mayores).
  const gruposHombres = dividirEnGrupos(hombres, 8);
  const gruposMujeres = dividirEnGrupos(mujeres, 8);

  const assignments = new Map<string, number>();
  for (let i = 0; i < 8; i++) {
    const compania = i + 1;
    for (const p of gruposHombres[i] || []) assignments.set(p.id, compania);
    for (const p of gruposMujeres[i] || []) assignments.set(p.id, compania);
  }

  // Aplicar asignaciones
  for (const [id, compania] of assignments) {
    const { error: updateError } = await supabase
      .from("asistentes")
      .update({ compania_numero: compania })
      .eq("id", id);

    if (updateError) {
      console.error(`❌ Error asignando compañía a ${id}:`, updateError.message);
    }
  }

  console.log(`✅ Se asignaron ${assignments.size} participantes a compañías.`);
}
