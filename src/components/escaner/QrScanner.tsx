"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Flashlight, FlashlightOff, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrScannerProps {
  onScan: (text: string) => void;
  enabled: boolean;
}

export function QrScanner({ onScan, enabled }: QrScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const html5QrCodeRef = useRef<any>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const start = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!mounted || !scannerRef.current) return;

        const scanner = new Html5Qrcode(scannerRef.current.id);
        html5QrCodeRef.current = scanner;

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          setError("No se encontró ninguna cámara.");
          setLoading(false);
          return;
        }

        // Preferir cámara trasera
        const camera =
          cameras.find((c) =>
            c.label.toLowerCase().includes("back") ||
            c.label.toLowerCase().includes("trasera")
          ) || cameras[0];

        await scanner.start(
          camera.id,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            onScan(decodedText);
          },
          () => {}
        );

        // Intentar obtener el track de video para linterna
        try {
          const qrCanvas = scannerRef.current?.querySelector("video");
          if (qrCanvas && (qrCanvas as any).srcObject) {
            const stream = (qrCanvas as any).srcObject as MediaStream;
            const track = stream.getVideoTracks()[0];
            trackRef.current = track;
            const capabilities = track.getCapabilities() as any;
            setHasTorch(!!capabilities?.torch);
          }
        } catch {
          setHasTorch(false);
        }

        setLoading(false);
      } catch (err: any) {
        setError(err?.message || "Error al iniciar la cámara.");
        setLoading(false);
      }
    };

    start();

    return () => {
      mounted = false;
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [enabled, onScan]);

  const toggleTorch = async () => {
    const track = trackRef.current;
    if (!track) return;
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchOn } as any],
      });
      setTorchOn((prev) => !prev);
    } catch {
      // ignore
    }
  };

  if (!enabled) {
    return (
      <div className="flex aspect-square w-full max-w-sm flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400">
        <CameraOff className="mb-2 h-10 w-10" />
        <p className="text-sm">Escáner pausado</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-xl">
        <div
          id="qr-reader"
          ref={scannerRef}
          className="absolute inset-0 h-full w-full"
        />

        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 text-white">
            <Loader2 className="mb-2 h-8 w-8 animate-spin" />
            <p className="text-sm">Iniciando cámara...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 p-6 text-center text-white">
            <CameraOff className="mb-2 h-10 w-10 text-red-400" />
            <p className="text-sm font-medium text-red-200">{error}</p>
          </div>
        )}

        {/* Marco del escáner */}
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="relative h-56 w-56">
            {/* Esquinas */}
            <div className="absolute left-0 top-0 h-6 w-6 rounded-tl-lg border-l-4 border-t-4 border-white/80 shadow-[0_0_10px_rgba(37,99,235,0.8)]" />
            <div className="absolute right-0 top-0 h-6 w-6 rounded-tr-lg border-r-4 border-t-4 border-white/80 shadow-[0_0_10px_rgba(37,99,235,0.8)]" />
            <div className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-lg border-b-4 border-l-4 border-white/80 shadow-[0_0_10px_rgba(37,99,235,0.8)]" />
            <div className="absolute bottom-0 right-0 h-6 w-6 rounded-br-lg border-b-4 border-r-4 border-white/80 shadow-[0_0_10px_rgba(37,99,235,0.8)]" />

            {/* Línea láser */}
            <motion.div
              className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.9)]"
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </div>
        </div>
      </div>

      {hasTorch && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleTorch}
          className="absolute -bottom-12 left-1/2 -translate-x-1/2"
        >
          {torchOn ? (
            <FlashlightOff className="mr-2 h-4 w-4" />
          ) : (
            <Flashlight className="mr-2 h-4 w-4" />
          )}
          {torchOn ? "Apagar linterna" : "Encender linterna"}
        </Button>
      )}
    </div>
  );
}
