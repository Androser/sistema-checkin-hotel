"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ClipboardPaste, Check, Table } from "lucide-react";
import {
  Asistente,
  TIPOS_ALOJAMIENTO,
  SEXOS,
  GRUPOS_SANGUINEOS,
  ROLES,
} from "@/lib/types";
import { formatFullName, calcularEdad } from "@/lib/utils";
import {
  parseTablaPegada,
  findDuplicates,
  hasMeaningfulChanges,
  getMeaningfulChanges,
  findMissingFromSource,
  ParsedRow,
  DuplicateAction,
  MissingRow,
} from "@/lib/importHelpers";

interface AsistenteModalProps {
  open: boolean;
  onClose: () => void;
  asistente: Asistente | null;
  existingAsistentes?: Asistente[];
  onSave: (data: Partial<Asistente>) => void;
  onSaveMultiple?: (data: {
    insert: Partial<Asistente>[];
    update: { id: string; data: Partial<Asistente> }[];
    cancel?: string[];
    delete?: string[];
  }) => void;
  saveError?: string | null;
}

const initialForm = {
  nombres: "",
  apellidos: "",
  cedula: "",
  estaca_distrito_mision: "",
  fecha_nacimiento: "",
  sexo: "",
  celular: "",
  correo: "",
  rol: "",
  rol_descripcion: "",
  compania_numero: "",
  tipo_alojamiento: "",
  numero_habitacion: "",
  cama_asignada: "",
  grupo_sanguineo: "",
  eps_seguro: "",
  enfermedad_cronica: "",
  tratamiento_medico: "",
  alergias: "",
  contacto_emergencia_nombre: "",
  contacto_emergencia_telefono: "",
};

const FIELD_LABELS: Record<string, string> = {
  nombres: "Nombres",
  apellidos: "Apellidos",
  cedula: "Cédula",
  estaca_distrito_mision: "Estaca",
  fecha_nacimiento: "Fecha de nacimiento",
  sexo: "Sexo",
  celular: "Celular",
  correo: "Correo",
  rol: "Rol",
  rol_descripcion: "Descripción del rol",
  compania_numero: "Compañía",
  tipo_alojamiento: "Alojamiento",
  numero_habitacion: "Habitación",
  cama_asignada: "Cama",
  grupo_sanguineo: "Grupo sanguíneo",
  eps_seguro: "EPS/Seguro",
  enfermedad_cronica: "Enfermedad crónica",
  tratamiento_medico: "Tratamiento médico",
  alergias: "Alergias",
  contacto_emergencia_nombre: "Contacto emergencia",
  contacto_emergencia_telefono: "Tel. emergencia",
  barrio: "Barrio",
};

