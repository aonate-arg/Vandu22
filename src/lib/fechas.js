/* Fechas siempre en hora de Argentina: los eventos son en Buenos Aires.
   Sin timeZone, la hora dependería de dónde corre el código (el navegador de cada persona
   o la máquina de Vercel al publicar, que está en UTC: 3 horas de diferencia). */
export const ZONA = 'America/Argentina/Buenos_Aires';

const fDia = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', timeZone: ZONA });
const fHora = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA });

/** "25/10" */
export const diaMes = (fecha) => fDia.format(fecha);
/** "16:15" */
export const hora = (fecha) => fHora.format(fecha);
/** "25/10 · 16:15 h" */
export const diaYHora = (fecha) => `${diaMes(fecha)} · ${hora(fecha)} h`;
