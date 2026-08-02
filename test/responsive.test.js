'use strict';

/* ══════════════════════════════════════════════════════════════════
   Adaptación a teléfono, tablet y escritorio.

   Esta suite nace de una auditoría que encontró 17 fallos reales en
   las páginas nuevas, seis de ellos graves en teléfono:

     · barras fijas al fondo por debajo del indicador del iPhone
     · enlaces #ancla aterrizando detrás de la navbar fija
     · controles de 29 a 34 px de alto, por debajo del mínimo táctil
     · :hover pegado tras tocar en iOS
     · overflow-x: hidden rompiendo position: sticky
     · anchos con 100vw provocando scroll horizontal en escritorio

   Cada aserción fija una de esas correcciones. Son reglas que "se ven
   redundantes" al leer el CSS, así que sin este archivo el siguiente
   que pase por ahí las borra.
   ══════════════════════════════════════════════════════════════════ */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

/** Hojas propias de las páginas rediseñadas. */
const HOJAS = [
    'css/universidad-dominical-2026.css',
    'css/regularizacion-2026.css',
    'css/grandes-lideres-2026.css',
    'css/alfa-cash-2026.css',
    'css/ciencia-astronomia-2026.css'
];

function leer(rel) {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

/* Extrae el contenido de un bloque @media / @supports por su cabecera. */
function bloque(css, cabecera) {
    const i = css.indexOf(cabecera);
    if (i === -1) return '';

    let nivel = 0;
    let inicio = -1;

    for (let j = i; j < css.length; j++) {
        if (css[j] === '{') {
            if (nivel === 0) inicio = j + 1;
            nivel++;
        } else if (css[j] === '}') {
            nivel--;
            if (nivel === 0) return css.slice(inicio, j);
        }
    }

    return '';
}

/* ── Área segura ─────────────────────────────────────────────── */

test('las barras fijas al fondo respetan el área segura del iPhone', () => {
    /* Sin esto la barra de conversión y el botón de WhatsApp quedan
       por debajo del indicador de inicio y no se pueden pulsar. */
    HOJAS.forEach(hoja => {
        const css = leer(hoja);

        assert.match(
            css,
            /env\(safe-area-inset-bottom\)/,
            hoja + ': falta env(safe-area-inset-bottom) en las barras fijas'
        );

        assert.match(
            css,
            /\.floating-whatsapp\s*\{[\s\S]*?env\(safe-area-inset-bottom\)/,
            hoja + ': el botón flotante de WhatsApp no respeta el área segura'
        );
    });
});

test('la barra fija reserva su altura para no tapar el pie', () => {
    HOJAS.forEach(hoja => {
        assert.match(
            leer(hoja),
            /padding-bottom:\s*calc\(\d+px \+ env\(safe-area-inset-bottom\)\)/,
            hoja + ': el body debe reservar la altura de la barra fija'
        );
    });
});

/* ── Anclas bajo la navbar fija ──────────────────────────────── */

test('los enlaces de ancla no quedan detrás de la navbar', () => {
    /* Toda la navegación interna de estas páginas son anclas. Sin
       scroll-padding-top el encabezado de destino queda oculto. */
    HOJAS.forEach(hoja => {
        const css = leer(hoja);

        assert.match(css, /scroll-padding-top/,
            hoja + ': falta scroll-padding-top');

        assert.match(css, /scroll-margin-top/,
            hoja + ': falta scroll-margin-top como refuerzo por destino');
    });
});

test('hay respaldo de scroll-padding para navegadores sin :has()', () => {
    HOJAS.forEach(hoja => {
        const css = leer(hoja);

        if (!/html:has\(/.test(css)) return;

        assert.match(
            css,
            /@supports not selector\(:has\(\*\)\)[\s\S]{0,180}scroll-padding-top/,
            hoja + ': :has() sin respaldo deja las anclas rotas donde no se soporta'
        );
    });
});

/* ── sticky y recorte lateral ────────────────────────────────── */

test('se usa overflow-x: clip, que no rompe position: sticky', () => {
    /* overflow-x: hidden convierte al body en contenedor de scroll y
       los descendientes sticky dejan de pegarse. clip recorta igual
       sin crear scrollport. */
    HOJAS.forEach(hoja => {
        const css = leer(hoja);

        assert.match(css, /overflow-x:\s*clip/,
            hoja + ': debe usar overflow-x: clip en el body');

        const respaldo = bloque(css, '@supports not (overflow-x: clip)');

        assert.match(respaldo, /overflow-x:\s*hidden/,
            hoja + ': falta el respaldo hidden para navegadores sin clip');
    });
});

test('ningún ancho se calcula con 100vw', () => {
    /* 100vw incluye el ancho de la barra de scroll en escritorio: al
       restarle el margen la cuenta se queda corta y aparece scroll
       horizontal. Se usa 100cqw o 100%. */
    HOJAS.forEach(hoja => {
        const css = leer(hoja);

        const anchos = css.match(/width:\s*[^;]*100vw[^;]*/g) || [];

        assert.deepEqual(
            anchos,
            [],
            hoja + ': ancho basado en 100vw → ' + anchos.join(' | ')
        );
    });
});

/* ── Estados táctiles ────────────────────────────────────────── */

test('los efectos de hover se neutralizan en pantallas táctiles', () => {
    /* En iOS el :hover se queda pegado después de tocar: la tarjeta
       mantiene el relieve hasta que se toca otra cosa. */
    HOJAS.forEach(hoja => {
        const css = leer(hoja);
        const guarda = bloque(css, '@media (hover: none)');

        assert.ok(
            guarda.length > 80,
            hoja + ': falta un bloque @media (hover: none) que anule los hover'
        );

        assert.match(guarda, /transform:\s*none/,
            hoja + ': el bloque táctil debe anular los transform de hover');
    });
});

test('los controles llegan al mínimo táctil de 44 px', () => {
    HOJAS.forEach(hoja => {
        const css = leer(hoja);
        const coarse = bloque(css, '@media (pointer: coarse)');

        assert.ok(
            coarse.length > 80,
            hoja + ': falta el bloque @media (pointer: coarse)'
        );

        assert.match(
            coarse,
            /min-height:\s*4[4-9]px|min-height:\s*[5-9]\dpx/,
            hoja + ': los controles deben alcanzar 44 px de alto en táctil'
        );
    });
});

test('los horarios del formulario son pulsables con el dedo', () => {
    /* Son la última acción antes de convertir: si falla el toque, se
       pierde la cita. */
    const css = leer('css/regularizacion-2026.css');
    const coarse = bloque(css, '@media (pointer: coarse)');

    assert.match(
        coarse,
        /course-time-slot[\s\S]{0,140}min-height/,
        'los horarios que inyecta booking.min.js necesitan altura táctil'
    );
});

test('se elimina el retardo de 300 ms y el destello al tocar', () => {
    HOJAS.forEach(hoja => {
        const css = leer(hoja);

        assert.match(css, /touch-action:\s*manipulation/, hoja);
        assert.match(css, /-webkit-tap-highlight-color:\s*transparent/, hoja);
    });
});

/* ── Tablet ──────────────────────────────────────────────────── */

test('existe un tramo específico para tablet', () => {
    /* Sin él, entre 720 y 1024 px las composiciones a dos columnas ya
       se habían colapsado y quedaban columnas de texto estrechas con
       mucho aire muerto al lado. */
    HOJAS.forEach(hoja => {
        assert.match(
            leer(hoja),
            /@media \(min-width:\s*721px\) and \(max-width:\s*1024px\)/,
            hoja + ': falta el tramo de tablet'
        );
    });
});

test('hay tramo para teléfono estrecho y para horizontal', () => {
    HOJAS.forEach(hoja => {
        const css = leer(hoja);

        assert.match(css, /@media \(max-width:\s*400px\)/,
            hoja + ': falta el tramo de teléfono estrecho');

        assert.match(css, /orientation:\s*landscape/,
            hoja + ': falta el ajuste para teléfono en horizontal');
    });
});

/* ── Escritorio y accesibilidad ──────────────────────────────── */

test('la tabla desplazable es accesible con teclado', () => {
    /* Un contenedor con overflow no es alcanzable por teclado si no
       recibe tabindex, así que su contenido queda inaccesible. */
    const html = leer('universidad-dominical.html');

    assert.match(
        html,
        /class="ud-table-wrap[^"]*"[^>]*tabindex="0"[^>]*role="region"/,
        'el contenedor de la tabla necesita tabindex y role=region'
    );

    assert.match(
        html,
        /aria-labelledby="tabla-rutas-cap"/,
        'la región desplazable debe tener nombre accesible'
    );
});

test('el contenedor desplazable no arrastra el scroll de la página', () => {
    const css = leer('css/universidad-dominical-2026.css');

    assert.match(css, /overscroll-behavior/,
        'falta overscroll-behavior en los contenedores con overflow-x');
});

test('iOS no infla el texto al girar el teléfono', () => {
    HOJAS.forEach(hoja => {
        assert.match(leer(hoja), /text-size-adjust:\s*100%/, hoja);
    });
});

test('hay hoja de impresión: un prospecto se imprime', () => {
    HOJAS.forEach(hoja => {
        const css = leer(hoja);
        const print = bloque(css, '@media print');

        assert.ok(print.length > 120, hoja + ': falta @media print');

        assert.match(print, /display:\s*none/,
            hoja + ': en papel deben ocultarse barras y decoración');
    });
});

test('el temario se imprime completo, sin los filtros aplicados', () => {
    /* Es lo que la gente guarda en PDF. Si se imprime filtrado, se
       lleva un temario incompleto. */
    const print = bloque(leer('css/regularizacion-2026.css'), '@media print');

    assert.match(print, /is-out[\s\S]{0,120}display:\s*grid/,
        'los temas filtrados deben reaparecer al imprimir');
});

test('se respeta el modo de alto contraste del sistema', () => {
    HOJAS.forEach(hoja => {
        assert.match(leer(hoja), /@media \(forced-colors: active\)/, hoja);
    });
});

/* ── JuniorMath ──────────────────────────────────────────────── */

test('los pasos de JuniorMath bajan a una columna en teléfono', () => {
    /* A dos columnas cada paso quedaba en unos 150 px con una insignia
       de 52 px encima. */
    const html = leer('juniormath_v2.html');

    assert.match(
        html,
        /@media \(max-width:560px\)\{[\s\S]{0,240}\.jm-steps\{grid-template-columns:1fr\}/,
        'falta el tramo de una columna para .jm-steps'
    );
});

test('JuniorMath también neutraliza el hover táctil y fija las anclas', () => {
    const html = leer('juniormath_v2.html');

    assert.match(html, /@media \(hover:none\)/, 'falta la guarda de hover táctil');
    assert.match(html, /scroll-padding-top/, 'faltan las anclas bajo la navbar');
    assert.match(html, /env\(safe-area-inset-bottom\)/, 'falta el área segura');
});

/* ── Movimiento reducido, en las tres páginas ────────────────── */

test('todo el movimiento se apaga si el sistema lo pide', () => {
    HOJAS.forEach(hoja => {
        const css = leer(hoja);

        assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, hoja);
    });

    assert.match(
        leer('juniormath_v2.html'),
        /prefers-reduced-motion:reduce/,
        'juniormath debe respetar prefers-reduced-motion'
    );
});

/* ══════════════════════════════════════════════════════════════════
   Colocación en rejilla

   Bug que originó este bloque: `.ud-checklist li` declaraba dos
   columnas (2.6rem 1fr) pero contenía TRES elementos de rejilla — el
   ::before del contador, el <strong> y el <span>. La colocación
   automática ponía número y término en la primera fila y mandaba la
   glosa a la segunda fila DENTRO de la columna del número: el texto
   explicativo quedaba aplastado a 42 px de ancho, en escritorio y en
   móvil.

   El mismo patrón afectaba a `.ud-articles` por debajo de 721 px,
   donde `.ud-ticks` caía en la columna del número.

   La defensa es asignar grid-column explícita a cada hijo. Estas
   pruebas la exigen, porque el síntoma no salta al leer el CSS: hay
   que contar elementos de rejilla, y el ::before es invisible en el
   HTML.
   ══════════════════════════════════════════════════════════════════ */

/** Cuenta las pistas de una plantilla de columnas. */
function contarColumnas(plantilla) {
    const rep = plantilla.match(/repeat\((\d+)\s*,/);
    if (rep) return parseInt(rep[1], 10);

    return (plantilla.match(/minmax\([^)]*\)|clamp\([^)]*\)|calc\([^)]*\)|\S+/g) || []).length;
}

