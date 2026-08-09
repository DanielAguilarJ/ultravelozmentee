'use strict';

/*
 * Test de integración: arranca el servidor real y comprueba los
 * códigos HTTP que verá Googlebot. El test unitario valida la
 * decisión; este valida que el middleware está en el orden correcto
 * y que la redirección es de UN salto, no una cadena.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PORT = 3987;
const BASE = `http://127.0.0.1:${PORT}`;

let server;

async function esperarservidor(intentos = 60) {
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(`${BASE}/fastkids`, { redirect: 'manual' });
      if (r.status) return;
    } catch {
      await new Promise(r => setTimeout(r, 250));
    }
  }
  throw new Error('el servidor no arrancó');
}

test.before(async () => {
  server = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stderr.on('data', d => process.stderr.write(`[server] ${d}`));
  await esperarservidor();
});

test.after(() => {
  if (server) server.kill('SIGKILL');
});

/** Sigue la cadena de redirecciones y devuelve cada salto. */
async function cadena(ruta, max = 6) {
  const saltos = [];
  let actual = ruta;
  for (let i = 0; i < max; i++) {
    const r = await fetch(`${BASE}${actual}`, { redirect: 'manual' });
    const loc = r.headers.get('location');
    saltos.push({ ruta: actual, status: r.status, location: loc });
    if (r.status < 300 || r.status >= 400 || !loc) break;
    actual = loc.startsWith('http') ? new URL(loc).pathname : loc;
  }
  return saltos;
}

test('las URLs heredadas profundas hacen UN 301 y terminan en 200', async () => {
  const casos = [
    ['/home/fastkids.html', '/fastkids'],
    ['/analisis-de-contenido/memoria-prodigiosa.html', '/memoria-prodigiosa'],
    ['/planteles/blog-index.html', '/blog-index'],
    ['/educacion-digital/testimonios.html', '/testimonios'],
    ['/producto/euclidean-color-black-pen/fastkids.html', '/fastkids'],
    ['/preparacion-para-examenes/index.html', '/']
  ];

  for (const [entrada, destino] of casos) {
    const saltos = await cadena(entrada);
    assert.equal(saltos[0].status, 301, `${entrada} debe responder 301`);
    assert.equal(saltos[0].location, destino, `${entrada} debe apuntar a ${destino}`);
    assert.equal(
      saltos.at(-1).status,
      200,
      `${entrada} debe acabar en 200, acabó en ${saltos.at(-1).status}`
    );
    assert.equal(
      saltos.length,
      2,
      `${entrada} debe resolverse en un solo salto, hizo ${saltos.length - 1}`
    );
  }
});

test('las secciones heredadas de un segmento hacen UN 301 a su equivalente', async () => {
  const casos = [
    ['/home', '/'],
    ['/regularizacion', '/regularizacion-express'],
    ['/las-deficiencias-de-la-lectoescritura-en-prima', '/lectoescritura'],
    ['/medicina-y-sus-lecturas-problemas-y-estrate', '/fotolectura'],
    ['/la-ensenanza-de-la-robotica-en-ninos-de-mexico-beneficios-en-su-aprendizaje-a-largo-plazo', '/blog-robotica-educativa-beneficios']
  ];

  for (const [entrada, destino] of casos) {
    const saltos = await cadena(entrada);
    assert.equal(saltos[0].status, 301, entrada);
    assert.equal(saltos[0].location, destino, entrada);
    assert.equal(saltos.at(-1).status, 200, `${entrada} debe acabar en 200`);
  }
});

test('la barra final de un post existente sigue haciendo 301 a la URL limpia', async () => {
  const saltos = await cadena('/el-porfiriato-un-periodo-de-prosperidad-apar/');
  assert.equal(saltos[0].status, 301);
  assert.equal(saltos[0].location, '/el-porfiriato-un-periodo-de-prosperidad-apar');
  assert.equal(saltos.at(-1).status, 200);
});

test('la basura autogenerada sigue devolviendo 404 con noindex', async () => {
  const basura = [
    '/i-appreciate-your-query',
    '/se-incluyen-aspectos-de-innovacion-tecnologica-y-como-se-utilizan-distintos-formatos-y-plataformas-para-narrar-en-la-era-digital',
    '/pagina-que-jamas-existio'
  ];
  for (const u of basura) {
    const r = await fetch(`${BASE}${u}`, { redirect: 'manual' });
    assert.equal(r.status, 404, u);
    assert.match(r.headers.get('x-robots-tag') || '', /noindex/, `${u} debe llevar noindex`);
  }
});

test('las páginas canónicas siguen sirviéndose en 200 sin redirección', async () => {
  for (const u of ['/fastkids', '/blog-index', '/testimonios', '/regularizacion-express', '/']) {
    const r = await fetch(`${BASE}${u}`, { redirect: 'manual' });
    assert.equal(r.status, 200, `${u} debe ser 200 directo`);
  }
});

test('los recursos estáticos no se ven afectados', async () => {
  for (const u of ['/css/styles.css', '/js/navbar.js', '/robots.txt', '/sitemap.xml']) {
    const r = await fetch(`${BASE}${u}`, { redirect: 'manual' });
    assert.equal(r.status, 200, u);
  }
});

test('la query string sobrevive a la redirección heredada', async () => {
  const r = await fetch(`${BASE}/home/fastkids.html?utm_source=google`, { redirect: 'manual' });
  assert.equal(r.status, 301);
  assert.equal(r.headers.get('location'), '/fastkids?utm_source=google');
});

test('todas las URLs del sitemap responden 200 sin redirección', async () => {
  const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.ok(locs.length > 40, `el sitemap debería tener más de 40 URLs, tiene ${locs.length}`);

  const fallos = [];
  for (const loc of locs) {
    const ruta = new URL(loc).pathname;
    const r = await fetch(`${BASE}${ruta}`, { redirect: 'manual' });
    if (r.status !== 200) fallos.push(`${ruta} → ${r.status}`);
  }
  assert.deepEqual(fallos, [], `URLs del sitemap que no dan 200:\n${fallos.join('\n')}`);
});
