"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Users, Send } from "lucide-react";
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
  const [deleteConfirm, setDeleteConfirm] = useState<Asistente | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const estacas = useMemo(
    () => Array.from(new Set(asistentes.map((a) => a.estaca_distrito_mision))).sort(),
    [asistentes]
  );

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
      return (
        matchesSearch &&
        matchesEstaca &&
        matchesEstado &&
        matchesAlojamiento &&
        matchesRol &&
        matchesCompania
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
  }, [asistentes, search, estaca, estado, alojamiento, rol, compania, sort]);

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

  const handleDelete = async (a: Asistente) => {
    await supabase.from("asistentes").delete().eq("id", a.id);
    setDeleteConfirm(null);
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
    () => asistentes.filter((a) => selectedIds.has(a.id)),
    [asistentes, selectedIds]
  );

  const consejerosFiltrados = useMemo(() => {
    if (!compania) return [];
    return asistentes.filter(
      (a) => a.rol === "consejero" && String(a.compania_numero) === compania
    );
  }, [asistentes, compania]);

  const handleGenerarCompanias = async () => {
    setGenerating(true);
    try {
      await generarCompanias(supabase, { soloNuevos: false });
      refetch();
    } catch (err: any) {
      console.error("Error generando compañías:", err);
      setSaveError(err.message || "Error al generar compañías.");
    } finally {
      setGenerating(false);
    }
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
          <Button
            variant="secondary"
            onClick={handleGenerarCompanias}
            disabled={generating}
          >
            <Users className="mr-2 h-4 w-4" />
            {generating ? "Generando..." : "Generar compañías"}
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
        estacas={estacas}
      />

      {compania && consejerosFiltrados.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-amber-900">
            Consejeros de la Compañía {compania}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {consejerosFiltrados.map((c) => (
              <div
                key={c.id}
                className="rounded-lg bg-white p-3 shadow-sm"
              >
                <p className="font-medium text-slate-900">{formatFullName(c)}</p>
                <p className="text-sm text-slate-500">{c.estaca_distrito_mision}</p>
                <p className="text-sm text-slate-600">Celular: {c.celular || "—"}</p>
              </div>
            ))}
          </div>
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
        onDelete={setDeleteConfirm}
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
            onDelete={setDeleteConfirm}
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
      />

      {/* Modal de confirmación de eliminación */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              ¿Eliminar asistente?
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Esta acción no se puede deshacer. Se eliminará a{" "}
              <strong>{formatFullName(deleteConfirm)}</strong>.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancelar
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)}>
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