/** Extrae el valor de una propiedad dentro de la primera regla que
 *  coincide con el selector dado. */
function declaracion(css, selector, prop) {
    const rx = new RegExp(
        '(^|[};])\\s*' + selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
        '\\s*\\{([^}]*)\\}',
        'm'
    );

    const m = css.match(rx);
    if (!m) return null;

    const p = m[2].match(new RegExp(prop + ':\\s*([^;]+)'));
    return p ? p[1].trim() : null;
}

test('la checklist reserva una columna por cada elemento de rejilla', () => {
    const css = leer('css/universidad-dominical-2026.css');

    const plantilla = declaracion(css, '.ud-checklist li', 'grid-template-columns');
    assert.ok(plantilla, 'no se encontró la plantilla de .ud-checklist li');

    const cols = contarColumnas(plantilla);

    /* El <li> tiene 3 elementos de rejilla: ::before, strong y span. */
    assert.ok(
        cols >= 3,
        '.ud-checklist li declara ' + cols + ' columnas para 3 elementos de ' +
        'rejilla (::before, strong, span): la glosa se iría a la columna ' +
        'del número'
    );
});

test('cada hijo de la checklist tiene su columna asignada', () => {
    const css = leer('css/universidad-dominical-2026.css');

    [
        ['.ud-checklist li::before', '1'],
        ['.ud-checklist strong', '2'],
        ['.ud-checklist span', '3']
    ].forEach(([sel, esperada]) => {
        const col = declaracion(css, sel, 'grid-column');

        assert.equal(
            col,
            esperada,
            sel + ' debe declarar grid-column: ' + esperada +
            '; sin asignación explícita, añadir un hijo vuelve a romper el bloque'
        );
    });
});

