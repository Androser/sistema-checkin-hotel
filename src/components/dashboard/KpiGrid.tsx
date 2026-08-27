"use client";

import { Users, CheckCircle2, BedDouble, Clock } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { Asistente } from "@/lib/types";
import { META_CUPOS } from "@/lib/constants";

interface KpiGridProps {
  asistentes: Asistente[];
}

export function KpiGrid({ asistentes }: KpiGridProps) {
  const activos = asistentes.filter((a) => !a.cancelado);
  const total = activos.length;
  const checkins = activos.filter((a) => a.estado_checkin).length;
  const checkouts = activos.filter((a) => a.estado_checkout).length;
  const pendientes = total - checkins;
  const ocupados = activos.filter(
    (a) => a.numero_habitacion && a.numero_habitacion.trim() !== ""
  ).length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        index={0}
        title="Total Inscritos"
        value={total}
        subtitle={`Meta: ${META_CUPOS} cupos`}
        icon={<Users className="h-5 w-5" />}
        trend="neutral"
      />
      <KpiCard
        index={1}
        title="Check-ins Realizados"
        value={checkins}
        subtitle={`${total > 0 ? Math.round((checkins / total) * 100) : 0}% de ocupación actual`}
        icon={<CheckCircle2 className="h-5 w-5" />}
        trend="up"
      />
      <KpiCard
        index={2}
        title="Habitaciones Asignadas"
        value={ocupados}
        subtitle={`${total - ocupados} sin asignación`}
        icon={<BedDouble className="h-5 w-5" />}
        trend="neutral"
      />
      <KpiCard
        index={3}
        title="Pendientes de Ingreso"
        value={pendientes}
        subtitle={`${checkouts} check-outs realizados`}
        icon={<Clock className="h-5 w-5" />}
        trend={pendientes > 0 ? "down" : "up"}
      />
    </div>
  );
}
