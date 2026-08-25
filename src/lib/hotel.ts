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
    `Este es tu código de acceso para la ${EVENT_INFO.nombre}.\n\n` +
    `Hotel: ${HOTEL_INFO.nombre}\n` +
    `Dirección: ${HOTEL_INFO.direccion}\n\n` +
    `Abre el enlace, guarda el QR en pantalla y muéstralo al personal al llegar a la entrada:\n\n` +
    `${qrLink}\n\n` +
    `No compartas este enlace con otras personas.`
  );
}
