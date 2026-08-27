"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Bed, Users, Search, AlertCircle } from "lucide-react";
import { useAsistentes } from "@/hooks/useAsistentes";
import { Asistente } from "@/lib/types";
import { HABITACIONES, Habitacion } from "@/lib/habitaciones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { formatFullName } from "@/lib/utils";

const ZONA_LABELS: Record<string, string> = {
  mujeres: "Mujeres",
  hombres: "Hombres",
  staff: "Staff",
  mixto: "Mixto / Parejas",
};

const ZONA_COLORS: Record<string, string> = {
  mujeres: "bg-pink-100 text-pink-800 border-pink-200",
  hombres: "bg-blue-100 text-blue-800 border-blue-200",
  staff: "bg-amber-100 text-amber-800 border-amber-200",
  mixto: "bg-purple-100 text-purple-800 border-purple-200",
};

export default function HabitacionesPage() {
  const { asistentes, loading, error, refetch } = useAsistentes();
  const [search, setSearch] = useState("");
  const [zonaFilter, setZonaFilter] = useState<string>("todas");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const supabase = createClient();

  const activos = useMemo(
    () => asistentes.filter((a) => !a.cancelado),
    [asistentes]
  );

  const ocupacion = useMemo(() => {
    const map = new Map<string, Asistente[]>();
    for (const a of activos) {
      const key = `${a.tipo_alojamiento || "(sin tipo)"}||${a.numero_habitacion || "(sin número)"}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [activos]);

  const sinHabitacion = useMemo(
    () => activos.filter((a) => !a.tipo_alojamiento || !a.numero_habitacion),
    [activos]
  );

  const habitacionesFiltradas = useMemo(() => {
    return HABITACIONES.filter((h) => {
      const matchesZona = zonaFilter === "todas" || h.zona === zonaFilter;
      const matchesTipo = tipoFilter === "todos" || h.tipo === tipoFilter;
      return matchesZona && matchesTipo;
    });
  }, [zonaFilter, tipoFilter]);

  const tipos = useMemo(
    () => Array.from(new Set(HABITACIONES.map((h) => h.tipo))).sort(),
    []
  );

  const handleMove = async (asistente: Asistente, targetKey: string) => {
    if (targetKey === "__none__") {
      // Desasignar
      setSaving(asistente.id);
      setSaveError(null);
      const { error: updErr } = await supabase
        .from("asistentes")
        .update({
          tipo_alojamiento: null,
          numero_habitacion: null,
          cama_asignada: null,
        } as any)
        .eq("id", asistente.id);
      setSaving(null);
      if (updErr) {
        setSaveError(updErr.message);
      } else {
        refetch();
      }
      return;
    }

    const [tipo, numero] = targetKey.split("||");
    const habitacion = HABITACIONES.find((h) => h.tipo === tipo && h.numero === numero);
    if (!habitacion) return;

    const key = `${habitacion.tipo}||${habitacion.numero}`;
    const actuales = ocupacion.get(key) || [];
    if (actuales.length >= habitacion.capacidad) {
      setSaveError(`La ${habitacion.tipo} ${habitacion.numero} ya está llena.`);
      return;
    }

    const isSuite = habitacion.numero.startsWith("Suite ");
    const nextCama = isSuite
      ? String(Math.floor(actuales.length / 2) + 1)
      : String(actuales.length + 1);

    setSaving(asistente.id);
    setSaveError(null);
    const { error: updErr } = await supabase
      .from("asistentes")
      .update({
        tipo_alojamiento: habitacion.tipo,
        numero_habitacion: habitacion.numero,
        cama_asignada: nextCama,
      } as any)
      .eq("id", asistente.id);
    setSaving(null);
    if (updErr) {
      setSaveError(updErr.message);
    } else {
      refetch();
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        Cargando habitaciones...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
        Error al cargar: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Habitaciones
          </h1>
          <p className="text-slate-500">
            Edita quién duerme en cada habitación y cama
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Bed className="h-5 w-5" />
          {activos.length - sinHabitacion.length} / {activos.length} asignados
        </div>
      </motion.div>

      {saveError && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {saveError}
          </div>
        </div>
      )}

      {sinHabitacion.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-amber-900">
            Sin habitación ({sinHabitacion.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {sinHabitacion.map((a) => (
              <Badge key={a.id} variant="warning">
                {formatFullName(a)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar persona..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={zonaFilter} onChange={(e) => setZonaFilter(e.target.value)}>
          <option value="todas">Todas las zonas</option>
          <option value="mujeres">Mujeres</option>
          <option value="hombres">Hombres</option>
          <option value="staff">Staff</option>
          <option value="mixto">Mixto</option>
        </Select>
        <Select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)}>
          <option value="todos">Todos los tipos</option>
          {tipos.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {habitacionesFiltradas.map((h) => {
          const key = `${h.tipo}||${h.numero}`;
          const ocupantes = ocupacion.get(key) || [];
          const term = search.toLowerCase().trim();
          const filteredOcupantes = term
            ? ocupantes.filter((a) =>
                formatFullName(a).toLowerCase().includes(term)
              )
            : ocupantes;
          const isFull = ocupantes.length >= h.capacidad;

          return (
            <div
              key={key}
              className={`rounded-xl border bg-white p-4 shadow-sm ${
                isFull ? "border-emerald-200" : "border-slate-100"
              }`}
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900">
                    {h.tipo} {h.numero}
                  </h4>
                  <Badge
                    variant="outline"
                    className={`mt-1 text-xs ${ZONA_COLORS[h.zona]}`}
                  >
                    {ZONA_LABELS[h.zona]}
                  </Badge>
                </div>
                <div className="text-right">
                  <span
                    className={`text-lg font-bold ${
                      isFull ? "text-emerald-600" : "text-slate-700"
                    }`}
                  >
                    {ocupantes.length}
                  </span>
                  <span className="text-xs text-slate-400">/{h.capacidad}</span>
                </div>
              </div>

              <div className="mb-3 h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    isFull ? "bg-emerald-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.min((ocupantes.length / h.capacidad) * 100, 100)}%` }}
                />
              </div>

              <div className="space-y-2">
                {(search ? filteredOcupantes : ocupantes).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {formatFullName(a)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Cama {a.cama_asignada || "—"} · {a.sexo === "M" ? "H" : a.sexo === "F" ? "M" : "Otro"}
                      </p>
                    </div>
                    <MoveSelect
                      asistente={a}
                      ocupacion={ocupacion}
                      currentKey={key}
                      onMove={handleMove}
                      disabled={saving === a.id}
                    />
                  </div>
                ))}
                {search && filteredOcupantes.length === 0 && ocupantes.length > 0 && (
                  <p className="text-xs text-slate-400">Sin coincidencias en esta habitación</p>
                )}
                {ocupantes.length === 0 && (
                  <p className="text-xs text-slate-400">Vacía</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MoveSelect({
  asistente,
  ocupacion,
  currentKey,
  onMove,
  disabled,
}: {
  asistente: Asistente;
  ocupacion: Map<string, Asistente[]>;
  currentKey: string;
  onMove: (a: Asistente, key: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(currentKey);

  return (
    <Select
      value={value}
      onChange={(e) => {
        const newKey = e.target.value;
        setValue(newKey);
        onMove(asistente, newKey);
      }}
      disabled={disabled}
      className="w-28 text-xs"
    >
      <option value={currentKey}>Mover...</option>
      {HABITACIONES.map((h) => {
        const key = `${h.tipo}||${h.numero}`;
        if (key === currentKey) return null;
        const count = (ocupacion.get(key) || []).length;
        const full = count >= h.capacidad;
        return (
          <option key={key} value={key} disabled={full}>
            {h.tipo} {h.numero} {full ? "(llena)" : `(${count}/${h.capacidad})`}
          </option>
        );
      })}
      <option value="__none__">Sin habitación</option>
    </Select>
  );
}
