"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Building2, Users, UserCheck, TrendingUp } from "lucide-react";
import { useAsistentes } from "@/hooks/useAsistentes";
import { CompaniaCharts } from "@/components/companias/CompaniaCharts";
import { CompaniaCard } from "@/components/companias/CompaniaCard";
import { calcularEdad } from "@/lib/utils";

export default function CompaniasPage() {
  const { asistentes, loading, error } = useAsistentes();

  const activos = useMemo(
    () => asistentes.filter((a) => !a.cancelado),
    [asistentes]
  );

  const stats = useMemo(() => {
    const participantes = activos.filter((a) => a.rol !== "coordinador");
    const consejeros = activos.filter((a) => a.rol === "consejero");
    const coordinadores = activos.filter((a) => a.rol === "coordinador");

    const conCompania = participantes.filter((a) => a.compania_numero).length;
    const promedioPorCompania = Math.round(conCompania / 8);

    const companiasSizes = [1, 2, 3, 4, 5, 6, 7, 8].map((n) =>
      participantes.filter((a) => a.compania_numero === n).length
    );
    const maxCompania = Math.max(...companiasSizes);
    const minCompania = Math.min(...companiasSizes);

    return {
      totalParticipantes: participantes.length,
      totalConsejeros: consejeros.length,
      totalCoordinadores: coordinadores.length,
      promedioPorCompania,
      maxCompania,
      minCompania,
    };
  }, [activos]);

  const companias = useMemo(() => {
    return [1, 2, 3, 4, 5, 6, 7, 8].map((numero) => ({
      numero,
      consejeros: activos.filter(
        (a) => a.rol === "consejero" && a.compania_numero === numero
      ),
      participantes: activos.filter(
        (a) =>
          a.rol !== "coordinador" && a.compania_numero === numero
      ),
    }));
  }, [activos]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
        Error al cargar asistentes: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Compañías
        </h1>
        <p className="text-slate-500">
          Distribución, estadísticas y consejeros por compañía
        </p>
      </motion.div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Participantes</p>
              <p className="text-xl font-bold text-slate-900">
                {stats.totalParticipantes}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Consejeros</p>
              <p className="text-xl font-bold text-slate-900">
                {stats.totalConsejeros}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Promedio por compañía</p>
              <p className="text-xl font-bold text-slate-900">
                {stats.promedioPorCompania}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Mayor / menor compañía</p>
              <p className="text-xl font-bold text-slate-900">
                {stats.maxCompania} / {stats.minCompania}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Gráficos */}
      <CompaniaCharts asistentes={asistentes} />

      {/* Tarjetas por compañía */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Detalle por compañía
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {companias.map((c, index) => (
            <CompaniaCard
              key={c.numero}
              numero={c.numero}
              consejeros={c.consejeros}
              participantes={c.participantes}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
