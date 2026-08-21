'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');

function loadPage(file) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const document = new JSDOM(html).window.document;
  const visibleBody = document.body.cloneNode(true);
  visibleBody.querySelectorAll('script, style, template, noscript').forEach(node => node.remove());
  const visible = visibleBody.textContent.replace(/\s+/g, ' ').trim();
  return { html, document, visible };
}

function text(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

const AUDIT_COPY = [
  /por confirmar/i,
  /publica 2000 como su año fundacional/i,
  /antes de inscribirte/i,
  /solicita por escrito/i,
  /antes de pagar/i,
  /datos por confirmar/i,
  /cotización escrita/i,
  /condiciones por confirmar/i,
  /no se presenta como garantía/i,
  /transparencia de testimonios/i,
  /evidencia y alcance/i,
  /qué puede sostenerse y qué no/i,
  /perfil individual verificable/i,
];

const UNSUPPORTED_CLAIMS = [
  /200[,.]000\+?\s*(graduados|egresados)/i,
  /97\s*%\s*(de éxito|tasa de éxito)/i,
  /3\s*[–-]\s*10\s*[×x]/i,
  /300 páginas en 30 minutos/i,
  /resultados medibles desde la primera sesión/i,
  /garantía\s*100\s*%|garantía de resultados/i,
  /devolvemos el 100\s*%/i,
];

function assertCommercialCopy(visible, pageName) {
  for (const pattern of AUDIT_COPY) {
    assert.doesNotMatch(visible, pattern, `${pageName} muestra lenguaje interno de auditoría: ${pattern}`);
  }
  for (const pattern of UNSUPPORTED_CLAIMS) {
    assert.doesNotMatch(visible, pattern, `${pageName} reintroduce un claim no respaldado: ${pattern}`);
  }
}

test('la portada recupera una propuesta comercial concreta sin lenguaje de auditoría', () => {
  const { document, visible } = loadPage('index.html');

  assert.equal(text(document.querySelector('h1')), 'No solo aprendas contenidos. Aprende cómo aprender.');
  assert.match(text(document.querySelector('.hero .lead')), /niños, jóvenes y adultos/i);
  assert.match(text(document.querySelector('.hero .lead')), /lectura.*cálculo.*tecnología.*hábitos de estudio/i);

  const ledger = text(document.querySelector('.ledger'));
  for (const fact of [/2000/i, /máx\. 7/i, /17/i, /Cuautitlán Izcalli/i]) {
    assert.match(ledger, fact, `falta dato útil en el hero: ${fact}`);
  }

  assert.match(text(document.querySelector('.fivemin h2')), /cinco minutos para activar la atención/i);
  assert.equal(
    text(document.querySelector('#metodo h2')),
    'Conoce tu punto de partida. Practica. Haz visible tu avance.',
  );
  assert.equal(
    text(document.querySelector('.finale h2')),
    'El siguiente paso empieza con una conversación.',
  );
  assert.match(visible, /Encuentra tu programa/i);
  assert.match(visible, /Hablar con un asesor/i);

  assertCommercialCopy(visible, 'la portada');
});

test('la FAQ visible de portada coincide exactamente con su FAQPage', () => {
  const { document } = loadPage('index.html');
  const visibleItems = [...document.querySelectorAll('.faq-sec details')].map(item => ({
    question: text(item.querySelector('summary')?.cloneNode(true)).replace(/\+$/, '').trim(),
    answer: text(item.querySelector('p')),
  }));
  const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')]
    .flatMap(script => {
      const data = JSON.parse(script.textContent);
      return data['@graph'] || [data];
    });
  const faq = schemas.find(node => node['@type'] === 'FAQPage');
  const schemaItems = faq?.mainEntity.map(item => ({
    question: text({ textContent: item.name }),
    answer: text({ textContent: item.acceptedAnswer?.text }),
  }));

  assert.ok(faq, 'falta FAQPage en portada');
  assert.deepEqual(schemaItems, visibleItems);
});

test('Fotolectura vende una práctica útil y conserva límites factuales sin parecer un informe', () => {
  const { html, document, visible } = loadPage('fotolectura.html');

  assert.equal(text(document.querySelector('h1')), 'Lees a la velocidad que te enseñaron, no a la que puedes.');
  assert.doesNotMatch(
    html,
    /no predice tu resultado/i,
    'el demo de lectura conserva un descargo con tono de auditoría',
  );
  assert.match(text(document.querySelector('.fx-lead')), /percepción visual.*comprensión.*retención.*lectura crítica/i);
  assert.equal(
    text(document.querySelector('#como-elegir h2')),
    'No te falta capacidad. Tal vez estás usando la misma forma de leer para todo.',
  );

  const value = text(document.querySelector('#como-elegir'));
  for (const idea of ['palabra por palabra', 'campo de lectura', 'distracción', 'regresiones', 'ritmo único']) {
    assert.match(value, new RegExp(idea, 'i'), `falta propuesta de valor: ${idea}`);
  }

  const facts = text(document.querySelector('#datos-curso'));
  for (const fact of [/4, 6 o 12 meses/i, /2 horas/i, /3 × 10 min/i, /horario flexible/i]) {
    assert.match(facts, fact, `falta dato comercial verificable: ${fact}`);
  }

  assert.equal(
    text(document.querySelector('#evidencia h2')),
    'Lo que entrenas va mucho más allá de la velocidad.',
  );
  assert.equal(
    text(document.querySelector('#programa h2')),
    'Un método que se construye en cinco capas.',
  );
  assert.equal(document.querySelector('#instructor'), null, 'no debe exhibirse un perfil de instructor ausente');
  assert.equal(
    document.querySelector('#evidencia-testimonios'),
    null,
    'no debe anunciarse la ausencia de testimonios',
  );
  assert.equal(
    text(document.querySelector('#oferta h2')),
    'Descubre cómo entrenar tu lectura.',
  );

  assertCommercialCopy(visible, 'Fotolectura');
});

test('la identidad y el generador SEO no pueden reintroducir la regresión', () => {
  const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', '_data', 'site.json'), 'utf8'));
  const applySeo = fs.readFileSync(path.join(ROOT, 'scripts', 'apply-seo.js'), 'utf8');
  const syncIdentity = fs.readFileSync(path.join(ROOT, 'tools', 'sync_site_identity.py'), 'utf8');

  assert.equal(
    site.tagline,
    'WorldBrain México · Lectura, cálculo, tecnología y habilidades para aprender mejor.',
  );
  for (const pattern of AUDIT_COPY) {
    assert.doesNotMatch(site.tagline, pattern, `el tagline conserva lenguaje de auditoría: ${pattern}`);
  }
  assert.doesNotMatch(site.tagline, /año fundacional/i);
  assert.doesNotMatch(applySeo, /límites de evidencia|datos por confirmar/i);
  assert.match(applySeo, /sistema integral de lectura rápida[^.]+ejercicios visuales[^.]+lectura crítica/i);
  assert.ok(
    !syncIdentity.includes('El tagline debe citar foundedYear'),
    'el sincronizador todavía obliga a convertir el tagline en una nota institucional',
  );
});
