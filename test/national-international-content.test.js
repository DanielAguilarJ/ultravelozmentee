'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const PLAN_REL = 'reports/seo/editorial-plan-national-international.json';
const CONTENT_REL = 'content/posts/batch-national-international-01.json';
const PLAN_FILES = [
  'reports/seo/editorial-plan-60-posts.json',
  'reports/seo/editorial-plan-500-posts.json',
  PLAN_REL,
];

const EXPECTED = [
  {
    id: 1001,
    slug: 'ejercicios-lectura-rapida-comprension',
    keyword: 'ejercicios de lectura rápida',
    courseUrl: '/fotolectura',
  },
  {
    id: 1002,
    slug: 'ejercicios-soroban-principiantes',
    keyword: 'ejercicios de soroban',
    courseUrl: '/mathekids',
  },
  {
    id: 1003,
    slug: 'primer-lenguaje-programacion-ninos',
    keyword: 'primer lenguaje de programación para niños',
    courseUrl: '/robotics',
  },
  {
    id: 1004,
    slug: 'comprension-lectora-primaria-por-grados',
    keyword: 'comprensión lectora por grados de primaria',
    courseUrl: '/lectoescritura',
  },
  {
    id: 1005,
    slug: 'tecnicas-estudio-secundaria',
    keyword: 'técnicas de estudio para secundaria',
    courseUrl: '/memoria-prodigiosa',
  },
];

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function requireSources() {
  assert.ok(fs.existsSync(path.join(ROOT, PLAN_REL)), `falta ${PLAN_REL}`);
  assert.ok(fs.existsSync(path.join(ROOT, CONTENT_REL)), `falta ${CONTENT_REL}`);
  return {
    plan: readJson(PLAN_REL).posts,
    content: readJson(CONTENT_REL),
  };
}

function proseWords(post) {
  const chunks = [post.description, post.quick_answer, ...(post.lead || [])];
  for (const section of post.sections || []) {
    chunks.push(section.heading, ...(section.paragraphs || []), ...(section.bullets || []), ...(section.steps || []));
  }
  for (const item of post.faq || []) chunks.push(item.question, item.answer);
  chunks.push(post.cta?.heading, post.cta?.text);
  return chunks.filter(Boolean).join(' ').trim().split(/\s+/).length;
}

function assertUnique(items, key, label) {
  const seen = new Map();
  const duplicates = [];
  for (const item of items) {
    const value = item[key];
    if (value == null || value === '') continue;
    if (seen.has(value)) duplicates.push(`${value} (${seen.get(value)}, ${item.id})`);
    else seen.set(value, item.id);
  }
  assert.deepEqual(duplicates, [], `${label} duplicados: ${duplicates.join(', ')}`);
}

test('el lote investigado declara exactamente las cinco intenciones aprobadas', () => {
  const { plan, content } = requireSources();
  assert.deepEqual(plan.map(({ id, slug, primary_keyword, course_url }) => ({
    id,
    slug,
    keyword: primary_keyword,
    courseUrl: course_url,
  })), EXPECTED);
  assert.deepEqual(content.map(({ id, slug }) => ({ id, slug })), EXPECTED.map(({ id, slug }) => ({ id, slug })));
});

