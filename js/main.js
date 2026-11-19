/* Lógica de la landing (Golden Circle).
   Los datos (temporada, GP, fecha, lugar, fotos, video) se editan en data/content.json */

(() => {
  'use strict';

  /* Copia de data/content.json para cuando la página se abre sin servidor (doble clic).
     Si cambiás el JSON y querés verlo así, actualizá también este bloque. */
  const DATOS_RESPALDO = {
    temporada: 'en_curso',
    largada_2027: '',
    pilotos: '',
    gran_premio: 'GP de Austin',
    pais: 'us',
    fecha_hora: '2026-10-25T16:15:00-03:00',
    estado: 'abierto',
    cupo: 50,
    lugar: 'Aci2bar · Cucha Cucha 2595',
    url_lugar: 'https://www.instagram.com/aci2bar/',
    texto: 'Los que llegan temprano eligen mesa; los demás, miran desde la tribuna.',
    url_entradas: 'https://www.instagram.com/vandu.f1/',
    fotos: [
      { img: 'img/recap-vidriera.jpg', alt: 'La carrera en pantalla grande, vista desde la vidriera del bar' },
      { img: 'img/recap-vasos-22.jpg', alt: 'Dos amigos con camisetas de fútbol brindan con los vasos de 22 × Ácido' },
      { img: 'img/recap-barra.jpg', alt: 'La barra con la carrera en la pantalla y baldes de cerveza con hielo' },
      { img: 'img/recap-mesa.jpg', alt: 'Una mesa con cervezas, alitas y servilletas, entre vuelta y vuelta' },
    ],
    video_vertical: 'media/recap.mp4',
  };

  /* Textos que cambian según la temporada */
  const TEMPORADAS = {
    en_curso: {
      cta: 'Quiero mi entrada',
      cuentaLabel: 'Próximo GP',
      cuentaAria: 'Tiempo hasta el próximo GP',
      cierre: 'Te mandamos todo para sacar tu entrada.',
    },
    verano: {
      cta: 'Sumarme a la grilla 2027',
      cuentaLabel: 'Largada 2027',
      cuentaAria: 'Tiempo hasta la largada 2027',
      cierre: 'Te avisamos primero cuando se abran las entradas.',
    },
  };

  const ESTADOS = {
    abierto: { texto: 'Abierto', clase: 'vd-tag--open' },
    ultimos: { texto: 'Últimos lugares', clase: 'vd-tag--low' },
    agotado: { texto: 'Agotado', clase: 'vd-tag--out' },
  };

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = (n) => String(n).padStart(2, '0');

  window.dataLayer = window.dataLayer || [];
  /* Eventos (clics en botones, registros): al dataLayer y a Vercel Analytics.
     Vercel solo muestra eventos propios en planes pagos; en el gratis se ignoran. */
  const track = (event, data = {}) => {
    window.dataLayer.push({ event, ...data });
    window.va?.('event', { name: event, data });
  };

  function setImage(container, src, alt = '') {
    if (!src) return;
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    container.replaceChildren(img);
  }

  /* ---------- Pantalla de carga ---------- */
  /* Se va cuando están las fuentes (o a los 1,5 s, para no trabar si tardan).
     No espera al "load" de la página: ese espera a Supabase, los scripts de Vercel y las imágenes,
     y en el navegador de Instagram o de Google en el celular puede tardar varios segundos. */
  function hidePageLoader() {
    const loader = qs('[data-page-loader]');
    if (!loader) return;
    const fonts = document.fonts?.ready ?? Promise.resolve();
    const maxTime = new Promise((resolve) => setTimeout(resolve, 1500));
    Promise.race([fonts, maxTime]).then(() => {
      loader.classList.add('is-done');
      setTimeout(() => loader.remove(), 400);
    });
  }

  /* ---------- Aparición al scrollear ---------- */
  /* .reveal entra subiendo; .reveal-group hace entrar a sus hijos en cascada (ver css/site.css) */
  function initReveal() {
    const items = qsa('.reveal, .reveal-group');
    if (!('IntersectionObserver' in window)) return items.forEach((el) => el.classList.add('is-visible'));
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }),
      { rootMargin: '0px 0px -10% 0px' },
    );
    items.forEach((el) => observer.observe(el));
  }

  /* ---------- Por qué: tarjetas que se dan vuelta ---------- */
  /* Cada tarjeta es un botón (aria-pressed). La cara que no se ve queda oculta para lectores de pantalla */
  function initFlipCards() {
    const cards = qsa('[data-flip]');
    const counter = qs('[data-flip-count]');
    if (!cards.length) return;
    const seen = new Set();
    const grid = cards[0].closest('.flip-grid');

    const total = cards.length;
    const counterText = () => (seen.size === total ? `¡Las ${total} descubiertas!` : `${seen.size} de ${total} descubiertas`);
    if (counter) counter.textContent = counterText();

    // Invitación animada (css: .is-hinting): solo mientras la grilla se ve y falten tarjetas por descubrir.
    // Con todas descubiertas se apaga y el observer se desconecta (ya no hace falta)
    let inView = false;
    let hintObserver = null;
    const updateHint = () => {
      const pending = seen.size < total;
      grid?.classList.toggle('is-hinting', inView && pending);
      if (!pending && hintObserver) {
        hintObserver.disconnect();
        hintObserver = null;
      }
    };
    if (grid && 'IntersectionObserver' in window) {
      hintObserver = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        updateHint();
      }, { threshold: 0.2 });
      hintObserver.observe(grid);
    }

    cards.forEach((card) => {
      const front = qs('.flip-card__front', card);
      const back = qs('.flip-card__back', card);
      card.addEventListener('click', () => {
        const flipped = card.getAttribute('aria-pressed') !== 'true';
        card.setAttribute('aria-pressed', String(flipped));
        front.setAttribute('aria-hidden', String(flipped));
        back.setAttribute('aria-hidden', String(!flipped));
        // El nombre del botón es fijo (aria-label); la frase y el texto del dorso se anuncian como descripción solo dado vuelta
        const desc = qsa('.flip-card__punch[id], .flip-card__text[id]', back).map((el) => el.id).join(' ');
        if (flipped && desc) card.setAttribute('aria-describedby', desc);
        else card.removeAttribute('aria-describedby');

        // El contador solo cambia cuando se descubre una tarjeta nueva (así el aria-live no repite lo mismo)
        if (flipped && !seen.has(card.dataset.flip)) {
          seen.add(card.dataset.flip);
          card.classList.add('is-seen');
          track('porque_tarjeta', { razon: card.dataset.flip });
          updateHint();
          if (counter) counter.textContent = counterText();
        }
      });
    });
  }

  /* ---------- 02 · Cómo: el domingo vuelta a vuelta ---------- */
  /* Pestañas (paradas) con flechas de teclado, anterior/siguiente y play que avanza solo.
     El auto se mueve con la variable --pos de la pista (0 = largada, 1 = bandera). */
  function initRuta() {
    const box = qs('[data-ruta]');
    if (!box) return;
    const tabs = qsa('[role="tab"]', box);
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));
    const pista = qs('.ruta__track', box);
    const playBtn = qs('[data-ruta-play]', box);
    const playLabel = qs('[data-ruta-play-label]', box);
    const last = tabs.length - 1;
    const PASO_MS = 3200;
    let current = 0;
    let timer = null;
    const visto = new Set([0]); // paradas ya contadas en analytics

    function show(i, { focus = false, fromPlay = false } = {}) {
      current = Math.max(0, Math.min(last, i));
      tabs.forEach((tab, k) => {
        const on = k === current;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        tab.classList.toggle('is-past', k < current);
        panels[k].hidden = !on;
      });
      pista.style.setProperty('--pos', String(current / last));
      if (focus) tabs[current].focus();
      if (!fromPlay && !visto.has(current)) {
        visto.add(current);
        track('como_parada', { parada: current + 1 });
      }
    }

    function setPlaying(on) {
      clearInterval(timer);
      timer = null;
      playBtn.setAttribute('aria-pressed', String(on));
      playLabel.textContent = on ? 'Pausar' : 'Ver el domingo';
      if (!on) return;
      if (current === last) show(0, { fromPlay: true });
      timer = setInterval(() => {
        if (current >= last) return setPlaying(false);
        show(current + 1, { fromPlay: true });
      }, PASO_MS);
    }

    playBtn.addEventListener('click', () => {
      const on = playBtn.getAttribute('aria-pressed') !== 'true';
      setPlaying(on);
      if (on) track('como_play');
    });
    qs('[data-ruta-prev]', box).addEventListener('click', () => { setPlaying(false); show(current - 1); });
    qs('[data-ruta-next]', box).addEventListener('click', () => { setPlaying(false); show(current + 1); });

    tabs.forEach((tab, k) => {
      tab.addEventListener('click', () => { setPlaying(false); show(k); });
      tab.addEventListener('keydown', (e) => {
        const keys = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: last };
        if (!(e.key in keys)) return;
        e.preventDefault();
        setPlaying(false);
        show(keys[e.key], { focus: true });
      });
    });

    // Si la sección sale de pantalla, se pausa
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting && timer) setPlaying(false);
      }).observe(box);
    }
    show(0, { fromPlay: true });
  }

  /* ---------- Semáforo de largada ---------- */
  /* Se prenden de a una (1-5), quedan todas (6) y se apagan (7). Solo anima mientras se ve */
  function initLights() {
    const box = qs('[data-lights]');
    if (!box) return;
    const bulbs = qsa('.lights__bulb', box);
    if (reducedMotion()) return bulbs.forEach((b) => b.classList.add('is-on'));

    let step = 0;
    let timer = null;
    const render = () => {
      step = (step + 1) % 8;
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

  /* ---------- Temporada: en curso o verano ---------- */
  function applySeason(ev) {
    const key = ev.temporada === 'verano' ? 'verano' : 'en_curso';
    const t = TEMPORADAS[key];
    document.body.dataset.temporada = key;
    qsa('[data-cta-label]').forEach((el) => (el.textContent = t.cta));
    qs('[data-countdown-label]').textContent = t.cuentaLabel;
    qs('[data-countdown]').setAttribute('aria-label', t.cuentaAria);
    qs('[data-signup-status]').textContent = t.cierre;

    // Sin número cargado, el contador no se muestra (así no queda "[N]" a la vista)
    const pilotos = qs('[data-pilotos]');
    const hayPilotos = ev.pilotos !== '' && ev.pilotos != null;
    if (hayPilotos) pilotos.textContent = ev.pilotos;
    pilotos.closest('.counter').hidden = !hayPilotos;

    return { verano: key === 'verano', target: key === 'verano' ? ev.largada_2027 : ev.fecha_hora, cierre: t.cierre };
  }

  /* ---------- Botones "Quiero mi entrada" ---------- */
  /* En temporada van a la venta (url_entradas). En verano, sin link o con el GP agotado,
     abren la ventana de la grilla */
  function initCta(urlEntradas, verano, estado) {
    const agotado = estado === 'agotado';
    if (agotado && !verano) qsa('[data-cta-label]').forEach((el) => (el.textContent = 'Avisame del próximo GP'));
    qsa('[data-cta]').forEach((link) => {
      if (urlEntradas && !verano && !agotado) {
        link.href = urlEntradas;
        link.target = '_blank';
        link.rel = 'noopener';
      }
      link.addEventListener('click', () => track('cta_entradas', { ubicacion: link.dataset.cta }));
    });
  }

  /* ---------- Ventana "Grilla 2027": se abre con cualquier link a #grilla ---------- */
  function initSignupDialog() {
    const dialog = qs('[data-signup]');
    const open = (ubicacion) => {
      track('abrir_grilla', { ubicacion });
      dialog.showModal();
      qs('input[name="email"]', dialog).focus();
    };
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href="#grilla"]');
      if (!link) return;
      e.preventDefault();
      open(link.dataset.cta || link.textContent.trim());
    });
    qs('[data-signup-close]', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => e.target === dialog && dialog.close());
    if (location.hash === '#grilla') {
      history.replaceState(null, '', location.pathname + location.search);
      open('link');
    }
  }

  /* ---------- Formulario de la grilla: guarda el mail en Brevo (api/suscribir.js) ---------- */
  function initSignup(defaultText) {
    const form = qs('[data-signup-form]');
    const field = qs('[data-signup-field]', form);
    const input = qs('input[name="email"]', form);
    const status = qs('[data-signup-status]', form);
    const submit = qs('[data-signup-submit]', form);

    const setError = (msg) => {
      field.classList.toggle('is-error', Boolean(msg));
      input.setAttribute('aria-invalid', String(Boolean(msg)));
      status.classList.toggle('is-error', Boolean(msg));
      status.textContent = msg || defaultText;
    };
    input.addEventListener('input', () => field.classList.contains('is-error') && setError(''));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!EMAIL_RE.test(input.value.trim())) {
        setError('Revisá el mail: parece que tiene un error.');
        input.focus();
        return;
      }
      setError('');
      submit.disabled = true;
      try {
        const res = await fetch('/api/suscribir', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(Object.fromEntries(new FormData(form))),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
        track('registro_entradas');
        form.reset();
        status.textContent = '¡Listo! Ya estás en la grilla. Te escribimos pronto.';
      } catch (err) {
        console.warn('No se pudo guardar el mail', err);
        setError(
          err.message === 'email'
            ? 'Revisá el mail: parece que tiene un error.'
            : 'No pudimos guardar tu mail. Probá de nuevo en un rato.',
        );
      } finally {
        submit.disabled = false;
      }
    });
  }

  /* ---------- Tarjeta del GP ---------- */
  function initEventCard(ev) {
    if (ev.gran_premio) qs('[data-event="name"]').textContent = ev.gran_premio;
    if (ev.texto) qs('[data-event="text"]').textContent = ev.texto;
    if (ev.cupo) qs('[data-event="cupo"]').textContent = `${ev.cupo} lugares`;
    initPlace(ev.lugar, ev.url_lugar);
    initFlag(ev.pais);

    const estado = ESTADOS[ev.estado];
    if (estado) {
      const tag = qs('[data-event="estado"]');
      tag.className = `vd-tag ${estado.clase}`;
      tag.textContent = estado.texto;
    }

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
    if (!text) return;
    const place = qs('[data-event="place"]');
    if (!url) return (place.textContent = text);
    const link = document.createElement('a');
    link.className = 'text-link';
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = text;
    place.replaceChildren(link);
  }

  /* Bandera del país del GP (código ISO de 2 letras, ej. "us") */
  function initFlag(code) {
    const flag = qs('[data-event="flag"]');
    if (!code) return;
    const iso = code.toLowerCase();
    let country = iso.toUpperCase();
    try {
      country = new Intl.DisplayNames('es', { type: 'region' }).of(country);
    } catch {}
    flag.addEventListener('error', () => (flag.hidden = true), { once: true });
    flag.src = `https://flagcdn.com/${iso}.svg`;
    flag.alt = `Bandera de ${country}`;
    flag.hidden = false;
  }

  /* ---------- Cuenta regresiva ---------- */
  function initCountdown(iso) {
    const box = qs('[data-countdown]');
    const target = new Date(iso).getTime();
    const message = (text) => {
      box.classList.add('is-message');
      box.textContent = text;
    };
    if (!iso || Number.isNaN(target)) return message('Fecha a confirmar. Te avisamos.');

    const values = Object.fromEntries(qsa('[data-unit]', box).map((el) => [el.dataset.unit, el]));
    let timer;
    function tick() {
      const ms = target - Date.now();
      if (ms <= 0) {
        clearInterval(timer);
        return message(ms > -3 * 3600e3 ? '¡Luces apagadas! Estamos en vivo.' : 'Próxima fecha, muy pronto.');
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

  /* ---------- Prueba social: fotos + visor ---------- */
  function initRecapPhotos(photos = []) {
    const list = qs('[data-recap-photos]');
    const MAX = 4;
    const withImg = photos.filter((p) => p.img);
    const openViewer = initLightbox(withImg);

    const tiles = photos.slice(0, MAX).map((p, i) => {
      const li = document.createElement('li');
      li.className = 'recap__item';
      const extra = i === MAX - 1 ? photos.length - MAX : 0;
      const clickable = Boolean(p.img);
      const tile = document.createElement(clickable ? 'button' : 'div');
      tile.className = 'recap__photo vd-ph';
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

  /* ---------- Reproductor de video (hero y prueba social) ----------
     Muteado, en loop y sin controles, con un botón propio de pausa/play.
     Con "reducir movimiento" no arranca solo: queda la primera imagen y se puede dar play.
     soloVisible: se reproduce solo mientras se ve en pantalla (si no lo pausó la persona) */
  function setupVideo(box, video, { soloVisible = false } = {}) {
    const btn = qs('[data-video-pause]', box);
    let pausadoAMano = false;
    const sync = () => {
      btn.setAttribute('aria-pressed', String(video.paused));
      btn.setAttribute('aria-label', video.paused ? 'Reproducir video' : 'Pausar video');
    };
    const play = () => video.play().catch(() => {});
    btn.addEventListener('click', () => {
      pausadoAMano = !video.paused;
      if (video.paused) play();
      else video.pause();
    });
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);

    if (reducedMotion()) {
      video.removeAttribute('autoplay');
      video.pause();
    } else if (soloVisible) {
      new IntersectionObserver(
        ([entry]) => (entry.isIntersecting ? !pausadoAMano && play() : video.pause()),
        { threshold: 0.5 },
      ).observe(box);
    } else {
      play();
    }
    sync();
  }

  function initHeroVideo() {
    const box = qs('[data-hero-video]');
    if (box) setupVideo(box, qs('video', box));
  }

  // Botón de pausa (mismo que el del hero, en index.html)
  function crearBotonPausa() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'video-pause';
    btn.dataset.videoPause = '';
    btn.innerHTML =
      '<svg class="video-pause__pause" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>' +
      '<svg class="video-pause__play" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M7 4l13 8-13 8z"/></svg>';
    return btn;
  }

  /* ---------- Video vertical 9:16 ---------- */
  function initRecapVideo(src) {
    if (!src) return;
    const frame = qs('[data-recap-video]');
    qs('.recap__label', frame)?.remove();
    frame.classList.add('has-media');

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

    // Mismo reproductor que el hero: muteado, en loop, sin controles, con botón de pausa
    const video = Object.assign(document.createElement('video'), {
      src, loop: true, muted: true, playsInline: true, preload: 'metadata',
    });
    video.muted = true;
    video.setAttribute('muted', '');
    if (src === 'media/recap.mp4') video.poster = 'img/recap-poster.jpg';
    video.setAttribute('aria-label', 'Video del último evento');
    frame.prepend(video);
    frame.append(crearBotonPausa());
    setupVideo(frame, video, { soloVisible: true });
  }

  /* ---------- Buzón en 2 pasos ---------- */
  /* TODO: conectar el envío (mail, planilla o formulario: a definir). Por ahora no se manda nada */
  function initMailbox() {
    const box = qs('[data-mailbox]');
    const intro = qs('[data-mailbox-intro]', box);
    const form = qs('[data-mailbox-form]', box);
    const step2 = qs('[data-mailbox-step2]', box);
    const count = qs('[data-mailbox-count]', box);
    const status = qs('[data-mailbox-status]', box);
    const types = qsa('[data-mailbox-type]', box);
    const label = qs('[data-mailbox-label]', box);
    const TIPOS = {
      idea: { label: 'Tu idea', ph: 'Ej: prode en vivo…' },
      resena: { label: 'Tu reseña', ph: 'Ej: el debate en la vuelta 40 estuvo increíble…' },
    };

    const show = (paso) => {
      intro.hidden = paso !== 1;
      form.hidden = paso !== 2;
      step2.classList.toggle('is-on', paso === 2);
      count.textContent = `Paso ${paso} de 2`;
    };
    // Idea o Reseña: marca el chip y cambia el título y el ejemplo del campo
    let tipoActual = 'idea';
    const setTipo = (tipo) => {
      tipoActual = tipo;
      types.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mailboxType === tipo)));
      label.textContent = TIPOS[tipo].label;
      qs('textarea', form).placeholder = TIPOS[tipo].ph;
    };

    // Paso 1: elegir una opción ya lleva a escribir
    qsa('[data-mailbox-pick]', box).forEach((btn) =>
      btn.addEventListener('click', () => {
        setTipo(btn.dataset.mailboxPick);
        show(2);
        qs('textarea', form).focus();
      }),
    );
    qs('[data-mailbox-back]', box).addEventListener('click', () => {
      show(1);
      status.textContent = '';
      qs('[data-mailbox-pick]', box).focus();
    });
    types.forEach((btn) => btn.addEventListener('click', () => setTipo(btn.dataset.mailboxType)));

    // El buzón todavía no envía: lo escrito se guarda como borrador en este navegador,
    // así no se pierde al recargar y se puede mandar cuando se conecte.
    const BORRADOR_KEY = 'vandu22_buzon_borrador';
    const mailInput = qs('input[type="email"]', form);
    const textarea = qs('textarea', form);
    try {
      const b = JSON.parse(localStorage.getItem(BORRADOR_KEY) || 'null');
      if (b) {
        textarea.value = b.msg || '';
        mailInput.value = b.mail || '';
      }
    } catch {}
    const guardarBorrador = () => {
      try {
        localStorage.setItem(BORRADOR_KEY, JSON.stringify({ msg: textarea.value, mail: mailInput.value }));
      } catch {}
    };
    textarea.addEventListener('input', guardarBorrador);
    mailInput.addEventListener('input', guardarBorrador);

    // Colores semánticos (kit: .vd-alert--error rojo · .vd-alert--ok verde)
    const setEstado = (tipo, texto) => {
      status.textContent = texto;
      status.classList.toggle('vd-alert--error', tipo === 'error');
      status.classList.toggle('vd-alert--ok', tipo === 'ok');
    };
    const marcar = (input, mal) => {
      input.closest('.vd-field').classList.toggle('is-error', mal);
      input.setAttribute('aria-invalid', String(mal));
    };
    [textarea, mailInput].forEach((input) =>
      input.addEventListener('input', () => {
        if (input.getAttribute('aria-invalid') === 'true') marcar(input, false);
        if (status.classList.contains('vd-alert--error')) setEstado('', '');
      }),
    );

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const mail = mailInput.value.trim();
      const msg = textarea.value.trim();
      const faltaMsg = !msg;
      const mailMal = !EMAIL_RE.test(mail);
      marcar(textarea, faltaMsg);
      marcar(mailInput, mailMal);
      if (faltaMsg) {
        textarea.focus();
        return setEstado('error', `Escribí ${tipoActual === 'resena' ? 'tu reseña' : 'tu idea'} antes de enviar.`);
      }
      if (mailMal) {
        mailInput.focus();
        return setEstado('error', 'Revisá el mail: parece que tiene un error.');
      }
      guardarBorrador();
      setEstado(
        'ok',
        `¡Gracias! ${tipoActual === 'resena' ? 'Tu reseña quedó guardada' : 'Tu idea quedó guardada'} en este navegador. El buzón abre muy pronto y vas a poder enviarla apenas abra.`,
      );
    });
  }

  /* ---------- Arranque ---------- */
  async function init() {
    qsa('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
    // Primero: aunque algo de abajo falle, la pantalla de carga se va igual
    hidePageLoader();
    initReveal();
    initHeroVideo();
    initMailbox();
    initFlipCards();
    initRuta();
    initLights();
    // Antes de pedir los datos: así los links a #grilla abren la ventana aunque la red esté lenta
    initSignupDialog();

    let ev;
    try {
      const res = await fetch('data/content.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      ev = await res.json();
    } catch (err) {
      // Abierto con doble clic (file://) el navegador bloquea el JSON: se usa la copia de respaldo
      console.warn('No se pudo cargar data/content.json; se usan los datos de respaldo.', err);
      ev = DATOS_RESPALDO;
    }

    const season = applySeason(ev);
    initCta(ev.url_entradas, season.verano, ev.estado);
    initSignup(season.cierre);
    initEventCard(ev);
    initCountdown(season.target);
    initRecapPhotos(ev.fotos);
    initRecapVideo(ev.video_vertical);
  }

  init();
})();
