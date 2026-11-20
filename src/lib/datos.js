/* Datos de src/data/content.json para los scripts del navegador.
   Base.astro los escribe dentro del HTML al publicar (<script type="application/json" id="datos">),
   así no hace falta pedirlos aparte ni tener una copia de respaldo en el código. */
export function leerDatos() {
  const el = document.getElementById('datos');
  try {
    return el ? JSON.parse(el.textContent) : {};
  } catch (err) {
    console.warn('No se pudieron leer los datos de la página', err);
    return {};
  }
}
