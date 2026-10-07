/* Lógica de la página del evento.
   Los datos (fecha, lugar, fotos, video) se editan en data/content.json */

(() => {
  'use strict';

  /* Copia de data/content.json para cuando la página se abre sin servidor (doble clic).
     Si cambiás el JSON y querés verlo así, actualizá también este bloque. */
  const DATOS_RESPALDO = {
    gran_premio: 'GP de Austin',
    pais: 'us',
    fecha_hora: '2026-10-25T15:30:00-03:00',
    lugar: 'Cucha Cucha 2595, CABA.',
    url_lugar: 'https://www.instagram.com/aci2bar/',
    texto: 'Los que llegan temprano eligen mesa; los demás, miran desde la tribuna.',
    url_entradas: 'https://ejemplo.com/entradas',
    fotos: [
      { img: 'img/bar-exterior.jpg', alt: 'Entrada del bar de noche' },
      { img: 'img/bar-barra.jpg', alt: 'La barra iluminada en rojo' },
      { img: '', alt: 'Próximamente' },
      { img: '', alt: 'Próximamente' },
    ],
    video_vertical: 'media/recap.mp4',
  };

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = (n) => String(n).padStart(2, '0');

  window.dataLayer = window.dataLayer || [];
  const track = (event, data = {}) => window.dataLayer.push({ event, ...data });

  function setImage(container, src, alt = '') {
    if (!src) return;
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    container.replaceChildren(img);
  }

  /* ---------- Aparición al scrollear ---------- */
  function initReveal() {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }),
      { rootMargin: '0px 0px -10% 0px' },
    );
    qsa('.reveal').forEach((el) => observer.observe(el));
  }

  /* ---------- Semáforo de largada ---------- */
  function initLights() {
    const box = qs('[data-lights]');
    const bulbs = qsa('.lights__bulb', box);
    if (reducedMotion()) return bulbs.forEach((b) => b.classList.add('is-on'));

    let step = 0;
    let timer = null;
    const render = () => {
      step = (step + 1) % 8; // 1-5 se encienden · 6 todas · 7 se apagan
      bulbs.forEach((b, i) => b.classList.toggle('is-on', (step >= 1 && step <= 5 && i < step) || step === 6));
    };
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !timer) timer = setInterval(render, 700);
      if (!entry.isIntersecting && timer) {
        clearInterval(timer);
        timer = null;
      }
    }).observe(box);
  }

  /* ---------- Botones de entradas ---------- */
  function initCta(url) {
    qsa('[data-cta]').forEach((link) => {
      if (url) link.href = url;
      link.addEventListener('click', () => track('cta_entradas', { ubicacion: link.dataset.cta }));
    });
  }

  /* ---------- Tarjeta del GP ---------- */
  function initEventCard(ev) {
    qs('[data-event="name"]').textContent = ev.gran_premio;
    initPlace(ev.lugar, ev.url_lugar);
    qs('[data-event="text"]').textContent = ev.texto;
    initFlag(ev.pais);

    const date = new Date(ev.fecha_hora);
    if (Number.isNaN(date.getTime())) return;
    const d = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' }).format(date);
    const t = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
    const time = qs('[data-event="date"]');
    time.dateTime = date.toISOString();
    time.textContent = `${d} · ${t} h`;
  }

  /* Lugar: si hay url_lugar, la dirección escrita es el link */
  function initPlace(text, url) {
    const place = qs('[data-event="place"]');
    if (!url) return (place.textContent = text);
    const link = document.createElement('a');
    link.className = 'gp-card__place-link';
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = text;
    place.replaceChildren(link);
  }

  /* Bandera del país del GP (código ISO de 2 letras, ej. "us") */
  function initFlag(code) {
    const flag = qs('[data-event="flag"]');
    if (!code) return flag.remove();
    const iso = code.toLowerCase();
    let country = iso.toUpperCase();
    try {
      country = new Intl.DisplayNames('es', { type: 'region' }).of(country);
    } catch {}
    flag.src = `https://flagcdn.com/${iso}.svg`;
    flag.alt = `Bandera de ${country}`;
    flag.addEventListener('error', () => flag.remove(), { once: true });
  }

  /* ---------- Cuenta regresiva ---------- */
  function initCountdown(iso) {
    const box = qs('[data-countdown]');
    const target = new Date(iso).getTime();
    if (Number.isNaN(target)) return;
    const values = Object.fromEntries(qsa('[data-unit]', box).map((el) => [el.dataset.unit, el]));
    let timer;

    function tick() {
      const ms = target - Date.now();
      if (ms <= 0) {
        clearInterval(timer);
        box.classList.add('countdown--live');
        box.textContent = ms > -3 * 3600e3 ? '¡Luces apagadas! Estamos en vivo.' : 'Próxima fecha, muy pronto.';
        return;
      }
      const s = Math.floor(ms / 1000);
      values.days.textContent = pad(Math.floor(s / 86400));
      values.hours.textContent = pad(Math.floor((s % 86400) / 3600));
      values.minutes.textContent = pad(Math.floor((s % 3600) / 60));
      values.seconds.textContent = pad(s % 60);
    }
    tick();
    timer = setInterval(tick, 1000);
  }

  /* ---------- Así fue la última: fotos 2 × 2 + visor ---------- */
  function initRecapPhotos(photos) {
    const list = qs('[data-recap-photos]');
    const MAX = 4;
    const withImg = photos.filter((p) => p.img);
    const openViewer = initLightbox(withImg);

    const tiles = photos.slice(0, MAX).map((p, i) => {
      const li = document.createElement('li');
      const extra = i === MAX - 1 ? photos.length - MAX : 0;
      const clickable = Boolean(p.img);
      const tile = document.createElement(clickable ? 'button' : 'div');
      tile.className = 'recap__photo media-ph';
      tile.textContent = p.alt;
      setImage(tile, p.img, p.alt);

      if (extra > 0) {
        const more = document.createElement('span');
        more.className = 'recap__more';
        more.textContent = `+${extra}`;
        tile.append(more);
      }
      if (clickable) {
        tile.type = 'button';
        tile.setAttribute('aria-label', `Ampliar: ${p.alt}`);
        tile.addEventListener('click', () => openViewer(withImg.indexOf(p)));
      }
      li.append(tile);
      return li;
    });
    list.replaceChildren(...tiles);
  }

  /* Visor de fotos con <dialog> nativo (Esc cierra, ← → navegan) */
  function initLightbox(photos) {
    const dialog = qs('[data-lightbox]');
    const img = qs('.lightbox__img', dialog);
    const caption = qs('.lightbox__caption', dialog);
    const prev = qs('.lightbox__prev', dialog);
    const next = qs('.lightbox__next', dialog);
    let index = 0;

    const show = (i) => {
      index = (i + photos.length) % photos.length;
      img.src = photos[index].img;
      img.alt = photos[index].alt;
      caption.textContent = `${photos[index].alt} · ${index + 1} / ${photos.length}`;
    };
    prev.hidden = next.hidden = photos.length < 2;

    prev.addEventListener('click', () => show(index - 1));
    next.addEventListener('click', () => show(index + 1));
    qs('.lightbox__close', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => e.target === dialog && dialog.close());
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });

    return (i) => {
      if (!photos.length) return;
      show(i);
      dialog.showModal();
    };
  }

  /* ---------- Video vertical ---------- */
  function initRecapVideo(src) {
    if (!src) return;
    const frame = qs('[data-recap-video]');
    qs('.recap__label', frame)?.remove();

    const yt = src.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
    const vimeo = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);

    if (yt || vimeo) {
      const iframe = document.createElement('iframe');
      iframe.title = 'Video del último evento';
      iframe.allow = 'autoplay; fullscreen; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      iframe.src = yt
        ? `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&mute=1&loop=1&playlist=${yt[1]}&rel=0`
        : `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1&muted=1&loop=1`;
      frame.append(iframe);
      return;
    }

    /* Arranca con sonido a la mitad de volumen. Si el navegador no deja reproducir
       con sonido antes de que la persona toque la página, arranca muteado y
       activa el sonido en el primer toque/clic/tecla. */
    const video = Object.assign(document.createElement('video'), {
      src, loop: true, playsInline: true, controls: true, preload: 'metadata',
    });
    video.volume = 0.5;
    frame.prepend(video);

    const unmuteOnGesture = () => {
      const unmute = () => {
        video.muted = false;
        video.volume = 0.5;
      };
      ['pointerdown', 'keydown', 'touchend'].forEach((type) =>
        window.addEventListener(type, unmute, { once: true, capture: true }),
      );
    };

    const play = () =>
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
        unmuteOnGesture();
      });

    if (reducedMotion()) return;
    new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) play();
        else video.pause();
      },
      { threshold: 0.5 },
    ).observe(frame);
  }

  /* ---------- Arranque ---------- */
  async function init() {
    initReveal();
    initLights();

    let evento;
    try {
      const res = await fetch('data/content.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      evento = await res.json();
    } catch (err) {
      // Abierto con doble clic (file://) el navegador bloquea el JSON: se usa la copia de respaldo
      console.warn('No se pudo cargar data/content.json; se usan los datos de respaldo.', err);
      evento = DATOS_RESPALDO;
    }

    initCta(evento.url_entradas);
    initEventCard(evento);
    initCountdown(evento.fecha_hora);
    initRecapPhotos(evento.fotos);
    initRecapVideo(evento.video_vertical);
  }

  init();
})();
