"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Asistente, ScanResult } from "@/lib/types";
import dynamic from "next/dynamic";
import { ScannerResult } from "@/components/escaner/ScannerResult";
import { ManualSearch } from "@/components/escaner/ManualSearch";

const QrScanner = dynamic(
  () => import("@/components/escaner/QrScanner").then((mod) => mod.QrScanner),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-square w-full max-w-sm flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500">
        <div className="mb-2 h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
        <p className="text-sm">Cargando escáner...</p>
      </div>
    ),
  }
);

export default function EscanerPage() {
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<"checkin" | "checkout">("checkin");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [processing, setProcessing] = useState(false);
  const lastProcessedRef = useRef<string>("");

  const processAccess = useCallback(
    async (identifier: string, isQr: boolean, displayName?: string) => {
      if (processing || identifier === lastProcessedRef.current) return;
      lastProcessedRef.current = identifier;
      setProcessing(true);
      setScannerEnabled(false);

      try {
        const { data, error } = await supabase
          .from("asistentes")
          .select("*")
          .or(isQr ? `qr_token.eq.${identifier}` : `cedula.eq.${identifier}`)
          .limit(1)
          .single();

        if (error || !data) {
          setResult({
            type: "error",
            title: "Acceso no válido",
            message: isQr
              ? "El código QR no corresponde a ningún asistente registrado."
              : "No se encontró ningún asistente con esa cédula.",
            scannedName: displayName,
          });
          setProcessing(false);
          return;
        }

        const asistente = data as Asistente;

        if (mode === "checkin") {
          if (asistente.estado_checkin) {
            setResult({
              type: "warning",
              title: "Ya había ingresado",
              message: "El asistente ya realizó check-in previamente.",
              asistente,
              timestamp: asistente.checkin_at || undefined,
            });
            setProcessing(false);
            return;
          }

          const now = new Date().toISOString();
          await supabase
            .from("asistentes")
            .update({ estado_checkin: true, checkin_at: now })
            .eq("id", asistente.id);

          setResult({
            type: "success",
            title: "Check-in exitoso",
            message: "Acceso permitido. Bienvenido al evento.",
            asistente: { ...asistente, estado_checkin: true, checkin_at: now },
            timestamp: now,
          });
        } else {
          if (!asistente.estado_checkin) {
            setResult({
              type: "error",
              title: "No ha ingresado",
              message: "Este asistente aún no ha realizado el check-in.",
              asistente,
            });
            setProcessing(false);
            return;
          }

          if (asistente.estado_checkout) {
            setResult({
              type: "warning",
              title: "Ya había salido",
              message: "El asistente ya realizó check-out previamente.",
              asistente,
              timestamp: asistente.checkout_at || undefined,
            });
            setProcessing(false);
            return;
          }

          const now = new Date().toISOString();
          await supabase
            .from("asistentes")
            .update({ estado_checkout: true, checkout_at: now })
            .eq("id", asistente.id);

          setResult({
            type: "success",
            title: "Check-out exitoso",
            message: "Salida registrada correctamente.",
            asistente: { ...asistente, estado_checkout: true, checkout_at: now },
            timestamp: now,
          });
        }
      } finally {
        setProcessing(false);
      }
    },
    [mode, processing, supabase]
  );

  const parseQrText = (text: string) => {
    let token = text;
    let name = "";
    try {
      if (text.startsWith("http")) {
        const url = new URL(text);
        token = url.searchParams.get("token") || text;
        name = decodeURIComponent(url.searchParams.get("n") || "");
      }
    } catch {
      token = text;
    }
    return { token, name };
  };

  const handleScan = useCallback(
    (text: string) => {
      const { token, name } = parseQrText(text);
      if (!token) {
        setResult({
          type: "error",
          title: "QR inválido",
          message: "No se encontró un token válido en el código escaneado.",
          scannedName: name,
        });
        return;
      }
      processAccess(token, true, name);
    },
    [processAccess]
  );

  const handleManualSearch = (value: string) => {
    lastProcessedRef.current = "";
    processAccess(value, false);
  };

  const handleNext = () => {
    lastProcessedRef.current = "";
    setResult(null);
    setScannerEnabled(true);
  };

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] flex-col items-center gap-6 lg:min-h-0">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-2xl font-bold text-slate-900">Escáner QR</h1>
        <p className="text-slate-500">
          Escanea el código del asistente para registrar entrada o salida
        </p>
      </motion.div>

      <div className="flex w-full max-w-sm overflow-hidden rounded-full border border-slate-200 bg-white p-1 shadow-sm">
        <button
          onClick={() => {
            setMode("checkin");
            handleNext();
          }}
          className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
            mode === "checkin"
              ? "bg-emerald-500 text-white shadow"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Check-in
        </button>
        <button
          onClick={() => {
            setMode("checkout");
            handleNext();
          }}
          className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
            mode === "checkout"
              ? "bg-amber-500 text-white shadow"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Check-out
        </button>
      </div>

      <QrScanner onScan={handleScan} enabled={scannerEnabled && !result} />

      <div className="mt-6 w-full max-w-sm">
        <ManualSearch onSearch={handleManualSearch} loading={processing} />
      </div>

      <ScannerResult result={result} onNext={handleNext} />
    </div>
  );
}
