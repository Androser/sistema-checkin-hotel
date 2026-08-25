"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function BuscarQrPage() {
  const [identificador, setIdentificador] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/buscar-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificador }),
      });

      const data = await res.json();

      if (!res.ok || !data.token) {
        setError(data.error || "No se encontró el asistente.");
        return;
      }

      router.push(`/qr?token=${data.token}`);
    } catch {
      setError("Ocurrió un error al buscar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Buscar mi QR</h1>
          <p className="mt-1 text-slate-500">
            Ingresa tu cédula o número de celular para ver tu código de acceso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            placeholder="Cédula o celular"
            className="text-center text-lg"
          />
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !identificador.trim()}
          >
            {loading ? "Buscando..." : "Buscar mi QR"}
            <Search className="ml-2 h-4 w-4" />
          </Button>
        </form>

        {error && (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-center text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
