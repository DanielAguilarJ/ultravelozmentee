'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const DATA_FILE = path.join(
  ROOT,
  'src',
  '_data',
  'testimonials.json'
);

if (!fs.existsSync(DATA_FILE)) {
  throw new Error(
    'No existe src/_data/testimonials.json'
  );
}

const testimonials = JSON.parse(
  fs.readFileSync(DATA_FILE, 'utf8')
).filter(item => item.verified === true);

if (!testimonials.length) {
  throw new Error(
    'No hay testimonios con verified: true'
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

function proofCard(item) {
  return `
    <article class="proof-card">
      <div class="proof-card-header">
        <div
          class="avatar-initials"
          data-hue="${Number(item.hue) || 1}"
          aria-hidden="true"
        >${esc(item.initials)}</div>

        <div>
          <h4 class="proof-name">${esc(item.name)}</h4>
          <p class="proof-role">${esc(item.role)}</p>
        </div>
      </div>

      <div class="proof-metric">
        ${esc(item.badge)}
      </div>

      <p class="proof-quote">
        &ldquo;${esc(item.quote)}&rdquo;
      </p>
    </article>
  `;
}

const footerProof = `
<div class="footer-social-proof">
  <div class="proof-header">
    <p class="proof-label">Experiencias verificadas</p>
    <h3 class="proof-title">
      Lo que comparten nuestras familias.
    </h3>
  </div>

  <div class="proof-grid">
    ${testimonials.map(proofCard).join('\n')}
  </div>

  <div class="proof-cta">
    <a href="/testimonios">
      Ver testimonios verificados
      <i class="fas fa-arrow-right"></i>
    </a>
  </div>
</div>

<!-- Footer Grid -->
`;

function homeLetter(item, index) {
  const position =
    index === 0 ? '0' :
    index === 1 ? '1' :
    index === 2 ? '2' : 'h';

  return `
    <article class="letter" data-pos="${position}">
      <blockquote>
        &ldquo;${esc(item.quote)}&rdquo;
      </blockquote>

      <div class="who">
        <div>
          <b>${esc(item.name)}</b>
          <span>${esc(item.role)}</span>
        </div>

        <span class="stamp">
          TESTIMONIO VERIFICADO
        </span>
      </div>
    </article>
  `;
}

const homeLetters = `
<section class="letters" id="cartas">
  <div class="wrap">
    <div class="letters-head rv">
      <span class="mono klein">
        Experiencias verificadas
      </span>

      <h2>
        Cada avance cuenta.
        <em>Estas familias lo comparten.</em>
      </h2>
    </div>

    <div
      class="stack rv"
      id="stack"
      aria-roledescription="carrusel"
      aria-label="Testimonios verificados"
    >
      ${testimonials.map(homeLetter).join('\n')}
    </div>

    <div class="stack-nav">
      <button
        id="prevL"
        aria-label="Testimonio anterior"
      >←</button>

      <span class="stack-count">
        <span id="curL">1</span> /
        ${testimonials.length}
      </span>

      <button
        id="nextL"
        aria-label="Testimonio siguiente"
      >→</button>
    </div>
  </div>
</section>
`;

for (const file of fs.readdirSync(ROOT)) {
  if (!file.endsWith('.html')) continue;

  const filePath = path.join(ROOT, file);
  let html = fs.readFileSync(filePath, 'utf8');
  const original = html;

  /*
   * Reemplaza el bloque compartido de testimonios del footer.
   */
  html = html.replace(
    /<div class="footer-social-proof">[\s\S]*?<!-- Footer Grid -->/i,
    footerProof.trim()
  );

  /*
   * Sustituye el carrusel del home.
   */
  if (file === 'index.html') {
    html = html.replace(
      /<section class="letters" id="cartas">[\s\S]*?<\/section>/i,
      homeLetters.trim()
    );

    /*
     * Estadísticas prudentes y consistentes.
     */
    html = html.replace(
      /<div role="listitem"><b><span class="count" style="--n:30"[\s\S]*?<\/div>/i,
      '<div role="listitem"><b>Desde 2000</b><span>WorldBrain México</span></div>'
    );

    html = html.replace(
      /<div role="listitem"><b><span class="count" style="--n:200"[\s\S]*?<\/div>/i,
      '<div role="listitem"><b>Máx. 7</b><span>Alumnos por grupo</span></div>'
    );

    html = html.replace(
      /<div role="listitem"><b><span class="count" style="--n:97"[\s\S]*?<\/div>/i,
      '<div role="listitem"><b>Semanal</b><span>Seguimiento de avances</span></div>'
    );

    /*
     * Quita reconocimientos sin enlaces ni evidencia visible.
     */
    html = html.replace(
      /<div class="press"[\s\S]*?<\/div>\s*<\/div>\s*(?=<!-- ═+ MANIFIESTO)/i,
      ''
    );

    html = html.replaceAll(
      'con alguien que ya recorrió el camino doscientas mil veces.',
      'con acompañamiento, práctica y seguimiento constante.'
    );

    html = html.replaceAll(
      'Es nuestro sello desde hace 30 años.',
      'Es una parte distintiva de nuestra metodología.'
    );

    html = html.replaceAll(
      'Aceites esenciales que equilibran cuerpo y mente, con beneficios educativos comprobados.',
      'Una experiencia sensorial previa a la clase, aplicada con criterios de seguridad y bienestar.'
    );

    html = html.replaceAll(
      'Sistema de lectura integral: 300 páginas en 30 minutos con comprensión y retención reales.',
      'Entrenamiento de lectura, comprensión, concentración y organización de la información.'
    );

    html = html.replaceAll(
      'Cálculo mental con Ábaco Soroban: 90 operaciones en 6 minutos.',
      'Cálculo mental con Ábaco Soroban mediante práctica progresiva y seguimiento.'
    );

    html = html.replaceAll(
      'Educación en casa con certificación oficial SEP, de primaria a preparatoria.',
      'Acompañamiento educativo para familias que buscan opciones flexibles de estudio.'
    );

    html = html.replaceAll(
      'Más de 200,000 graduados respaldan el método.',
      'El avance se evalúa mediante seguimiento y práctica guiada.'
    );

    html = html.replaceAll(
      'Treinta años de método nos permiten firmarlo.',
      'Consulta las condiciones completas en nuestra política de devoluciones.'
    );

    html = html.replace(
      /<div class="method-foot rv">\s*<div><b>8 semanas<\/b><span>Promedio de transformación<\/span><\/div>\s*<div><b>97%<\/b><span>Tasa de éxito<\/span><\/div>\s*<div><b>1 reporte<\/b><span>Semanal, a cada familia<\/span><\/div>\s*<\/div>/i,
      `<div class="method-foot rv">
        <div>
          <b>Diagnóstico</b>
          <span>Punto de partida individual</span>
        </div>
        <div>
          <b>Grupos de 7</b>
          <span>Atención personalizada</span>
        </div>
        <div>
          <b>Seguimiento</b>
          <span>Revisión periódica de avances</span>
        </div>
      </div>`
    );
  }

  if (html !== original) {
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`✅ Testimonios sincronizados: ${file}`);
  }
}