test('en pantalla estrecha la glosa se apila bajo su término', () => {
    /* No debe quedarse en una tercera columna inexistente ni caer en la
       columna del número. */
    const css = leer('css/universidad-dominical-2026.css');
    const estrecho = bloque(css, '@media (max-width: 880px)');

    assert.ok(estrecho.length > 40, 'falta el tramo estrecho de la checklist');

    assert.match(
        estrecho,
        /\.ud-checklist strong,\s*\n?\s*\.ud-checklist span\s*\{[^}]*grid-column:\s*2/,
        'término y glosa deben compartir la columna 2 al apilarse'
    );
});

test('las viñetas de carrera no caen en la columna del número', () => {
    /* .ud-ticks no tenía grid-column en el tramo de 780px y aterrizaba
       en la columna de 2.4rem de la segunda fila. */
    const css = leer('css/universidad-dominical-2026.css');

    [
        '@media (max-width: 780px)',
        '@media (min-width: 721px) and (max-width: 1024px)'
    ].forEach(cab => {
        const b = bloque(css, cab);

        assert.match(
            b,
            /\.ud-articles > li > \*:not\(\.ud-art-n\)\s*\{[^}]*grid-column:\s*2/,
            cab + ': todo hijo que no sea el número debe ir a la columna 2'
        );
    });
});

