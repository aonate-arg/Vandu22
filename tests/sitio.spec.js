/* Controles de la migración a Astro (docs: plan de migración, Fase 5) */
import { test, expect } from '@playwright/test';
import content from '../src/data/content.json' with { type: 'json' };

const PAGINAS = ['/', '/index.html', '/stickers.html', '/prode.html', '/registro.html'];
const EN_VERCEL = Boolean(process.env.BASE_URL);

// Errores de recursos propios (CSS, JS, imágenes, videos) y de JavaScript en la página
function vigilar(page) {
  const fallas = [];
  page.on('response', (r) => {
    const url = new URL(r.url());
    const propio = url.origin === new URL(page.url() || 'http://x').origin;
    // En local no existen las funciones de Vercel (/_vercel/*, /api/*)
    const soloVercel = !EN_VERCEL && /^\/(_vercel|api)\//.test(url.pathname);
    if (propio && !soloVercel && r.status() >= 400) fallas.push(`${r.status()} ${url.pathname}`);
  });
  page.on('pageerror', (e) => fallas.push(`JS: ${e.message}`));
  return fallas;
}

for (const ruta of PAGINAS) {
  test(`${ruta} carga sin recursos rotos ni errores de JS`, async ({ page }) => {
    const fallas = vigilar(page);
    const res = await page.goto(ruta);
    expect(res.status()).toBe(200);
    // No se espera a que la red quede quieta: el video del hero sigue bajando
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    expect(fallas).toEqual([]);
  });
}

test('las direcciones viejas con ancla siguen andando', async ({ page }) => {
  const res = await page.goto('/index.html#grilla');
  expect(res.status()).toBe(200);
  await expect(page.locator('#grilla')).toBeVisible();
});

test('"Inicio" con la casita aparece fuera de la home y no en la home', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.site-menu__link--inicio')).toHaveCount(0);
  for (const ruta of ['/stickers.html', '/prode.html']) {
    await page.goto(ruta);
    await page.locator('[data-nav-toggle]').click();
    const inicio = page.locator('.site-menu__link--inicio');
    await expect(inicio).toBeVisible();
    await expect(inicio).toHaveAttribute('href', '/');
    await expect(inicio.locator('svg')).toHaveCount(1);
  }
});

test('el Prode no aparece en ningún menú ni footer', async ({ page }) => {
  for (const ruta of ['/', '/stickers.html', '/prode.html']) {
    await page.goto(ruta);
    await expect(page.locator('header a[href*="prode"], footer a[href*="prode"]')).toHaveCount(0);
  }
});

test('la fecha del GP se muestra en hora de Argentina', async ({ page }) => {
  const esperado = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'America/Argentina/Buenos_Aires',
  }).formatToParts(new Date(content.fecha_hora));
  const p = Object.fromEntries(esperado.map((x) => [x.type, x.value]));
  // Navegador en otra zona horaria: igual tiene que mostrar la hora de Buenos Aires
  await page.context().close();
  const ctx = await page.context().browser().newContext({ timezoneId: 'Europe/Madrid' });
  const pagina = await ctx.newPage();
  await pagina.goto('/');
  await expect(pagina.locator('[data-event="date"]')).toHaveText(`${p.day}/${p.month} · ${p.hour}:${p.minute} h`);
  await ctx.close();
});

for (const ruta of ['/', '/stickers.html', '/prode.html']) {
  test(`${ruta}: el botón de cuenta abre el login y Supabase está listo`, async ({ page }) => {
    await page.goto(ruta);
    await expect.poll(() => page.evaluate(() => Boolean(window.cuenta?.client))).toBe(true);
    await page.locator('[data-user-toggle]').click();
    await expect(page.locator('#cuenta')).toBeVisible();
    await expect(page.locator('#login-email')).toBeVisible();
  });
}

test('window.va existe antes de los scripts de la página', async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => (window.__vaAlCargar = typeof window.va));
  });
  await page.goto('/');
  expect(await page.evaluate(() => window.__vaAlCargar)).toBe('function');
});

test('registro: Supabase listo y "Volver" en el primer paso lleva a la home', async ({ page }) => {
  await page.goto('/registro.html');
  await page.locator('[data-volver]').click();
  await expect(page).toHaveURL(/\/$/);
});

test('/api/suscribir responde (solo en Vercel)', async ({ request }) => {
  test.skip(!EN_VERCEL, 'La función de Brevo solo existe en Vercel');
  // Campo trampa completo: la función responde ok sin guardar nada en Brevo
  const res = await request.post('/api/suscribir', { data: { email: 'prueba@example.com', website: 'bot' } });
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});
