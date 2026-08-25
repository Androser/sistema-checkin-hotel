"use client";

import { motion } from "framer-motion";
import { Users, Phone, ChevronRight } from "lucide-react";
import { Asistente } from "@/lib/types";
import { formatFullName, calcularEdad } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface CompaniaCardProps {
  numero: number;
  consejeros: Asistente[];
  participantes: Asistente[];
  index: number;
}

export function CompaniaCard({
  numero,
  consejeros,
  participantes,
  index,
}: CompaniaCardProps) {
  const router = useRouter();

  const hombres = participantes.filter(
    (p) => (p.sexo || "").toLowerCase() === "m"
  ).length;
  const mujeres = participantes.filter(
    (p) => (p.sexo || "").toLowerCase() === "f"
  ).length;

  const edades = participantes
    .map((p) => calcularEdad(p.fecha_nacimiento))
    .filter((e): e is number => e !== null);

  const edadPromedio =
    edades.length > 0
      ? Math.round(edades.reduce((a, b) => a + b, 0) / edades.length)
      : null;
  const edadMin = edades.length > 0 ? Math.min(...edades) : null;
  const edadMax = edades.length > 0 ? Math.max(...edades) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
            {numero}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Compañía {numero}
            </h3>
            <p className="text-sm text-slate-500">
              {participantes.length} participantes
            </p>
          </div>
        </div>
        <div className="text-right text-sm text-slate-600">
          <p>
            <span className="font-medium">{hombres}</span> H
          </p>
          <p>
            <span className="font-medium">{mujeres}</span> M
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {consejeros.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-slate-900">
                {formatFullName(c)}
              </span>
            </div>
            {c.celular && (
              <a
                href={`https://wa.me/${c.celular.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:underline"
              >
                <Phone className="h-3.5 w-3.5" />
                {c.celular}
              </a>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-xs text-slate-500">Edad promedio</p>
          <p className="font-medium text-slate-900">
            {edadPromedio !== null ? `${edadPromedio} años` : "—"}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-xs text-slate-500">Rango de edad</p>
          <p className="font-medium text-slate-900">
            {edadMin !== null && edadMax !== null
              ? `${edadMin} - ${edadMax} años`
              : "—"}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => router.push(`/asistentes?compania=${numero}`)}
        >
          Ver miembros
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
