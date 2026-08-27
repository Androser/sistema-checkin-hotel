"use client";

import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Asistente } from "@/lib/types";

interface OccupancyChartProps {
  asistentes: Asistente[];
}

export function OccupancyChart({ asistentes }: OccupancyChartProps) {
  const dataMap = new Map<string, { estaca: string; total: number; ingresados: number }>();

  asistentes
    .filter((a) => !a.cancelado)
    .forEach((a) => {
      const key = a.estaca_distrito_mision || "Sin estaca";
      const current = dataMap.get(key) || { estaca: key, total: 0, ingresados: 0 };
      current.total += 1;
      if (a.estado_checkin) current.ingresados += 1;
      dataMap.set(key, current);
    });

  const data = Array.from(dataMap.values()).sort((a, b) => b.total - a.total);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">
            Ocupación por Estaca / Distrito / Misión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="estaca"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={data.length > 6 ? -30 : 0}
                  textAnchor={data.length > 6 ? "end" : "middle"}
                  height={data.length > 6 ? 60 : 30}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  contentStyle={{
                    borderRadius: "0.75rem",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar
                  dataKey="total"
                  name="Total inscritos"
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="ingresados"
                  name="Ya ingresados"
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
