# vandu22

Sitio de Vandú hecho con [Astro](https://astro.build). Se publica en Vercel como sitio estático.

## Comandos

```sh
npm install      # una vez
npm run dev      # sitio en http://localhost:4321 mientras editás
npm run build    # arma el sitio en dist/
npm test         # pruebas (arma el sitio y lo prueba en celular y escritorio)
BASE_URL=https://<vista-previa>.vercel.app npm test   # pruebas contra una vista previa de Vercel
```

## Dónde se edita cada cosa

| Qué | Dónde |
|---|---|
| Datos del GP, temporada, fotos, video | `src/data/content.json` (se publica de nuevo solo al hacer push) |
| Links del menú y del footer, mostrar/ocultar el Prode | `src/data/nav.js` (`MOSTRAR_PRODE`) |
| Header, footer, ventana de login | `src/components/` |
| Páginas | `src/pages/` (`stickers.astro` → `/stickers.html`) |
| `<head>` común (fuentes, analytics) | `src/layouts/Base.astro` |
| Estilos | `src/styles/` y `vandu-ui-kit/` |
| JavaScript del navegador | `src/scripts/` (Supabase y fechas en `src/lib/`) |
| Imágenes, videos, favicon | `public/` (se publican tal cual: `public/img/x.jpg` → `/img/x.jpg`) |
| Suscripción a Brevo | `api/suscribir.js` (función de Vercel, aparte de Astro) |
| Base de datos | `supabase/migrations/` |

Ya no hace falta cambiar `?v=` a mano: Astro le pone a cada CSS y JS un nombre nuevo en cada versión.
Las fechas se muestran siempre en hora de Argentina (`src/lib/fechas.js`).
