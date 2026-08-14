'use strict';

/* ══════════════════════════════════════════════════════════════════
   LEAD MAGNETS · Integridad del catálogo

   Estas pruebas existen por tres fallos concretos que ya ocurrieron:

   1. Los 269 artículos ofrecían el MISMO documento (una guía de
      técnicas de estudio) sin importar el tema. Un artículo de
      robótica pedía el correo a cambio de material no relacionado.

   2. `descargas/` no estaba en los --include de rsync en deploy.sh, y
      la última regla es --exclude='*'. El PDF existía en el repo y en
      local, y en producción devolvía 404: la descarga estaba rota sin
      que ninguna prueba lo notara.

   3. Un documento referenciado sin PDF generado deja el enlace muerto.

   Se comprueba contra los HTML ya publicados, no contra la plantilla:
   lo que importa es lo que recibe el visitante.
   ══════════════════════════════════════════════════════════════════ */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CATALOG = path.join(ROOT, 'tools', 'lead_magnets', 'catalog.json');

const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8')).magnets;

const blogs = fs.readdirSync(ROOT)
    .filter(f => f.startsWith('blog-') && f.endsWith('.html'))
    .filter(f => f !== 'blog-index.html');

/** Extrae los datos del formulario de captura de un artículo. */
function readMagnet(file) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const resource = /data-resource="([^"]+)"/.exec(html);
    const download = /data-download="([^"]+)"/.exec(html);
    const course = /data-course="([^"]*)"/.exec(html);
    return {
        resource: resource && resource[1],
        download: download && download[1],
        course: course && course[1],
        hasForm: /data-lead-magnet/.test(html),
        hasScript: /js\/lead-capture\.js/.test(html)
    };
}

test('todos los artículos del blog ofrecen un documento descargable', () => {
    assert.ok(blogs.length > 200, 'se esperaban más de 200 artículos');

    const sinForm = blogs.filter(f => !readMagnet(f).hasForm);
    assert.deepStrictEqual(sinForm, [], 'artículos sin formulario de captura');

    const sinScript = blogs.filter(f => !readMagnet(f).hasScript);
    assert.deepStrictEqual(sinScript, [], 'artículos sin lead-capture.js');
});

test('cada documento ofrecido existe como PDF en descargas/', () => {
    const faltantes = new Set();

    for (const file of blogs) {
        const { resource, download } = readMagnet(file);
        assert.ok(resource, `${file}: sin data-resource`);
        assert.strictEqual(
            download,
            `/descargas/${resource}.pdf`,
            `${file}: data-download no corresponde a data-resource`
        );
        if (!fs.existsSync(path.join(ROOT, 'descargas', `${resource}.pdf`))) {
            faltantes.add(resource);
        }
    }

    assert.deepStrictEqual(
        [...faltantes], [],
        'documentos ofrecidos sin PDF generado (node tools/lead_magnets/build_pdfs.js)'
    );
});

test('el documento ofrecido corresponde a un documento del catálogo', () => {
    const desconocidos = new Set();
    for (const file of blogs) {
        const { resource } = readMagnet(file);
        if (!catalog[resource]) desconocidos.add(resource);
    }
    assert.deepStrictEqual([...desconocidos], [], 'documentos fuera del catálogo');
});

test('el curso declarado en el formulario es el del catálogo', () => {
    const desalineados = [];
    for (const file of blogs) {
        const { resource, course } = readMagnet(file);
        const esperado = catalog[resource] && catalog[resource].course_name;
        if (esperado && course !== esperado) {
            desalineados.push(`${file}: ${course} ≠ ${esperado}`);
        }
    }
    assert.deepStrictEqual(desalineados, [], 'curso del formulario distinto al del catálogo');
});

test('el catálogo no ofrece un curso cuya página no exista', () => {
    const rotos = [];
    for (const [slug, meta] of Object.entries(catalog)) {
        const page = meta.course_url.replace(/^\//, '') + '.html';
        if (!fs.existsSync(path.join(ROOT, page))) {
            rotos.push(`${slug} → ${meta.course_url} (falta ${page})`);
        }
    }
    assert.deepStrictEqual(rotos, [], 'CTA que apunta a una página inexistente');
});

test('un mismo cluster no está asignado a dos documentos', () => {
    const visto = new Map();
    const choques = [];
    for (const [slug, meta] of Object.entries(catalog)) {
        for (const cluster of meta.clusters || []) {
            if (visto.has(cluster)) {
                choques.push(`${cluster}: ${visto.get(cluster)} y ${slug}`);
            }
            visto.set(cluster, slug);
        }
    }
    assert.deepStrictEqual(choques, [], 'clusters con documento ambiguo');
});

test('los artículos no ofrecen todos el mismo documento', () => {
    /* La regresión que motivó todo esto: un único documento genérico
       inyectado en los 269 artículos. Si el reparto vuelve a colapsar a
       uno solo, algo se rompió en la resolución por cluster. */
    const usados = new Set(blogs.map(f => readMagnet(f).resource));
    assert.ok(
        usados.size >= 4,
        `solo ${usados.size} documento(s) distinto(s) en uso: el reparto por cluster no está funcionando`
    );
});

test('deploy.sh sube el directorio de descargas', () => {
    /* Sin este include, rsync --delete con --exclude='*' al final deja
       los PDF fuera del servidor y toda descarga responde 404 en
       producción aunque funcione en local. */
    const deploy = fs.readFileSync(path.join(ROOT, 'deploy.sh'), 'utf8');
    assert.match(
        deploy,
        /--include='descargas\/\*\*\*'/,
        'deploy.sh no incluye descargas/: los PDF no llegarían a producción'
    );
});

test('cada documento del catálogo declara los datos que usa el formulario', () => {
    for (const [slug, meta] of Object.entries(catalog)) {
        for (const campo of ['title', 'teaser', 'button', 'course_name', 'course_url']) {
            assert.ok(
                meta[campo] && String(meta[campo]).trim(),
                `${slug}: falta '${campo}' en el catálogo`
            );
        }
        assert.ok(
            Array.isArray(meta.clusters) && meta.clusters.length,
            `${slug}: sin clusters asignados`
        );
    }
});
