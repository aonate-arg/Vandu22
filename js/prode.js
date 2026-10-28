/* Prode del GP (prode.html): cada persona arma el top 10 del próximo Gran Premio.
   El GP y la fecha salen de data/content.json (los mismos datos que la página principal).
   Se guarda en Supabase (tabla prodes, supabase/migrations/) con la sesión de js/cuenta.js.
   Sin sesión no se guarda nada: lo elegido vive solo mientras la página está abierta.
   Con sesión, los cambios sin enviar quedan en el navegador (por usuario) para no perderlos. */

(() => {
  'use strict';

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];
  const PUESTOS = 10;

  window.dataLayer = window.dataLayer || [];
  const track = (event, data = {}) => {
    window.dataLayer.push({ event, ...data });
    window.va?.('event', { name: event, data });
  };

  /* Copia de lo necesario de data/content.json para cuando la página se abre sin servidor (doble clic).
     Si cambiás el GP en el JSON y querés verlo así, actualizá también este bloque. */
  const DATOS_RESPALDO = {
    gran_premio: 'GP de Austin',
    largada_carrera: '2026-10-25T17:00:00-03:00',
    url_entradas: 'https://www.instagram.com/vandu.f1/',
  };

  /* Pilotos por escudería. El ícono sale de img/Iconos/escuderias/<escuderia>.svg */
  const EQUIPOS = [
    { id: 'mclaren', nombre: 'McLaren', pilotos: ['Lando Norris', 'Oscar Piastri'] },
    { id: 'mercedes', nombre: 'Mercedes', pilotos: ['George Russell', 'Kimi Antonelli'] },
    { id: 'red-bull-racing', nombre: 'Red Bull', pilotos: ['Max Verstappen', 'Isack Hadjar'] },
    { id: 'ferrari', nombre: 'Ferrari', pilotos: ['Charles Leclerc', 'Lewis Hamilton'] },
    { id: 'williams', nombre: 'Williams', pilotos: ['Alex Albon', 'Carlos Sainz'] },
    { id: 'racing-bulls', nombre: 'Racing Bulls', pilotos: ['Liam Lawson', 'Arvid Lindblad'] },
    { id: 'aston-martin', nombre: 'Aston Martin', pilotos: ['Fernando Alonso', 'Lance Stroll'] },
    { id: 'haas', nombre: 'Haas', pilotos: ['Esteban Ocon', 'Oliver Bearman'] },
    { id: 'audi', nombre: 'Audi', pilotos: ['Nico Hülkenberg', 'Gabriel Bortoleto'] },
    { id: 'alpine', nombre: 'Alpine', pilotos: ['Pierre Gasly', 'Franco Colapinto'] },
    { id: 'cadillac', nombre: 'Cadillac', pilotos: ['Sergio Pérez', 'Valtteri Bottas'] },
  ];
  const EQUIPO_DE = new Map(EQUIPOS.flatMap((e) => e.pilotos.map((p) => [p, e])));
  const icono = (equipo) => `img/Iconos/escuderias/${equipo.id}.svg`;

  const form = qs('[data-prode]');
  const lista = qs('[data-puestos]', form);
  const status = qs('[data-prode-status]', form);
  const enviarBtn = qs('[data-prode-enviar]', form);
  const picker = qs('[data-picker]');
  const pickerLista = qs('[data-picker-lista]', picker);
  const quitarBtn = qs('[data-picker-quitar]', picker);

  // El prode cierra cuando larga la carrera (largada_carrera), no a la hora del evento en el bar (fecha_hora)
  let gp = null; // { gran_premio, largada (texto ISO), fecha (Date de la largada) }
  let pilotos = Array(PUESTOS).fill(null); // pilotos[0] = ganador
  let puestoAbierto = null;
  let enviado = false; // ya está guardado en Supabase tal cual se ve
  let enviarAlIniciar = false; // tocó Enviar sin sesión: se envía apenas inicia sesión

  const cerrado = () => gp && Date.now() >= gp.fecha.getTime();
  const usuarioId = () => window.cuenta?.sesion()?.user?.id || null;
  // Sin sesión no hay clave: el borrador no se guarda
  const claveBorrador = () => (usuarioId() && gp ? `vandu22_prode_${usuarioId()}_${gp.largada}` : null);
  const SIN_SESION = 'Iniciá sesión para que se guarde tu prode. Sin sesión, lo que elegís se pierde al salir.';

  /* ---------- Mensajes ---------- */
  function mensaje(texto, tipo = 'error') {
    status.textContent = texto;
    status.dataset.tipo = tipo;
  }

  /* ---------- Borrador en el navegador ---------- */
  function guardarBorrador() {
    const clave = claveBorrador();
    if (!clave) return;
    try {
      localStorage.setItem(clave, JSON.stringify({ pilotos, pendiente: !enviado }));
    } catch {}
  }

  function leerBorrador() {
    const clave = claveBorrador();
    if (!clave) return null;
    try {
      const b = JSON.parse(localStorage.getItem(clave) || 'null');
      if (b && Array.isArray(b.pilotos) && b.pilotos.length === PUESTOS) return b;
    } catch {}
    return null;
  }

  /* ---------- Los 10 puestos ---------- */
  function armarPuestos() {
    lista.replaceChildren(
      ...pilotos.map((_, i) => {
        const li = document.createElement('li');
        li.className = 'prode__puesto';
        li.innerHTML = `
          <span class="prode__numero" aria-hidden="true">${i + 1}.</span>
          <button class="prode__slot" type="button" data-puesto="${i}">
            <img class="prode__slot-icono" alt="" width="32" height="32" hidden />
            <span class="prode__slot-nombre"></span>
          </button>`;
        qs('button', li).addEventListener('click', () => abrirPicker(i));
        return li;
      }),
    );
    pintarPuestos();
  }

  function pintarPuestos() {
    qsa('[data-puesto]', lista).forEach((btn) => {
      const i = Number(btn.dataset.puesto);
      const piloto = pilotos[i];
      const equipo = piloto && EQUIPO_DE.get(piloto);
      const img = qs('img', btn);
      const nombre = qs('.prode__slot-nombre', btn);
      btn.classList.toggle('is-vacio', !piloto);
      btn.disabled = cerrado();
      img.hidden = !equipo;
      if (equipo) {
        img.src = icono(equipo);
        img.alt = equipo.nombre;
      }
      nombre.textContent = piloto || 'Elegí un piloto';
      btn.setAttribute('aria-label', `Puesto ${i + 1}: ${piloto ? `${piloto}, ${equipo.nombre}` : 'vacío'}`);
    });
    const completos = pilotos.filter(Boolean).length;
    enviarBtn.textContent = enviado ? 'Guardado ✓' : completos === PUESTOS ? 'Enviar' : `Enviar (${completos}/${PUESTOS})`;
    enviarBtn.disabled = cerrado();
  }

  function cambiar(nuevos) {
    pilotos = nuevos;
    enviado = false;
    guardarBorrador();
    pintarPuestos();
    if (status.dataset.tipo !== 'info') mensaje('');
  }

  /* ---------- Lista de pilotos ---------- */
  function armarPicker() {
    pickerLista.replaceChildren(
      ...EQUIPOS.map((equipo) => {
        const grupo = document.createElement('div');
        grupo.className = 'prode-picker__equipo';
        grupo.innerHTML = `
          <p class="prode-picker__equipo-nombre">
            <img src="${icono(equipo)}" alt="" width="24" height="24" />
            <span></span>
          </p>`;
        qs('span', grupo).textContent = equipo.nombre;
        equipo.pilotos.forEach((piloto) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'prode-picker__piloto';
          btn.dataset.piloto = piloto;
          btn.innerHTML = `
            <img src="${icono(equipo)}" alt="" width="32" height="32" />
            <span class="prode-picker__piloto-texto">
              <span class="prode-picker__piloto-nombre"></span>
              <span class="prode-picker__piloto-estado"></span>
            </span>`;
          qs('.prode-picker__piloto-nombre', btn).textContent = piloto;
          btn.addEventListener('click', () => elegir(piloto));
          grupo.append(btn);
        });
        return grupo;
      }),
    );
  }

  function abrirPicker(i) {
    if (cerrado()) return;
    puestoAbierto = i;
    qs('[data-picker-puesto]', picker).textContent = i + 1;
    qsa('[data-piloto]', pickerLista).forEach((btn) => {
      const donde = pilotos.indexOf(btn.dataset.piloto);
      const estado = qs('.prode-picker__piloto-estado', btn);
      btn.classList.toggle('is-actual', donde === i);
      btn.classList.toggle('is-usado', donde !== -1 && donde !== i);
      btn.setAttribute('aria-pressed', String(donde === i));
      estado.textContent =
        donde === i ? 'En este puesto' : donde !== -1 ? `Está en el ${donde + 1}.º · Pasarlo acá` : '';
    });
    quitarBtn.hidden = !pilotos[i];
    picker.showModal();
    // Arranca mostrando el elegido en este puesto (o el principio de la lista)
    const actual = qs('.is-actual', pickerLista);
    if (actual) actual.scrollIntoView({ block: 'center' });
    else pickerLista.scrollTop = 0;
  }

  /* Elegir un piloto para el puesto abierto. Si ya estaba en otro puesto, se pasa a este
     y el otro queda vacío. */
  function elegir(piloto) {
    const i = puestoAbierto;
    const nuevos = [...pilotos];
    const antes = nuevos.indexOf(piloto);
    if (antes !== -1) nuevos[antes] = null;
    nuevos[i] = piloto;
    cambiar(nuevos);
    track('prode_eleccion', { puesto: i + 1, movido: antes !== -1 && antes !== i });
    picker.close();
    if (antes !== -1 && antes !== i) mensaje(`${piloto} pasó del ${antes + 1}.º al ${i + 1}.º. El ${antes + 1}.º quedó vacío.`, 'info');
    qs(`[data-puesto="${i}"]`, lista).focus();
  }

  quitarBtn.addEventListener('click', () => {
    const i = puestoAbierto;
    const nuevos = [...pilotos];
    nuevos[i] = null;
    cambiar(nuevos);
    picker.close();
    qs(`[data-puesto="${i}"]`, lista).focus();
  });

  qs('[data-picker-close]', picker).addEventListener('click', () => picker.close());
  picker.addEventListener('click', (e) => e.target === picker && picker.close());

  /* ---------- Enviar ---------- */
  function mensajeError(error) {
    const msg = (error?.message || '').toLowerCase();
    if (msg.includes('ya cerró')) return 'El prode de este GP ya cerró: la carrera ya largó.';
    if (msg.includes('10 pilotos')) return 'Revisá que estén los 10 puestos con pilotos distintos.';
    if (error?.code === '42P01' || msg.includes('does not exist') || msg.includes('could not find'))
      return 'El prode todavía no está activo. Probá más tarde.';
    if (msg.includes('jwt') || error?.status === 401) return 'Tu sesión venció. Iniciá sesión de nuevo.';
    return 'No pudimos guardar tu prode. Probá de nuevo en un rato.';
  }

  async function enviar() {
    const cuenta = window.cuenta;
    const client = cuenta?.client;
    const session = cuenta?.sesion();
    if (!client) return mensaje('El prode todavía no está activo. Probá más tarde.');
    if (!session) {
      // No se guarda nada: lo elegido sigue en la página y se envía apenas inicie sesión
      enviarAlIniciar = true;
      mensaje('Iniciá sesión para guardar tu prode. Lo que elegiste no se pierde.', 'info');
      return cuenta.abrirLogin('Iniciá sesión para guardar tu prode. Lo que elegiste no se pierde.');
    }
    enviarAlIniciar = false;
    enviarBtn.disabled = true;
    mensaje('Guardando tu prode…', 'info');
    try {
      const { error } = await client.from('prodes').upsert(
        {
          user_id: session.user.id,
          gran_premio: gp.gran_premio,
          fecha_gp: gp.fecha.toISOString(),
          pilotos,
        },
        { onConflict: 'user_id,fecha_gp' },
      );
      if (error) throw error;
      enviado = true;
      guardarBorrador();
      track('prode_enviado', { gp: gp.gran_premio });
      mensaje('¡Listo! Guardamos tu prode. Podés cambiarlo hasta que larga la carrera.', 'ok');
    } catch (err) {
      console.warn(err);
      mensaje(mensajeError(err));
    } finally {
      pintarPuestos();
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (cerrado()) return;
    const faltan = pilotos.filter((p) => !p).length;
    if (faltan) {
      mensaje(faltan === 1 ? 'Te falta 1 puesto.' : `Te faltan ${faltan} puestos.`);
      return qs(`[data-puesto="${pilotos.indexOf(null)}"]`, lista).focus();
    }
    enviar();
  });

  /* ---------- Sesión ---------- */
  // Al iniciar sesión: el saludo con el nombre y el prode que ya tenía guardado
  const vacio = () => Array(PUESTOS).fill(null);

  async function alCambiarSesion({ session, perfil }, { cerroSesion = false } = {}) {
    const nombre = (perfil?.nombre || '').trim().split(/\s+/)[0];
    qs('[data-alias]').textContent = session && nombre ? nombre : '...';
    if (!gp) return;

    if (!session) {
      // Cerró sesión: el prode de esa cuenta no queda a la vista
      if (cerroSesion) {
        pilotos = vacio();
        enviado = false;
        enviarAlIniciar = false;
        pintarPuestos();
      }
      if (!cerrado()) mensaje(SIN_SESION, 'info');
      return;
    }

    if (status.textContent === SIN_SESION) mensaje('');
    // Tocó Enviar sin sesión: lo que eligió sigue en la página y se envía ahora
    if (enviarAlIniciar) return enviar();

    // Cambios sin enviar de esta cuenta en este navegador
    const borrador = leerBorrador();
    if (borrador?.pendiente) {
      pilotos = borrador.pilotos.map((p) => (EQUIPO_DE.has(p) ? p : null));
      enviado = false;
      return pintarPuestos();
    }

    const { data, error } = await window.cuenta.client
      .from('prodes')
      .select('pilotos')
      .eq('user_id', session.user.id)
      .eq('fecha_gp', gp.fecha.toISOString())
      .maybeSingle();
    if (!error && data) {
      pilotos = data.pilotos.slice(0, PUESTOS);
      enviado = true;
    }
    // Si no tenía nada guardado, se queda con lo que haya elegido antes de iniciar sesión
    guardarBorrador();
    pintarPuestos();
  }

  let ultimaSesion = null;
  document.addEventListener('cuenta:cambio', (e) => {
    const nueva = e.detail.session?.user?.id || null;
    const cambio = nueva !== ultimaSesion;
    ultimaSesion = nueva;
    // El perfil llega en un segundo aviso: solo actualiza el saludo
    if (!cambio) return (qs('[data-alias]').textContent = (e.detail.perfil?.nombre || '...').trim().split(/\s+/)[0]);
    alCambiarSesion(e.detail, { cerroSesion: !nueva });
  });

  /* ---------- Datos del GP ---------- */
  async function cargarGP() {
    try {
      const res = await fetch('data/content.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('No se pudo cargar data/content.json; se usan los datos de respaldo.', err);
      return DATOS_RESPALDO;
    }
  }

  function mostrarGP(ev) {
    // Si el JSON no tiene la largada todavía, usa la hora del evento para no dejar el prode abierto de más
    const largada = ev.largada_carrera || ev.fecha_hora;
    if (!ev.largada_carrera) console.warn('Falta largada_carrera en data/content.json: el prode cierra a la hora del evento.');
    const fecha = new Date(largada);
    gp = { gran_premio: ev.gran_premio, largada, fecha };
    qs('[data-gp]').textContent = ev.gran_premio;
    document.title = `Prode del ${ev.gran_premio} · 22`;

    const d = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' }).format(fecha);
    const t = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(fecha);
    qs('[data-cierre]').textContent = cerrado() ? 'El prode de este GP ya cerró' : `Cierra cuando larga la carrera: ${d} · ${t} h`;

    // Entradas: mismo link que en la página principal
    const cta = qs('[data-cta]');
    if (ev.url_entradas) {
      cta.href = ev.url_entradas;
      cta.target = '_blank';
      cta.rel = 'noopener';
    } else {
      cta.href = 'index.html#entradas';
    }
    cta.addEventListener('click', () => track('cta_entradas', { ubicacion: 'prode' }));
  }

  async function init() {
    armarPicker();
    mostrarGP(await cargarGP());
    // Borrador de la versión anterior, guardado sin usuario: ya no se usa
    try {
      localStorage.removeItem(`vandu22_prode_${gp.largada}`);
    } catch {}
    armarPuestos();
    if (cerrado()) mensaje('El prode de este GP ya cerró: la carrera ya largó.', 'info');
    // Arranca como sin sesión; si la sesión ya estaba lista, carga su prode
    const session = window.cuenta?.sesion() || null;
    ultimaSesion = session?.user?.id || null;
    alCambiarSesion({ session, perfil: window.cuenta?.perfil() });
  }

  init();
})();
