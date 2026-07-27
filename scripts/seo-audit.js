'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BASE = 'https://ultravelozmente.com';

const files = fs.readdirSync(ROOT)
  .filter(file => file.endsWith('.html') && !file.startsWith('google'))
  .sort();

let failed = false;

const titles = new Map();
const descriptions = new Map();

function error(file, message) {
  failed = true;
  console.error(`❌ ${file}: ${message}`);
}

function warning(file, message) {
  console.warn(`⚠️ ${file}: ${message}`);
}

function count(html, regex) {
  return (html.match(regex) || []).length;
}

function first(html, regex) {
  return html.match(regex)?.[1]?.trim() || '';
}

for (const file of files) {
  const html = fs.readFileSync(
    path.join(ROOT, file),
    'utf8'
  );

  const is404 = file === '404.html';
  const expectedCanonical = file === 'index.html'
    ? `${BASE}/`
    : `${BASE}/${file.replace(/\.html$/i, '')}`;

  const title = first(
    html,
    /<title\b[^>]*>([\s\S]*?)<\/title>/i
  );

  const description = first(
    html,
    /<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i
  ) || first(
    html,
    /<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i
  );

  const canonical = first(
    html,
    /<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i
  ) || first(
    html,
    /<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i
  );

  const h1Count = count(html, /<h1\b/gi);
  const generatedCount = count(
    html,
    /<!-- SEO:GENERATED -->/gi
  );

  if (!title) {
    error(file, 'falta title');
  }

  if (!description) {
    error(file, 'falta meta description');
  }

  if (h1Count !== 1) {
    error(file, `tiene ${h1Count} etiquetas H1`);
  }

  if (!is404) {
    if (generatedCount !== 1) {
      error(
        file,
        `tiene ${generatedCount} bloques SEO:GENERATED`
      );
    }

    if (canonical !== expectedCanonical) {
      error(
        file,
        `canonical incorrecta: ${canonical || 'ausente'}`
      );
    }
  }

  if (is404 && !/noindex/i.test(html)) {
    error(file, '404 debe contener noindex');
  }

  if (
    /href\s*=\s*["'](?:\/|\.\/|\.\.\/)?[^"']+\.html(?:[?#][^"']*)?["']/i
      .test(html)
  ) {
    error(file, 'conserva enlaces internos .html');
  }

  if (
    /rel=["']canonical["'][^>]*href=["'][^"']+\.html/i
      .test(html)
  ) {
    error(file, 'canonical contiene .html');
  }

  const schemas = [
    ...html.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    )
  ];

  for (const schema of schemas) {
    try {
      JSON.parse(schema[1].trim());
    } catch (err) {
      error(
        file,
        `JSON-LD inválido: ${err.message}`
      );
    }
  }

  if (title) {
    if (titles.has(title)) {
      error(
        file,
        `title duplicado con ${titles.get(title)}`
      );
    } else {
      titles.set(title, file);
    }
  }

  if (description) {
    if (descriptions.has(description)) {
      error(
        file,
        `description duplicada con ${descriptions.get(description)}`
      );
    } else {
      descriptions.set(description, file);
    }
  }

  if (
    file === 'comipems.html' &&
    /examen único|128 reactivos|3 hrs|comipems 2026/i
      .test(html)
  ) {
    error(
      file,
      'conserva información potencialmente obsoleta'
    );
  }

  const strongClaims = [
    /97%\s*(?:de\s*)?(?:tasa de )?éxito/i,
    /4\.9\/5/i,
    /2[,.]?847 reseñas/i,
    /resultados desde la primera sesión/i,
    /beneficios educativos comprobados/i,
    /reconocidos en.*forbes/i
  ];

  for (const claim of strongClaims) {
    if (claim.test(html)) {
      warning(
        file,
        `claim que necesita evidencia: ${claim}`
      );
    }
  }
}

if (failed) {
  console.error('\n⛔ La auditoría SEO encontró errores.');
  process.exit(1);
}

console.log(
  `\n✅ Auditoría SEO correcta: ${files.length} archivos revisados.`
);
