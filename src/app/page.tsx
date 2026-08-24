"use client";

import { motion } from "framer-motion";
import { useAsistentes } from "@/hooks/useAsistentes";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { OccupancyChart } from "@/components/dashboard/OccupancyChart";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const { asistentes, loading, error, refetch } = useAsistentes();

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard General
          </h1>
          <p className="text-slate-500">
            Métricas en tiempo real del evento hotelero
          </p>
        </div>
        <Button
          variant="outline"
          onClick={refetch}
          disabled={loading}
          className="self-start"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </motion.div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Error de conexión con Supabase</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      <KpiGrid asistentes={asistentes} />
      <OccupancyChart asistentes={asistentes} />
    </div>
  );
}
