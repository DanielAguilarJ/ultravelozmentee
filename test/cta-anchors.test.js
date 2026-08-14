'use strict';

/* ══════════════════════════════════════════════════════════════════
   ANCLAJE INTERNO DE LOS CTA

   Dos invariantes, cada uno por un defecto real encontrado con datos de
   Search Console:

   1. COHERENCIA. 25 artículos tenían un `cta.label` que nombraba un
      curso DISTINTO al de su enlace: «Conocer el curso MatheKids»
      apuntando a /robotics, los ids 64 y 65 intercambiados entre sí, y
      varios de tecnologia-educativa diciendo «Robotics Code» mientras
      enlazaban a /mathekids. El botón prometía un curso y llevaba a
      otro: el usuario rebota y, para Google, el ancla no describe el
      destino.

   2. DIVERSIDAD. Los 270 enlaces contextuales del blog usaban el mismo
      texto de ancla —el nombre de marca—. El ancla es señal de
      relevancia: repetir la marca le enseña a Google que la página
      trata de «Robotics Code», que nadie busca, en vez de «curso de
      robótica para niños», que sí se busca y donde la página estaba en
      posición 33-60.

      El arreglo NO es poner la keyword exacta en todos: un perfil con
      100 % de coincidencia exacta es el patrón que Google trata como
      manipulación. Se comprueba que haya reparto, y que la marca siga
      presente.
   ══════════════════════════════════════════════════════════════════ */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PLANS = [
    'reports/seo/editorial-plan-60-posts.json',
    'reports/seo/editorial-plan-500-posts.json'
];

/** course_url → course_name, leído de los planes editoriales. */
function courseNames() {
    const out = {};
    for (const rel of PLANS) {
        const full = path.join(ROOT, rel);
        if (!fs.existsSync(full)) continue;
        for (const post of JSON.parse(fs.readFileSync(full, 'utf8')).posts) {
            if (post.course_url && post.course_name && !out[post.course_url]) {
                out[post.course_url] = post.course_name;
            }
        }
    }
    return out;
}

/** Todos los CTA contextuales del blog: [{file, url, anchor}]. */
function ctaLinks() {
    const out = [];
    const files = fs.readdirSync(ROOT)
        .filter(f => f.startsWith('blog-') && f.endsWith('.html') && f !== 'blog-index.html');

    for (const file of files) {
        const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
        const re = /href="(\/[a-z0-9-]+)" class="btn-primary"[^>]*>\s*([^<]+?)\s*<i /g;
        let m;
        while ((m = re.exec(html)) !== null) {
            out.push({ file, url: m[1], anchor: m[2].trim() });
        }
    }
    return out;
}

const NAMES = courseNames();
const LINKS = ctaLinks();

test('se encontraron CTA contextuales que revisar', () => {
    assert.ok(LINKS.length > 100, `solo ${LINKS.length} CTA encontrados`);
    assert.ok(Object.keys(NAMES).length > 5, 'no se pudo leer el mapa de cursos');
});

test('ningún ancla nombra un curso distinto al de su enlace', () => {
    const malos = [];

    for (const { file, url, anchor } of LINKS) {
        const destino = NAMES[url] || '';
        for (const [otroUrl, otroNombre] of Object.entries(NAMES)) {
            if (otroUrl === url) continue;
            // Un destino con dos cursos ("Homeschool y Lectoescritura")
            // puede nombrar legítimamente uno de los dos.
            if (destino.includes(otroNombre)) continue;
            if (anchor.includes(otroNombre)) {
                malos.push(`${file}: "${anchor}" enlaza a ${url} (${destino})`);
            }
        }
    }

    assert.deepStrictEqual(malos, [], 'anclas que prometen otro curso');
});

test('el anclaje del curso comercial de robótica está diversificado', () => {
    /* /robotics es la página comercial con más impresiones y la que
       estaba en posición 33-60 para sus términos de dinero. */
    const robotics = LINKS.filter(l => l.url === '/robotics');
    assert.ok(robotics.length >= 10, `solo ${robotics.length} CTA a /robotics`);

    const variantes = new Set(robotics.map(l => l.anchor));
    assert.ok(
        variantes.size >= 4,
        `solo ${variantes.size} variante(s) de ancla: el reparto colapsó a la marca`
    );

    const conMarca = robotics.filter(l => l.anchor.includes('Robotics Code')).length;
    const ratio = conMarca / robotics.length;

    // La marca debe seguir presente: un perfil sin marca alguna es tan
    // artificial como uno que solo tiene marca.
    assert.ok(ratio > 0, 'ningún ancla conserva el nombre de marca');
    // Y no debe volver a dominarlo todo. El umbral está calibrado contra
    // los dos estados reales, no elegido a ojo: con el reparto sano la
    // marca queda en ~0,29 y al colapsarlo (BRAND_EVERY = 1) sube a
    // ~0,74, así que 0,5 los separa. Un 0,75 no discriminaba —se
    // comprobó por inversión y la prueba pasaba igual—.
    assert.ok(
        ratio < 0.5,
        `${(ratio * 100).toFixed(0)} % de las anclas son la marca: reparto insuficiente`
    );
});

test('los CTA apuntan a páginas de curso que existen', () => {
    /* Un ancla perfecta hacia una URL inexistente sigue siendo un 404. */
    const rotos = new Set();
    for (const { url } of LINKS) {
        const page = url.replace(/^\//, '') + '.html';
        if (!fs.existsSync(path.join(ROOT, page))) rotos.add(url);
    }
    assert.deepStrictEqual([...rotos], [], 'CTA hacia páginas inexistentes');
});
