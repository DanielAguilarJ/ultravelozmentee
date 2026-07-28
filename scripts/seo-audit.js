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



  const strongClaims = [
    /97%\s*(?:de\s*)?(?:tasa de )?éxito/i,
    /4\.9\/5/i,
    /2[,.]?847 reseñas/i,
    /resultados desde la primera sesión/i,
    /beneficios educativos comprobados/i,
    /reconocidos en.*forbes/i,
    /avalado por/i,
    /reconocido por/i,
    /validez oficial/i,
    /certificaci[oó]n oficial/i,
    /t[ií]tulo oficial/i,
    /garant[ií]a/i,
    /\d{1,3}%\s*(?:de\s*)?(?:aprobaci[oó]n|éxito)/i,
    /\d[\d,.]*\s*(?:graduados|alumnos graduados)/i,
    /solo hoy/i,
    /(?:d[ií]as|horas|minutos)\s*(?:restantes|para (?:terminar|que termine))/i
  ];

  for (const claim of strongClaims) {
    if (claim.test(html)) {
      warning(
        file,
        `claim que necesita evidencia: ${claim}`
      );
    }
  }

  /* Frases prohibidas: fallan la auditoria (salvo en terminos/reembolsos, tratadas como warning) */
  const forbiddenPhrases = [
    /reembolso[^.]{0,20}\+[^.]{0,10}\$?\s?(500|1,000|1000)/i,
    /devolvemos tu dinero[^.]{0,20}\+[^.]{0,10}\$?\s?(500|1,000|1000)/i,
    /garant[ií]a de aprobaci[oó]n/i,
    /(?<!no )(?<!ni )\bgarantiza\b[^.]{0,20}\bingreso\b/i,
    /resultados garantizados/i,
    /certificado oficial SEP/i,
    /100%\s*certificado/i,
    /validez oficial al 100%/i,
    /simuladores?\s+id[eé]nticos?/i,
    /200[,.]?000\s*graduados/i,
    /10[,.]?000\s*graduados/i,
    /50M\+/i,
    /10x\s*ROI/i,
    /images\.unsplash\.com/i
  ];

  const isLegalPage = file === 'terminos.html' || file === 'reembolsos.html';

  for (const phrase of forbiddenPhrases) {
    if (phrase.test(html)) {
      if (isLegalPage) {
        warning(file, `frase sensible presente (revisar contexto legal): ${phrase}`);
      } else {
        error(file, `frase prohibida encontrada: ${phrase}`);
      }
    }
  }

  /* Etiquetas <link> vacías sin rel ni href */
  const emptyLinkTags = html.match(/<link(?![^>]*\brel=)(?![^>]*\bhref=)[^>]*\/?>/gi);
  if (emptyLinkTags && emptyLinkTags.length) {
    error(file, `contiene ${emptyLinkTags.length} etiquetas <link> sin rel ni href`);
  }

  /* Imágenes: alt, dimensiones y fuentes externas no permitidas */
  const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)].map(m => m[0]);
  for (const img of imgTags) {
    const hasAlt = /\balt\s*=\s*"[^"]*"/i.test(img) || /\balt\s*=\s*'[^']*'/i.test(img);
    if (!hasAlt) {
      warning(file, `imagen sin atributo alt: ${img.slice(0, 80)}`);
    }
    if (!/\bwidth\s*=/i.test(img) || !/\bheight\s*=/i.test(img)) {
      warning(file, `imagen sin width/height: ${img.slice(0, 80)}`);
    }
    if (/images\.unsplash\.com/i.test(img)) {
      error(file, `imagen externa no permitida (unsplash): ${img.slice(0, 80)}`);
    }
  }

  /* FAQPage sin FAQ visible */
  const hasFaqSchema = /"@type"\s*:\s*"FAQPage"/i.test(html);
  const hasFaqVisible = /<!-- SEO:FAQ:START -->/.test(html) || /class="seo-faq-item"/i.test(html) || /<details\b/i.test(html);
  if (hasFaqSchema && !hasFaqVisible) {
    error(file, 'contiene FAQPage schema sin FAQ visible en el HTML');
  }

  /* Validaciones específicas por página */
  if (file === 'comipems.html') {
    if (!/ingreso a bachillerato/i.test(html)) {
      error(file, 'debe contener "ingreso a bachillerato"');
    }
    /* Se permite la pregunta del FAQ que refuta la idea de examen único */
    const withoutFaqQuestion = html.replace(/sigue siendo un examen único en 2026/gi, '');
    if (/examen\s*único/i.test(withoutFaqQuestion)) {
      error(file, 'no debe presentar COMIPEMS como "examen único"');
    }
  }

  if (file === 'admision-universitaria.html') {
    if (!/\bUNAM\b/.test(html) || !/\bIPN\b/.test(html) || !/\bUAM\b/.test(html)) {
      error(file, 'debe mencionar UNAM, IPN y UAM');
    }
  }

  if (file === 'homeschool.html' && !/instituci[oó]n emisora/i.test(html)) {
    error(file, 'debe contener "institución emisora"');
  }

  if (file === 'universidad-dominical.html' && !/WorldBrain ofrece preparaci[oó]n/i.test(html)) {
    error(file, 'debe contener "WorldBrain ofrece preparación"');
  }

  if (file === 'redaccion-ejecutiva.html' && !/Curso de Redacci[oó]n Ejecutiva y Ortograf[ií]a para Correos e Informes Profesionales/i.test(html)) {
    error(file, 'debe contener el H2 exacto de redacción ejecutiva');
  }

  if (file === 'regularizacion-express.html' && !/Programa de Regularizaci[oó]n Escolar en Matem[aá]ticas, Lectura y Ciencias/i.test(html)) {
    error(file, 'debe contener el H2 exacto de regularización express');
  }

  if (file === 'juniormath_v2.html' && /soroban/i.test(html)) {
    error(file, 'no debe contener "Soroban"');
  }

  if (file === 'mathekids.html' && !/soroban/i.test(html)) {
    error(file, 'debe contener "Soroban"');
  }

  if (file === 'alfa-cash.html' && /curso infantil|para niños|educación financiera infantil/i.test(html)) {
    error(file, 'no debe presentarse como programa infantil');
  }

  if (file === 'blog-11-jovenes-lideres-finanzas.html') {
    const article = (html.match(/<article\b[\s\S]*?<\/article>/i) || [html])[0];
    if (/href\s*=\s*["'](?:\/|\.\/)?alfa-cash/i.test(article)) {
      error(file, 'el contenido del artículo no debe enlazar a /alfa-cash');
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
