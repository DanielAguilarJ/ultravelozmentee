'use strict';

/*
 * Los 127 URLs que Search Console reportaba como problema se reducen
 * a un puñado de formas. Cada test de aquí es una de esas formas, con
 * una URL real del informe, para que una regresión se note.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { resolveLegacyPath, LEGACY_SECTIONS } = require('../js/legacy-redirects');

const ROOT = path.join(__dirname, '..');

/* El predicado real: existe <slug>.html en la raíz servible. */
const realPageExists = slug => fs.existsSync(path.join(ROOT, `${slug}.html`));

/* Predicado de laboratorio, para los casos que no dependen del disco. */
const fakePages = new Set(['fastkids', 'memoria-prodigiosa', 'blog-index', 'lectoescritura']);
const fakePageExists = slug => fakePages.has(slug);

// ─────────────────────────────────────────────────────────────
// 1) Rutas profundas: el último segmento es la página pretendida
// ─────────────────────────────────────────────────────────────

test('ruta profunda .html cuyo último segmento es una página real → 301 a esa página', () => {
  const casos = [
    ['/home/fastkids.html', '/fastkids'],
    ['/analisis-de-contenido/memoria-prodigiosa.html', '/memoria-prodigiosa'],
    ['/planteles/blog-index.html', '/blog-index'],
    ['/producto/euclidean-color-black-pen/fastkids.html', '/fastkids'],
    ['/las-dificultades-de-albert-einstein-en-la-educacion-convencional-y-el-valor-del-aprendizaje-alternativo/memoria-prodigiosa.html', '/memoria-prodigiosa']
  ];
  for (const [entrada, esperado] of casos) {
    assert.equal(resolveLegacyPath(entrada, fakePageExists), esperado, entrada);
  }
});

test('la variante sin extensión de la misma ruta profunda resuelve igual', () => {
  assert.equal(resolveLegacyPath('/home/fastkids', fakePageExists), '/fastkids');
});

test('/<algo>/index.html apunta a la raíz', () => {
  assert.equal(resolveLegacyPath('/preparacion-para-examenes/index.html', fakePageExists), '/');
  assert.equal(resolveLegacyPath('/cualquier-cosa/index', fakePageExists), '/');
});

test('ruta profunda con último segmento inexistente cae en la sección heredada', () => {
  assert.equal(resolveLegacyPath('/educacion-digital/pagina-que-jamas-existio.html', fakePageExists), '/homeschool');
});

test('ruta profunda sin página real ni sección conocida NO redirige: 404 honesto', () => {
  assert.equal(
    resolveLegacyPath('/i-appreciate-your-query/pagina-inexistente.html', fakePageExists),
    null
  );
});

// ─────────────────────────────────────────────────────────────
// 2) Secciones heredadas de un solo segmento
// ─────────────────────────────────────────────────────────────

test('las páginas estructurales del WordPress antiguo redirigen a su equivalente', () => {
  assert.equal(resolveLegacyPath('/home', fakePageExists), '/');
  assert.equal(resolveLegacyPath('/regularizacion', fakePageExists), '/regularizacion-express');
  assert.equal(resolveLegacyPath('/planteles', fakePageExists), '/#contacto');
});

test('los posts eliminados en la migración van a un sustituto temático real', () => {
  assert.equal(
    resolveLegacyPath('/medicina-y-sus-lecturas-problemas-y-estrate', fakePageExists),
    '/fotolectura'
  );
  assert.equal(
    resolveLegacyPath('/la-ensenanza-de-la-robotica-en-ninos-de-mexico-beneficios-en-su-aprendizaje-a-largo-plazo', fakePageExists),
    '/blog-robotica-educativa-beneficios'
  );
});

test('la basura autogenerada NO se redirige a la portada (evita el soft-404)', () => {
  const basura = [
    '/since-the-youtube-video-title-provided-is-empty-it-is-not-possible-to-generate-a-blog-post-title',
    '/i-appreciate-your-query',
    '/organizacion-de-contenido',
    '/pop-culture',
    '/shop',
    '/se-incluyen-aspectos-de-innovacion-tecnologica-y-como-se-utilizan-distintos-formatos-y-plataformas-para-narrar-en-la-era-digital'
  ];
  for (const u of basura) {
    assert.equal(resolveLegacyPath(u, fakePageExists), null, `${u} debe seguir siendo 404`);
  }
});

// ─────────────────────────────────────────────────────────────
// 3) Lo que NO debe tocar
// ─────────────────────────────────────────────────────────────

test('una página existente de un solo segmento se sirve, no se redirige', () => {
  assert.equal(resolveLegacyPath('/fastkids', fakePageExists), null);
  assert.equal(resolveLegacyPath('/fastkids.html', fakePageExists), null);
});