test('el margen no se parte en dos columnas cuando lleva encabezado', () => {
    /* En tablet .ud-margin pasaba a dos columnas y, en las secciones
       cuyo margen contiene el antetítulo y el h2, el título se iba al
       lado del antetítulo. */
    const tablet = bloque(
        leer('css/universidad-dominical-2026.css'),
        '@media (min-width: 721px) and (max-width: 1024px)'
    );

    assert.match(
        tablet,
        /\.ud-margin:not\(:has\(h2\)\)\s*\{[^}]*grid-template-columns/,
        'la rejilla de dos columnas del margen debe excluir los que llevan h2'
    );

    assert.ok(
        !/\n\s*\.ud-margin\s*\{[^}]*grid-template-columns/.test(tablet),
        'no debe quedar una regla .ud-margin sin filtrar que aplique a todos'
    );
});

test('el bloque de verificación mantiene sus seis puntos y el aviso', () => {
    /* Guarda de contenido: es la pieza de cumplimiento de la página. */
    const html = leer('universidad-dominical.html');

    const items = html.match(/<ol class="ud-checklist">([\s\S]*?)<\/ol>/);
    assert.ok(items, 'no se encontró la checklist');

    const cuenta = (items[1].match(/<li>/g) || []).length;
    assert.equal(cuenta, 6, 'la checklist debe tener 6 puntos');

    /* Cada punto es término + glosa: si falta uno, el diseño de tres
       columnas deja un hueco. */
    assert.equal((items[1].match(/<strong>/g) || []).length, 6);
    assert.equal((items[1].match(/<span>/g) || []).length, 6);

    assert.match(
        html,
        /class="ud-doc-foot"[\s\S]{0,200}WorldBrain ofrece preparación/,
        'el aviso de alcance debe cerrar el bloque'
    );
});
