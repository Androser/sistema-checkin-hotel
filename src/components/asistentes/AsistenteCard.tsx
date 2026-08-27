"use client";

import { motion } from "framer-motion";
import { Pencil, QrCode, HeartPulse, UserX, UserCheck } from "lucide-react";
import { Asistente } from "@/lib/types";
import { formatDate, formatFullName } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AsistenteCardProps {
  asistente: Asistente;
  index: number;
  selected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onEdit: (asistente: Asistente) => void;
  onToggleCancelado: (asistente: Asistente) => void;
  onViewMedical: (asistente: Asistente) => void;
  onResendQr: (asistente: Asistente) => void;
}

export function AsistenteCard({
  asistente,
  index,
  selected,
  onSelect,
  onEdit,
  onToggleCancelado,
  onViewMedical,
  onResendQr,
}: AsistenteCardProps) {
  const a = asistente;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => onSelect(a.id, e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      a.estado_checkin
                        ? a.estado_checkout
                          ? "bg-slate-400"
                          : "bg-emerald-500"
                        : "bg-slate-300"
                    }`}
                  />
                  <h3 className="truncate text-base font-semibold text-slate-900">
                    {formatFullName(a)}
                  </h3>
                  {a.cancelado && (
                    <Badge variant="destructive">Cancelado</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {a.estaca_distrito_mision}
                </p>
              </div>
            </div>
            <Badge variant={a.estado_checkin ? "success" : "secondary"}>
              {a.estado_checkin
                ? a.estado_checkout
                  ? "Check-out"
                  : "Ingresado"
                : "Pendiente"}
            </Badge>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-slate-400">Cédula</p>
              <p className="font-medium text-slate-700">
                {a.cedula || (
                  <Badge variant="warning" className="mt-1">
                    Doc. pendiente
                  </Badge>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Rol</p>
              <p className="font-medium text-slate-700 capitalize">
                {a.rol || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Sexo</p>
              <p className="font-medium text-slate-700">
                {a.sexo === "M" ? "Masculino" : a.sexo === "F" ? "Femenino" : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Compañía</p>
              <p className="font-medium text-slate-700">
                {a.rol === "consejero" || a.rol === "participante"
                  ? a.compania_numero || "Por asignar"
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Alojamiento</p>
              <p className="font-medium text-slate-700">
                {a.tipo_alojamiento || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Habitación</p>
              <p className="font-medium text-slate-700">
                {a.numero_habitacion || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Cama</p>
              <p className="font-medium text-slate-700">
                {a.cama_asignada || "—"}
              </p>
            </div>
          </div>

          {a.estado_checkin && a.checkin_at && (
            <p className="mt-3 text-xs text-slate-500">
              Ingresó: {formatDate(a.checkin_at)}
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewMedical(a)}
              className="h-11"
            >
              <HeartPulse className="mr-2 h-4 w-4 text-red-500" />
              Ficha médica
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onResendQr(a)}
              className="h-11"
            >
              <QrCode className="mr-2 h-4 w-4 text-blue-500" />
              QR
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(a)}
              className="h-11"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleCancelado(a)}
              className={`h-11 ${
                a.cancelado
                  ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                  : "border-amber-200 text-amber-600 hover:bg-amber-50"
              }`}
            >
              {a.cancelado ? (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Reactivar
                </>
              ) : (
                <>
                  <UserX className="mr-2 h-4 w-4" />
                  Cancelar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
