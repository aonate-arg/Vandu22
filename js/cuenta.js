/* Cuentas de usuario con Supabase: crear cuenta, iniciar sesión y cerrar sesión.
   Los datos del proyecto (URL y key pública) van en js/supabase-config.js.
   La tabla y sus reglas están en supabase/migrations/. */

(() => {
  'use strict';

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  window.dataLayer = window.dataLayer || [];
  const track = (event, data = {}) => {
    window.dataLayer.push({ event, ...data });
    window.va?.('event', { name: event, data });
  };

  const dialog = qs('[data-account]');
  const forms = {
    registro: qs('[data-account-form="registro"]', dialog),
    login: qs('[data-account-form="login"]', dialog),
  };
  const done = qs('[data-account-done]', dialog);
  const userBox = qs('[data-user]');
  const userToggle = qs('[data-user-toggle]');
  const userMenu = qs('[data-user-menu]');
  const registerBtn = qs('[data-account-open]');

  // Registro anterior (solo mail, guardado en el navegador): ya no se usa
  try {
    localStorage.removeItem('vandu22_usuario');
  } catch {}

  const cfg = window.SUPABASE_CONFIG || {};
  const configured = /^https:\/\//.test(cfg.url || '') && cfg.key && !cfg.key.startsWith('PEGAR');
  const client = configured && window.supabase ? window.supabase.createClient(cfg.url, cfg.key) : null;
  if (!client) console.warn('Supabase sin configurar: completá js/supabase-config.js');

  /* ---------- Ventana de cuenta ---------- */
  function showTab(name) {
    qsa('[data-account-tab]', dialog).forEach((tab) => {
      tab.setAttribute('aria-selected', String(tab.dataset.accountTab === name));
    });
    Object.entries(forms).forEach(([key, form]) => {
      form.hidden = key !== name;
      qs('.signup__status', form).textContent = '';
    });
    qs('.account__tabs', dialog).hidden = false;
    done.hidden = true;
  }

  function openAccount(tab = 'registro') {
    showTab(tab);
    dialog.showModal();
  }

  registerBtn.addEventListener('click', (e) => {
    e.preventDefault();
    track('cta_registro');
    openAccount('registro');
  });
  qsa('[data-account-tab]', dialog).forEach((tab) =>
    tab.addEventListener('click', () => showTab(tab.dataset.accountTab)),
  );
  qs('[data-account-close]', dialog).addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => e.target === dialog && dialog.close());

  // No se puede elegir una fecha de nacimiento futura
  qs('#cuenta-nacimiento').max = new Date().toISOString().slice(0, 10);

  /* Número siempre con dos dígitos: 7 → 07 */
  const dosDigitos = (valor) => String(valor).trim().padStart(2, '0');
  const numeroInput = qs('#cuenta-numero');
  numeroInput.addEventListener('input', () => {
    numeroInput.value = numeroInput.value.replace(/\D/g, '').slice(0, 2);
  });
  numeroInput.addEventListener('blur', () => {
    if (numeroInput.value) numeroInput.value = dosDigitos(numeroInput.value);
  });

  /* ---------- Validación del formulario de registro ---------- */
  function validarRegistro(f) {
    const hoy = new Date().toISOString().slice(0, 10);
    const numero = /^\d{1,2}$/.test(f.numero) ? Number(f.numero) : NaN;
    if (!f.nombre) return ['nombre', 'Completá tu nombre.'];
    if (!f.apellido) return ['apellido', 'Completá tu apellido.'];
    if (!f.fecha_nacimiento) return ['fecha_nacimiento', 'Completá tu fecha de nacimiento.'];
    if (f.fecha_nacimiento <= '1900-01-01' || f.fecha_nacimiento > hoy)
      return ['fecha_nacimiento', 'Revisá la fecha de nacimiento.'];
    if (!EMAIL_RE.test(f.email)) return ['email', 'Revisá el mail: parece que tiene un error.'];
    if (f.password.length < 8) return ['password', 'La contraseña tiene que tener al menos 8 caracteres.'];
    if (f.password !== f.password2) return ['password2', 'Las contraseñas no coinciden.'];
    if (!f.escuderia) return ['escuderia', 'Elegí tu escudería.'];
    if (!Number.isInteger(numero) || numero <= 0 || numero >= 99)
      return ['numero', 'El número tiene que ser entre 01 y 98.'];
    return null;
  }

  function leerFormulario(form) {
    const f = Object.fromEntries(new FormData(form));
    Object.keys(f).forEach((k) => {
      if (k !== 'password' && k !== 'password2') f[k] = String(f[k]).trim();
    });
    if (f.email) f.email = f.email.toLowerCase();
    return f;
  }

  /* Mensajes de Supabase traducidos */
  function mensajeError(error) {
    const msg = (error?.message || '').toLowerCase();
    if (msg.includes('already registered')) return 'Ya existe una cuenta con ese mail. Iniciá sesión.';
    if (msg.includes('invalid login credentials')) return 'Mail o contraseña incorrectos.';
    if (msg.includes('email not confirmed')) return 'Todavía no confirmaste tu mail. Revisá tu casilla (y el spam).';
    if (msg.includes('password')) return 'La contraseña no es válida: probá con una más larga o más difícil.';
    if (msg.includes('rate limit') || error?.status === 429)
      return 'Hubo demasiados intentos. Probá de nuevo en un rato.';
    if (msg.includes('database error')) return 'No pudimos guardar tus datos. Revisá que estén todos completos.';
    return 'Algo salió mal. Probá de nuevo en un rato.';
  }

  async function enviar(form, accion) {
    const status = qs('.signup__status', form);
    const submit = qs('button[type="submit"]', form);
    status.textContent = '';
    if (!client) {
      status.textContent = 'Las cuentas todavía no están activas. Probá más tarde.';
      return;
    }
    submit.disabled = true;
    try {
      await accion(status);
    } catch (err) {
      console.warn(err);
      status.textContent = mensajeError(err);
    } finally {
      submit.disabled = false;
    }
  }

  /* ---------- Crear cuenta ---------- */
  forms.registro.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = forms.registro;
    enviar(form, async (status) => {
      const f = leerFormulario(form);
      const invalido = validarRegistro(f);
      if (invalido) {
        status.textContent = invalido[1];
        form.elements[invalido[0]].focus();
        return;
      }

      const { data, error } = await client.auth.signUp({
        email: f.email,
        password: f.password,
        options: {
          // El link de confirmación vuelve a esta misma página
          emailRedirectTo: location.origin + location.pathname,
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
      if (data.user && data.user.identities?.length === 0) {
        throw new Error('already registered');
      }

      track('cuenta_creada', { escuderia: f.escuderia });
      // También a la lista de Brevo, para mandarle novedades
      fetch('/api/suscribir', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: f.email }),
      }).catch(() => {});

      form.reset();
      if (data.session) {
        // Sin confirmación por mail: ya queda con la sesión iniciada
        dialog.close();
        return;
      }
      qs('[data-account-done-email]', done).textContent = f.email;
      form.hidden = true;
      qs('.account__tabs', dialog).hidden = true;
      done.hidden = false;
    });
  });

  /* ---------- Iniciar sesión ---------- */
  forms.login.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = forms.login;
    enviar(form, async (status) => {
      const f = leerFormulario(form);
      if (!EMAIL_RE.test(f.email)) {
        status.textContent = 'Revisá el mail: parece que tiene un error.';
        return;
      }
      if (!f.password) {
        status.textContent = 'Completá tu contraseña.';
        return;
      }
      const { error } = await client.auth.signInWithPassword({ email: f.email, password: f.password });
      if (error) throw error;
      track('sesion_iniciada');
      form.reset();
      dialog.close();
    });
  });

  /* ---------- Usuario en el header ---------- */
  function closeMenu() {
    userMenu.hidden = true;
    userToggle.setAttribute('aria-expanded', 'false');
  }

  userToggle.addEventListener('click', () => {
    const open = userMenu.hidden;
    userMenu.hidden = !open;
    userToggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (e) => !userBox.contains(e.target) && closeMenu());
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());

  qs('[data-logout]').addEventListener('click', async () => {
    closeMenu();
    await client?.auth.signOut();
  });

  async function mostrarUsuario(session) {
    const user = session?.user;
    registerBtn.hidden = Boolean(user);
    userBox.hidden = !user;
    if (!user) return closeMenu();

    // En el header: el mail hasta el @
    const alias = user.email.split('@')[0];
    qs('[data-user-name]').textContent = alias;
    userToggle.title = alias;
    qs('[data-user-email]').textContent = user.email;

    // En el menú: nombre y apellido del perfil
    const meta = user.user_metadata || {};
    const mostrarPerfil = (p) => {
      qs('[data-user-fullname]').textContent = [p.nombre, p.apellido].filter(Boolean).join(' ');
      qs('[data-user-number]').textContent = p.numero ? `#${dosDigitos(p.numero)}` : '';
    };
    mostrarPerfil(meta);
    const { data } = await client
      .from('perfiles')
      .select('nombre, apellido, numero')
      .eq('id', user.id)
      .maybeSingle();
    if (data) mostrarPerfil(data);
  }

  if (client) {
    client.auth.onAuthStateChange((_event, session) => {
      // Se difiere para no llamar a Supabase dentro del propio aviso de cambio de sesión
      setTimeout(() => mostrarUsuario(session), 0);
    });
  }
})();
