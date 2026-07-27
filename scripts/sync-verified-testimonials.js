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



  if (html !== original) {
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`✅ Testimonios sincronizados: ${file}`);
  }
}
