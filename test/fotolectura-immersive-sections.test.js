'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'fotolectura.html'), 'utf8');
const document = new JSDOM(html).window.document;
const styles = [...document.querySelectorAll('style')]
  .map(style => style.textContent)
  .join('\n');
const scripts = [...document.querySelectorAll('script:not([src])')]
  .map(script => script.textContent)
  .join('\n');

function text(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function assertTabs(rootSelector, expectedCount) {
  const root = document.querySelector(rootSelector);
  assert.ok(root, `falta ${rootSelector}`);
  assert.equal(root.getAttribute('data-fx-tabs'), '', `${rootSelector} no declara progressive enhancement`);

  const tablist = root.querySelector('[role="tablist"]');
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const panels = [...root.querySelectorAll('[role="tabpanel"]')];
  assert.equal(tabs.length, expectedCount, `${rootSelector} tiene un número incorrecto de controles`);
  assert.equal(panels.length, expectedCount, `${rootSelector} tiene un número incorrecto de paneles`);

  tabs.forEach((tab, index) => {
    assert.equal(tab.getAttribute('aria-controls'), panels[index].id);
    assert.ok(tab.id, `el control ${index + 1} de ${rootSelector} no tiene id`);
    assert.equal(panels[index].getAttribute('aria-labelledby'), tab.id);
  });

  // Sin JavaScript todo el contenido sigue disponible; el script oculta sólo al mejorar el componente.
  panels.forEach(panel => {
    assert.equal(panel.hasAttribute('hidden'), false, `${panel.id} rompe el fallback sin JS`);
    assert.equal(panel.hasAttribute('inert'), false, `${panel.id} rompe el fallback sin JS`);
  });
}

test('convierte los problemas de lectura en un diagnóstico visual accesible', () => {
  const section = document.querySelector('#como-elegir');
  assert.ok(section);
  assert.ok(section.querySelector('.fx-diagnostic'), 'falta la composición de diagnóstico');
  assert.equal(section.querySelector('.fx-method-grid'), null, 'sigue reutilizando la cuadrícula genérica');
  assertTabs('#fxDiagnostic', 3);

  const copy = text(section);
  for (const idea of [
    'palabra por palabra',
    'campo de lectura estrecho',
    'distracción',
    'regresiones',
    'ritmo único',
    'leer más rápido sin perder comprensión',
  ]) {
    assert.match(copy, new RegExp(idea, 'i'), `falta el diagnóstico: ${idea}`);
  }
  assert.equal(section.querySelectorAll('.fx-reading-visual').length, 3);
});

test('presenta la operación del curso como un tablero de ritmo comprensible', () => {
  const section = document.querySelector('#datos-curso');
  assert.ok(section.querySelector('.fx-rhythm-board'), 'falta el tablero de ritmo');
  assert.equal(section.querySelector('.fx-stats-row'), null, 'sigue usando la franja plana anterior');

  const copy = text(section);
  for (const fact of [/4, 6 o 12 meses/i, /2 horas/i, /3 × 10 min/i, /horario flexible/i]) {
    assert.match(copy, fact, `falta el dato operativo ${fact}`);
  }

  assert.equal(section.querySelectorAll('.fx-route-option').length, 3);
  assert.equal(section.querySelectorAll('.fx-practice-day').length, 7);
  assert.equal(section.querySelectorAll('.fx-practice-mark').length, 21);
});

test('transforma la metodología en un laboratorio de lectura explorable', () => {
  const section = document.querySelector('#metodologia');
  assert.ok(section.querySelector('.fx-method-lab'), 'falta el laboratorio');
  assert.equal(section.querySelector('.fx-method-grid'), null, 'sigue usando tarjetas genéricas');
  assertTabs('#fxMethodLab', 3);
  assert.equal(section.querySelectorAll('.fx-reader-sheet').length, 3);

  const copy = text(section);
  for (const idea of [
    'curso de lectura rápida y comprensión',
    'Percepción visual',
    'Comprensión y retención',
    'Lectura inteligente',
    'Lectura Integral',
    'Rastreo',
    'Flexibilidad',
  ]) {
    assert.match(copy, new RegExp(idea, 'i'), `falta el concepto metodológico: ${idea}`);
  }
});

test('hace explorables las seis capacidades sin convertirlas en promesas', () => {
  const section = document.querySelector('#evidencia');
  assert.ok(section.querySelector('.fx-capability-map'), 'falta el mapa de capacidades');
  assert.equal(section.querySelector('.fx-method-grid'), null, 'sigue usando tarjetas genéricas');
  assertTabs('#fxCapabilityMap', 6);

  const labels = [...section.querySelectorAll('[role="tab"]')].map(text).join(' ');
  for (const capability of [
    'Comprensión y retención',
    'Análisis y síntesis',
    'Concentración y atención',
    'Lectura crítica',
    'Gramática y tecnicismos',
    'Lenguaje icónico y pragmático',
  ]) {
    assert.match(labels, new RegExp(capability, 'i'), `falta la capacidad: ${capability}`);
  }
  assert.match(text(section), /no sustituye la lectura profunda/i);
});

test('diferencia encaje, base de entrada y límite responsable', () => {
  const section = document.querySelector('#para-quien');
  assert.ok(section.querySelector('.fx-fit-board'), 'falta la matriz de encaje');
  assert.equal(section.querySelector('.fx-habits'), null, 'sigue usando la composición anterior');
  assert.equal(section.querySelectorAll('.fx-fit-card').length, 3);

  const copy = text(section);
  assert.match(copy, /adolescentes y adultos/i);
  assert.match(copy, /lectura comprensiva convencional consolidada/i);
  assert.match(copy, /dificultad visual o de lectura[^.]{0,140}especialista/i);
});

test('convierte el temario en cinco módulos nativos y conserva las herramientas', () => {
  const section = document.querySelector('#programa');
  const modules = [...section.querySelectorAll('details.fx-module')];
  assert.equal(modules.length, 5);
  assert.equal(modules.filter(module => module.open).length, 1, 'debe iniciar con un solo módulo abierto');
  assert.equal(section.querySelector('.fx-agenda'), null, 'sigue usando la agenda estática anterior');
  assert.ok(section.querySelector('.fx-practice-kit'), 'falta el panel de práctica');

  const copy = text(section);
  for (const topic of [
    'Percepción visual y campo de lectura',
    'Comprensión, retención y atención',
    'Lectura Integral',
    'Rastreo',
    'Flexibilidad',
    '3 prácticas diarias de 10 minutos',
    'máximo de 7 participantes',
    '25 libros en 6 meses',
  ]) {
    assert.match(copy, new RegExp(topic, 'i'), `falta en el programa: ${topic}`);
  }
});

test('da identidad propia a medición, recursos y FAQ', () => {
  const results = document.querySelector('#resultados-realistas');
  const resources = document.querySelector('#recursos');
  const faq = document.querySelector('#faq');

  assert.ok(results.querySelector('.fx-progress-board'));
  assert.equal(results.querySelectorAll('.fx-progress-step').length, 3);
  assert.equal(results.querySelector('.fx-method-grid'), null);

  assert.ok(resources.querySelector('.fx-resource-grid'));
  assert.equal(resources.querySelectorAll('.fx-resource-card').length, 3);
  assert.equal(resources.querySelector('.fx-method-grid'), null);

  assert.ok(faq.querySelector('.fx-faq-intro'), 'falta jerarquía editorial en FAQ');
  assert.equal(faq.querySelectorAll('details.seo-faq-item').length, 10);
});

test('la mejora de tabs se activa con teclado y conserva el fallback estático', () => {
  assert.match(scripts, /\[data-fx-tabs\]/);
  assert.match(scripts, /aria-selected/);
  assert.match(scripts, /setAttribute\(['"]tabindex['"]/);
  assert.match(scripts, /toggleAttribute\(['"]inert['"]/);
  assert.match(scripts, /\.hidden\s*=/);
  for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End']) {
    assert.match(scripts, new RegExp(key), `falta soporte de teclado para ${key}`);
  }
});

test('los componentes nuevos tienen responsive y movimiento reducido propios', () => {
  for (const selector of [
    '.fx-diagnostic',
    '.fx-rhythm-board',
    '.fx-method-lab',
    '.fx-capability-map',
    '.fx-fit-board',
    '.fx-program-explorer',
    '.fx-progress-board',
    '.fx-resource-grid',
  ]) {
    assert.match(styles, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(styles, /@media\s*\(max-width:\s*900px\)[\s\S]*\.fx-diagnostic/);
  assert.match(styles, /@media\s*\(max-width:\s*520px\)[\s\S]*\.fx-rhythm-board/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.fx-tabs-panel/);
});

test('refuerza intención orgánica sin añadir modalidades ni claims externos', () => {
  const upgraded = [
    '#como-elegir',
    '#datos-curso',
    '#metodologia',
    '#evidencia',
    '#para-quien',
    '#programa',
    '#resultados-realistas',
    '#recursos',
  ].map(selector => text(document.querySelector(selector))).join(' ');

  assert.match(upgraded, /Fotolectura/i);
  assert.match(upgraded, /curso de lectura rápida y comprensión/i);
  assert.match(upgraded, /leer más rápido sin perder comprensión/i);
  assert.match(upgraded, /temario/i);

  for (const unsupported of [
    /curso gratis/i,
    /curso online/i,
    /curso presencial/i,
    /duplica(?:r|rás)? o triplica(?:r|rás)?/i,
    /memoria fotográfica garantizada/i,
    /300 páginas en 30 minutos/i,
  ]) {
    assert.doesNotMatch(upgraded, unsupported, `se añadió un claim o modalidad no respaldada: ${unsupported}`);
  }
});
