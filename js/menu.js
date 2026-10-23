/* Menú de las tres rayitas del header (secciones: por ahora, Prode).
   Se usa en todas las páginas que tienen el header completo. */

(() => {
  'use strict';

  const box = document.querySelector('[data-nav]');
  if (!box) return;
  const toggle = box.querySelector('[data-nav-toggle]');
  const menu = box.querySelector('[data-nav-menu]');

  const actual = location.pathname.split('/').pop() || 'index.html';

  // Fuera del inicio, primero va "Inicio" con una casita al lado
  if (actual !== 'index.html') {
    const inicio = document.createElement('a');
    inicio.className = 'site-menu__link site-menu__link--inicio';
    inicio.href = 'index.html';
    inicio.innerHTML = `
      <span>Inicio</span>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 11 12 4l9 7" />
        <path d="M5 10v10h5v-6h4v6h5V10" />
      </svg>`;
    menu.prepend(inicio);
  }

  // Marca la página actual en el menú
  menu.querySelectorAll('a').forEach((link) => {
    if (link.getAttribute('href') === actual) link.setAttribute('aria-current', 'page');
  });

  function cerrar() {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', () => {
    const abrir = menu.hidden;
    menu.hidden = !abrir;
    toggle.setAttribute('aria-expanded', String(abrir));
  });
  document.addEventListener('click', (e) => !box.contains(e.target) && cerrar());
  document.addEventListener('keydown', (e) => e.key === 'Escape' && cerrar());
})();
