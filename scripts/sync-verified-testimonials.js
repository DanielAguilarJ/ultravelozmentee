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

const allTestimonials = JSON.parse(
  fs.readFileSync(DATA_FILE, 'utf8')
).filter(item =>
  item.verified === true &&
  item.published === true &&
  item.consentRecorded === true &&
  Boolean(item.course)
);

if (!allTestimonials.length) {
  throw new Error(
    'No hay testimonios publicables (verified, published y consentRecorded en true)'
  );
}

/*
 * Mapa de qué curso(s) puede mostrar cada archivo.
 * 'all' muestra todos los testimonios publicables (p.ej. testimonios.html).
 * Si un archivo no aparece aquí, no recibe testimonios.
 */
const COURSE_BY_FILE = {
  'robotics.html': 'robotics',
  'testimonios.html': 'all'
};

function testimonialsFor(file) {
  const rule = COURSE_BY_FILE[file];
  if (!rule) return [];
  if (rule === 'all') return allTestimonials;
  return allTestimonials.filter(item => item.course === rule);
}

function esc(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildFooterProof(testimonials) {
  return `
<div class="footer-social-proof">
  <div class="proof-header">
    <p class="proof-label">Experiencias verificadas</p>
    <h3 class="proof-title">
      Lo que comparten nuestras familias.
    </h3>
    <p class="proof-note">Testimonios publicados con autorización y registro interno.</p>
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
`.trim();
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

function buildHomeLetters(testimonials) {
  return `
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
}

for (const file of fs.readdirSync(ROOT)) {
  if (!file.endsWith('.html')) continue;

  const filePath = path.join(ROOT, file);
  let html = fs.readFileSync(filePath, 'utf8');
  const original = html;
  const testimonials = testimonialsFor(file);

  /*
   * Reemplaza el bloque compartido de testimonios del footer.
   * Si la página no tiene testimonios de su curso, se elimina el bloque
   * en lugar de mostrar testimonios de otro programa.
   */
  if (/<div class="footer-social-proof">[\s\S]*?<!-- Footer Grid -->/i.test(html)) {
    html = html.replace(
      /<div class="footer-social-proof">[\s\S]*?<!-- Footer Grid -->/i,
      testimonials.length ? buildFooterProof(testimonials) : '<!-- Footer Grid -->'
    );
  }

  if (/<section class="letters" id="cartas">[\s\S]*?<\/section>/i.test(html) && testimonials.length) {
    html = html.replace(
      /<section class="letters" id="cartas">[\s\S]*?<\/section>/i,
      buildHomeLetters(testimonials).trim()
    );
  }

  if (html !== original) {
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`✅ Testimonios sincronizados: ${file}`);
  }
}
