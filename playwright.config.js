/* Pruebas del sitio (npm test).
   Sin BASE_URL: arma el sitio y lo prueba en local (astro preview).
   Con BASE_URL: prueba esa dirección, ej. la vista previa de Vercel:
     BASE_URL=https://<rama>.vercel.app npm test */
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4321';

export default defineConfig({
  testDir: 'tests',
  reporter: 'list',
  use: { baseURL: BASE_URL },
  projects: [
    { name: 'celular', use: { ...devices['Pixel 7'] } },
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: 'npm run build && npm run preview -- --port 4321', url: BASE_URL, reuseExistingServer: true, timeout: 120_000 },
});
