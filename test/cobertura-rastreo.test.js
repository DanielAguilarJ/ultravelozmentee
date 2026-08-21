/**
 * Guard: cobertura de rastreo.
 *
 * Origen: la auditoría del 2026-08-14 midió con la API de Search Console que
 * /diplomado-matematicas-fisica (0 enlaces internos), /comipems (3) y
 * /nosotros (ausente del sitemap) estaban en estado "URL desconocida para
 * Google, nunca rastreada". Una página sin enlaces internos o fuera del
 * sitemap es una página que no existe para el buscador, por bien optimizada
 * que esté por dentro.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SERVER = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');

/** Archivos que NO deben estar en el sitemap, con su motivo. */
const FUERA_DEL_SITEMAP = new Map([
  ['404.html', 'página de error'],
  ['googleb3cccf1efd67c490.html', 'archivo de verificación de Google'],
]);

function sitemapDeclarado() {
  const bloque = SERVER.slice(SERVER.indexOf('const PAGES = ['));
  return new Set([...bloque.matchAll(/\{\s*f:\s*'([^']+)'/g)].map((m) => m[1]));
}

function paginasDeCurso() {
  return fs.readdirSync(ROOT)
    .filter((f) => f.endsWith('.html') && !f.startsWith('blog-'))
    .map((f) => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')])
    .filter(([, html]) => /"@type":\s*"Course"/.test(html))
    // Una página marcada `noindex` no debe estar en el sitemap ni esperar
    // enlaces internos: Google pide explícitamente no declarar en el sitemap
    // URLs excluidas del índice, y enlazar a ellas no aporta rastreo. Sin esto,
    // cualquier página de curso en preparación (una variante en revisión, por
    // ejemplo) hacía fallar estas dos comprobaciones exigiendo justo lo
    // contrario de lo que debe hacerse con ella.
    .filter(([, html]) => !/<meta\s+name="robots"[^>]*content="[^"]*noindex/i.test(html))
    .map(([f]) => f);
}

test('toda página de curso está declarada en el sitemap', () => {
  const declaradas = sitemapDeclarado();
  const ausentes = paginasDeCurso().filter((f) => !declaradas.has(f));
  assert.deepEqual(ausentes, [], `Páginas de curso fuera del sitemap: ${ausentes.join(', ')}`);
});

test('las páginas institucionales están en el sitemap', () => {
  const declaradas = sitemapDeclarado();
  const obligatorias = ['index.html', 'nosotros.html', 'testimonios.html', 'blog-index.html'];
  const ausentes = obligatorias.filter((f) => !declaradas.has(f));
  assert.deepEqual(ausentes, [], `Faltan en el sitemap: ${ausentes.join(', ')}`);
});

test('el sitemap no declara páginas que no deben indexarse', () => {
  const declaradas = sitemapDeclarado();
  const intrusas = [...FUERA_DEL_SITEMAP.keys()].filter((f) => declaradas.has(f));
  assert.deepEqual(intrusas, [], `No deberían estar en el sitemap: ${intrusas.join(', ')}`);
});

test('toda página de curso recibe enlaces internos desde otras páginas', () => {
  const cursos = paginasDeCurso();
  const htmls = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
  const entrantes = new Map(cursos.map((c) => [c, 0]));

  for (const archivo of htmls) {
    const html = fs.readFileSync(path.join(ROOT, archivo), 'utf8');
    for (const curso of cursos) {
      if (archivo === curso) continue;
      const slug = curso.replace(/\.html$/, '');
      if (html.includes(`href="/${slug}"`)) entrantes.set(curso, entrantes.get(curso) + 1);
    }
  }

  // Umbral deliberadamente bajo: basta con que exista un camino de rastreo
  // real. El objetivo es impedir el caso medido (0 enlaces), no fijar una
  // cuota de enlazado que invite a inflarlo artificialmente.
  const aisladas = [...entrantes].filter(([, n]) => n < 1).map(([c, n]) => `${c} (${n})`);
  assert.deepEqual(aisladas, [], `Páginas de curso sin enlaces internos: ${aisladas.join(', ')}`);
});
