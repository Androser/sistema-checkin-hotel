"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import QRCode from "qrcode";
import { Search, Save, Download, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HOTEL_INFO, EVENT_INFO } from "@/lib/hotel";

interface Consejero {
  nombres: string | null;
  apellidos: string | null;
  celular: string | null;
  sexo: string | null;
}

interface Companero {
  nombres: string | null;
  apellidos: string | null;
  estaca_distrito_mision: string | null;
  barrio: string | null;
  sexo: string | null;
}

interface AsistenteData {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  cedula: string | null;
  qr_token: string;
  estaca_distrito_mision: string | null;
  celular: string | null;
  barrio: string | null;
  tipo_alojamiento: string | null;
  numero_habitacion: string | null;
  cama_asignada: string | null;
  compania_numero: number | null;
  companeros: Companero[] | null;
  consejeros: Consejero[] | null;
}

function QrPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenFromUrl = searchParams.get("token");

  const [step, setStep] = useState<"search" | "loading" | "result" | "notfound">(
    tokenFromUrl ? "loading" : "search"
  );
  const [identificador, setIdentificador] = useState("");
  const [asistente, setAsistente] = useState<AsistenteData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [editCedula, setEditCedula] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    hotel: true,
    compania: true,
    habitacion: false,
    info: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const loadByToken = useCallback(async (token: string) => {
    setStep("loading");
    try {
      const res = await fetch(`/api/qr-info?token=${encodeURIComponent(token)}`);
      if (!res.ok) throw new Error("Token inválido");
      const data = await res.json();
      await showResult(data);
    } catch {
      setStep("notfound");
    }
  }, []);

  useEffect(() => {
    if (tokenFromUrl) {
      loadByToken(tokenFromUrl);
    }
  }, [tokenFromUrl, loadByToken]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage("");
    setStep("loading");

    try {
      const res = await fetch("/api/buscar-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificador }),
      });

      const data = await res.json();

      if (!res.ok || !data.qr_token) {
        setStep("notfound");
        return;
      }

      router.replace(`/qr?token=${data.qr_token}`);
    } catch {
      setStep("notfound");
    }
  };

  const showResult = async (data: AsistenteData) => {
    setAsistente(data);
    setEditCedula(data.cedula || "");

    const siteUrl = "https://sistema-checkin-hotel-omega.vercel.app";
    const displayName = encodeURIComponent(
      `${data.nombres || ""} ${data.apellidos || ""}`.trim()
    );
    const scanUrl = `${siteUrl}/escaner?token=${data.qr_token}&n=${displayName}`;
    const dataUrl = await QRCode.toDataURL(scanUrl, {
      width: 400,
      margin: 2,
      type: "image/png",
    });
    setQrDataUrl(dataUrl);
    setStep("result");
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

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `qr-${asistente?.cedula || asistente?.id}.png`;
    link.click();
  };

  const fullName = `${asistente?.nombres || ""} ${asistente?.apellidos || ""}`.trim();

  const Section = ({
    title,
    sectionKey,
    children,
  }: {
    title: string;
    sectionKey: string;
    children: React.ReactNode;
  }) => (
    <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => toggleSection(sectionKey)}
        className="flex w-full items-center justify-between px-4 py-3 text-left font-medium text-slate-800 hover:bg-slate-50"
      >
        {title}
        {openSections[sectionKey] ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {openSections[sectionKey] && <div className="px-4 pb-4">{children}</div>}
    </div>
  );

  if (step === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
        <p className="text-slate-500">Cargando...</p>
      </main>
    );
  }

  if (step === "search" || step === "notfound") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
          <div className="mb-6 text-center">
            <p className="text-sm font-medium text-blue-600">{EVENT_INFO.nombre}</p>
            <h1 className="text-2xl font-bold text-slate-900">Buscar mi QR</h1>
            <p className="mt-1 text-slate-500">
              Ingresa tu cédula o número de celular para ver tu código de acceso.
            </p>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <Input
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder="Cédula o celular"
              className="text-center text-lg"
            />
            <Button type="submit" className="w-full" disabled={!identificador.trim()}>
              Buscar mi QR
              <Search className="ml-2 h-4 w-4" />
            </Button>
          </form>

          {step === "notfound" && (
            <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-center text-sm text-red-700">
              No se encontró un asistente con ese dato. Verifica e intenta de nuevo.
            </div>
          )}
        </div>
      </main>
    );
  }

  if (!asistente) return null;

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-8">
      <div className="mx-auto max-w-md space-y-4">
        {/* Encabezado */}
        <div className="rounded-3xl bg-white p-6 shadow-xl text-center">
          <p className="text-sm font-medium text-blue-600">{EVENT_INFO.nombre}</p>
          <h1 className="text-xl font-bold text-slate-900">{HOTEL_INFO.nombre}</h1>
          <p className="mt-2 text-lg font-semibold text-slate-800">{fullName}</p>
          {asistente.estaca_distrito_mision && (
            <p className="text-sm text-slate-500">{asistente.estaca_distrito_mision}</p>
          )}
        </div>

        {/* QR */}
        <div className="rounded-3xl bg-white p-6 shadow-xl text-center">
          <h2 className="text-lg font-semibold text-slate-900">Código de acceso</h2>
          <p className="text-sm text-slate-500">Muestra este QR al llegar al hotel</p>

          {qrDataUrl && (
            <div className="my-4 flex justify-center rounded-2xl border border-slate-100 bg-white p-4">
              <Image
                src={qrDataUrl}
                alt={`QR de ${fullName}`}
                width={260}
                height={260}
                unoptimized
                className="rounded-lg"
              />
            </div>
          )}

          <Button variant="outline" onClick={handleDownload} type="button">
            <Download className="mr-2 h-4 w-4" />
            Descargar QR
          </Button>
        </div>

        {/* Secciones colapsables */}
        <div className="space-y-3">
          <Section title="Datos del hotel" sectionKey="hotel">
            <div className="space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-medium">Dirección:</span> {HOTEL_INFO.direccion}
              </p>
              <p>
                <span className="font-medium">Teléfono:</span> {HOTEL_INFO.telefono}
              </p>
              <p>
                <span className="font-medium">Check-in:</span> {HOTEL_INFO.horarioCheckIn}
              </p>
              <p>
                <span className="font-medium">Check-out:</span> {HOTEL_INFO.horarioCheckOut}
              </p>
              {HOTEL_INFO.notasImportantes.length > 0 && (
                <ul className="list-inside list-disc space-y-1 pt-2">
                  {HOTEL_INFO.notasImportantes.map((nota, i) => (
                    <li key={i}>{nota}</li>
                  ))}
                </ul>
              )}
            </div>
          </Section>

          <Section title="Mi compañía" sectionKey="compania">
            <div className="space-y-3 text-sm text-slate-700">
              <p>
                <span className="font-medium">Compañía:</span>{" "}
                {asistente.compania_numero ? (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-700">
                    {asistente.compania_numero}
                  </span>
                ) : (
                  "Por asignar"
                )}
              </p>

              {asistente.consejeros && asistente.consejeros.length > 0 && (
                <div>
                  <p className="font-medium">Consejeros:</p>
                  <ul className="mt-1 space-y-2">
                    {asistente.consejeros.map((c, i) => (
                      <li key={i} className="rounded-lg bg-slate-50 p-2">
                        <p className="font-medium text-slate-900">
                          {c.nombres} {c.apellidos}
                        </p>
                        <p className="text-xs text-slate-500">
                          {c.celular ? (
                            <a
                              href={`https://wa.me/${c.celular.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {c.celular}
                            </a>
                          ) : (
                            "Sin celular"
                          )}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {asistente.companeros && asistente.companeros.length > 0 && (
                <div>
                  <p className="font-medium">Compañeros de compañía:</p>
                  <ul className="mt-1 space-y-1">
                    {asistente.companeros.map((c, i) => (
                      <li key={i} className="rounded-lg bg-slate-50 p-2">
                        <p className="font-medium text-slate-900">
                          {c.nombres} {c.apellidos}
                        </p>
                        <p className="text-xs text-slate-500">
                          {c.estaca_distrito_mision || "—"}
                          {c.barrio ? ` · ${c.barrio}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!asistente.compania_numero && (
                <p className="text-xs text-slate-500">
                  Aún no has sido asignado a una compañía. Vuelve a consultar más tarde.
                </p>
              )}
            </div>
          </Section>

          <Section title="Mi habitación" sectionKey="habitacion">
            <div className="space-y-3 text-sm text-slate-700">
              <p>
                <span className="font-medium">Alojamiento:</span>{" "}
                {asistente.tipo_alojamiento || "Por asignar"}
              </p>
              <p>
                <span className="font-medium">Habitación:</span>{" "}
                {asistente.numero_habitacion || "Por asignar"}
              </p>
              <p>
                <span className="font-medium">Cama:</span>{" "}
                {asistente.cama_asignada || "Por asignar"}
              </p>
            </div>
          </Section>

          <Section title="Mi información" sectionKey="info">
            <div className="space-y-3 text-sm text-slate-700">
              <p>
                <span className="font-medium">Nombre:</span> {fullName}
              </p>
              <p>
                <span className="font-medium">Celular:</span> {asistente.celular || "—"}
              </p>
              <div>
                <label className="font-medium">Cédula:</label>
                <div className="mt-1 flex gap-2">
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
                    {saving ? "..." : <Save className="h-4 w-4" />}
                  </Button>
                </div>
                {saveMessage && (
                  <p
                    className={`mt-1 text-xs ${
                      saveMessage.includes("Error")
                        ? "text-red-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {saveMessage}
                  </p>
                )}
              </div>
            </div>
          </Section>
        </div>

        <div className="text-center">
          <a
            href="/qr"
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Buscar otro QR
          </a>
        </div>
      </div>
    </main>
  );
}

export default function QrPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
          <p className="text-slate-500">Cargando...</p>
        </main>
      }
    >
      <QrPageContent />
    </Suspense>
  );
}
