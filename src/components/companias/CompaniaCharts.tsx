"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Asistente } from "@/lib/types";
import { calcularEdad } from "@/lib/utils";

interface CompaniaChartsProps {
  asistentes: Asistente[];
}

const COLORS = ["#2563EB", "#EC4899", "#059669", "#D97706", "#7C3AED"];

export function CompaniaCharts({ asistentes }: CompaniaChartsProps) {
  // Participantes por compañía (excluyendo coordinadores y cancelados)
  const activos = asistentes.filter((a) => !a.cancelado);
  const participantes = activos.filter((a) => a.rol !== "coordinador");

  const porCompania = [1, 2, 3, 4, 5, 6, 7, 8].map((numero) => ({
    compania: `C${numero}`,
    participantes: participantes.filter(
      (a) => a.compania_numero === numero
    ).length,
  }));

  // Género total
  const hombres = activos.filter(
    (a) => (a.sexo || "").toLowerCase() === "m"
  ).length;
  const mujeres = activos.filter(
    (a) => (a.sexo || "").toLowerCase() === "f"
  ).length;
  const generoData = [
    { nombre: "Hombres", valor: hombres },
    { nombre: "Mujeres", valor: mujeres },
  ];

  // Edad promedio por compañía
  const edadPorCompania = [1, 2, 3, 4, 5, 6, 7, 8].map((numero) => {
    const edades = participantes
      .filter((a) => a.compania_numero === numero)
      .map((a) => calcularEdad(a.fecha_nacimiento))
      .filter((e): e is number => e !== null);
    return {
      compania: `C${numero}`,
      edad:
        edades.length > 0
          ? Math.round(edades.reduce((a, b) => a + b, 0) / edades.length)
          : 0,
    };
  });

  // Hombres vs mujeres por compañía
  const generoPorCompania = [1, 2, 3, 4, 5, 6, 7, 8].map((numero) => ({
    compania: `C${numero}`,
    hombres: participantes.filter(
      (a) => a.compania_numero === numero && (a.sexo || "").toLowerCase() === "m"
    ).length,
    mujeres: participantes.filter(
      (a) => a.compania_numero === numero && (a.sexo || "").toLowerCase() === "f"
    ).length,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Participantes por compañía */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">
          Participantes por compañía
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porCompania}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="compania" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="participantes" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribución por género */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">
          Distribución por género
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={generoData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="valor"
                label={({ nombre, valor }) => `${nombre}: ${valor}`}
              >
                {generoData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? "#2563EB" : "#EC4899"}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Edad promedio por compañía */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">
          Edad promedio por compañía
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={edadPorCompania}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="compania" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="edad" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hombres vs mujeres por compañía */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">
          Hombres vs mujeres por compañía
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={generoPorCompania}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="compania" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="hombres" stackId="a" fill="#2563EB" radius={[0, 0, 0, 0]} />
              <Bar dataKey="mujeres" stackId="a" fill="#EC4899" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