export function AsistenteModal({
  open,
  onClose,
  asistente,
  existingAsistentes,
  onSave,
  onSaveMultiple,
  saveError,
}: AsistenteModalProps) {
  const isEditing = !!asistente;
  const [activeTab, setActiveTab] = useState<"form" | "paste">("form");
  const [form, setForm] = useState<Record<string, string>>(initialForm);
  const [saving, setSaving] = useState(false);

  // Pegar tabla
  const [pasteText, setPasteText] = useState("");
  const [preview, setPreview] = useState<ParsedRow[] | null>(null);
  const [pasteErrors, setPasteErrors] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState<
    { raw: string; columns: number; firstColumns: string[] }[] | null
  >(null);
  const [showDebug, setShowDebug] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [missingRows, setMissingRows] = useState<MissingRow[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: React.ReactNode;
    onConfirm: () => void;
    confirmText?: string;
    variant?: "danger" | "warning" | "default";
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const showConfirm = (
    title: string,
    description: React.ReactNode,
    onConfirm: () => void,
    confirmText = "Confirmar",
    variant: "danger" | "warning" | "default" = "warning"
  ) => {
    setConfirmDialog({
      open: true,
      title,
      description,
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        onConfirm();
      },
      confirmText,
      variant,
    });
  };

  const closeConfirm = () => setConfirmDialog((prev) => ({ ...prev, open: false }));

  useEffect(() => {
    if (saveError) setLocalError(saveError);
  }, [saveError]);

  useEffect(() => {
    if (open) {
      setActiveTab("form");
      setPasteText("");
      setPreview(null);
      setPasteErrors([]);
      setExpandedRows(new Set());
      setMissingRows([]);
      if (asistente) {
        setForm({
          nombres: asistente.nombres || "",
          apellidos: asistente.apellidos || "",
          cedula: asistente.cedula || "",
          estaca_distrito_mision: asistente.estaca_distrito_mision || "",
          fecha_nacimiento: asistente.fecha_nacimiento || "",
          sexo: asistente.sexo || "",
          celular: asistente.celular || "",
          correo: asistente.correo || "",
          rol: asistente.rol || "",
          rol_descripcion: asistente.rol_descripcion || "",
          compania_numero: asistente.compania_numero?.toString() || "",
          tipo_alojamiento: asistente.tipo_alojamiento || "",
          numero_habitacion: asistente.numero_habitacion || "",
          cama_asignada: asistente.cama_asignada || "",
          grupo_sanguineo: asistente.grupo_sanguineo || "",
          eps_seguro: asistente.eps_seguro || "",
          enfermedad_cronica: asistente.enfermedad_cronica || "",
          tratamiento_medico: asistente.tratamiento_medico || "",
          alergias: asistente.alergias || "",
          contacto_emergencia_nombre: asistente.contacto_emergencia_nombre || "",
          contacto_emergencia_telefono: asistente.contacto_emergencia_telefono || "",
        });
      } else {
        setForm(initialForm);
      }
    }
  }, [open, asistente]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setLocalError(null);
    try {
      const data: Record<string, any> = { ...form };
      if (data.compania_numero) {
        data.compania_numero = parseInt(data.compania_numero, 10);
      }
      await onSave(data);
    } finally {
      setSaving(false);
    }
  };

  const handleParse = () => {
    setPasteErrors([]);
    setDebugInfo(null);
    setShowDebug(false);
    setExpandedRows(new Set());
    setMissingRows([]);
    const result = parseTablaPegada(pasteText);
    setDebugInfo(result.debug || null);
    if (result.rows.length === 0) {
      setPasteErrors(
        result.errors.length > 0
          ? result.errors
          : ["No se encontraron filas válidas."]
      );
      setPreview(null);
      return;
    }
    const withDuplicates = findDuplicates(result.rows, existingAsistentes || []);
    const missing = findMissingFromSource(result.rows, existingAsistentes || []);
    setPreview(withDuplicates);
    setMissingRows(missing);
    setPasteErrors(result.errors);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboard = await navigator.clipboard.readText();
      setPasteText(clipboard);
      setPreview(null);
      setPasteErrors([]);
    } catch {
      setPasteErrors([
        "No se pudo acceder al portapapeles. Pega manualmente con Ctrl+V.",
      ]);
    }
  };

  const doSavePasted = async () => {
    if ((!preview || preview.length === 0) && missingRows.length === 0) return;
    if (!onSaveMultiple) return;
    setSaving(true);
    setLocalError(null);
    try {
      const insert: Partial<Asistente>[] = [];
      const update: { id: string; data: Partial<Asistente> }[] = [];
      const cancel: string[] = [];
      const deleteIds: string[] = [];

      for (const item of preview || []) {
        if (!item.match) {
          insert.push({ ...item.row, documento_pendiente: true });
        } else if (item.match.action === "update") {
          // Solo actualizar campos que tengan un valor significativo.
          // Esto evita borrar datos existentes (como cédulas) cuando
          // el pegado no incluye esa información.
          const data: Partial<Asistente> = {};
          for (const [key, value] of Object.entries(item.row)) {
            const isEmpty =
              value === null ||
              value === undefined ||
              (typeof value === "string" && value.trim() === "");
            if (!isEmpty) {
              (data as any)[key] = value;
            }
          }
          update.push({ id: item.match.existing.id, data });
        } else if (item.match.action === "duplicate") {
          insert.push({ ...item.row, documento_pendiente: true });
        }
      }

      for (const item of missingRows) {
        if (item.action === "cancel") {
          cancel.push(item.existing.id);
        } else if (item.action === "delete") {
          deleteIds.push(item.existing.id);
        }
      }

      await onSaveMultiple({ insert, update, cancel, delete: deleteIds });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePasted = () => {
    const cancel = missingRows.filter((m) => m.action === "cancel").length;
    const del = missingRows.filter((m) => m.action === "delete").length;
    if (cancel > 0 || del > 0) {
      showConfirm(
        "Acciones destructivas pendientes",
        <>
          Estás a punto de aplicar{" "}
          <strong>{cancel > 0 ? `${cancel} cancelación(es)` : ""}</strong>
          {cancel > 0 && del > 0 ? " y " : ""}
          <strong>{del > 0 ? `${del} eliminación(es)` : ""}</strong> en la base de datos.
          <br />
          Estos cambios afectan el conteo de asistentes, compañías y reportes. ¿Deseas continuar?
        </>,
        doSavePasted,
        "Sí, guardar cambios",
        "danger"
      );
    } else {
      doSavePasted();
    }
  };

  const setAction = (index: number, action: DuplicateAction) => {
    setPreview((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const item = next[index];
      if (item.match) {
        next[index] = { ...item, match: { ...item.match, action } };
      }
      return next;
    });
  };

  const toggleRow = (index: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const setMissingAction = (index: number, action: MissingRow["action"]) => {
    setMissingRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], action };
      return next;
    });
  };

  const handleMissingActionChange = (
    index: number,
    action: MissingRow["action"]
  ) => {
    if (action === "delete") {
      const a = missingRows[index]?.existing;
      showConfirm(
        "Eliminar asistente",
        <>
          Vas a marcar para <strong>eliminar</strong> a{" "}
          <strong>{a ? formatFullName(a) : "este asistente"}</strong> de la base de datos.
          <br />
          Esta acción borra el registro físicamente. ¿Continuar?
        </>,
        () => setMissingAction(index, "delete"),
        "Sí, eliminar",
        "danger"
      );
    } else {
      setMissingAction(index, action);
    }
  };

  const setAllMissingActions = (action: MissingRow["action"]) => {
    const affected = missingRows.filter(
      (item) => !item.existing.cancelado && item.action !== action
    ).length;
    const apply = () => setMissingRows((prev) => prev.map((item) => ({ ...item, action })));
    if (action === "cancel" && affected > 0) {
      showConfirm(
        "Cancelar todos los faltantes",
        <>
          Se marcarán como cancelados <strong>{affected} asistente(s)</strong> que están en la base de datos pero no en la tabla pegada.
          <br />
          Dejarán de aparecer en conteos, compañías y reportes. ¿Continuar?
        </>,
        apply,
        "Sí, cancelar todos",
        "danger"
      );
    } else if (action === "delete" && affected > 0) {
      showConfirm(
        "Eliminar todos los faltantes",
        <>
          Se <strong>eliminarán físicamente</strong> <strong>{affected} asistente(s)</strong> de la base de datos.
          <br />
          Esta acción no se puede deshacer. ¿Continuar?
        </>,
        apply,
        "Sí, eliminar todos",
        "danger"
      );
    } else {
      apply();
    }
  };

  const setAllActions = (action: DuplicateAction) => {
    const apply = () =>
      setPreview((prev) => {
        if (!prev) return prev;
        return prev.map((item) => {
          if (!item.match) return item;
          const hasChanges = hasMeaningfulChanges(item.match.existing, item.row);
          if (!hasChanges) return item;
          return { ...item, match: { ...item.match, action } };
        });
      });

    const affected = (preview || []).filter(
      (item) =>
        item.match &&
        hasMeaningfulChanges(item.match.existing, item.row) &&
        item.match.action !== action
    ).length;

    if (action === "update" && affected > 0) {
      showConfirm(
        "Actualizar todos los duplicados",
        <>
          Se actualizarán <strong>{affected} asistente(s)</strong> existentes con la información de la tabla pegada.
          <br />
          Los campos vacíos en la tabla no borrarán datos existentes, pero los demás campos sí se sobrescribirán. ¿Continuar?
        </>,
        apply,
        "Sí, actualizar todos",
        "warning"
      );
    } else if (action === "duplicate" && affected > 0) {
      showConfirm(
        "Duplicar todos los duplicados",
        <>
          Se crearán <strong>{affected} registro(s) nuevo(s)</strong> para asistentes que ya existen en la base de datos.
          <br />
          Esto puede generar personas repetidas. ¿Continuar?
        </>,
        apply,
        "Sí, duplicar todos",
        "danger"
      );
    } else {
      apply();
    }
  };

  const companiasStats = useMemo(() => {
    const base = existingAsistentes || [];
    const activos = base.filter((a) => !a.cancelado);
    return [1, 2, 3, 4, 5, 6, 7, 8].map((numero) => {
      const miembros = activos.filter((a) => a.compania_numero === numero);
      const hombres = miembros.filter((a) => (a.sexo || "").toLowerCase() === "m").length;
      const mujeres = miembros.filter((a) => (a.sexo || "").toLowerCase() === "f").length;
      const edades = miembros
        .map((a) => calcularEdad(a.fecha_nacimiento))
        .filter((e): e is number => e !== null);
      const edadMin = edades.length > 0 ? Math.min(...edades) : null;
      const edadMax = edades.length > 0 ? Math.max(...edades) : null;
      return {
        numero,
        total: miembros.length,
        hombres,
        mujeres,
        edadMin,
        edadMax,
      };
    });
  }, [existingAsistentes]);

  const selectedCompania = form.compania_numero
    ? companiasStats.find((c) => c.numero === parseInt(form.compania_numero, 10))
    : null;

  const field = (
    label: string,
    name: string,
    type: string = "text",
    required: boolean = false
  ) => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <Input
        type={type}
        name={name}
        value={form[name] || ""}
        onChange={handleChange}
        required={required}
      />
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar asistente" : "Agregar asistente"}
      description={
        isEditing
          ? `Editando a ${formatFullName(asistente)}`
          : "Crea un asistente manualmente o pega filas de una tabla"
      }
      className="max-w-2xl"
    >
      {localError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-100 p-4 text-red-900 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
            <div className="flex-1">
              <p className="font-semibold">Error al guardar</p>
              <p className="mt-1 text-sm leading-relaxed">{localError}</p>
            </div>
          </div>
        </div>
      )}

      {!isEditing && (
        <div className="mb-5 flex rounded-lg border border-slate-200 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("form")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              activeTab === "form"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Formulario manual
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("paste")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              activeTab === "paste"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Pegar desde tabla
          </button>
        </div>
      )}

      {activeTab === "form" && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {field("Nombres", "nombres", "text", true)}
            {field("Apellidos", "apellidos", "text", true)}
            {field("Cédula", "cedula", "text")}
            {field("Estaca / Distrito / Misión", "estaca_distrito_mision", "text", true)}
            {field("Fecha de nacimiento", "fecha_nacimiento", "date")}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Sexo</label>
              <Select name="sexo" value={form.sexo} onChange={handleChange}>
                <option value="">Seleccionar</option>
                {SEXOS.map((s) => (
                  <option key={s} value={s}>
                    {s === "M" ? "Masculino" : s === "F" ? "Femenino" : "Otro"}
                  </option>
                ))}
              </Select>
            </div>
            {field("Celular", "celular", "tel")}
            {field("Correo electrónico", "correo", "email")}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-900">
              Rol y compañía
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Rol</label>
                <Select name="rol" value={form.rol} onChange={handleChange}>
                  <option value="">Seleccionar</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Compañía
                </label>
                <Select
                  name="compania_numero"
                  value={form.compania_numero}
                  onChange={handleChange}
                >
                  <option value="">Sin compañía</option>
                  {companiasStats.map((c) => (
                    <option key={c.numero} value={String(c.numero)}>
                      Compañía {c.numero} ({c.total} miembros)
                    </option>
                  ))}
                </Select>
              </div>

              {form.rol === "coordinador" && (
                <>
                  {field("Descripción del rol", "rol_descripcion")}
                </>
              )}
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Distribución por compañía
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {companiasStats.map((c) => {
                  const isSelected =
                    form.compania_numero === String(c.numero);
                  return (
                    <button
                      key={c.numero}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          compania_numero: isSelected ? "" : String(c.numero),
                        }))
                      }
                      className={`rounded-lg border p-2 text-left text-sm transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          Compañía {c.numero}
                        </span>
                        <span className="text-xs text-slate-500">
                          {c.total}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                        <span>{c.hombres} H</span>
                        <span>·</span>
                        <span>{c.mujeres} M</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {c.edadMin !== null && c.edadMax !== null
                          ? `${c.edadMin} - ${c.edadMax} años`
                          : "Sin edad"}
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedCompania && (
                <p className="mt-2 text-xs text-slate-500">
                  Se asignará a la{" "}
                  <strong>Compañía {selectedCompania.numero}</strong> con{" "}
                  {selectedCompania.hombres} hombre
                  {selectedCompania.hombres !== 1 && "s"} y{" "}
                  {selectedCompania.mujeres} mujer
                  {selectedCompania.mujeres !== 1 && "es"}.
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-900">
              Alojamiento
            </h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Tipo de alojamiento
                </label>
                <Select
                  name="tipo_alojamiento"
                  value={form.tipo_alojamiento}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar</option>
                  {TIPOS_ALOJAMIENTO.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
              {field("Número de habitación", "numero_habitacion")}
              {field("Cama asignada", "cama_asignada")}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-900">
              Ficha médica
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Grupo sanguíneo
                </label>
                <Select
                  name="grupo_sanguineo"
                  value={form.grupo_sanguineo}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar</option>
                  {GRUPOS_SANGUINEOS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </Select>
              </div>
              {field("EPS / Seguro médico", "eps_seguro")}
              {field("Enfermedad crónica", "enfermedad_cronica")}
              {field("Tratamiento médico", "tratamiento_medico")}
              {field("Alergias", "alergias")}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-900">
              Contacto de emergencia
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("Nombre completo", "contacto_emergencia_nombre")}
              {field("Teléfono", "contacto_emergencia_telefono", "tel")}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear asistente"}
            </Button>
          </div>
        </form>
      )}

      {activeTab === "paste" && !isEditing && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Copia una o varias filas de Excel/Forms y péguelas aquí. Cada fila
            se convertirá en un asistente. Como el formulario no incluye
            cédula, se marcarán como{" "}
            <Badge variant="warning">Documento pendiente</Badge>.
          </p>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePasteFromClipboard} type="button">
              <ClipboardPaste className="mr-2 h-4 w-4" />
              Pegar del portapapeles
            </Button>
            <Button variant="secondary" onClick={handleParse} type="button">
              <Table className="mr-2 h-4 w-4" />
              Analizar filas
            </Button>
          </div>

          <textarea
            value={pasteText}
            onChange={(e) => {
              setPasteText(e.target.value);
              setPreview(null);
              setPasteErrors([]);
            }}
            placeholder="Pega aquí las filas copiadas..."
            className="min-h-[160px] w-full rounded-lg border border-input bg-background p-3 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />

          {pasteErrors.length > 0 && (
            <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              <div className="mb-1 flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4" />
                <span>Errores detectados</span>
              </div>
              <ul className="list-inside list-disc space-y-0.5">
                {pasteErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {debugInfo && debugInfo.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              <button
                type="button"
                onClick={() => setShowDebug((prev) => !prev)}
                className="flex w-full items-center justify-between font-medium text-slate-700"
              >
                <span>Ver diagnóstico de filas ({debugInfo.length})</span>
                <span>{showDebug ? "▲" : "▼"}</span>
              </button>
              {showDebug && (
                <div className="mt-2 max-h-60 overflow-auto rounded border border-slate-100 bg-slate-50 p-2">
                  <table className="w-full text-left text-xs">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="py-1 pr-2">#</th>
                        <th className="py-1 pr-2">Cols</th>
                        <th className="py-1 pr-2">Primeras columnas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {debugInfo.map((info, i) => (
                        <tr key={i}>
                          <td className="py-1 pr-2 align-top">{i + 1}</td>
                          <td className="py-1 pr-2 align-top">{info.columns}</td>
                          <td className="py-1 align-top">
                            {info.firstColumns.map((c, j) => (
                              <span key={j} className="mr-1 inline-block rounded bg-white px-1 py-0.5 border border-slate-200">
                                {c || "(vacío)"}
                              </span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {preview && preview.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    Asistentes detectados: {preview.length}
                  </h4>
                  {(() => {
                    const duplicates = preview.filter((item) => item.match).length;
                    if (duplicates === 0) return null;
                    return (
                      <p className="text-xs text-slate-500">
                        {duplicates} ya existen. Aplica una acción masiva:
                      </p>
                    );
                  })()}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="warning">Documento pendiente</Badge>
                  {preview.some(
                    (item) =>
                      item.match && hasMeaningfulChanges(item.match.existing, item.row)
                  ) && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAllActions("skip")}
                        type="button"
                      >
                        Omitir todos
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAllActions("update")}
                        type="button"
                      >
                        Actualizar todos
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAllActions("duplicate")}
                        type="button"
                      >
                        Duplicar todos
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Nombres</th>
                      <th className="px-3 py-2">Apellidos</th>
                      <th className="px-3 py-2">Estaca</th>
                      <th className="px-3 py-2">Celular</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.map((item, i) => {
                      const row = item.row;
                      const match = item.match;
                      const changes = match ? getMeaningfulChanges(match.existing, row) : [];
                      const hasChanges = changes.length > 0;
                      const isExpanded = expandedRows.has(i);

                      let statusBadge;
                      if (!match) {
                        statusBadge = <Badge variant="success">Nuevo</Badge>;
                      } else if (!hasChanges) {
                        statusBadge = <Badge variant="secondary">Idéntico</Badge>;
                      } else {
                        statusBadge = <Badge variant="warning">Diferente</Badge>;
                      }

                      return (
                        <Fragment key={i}>
                          <tr>
                            <td className="px-3 py-2">{row.nombres}</td>
                            <td className="px-3 py-2">{row.apellidos}</td>
                            <td className="px-3 py-2">{row.estaca_distrito_mision}</td>
                            <td className="px-3 py-2">{row.celular}</td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-1">
                                {statusBadge}
                                {match && (
                                  <span className="text-xs text-slate-400">
                                    Coincide por {match.matchedBy}
                                  </span>
                                )}
                                {hasChanges && (
                                  <button
                                    type="button"
                                    onClick={() => toggleRow(i)}
                                    className="text-left text-xs text-blue-600 hover:underline"
                                  >
                                    {isExpanded ? "Ocultar diferencias" : "Ver diferencias"}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {!match ? (
                                <span className="text-xs text-slate-400">Insertar</span>
                              ) : !hasChanges ? (
                                <span className="text-xs text-slate-400">Omitir</span>
                              ) : (
                                <Select
                                  value={match.action}
                                  onChange={(e) => setAction(i, e.target.value as DuplicateAction)}
                                  className="text-xs"
                                >
                                  <option value="skip">Omitir</option>
                                  <option value="update">Actualizar</option>
                                  <option value="duplicate">Duplicar</option>
                                </Select>
                              )}
                            </td>
                          </tr>
                          {isExpanded && changes.length > 0 && (
                            <tr className="bg-slate-50/80">
                              <td colSpan={6} className="px-3 py-3">
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-slate-700">
                                    Diferencias encontradas ({changes.length}):
                                  </p>
                                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {changes.map((c, j) => (
                                      <div
                                        key={j}
                                        className="rounded-lg border border-slate-200 bg-white p-2 text-xs"
                                      >
                                        <p className="font-medium text-slate-900">
                                          {FIELD_LABELS[c.key] || c.key}
                                        </p>
                                        <div className="mt-1 flex flex-col gap-0.5">
                                          <p className="text-red-600 line-through">
                                            Actual: {c.oldValue}
                                          </p>
                                          <p className="text-emerald-600">
                                            Nuevo: {c.newValue}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {missingRows.length > 0 && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-red-900">
                    Asistentes en BD que no aparecen en la tabla pegada
                  </h4>
                  <p className="text-xs text-red-700">
                    {missingRows.filter((m) => m.existing.cancelado).length} ya están cancelados.
                    {" "}
                    {missingRows.filter((m) => !m.existing.cancelado).length} están activos.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAllMissingActions("ignore")}
                    type="button"
                  >
                    Ignorar todos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAllMissingActions("cancel")}
                    type="button"
                  >
                    Cancelar todos
                  </Button>
                </div>
              </div>

              <div className="max-h-60 overflow-auto rounded-lg border border-red-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-red-50 text-red-900">
                    <tr>
                      <th className="px-3 py-2">Nombres</th>
                      <th className="px-3 py-2">Apellidos</th>
                      <th className="px-3 py-2">Estaca</th>
                      <th className="px-3 py-2">Estado BD</th>
                      <th className="px-3 py-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {missingRows.map((item, i) => {
                      const a = item.existing;
                      return (
                        <tr key={i} className={a.cancelado ? "bg-slate-50" : ""}>
                          <td className="px-3 py-2">{a.nombres}</td>
                          <td className="px-3 py-2">{a.apellidos}</td>
                          <td className="px-3 py-2">{a.estaca_distrito_mision}</td>
                          <td className="px-3 py-2">
                            {a.cancelado ? (
                              <Badge variant="secondary">Cancelado</Badge>
                            ) : (
                              <Badge variant="success">Activo</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {a.cancelado ? (
                              <span className="text-xs text-slate-400">Ignorar</span>
                            ) : (
                              <Select
                                value={item.action}
                                onChange={(e) =>
                                  handleMissingActionChange(i, e.target.value as MissingRow["action"])
                                }
                                className="text-xs"
                              >
                                <option value="ignore">Ignorar</option>
                                <option value="cancel">Cancelar</option>
                                <option value="delete">Eliminar</option>
                              </Select>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(preview && preview.length > 0) || missingRows.length > 0 ? (
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={onClose} type="button">
                Cancelar
              </Button>
              <Button
                onClick={handleSavePasted}
                disabled={saving || pasteErrors.length > 0}
                type="button"
              >
                <Check className="mr-2 h-4 w-4" />
                {saving
                  ? "Guardando..."
                  : (() => {
                      let insert = 0;
                      let update = 0;
                      let cancel = 0;
                      let del = 0;
                      for (const item of preview || []) {
                        if (!item.match) insert++;
                        else if (item.match.action === "update") update++;
                        else if (item.match.action === "duplicate") insert++;
                      }
                      for (const item of missingRows) {
                        if (item.action === "cancel") cancel++;
                        else if (item.action === "delete") del++;
                      }
                      const parts: string[] = [];
                      if (insert > 0) parts.push(`${insert} nuevo(s)`);
                      if (update > 0) parts.push(`${update} actualizado(s)`);
                      if (cancel > 0) parts.push(`${cancel} cancelado(s)`);
                      if (del > 0) parts.push(`${del} eliminado(s)`);
                      if (parts.length === 0) return "Guardar (sin cambios)";
                      return `Guardar: ${parts.join(" / ")}`;
                    })()}
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={closeConfirm}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
      />
    </Modal>
  );
}
