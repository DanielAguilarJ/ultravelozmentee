'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const testimonialsPath = path.join(
  ROOT,
  'src',
  '_data',
  'testimonials.json'
);

const testimonials = JSON.parse(
  fs.readFileSync(testimonialsPath, 'utf8')
).filter(item => item.verified === true);

if (!testimonials.length) {
  throw new Error(
    'No hay testimonios verificados para publicar'
  );
}

function esc(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const cards = testimonials.map(item => `
  <article class="card">
    <div class="initials" aria-hidden="true">
      ${esc(item.initials)}
    </div>

    <blockquote>
      &ldquo;${esc(item.quote)}&rdquo;
    </blockquote>

    <p class="badge">${esc(item.badge)}</p>

    <footer>
      <strong>${esc(item.name)}</strong>
      <span>${esc(item.role)}</span>
    </footer>
  </article>
`).join('\n');

const html = `<!DOCTYPE html>
<html lang="es-MX">
<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >

  <title>
    Testimonios verificados | WorldBrain México
  </title>

  <meta
    name="description"
    content="Experiencias verificadas de familias que participaron en programas de WorldBrain México."
  >

  <style>
    :root {
      --bg: #f6f4ee;
      --surface: #ffffff;
      --ink: #161512;
      --muted: #68645d;
      --blue: #2b36e8;
      --border: rgba(22, 21, 18, .12);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      color: var(--ink);
      background: var(--bg);
      font-family: system-ui, -apple-system, BlinkMacSystemFont,
        "Segoe UI", sans-serif;
      line-height: 1.6;
    }

    a {
      color: inherit;
    }

    .wrap {
      width: min(1120px, calc(100% - 40px));
      margin: 0 auto;
    }

    header {
      border-bottom: 1px solid var(--border);
    }

    nav {
      min-height: 72px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }

    nav a {
      text-decoration: none;
      font-weight: 700;
    }

    nav div {
      display: flex;
      gap: 20px;
    }

    main {
      padding: 88px 0;
    }

    .eyebrow {
      color: var(--blue);
      font-size: .75rem;
      font-weight: 800;
      letter-spacing: .14em;
      text-transform: uppercase;
    }

    h1 {
      max-width: 850px;
      margin: 14px 0 20px;
      font-family: Georgia, serif;
      font-size: clamp(2.5rem, 7vw, 5.3rem);
      font-weight: 400;
      line-height: 1;
    }

    .intro {
      max-width: 700px;
      color: var(--muted);
      font-size: 1.08rem;
    }

    .notice {
      margin: 34px 0 46px;
      padding: 18px 20px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: rgba(255, 255, 255, .6);
      color: var(--muted);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 22px;
    }

    .card {
      display: flex;
      flex-direction: column;
      min-height: 360px;
      padding: 30px;
      border: 1px solid var(--border);
      border-radius: 22px;
      background: var(--surface);
    }

    .initials {
      width: 52px;
      height: 52px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: var(--blue);
      color: white;
      font-weight: 800;
    }

    blockquote {
      flex: 1;
      margin: 28px 0 20px;
      font-family: Georgia, serif;
      font-size: 1.3rem;
      line-height: 1.5;
    }

    .badge {
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(43, 54, 232, .08);
      color: var(--blue);
      font-size: .84rem;
      font-weight: 700;
    }

    .card footer {
      display: flex;
      flex-direction: column;
      margin-top: 22px;
      padding-top: 18px;
      border-top: 1px solid var(--border);
    }

    .card footer span {
      color: var(--muted);
      font-size: .88rem;
    }

    .cta {
      margin-top: 60px;
      padding: 42px;
      border-radius: 22px;
      background: var(--ink);
      color: white;
      text-align: center;
    }

    .cta h2 {
      margin-top: 0;
      font-family: Georgia, serif;
      font-size: clamp(1.8rem, 4vw, 3rem);
      font-weight: 400;
    }

    .cta a {
      display: inline-block;
      margin-top: 14px;
      padding: 14px 24px;
      border-radius: 999px;
      background: var(--blue);
      color: white;
      text-decoration: none;
      font-weight: 700;
    }

    .site-footer {
      padding: 34px 0;
      border-top: 1px solid var(--border);
      color: var(--muted);
      font-size: .85rem;
    }

    @media (max-width: 850px) {
      .grid {
        grid-template-columns: 1fr;
      }

      nav div {
        display: none;
      }
    }
  </style>
</head>

<body>
  <header>
    <nav class="wrap" aria-label="Principal">
      <a href="/">WorldBrain México</a>

      <div>
        <a href="/#programas">Programas</a>
        <a href="/blog-index">Blog</a>
        <a href="/#contacto">Contacto</a>
      </div>
    </nav>
  </header>

  <main class="wrap" id="main-content">
    <span class="eyebrow">Experiencias verificadas</span>

    <h1>
      Lo que comparten nuestras familias.
    </h1>

    <p class="intro">
      Publicamos únicamente testimonios con autorización y registro
      interno. Las experiencias son individuales y los resultados
      pueden variar según el programa, la asistencia y la práctica.
    </p>

    <div class="notice">
      Para proteger la privacidad de menores de edad utilizamos
      nombres abreviados e iniciales cuando corresponde.
    </div>

    <section
      class="grid"
      aria-label="Testimonios verificados"
    >
      ${cards}
    </section>

    <section class="cta">
      <h2>
        Conoce el programa adecuado para ti o para tu hijo.
      </h2>

      <p>
        Agenda una conversación informativa sin compromiso.
      </p>

      <a
        href="https://wa.me/525578107837?text=Hola,%20quiero%20información%20de%20los%20programas"
      >
        Solicitar información por WhatsApp
      </a>
    </section>
  </main>

  <footer class="site-footer">
    <div class="wrap">
      <p>
        CWBMX, S.C. · RFC: CWB170626UH4 ·
        Av. 1 de Mayo, Mz-C24B, Loc. 282-283,
        Centro Urbano, Cuautitlán Izcalli,
        Estado de México, C.P. 54700.
      </p>

      <p>
        <a href="/terminos">Términos</a> ·
        <a href="/privacidad">Privacidad</a> ·
        <a href="/reembolsos">Reembolsos</a>
      </p>
    </div>
  </footer>
</body>
</html>`;

fs.writeFileSync(
  path.join(ROOT, 'testimonios.html'),
  html,
  'utf8'
);

console.log(
  `✅ testimonios.html reconstruido con ${testimonials.length} testimonios verificados`
);
