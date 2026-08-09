'use strict';

/*
 * RESCATE DE URLs HEREDADAS (WordPress → sitio estático)
 * ─────────────────────────────────────────────────────────────
 * Google Search Console reportaba 127 URLs problemáticas. El 90 %
 * comparte una sola causa: el WordPress antiguo servía las páginas
 * bajo rutas de directorio (/home/, /planteles/, /categoria-x/) y
 * enlazaba con rutas RELATIVAS (href="fastkids.html"). El robot las
 * resolvió como /home/fastkids.html y las guardó para siempre.
 *
 * Hoy todas las páginas son planas en la raíz (/fastkids), así que
 * esas URLs profundas devuelven 404. Google reintenta un 404 durante
 * meses: cuesta presupuesto de rastreo y pierde el enlace entrante.
 *
 * ESTRATEGIA (la que documenta Google, no la cómoda):
 *
 *   1. Ruta profunda cuyo ÚLTIMO segmento es una página real
 *      → 301 a esa página. El destino es exactamente el que el
 *        enlace original pretendía: la señal se conserva.
 *
 *   2. Sección heredada con equivalente temático inequívoco
 *      → 301 a ese equivalente.
 *
 *   3. Todo lo demás → 404 honesto. NO se redirige a la portada.
 *      Google trata la redirección masiva de URLs no relacionadas
 *      hacia la home como soft-404 y la penaliza; un 404 limpio es
 *      la respuesta correcta para contenido que se eliminó sin
 *      reemplazo, y esas URLs se caen del índice por sí solas.
 */

/*
 * Secciones y posts de la era WordPress que ya no existen y cuyo
 * equivalente actual es defendible. Deliberadamente NO se incluyen
 * los slugs basura autogenerados (/since-the-youtube-video-title-…,
 * /i-appreciate-your-query, /organizacion-de-contenido…): no tienen
 * equivalente temático y su destino correcto es el 404.
 */
const LEGACY_SECTIONS = Object.freeze({
  // Páginas estructurales del WordPress antiguo
  '/home': '/',
  '/planteles': '/#contacto',
  '/regularizacion': '/regularizacion-express',

  // Categorías con equivalente temático directo
  '/preparacion-para-examenes': '/admision-universitaria',
  '/educacion-digital': '/homeschool',
  '/educacion-personalizada': '/homeschool',
  '/metodologias-innovadoras': '/homeschool',
  '/ingles-online-para-ninos': '/fastkids',
  '/tecnologia': '/robotics',
  '/tecnologia-educativa': '/robotics',
  '/educacion-stem': '/robotics',
  '/ensenanza-de-ia': '/robotics',
  '/ai-tools': '/robotics',
  '/desarrollo-cognitivo': '/memoria-prodigiosa',
  '/formacion-en-algebra': '/mathekids',
  '/metodo-avanzado': '/lectoescritura',
  '/comunicacion-visual': '/neurocomunicacion',
  '/analisis-de-contenido': '/redaccion-ejecutiva',
  '/redaccion-creativa': '/redaccion-ejecutiva',

  // Posts eliminados en la migración, con sustituto temático real
  '/las-deficiencias-de-la-lectoescritura-en-prima': '/lectoescritura',
  '/medicina-y-sus-lecturas-problemas-y-estrate': '/fotolectura',
  '/la-ensenanza-de-la-robotica-en-ninos-de-mexico-beneficios-en-su-aprendizaje-a-largo-plazo':
    '/blog-robotica-educativa-beneficios'
});

/* Rutas que jamás deben pasar por el rescate. */
const SKIP_PREFIXES = ['/api/', '/.well-known/', '/css/', '/js/', '/images/', '/data/'];

/* Un slug servible: sin barras, sin traversal, sin sorpresas. */
const SAFE_SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function isSafeSlug(slug) {
  return SAFE_SLUG.test(slug) && !slug.includes('..');
}

/**
 * Resuelve el destino 301 de una URL heredada.
 *
 * @param {string} requestPath  Ruta de la petición, ya sin query string.
 * @param {(slug: string) => boolean} pageExists
 *        Predicado que indica si <slug>.html es una página servible.
 * @returns {string|null} Ruta destino, o null si no hay que redirigir.
 */
function resolveLegacyPath(requestPath, pageExists) {
  if (typeof requestPath !== 'string' || !requestPath.startsWith('/')) return null;
  if (SKIP_PREFIXES.some(p => requestPath.startsWith(p))) return null;

  const segments = requestPath.split('/').filter(Boolean);
  if (segments.length === 0) return null; // la raíz se sirve tal cual

  const last = segments[segments.length - 1];

  /*
   * Solo actuamos sobre páginas: .html o sin extensión. Un
   * /css/styles.css o un /images/hero.webp nunca entra aquí, por si
   * algún día se movieran fuera de SKIP_PREFIXES.
   */
  const isHtml = last.toLowerCase().endsWith('.html');
  if (!isHtml && last.includes('.')) return null;

  const base = isHtml ? last.slice(0, -5) : last;

  if (segments.length >= 2) {
    // 1) El último segmento es una página real: ahí apuntaba el enlace.
    if (base === 'index') return '/';
    if (isSafeSlug(base) && pageExists(base)) return `/${base}`;

    // 2) Si no, ¿la sección de primer nivel tiene equivalente?
    const section = LEGACY_SECTIONS[`/${segments[0]}`];
    return section || null;
  }

  // Un solo segmento: si la página existe, que la sirva el flujo normal.
  if (isSafeSlug(base) && pageExists(base)) return null;

  return LEGACY_SECTIONS[`/${base}`] || null;
}

module.exports = { resolveLegacyPath, LEGACY_SECTIONS, SKIP_PREFIXES };
