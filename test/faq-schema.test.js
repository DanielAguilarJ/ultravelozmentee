'use strict';

/* ══════════════════════════════════════════════════════════════════
   FAQ SCHEMA · Coincidencia con el contenido visible

   Por qué existe: scripts/seo-audit.js ya comprueba que una página con
   FAQPage tenga ALGUNA FAQ visible (marcador SEO:FAQ, .seo-faq-item o
   <details>). Lo que no comprueba es lo que Google realmente penaliza:
   que el TEXTO del schema no aparezca en la página.

   Las directrices de datos estructurados de Google exigen que el
   contenido marcado sea visible para el usuario. Un FAQPage con
   preguntas que no están en el HTML es motivo de acción manual, y el
   fallo es invisible en revisión: el JSON es válido, la página se ve
   bien, y el rich result se pierde o se penaliza semanas después.

   Este caso estuvo a punto de ocurrir al añadir el schema a
   robotics.html: se reformularon dos preguntas en el JSON (una contenía
   una frase que el gate de claims prohíbe) y quedaron desalineadas del
   HTML hasta que se corrigió también el texto visible.
   ══════════════════════════════════════════════════════════════════ */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const ENTITY_DECODER = new JSDOM('').window.document.createElement('textarea');

/** Texto visible aproximado: se quitan etiquetas, se decodifican entidades y se normalizan espacios. */
function visibleText(html) {
    const withoutMarkup = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ');
    ENTITY_DECODER.innerHTML = withoutMarkup;
    return ENTITY_DECODER.value
        .replace(/\s+/g, ' ')
        .replace(/\s+([,.;:!?])/g, '$1')
        .trim();
}

/** Devuelve todos los nodos FAQPage de una página, o [] si no hay. */
function faqNodes(html) {
    const out = [];
    const blocks = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi) || [];
    for (const block of blocks) {
        const body = block
            .replace(/^<script type="application\/ld\+json">/i, '')
            .replace(/<\/script>$/i, '');
        let data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            /* La validez del JSON se comprueba en su propia prueba abajo. */
            continue;
        }
        const nodes = data['@graph'] || [data];
        for (const node of nodes) {
            if (node && node['@type'] === 'FAQPage') out.push(node);
        }
    }
    return out;
}

const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
const coursePages = pages.filter(file => {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    if (!/"@type"\s*:\s*"Course"/.test(html)) return false;
    // Mismo criterio que test/cobertura-rastreo.test.js: una página marcada
    // `noindex` no está publicada, así que las obligaciones de publicación
    // (FAQ visible y su FAQPage) todavía no le aplican. La comprobación sigue
    // cubriendo todas las páginas de curso que sí están en el índice, y la
    // exigencia vuelve en cuanto se le retire el `noindex`.
    return !/<meta\s+name="robots"[^>]*content="[^"]*noindex/i.test(html);
});

test('todas las páginas de curso publican FAQ visible y FAQPage', () => {
    const sinSchema = [];
    const sinFaqVisible = [];

    for (const file of coursePages) {
        const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
        const nodes = faqNodes(html);
        const preguntas = nodes.flatMap(node => node.mainEntity || []);
        const itemsVisibles = (html.match(/\bseo-faq-item\b/g) || []).length;

        if (preguntas.length < 4) {
            sinSchema.push(`${file}: ${preguntas.length} preguntas en FAQPage`);
        }
        if (itemsVisibles < 4) {
            sinFaqVisible.push(`${file}: ${itemsVisibles} elementos .seo-faq-item`);
        }
    }

    assert.ok(coursePages.length >= 15, `solo se detectaron ${coursePages.length} páginas Course`);
    assert.deepStrictEqual(sinSchema, [], 'páginas Course sin schema FAQ suficiente');
    assert.deepStrictEqual(sinFaqVisible, [], 'páginas Course sin FAQ visible auditable');
});

test('todo el JSON-LD del sitio es sintácticamente válido', () => {
    const roto = [];
    for (const file of pages) {
        const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
        const blocks = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi) || [];
        for (const block of blocks) {
            const body = block
                .replace(/^<script type="application\/ld\+json">/i, '')
                .replace(/<\/script>$/i, '');
            try {
                JSON.parse(body);
            } catch (err) {
                roto.push(`${file}: ${err.message}`);
            }
        }
    }
    assert.deepStrictEqual(roto, [], 'bloques JSON-LD inválidos');
});

test('las preguntas del FAQPage aparecen en el contenido visible', () => {
    /* Google exige que el contenido marcado sea visible. Un desajuste es
       motivo de acción manual, no una advertencia menor. */
    const desalineadas = [];
    let revisadas = 0;

    for (const file of pages) {
        const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
        const nodes = faqNodes(html);
        if (!nodes.length) continue;

        const visible = visibleText(html);
        for (const node of nodes) {
            for (const q of node.mainEntity || []) {
                revisadas++;
                if (!visible.includes(q.name)) {
                    desalineadas.push(`${file}: pregunta ausente del HTML -> "${q.name}"`);
                }
            }
        }
    }

    assert.ok(revisadas > 0, 'no se encontró ninguna pregunta que revisar');
    assert.deepStrictEqual(desalineadas, [], 'preguntas del schema que no están visibles');
});

test('las respuestas del FAQPage aparecen en el contenido visible', () => {
    /* Se compara un prefijo largo en vez del texto completo: el HTML puede
       partir una respuesta en varios elementos, pero el arranque literal
       tiene que estar. */
    const desalineadas = [];

    for (const file of pages) {
        const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
        const nodes = faqNodes(html);
        if (!nodes.length) continue;

        const visible = visibleText(html);
        for (const node of nodes) {
            for (const q of node.mainEntity || []) {
                const answer = (q.acceptedAnswer && q.acceptedAnswer.text) || '';
                assert.ok(answer.trim(), `${file}: respuesta vacía en "${q.name}"`);
                const probe = answer.slice(0, 60);
                if (!visible.includes(probe)) {
                    desalineadas.push(`${file}: respuesta ausente del HTML -> "${q.name}"`);
                }
            }
        }
    }

    assert.deepStrictEqual(desalineadas, [], 'respuestas del schema que no están visibles');
});

test('las dos páginas de mayor tráfico orgánico declaran FAQPage', () => {
    /* Ambas concentraban impresiones con CTR muy por debajo de lo
       esperado para su posición, y tenían las preguntas visibles SIN
       marcar. Si alguien retira el schema, esta prueba lo detiene. */
    const criticas = [
        'las-culturas-mesoamericanas-legado-sabiduria.html',
        'robotics.html'
    ];

    for (const file of criticas) {
        const full = path.join(ROOT, file);
        assert.ok(fs.existsSync(full), `falta ${file}`);
        const nodes = faqNodes(fs.readFileSync(full, 'utf8'));
        assert.ok(
            nodes.length && (nodes[0].mainEntity || []).length >= 4,
            `${file}: debe declarar FAQPage con al menos 4 preguntas`
        );
    }
});
