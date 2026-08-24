"use client";

import { useState } from "react";
import { Copy, Check, Download, Image } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Asistente } from "@/lib/types";
import { formatFullName } from "@/lib/utils";

interface ReenviarQrModalProps {
  open: boolean;
  onClose: () => void;
  asistente: Asistente | null;
}

export function ReenviarQrModal({ open, onClose, asistente }: ReenviarQrModalProps) {
  const [copied, setCopied] = useState(false);

  if (!asistente) return null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const displayName = encodeURIComponent(
    `${asistente.nombres} ${asistente.apellidos}`.trim()
  );
  const qrLink = asistente.qr_token
    ? `${siteUrl}/escaner?token=${asistente.qr_token}&n=${displayName}`
    : "";
  const imageUrl = asistente.qr_token
    ? `/api/qr?token=${asistente.qr_token}&n=${displayName}`
    : "";

  const handleCopy = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
      } finally {
        document.body.removeChild(textarea);
      }
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `qr-${asistente.cedula || asistente.id}.png`;
    link.click();
  };

  const whatsappText = encodeURIComponent(
    `Hola ${asistente.nombres}, este es tu código QR para el check-in del evento: ${qrLink}`
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reenviar QR"
      description={`Código de acceso para ${formatFullName(asistente)}`}
    >
      <div className="space-y-5">
        {!asistente.qr_token ? (
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
            Este asistente aún no tiene un token QR generado. Usa el script de
            generación de QR para crearlo.
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Enlace del QR
              </label>
              <div className="flex gap-2">
                <Input value={qrLink} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => handleCopy(qrLink)}>
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Token</label>
              <Input value={asistente.qr_token} readOnly className="font-mono text-xs" />
            </div>

            {imageUrl && (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-100 bg-white p-4">
                <img
                  src={imageUrl}
                  alt={`QR de ${formatFullName(asistente)}`}
                  className="h-48 w-48 rounded-lg"
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(imageUrl)}
                  >
                    <Image className="mr-2 h-4 w-4" />
                    Copiar link de imagen
                  </Button>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" onClick={() => handleCopy(qrLink)}>
                <Copy className="mr-2 h-4 w-4" />
                {copied ? "Copiado" : "Copiar enlace"}
              </Button>
              <a
                href={`https://wa.me/${asistente.celular?.replace(/\D/g, "")}?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                  Enviar por WhatsApp
                </Button>
              </a>
            </div>
          </>
        )}

        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
