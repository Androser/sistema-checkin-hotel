"use client";

import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, User, MapPin, BedDouble, Calendar } from "lucide-react";
import { ScanResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { formatDate, formatFullName } from "@/lib/utils";

interface ScannerResultProps {
  result: ScanResult | null;
  onNext: () => void;
}

export function ScannerResult({ result, onNext }: ScannerResultProps) {
  if (!result) return null;

  const colors = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-red-500",
  };

  const icons = {
    success: <CheckCircle2 className="h-8 w-8 text-white" />,
    warning: <AlertTriangle className="h-8 w-8 text-white" />,
    error: <XCircle className="h-8 w-8 text-white" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:bottom-8 sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2"
    >
      <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className={`${colors[result.type]} p-4 text-white`}>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
              {icons[result.type]}
            </div>
            <div>
              <h3 className="text-lg font-bold">{result.title}</h3>
              <p className="text-sm text-white/90">{result.message}</p>
            </div>
          </div>
        </div>

        {(result.asistente || result.scannedName) && (
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Nombre</p>
                <p className="font-semibold text-slate-900">
                  {result.asistente
                    ? formatFullName(result.asistente)
                    : result.scannedName}
                </p>
              </div>
            </div>

            {result.asistente && (
              <>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-400">Estaca</p>
                    <p className="font-medium text-slate-700">
                      {result.asistente.estaca_distrito_mision}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <BedDouble className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-400">Alojamiento</p>
                    <p className="font-medium text-slate-700">
                      {result.asistente.tipo_alojamiento || "—"} {" "}
                      {result.asistente.numero_habitacion && `· ${result.asistente.numero_habitacion}`} {" "}
                      {result.asistente.cama_asignada && `· Cama ${result.asistente.cama_asignada}`}
                    </p>
                  </div>
                </div>

                {result.timestamp && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-400">
                        {result.type === "warning" ? "Registrado anteriormente" : "Registrado ahora"}
                      </p>
                      <p className="font-medium text-slate-700">
                        {formatDate(result.timestamp)}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="border-t border-slate-100 p-4">
          <Button onClick={onNext} className="w-full" size="lg">
            Siguiente escaneo
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
