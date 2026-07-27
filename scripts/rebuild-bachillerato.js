'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const html = `<!DOCTYPE html>
<html lang="es-MX">
<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >

  <title>
    Preparación para ingreso a bachillerato UNAM e IPN
  </title>

  <meta
    name="description"
    content="Preparación académica para procesos de ingreso a bachillerato de UNAM, IPN y otras instituciones."
  >

  <style>
    :root {
      --bg: #f8f5ed;
      --ink: #151412;
      --muted: #68635a;
      --blue: #2438da;
      --surface: #ffffff;
      --border: rgba(21, 20, 18, .12);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: system-ui, -apple-system, BlinkMacSystemFont,
        "Segoe UI", sans-serif;
      line-height: 1.65;
    }

    a {
      color: inherit;
    }

    .wrap {
      width: min(1100px, calc(100% - 40px));
      margin: 0 auto;
    }

    nav {
      min-height: 72px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
    }

    nav a {
      text-decoration: none;
      font-weight: 700;
    }

    .hero {
      padding: 100px 0 80px;
    }

    .eyebrow {
      color: var(--blue);
      font-size: .76rem;
      font-weight: 800;
      letter-spacing: .15em;
      text-transform: uppercase;
    }

    h1 {
      max-width: 900px;
      margin: 16px 0 24px;
      font-family: Georgia, serif;
      font-size: clamp(2.6rem, 7vw, 5.5rem);
      font-weight: 400;
      line-height: 1;
    }

    .lead {
      max-width: 720px;
      color: var(--muted);
      font-size: 1.12rem;
    }

    .buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 32px;
    }

    .button {
      display: inline-block;
      padding: 14px 22px;
      border: 1px solid var(--ink);
      border-radius: 999px;
      text-decoration: none;
      font-weight: 700;
    }

    .button.primary {
      border-color: var(--blue);
      background: var(--blue);
      color: white;
    }

    .notice {
      margin-top: 48px;
      padding: 20px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--surface);
      color: var(--muted);
    }

    .section {
      padding: 72px 0;
      border-top: 1px solid var(--border);
    }

    .section h2 {
      max-width: 700px;
      font-family: Georgia, serif;
      font-size: clamp(2rem, 5vw, 3.4rem);
      font-weight: 400;
      line-height: 1.1;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 34px;
    }

    .card {
      padding: 28px;
      border: 1px solid var(--border);
      border-radius: 18px;
      background: var(--surface);
    }

    .card h3 {
      margin-top: 0;
    }

    .card p {
      color: var(--muted);
    }

    footer {
      padding: 36px 0;
      border-top: 1px solid var(--border);
      color: var(--muted);
      font-size: .86rem;
    }

    @media (max-width: 760px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>

<body>
  <nav class="wrap" aria-label="Principal">
    <a href="/">WorldBrain México</a>
    <a href="/#programas">Ver programas</a>
  </nav>

  <main>
    <section class="hero">
      <div class="wrap">
        <span class="eyebrow">
          Preparación académica para bachillerato
        </span>

        <h1>
          Prepárate para los procesos de ingreso de UNAM e IPN.
        </h1>

        <p class="lead">
          Fortalece comprensión lectora, razonamiento matemático,
          ciencias, habilidades de estudio y práctica de reactivos
          con un plan basado en tu diagnóstico inicial.
        </p>

        <div class="buttons">
          <a
            class="button primary"
            href="https://wa.me/525578107837?text=Hola,%20quiero%20información%20sobre%20preparación%20para%20ingreso%20a%20bachillerato"
          >
            Solicitar información
          </a>

          <a
            class="button"
            href="/admision-universitaria"
          >
            Admisión universitaria
          </a>
        </div>

        <div class="notice">
          <strong>Información importante:</strong>
          las instituciones pueden modificar convocatorias,
          requisitos, modalidades y evaluaciones. Consulta siempre
          la convocatoria oficial vigente de la institución a la
          que deseas ingresar.
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <h2>
          Un plan de estudio basado en tu punto de partida.
        </h2>

        <div class="grid">
          <article class="card">
            <h3>Diagnóstico</h3>
            <p>
              Identificamos conocimientos y habilidades que
              necesitan mayor refuerzo.
            </p>
          </article>

          <article class="card">
            <h3>Plan de estudio</h3>
            <p>
              Organizamos los temas y la práctica de acuerdo con
              las necesidades del estudiante.
            </p>
          </article>

          <article class="card">
            <h3>Seguimiento</h3>
            <p>
              Revisamos avances, dudas y áreas que requieren
              práctica adicional.
            </p>
          </article>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <h2>Áreas de preparación</h2>

        <div class="grid">
          <article class="card">
            <h3>Comprensión lectora</h3>
            <p>
              Análisis de textos, vocabulario, inferencias y
              localización de información.
            </p>
          </article>

          <article class="card">
            <h3>Matemáticas</h3>
            <p>
              Aritmética, álgebra, geometría y resolución de
              problemas.
            </p>
          </article>

          <article class="card">
            <h3>Ciencias y estudio</h3>
            <p>
              Repaso académico, organización del tiempo,
              concentración y estrategias de estudio.
            </p>
          </article>
        </div>
      </div>
    </section>
  </main>

  <footer>
    <div class="wrap">
      <p>
        WorldBrain México ·
        <a href="tel:+525578107837">
          +52 (55) 7810-7837
        </a> ·
        <a href="/privacidad">Privacidad</a> ·
        <a href="/terminos">Términos</a>
      </p>
    </div>
  </footer>
</body>
</html>`;

fs.writeFileSync(
  path.join(ROOT, 'comipems.html'),
  html,
  'utf8'
);

console.log(
  '✅ comipems.html sustituido por una landing vigente y prudente'
);
