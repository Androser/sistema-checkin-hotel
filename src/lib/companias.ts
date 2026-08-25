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

  // Ordenar por edad ascendente: más jóvenes primero
  const sorted = [...participantes].sort((a, b) => {
    const da = a.fecha_nacimiento ? new Date(a.fecha_nacimiento).getTime() : 0;
    const db = b.fecha_nacimiento ? new Date(b.fecha_nacimiento).getTime() : 0;
    return db - da; // más jóvenes primero (fecha más reciente)
  });

  // Separar por género
  const hombres = sorted.filter((p) => (p.sexo || "").toLowerCase() === "m");
  const mujeres = sorted.filter((p) => (p.sexo || "").toLowerCase() === "f");

  // Crear asignaciones
  const assignments = new Map<string, number>();

  function assign(list: Asistente[], startCompania: number, direction: number) {
    let compania = startCompania;
    for (const p of list) {
      assignments.set(p.id, compania);
      compania += direction;
      if (compania < 1) compania = 8;
      if (compania > 8) compania = 1;
    }
  }

  // Asignar hombres de más joven a compañía 1, más viejo a compañía 8
  assign(hombres, 1, 1);
  // Asignar mujeres de más joven a compañía 1, más viejo a compañía 8
  assign(mujeres, 1, 1);

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
