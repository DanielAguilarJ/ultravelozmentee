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
    'css/regularizacion-2026.css'
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
