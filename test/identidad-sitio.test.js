/**
 * Guard: fuente única de identidad del sitio.
 *
 * Origen: el informe GEO/AEO del 2026-08-14 dejó dos deudas explícitas.
 *
 *   Punto 9 — un tagline heredado afirmaba liderazgo ("Pioneros en
 *   Neuroaprendizaje…") e impacto continental ("Transformamos la manera en
 *   que Latinoamérica aprende") sin evidencia publicable, y seguía presente
 *   en cientos de HTML servibles.
 *
 *   Punto 10 — teléfono, domicilio, horarios y datos legales se repetían en
 *   el pipeline heredado en lugar de derivarse de src/_data/site.json.
 *
 * Estos guards obligan a que la identidad viva en UN solo archivo y a que
 * cada representación servible sea una copia exacta de esa fuente. El texto
 * canónico del tagline no se inventa aquí: es el que ya se revisó y publicó
 * en fotolectura.html, que atribuye el año fundacional en lugar de afirmar
 * autoridad.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/_data/site.json'), 'utf8'));

/** Frases retiradas por no ser demostrables con evidencia publicable. */
const CLAIMS_RETIRADOS = [
  'Pioneros en Neuroaprendizaje',
  'Transformamos la manera en que',
];

/** Decodifica las entidades que el pipeline heredado usa en el pie. */
function decodificar(texto) {
  const entidades = {
    '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó',
    '&uacute;': 'ú', '&ntilde;': 'ñ', '&Aacute;': 'Á', '&Eacute;': 'É',
    '&Iacute;': 'Í', '&Oacute;': 'Ó', '&Uacute;': 'Ú', '&Ntilde;': 'Ñ',
    '&amp;': '&', '&copy;': '©', '&middot;': '·', '&nbsp;': ' ',
  };
  return texto.replace(/&[a-zA-Z]+;/g, (e) => entidades[e] ?? e);
}

/** HTML realmente servible: la raíz, sin backups archivados. */
function htmlServibles() {
  return fs.readdirSync(ROOT)
    .filter((f) => f.endsWith('.html'))
    .map((f) => ({ nombre: f, texto: fs.readFileSync(path.join(ROOT, f), 'utf8') }));
}

test('site.json declara el tagline como fuente única', () => {
  assert.equal(typeof SITE.tagline, 'string', 'site.json debe declarar "tagline"');
  assert.ok(SITE.tagline.trim().length > 0, 'el tagline no puede estar vacío');
});

test('el tagline canónico no afirma autoridad ni impacto sin evidencia', () => {
  for (const claim of CLAIMS_RETIRADOS) {
    assert.ok(
      !SITE.tagline.includes(claim),
      `El tagline de site.json reintroduce un claim sin evidencia: "${claim}"`,
    );
  }
});

test('el tagline cita el año fundacional declarado en site.json', () => {
  assert.ok(
    SITE.tagline.includes(String(SITE.foundedYear)),
    `El tagline debe citar foundedYear (${SITE.foundedYear}) para no abrir una segunda fuente de año`,
  );
});

test('ningún HTML servible conserva los claims retirados', () => {
  const infractores = [];
  for (const { nombre, texto } of htmlServibles()) {
    const plano = decodificar(texto);
    for (const claim of CLAIMS_RETIRADOS) {
      if (plano.includes(claim)) infractores.push(`${nombre} → "${claim}"`);
    }
  }
  assert.deepEqual(infractores, [], `Claims sin evidencia todavía servidos:\n  ${infractores.join('\n  ')}`);
});

test('cada pie servible reproduce exactamente el tagline de site.json', () => {
  const esperado = SITE.tagline;
  const desincronizados = [];
  for (const { nombre, texto } of htmlServibles()) {
    for (const m of texto.matchAll(/<p class="(?:footer-tagline|foot-tag)">([\s\S]*?)<\/p>/g)) {
      const encontrado = decodificar(m[1]).trim();
      if (encontrado !== esperado) desincronizados.push(`${nombre} → "${encontrado}"`);
    }
  }
  assert.deepEqual(desincronizados, [], `Pies fuera de la fuente única:\n  ${desincronizados.join('\n  ')}`);
});

