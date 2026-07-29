'use strict';

/* ══════════════════════════════════════════════════════════════════
   Qué se sirve y qué se bloquea.

   Este archivo existe por un bug concreto: PRIVATE_EXTENSION estaba
   escrito como `jsx?`, y el "?" hace opcional la "x". El patrón casaba
   con ".js", así que el servidor devolvía 404 a TODOS los scripts del
   sitio: navbar, booking, tracking.

   Efecto visible para el usuario: al pulsar "Siguiente" en el
   formulario de agendado, la página recargaba y volvía al inicio,
   porque el script que llama a preventDefault nunca cargaba. Sin
   booking.min.js tampoco existía window.goToStep2, así que ninguna
   cita podía agendarse en todo el sitio.

   La suite ataca el regex directamente en lugar de levantar el
   servidor: es la unidad donde vivía el defecto, y así el test es
   instantáneo y sin puertos.
   ══════════════════════════════════════════════════════════════════ */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SERVER = fs.readFileSync(
    path.join(__dirname, '..', 'server.js'),
    'utf8'
);

/** Extrae el regex real de server.js: si alguien lo edita, el test
 *  evalúa la versión nueva y no una copia que se quedó vieja. */
function extractPrivateExtension() {
    const match = /const PRIVATE_EXTENSION\s*=\s*(\/[^\n]+\/[a-z]*);/.exec(SERVER);

    assert.ok(match, 'no se encontró PRIVATE_EXTENSION en server.js');

    /* eslint-disable-next-line no-eval */
    return eval(match[1]);
}

function extractPrivateFiles() {
    const block = /const PRIVATE_FILES = new Set\(\[([\s\S]*?)\]\);/.exec(SERVER);

    assert.ok(block, 'no se encontró PRIVATE_FILES en server.js');

    return new Set(
        [...block[1].matchAll(/'([^']+)'/g)].map(m => m[1])
    );
}

const PRIVATE_EXTENSION = extractPrivateExtension();
const PRIVATE_FILES = extractPrivateFiles();

/* ── Lo que el sitio necesita servir ─────────────────────────── */

test('los scripts del sitio NO se bloquean por extensión', () => {
    /* Este es el caso que rompía el formulario de agendado. */
    const scripts = [
        '/js/booking.min.js',
        '/js/booking.js',
        '/js/navbar.min.js',
        '/js/tracking.min.js',
        '/js/param-builder-client.min.js',
        '/js/regularizacion-2026.js',
        '/js/lectoescritura-adapter.js',
        '/js/lecto-demo.js',
        '/js/main.min.js'
    ];

    scripts.forEach(ruta => {
        assert.equal(
            PRIVATE_EXTENSION.test(ruta),
            false,
            ruta + ' debe servirse: sin él la página queda sin JavaScript'
        );
    });
});

test('el CSS y las imágenes no se bloquean', () => {
    [
        '/css/styles.min.css',
        '/css/regularizacion-2026.css',
        '/images/logo.svg',
        '/images/fl-hero-brain.webp',
        '/worldbrain-logo.webp'
    ].forEach(ruta => {
        assert.equal(PRIVATE_EXTENSION.test(ruta), false, ruta);
    });
});

test('las páginas HTML no se bloquean', () => {
    ['/index.html', '/regularizacion-express.html'].forEach(ruta => {
        assert.equal(PRIVATE_EXTENSION.test(ruta), false, ruta);
    });
});

/* ── Lo que debe seguir bloqueado ────────────────────────────── */

test('el código fuente y la configuración siguen bloqueados', () => {
    const privados = [
        '/fix_founding_year.py',
        '/scripts/apply-seo.js.map',
        '/check.sh',
        '/deploy.sh',
        '/README.md',
        '/src/plantilla.njk',
        '/app/componente.tsx',
        '/app/tipos.ts',
        '/app/vista.jsx',
        '/package-lock.json.lock',
        '/config.yml',
        '/config.yaml',
        '/pyproject.toml'
    ];

    privados.forEach(ruta => {
        assert.equal(
            PRIVATE_EXTENSION.test(ruta),
            true,
            ruta + ' no debe servirse nunca'
        );
    });
});

test('.jsx se bloquea pero .js no: es la distinción que se rompió', () => {
    assert.equal(PRIVATE_EXTENSION.test('/app/vista.jsx'), true, '.jsx bloqueado');
    assert.equal(PRIVATE_EXTENSION.test('/js/booking.js'), false, '.js servido');
});

test('.ts y .tsx se bloquean', () => {
    assert.equal(PRIVATE_EXTENSION.test('/app/a.ts'), true);
    assert.equal(PRIVATE_EXTENSION.test('/app/a.tsx'), true);
});

/* ── Los .js privados se bloquean por nombre, no por extensión ── */

test('los módulos de servidor están en PRIVATE_FILES uno por uno', () => {
    /* Contienen secretos o lógica de servidor. Como .js ya se sirve,
       la única defensa es la lista explícita: si alguien añade un
       módulo nuevo y olvida registrarlo, queda expuesto. */
    ['/server.js', '/js/capi.js', '/js/leads.js', '/js/env-file.js', '/.eleventy.js']
        .forEach(ruta => {
            assert.ok(
                PRIVATE_FILES.has(ruta),
                ruta + ' debe estar en PRIVATE_FILES: .js ya no se bloquea por extensión'
            );
        });
});

test('todo módulo que server.js requiere localmente está protegido', () => {
    /* Barrera contra el olvido: cualquier require('./js/x') nuevo
       tiene que aparecer en PRIVATE_FILES. */
    const requires = [...SERVER.matchAll(/require\('(\.\/[^']+)'\)/g)]
        .map(m => m[1]);

    assert.ok(requires.length >= 2, 'se esperaban requires locales');

    requires.forEach(rel => {
        const ruta = rel.replace(/^\./, '') +
            (rel.endsWith('.js') ? '' : '.js');

        assert.ok(
            PRIVATE_FILES.has(ruta),
            'server.js requiere ' + rel + ' pero ' + ruta +
            ' no está en PRIVATE_FILES: quedaría expuesto por HTTP'
        );
    });
});

/* ── El directorio de leads ──────────────────────────────────── */

test('/var/ está entre los prefijos privados', () => {
    const block = /const PRIVATE_PREFIXES = \[([\s\S]*?)\];/.exec(SERVER);

    assert.ok(block, 'no se encontró PRIVATE_PREFIXES');

    const prefijos = [...block[1].matchAll(/'([^']+)'/g)].map(m => m[1]);

    assert.ok(prefijos.includes('/var/'),
        'var/ guarda nombres y teléfonos: nunca por HTTP');
    assert.ok(prefijos.includes('/data/'));
});
