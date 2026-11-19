/* Catálogo de stickers (stickers.html): filtros por categoría y botón "Agregar".
   Sin JavaScript se ven todos los stickers y los filtros quedan ocultos.
   "Agregar" por ahora solo marca el sticker (se recuerda en este navegador); el pedido se conecta después. */

(() => {
  'use strict';

  const grid = document.querySelector('[data-stickers]');
  if (!grid) return;
  const cards = [...grid.querySelectorAll('[data-cat]')];
  const filtros = document.querySelector('[data-filtros]');
  const vacio = document.querySelector('[data-stickers-vacio]');

  /* ---------- Filtros ---------- */
  if (filtros) {
    filtros.hidden = false;
    const chips = [...filtros.querySelectorAll('[data-filtro]')];

    const filtrar = (cat) => {
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filtro === cat)));
      let visibles = 0;
      cards.forEach((card) => {
        const ver = cat === 'todos' || card.dataset.cat === cat;
        card.hidden = !ver;
        if (ver) visibles++;
      });
      if (vacio) vacio.hidden = visibles > 0;
    };

    chips.forEach((chip) => chip.addEventListener('click', () => filtrar(chip.dataset.filtro)));

    // Permite entrar filtrado: stickers.html#memes
    const desdeHash = location.hash.slice(1);
    if (chips.some((c) => c.dataset.filtro === desdeHash)) filtrar(desdeHash);
  }

  /* ---------- Agregar ---------- */
  const KEY = 'vandu:stickers';
  const leer = () => {
    try {
      return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
    } catch {
      return new Set();
    }
  };
  const guardar = (set) => {
    try {
      localStorage.setItem(KEY, JSON.stringify([...set]));
    } catch {
      /* sin almacenamiento: queda marcado solo mientras dure la página */
    }
  };

  const elegidos = leer();
  const pintar = (btn, on) => {
    btn.setAttribute('aria-pressed', String(on));
    btn.textContent = on ? 'Agregado ✓' : 'Agregar';
  };

  grid.querySelectorAll('[data-add]').forEach((btn) => {
    const id = btn.closest('[data-id]').dataset.id;
    pintar(btn, elegidos.has(id));
    btn.addEventListener('click', () => {
      const on = !elegidos.has(id);
      on ? elegidos.add(id) : elegidos.delete(id);
      guardar(elegidos);
      pintar(btn, on);
    });
  });
})();
