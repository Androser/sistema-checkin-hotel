"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Users, Send, FileDown } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAsistentes } from "@/hooks/useAsistentes";
import { Asistente, EstadoCheckinFilter } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { AsistenteFilters } from "@/components/asistentes/AsistenteFilters";
import { AsistenteTable } from "@/components/asistentes/AsistenteTable";
import { AsistenteCard } from "@/components/asistentes/AsistenteCard";
import { AsistenteModal } from "@/components/asistentes/AsistenteModal";
import { FichaMedicaModal } from "@/components/asistentes/FichaMedicaModal";
import { ReenviarQrModal } from "@/components/asistentes/ReenviarQrModal";
import { BulkSendModal } from "@/components/asistentes/BulkSendModal";
import { CompaniaWhatsappCard } from "@/components/asistentes/CompaniaWhatsappCard";
import { createClient } from "@/lib/supabase/client";
import { formatFullName } from "@/lib/utils";
import { asignarConsejeros, generarCompanias } from "@/lib/companias";

export default function AsistentesPage() {
  const { asistentes, loading, error, refetch } = useAsistentes();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [estaca, setEstaca] = useState("");
  const [estado, setEstado] = useState<EstadoCheckinFilter>("todos");
  const [alojamiento, setAlojamiento] = useState("");
  const [rol, setRol] = useState("");
  const [compania, setCompania] = useState("");
  const [cancelado, setCancelado] = useState("activos");
  const [generating, setGenerating] = useState(false);

  type SortField =
    | "estado"
    | "nombre"
    | "estaca"
    | "sexo"
    | "rol"
    | "compania"
    | "habitacion"
    | "cedula";
  type SortDirection = "asc" | "desc";
  const [sort, setSort] = useState<{ field: SortField; direction: SortDirection }>({
    field: "nombre",
    direction: "asc",
  });

  const handleSort = (field: SortField) => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Leer filtro de compañía desde URL (usado por "Ver miembros" en /companias)
  useEffect(() => {
    const companiaFromUrl = searchParams.get("compania");
    if (companiaFromUrl) {
      setCompania(companiaFromUrl);
    }
  }, [searchParams]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Asistente | null>(null);
  const [medicalOpen, setMedicalOpen] = useState(false);
  const [medicalAsistente, setMedicalAsistente] = useState<Asistente | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrAsistente, setQrAsistente] = useState<Asistente | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const estacas = useMemo(
    () => Array.from(new Set(asistentes.map((a) => a.estaca_distrito_mision))).sort(),
    [asistentes]
  );

  const activeAsistentes = useMemo(
    () => asistentes.filter((a) => !a.cancelado),
    [asistentes]
  );

  const cedulaStats = useMemo(() => {
    const total = activeAsistentes.length;
    const conCedula = activeAsistentes.filter(
      (a) => a.cedula && a.cedula.trim() !== ""
    ).length;
    const porCompania = [1, 2, 3, 4, 5, 6, 7, 8].map((numero) => {
      const miembros = activeAsistentes.filter(
        (a) => a.compania_numero === numero
      );
      const conCedulaComp = miembros.filter(
        (a) => a.cedula && a.cedula.trim() !== ""
      ).length;
      return {
        numero,
        total: miembros.length,
        conCedula: conCedulaComp,
        porcentaje: miembros.length > 0 ? Math.round((conCedulaComp / miembros.length) * 100) : 0,
      };
    });
    return {
      total,
      conCedula,
      pendientes: total - conCedula,
      porcentaje: total > 0 ? Math.round((conCedula / total) * 100) : 0,
      porCompania,
    };
  }, [activeAsistentes]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    const result = asistentes.filter((a) => {
      const matchesSearch =
        !term ||
        a.nombres.toLowerCase().includes(term) ||
        a.apellidos.toLowerCase().includes(term) ||
        (a.cedula || "").toLowerCase().includes(term);
      const matchesEstaca = !estaca || a.estaca_distrito_mision === estaca;
      const matchesEstado =
        estado === "todos" ||
        (estado === "pendientes" && !a.estado_checkin) ||
        (estado === "ingresados" && a.estado_checkin && !a.estado_checkout) ||
        (estado === "checkout" && a.estado_checkout);
      const matchesAlojamiento =
        !alojamiento || a.tipo_alojamiento === alojamiento;
      const matchesRol = !rol || a.rol === rol;
      const matchesCompania =
        !compania || String(a.compania_numero) === compania;
      const matchesCancelado =
        cancelado === "todos" ||
        (cancelado === "activos" && !a.cancelado) ||
        (cancelado === "cancelados" && a.cancelado);
      return (
        matchesSearch &&
        matchesEstaca &&
        matchesEstado &&
        matchesAlojamiento &&
        matchesRol &&
        matchesCompania &&
        matchesCancelado
      );
    });

    result.sort((a, b) => {
      const dir = sort.direction === "asc" ? 1 : -1;
      switch (sort.field) {
        case "estado": {
          const sa = a.estado_checkout ? 2 : a.estado_checkin ? 1 : 0;
          const sb = b.estado_checkout ? 2 : b.estado_checkin ? 1 : 0;
          return (sa - sb) * dir;
        }
        case "nombre":
          return (
            `${a.apellidos} ${a.nombres}`.localeCompare(
              `${b.apellidos} ${b.nombres}`
            ) * dir
          );
        case "estaca":
          return (a.estaca_distrito_mision || "").localeCompare(
            b.estaca_distrito_mision || ""
          ) * dir;
        case "sexo":
          return (a.sexo || "").localeCompare(b.sexo || "") * dir;
        case "rol":
          return (a.rol || "").localeCompare(b.rol || "") * dir;
        case "compania":
          return (
            ((a.compania_numero || 0) - (b.compania_numero || 0)) * dir
          );
        case "habitacion":
          return (
            `${a.tipo_alojamiento || ""} ${a.numero_habitacion || ""}`.localeCompare(
              `${b.tipo_alojamiento || ""} ${b.numero_habitacion || ""}`
            ) * dir
          );
        case "cedula":
          return (a.cedula || "").localeCompare(b.cedula || "") * dir;
        default:
          return 0;
      }
    });

    return result;
  }, [asistentes, search, estaca, estado, alojamiento, rol, compania, cancelado, sort]);

  function cleanData<T extends Record<string, any>>(data: T): T {
    const cleaned = { ...data };
    for (const key in cleaned) {
      if (typeof cleaned[key] === "string" && cleaned[key].trim() === "") {
        (cleaned as any)[key] = null;
      }
    }
    return cleaned;
  }

  const handleSave = async (data: Partial<Asistente>) => {
    setSaveError(null);
    try {
      const cleaned = cleanData(data);
      if (editing) {
        const { error } = await supabase
          .from("asistentes")
          .update(cleaned as any)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("asistentes").insert(cleaned as any);
        if (error) throw error;
      }
      setModalOpen(false);
      setEditing(null);
      refetch();
    } catch (err: any) {
      const message = err?.message || "Error al guardar el asistente.";
      console.error("Error guardando asistente:", err);
      setSaveError(formatSaveError(message));
    }
  };

  const handleSaveMultiple = async (data: {
    insert: Partial<Asistente>[];
    update: { id: string; data: Partial<Asistente> }[];
  }) => {
    setSaveError(null);
    try {
      if (data.insert.length > 0) {
        const cleanedRows = data.insert.map(cleanData);
        const { error } = await supabase.from("asistentes").insert(cleanedRows as any);
        if (error) throw error;
      }

      for (const item of data.update) {
        const cleaned = cleanData(item.data);
        delete (cleaned as any).id;
        const { error } = await supabase
          .from("asistentes")
          .update(cleaned as any)
          .eq("id", item.id);
        if (error) throw error;
      }

      setModalOpen(false);

      // Reasignar consejeros y compañías automáticamente si hubo inserciones
      if (data.insert.length > 0) {
        try {
          await asignarConsejeros(supabase);
          await generarCompanias(supabase, { soloNuevos: true });
        } catch (compErr: any) {
          console.error("Error asignando compañías:", compErr);
        }
      }

      refetch();
    } catch (err: any) {
      const message = err?.message || "Error al guardar los asistentes.";
      console.error("Error guardando asistentes:", err);
      setSaveError(formatSaveError(message));
    }
  };

  function formatSaveError(message: string): string {
    if (message.includes("duplicate key") && message.includes("cedula")) {
      return "Ya existe un asistente con esa cédula. Usa una cédula diferente.";
    }
    if (message.includes("duplicate key")) {
      return "Ya existe un registro con esos datos. Verifica que no estés duplicando información.";
    }
    return message;
  }

  const handleToggleCancelado = async (a: Asistente) => {
    const { error } = await supabase
      .from("asistentes")
      .update({ cancelado: !a.cancelado } as any)
      .eq("id", a.id);
    if (error) {
      console.error("Error cambiando estado cancelado:", error);
      setSaveError("No se pudo cambiar el estado del asistente.");
      return;
    }
    refetch();
  };

  const openEdit = (a: Asistente) => {
    setEditing(a);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openMedical = (a: Asistente) => {
    setMedicalAsistente(a);
    setMedicalOpen(true);
  };

  const openQr = (a: Asistente) => {
    setQrAsistente(a);
    setQrOpen(true);
  };

  const toggleSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(filtered.map((a) => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const selectedAsistentes = useMemo(
    () => activeAsistentes.filter((a) => selectedIds.has(a.id)),
    [activeAsistentes, selectedIds]
  );

  const miembrosCompania = useMemo(() => {
    if (!compania) return [];
    return activeAsistentes.filter((a) => String(a.compania_numero) === compania);
  }, [activeAsistentes, compania]);

  const consejerosFiltrados = useMemo(
    () => miembrosCompania.filter((a) => a.rol === "consejero"),
    [miembrosCompania]
  );

  const participantesFiltrados = useMemo(
    () =>
      miembrosCompania.filter(
        (a) => a.rol !== "consejero" && a.rol !== "coordinador"
      ),
    [miembrosCompania]
  );

  const linkWhatsappCompania = useMemo(
    () => miembrosCompania.find((a) => a.link_whatsapp)?.link_whatsapp || null,
    [miembrosCompania]
  );

  const handleGenerarCompanias = async () => {
    setGenerating(true);
    try {
      await generarCompanias(supabase, { soloNuevos: true });
      refetch();
    } catch (err: any) {
      console.error("Error generando compañías:", err);
      setSaveError(err.message || "Error al generar compañías.");
    } finally {
      setGenerating(false);
    }
  };

  const exportarCSV = () => {
    const headers = [
      "ID",
      "Nombres",
      "Apellidos",
      "Cedula",
      "DocumentoPendiente",
      "EstacaDistritoMision",
      "FechaNacimiento",
      "Sexo",
      "Celular",
      "Correo",
      "Rol",
      "DescripcionRol",
      "Compania",
      "TipoAlojamiento",
      "NumeroHabitacion",
      "CamaAsignada",
      "GrupoSanguineo",
      "EPSSeguro",
      "EnfermedadCronica",
      "TratamientoMedico",
      "Alergias",
      "ContactoEmergenciaNombre",
      "ContactoEmergenciaTelefono",
      "EstadoCheckin",
      "CheckinAt",
      "EstadoCheckout",
      "CheckoutAt",
      "Cancelado",
      "CreatedAt",
      "UpdatedAt",
    ];

    const rows = filtered.map((a) => [
      a.id,
      a.nombres,
      a.apellidos,
      a.cedula || "",
      a.documento_pendiente ? "Si" : "No",
      a.estaca_distrito_mision,
      a.fecha_nacimiento || "",
      a.sexo || "",
      a.celular || "",
      a.correo || "",
      a.rol || "",
      a.rol_descripcion || "",
      a.compania_numero?.toString() || "",
      a.tipo_alojamiento || "",
      a.numero_habitacion || "",
      a.cama_asignada || "",
      a.grupo_sanguineo || "",
      a.eps_seguro || "",
      a.enfermedad_cronica || "",
      a.tratamiento_medico || "",
      a.alergias || "",
      a.contacto_emergencia_nombre || "",
      a.contacto_emergencia_telefono || "",
      a.estado_checkin ? "Si" : "No",
      a.checkin_at || "",
      a.estado_checkout ? "Si" : "No",
      a.checkout_at || "",
      a.cancelado ? "Si" : "No",
      a.created_at,
      a.updated_at,
    ]);

    const escape = (value: string) => {
      const str = String(value ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [headers.join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    link.href = url;
    link.download = `asistentes_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Asistentes
          </h1>
          <p className="text-slate-500">
            Gestiona, filtra y edita la información de cada asistente
          </p>
        </div>
        <div className="flex flex-wrap gap-3 self-start">
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar asistente
          </Button>
          <Button
            variant="outline"
            onClick={() => setBulkOpen(true)}
            disabled={selectedAsistentes.length === 0}
          >
            <Send className="mr-2 h-4 w-4" />
            Enviar QR ({selectedAsistentes.length})
          </Button>
          <Button variant="outline" onClick={exportarCSV}>
            <FileDown className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button
            variant="secondary"
            onClick={handleGenerarCompanias}
            disabled={generating}
          >
            <Users className="mr-2 h-4 w-4" />
            {generating ? "Asignando..." : "Asignar a compañía participantes faltantes"}
          </Button>
        </div>
      </motion.div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          Error al cargar asistentes: {error}
        </div>
      )}

      {saveError && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Error al guardar:</p>
          <p>{saveError}</p>
        </div>
      )}

      <AsistenteFilters
        search={search}
        onSearchChange={setSearch}
        estaca={estaca}
        onEstacaChange={setEstaca}
        estado={estado}
        onEstadoChange={setEstado}
        alojamiento={alojamiento}
        onAlojamientoChange={setAlojamiento}
        rol={rol}
        onRolChange={setRol}
        compania={compania}
        onCompaniaChange={setCompania}
        cancelado={cancelado}
        onCanceladoChange={setCancelado}
        estacas={estacas}
      />

      {/* KPIs de cédulas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Total activos</p>
          <p className="text-2xl font-bold text-slate-900">
            {cedulaStats.total}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Cédulas recolectadas</p>
          <p className="text-2xl font-bold text-emerald-600">
            {cedulaStats.conCedula}
          </p>
          <p className="text-xs text-slate-500">
            {cedulaStats.porcentaje}% del total
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Cédulas pendientes</p>
          <p className="text-2xl font-bold text-amber-600">
            {cedulaStats.pendientes}
          </p>
          <p className="text-xs text-slate-500">
            {cedulaStats.total > 0
              ? Math.round((cedulaStats.pendientes / cedulaStats.total) * 100)
              : 0}% del total
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Progreso total</p>
          <div className="mt-2 h-2.5 w-full rounded-full bg-slate-100">
            <div
              className="h-2.5 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${cedulaStats.porcentaje}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {cedulaStats.porcentaje}%
          </p>
        </div>
      </div>

      {/* Cédulas por compañía */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Cédulas recolectadas por compañía
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cedulaStats.porCompania.map((c) => (
            <div
              key={c.numero}
              className="rounded-lg border border-slate-100 bg-slate-50 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900">
                  Compañía {c.numero}
                </span>
                <span className="text-sm font-bold text-emerald-600">
                  {c.porcentaje}%
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {c.conCedula} de {c.total}
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200">
                <div
                  className="h-1.5 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${c.porcentaje}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {compania && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-amber-900">
            Consejeros de la Compañía {compania}
          </h3>
          {consejerosFiltrados.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {consejerosFiltrados.map((c) => (
                <div key={c.id} className="rounded-lg bg-white p-3 shadow-sm">
                  <p className="font-medium text-slate-900">
                    {formatFullName(c)}
                  </p>
                  <p className="text-sm text-slate-500">
                    {c.estaca_distrito_mision}
                  </p>
                  <p className="text-sm text-slate-600">
                    Celular: {c.celular || "—"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-amber-800">
              No hay consejeros asignados a esta compañía.
            </p>
          )}

          <CompaniaWhatsappCard
            numero={Number(compania)}
            consejeros={consejerosFiltrados}
            participantes={participantesFiltrados}
            linkWhatsapp={linkWhatsappCompania}
            onSaved={refetch}
          />
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          {filtered.length} resultado{filtered.length !== 1 && "s"}
        </span>
      </div>

      <AsistenteTable
        asistentes={filtered}
        selectedIds={selectedIds}
        onSelect={toggleSelect}
        onSelectAll={selectAll}
        onEdit={openEdit}
        onToggleCancelado={handleToggleCancelado}
        onViewMedical={openMedical}
        onResendQr={openQr}
        sort={sort}
        onSort={handleSort}
      />

      <div className="grid gap-4 md:hidden">
        {filtered.map((a, index) => (
          <AsistenteCard
            key={a.id}
            asistente={a}
            index={index}
            selected={selectedIds.has(a.id)}
            onSelect={toggleSelect}
            onEdit={openEdit}
            onToggleCancelado={handleToggleCancelado}
            onViewMedical={openMedical}
            onResendQr={openQr}
          />
        ))}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
          No se encontraron asistentes con los filtros aplicados.
        </div>
      )}

      <AsistenteModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          setSaveError(null);
        }}
        asistente={editing}
        existingAsistentes={asistentes}
        onSave={handleSave}
        onSaveMultiple={handleSaveMultiple}
        saveError={saveError}
      />

      <FichaMedicaModal
        open={medicalOpen}
        onClose={() => setMedicalOpen(false)}
        asistente={medicalAsistente}
      />

      <ReenviarQrModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        asistente={qrAsistente}
      />

      <BulkSendModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        asistentes={selectedAsistentes}
        allAsistentes={asistentes}
      />
    </div>
  );
}
