/* Menú de las tres rayitas del header (igual al sitio publicado: un panel que baja a la derecha).
   Se cierra al tocar afuera, con Escape y al elegir un link. */

(() => {
  'use strict';

  const box = document.querySelector('[data-nav]');
  if (!box) return;
  const toggle = box.querySelector('[data-nav-toggle]');
  const menu = box.querySelector('[data-nav-menu]');

  // Fuera del inicio, primero va "Inicio" con una casita al lado
  const actual = location.pathname.split('/').pop() || 'index.html';
  const enInicio = actual === 'index.html' || actual === 'index';
  if (!enInicio) {
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

  function cerrar({ devolverFoco = false } = {}) {
    if (menu.hidden) return;
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    if (devolverFoco) toggle.focus();
  }

  toggle.addEventListener('click', () => {
    const abrir = menu.hidden;
    menu.hidden = !abrir;
    toggle.setAttribute('aria-expanded', String(abrir));
  });
  document.addEventListener('click', (e) => !box.contains(e.target) && cerrar());
  document.addEventListener('keydown', (e) => e.key === 'Escape' && cerrar({ devolverFoco: true }));
  menu.addEventListener('click', (e) => e.target.closest('a') && cerrar());
})();

/* Sección activa: el link de la sección que se está viendo queda marcado (aria-current) */
(() => {
  'use strict';
  const links = [...document.querySelectorAll('[data-spy]')];
  const ids = [...new Set(links.map((a) => a.dataset.spy))];
  const targets = ids.map((id) => document.getElementById(id)).filter(Boolean);
  if (!targets.length || !('IntersectionObserver' in window)) return;

  const mark = (id) =>
    links.forEach((a) => (a.dataset.spy === id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));

  // Cuenta como "activa" la sección que cruza la franja del medio de la pantalla
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting);
      if (visible.length) return mark(visible[visible.length - 1].target.id);
      const anyOn = targets.some((t) => {
        const r = t.getBoundingClientRect();
        return r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.4;
      });
      if (!anyOn) mark(null);
    },
    { rootMargin: '-40% 0px -50% 0px' },
  );
  targets.forEach((t) => observer.observe(t));
})();
