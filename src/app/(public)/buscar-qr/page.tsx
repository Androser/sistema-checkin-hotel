"use client";

import { useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Search, Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AsistenteResult {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string | null;
  qr_token: string | null;
  estaca_distrito_mision: string | null;
}

export default function BuscarQrPage() {
  const [step, setStep] = useState<"search" | "result">("search");
  const [cedulaInput, setCedulaInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [asistente, setAsistente] = useState<AsistenteResult | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [editCedula, setEditCedula] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaveMessage("");
    setLoading(true);

    try {
      const clean = cedulaInput.replace(/\D/g, "").trim();
      const res = await fetch("/api/buscar-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificador: clean }),
      });

      const data = await res.json();

      if (!res.ok || !data.qr_token) {
        setError(data.error || "No se encontró un asistente con esa cédula.");
        return;
      }

      setAsistente(data);
      setEditCedula(data.cedula || "");

      // Generar QR inline
      const siteUrl = "https://sistema-checkin-hotel-omega.vercel.app";
      const displayName = encodeURIComponent(
        `${data.nombres} ${data.apellidos}`.trim()
      );
      const scanUrl = `${siteUrl}/escaner?token=${data.qr_token}&n=${displayName}`;
      const dataUrl = await QRCode.toDataURL(scanUrl, {
        width: 400,
        margin: 2,
        type: "image/png",
      });
      setQrDataUrl(dataUrl);
      setStep("result");
    } catch {
      setError("Ocurrió un error al buscar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCedula = async () => {
    if (!asistente) return;
    setSaving(true);
    setSaveMessage("");

    try {
      const res = await fetch("/api/actualizar-cedula", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: asistente.id, cedula: editCedula }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSaveMessage(data.error || "Error al guardar.");
        return;
      }

      setAsistente((prev) => (prev ? { ...prev, cedula: data.cedula } : null));
      setSaveMessage("Cédula actualizada correctamente.");
    } catch {
      setSaveMessage("Error al guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    setStep("search");
    setAsistente(null);
    setQrDataUrl("");
    setEditCedula("");
    setError("");
    setSaveMessage("");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        {step === "search" ? (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-slate-900">Buscar mi QR</h1>
              <p className="mt-1 text-slate-500">
                Ingresa tu número de cédula para ver tu código de acceso.
              </p>
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              <Input
                value={cedulaInput}
                onChange={(e) => setCedulaInput(e.target.value)}
                placeholder="Número de cédula"
                className="text-center text-lg"
              />
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !cedulaInput.trim()}
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
          </>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-slate-900">Código de acceso</h1>
              <p className="mt-1 text-slate-500">Muestra este QR al llegar al hotel</p>
            </div>

            {asistente && (
              <>
                <div className="mb-6 text-center">
                  <p className="text-sm text-slate-400">Asistente</p>
                  <p className="text-xl font-semibold text-slate-900">
                    {asistente.nombres} {asistente.apellidos}
                  </p>
                  {asistente.estaca_distrito_mision && (
                    <p className="text-sm text-slate-500">{asistente.estaca_distrito_mision}</p>
                  )}
                </div>

                {qrDataUrl && (
                  <div className="mb-6 flex justify-center rounded-2xl border border-slate-100 bg-white p-4">
                    <Image
                      src={qrDataUrl}
                      alt={`QR de ${asistente.nombres} ${asistente.apellidos}`}
                      width={280}
                      height={280}
                      unoptimized
                      className="rounded-lg"
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700">
                    Mi número de cédula
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={editCedula}
                      onChange={(e) => setEditCedula(e.target.value)}
                      placeholder="Cédula"
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSaveCedula}
                      disabled={saving || !editCedula.trim()}
                      type="button"
                    >
                      {saving ? "Guardando..." : <Save className="h-4 w-4" />}
                    </Button>
                  </div>
                  {saveMessage && (
                    <p
                      className={`text-center text-sm ${
                        saveMessage.includes("Error") || saveMessage.includes("error")
                          ? "text-red-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {saveMessage}
                    </p>
                  )}
                </div>

                <div className="mt-6 text-center">
                  <Button variant="outline" onClick={handleBack} type="button">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Buscar otra cédula
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
