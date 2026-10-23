/* Registro por pasos (registro.html): la persona va completando su perfil de piloto
   y al terminar vuelve a la página principal.
   Los datos del proyecto de Supabase van en js/supabase-config.js. */

(() => {
  'use strict';

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Lo lee js/cuenta.js en la página principal para avisar que hay que confirmar el mail
  const AVISO_KEY = 'vandu22_registro_email';
  const INICIO = 'index.html';

  window.dataLayer = window.dataLayer || [];
  const track = (event, data = {}) => {
    window.dataLayer.push({ event, ...data });
    window.va?.('event', { name: event, data });
  };

  const form = qs('[data-registro]');
  const steps = qsa('[data-step]', form);
  const status = qs('[data-status]', form);
  const volver = qs('[data-volver]', form);
  const avanzar = qs('[data-avanzar]', form);
  const alias = qs('[data-alias]', form);
  let actual = 0;

  const cfg = window.SUPABASE_CONFIG || {};
  const configured = /^https:\/\//.test(cfg.url || '') && cfg.key && !cfg.key.startsWith('PEGAR');
  const client = configured && window.supabase ? window.supabase.createClient(cfg.url, cfg.key) : null;
  if (!client) console.warn('Supabase sin configurar: completá js/supabase-config.js');

  // Con la sesión ya iniciada no hay nada que registrar
  client?.auth.getSession().then(({ data }) => data.session && location.replace(INICIO));

  const dosDigitos = (valor) => String(valor).trim().padStart(2, '0');

  /* ---------- Escuderías ----------
     Los íconos están en img/Iconos/escuderias/<id>.svg. La lista va acá (y no se lee de teams.json)
     para que funcione también abriendo el archivo directo, sin servidor. */
  const ESCUDERIAS = [
    { id: 'alpine', name: 'Alpine' },
    { id: 'aston-martin', name: 'Aston Martin' },
    { id: 'audi', name: 'Audi' },
    { id: 'cadillac', name: 'Cadillac' },
    { id: 'ferrari', name: 'Ferrari' },
    { id: 'haas', name: 'Haas' },
    { id: 'mclaren', name: 'McLaren' },
    { id: 'mercedes', name: 'Mercedes' },
    { id: 'racing-bulls', name: 'Racing Bulls' },
    { id: 'red-bull-racing', name: 'Red Bull Racing' },
    { id: 'williams', name: 'Williams' },
  ];

  function cargarEscuderias() {
    const box = qs('[data-teams]', form);
    ESCUDERIAS.forEach((team) => {
      const item = document.createElement('div');
      item.className = 'registro__team';
      item.innerHTML = `
        <input type="radio" name="escuderia" id="reg-team-${team.id}" />
        <label for="reg-team-${team.id}">
          <img src="img/Iconos/escuderias/${team.id}.svg" width="96" height="96" />
        </label>`;
      // Solo se ve el ícono: el nombre queda como texto alternativo y como tooltip
      qs('input', item).value = team.name;
      qs('img', item).alt = team.name;
      qs('label', item).title = team.name;
      box.append(item);
    });
  }

  /* Carrusel: cada flecha avanza o retrocede lo que se ve (2 columnas) */
  const teamsBox = qs('[data-teams]', form);
  const prev = qs('[data-teams-prev]', form);
  const next = qs('[data-teams-next]', form);
  const pagina = () => {
    const css = getComputedStyle(teamsBox);
    const ancho = teamsBox.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
    return ancho + parseFloat(css.columnGap || 0);
  };
  function actualizarFlechas() {
    const max = teamsBox.scrollWidth - teamsBox.clientWidth;
    prev.disabled = teamsBox.scrollLeft <= 1;
    next.disabled = teamsBox.scrollLeft >= max - 1;
  }
  prev.addEventListener('click', () => teamsBox.scrollBy({ left: -pagina(), behavior: 'smooth' }));
  next.addEventListener('click', () => teamsBox.scrollBy({ left: pagina(), behavior: 'smooth' }));
  teamsBox.addEventListener('scroll', actualizarFlechas, { passive: true });
  window.addEventListener('resize', actualizarFlechas);

  cargarEscuderias();
  actualizarFlechas();

  /* ---------- Número: siempre dos dígitos (7 → 07) ---------- */
  const numeroInput = qs('#reg-numero');
  numeroInput.addEventListener('input', () => {
    numeroInput.value = numeroInput.value.replace(/\D/g, '').slice(0, 2);
  });
  numeroInput.addEventListener('blur', () => {
    if (numeroInput.value) numeroInput.value = dosDigitos(numeroInput.value);
  });

  // No se puede elegir una fecha de nacimiento futura
  qs('#reg-nacimiento').max = new Date().toISOString().slice(0, 10);

  /* "Hola piloto “Nombre”": se completa mientras escribe */
  const nombreInput = qs('#reg-nombre');
  const mostrarAlias = () => {
    alias.textContent = nombreInput.value.trim().split(/\s+/)[0] || '...';
  };
  nombreInput.addEventListener('input', mostrarAlias);

  /* ---------- Validación por paso ---------- */
  function leer() {
    const f = Object.fromEntries(new FormData(form));
    ['nombre', 'apellido', 'fecha_nacimiento', 'email', 'escuderia', 'numero'].forEach((k) => {
      f[k] = String(f[k] ?? '').trim();
    });
    f.email = f.email.toLowerCase();
    return f;
  }

  const validaciones = [
    (f) => {
      if (!f.nombre) return ['nombre', 'Completá tu nombre.'];
      if (!f.apellido) return ['apellido', 'Completá tu apellido.'];
    },
    (f) => {
      const hoy = new Date().toISOString().slice(0, 10);
      if (!f.fecha_nacimiento) return ['fecha_nacimiento', 'Completá tu fecha de nacimiento.'];
      if (f.fecha_nacimiento <= '1900-01-01' || f.fecha_nacimiento > hoy)
        return ['fecha_nacimiento', 'Revisá la fecha de nacimiento.'];
      if (!EMAIL_RE.test(f.email)) return ['email', 'Revisá el mail: parece que tiene un error.'];
    },
    (f) => {
      if (f.password.length < 8) return ['password', 'La contraseña tiene que tener al menos 8 caracteres.'];
      if (f.password !== f.password2) return ['password2', 'Las contraseñas no coinciden.'];
    },
    (f) => {
      const numero = /^\d{1,2}$/.test(f.numero) ? Number(f.numero) : NaN;
      if (!f.escuderia) return ['escuderia', 'Elegí tu escudería.'];
      if (!Number.isInteger(numero) || numero <= 0 || numero > 99)
        return ['numero', 'El número tiene que ser entre 01 y 99.'];
    },
  ];

  function mostrarError(texto, campo) {
    status.classList.remove('is-info');
    status.textContent = texto;
    if (!campo) return;
    const el = form.elements[campo];
    const foco = el instanceof RadioNodeList ? el[0] : el;
    if (!(el instanceof RadioNodeList)) el.setAttribute('aria-invalid', 'true');
    foco?.focus();
  }

  form.addEventListener('input', (e) => {
    e.target.removeAttribute('aria-invalid');
    status.textContent = '';
  });

  /* ---------- Navegación entre pasos ---------- */
  function irA(indice) {
    actual = indice;
    steps.forEach((step, i) => (step.hidden = i !== indice));
    status.textContent = '';
    qs('[data-paso-actual]', form).textContent = dosDigitos(indice + 1);
    avanzar.textContent = indice === steps.length - 1 ? 'Terminar' : 'Avanzar';
    const primero = qs('input', steps[indice]);
    // En el paso de escuderías, el foco va a la elegida (o a la primera)
    const elegida = qs('input:checked', steps[indice]);
    (elegida || primero)?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    actualizarFlechas();
  }

  qs('[data-paso-total]', form).textContent = dosDigitos(steps.length);

  volver.addEventListener('click', () => {
    if (actual === 0) location.href = INICIO;
    else irA(actual - 1);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const invalido = validaciones[actual](leer());
    if (invalido) return mostrarError(invalido[1], invalido[0]);
    track('registro_paso', { paso: actual + 1 });
    if (actual < steps.length - 1) return irA(actual + 1);
    crearCuenta();
  });

  /* ---------- Crear la cuenta ---------- */
  function mensajeError(error) {
    const msg = (error?.message || '').toLowerCase();
    if (msg.includes('already registered')) return 'Ya existe una cuenta con ese mail. Iniciá sesión.';
    // Supabase rechaza mails que no existen o que parecen de prueba
    if (error?.code === 'email_address_invalid' || (msg.includes('email address') && msg.includes('invalid')))
      return 'Ese mail no es válido. Usá un mail real que revises.';
    if (error?.code === 'email_address_not_authorized')
      return 'Todavía no podemos mandar mails a esa dirección. Probá más tarde.';
    if (msg.includes('password')) return 'La contraseña no es válida: probá con una más larga o más difícil.';
    if (msg.includes('rate limit') || error?.status === 429)
      return 'Hubo demasiados intentos. Probá de nuevo en un rato.';
    if (msg.includes('database error')) return 'No pudimos guardar tus datos. Revisá que estén todos completos.';
    return 'Algo salió mal. Probá de nuevo en un rato.';
  }

  // Paso al que hay que volver según el error
  function pasoDelError(error) {
    const msg = (error?.message || '').toLowerCase();
    if (msg.includes('already registered') || msg.includes('email address')) return [1, 'email'];
    if (msg.includes('password')) return [2, 'password'];
    return null;
  }

  async function crearCuenta() {
    if (!client) return mostrarError('Las cuentas todavía no están activas. Probá más tarde.');
    const f = leer();
    avanzar.disabled = true;
    volver.disabled = true;
    status.classList.add('is-info');
    status.textContent = 'Creando tu perfil…';
    try {
      const { data, error } = await client.auth.signUp({
        email: f.email,
        password: f.password,
        options: {
          // El link de confirmación vuelve a la página principal
          emailRedirectTo: new URL(INICIO, location.href).href,
          // Lo lee el trigger de la base para crear el perfil
          data: {
            nombre: f.nombre,
            apellido: f.apellido,
            fecha_nacimiento: f.fecha_nacimiento,
            escuderia: f.escuderia,
            numero: dosDigitos(f.numero),
          },
        },
      });
      if (error) throw error;
      // Con la confirmación por mail activa, Supabase no da error si el mail ya existe:
      // devuelve un usuario sin identidades
      if (data.user && data.user.identities?.length === 0) throw new Error('already registered');

      track('cuenta_creada', { escuderia: f.escuderia });
      // También a la lista de Brevo, para mandarle novedades
      fetch('/api/suscribir', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: f.email }),
        keepalive: true,
      }).catch(() => {});

      // Sin sesión todavía: falta confirmar el mail, la página principal lo avisa
      if (!data.session) {
        try {
          sessionStorage.setItem(AVISO_KEY, f.email);
        } catch {}
      }
      location.href = INICIO;
    } catch (err) {
      console.warn(err);
      const volverA = pasoDelError(err);
      if (volverA) irA(volverA[0]);
      mostrarError(mensajeError(err), volverA?.[1]);
      avanzar.disabled = false;
      volver.disabled = false;
    }
  }

  irA(0);
  mostrarAlias();
})();
