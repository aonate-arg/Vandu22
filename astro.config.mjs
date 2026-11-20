// Configuración de Astro (https://docs.astro.build/en/reference/configuration-reference/)
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Sitio 100 % estático: Vercel publica dist/ y, aparte, la función de api/ (Brevo).
  output: 'static',
  build: {
    // stickers.astro → stickers.html: las direcciones quedan iguales a las de antes
    // (los links viejos de Instagram, la bio y Google siguen andando)
    format: 'file',
  },
});