test('los metadatos del plan son completos, verificables y apuntan a recursos locales', () => {
  const { plan } = requireSources();
  for (const meta of plan) {
    for (const field of ['title', 'primary_keyword', 'cluster', 'category', 'intent', 'angle', 'course_name', 'course_url', 'image', 'icon', 'evidence', 'publication_date', 'status']) {
      assert.ok(meta[field], `${meta.slug}: falta ${field}`);
    }
    const expectedCourseName = {
      '/fotolectura': 'Fotolectura',
      '/mathekids': 'MatheKids',
      '/robotics': 'Robotics Code',
      '/lectoescritura': 'Lectoescritura',
      '/memoria-prodigiosa': 'Memoria Prodigiosa',
    }[meta.course_url];
    assert.equal(meta.course_name, expectedCourseName, `${meta.slug}: nombre de curso incoherente`);
    if (meta.course_url === '/lectoescritura') assert.equal(meta.icon, 'fa-home');
    assert.match(meta.evidence, /Semrush MX/i, `${meta.slug}: falta la fuente de volumen México`);
    assert.match(meta.evidence, /Autocomplete|GSC/i, `${meta.slug}: falta la segunda señal de demanda`);
    assert.match(meta.publication_date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(fs.existsSync(path.join(ROOT, meta.image)), `${meta.slug}: imagen inexistente ${meta.image}`);
    assert.ok(fs.existsSync(path.join(ROOT, `${meta.course_url.slice(1)}.html`)), `${meta.slug}: destino inexistente ${meta.course_url}`);
  }
});

test('IDs, slugs y keywords primarias del lote no colisionan con otros planes', () => {
  const { plan } = requireSources();
  const existing = PLAN_FILES
    .filter(rel => rel !== PLAN_REL)
    .flatMap(rel => readJson(rel).posts);

  for (const [key, label] of [
    ['id', 'IDs'],
    ['slug', 'slugs'],
    ['primary_keyword', 'keywords primarias'],
  ]) {
    assertUnique(plan, key, `${label} del lote`);
    const owners = new Map();
    for (const item of existing) {
      if (item[key] != null && item[key] !== '' && !owners.has(item[key])) owners.set(item[key], item.id);
    }
    const collisions = plan
      .filter(item => owners.has(item[key]))
      .map(item => `${item[key]} (${owners.get(item[key])}, ${item.id})`);
    assert.deepEqual(collisions, [], `${label} del lote ya presentes: ${collisions.join(', ')}`);
  }
});

test('cada pieza tiene profundidad editorial, FAQ, fuentes e internal linking propios', () => {
  const { content } = requireSources();
  const plannedSlugs = new Set(PLAN_FILES.flatMap(rel => readJson(rel).posts).map(post => post.slug));

  for (const post of content) {
    assert.ok(proseWords(post) >= 900, `${post.slug}: solo ${proseWords(post)} palabras editoriales`);
    assert.ok(post.sections.length >= 6, `${post.slug}: secciones insuficientes`);
    assert.ok(post.faq.length >= 4, `${post.slug}: FAQ insuficiente`);
    assert.ok(post.sources.length >= 2, `${post.slug}: fuentes insuficientes`);
    assert.ok(post.related.length >= 3, `${post.slug}: enlaces relacionados insuficientes`);
    assert.equal(new Set(post.related).size, post.related.length, `${post.slug}: enlaces relacionados duplicados`);
    assert.ok(!post.related.includes(post.slug), `${post.slug}: autoenlace relacionado`);
    for (const related of post.related) {
      assert.ok(plannedSlugs.has(related), `${post.slug}: related desconocido ${related}`);
    }
    assert.doesNotMatch(JSON.stringify(post), /garantiza(?:do)?|100\s*%|resultado asegurado/i, `${post.slug}: claim absoluto`);
  }
});

test('los generadores y la prueba de CTA cargan el nuevo plan', () => {
  requireSources();
  for (const rel of [
    'tools/seo_content/build_html.py',
    'tools/seo_content/build_blog_index.py',
    'test/cta-anchors.test.js',
  ]) {
    const source = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.match(source, /editorial-plan-national-international\.json/, `${rel}: no carga el plan nuevo`);
  }
});

test('los cinco HTML generados conservan canonical, FAQ visible/schema y CTA correcto', () => {
  const { plan, content } = requireSources();
  const contentById = new Map(content.map(post => [post.id, post]));

  for (const meta of plan) {
    const file = path.join(ROOT, meta.filename);
    assert.ok(fs.existsSync(file), `falta HTML generado ${meta.filename}`);
    const html = fs.readFileSync(file, 'utf8');
    const document = new JSDOM(html).window.document;
    const post = contentById.get(meta.id);

    assert.equal(document.querySelector('link[rel="canonical"]')?.href, `https://ultravelozmente.com/blog-${meta.slug}`);
    assert.equal(document.querySelector('h1')?.textContent.trim(), meta.title);
    assert.equal(document.querySelector('.blog-cta-box a.btn-primary')?.getAttribute('href'), meta.course_url);
    const expectedMagnet = {
      '/fotolectura': 'guia-tecnicas-de-estudio',
      '/mathekids': 'guia-estimulacion-temprana',
      '/robotics': 'guia-robotica-educativa-en-casa',
      '/lectoescritura': 'guia-lectoescritura-en-casa',
      '/memoria-prodigiosa': 'guia-tecnicas-de-estudio',
    }[meta.course_url];
    assert.equal(document.querySelector('form[data-lead-magnet]')?.dataset.resource, expectedMagnet);
    assert.ok(document.querySelector('script[src="js/lead-capture.js?v=20260814"]'), `${meta.slug}: script de captura desactualizado`);
    assert.equal(document.querySelectorAll('.seo-faq-item').length, post.faq.length);

    const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map(node => JSON.parse(node.textContent));
    const graph = schemas.flatMap(schema => schema['@graph'] || [schema]);
    const faq = graph.find(node => node['@type'] === 'FAQPage');
    assert.ok(faq, `${meta.slug}: falta FAQPage`);
    assert.deepEqual(faq.mainEntity.map(item => item.name), post.faq.map(item => item.question));
  }
});

test('las fuentes editoriales excluyen URLs verificadas como no disponibles', () => {
  const { content } = requireSources();
  const unavailableUrls = new Set([
    'https://ligaabaco.com/que-es-el-soroban/',
    'https://doi.org/10.1016/0010-0277(77)90011-3',
    'https://www.cambridgeinternational.org/support-and-training-for-schools/teaching-cambridge-at-your-school/study-skills/',
  ]);

  for (const post of content) {
    for (const source of post.sources) {
      assert.ok(!unavailableUrls.has(source.url), `${post.slug}: fuente no disponible ${source.url}`);
    }
  }
});

test('los generadores preservan mtime cuando el contenido no cambia', () => {
  const { execFileSync } = require('node:child_process');
  const generatedFiles = [
    ...fs.readdirSync(ROOT).filter(name => /^blog-.*\.html$/.test(name)),
    'data/posts.json',
  ];
  const mtimesBefore = new Map(generatedFiles.map(rel => [
    rel,
    fs.statSync(path.join(ROOT, rel), { bigint: true }).mtimeNs,
  ]));

  for (const script of [
    'tools/seo_content/build_html.py',
    'tools/seo_content/build_blog_index.py',
  ]) {
    execFileSync('python3', [script], { cwd: ROOT, stdio: 'pipe' });
  }

  for (const [rel, mtimeBefore] of mtimesBefore) {
    const mtimeAfter = fs.statSync(path.join(ROOT, rel), { bigint: true }).mtimeNs;
    assert.equal(mtimeAfter, mtimeBefore, `${rel}: mtime cambió sin modificar contenido`);
  }
});

test('todo cross-sell entre CTA del artículo y CTA del documento queda declarado', () => {
  const { plan } = requireSources();
  const catalogData = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'tools/lead_magnets/catalog.json'),
    'utf8',
  ));
  const magnets = catalogData.magnets;
  const declarations = catalogData.cross_sell_exceptions?.['national-international-01'] || {};
  const mismatches = [];

  for (const article of plan) {
    const html = fs.readFileSync(path.join(ROOT, article.filename), 'utf8');
    const document = new JSDOM(html).window.document;
    const magnetSlug = document.querySelector('form[data-lead-magnet]')?.dataset.resource;
    const articleCourseUrl = document.querySelector('.blog-cta-box a.btn-primary')?.getAttribute('href');
    assert.ok(magnets[magnetSlug], `${article.slug}: lead magnet fuera del catálogo`);
    assert.equal(articleCourseUrl, article.course_url, `${article.slug}: CTA primario desactualizado`);
    const magnetCourseUrl = magnets[magnetSlug].course_url;
    if (articleCourseUrl === magnetCourseUrl) {
      assert.equal(declarations[article.slug], undefined, `${article.slug}: excepción obsoleta`);
      continue;
    }

    mismatches.push(article.slug);
    assert.deepEqual(declarations[article.slug], {
      article_course_url: articleCourseUrl,
      magnet: magnetSlug,
      magnet_course_url: magnetCourseUrl,
      reason: declarations[article.slug]?.reason,
    }, `${article.slug}: cross-sell no declarado o desactualizado`);
    assert.ok(declarations[article.slug].reason.trim(), `${article.slug}: falta justificar el cross-sell`);
  }

  assert.deepEqual(Object.keys(declarations).sort(), mismatches.sort(), 'declaraciones de cross-sell obsoletas');
});
