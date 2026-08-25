"use client";

import { motion } from "framer-motion";
import { Pencil, Trash2, QrCode, HeartPulse } from "lucide-react";
import { Asistente } from "@/lib/types";
import { formatFullName } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AsistenteTableProps {
  asistentes: Asistente[];
  selectedIds: Set<string>;
  onSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onEdit: (asistente: Asistente) => void;
  onDelete: (asistente: Asistente) => void;
  onViewMedical: (asistente: Asistente) => void;
  onResendQr: (asistente: Asistente) => void;
}

export function AsistenteTable({
  asistentes,
  selectedIds,
  onSelect,
  onSelectAll,
  onEdit,
  onDelete,
  onViewMedical,
  onResendQr,
}: AsistenteTableProps) {
  const allSelected = asistentes.length > 0 && asistentes.every((a) => selectedIds.has(a.id));
  const someSelected = asistentes.some((a) => selectedIds.has(a.id)) && !allSelected;

  return (
    <div className="hidden overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm md:block">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
              </th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Estaca</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Compañía</th>
              <th className="px-4 py-3 font-medium">Habitación</th>
              <th className="px-4 py-3 font-medium">Cédula</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {asistentes.map((a, index) => (
              <motion.tr
                key={a.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03 }}
                className="transition-colors hover:bg-slate-50/80"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(a.id)}
                    onChange={(e) => onSelect(a.id, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        a.estado_checkin
                          ? a.estado_checkout
                            ? "bg-slate-400"
                            : "bg-emerald-500"
                          : "bg-slate-300"
                      }`}
                    />
                    <span className="text-xs text-slate-500">
                      {a.estado_checkin
                        ? a.estado_checkout
                          ? "Check-out"
                          : "Ingresado"
                        : "Pendiente"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {formatFullName(a)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {a.estaca_distrito_mision}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <Badge variant={a.rol === "consejero" ? "warning" : a.rol === "coordinador" ? "secondary" : "default"}>
                    {a.rol || "Participante"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {a.compania_numero ? (
                    <span className="font-medium">Compañía {a.compania_numero}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {a.tipo_alojamiento && (
                    <div className="text-xs">
                      <div>{a.tipo_alojamiento}</div>
                      <div className="text-slate-400">
                        {a.numero_habitacion}
                        {a.cama_asignada && ` · Cama ${a.cama_asignada}`}
                      </div>
                    </div>
                  )}
                  {!a.tipo_alojamiento && "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {a.cedula || (
                    <Badge variant="warning">Doc. pendiente</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewMedical(a)}
                      title="Ficha médica"
                    >
                      <HeartPulse className="h-4 w-4 text-red-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onResendQr(a)}
                      title="Reenviar QR"
                    >
                      <QrCode className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(a)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(a)}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
