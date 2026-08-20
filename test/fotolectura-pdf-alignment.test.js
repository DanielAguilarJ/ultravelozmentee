const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const LANDING_PATH = path.join(ROOT, 'fotolectura.html');
const SEO_SOURCE_PATH = path.join(ROOT, 'scripts', 'apply-seo.js');
const html = fs.readFileSync(LANDING_PATH, 'utf8');
const document = new JSDOM(html).window.document;
const seoSource = fs.readFileSync(SEO_SOURCE_PATH, 'utf8');

const EXPECTED_TITLE = 'Fotolectura: curso de lectura rápida | WorldBrain México';
const EXPECTED_DESCRIPTION = 'Fotolectura, sistema integral de lectura rápida para adolescentes y adultos: ejercicios visuales, comprensión, retención, síntesis y lectura crítica.';

function text(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function visibleText() {
  const body = document.body.cloneNode(true);
  body.querySelectorAll('script, style, template, noscript').forEach(node => node.remove());
  return text(body);
}

function jsonLdNodes() {
  return [...document.querySelectorAll('script[type="application/ld+json"]')]
    .flatMap(script => {
      const data = JSON.parse(script.textContent);
      return data['@graph'] || [data];
    });
}

function schemaNode(type) {
  return jsonLdNodes().find(node => {
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
    return types.includes(type);
  });
}

test('prioriza Fotolectura y curso de lectura rápida en metadatos y fuente SEO', () => {
  assert.equal(text(document.querySelector('title')), EXPECTED_TITLE);
  assert.equal(document.querySelector('meta[name="description"]')?.content, EXPECTED_DESCRIPTION);
  assert.equal(document.querySelector('meta[property="og:title"]')?.content, EXPECTED_TITLE);
  assert.equal(document.querySelector('meta[property="og:description"]')?.content, EXPECTED_DESCRIPTION);
  assert.equal(document.querySelector('meta[name="twitter:title"]')?.content, EXPECTED_TITLE);
  assert.equal(document.querySelector('meta[name="twitter:description"]')?.content, EXPECTED_DESCRIPTION);
  assert.equal(document.querySelector('link[rel="canonical"]')?.href, 'https://ultravelozmente.com/fotolectura');

  assert.match(seoSource, new RegExp(EXPECTED_TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(seoSource, new RegExp(EXPECTED_DESCRIPTION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('publica sin ambigüedad la operación descrita en el PDF', () => {
  const hero = text(document.querySelector('.fx-hero'));
  const facts = text(document.querySelector('#datos-curso'));

  assert.match(hero, /Fotolectura · Sistema integral de lectura/i);
  assert.match(hero, /percepción visual/i);
  assert.match(hero, /comprensión/i);
  assert.match(hero, /retención/i);
  assert.match(hero, /lectura crítica/i);

  for (const fact of [
    /4, 6 o 12 meses/i,
    /2 horas[^.]{0,60}por semana/i,
    /3[^.]{0,20}10 min[^.]{0,60}prácticas diarias/i,
    /horario flexible/i,
  ]) {
    assert.match(facts, fact, `falta el dato operativo: ${fact}`);
  }
});

test('explica los problemas del lector y las soluciones metodológicas del PDF', () => {
  const problems = text(document.querySelector('#como-elegir'));
  const method = text(document.querySelector('#metodologia'));

  for (const problem of [
    'palabra por palabra',
    'campo de lectura',
    'distracción',
    'regresiones',
    'mismo ritmo',
  ]) {
    assert.match(problems, new RegExp(problem, 'i'), `falta el problema: ${problem}`);
  }

  for (const solution of [
    'ejercicios visuales',
    'grupos de palabras',
    'ampliación progresiva',
    'comprensión y retención',
    'lectura inteligente',
  ]) {
    assert.match(method, new RegExp(solution, 'i'), `falta la solución: ${solution}`);
  }
});

test('incluye todos los beneficios trabajados sin reducir Fotolectura a velocidad', () => {
  const benefits = text(document.querySelector('#evidencia'));
  for (const benefit of [
    'comprensión',
    'retención',
    'análisis',
    'síntesis',
    'concentración',
    'atención',
    'lectura crítica',
    'gramática',
    'tecnicismos',
    'lenguaje icónico',
    'lenguaje pragmático',
  ]) {
    assert.match(benefits, new RegExp(benefit, 'i'), `falta el beneficio: ${benefit}`);
  }
});

test('el programa desarrolla Integral, Rastreo y Flexibilidad con aplicaciones concretas', () => {
  const program = text(document.querySelector('#programa'));
  for (const technique of ['Lectura Integral', 'Rastreo', 'Flexibilidad']) {
    assert.match(program, new RegExp(technique, 'i'), `falta la técnica: ${technique}`);
  }
  for (const application of [
    'resúmenes',
    'mapas mentales',
    'cuadros sinópticos',
    'ensayos',
    'síntesis',
    'códigos',
    'nombres',
    'cifras',
    'datos',
  ]) {
    assert.match(program, new RegExp(application, 'i'), `falta la aplicación: ${application}`);
  }
  assert.match(program, /reto opcional[^.]{0,100}25 libros[^.]{0,80}6 meses/i);
  assert.match(program, /ajustad[oa][^.]{0,100}(ritmo|tipo de texto|participante)/i);
});

test('Course schema refleja el temario visible y el sistema integral', () => {
  const course = schemaNode('Course');
  assert.ok(course, 'falta Course');
  assert.equal(course.name, 'Fotolectura: curso de lectura rápida');
  assert.equal(course.description, EXPECTED_DESCRIPTION);
  assert.equal(course.audience?.audienceType, 'Adolescentes y adultos');

  const expectedTeaches = [
    'Percepción visual',
    'Lectura por grupos de palabras',
    'Comprensión y retención',
    'Análisis y síntesis',
    'Lectura crítica',
    'Lectura Integral, Rastreo y Flexibilidad',
  ];
  assert.deepEqual(course.teaches, expectedTeaches);

  const expectedSyllabus = [
    'Percepción visual y campo de lectura',
    'Comprensión, retención y atención',
    'Lectura Integral',
    'Rastreo',
    'Flexibilidad',
  ];
  assert.deepEqual(course.syllabusSections.map(section => section.name), expectedSyllabus);

  const visible = visibleText();
  for (const value of [...expectedTeaches, ...expectedSyllabus]) {
    assert.match(visible, new RegExp(value, 'i'), `el schema declara contenido no visible: ${value}`);
  }
});

test('la FAQ responde duración, práctica, técnicas y variantes de búsqueda y coincide con FAQPage', () => {
  const items = [...document.querySelectorAll('#faq details.seo-faq-item')].map(item => ({
    question: text(item.querySelector('summary')),
    answer: text(item.querySelector('p')),
  }));
  const faqText = items.map(item => `${item.question} ${item.answer}`).join(' ');

  for (const topic of [
    /4, 6 o 12 meses/i,
    /2 horas[^.]{0,60}por semana/i,
    /3 prácticas diarias de 10 minutos/i,
    /Integral, Rastreo y Flexibilidad/i,
    /foto lectura/i,
    /lectura fotográfica/i,
    /lectura tridimensional/i,
  ]) {
    assert.match(faqText, topic, `falta respuesta FAQ para ${topic}`);
  }

  const faq = schemaNode('FAQPage');
  assert.ok(faq, 'falta FAQPage');
  const schemaItems = faq.mainEntity.map(item => ({
    question: text({ textContent: item.name }),
    answer: text({ textContent: item.acceptedAnswer?.text }),
  }));
  assert.deepEqual(schemaItems, items);
});

test('mantiene responsables las metas del folleto y no publica absolutos como resultados', () => {
  const visible = visibleText();
  const prohibited = [
    /300 páginas en 30 minutos/i,
    /2[,.]?500 palabras/i,
    /comprensión[^.]{0,40}100\s*%/i,
    /retención[^.]{0,40}100\s*%/i,
    /síntesis[^.]{0,40}100\s*%/i,
    /capacitar[^.]{0,80}100\s*%/i,
    /garantizamos[^.]{0,100}(comprensión|concentración|resultado)/i,
    /0[,.]33 segundos/i,
    /160\s*°/i,
  ];
  for (const claim of prohibited) {
    assert.doesNotMatch(visible, claim, `claim absoluto no contextualizado: ${claim}`);
  }
});
