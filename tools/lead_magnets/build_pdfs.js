#!/usr/bin/env node
/**
 * Genera los PDF de los lead magnets desde su fuente HTML.
 *
 * Por qué existe: el único PDF que había antes
 * (descargas/guia-tecnicas-de-estudio.pdf) se produjo a mano desde el
 * HTML, sin script. Eso es la misma brecha de reproducibilidad que ya
 * apareció con los HTML del blog generados por un script sin commitear:
 * el artefacto existe, la forma de rehacerlo no. Con diez documentos en
 * el catálogo, rehacerlos a mano tras cualquier cambio de estilo no es
 * viable.
 *
 * Uso:
 *   node tools/lead_magnets/build_pdfs.js            # todos
 *   node tools/lead_magnets/build_pdfs.js <slug>...  # solo esos
 *
 * Requiere Playwright con Chromium. Se reutiliza el que ya está
 * instalado para las pruebas visuales del proyecto.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SRC_DIR = __dirname;
const OUT_DIR = path.join(__dirname, '..', '..', 'descargas');

/* El pie corrido lleva el número de página. Chrome no soporta
   `@bottom-center` de CSS paged media, así que el número tiene que
   venir por footerTemplate de Playwright: es la única vía. */
const FOOTER = `<div style="font-family:Inter,Helvetica,Arial,sans-serif;font-size:7.5pt;
  color:#857d73;width:100%;padding:0 22mm;display:flex;justify-content:space-between;">
  <span>WorldBrain México · ultravelozmente.com</span>
  <span class="pageNumber"></span>
</div>`;

/**
 * Arranca el navegador sin obligar a descargar nada: primero el
 * chromium propio de Playwright si ya está en caché, y si no, el Chrome
 * del sistema vía `channel`. En una máquina con solo Command Line Tools
 * y sin navegadores descargados, el canal del sistema es la única vía.
 */
async function launchBrowser(chromium) {
    try {
        return await chromium.launch();
    } catch (err) {
        process.stderr.write(
            'Chromium de Playwright no disponible; usando Chrome del sistema.\n'
        );
        return await chromium.launch({ channel: 'chrome' });
    }
}

async function main() {
    let chromium;
    try {
        ({ chromium } = require('playwright'));
    } catch (err) {
        console.error(
            'Falta Playwright. Instálalo con:\n' +
            '  npm install --no-save playwright\n' +
            'o apunta NODE_PATH a una instalación existente.'
        );
        process.exit(1);
    }

    const only = process.argv.slice(2);

    const sources = fs.readdirSync(SRC_DIR)
        .filter(f => f.endsWith('.html'))
        .filter(f => !f.startsWith('_'))
        .filter(f => !only.length || only.includes(f.replace(/\.html$/, '')))
        .sort();

    if (!sources.length) {
        console.error('No se encontró ningún HTML que generar en ' + SRC_DIR);
        process.exit(1);
    }

    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

    const browser = await launchBrowser(chromium);
    const results = [];

    for (const file of sources) {
        const slug = file.replace(/\.html$/, '');
        const src = 'file://' + path.join(SRC_DIR, file);
        const out = path.join(OUT_DIR, slug + '.pdf');

        const page = await browser.newPage();
        /* networkidle porque la hoja de estilo importa las fuentes de
           marca desde Google Fonts; sin esperarlas el PDF sale con las
           sustitutas del sistema y pierde toda la identidad. */
        await page.goto(src, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);

        /* Verificación real, no confianza: si Fraunces no cargó, el
           documento no debe publicarse en silencio con Georgia. */
        const hasBrandFont = await page.evaluate(
            () => document.fonts.check('700 32pt Fraunces')
        );

        const words = await page.evaluate(() => {
            const main = document.querySelector('main');
            const body = main || document.body;
            return body.innerText.trim().split(/\s+/).length;
        });

        /* Guardián de desbordamiento. Las hojas tienen altura fija y
           overflow:hidden, así que el contenido que no cabe NO empuja
           una página nueva: desaparece sin aviso. Un PDF con un párrafo
           recortado a media frase pasa cualquier revisión superficial,
           así que hay que medirlo. */
        const overflow = await page.evaluate(() => {
            const out = [];
            document.querySelectorAll('.sheet').forEach((sheet, i) => {
                const limit = sheet.getBoundingClientRect().bottom;
                /* El pie va posicionado en absoluto por diseño: no cuenta. */
                sheet.querySelectorAll('.page > *, .cover-body, .figs, .chips')
                    .forEach(el => {
                        const b = el.getBoundingClientRect().bottom;
                        if (b > limit + 1) {
                            out.push({
                                sheet: i + 1,
                                el: el.className || el.tagName,
                                exceso: Math.round((b - limit) / (96 / 25.4))
                            });
                        }
                    });
            });
            return out;
        });

        await page.pdf({
            path: out,
            format: 'Letter',
            printBackground: true,
            preferCSSPageSize: true,
            displayHeaderFooter: true,
            headerTemplate: '<div></div>',
            footerTemplate: FOOTER
        });

        await page.close();

        const size = fs.statSync(out).size;
        /* Conteo de páginas: se cuentan los objetos /Type /Page del PDF.
           Chrome no comprime el árbol de páginas en flujos de objetos,
           así que el patrón es visible en el binario. */
        const raw = fs.readFileSync(out, 'latin1');
        const pages = (raw.match(/\/Type\s*\/Page[^s]/g) || []).length;

        results.push({ slug, pages, kb: Math.round(size / 1024), words, hasBrandFont, overflow });
    }

    await browser.close();

    console.log('slug'.padEnd(42), 'pág', 'KB'.padStart(5), 'palabras', 'fuente');
    let problems = 0;
    for (const r of results) {
        console.log(
            r.slug.padEnd(42),
            String(r.pages).padStart(3),
            String(r.kb).padStart(5),
            String(r.words).padStart(8),
            r.hasBrandFont ? '   ok' : '   FALTA'
        );
        if (!r.hasBrandFont) problems++;

        if (r.overflow && r.overflow.length) {
            problems++;
            for (const o of r.overflow) {
                console.log(
                    `      ⚠ hoja ${o.sheet}: '${o.el}' se sale ${o.exceso}mm ` +
                    `— el contenido se está RECORTANDO`
                );
            }
        }
    }

    console.log('\n' + results.length + ' PDF generados en descargas/');

    if (problems) {
        console.error(
            '\n' + problems + ' documento(s) con problemas. Un desbordamiento ' +
            'significa texto perdido en silencio: reparte el contenido en más ' +
            'hojas antes de publicar.'
        );
        process.exit(1);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