test('la prosa de pie usa el descriptor atributivo de site.json', () => {
  assert.equal(typeof SITE.descriptor, 'string', 'site.json debe declarar "descriptor"');
  assert.equal(typeof SITE.foundingStatement, 'string', 'site.json debe declarar "foundingStatement"');
  assert.ok(
    SITE.foundingStatement.includes(String(SITE.foundedYear)),
    'foundingStatement debe citar foundedYear',
  );
  for (const claim of CLAIMS_RETIRADOS) {
    assert.ok(!SITE.descriptor.includes(claim), `descriptor reintroduce "${claim}"`);
    assert.ok(!SITE.foundingStatement.includes(claim), `foundingStatement reintroduce "${claim}"`);
  }
});

test('el generador de blogs no incrusta el tagline en su plantilla', () => {
  const generador = fs.readFileSync(path.join(ROOT, 'tools/seo_content/build_html.py'), 'utf8');
  for (const claim of CLAIMS_RETIRADOS) {
    assert.ok(
      !generador.includes(claim),
      `build_html.py todavía incrusta "${claim}"; debe leerlo de src/_data/site.json`,
    );
  }
  assert.ok(
    /site\.json/.test(generador),
    'build_html.py debe derivar la identidad de src/_data/site.json',
  );
});

test('la plantilla Eleventy no duplica el tagline', () => {
  const base = fs.readFileSync(path.join(ROOT, 'src/_includes/layouts/base.njk'), 'utf8');
  for (const claim of CLAIMS_RETIRADOS) {
    assert.ok(!base.includes(claim), `base.njk todavía incrusta "${claim}"`);
  }
});

test('teléfono y correo servidos coinciden con site.json', () => {
  const autorizados = new Set(
    SITE.phonesAuthorized.map((p) => p.href.replace(/[^0-9+]/g, '')),
  );
  const infractores = [];
  for (const { nombre, texto } of htmlServibles()) {
    for (const m of texto.matchAll(/href="tel:([^"]+)"/g)) {
      const normalizado = `tel:${m[1]}`.replace(/[^0-9+]/g, '');
      if (!autorizados.has(normalizado)) infractores.push(`${nombre} → tel:${m[1]}`);
    }
    for (const m of texto.matchAll(/href="mailto:([^"?]+)/g)) {
      if (m[1] !== SITE.email) infractores.push(`${nombre} → mailto:${m[1]}`);
    }
  }
  assert.deepEqual(infractores, [], `Contacto fuera de la fuente única:\n  ${infractores.join('\n  ')}`);
});

test('el teléfono principal está entre los autorizados', () => {
  const principal = SITE.phonesAuthorized.find((p) => p.role === 'principal');
  assert.ok(principal, 'site.json debe marcar un teléfono principal');
  assert.equal(principal.href, SITE.phoneHref, 'phoneHref debe apuntar al teléfono principal');
  assert.equal(principal.display, SITE.phone, 'phone debe ser el formato visible del principal');
});

test('el gate de teléfonos deriva su lista de site.json', () => {
  const check = fs.readFileSync(path.join(ROOT, 'check.sh'), 'utf8');
  assert.ok(
    /site\.json/.test(check),
    'check.sh debe leer los teléfonos autorizados de src/_data/site.json en lugar de repetirlos',
  );
});

test('la línea legal del pie coincide con site.json', () => {
  const { razonSocial, rfc, domicilio } = SITE.legal;
  const infractores = [];
  for (const { nombre, texto } of htmlServibles()) {
    for (const m of texto.matchAll(/<p class="footer-legal-text">([\s\S]*?)<\/p>/g)) {
      const linea = decodificar(m[1]);
      if (!linea.includes(razonSocial) || !linea.includes(rfc) || !linea.includes(domicilio)) {
        infractores.push(`${nombre} → "${linea.trim()}"`);
      }
    }
  }
  assert.deepEqual(infractores, [], `Línea legal desincronizada:\n  ${infractores.join('\n  ')}`);
});

test('el sincronizador de identidad existe y es verificable sin escribir', () => {
  const script = path.join(ROOT, 'tools/sync_site_identity.py');
  assert.ok(fs.existsSync(script), 'falta tools/sync_site_identity.py');
  const fuente = fs.readFileSync(script, 'utf8');
  assert.ok(/--check/.test(fuente), 'el sincronizador debe ofrecer modo --check para CI');
});
