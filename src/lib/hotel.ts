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
