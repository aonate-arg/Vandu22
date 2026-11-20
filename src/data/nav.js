/* Links del menú de las tres rayitas y del footer: se editan solo acá.
   seccion: ancla de la página principal (en la home el link es "#seccion"; en otras páginas, "/#seccion").
   href: página propia. */

// Prode: oculto hasta los días de GP. Para mostrarlo en el menú y el footer, pasarlo a true.
export const MOSTRAR_PRODE = false;

export const LINKS = [
  { label: 'Eventos', seccion: 'proximo-gp' },
  { label: 'Stickers', href: '/stickers.html' },
  { label: 'Prode', href: '/prode.html', oculto: !MOSTRAR_PRODE },
  { label: 'Merch', seccion: 'merch' },
  { label: 'Comunidad', seccion: 'comunidad', soloMenu: true },
].filter((l) => !l.oculto);

// Columna "Comunidad" del footer
export const LINKS_COMUNIDAD = [
  { label: 'Grilla 2027', seccion: 'grilla' },
  { label: 'Buzón', seccion: 'buzon' },
  { label: 'Preguntas', seccion: 'preguntas' },
];

/** Arma el href según la página: ancla local en la home, dirección completa en el resto */
export const hrefDe = (link, enHome) => (link.href ? link.href : enHome ? `#${link.seccion}` : `/#${link.seccion}`);

/** La home se publica como / y también responde en /index.html */
export const esHome = (pathname) => pathname === '/' || pathname === '/index.html';

/** Página actual (para aria-current="page"): /stickers.html y /stickers son la misma */
export const esActual = (link, pathname) => Boolean(link.href) && pathname.replace(/\.html$/, '') === link.href.replace(/\.html$/, '');
