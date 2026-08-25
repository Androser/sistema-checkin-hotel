"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
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
} from "@/lib/types";
import { formatFullName } from "@/lib/utils";
import {
  parseTablaPegada,
  findDuplicates,
  hasMeaningfulChanges,
  ParsedRow,
  DuplicateAction,
} from "@/lib/importHelpers";

interface AsistenteModalProps {
  open: boolean;
  onClose: () => void;
  asistente: Asistente | null;
  existingAsistentes?: Asistente[];
  onSave: (data: Partial<Asistente>) => void;
  onSaveMultiple?: (data: { insert: Partial<Asistente>[]; update: { id: string; data: Partial<Asistente> }[] }) => void;
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
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (saveError) setLocalError(saveError);
  }, [saveError]);

  useEffect(() => {
    if (open) {
      setActiveTab("form");
      setPasteText("");
      setPreview(null);
      setPasteErrors([]);
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
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const handleParse = () => {
    setPasteErrors([]);
    const result = parseTablaPegada(pasteText);
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
    setPreview(withDuplicates);
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

  const handleSavePasted = async () => {
    if (!preview || preview.length === 0 || !onSaveMultiple) return;
    setSaving(true);
    setLocalError(null);
    try {
      const insert: Partial<Asistente>[] = [];
      const update: { id: string; data: Partial<Asistente> }[] = [];

      for (const item of preview) {
        if (!item.match) {
          insert.push(item.row);
        } else if (item.match.action === "update") {
          update.push({ id: item.match.existing.id, data: item.row });
        } else if (item.match.action === "duplicate") {
          insert.push(item.row);
        }
      }

      await onSaveMultiple({ insert, update });
    } finally {
      setSaving(false);
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

  const setAllActions = (action: DuplicateAction) => {
    setPreview((prev) => {
      if (!prev) return prev;
      return prev.map((item) => {
        if (!item.match) return item;
        const hasChanges = hasMeaningfulChanges(item.match.existing, item.row);
        if (!hasChanges) return item;
        return { ...item, match: { ...item.match, action } };
      });
    });
  };

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
                      const hasChanges = match ? hasMeaningfulChanges(match.existing, row) : false;

                      let statusBadge;
                      if (!match) {
                        statusBadge = <Badge variant="success">Nuevo</Badge>;
                      } else if (!hasChanges) {
                        statusBadge = <Badge variant="secondary">Idéntico</Badge>;
                      } else {
                        statusBadge = <Badge variant="warning">Diferente</Badge>;
                      }

                      return (
                        <tr key={i}>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {preview && preview.length > 0 && (
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={onClose} type="button">
                Cancelar
              </Button>
              <Button
                onClick={handleSavePasted}
                disabled={saving}
                type="button"
              >
                <Check className="mr-2 h-4 w-4" />
                {saving
                  ? "Guardando..."
                  : (() => {
                      let insert = 0;
                      let update = 0;
                      for (const item of preview) {
                        if (!item.match) insert++;
                        else if (item.match.action === "update") update++;
                        else if (item.match.action === "duplicate") insert++;
                      }
                      if (update > 0) {
                        return `Guardar: ${insert} nuevo(s) / ${update} actualizado(s)`;
                      }
                      return `Guardar ${insert} asistente(s)`;
                    })()}
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
