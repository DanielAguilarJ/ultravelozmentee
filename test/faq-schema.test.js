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

const ROOT = path.join(__dirname, '..');

/** Texto visible aproximado: se quitan etiquetas y se decodifican entidades. */
function visibleText(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
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
