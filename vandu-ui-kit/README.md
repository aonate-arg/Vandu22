# Vandú UI Kit — guía para implementar

Estilo visual de la web de Vandú. Usalo para cualquier página o componente nuevo, así todo se ve igual.

## Archivos

| Archivo | Qué es |
| --- | --- |
| `tokens.css` | Variables CSS: colores, espacios, esquinas, fuentes. Tema Noche por defecto, Día con `data-theme="dia"` en `<html>`. |
| `components.css` | Clases `vd-*` de todos los componentes. Usa solo variables de `tokens.css`. |
| `tokens.json` | Los mismos valores en JSON (para herramientas). |
| `logos/` | `vandu-logo-blanco.svg` (sobre navy) y `vandu-logo-navy.svg` (sobre claro). |
| `ejemplos/` | Un HTML por componente, con el marcado exacto a copiar. |

## Cómo cargarlo

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,800;1,800&family=Inter:wght@400;500;600&display=swap">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="components.css">
```

Envolvé el contenido en `<div class="vd">` (o poné la clase en `<body>`). `components.css` empieza con un `@import` de las mismas fuentes; si ya las cargás en el `<head>`, podés borrarlo.

## Reglas (no romper)

- **Regla de los 8px** (adaptación de este proyecto): espacios, alturas, anchos y efectos van en múltiplos de 8 (8 · 16 · 24 · 32 · 40 · 48 · 64 · 72 · 80 · 96). Todo lo tocable mide 48px. Los tamaños de letra, los bordes de 2px y las esquinas (6 · 12 · 20 · píldora) quedan como en el kit original.
- **Forma geométrica** (adaptación de este proyecto, reemplaza las píldoras y esquinas redondeadas): sin redondeos. Botones, chips y etiquetas en paralelogramo inclinado (`--slant`, -12°). Tarjetas, buzón, calendario y ventanas con la esquina inferior izquierda cortada en diagonal (`--cut` 24px, `--cut-lg` 40px) y una línea de 2px arriba. Fotos y video en paralelogramo. Las etiquetas de sección llevan una rayita (`vd-label--line`). Los únicos círculos: redes sociales y avatares.
- **Color**
  - Fondo `--bg` (navy #001b44). Tarjetas `--surface` (#1f4580).
  - **Un solo botón neón** (`vd-btn--primary`) por pantalla o bloque. El resto, `vd-btn--secondary` o `--ghost`.
  - Selección y chips activos: `--highlight` (teal) con texto `--on-highlight` (navy).
  - Texto secundario: `--muted`. Nunca neón, sky ni teal como texto sobre blanco.
  - Nunca escribir colores sueltos: siempre `var(--token)`.
- **Tipografía**
  - Títulos: Barlow Condensed 800 **itálica**, en mayúsculas (`--font-display`).
  - Números (cuenta regresiva, fechas, precios): Barlow Condensed 800 **recta**.
  - Texto, botones y etiquetas: Inter 400/500/600 (`--font-sans`). No usar 700.
  - Escala: 64/60 titular · 44/44 sección · 28/32 bloque · 20 título de tarjeta (600) · 18/28 bajada · 16/24 texto · 12 etiqueta en mayúsculas.
  - En móvil: titular 42px, sección 30px.
- **Forma y espacio**
  - Botones y chips en píldora (`--radius-pill`), tarjetas `--radius-lg` (20px), campos `--radius-md` (12px), etiquetas `--radius-sm` (6px).
  - Grilla de 4px: `--space-1` … `--space-18`. Contenedor de 1120px en escritorio, 16px de margen lateral en móvil.
  - Sin sombras. Solo `--glow` en el hover del botón principal.
  - Todo lo que se toca mide 44px o más.
  - La franja `vd-speed` (diagonal del logo) marca inicios de sección y el footer.
- **Logo**: blanco sobre navy, navy sobre claro, mínimo 20px de alto, sin deformar ni efectos.
- **Voz**: voseo, corto. Los botones dicen la acción: "Quiero mi entrada", "Escribir", "Avisame". Errores directos: "Revisá el mail".

## Componentes

| Componente | Clases | Ejemplo |
| --- | --- | --- |
| Botón | `vd-btn` + `--primary` / `--secondary` / `--ghost`, `--sm`, `--block` | `ejemplos/Button.html` |
| Campo | `vd-field`, `vd-field__label`, `vd-input`, `vd-textarea`, `is-error`, `vd-field__error` | `ejemplos/Field.html` |
| Selección | `vd-segment`, `vd-chip[aria-pressed]`, `vd-check` | `ejemplos/Choice.html` |
| Estado de cupo | `vd-tag` + `--open` / `--low` / `--out` | `ejemplos/StatusTag.html` |
| Cuenta regresiva | `vd-countdown`, `__cell`, `__num`, `__unit` | `ejemplos/Countdown.html` |
| Tarjeta de GP | `vd-card vd-gp` | `ejemplos/GPCard.html` |
| Calendario | `vd-cal`, `vd-cal__row` (`is-break` para el receso) | `ejemplos/CalendarRow.html` |
| Tarjeta de valor | `vd-card` + `vd-value__icon/title/text` | `ejemplos/ValueCard.html` |
| Reseña | `vd-card` + `vd-review__*` | `ejemplos/ReviewCard.html` |
| Buzón (2 pasos) | `vd-mailbox`, `vd-steps` | `ejemplos/Mailbox.html` |
| Menú | `vd-nav`, `vd-nav__links`, `vd-burger`, `vd-logo--on-dark/--on-light` | `ejemplos/Navbar.html` |
| Footer | `vd-footer`, `vd-social`, `vd-speed` | `ejemplos/Footer.html` |
| Fondos (mosaicos) | `vd-bg` + `vd-bg-velocidad` / `-velocidad-blanco` / `-monograma` / `-monograma-blanco` | `ejemplos/Fondos.html` |

Para algo que no esté en la lista: armarlo con los mismos tokens y reglas, y agregarlo a `components.css` con prefijo `vd-`.

## Pendiente

- El envío del buzón no está conectado (mail, planilla o formulario: a definir).
- Los textos entre corchetes (`[Nombre del GP]`, `[$ precio]`, `[@creador]`) son datos a completar.
- `--signal` (rojo de error) y `--mist` (tarjetas en Día) son propuestas: no están en la paleta original.
- `fondos/monograma-blanco.svg` y `fondos/monograma-navy.svg` son baldosas provisorias (208×226) armadas con el logo oficial. Reemplazarlas por las diseñadas con el mismo nombre.
- En los mosaicos de velocidad, las rayas de 27px cada 64px no siguen la regla de los 8px (la línea de 8px cada 256px sí).
