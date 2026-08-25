"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Asistente,
  EstadoCheckinFilter,
  ESTADOS_CHECKIN,
  TIPOS_ALOJAMIENTO,
  ROLES,
} from "@/lib/types";

interface AsistenteFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  estaca: string;
  onEstacaChange: (value: string) => void;
  estado: EstadoCheckinFilter;
  onEstadoChange: (value: EstadoCheckinFilter) => void;
  alojamiento: string;
  onAlojamientoChange: (value: string) => void;
  rol: string;
  onRolChange: (value: string) => void;
  compania: string;
  onCompaniaChange: (value: string) => void;
  estacas: string[];
}

export function AsistenteFilters({
  search,
  onSearchChange,
  estaca,
  onEstacaChange,
  estado,
  onEstadoChange,
  alojamiento,
  onAlojamientoChange,
  rol,
  onRolChange,
  compania,
  onCompaniaChange,
  estacas,
}: AsistenteFiltersProps) {
  const hasFilters =
    search || estaca || estado !== "todos" || alojamiento || rol || compania;

  const clearFilters = () => {
    onSearchChange("");
    onEstacaChange("");
    onEstadoChange("todos");
    onAlojamientoChange("");
    onRolChange("");
    onCompaniaChange("");
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, apellido o cédula..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filtros</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={estaca} onChange={(e) => onEstacaChange(e.target.value)}>
          <option value="">Todas las estacas</option>
          {estacas.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </Select>

        <Select
          value={estado}
          onChange={(e) => onEstadoChange(e.target.value as EstadoCheckinFilter)}
        >
          {ESTADOS_CHECKIN.map((e) => (
            <option key={e} value={e}>
              {e === "todos" && "Todos"}
              {e === "pendientes" && "Pendientes de ingreso"}
              {e === "ingresados" && "Ya ingresados"}
              {e === "checkout" && "Check-out realizado"}
            </option>
          ))}
        </Select>

        <Select value={alojamiento} onChange={(e) => onAlojamientoChange(e.target.value)}>
          <option value="">Todos los alojamientos</option>
          {TIPOS_ALOJAMIENTO.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>

        <Select value={rol} onChange={(e) => onRolChange(e.target.value)}>
          <option value="">Todos los roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </Select>

        <Select value={compania} onChange={(e) => onCompaniaChange(e.target.value)}>
          <option value="">Todas las compañías</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((c) => (
            <option key={c} value={String(c)}>
              Compañía {c}
            </option>
          ))}
        </Select>

        <div className="flex items-center">
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-slate-500"
            >
              <X className="mr-1 h-4 w-4" />
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {hasFilters && (
        <div className="flex flex-wrap gap-2 pt-1">
          {search && (
            <Badge variant="secondary">
              Búsqueda: {search}
              <button
                onClick={() => onSearchChange("")}
                className="ml-1 hover:text-slate-900"
              >
                <X className="inline h-3 w-3" />
              </button>
            </Badge>
          )}
          {estaca && (
            <Badge variant="secondary">
              {estaca}
              <button
                onClick={() => onEstacaChange("")}
                className="ml-1 hover:text-slate-900"
              >
                <X className="inline h-3 w-3" />
              </button>
            </Badge>
          )}
          {estado !== "todos" && (
            <Badge variant="secondary">
              {estado}
              <button
                onClick={() => onEstadoChange("todos")}
                className="ml-1 hover:text-slate-900"
              >
                <X className="inline h-3 w-3" />
              </button>
            </Badge>
          )}
          {alojamiento && (
            <Badge variant="secondary">
              {alojamiento}
              <button
                onClick={() => onAlojamientoChange("")}
                className="ml-1 hover:text-slate-900"
              >
                <X className="inline h-3 w-3" />
              </button>
            </Badge>
          )}
          {rol && (
            <Badge variant="secondary">
              Rol: {rol}
              <button
                onClick={() => onRolChange("")}
                className="ml-1 hover:text-slate-900"
              >
                <X className="inline h-3 w-3" />
              </button>
            </Badge>
          )}
          {compania && (
            <Badge variant="secondary">
              Compañía {compania}
              <button
                onClick={() => onCompaniaChange("")}
                className="ml-1 hover:text-slate-900"
              >
                <X className="inline h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
