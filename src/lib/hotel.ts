import { Asistente } from "./types";
import { formatFullName } from "./utils";

export const EVENT_INFO = {
  nombre: "Convención JA 2026",
};

export const HOTEL_INFO = {
  nombre: "COMFABOY - CENTRO VACACIONAL MONIQUIRÁ",
  direccion: "Via A Santasofia, Cra. 9 #1-84, Moniquirá, Boyacá",
  telefono: "+57 314 4119261",
  horarioCheckIn: "3:00 p.m.",
  horarioCheckOut: "12:00 p.m.",
  notasImportantes: [
    "Llegar con el QR listo en el celular o impreso.",
    "Respetar el horario de check-in asignado.",
    "En caso de emergencia, contactar al líder de estaca.",
  ],
};

const EMOJIS = {
  wave: "\u{1F44B}",
  party: "\u{1F389}",
  hotel: "\u{1F3E8}",
  pin: "\u{1F4CD}",
  link: "\u{1F517}",
  warning: "\u{26A0}\u{FE0F}",
  phone: "\u{1F4F1}",
  person: "\u{1F464}",
  people: "\u{1F465}",
  man: "\u{1F468}",
  woman: "\u{1F469}",
  hands: "\u{1F64C}",
  divider: "\u{2500}".repeat(13),
};

export function buildWhatsAppMessage(nombreCompleto: string, qrLink: string) {
  return (
    `Hola ${nombreCompleto},\n\n` +
    `Este es tu enlace de acceso para la ${EVENT_INFO.nombre}.\n\n` +
    `Hotel: ${HOTEL_INFO.nombre}\n` +
    `Dirección: ${HOTEL_INFO.direccion}\n\n` +
    `⚠️ *IMPORTANTE:* Al abrir el enlace podrás ver tus datos y los de tu compañía. *Debes ingresar tu número de cédula* para poder ver y descargar tu código QR de acceso.\n` +
    `Por favor asegúrate de que tus datos sean correctos. Esto evitará demoras en tu check-in y check-out.\n\n` +
    `Abre el enlace aquí:\n\n` +
    `${qrLink}\n\n` +
    `No compartas este enlace con otras personas.`
  );
}

export function buildCompaniaWhatsAppMessage({
  numero,
  consejeros,
  participantes,
  link,
}: {
  numero: number;
  consejeros: Asistente[];
  participantes: Asistente[];
  link: string;
}) {
  const e = EMOJIS;
  const nombresConsejeros = consejeros.map(formatFullName).join(" y ");

  return (
    `${e.wave} ¡Hola!\n\n` +
    `Te invitamos a unirte al grupo de WhatsApp de la *Compañía ${numero}* de la ${EVENT_INFO.nombre}.\n\n` +
    `${e.person} Consejeros: ${nombresConsejeros || "Por definir"}\n` +
    `${e.people} Participantes: ${participantes.length}\n\n` +
    `${e.link} Únete aquí:\n${link}\n\n` +
    `¡Es importante unirse para recibir toda la información del evento! ${e.hands}`
  );
}

export function buildWhatsAppMessageWithCompania(
  nombreCompleto: string,
  qrLink: string,
  compania?: {
    numero: number;
    consejeros: Asistente[];
    participantes: Asistente[];
    link: string;
  }
) {
  const e = EMOJIS;

  let message =
    `Hola ${nombreCompleto} ${e.wave}\n\n` +
    `${e.party} ${EVENT_INFO.nombre}\n` +
    `${e.hotel} Hotel: ${HOTEL_INFO.nombre}\n` +
    `${e.pin} ${HOTEL_INFO.direccion}\n\n` +
    `${e.link} Tu código QR:\n${qrLink}\n` +
    `${e.warning} *Importante:* ingresa tu cédula en el link para ver y descargar el QR.\n\n`;

  if (compania?.link) {
    const nombresConsejeros = compania.consejeros
      .map(formatFullName)
      .join(" y ");
    const hombres = compania.participantes.filter(
      (p) => (p.sexo || "").toLowerCase() === "m"
    ).length;
    const mujeres = compania.participantes.filter(
      (p) => (p.sexo || "").toLowerCase() === "f"
    ).length;

    message +=
      `${e.divider}\n\n` +
      `${e.phone} *Tu compañía: Compañía ${compania.numero}*\n\n` +
      `${e.person} Consejeros: ${nombresConsejeros || "Por definir"}\n` +
      `${e.people} Participantes: ${compania.participantes.length}` +
      (hombres || mujeres
        ? ` (${e.man} ${hombres} hombres · ${e.woman} ${mujeres} mujeres)`
        : "") +
      `\n${e.link} Grupo WhatsApp:\n${compania.link}\n\n`;
  }

  message += "No compartas este mensaje.";

  return message;
}

export function getWhatsAppShareUrl(message: string) {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}
