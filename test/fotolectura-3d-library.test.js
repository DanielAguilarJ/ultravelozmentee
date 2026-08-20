const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'fotolectura.html'), 'utf8');
const document = new JSDOM(html).window.document;
const section = document.querySelector('#tipos-de-lectura');

function text(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

test('la biblioteca 3D convierte el temario en una promesa comercial responsable', () => {
  assert.ok(section, 'falta la biblioteca 3D');
  assert.equal(
    text(section.querySelector('h2')),
    'Que tus libros pendientes no se queden esperando a “algún día”.',
  );

  const copy = text(section);
  for (const idea of [
    'velocidad y comprensión',
    'propósito',
    'vista previa',
    'bloques',
    'activa lo esencial',
    'retención',
    'plan de práctica',
  ]) {
    assert.match(copy, new RegExp(idea, 'i'), `falta conectar el 3D con ${idea}`);
  }

  for (const claim of [
    /un libro en minutos/i,
    /comprensión total/i,
    /resultados garantizados/i,
    /300 páginas en 30 minutos/i,
    /3\s*[–-]\s*10\s*[×x]/i,
  ]) {
    assert.doesNotMatch(copy, claim, `la biblioteca introduce un claim no respaldado: ${claim}`);
  }
});

test('el recorrido vende desde el problema del lector y hace tangible el beneficio', () => {
  const copy = text(section);
  for (const idea of [
    'aprovechar mejor el tiempo que ya dedicas a leer',
    'dejar de leer por inercia',
    'No entrenes a ciegas',
    'Deja de perseguir palabras',
    'Acelera para encontrar. Desacelera para entender.',
    'comprensión y retención',
    'Máximo 7 por grupo',
  ]) {
    assert.match(copy, new RegExp(idea, 'i'), `falta el argumento comercial: ${idea}`);
  }

  const finalCta = section.querySelector('a.fxb-cta[href="#oferta"]');
  assert.ok(finalCta, 'falta el CTA final hacia la oferta');
  assert.equal(text(finalCta), 'Quiero conocer el próximo grupo');
});

test('los cinco libros representan las cinco etapas del método y ofrecen el siguiente paso', () => {
  const books = [...section.querySelectorAll('.fxb-item')];
  const panels = [...section.querySelectorAll('.fxb-panel-item')];
  const controls = [...section.querySelectorAll('.fxb-rail button')];

  assert.equal(books.length, 5);
  assert.equal(panels.length, 5);
  assert.equal(controls.length, 5);
  assert.deepEqual(
    books.map(book => text(book.querySelector('.fxb-foil'))),
    [
      'Tu punto de partida',
      'Lee con propósito',
      'Avanza por bloques',
      'Activa lo esencial',
      'Tu próxima biblioteca',
    ],
  );

  for (const href of ['#test-lectura', '#programa', '#oferta']) {
    assert.ok(section.querySelector(`a[href="${href}"]`), `falta CTA hacia ${href}`);
    assert.ok(document.querySelector(href), `el destino ${href} no existe`);
  }
});

test('el progreso y los paneles sincronizados conservan semántica accesible', () => {
  const rail = section.querySelector('#fxbRail');
  const controls = [...rail.querySelectorAll('button')];
  const panels = [...section.querySelectorAll('.fxb-panel-item')];
  const progress = section.querySelector('.fxb-progress');

  assert.equal(rail.getAttribute('aria-label'), 'Etapas del método de Fotolectura');
  assert.ok(progress, 'falta un indicador visual de progreso');
  assert.equal(progress.getAttribute('aria-hidden'), 'true');
  assert.equal(text(section.querySelector('#fxbCount')), '01 / 05');

  controls.forEach((control, index) => {
    const panel = panels[index];
    assert.ok(panel.id, `el panel ${index + 1} no tiene id`);
    assert.equal(control.getAttribute('aria-controls'), panel.id);
    assert.ok(control.getAttribute('aria-label'), `el control ${index + 1} no tiene nombre`);
  });

  assert.equal(panels[0].getAttribute('aria-hidden'), 'false');
  assert.equal(panels[0].hasAttribute('inert'), false);
  panels.slice(1).forEach(panel => {
    assert.equal(panel.getAttribute('aria-hidden'), 'true');
    assert.equal(panel.hasAttribute('inert'), true);
  });
});

test('la mejora visual sigue siendo CSS 3D liviano y tiene fallback de movimiento', () => {
  const styles = [...document.querySelectorAll('style')].map(style => style.textContent).join('\n');

  assert.match(styles, /\.fxb-item::before/);
  assert.match(styles, /\.fxb-viewport::before/);
  assert.match(styles, /transform-style:\s*preserve-3d/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.equal(section.querySelector('canvas'), null);
  assert.doesNotMatch(html, /three(?:\.min)?\.js|<model-viewer/i);
});


test('la barra móvil no cubre la biblioteca mientras el recorrido está visible', () => {
  const scripts = [...document.querySelectorAll('script')]
    .map(script => script.textContent)
    .join('\n');

  assert.match(scripts, /var libraryStage = \$\('#fxbStage'\)/);
  assert.match(scripts, /var libraryVisible = libraryRect &&/);
  assert.match(scripts, /&& !libraryVisible/);
});
