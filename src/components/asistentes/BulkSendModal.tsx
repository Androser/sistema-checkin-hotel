"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Asistente } from "@/lib/types";
import { formatFullName } from "@/lib/utils";
import { SITE_URL } from "@/lib/site";
import { buildWhatsAppMessageWithCompania } from "@/lib/hotel";

interface BulkSendModalProps {
  open: boolean;
  onClose: () => void;
  asistentes: Asistente[];
  allAsistentes: Asistente[];
}

export function BulkSendModal({ open, onClose, asistentes, allAsistentes }: BulkSendModalProps) {
  const [index, setIndex] = useState(0);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const current = asistentes[index];
  const total = asistentes.length;
  const progress = total > 0 ? Math.round(((sentIds.size) / total) * 100) : 0;

  const siteUrl = SITE_URL;
  const { qrLink, imageUrl, companiaInfo } = useMemo(() => {
    if (!current?.qr_token) return { qrLink: "", imageUrl: "", companiaInfo: undefined };
    const displayName = encodeURIComponent(
      `${current.nombres} ${current.apellidos}`.trim()
    );

    const companiaNumero = current.compania_numero;
    const companiaLink = companiaNumero
      ? allAsistentes.find(
          (a) =>
            a.compania_numero === companiaNumero && a.link_whatsapp
        )?.link_whatsapp
      : undefined;

    const companiaInfo =
      companiaNumero && companiaLink
        ? {
            numero: companiaNumero,
            link: companiaLink,
            consejeros: allAsistentes.filter(
              (a) =>
                a.rol === "consejero" && a.compania_numero === companiaNumero
            ),
            participantes: allAsistentes.filter(
              (a) =>
                a.rol !== "consejero" &&
                a.rol !== "coordinador" &&
                a.compania_numero === companiaNumero
            ),
          }
        : undefined;

    return {
      qrLink: `${siteUrl}/qr?token=${current.qr_token}`,
      imageUrl: `/api/qr?token=${current.qr_token}&n=${displayName}`,
      companiaInfo,
    };
  }, [current, siteUrl, allAsistentes]);

  useEffect(() => {
    if (open) {
      setIndex(0);
      setSentIds(new Set());
    }
  }, [open]);

  const handleOpenWhatsApp = () => {
    if (!current || !qrLink) return;
    const text = encodeURIComponent(
      buildWhatsAppMessageWithCompania(
        formatFullName(current),
        qrLink,
        companiaInfo
      )
    );
    const phone = (current.celular || "").replace(/\D/g, "");
    window.open(
      `https://wa.me/${phone}?text=${text}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleMarkSent = () => {
    if (!current) return;
    setSentIds((prev) => new Set(prev).add(current.id));
    if (index < total - 1) {
      setIndex((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    if (index < total - 1) {
      setIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (index > 0) {
      setIndex((prev) => prev - 1);
    }
  };

  const isFinished = index >= total - 1 && sentIds.has(current?.id || "");

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Envío masivo de QR"
      description={`${sentIds.size} de ${total} enviados (${progress}%)`}
      className="max-w-md"
    >
      <div className="space-y-5">
        {/* Barra de progreso */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <AnimatePresence mode="wait">
          {isFinished ? (
            <motion.div
              key="finished"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-4 rounded-xl border border-emerald-100 bg-emerald-50 p-8 text-center"
            >
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              <div>
                <h3 className="text-lg font-semibold text-emerald-900">
                  Envío completado
                </h3>
                <p className="mt-1 text-sm text-emerald-700">
                  Revisaste y enviaste {sentIds.size} de {total} códigos QR.
                </p>
              </div>
              <Button onClick={onClose} className="mt-2 w-full">
                Cerrar
              </Button>
            </motion.div>
          ) : current ? (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="text-center">
                <p className="text-xs font-medium text-slate-400">
                  Asistente {index + 1} de {total}
                </p>
                <h3 className="text-lg font-semibold text-slate-900">
                  {formatFullName(current)}
                </h3>
                <p className="text-sm text-slate-500">
                  {current.estaca_distrito_mision} · {current.celular || "Sin celular"}
                </p>
              </div>

              {current.qr_token ? (
                <>
                  <div className="flex justify-center rounded-xl border border-slate-100 bg-white p-4">
                    <Image
                      src={imageUrl}
                      alt={`QR de ${formatFullName(current)}`}
                      width={192}
                      height={192}
                      unoptimized
                      className="rounded-lg"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      Enlace del QR
                    </label>
                    <Input value={qrLink} readOnly className="font-mono text-xs" />
                  </div>

                  <div className="grid gap-3">
                    <Button
                      onClick={handleOpenWhatsApp}
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      disabled={!current.celular}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      {current.celular
                        ? "Abrir WhatsApp y enviar"
                        : "Sin número de celular"}
                    </Button>

                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" onClick={handleSkip}>
                        Saltar
                      </Button>
                      <Button
                        onClick={handleMarkSent}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Enviado, siguiente
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                  Este asistente no tiene token QR. Ejecuta{" "}
                  <code className="rounded bg-amber-100 px-1 py-0.5 text-amber-900">
                    npm run generate-qr
                  </code>{" "}
                  primero.
                </div>
              )}

              {/* Navegación */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={index === 0}
                >
                  Anterior
                </Button>
                <span className="text-xs text-slate-400">
                  {index + 1} / {total}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  disabled={index === total - 1}
                >
                  Siguiente
                </Button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </Modal>
  );
}