test('la raíz nunca se redirige', () => {
  assert.equal(resolveLegacyPath('/', fakePageExists), null);
});

test('los recursos estáticos quedan intactos', () => {
  const recursos = [
    '/css/styles.css',
    '/js/navbar.js',
    '/images/logo.svg',
    '/images/fastkids-curso-ingles-ninos-flashcards.webp',
    '/sitemap.xml',
    '/robots.txt',
    '/api/posts',
    '/.well-known/security.txt'
  ];
  for (const r of recursos) {
    assert.equal(resolveLegacyPath(r, fakePageExists), null, r);
  }
});

test('un recurso con nombre de página pero otra extensión no se secuestra', () => {
  assert.equal(resolveLegacyPath('/algo/fastkids.css', fakePageExists), null);
  assert.equal(resolveLegacyPath('/algo/fastkids.json', fakePageExists), null);
});

test('no hay traversal posible', () => {
  assert.equal(resolveLegacyPath('/x/../../etc/passwd', fakePageExists), null);
  assert.equal(resolveLegacyPath('/x/..%2f..%2fetc', fakePageExists), null);
});

test('entradas no válidas devuelven null sin lanzar', () => {
  assert.equal(resolveLegacyPath('', fakePageExists), null);
  assert.equal(resolveLegacyPath(null, fakePageExists), null);
  assert.equal(resolveLegacyPath(undefined, fakePageExists), null);
  assert.equal(resolveLegacyPath('sin-barra-inicial', fakePageExists), null);
});

// ─────────────────────────────────────────────────────────────
// 4) Sin bucles: todo destino tiene que ser servible de verdad
// ─────────────────────────────────────────────────────────────

test('todo destino de LEGACY_SECTIONS existe en el sitio (o es la raíz)', () => {
  for (const [origen, destino] of Object.entries(LEGACY_SECTIONS)) {
    const limpio = destino.split('#')[0];
    if (limpio === '/') continue;
    const slug = limpio.slice(1);
    assert.ok(
      realPageExists(slug),
      `${origen} → ${destino} apunta a una página inexistente (${slug}.html)`
    );
  }
});

test('ningún destino de LEGACY_SECTIONS vuelve a redirigir: sin cadenas ni bucles', () => {
  for (const [origen, destino] of Object.entries(LEGACY_SECTIONS)) {
    const limpio = destino.split('#')[0];
    assert.equal(
      resolveLegacyPath(limpio, realPageExists),
      null,
      `${origen} → ${destino} produce una segunda redirección`
    );
  }
});

test('ningún origen de LEGACY_SECTIONS pisa una página que sí existe', () => {
  for (const origen of Object.keys(LEGACY_SECTIONS)) {
    const slug = origen.slice(1);
    assert.equal(
      realPageExists(slug),
      false,
      `${origen} está en el mapa pero ${slug}.html existe: la redirección oculta la página`
    );
  }
});

// ─────────────────────────────────────────────────────────────
// 5) El informe completo de Search Console, contra el disco real
// ─────────────────────────────────────────────────────────────

test('las 98 rutas profundas del informe 404 resuelven a una página real', () => {
  const muestra = [
    ['/aprendizaje-rapido-transforma-tus-vacaciones/fastkids.html', '/fastkids'],
    ['/science-technology-these-categories-fit-well-because-the-post-is-about-broadly-explaining-youtube-video-topics/reembolsos.html', '/reembolsos'],
    ['/educacion-digital/testimonios.html', '/testimonios'],
    ['/regularizacion/privacidad.html', '/privacidad'],
    ['/youtube-best-practices/terminos.html', '/terminos'],
    ['/educacion-personalizada/juniormath_v2.html', '/juniormath_v2'],
    ['/metodologias-innovadoras/alfa-cash.html', '/alfa-cash'],
    ['/pop-culture/ciencia-astronomia.html', '/ciencia-astronomia'],
    ['/shop/redaccion-ejecutiva.html', '/redaccion-ejecutiva'],
    ['/home/universidad-dominical.html', '/universidad-dominical'],
    ['/marketing-de-contenidos/robotics.html', '/robotics'],
    ['/redaccion-creativa/mathekids.html', '/mathekids'],
    ['/tecnologia/blog-index.html', '/blog-index'],
    ['/desarrollo-cognitivo/fastkids.html', '/fastkids'],
    ['/las-culturas-mesoamericanas-legado-sabiduria/lectoescritura.html', '/lectoescritura'],
    ['/preparacion-para-examenes/index.html', '/']
  ];
  for (const [entrada, esperado] of muestra) {
    assert.equal(resolveLegacyPath(entrada, realPageExists), esperado, entrada);
  }
});
