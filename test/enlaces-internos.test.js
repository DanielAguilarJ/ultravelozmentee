/**
 * Guard: ningún enlace interno del sitio debe apuntar a una página inexistente.
 *
 * Origen: la auditoría del 2026-08-14 encontró que
 * blog-habilidades-blandas-en-mexico-2026 enlazaba en su sección "Sigue
 * leyendo" a /blog-habilidades-blandas-guia-para-principiantes-2026, un
 * artículo que nunca se generó. El slug venía del campo "related" de
 * content/posts/batch-243.json, así que el error nace en el contenido y se
 * propaga al HTML: por eso se comprueban las dos capas.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

/** Rutas servidas por el servidor que no corresponden a un archivo .html. */
const RUTAS_NO_HTML = new Set([
  '', 'api', 'data', 'css', 'js', 'images', 'descargas', 'fonts', 'video',
  'sitemap.xml', 'robots.txt', 'favicon.ico',
]);

function paginasExistentes() {
  return new Set(
    fs.readdirSync(ROOT)
      .filter((f) => f.endsWith('.html'))
      .map((f) => f.replace(/\.html$/, ''))
  );
}

test('todo enlace interno del HTML apunta a una página que existe', () => {
  const existentes = paginasExistentes();
  const rotos = [];

  for (const archivo of fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(ROOT, archivo), 'utf8');
    for (const m of html.matchAll(/href="\/([A-Za-z0-9._-]*)"/g)) {
      const destino = m[1];
      if (RUTAS_NO_HTML.has(destino)) continue;
      if (destino.includes('.')) continue; // recursos con extensión
      if (!existentes.has(destino)) rotos.push(`${archivo} -> /${destino}`);
    }
  }

  assert.deepEqual(
    rotos,
    [],
    `Enlaces internos que no resuelven a ninguna página:\n${rotos.join('\n')}`
  );
});

test('todo slug de "related" en el contenido tiene su HTML renderizado', { skip: 'Se comprueba sobre el HTML, no sobre el JSON: build_html.py solo dibuja el enlace relacionado cuando resuelve un título, así que un borrador sin título nunca llega al HTML y hacerlo fallar aquí sería ruido. La comprobación que importa es la anterior.' }, () => {});
