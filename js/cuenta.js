/* Cuentas de usuario con Supabase: iniciar sesión y cerrar sesión (crear cuenta: js/registro.js).
   Los datos del proyecto (URL y key pública) van en js/supabase-config.js.
   La tabla y sus reglas están en supabase/migrations/. */

(() => {
  'use strict';

  const qs = (sel, root = document) => root.querySelector(sel);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  window.dataLayer = window.dataLayer || [];
  const track = (event, data = {}) => {
    window.dataLayer.push({ event, ...data });
    window.va?.('event', { name: event, data });
  };

  const dialog = qs('[data-account]');
  const loginForm = qs('[data-account-form="login"]', dialog);
  const done = qs('[data-account-done]', dialog);
  const userBox = qs('[data-user]');
  const userToggle = qs('[data-user-toggle]');
  const userMenu = qs('[data-user-menu]');
  const registerBtn = qs('[data-account-open]');
  const loginBtn = qs('[data-login-open]');
  // Lo guarda js/registro.js al terminar el registro, si falta confirmar el mail
  const AVISO_KEY = 'vandu22_registro_email';

  // Registro anterior (solo mail, guardado en el navegador): ya no se usa
  try {
    localStorage.removeItem('vandu22_usuario');
  } catch {}

  const cfg = window.SUPABASE_CONFIG || {};
  const configured = /^https:\/\//.test(cfg.url || '') && cfg.key && !cfg.key.startsWith('PEGAR');
  const client = configured && window.supabase ? window.supabase.createClient(cfg.url, cfg.key) : null;
  if (!client) console.warn('Supabase sin configurar: completá js/supabase-config.js');

  /* ---------- Ventana de cuenta ---------- */
  // Crear cuenta: el botón "Registrarme" lleva a registro.html (js/registro.js)
  registerBtn.addEventListener('click', () => track('cta_registro'));

  function openLogin() {
    loginForm.hidden = false;
    done.hidden = true;
    qs('.signup__status', loginForm).textContent = '';
    dialog.showModal();
  }

  loginBtn.addEventListener('click', () => {
    track('cta_login');
    openLogin();
  });

  qs('[data-account-close]', dialog).addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => e.target === dialog && dialog.close());

  // Desde el registro: "¿Ya tenés cuenta? Iniciá sesión" llega con #ingresar
  if (location.hash === '#ingresar') {
    history.replaceState(null, '', location.pathname + location.search);
    openLogin();
  }

  // Vuelta del registro: falta confirmar el mail
  let avisoEmail = null;
  try {
    avisoEmail = sessionStorage.getItem(AVISO_KEY);
    sessionStorage.removeItem(AVISO_KEY);
  } catch {}
  if (avisoEmail) {
    qs('[data-account-done-email]', done).textContent = avisoEmail;
    loginForm.hidden = true;
    done.hidden = false;
    dialog.showModal();
  }

  const dosDigitos = (valor) => String(valor).trim().padStart(2, '0');

  function leerFormulario(form) {
    const f = Object.fromEntries(new FormData(form));
    f.email = String(f.email || '').trim().toLowerCase();
    return f;
  }

  /* Mensajes de Supabase traducidos */
  function mensajeError(error) {
    const msg = (error?.message || '').toLowerCase();
    if (msg.includes('invalid login credentials')) return 'Mail o contraseña incorrectos.';
    if (msg.includes('email not confirmed')) return 'Todavía no confirmaste tu mail. Revisá tu casilla (y el spam).';
    if (msg.includes('rate limit') || error?.status === 429)
      return 'Hubo demasiados intentos. Probá de nuevo en un rato.';
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

  /* ---------- Iniciar sesión ---------- */
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = loginForm;
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
    loginBtn.hidden = Boolean(user);
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
