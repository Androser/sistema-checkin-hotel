"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "warning",
}: ConfirmDialogProps) {
  const iconColor =
    variant === "danger" ? "text-red-600" : variant === "warning" ? "text-amber-600" : "text-blue-600";
  const buttonVariant = variant === "danger" ? "destructive" : variant === "warning" ? "destructive" : "default";

  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      <div className="flex items-start gap-4">
        <div className={`rounded-full bg-slate-100 p-2 ${iconColor}`}>
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <div className="mt-2 text-sm text-slate-600">{description}</div>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              {cancelText}
            </Button>
            <Button variant={buttonVariant} onClick={onConfirm}>
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
