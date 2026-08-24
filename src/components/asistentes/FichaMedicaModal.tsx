"use client";

import { useMemo } from "react";
import { Phone, AlertTriangle, HeartPulse, Pill, Stethoscope } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Asistente } from "@/lib/types";
import { formatFullName } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Modal } from "@/components/ui/modal";

interface FichaMedicaModalProps {
  open: boolean;
  onClose: () => void;
  asistente: Asistente | null;
}

function Content({ asistente }: { asistente: Asistente | null }) {
  if (!asistente) return null;

  const hasRisk =
    asistente.enfermedad_cronica ||
    asistente.tratamiento_medico ||
    asistente.alergias;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <HeartPulse className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            {formatFullName(asistente)}
          </h3>
          <p className="text-sm text-slate-500">
            {asistente.estaca_distrito_mision}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {asistente.grupo_sanguineo && (
              <Badge variant="destructive">
                Grupo sanguíneo: {asistente.grupo_sanguineo}
              </Badge>
            )}
            {asistente.sexo && (
              <Badge variant="secondary">
                Sexo: {asistente.sexo === "M" ? "Masculino" : asistente.sexo === "F" ? "Femenino" : "Otro"}
              </Badge>
            )}
            {asistente.fecha_nacimiento && (
              <Badge variant="secondary">
                Nacimiento: {asistente.fecha_nacimiento}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {hasRisk && (
        <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Alerta médica registrada</p>
            <p className="text-sm">
              Este asistente tiene información de salud que requiere atención.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <Section icon={<Stethoscope className="h-5 w-5" />} title="Condiciones y tratamientos">
          <Info label="Enfermedad crónica" value={asistente.enfermedad_cronica} />
          <Info label="Tratamiento médico" value={asistente.tratamiento_medico} />
          <Info label="Alergias" value={asistente.alergias} />
          <Info label="EPS / Seguro" value={asistente.eps_seguro} />
        </Section>

        <Section icon={<Pill className="h-5 w-5" />} title="Contacto de emergencia">
          <Info label="Nombre" value={asistente.contacto_emergencia_nombre} />
          <Info label="Teléfono" value={asistente.contacto_emergencia_telefono} />
          {asistente.contacto_emergencia_telefono && (
            <a
              href={`tel:${asistente.contacto_emergencia_telefono}`}
              className="mt-3 inline-flex"
            >
              <Button variant="success" className="gap-2">
                <Phone className="h-4 w-4" />
                Llamar a contacto
              </Button>
            </a>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
      <div className="mb-3 flex items-center gap-2 text-slate-900">
        {icon}
        <h4 className="font-semibold">{title}</h4>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-700">{value || "—"}</p>
    </div>
  );
}

export function FichaMedicaModal({
  open,
  onClose,
  asistente,
}: FichaMedicaModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (isMobile) {
    return (
      <Drawer open={open} onClose={onClose} position="bottom" title="Ficha médica">
        <Content asistente={asistente} />
      </Drawer>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Ficha médica" className="max-w-lg">
      <Content asistente={asistente} />
    </Modal>
  );
}
