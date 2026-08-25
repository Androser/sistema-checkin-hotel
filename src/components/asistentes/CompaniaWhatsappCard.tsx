"use client";

import { useState } from "react";
import { MessageCircle, Pencil, Check, X } from "lucide-react";
import { Asistente } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  buildCompaniaWhatsAppMessage,
  getWhatsAppShareUrl,
} from "@/lib/hotel";

interface CompaniaWhatsappCardProps {
  numero: number;
  consejeros: Asistente[];
  participantes: Asistente[];
  linkWhatsapp: string | null;
  onSaved: () => void;
}

export function CompaniaWhatsappCard({
  numero,
  consejeros,
  participantes,
  linkWhatsapp,
  onSaved,
}: CompaniaWhatsappCardProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(linkWhatsapp || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasLink = Boolean(linkWhatsapp);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const trimmed = value.trim();
      const { error: updateError } = await supabase
        .from("asistentes")
        .update({ link_whatsapp: trimmed || null })
        .eq("compania_numero", numero);

      if (updateError) throw updateError;

      setEditing(false);
      onSaved();
    } catch (err: any) {
      setError(err?.message || "Error al guardar el link.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(linkWhatsapp || "");
    setEditing(false);
    setError(null);
  };

  const message = buildCompaniaWhatsAppMessage({
    numero,
    consejeros,
    participantes,
    link: linkWhatsapp || "",
  });
  const shareUrl = getWhatsAppShareUrl(message);

  return (
    <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
      <div className="flex items-center gap-2 text-emerald-800">
        <MessageCircle className="h-5 w-5" />
        <h4 className="font-semibold">
          Grupo de WhatsApp de la Compañía {numero}
        </h4>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <Input
            placeholder="Pega aquí el link del grupo de WhatsApp..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={saving}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Check className="mr-1 h-4 w-4" />
              {saving ? "Guardando..." : "Guardar"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={saving}
            >
              <X className="mr-1 h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {hasLink ? (
            <>
              <p className="break-all text-sm text-emerald-900">
                {linkWhatsapp}
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm">
                    <MessageCircle className="mr-1 h-4 w-4" />
                    Enviar invitación por WhatsApp
                  </Button>
                </a>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  Editar link
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-emerald-800">
                Aún no hay un link de WhatsApp para esta compañía. Agrégalo para
                que los participantes puedan unirse.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
              >
                <Pencil className="mr-1 h-4 w-4" />
                Agregar link de WhatsApp
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
