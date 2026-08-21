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
 * cada representación servible sea una copia exacta de esa fuente. El
 * tagline se mantiene comercial; el año fundacional conserva su campo
 * canónico sin convertirse en una nota defensiva visible en todos los pies.
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

test('el tagline mantiene voz comercial y separa los datos institucionales', () => {
  assert.match(
    SITE.tagline,
    /lectura.*cálculo.*tecnología.*aprender mejor/i,
    'el tagline debe describir de forma concreta la propuesta educativa',
  );
  assert.doesNotMatch(
    SITE.tagline,
    /año fundacional|por confirmar|antes de inscribirse|condiciones vigentes/i,
    'el tagline no debe parecer una nota de auditoría o condiciones',
  );
  assert.ok(
    !SITE.tagline.includes(String(SITE.foundedYear)),
    'el año pertenece a foundedYear y foundingStatement, no al tagline comercial',
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

/**
 * Perfiles externos.
 *
 * Origen: la auditoría del 2026-08-16 comprobó que el canal declarado en el
 * pie, https://www.youtube.com/@worldbrainmexico, devuelve HTTP 404, y que el
 * canal real es @worldbrainmx (su propio título es "WorldBrain México").
 * El enlace roto se servía 606 veces en 309 páginas porque tres generadores
 * lo repetían por separado.
 */
const PERFILES_ROTOS = [
  'youtube.com/@worldbrainmexico',
];

test('site.json declara los perfiles sociales verificados', () => {
  assert.ok(SITE.social && typeof SITE.social === 'object', 'site.json debe declarar "social"');
  for (const red of ['facebook', 'instagram', 'x', 'youtube', 'tiktok']) {
    assert.ok(SITE.social[red], `site.json debe declarar social.${red}`);
  }
  for (const [red, url] of Object.entries(SITE.social)) {
    const urls = Array.isArray(url) ? url : [url];
    for (const u of urls) {
      assert.ok(u.startsWith('https://'), `social.${red} debe usar HTTPS: ${u}`);
    }
  }
});

test('ningún HTML servible enlaza un perfil comprobadamente roto', () => {
  const infractores = [];
  for (const { nombre, texto } of htmlServibles()) {
    for (const roto of PERFILES_ROTOS) {
      if (texto.includes(roto)) infractores.push(`${nombre} → ${roto}`);
    }
  }
  assert.deepEqual(infractores, [], `Perfiles con HTTP 404 todavía enlazados:\n  ${infractores.join('\n  ')}`);
});

test('los generadores no incrustan perfiles rotos', () => {
  const generadores = [
    'tools/seo_content/build_html.py',
    'scripts/apply-seo.js',
    'update_compliance_footer.py',
  ];
  const infractores = [];
  for (const rel of generadores) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const fuente = fs.readFileSync(abs, 'utf8');
    for (const roto of PERFILES_ROTOS) {
      // Se busca el URL como VALOR entrecomillado. Mencionarlo en un
      // comentario que explica por qué se retiró no es reintroducirlo.
      const comoValor = new RegExp(`["'\`]https?://(?:www\\.)?${roto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?["'\`]`);
      if (comoValor.test(fuente)) infractores.push(`${rel} → ${roto}`);
    }
  }
  assert.deepEqual(infractores, [], `Generadores que reintroducirían un 404:\n  ${infractores.join('\n  ')}`);
});

test('todo enlace social servido pertenece al conjunto canónico', () => {
  const canonicos = new Set(
    Object.values(SITE.social).flat().map((u) => u.replace(/\/$/, '')),
  );
  const redes = /https?:\/\/(?:www\.)?(?:facebook|instagram|x|twitter|youtube|tiktok)\.com\/[^"'\s>]*/g;
  const infractores = new Set();
  for (const { nombre, texto } of htmlServibles()) {
    for (const m of texto.matchAll(redes)) {
      const url = m[0].replace(/\/$/, '');
      // El píxel de Meta no es un perfil: es un endpoint de medición.
      if (url.includes('facebook.com/tr')) continue;
      if (!canonicos.has(url)) infractores.add(`${nombre} → ${url}`);
    }
  }
  assert.deepEqual([...infractores], [], `Enlaces sociales fuera del conjunto canónico:\n  ${[...infractores].join('\n  ')}`);
});
