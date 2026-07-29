'use strict';

const express = require('express');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { ParamBuilder } = require('capi-param-builder-nodejs');

/*
 * Carga .env ANTES de cualquier lectura de process.env (API_TOKEN,
 * credenciales de aviso de leads, etc.). Las variables definidas en
 * el panel de hosting tienen prioridad: el archivo solo rellena
 * huecos. Si no hay .env, no pasa nada.
 */
const { loadEnvFile } = require('./js/env-file');
const loadedEnvKeys = loadEnvFile(path.join(__dirname, '.env'));

const { sendCapiEvent } = require('./js/capi');
const leads = require('./js/leads');

const app = express();
const PORT = process.env.PORT || 3000;
const staticPath = __dirname;
const BASE = 'https://ultravelozmente.com';

app.use(express.json());
app.use(cookieParser());
app.use(compression());
app.set('trust proxy', 1);

/* ─────────────────────────────────────────────────────────────
   PROTECCIÓN TEMPRANA DE ARCHIVOS INTERNOS
   Debe ejecutarse antes de redirects, tracking y express.static.
───────────────────────────────────────────────────────────── */

const REMOVED_PATH = /backup|-old/i;

const PRIVATE_PREFIXES = [
  '/src/',
  '/data/',
  /*
   * /var/ guarda los leads agendados (bookings.jsonl). Contiene datos
   * personales: nombre y WhatsApp. Nunca debe servirse por HTTP.
   */
  '/var/',
  '/scripts/',
  '/node_modules/',
  '/graphify-out/',
  '/redaccion-ejecutiva/src/',
  '/redaccion-ejecutiva/node_modules/',
  '/redaccion-ejecutiva/.next/'
];

const PRIVATE_FILES = new Set([
  '/server.js',
  '/package.json',
  '/package-lock.json',
  '/README.md',
  '/deploy.sh',
  '/check.sh',
  '/.eleventy.js',
  '/js/capi.js',
  '/js/leads.js',
  '/js/env-file.js',
  '/fix_founding_year.py',
  '/fix_fake_testimonials.py',
  '/update_global_testimonials.py',
  '/redaccion-ejecutiva/package.json',
  '/redaccion-ejecutiva/package-lock.json'
]);

const PRIVATE_EXTENSION =
  /\.(?:py|sh|md|njk|tsx?|jsx?|map|lock|ya?ml|toml)$/i;

function startsWithPrivatePrefix(requestPath) {
  return PRIVATE_PREFIXES.some(prefix => {
    const withoutSlash = prefix.slice(0, -1);

    return (
      requestPath === withoutSlash ||
      requestPath.startsWith(prefix)
    );
  });
}

app.use((req, res, next) => {
  /*
   * Los backups eliminados responden 410 directamente.
   * No deben redirigir al home ni pasar primero por .html → URL limpia.
   */
  if (
    REMOVED_PATH.test(req.path) ||
    req.path === '/_archive' ||
    req.path.startsWith('/_archive/')
  ) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(410).type('text/plain').send('Contenido eliminado');
  }

  const hiddenFile =
    req.path.startsWith('/.') &&
    !req.path.startsWith('/.well-known/');

  if (
    hiddenFile ||
    PRIVATE_FILES.has(req.path) ||
    startsWithPrivatePrefix(req.path) ||
    PRIVATE_EXTENSION.test(req.path)
  ) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(404).type('text/plain').send('Not found');
  }

  next();
});

// ─────────────────────────────────────────────────────────────
// 1) CANONICALIZACIÓN — SIEMPRE PRIMERO (antes de analytics,
//    para no disparar PageView en redirects)
//    Una sola URL por página: https, sin www, sin .html, sin /
// ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const CANONICAL_HOST = 'ultravelozmente.com';

  const forwardedProto =
    req.headers['x-forwarded-proto'] || req.protocol || '';

  const proto = String(forwardedProto)
    .split(',')[0]
    .trim()
    .toLowerCase();

  const hostname = String(req.headers.host || '')
    .split(':')[0]
    .trim()
    .toLowerCase();

  /*
   * No construimos el redirect usando el Host enviado por el cliente.
   * Todas las variantes convergen directamente en BASE.
   */
  if (
    process.env.NODE_ENV === 'production' &&
    (proto !== 'https' || hostname !== CANONICAL_HOST)
  ) {
    return res.redirect(301, `${BASE}${req.originalUrl}`);
  }
  // /index.html y /index → /
  if (req.path === '/index.html' || req.path === '/index') {
    return res.redirect(301, '/');
  }
  // .html → URL limpia
  if (req.path.endsWith('.html')) {
    const qs = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
    return res.redirect(301, req.path.slice(0, -5) + qs);
  }
  // trailing slash (excepto raíz)
  if (req.path.length > 1 && req.path.endsWith('/')) {
    return res.redirect(301, req.path.slice(0, -1));
  }
  next();
});

// ─────────────────────────────────────────────────────────────
// 2) REDIRECTS LEGACY — AUDITADOS: targets limpios (sin .html)
//    FIX: antes apuntaban a .html → bucle infinito con el
//    middleware canónico. Eliminadas las entradas /curso → /curso.html
//    (la ruta limpia ya las sirve directo, sin redirect).
// ─────────────────────────────────────────────────────────────
const LEGACY = {
  '/curso-de-desarrollo-humanista': '/neurocomunicacion',
  '/curso-de-verano-2026': '/',
  '/curso-de-neurocomunicacion': '/neurocomunicacion',
  '/expansion-de-vocabulario': '/lectoescritura',
  '/desarrollo-humanista': '/neurocomunicacion',
  '/curso-neuro-comunicacion-2026': '/neurocomunicacion',
  '/robotics-code-robotica-para-mentes-brillantes': '/robotics',
  '/fotolectura-lectura-rapida': '/fotolectura',
  '/cursos': '/',
  '/courses/marketing-2023-complete-guide-to-social-growth': '/'
};
app.use((req, res, next) => {
  const target = LEGACY[req.path];
  if (target) return res.redirect(301, target);
  next();
});

// ─────────────────────────────────────────────────────────────
// 3) SECURITY & SEO HEADERS
// ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://googletagmanager.com https://www.google-analytics.com https://google-analytics.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.google.com https://connect.facebook.net https://capi-automation.s3.us-east-2.amazonaws.com https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
    "script-src-elem 'self' 'unsafe-inline' https://www.googletagmanager.com https://googletagmanager.com https://www.google-analytics.com https://google-analytics.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.google.com https://connect.facebook.net https://capi-automation.s3.us-east-2.amazonaws.com https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://www.google-analytics.com https://google-analytics.com https://www.googletagmanager.com https://googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://analytics.google.com https://stats.g.doubleclick.net https://www.facebook.com https://connect.facebook.net https://capi-automation.s3.us-east-2.amazonaws.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
    "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
    "frame-src 'self' https://www.googletagmanager.com https://td.doubleclick.net https://www.google.com https://www.facebook.com",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; '));
  next();
});

// ─────────────────────────────────────────────────────────────
// 4) META CAPI / ParamBuilder
//    FIX: excluye /api/ y /.well-known/ (antes disparaba
//    PageView en llamadas de API → analytics contaminado)
// ─────────────────────────────────────────────────────────────
function isPageRequest(requestPath) {
  if (requestPath === '/') {
    return true;
  }

  /*
   * Las páginas públicas limpias solo tienen un segmento.
   * Evita tracking de API, 404, archivos y rutas internas.
   */
  if (!/^\/[a-z0-9_-]+$/i.test(requestPath)) {
    return false;
  }

  const page = requestPath.slice(1);

  if (
    page === '404' ||
    page.includes('backup') ||
    page.includes('-old')
  ) {
    return false;
  }

  const filePath = path.join(staticPath, `${page}.html`);
  return fs.existsSync(filePath);
}

app.use((req, res, next) => {
  if (req.method === 'GET' && (req.path === '/' || isPageRequest(req.path))) {
    try {
      const builder = new ParamBuilder(['ultravelozmente.com', 'localhost']);
      const cookiesToSet = builder.processRequest(
        req.headers.host,
        req.query || {},
        Object.assign({}, req.cookies || {}),
        req.headers.referer || null,
        req.headers['x-forwarded-for'] || null,
        req.socket.remoteAddress || null
      );
      if (Array.isArray(cookiesToSet)) {
        for (const c of cookiesToSet) {
          res.cookie(c.name, c.value, {
            maxAge: c.maxAge * 1000,
            domain: c.domain,
            path: '/',
            httpOnly: false,
            sameSite: 'Lax'
          });
        }
      }
      req.paramBuilder = builder;
      sendCapiEvent('PageView', req);
    } catch (err) {
      console.error('⚠️ ParamBuilder error:', err.message);
      sendCapiEvent('PageView', req);
    }
  }
  next();
});

// ─────────────────────────────────────────────────────────────
// 4.5) RATE LIMIT — /api/event es público y reenvía a Meta CAPI.
// Sin límite, un bot infla conversiones y contamina la
// optimización de campañas. Ventana fija en memoria: suficiente
// para 1 instancia; si escalas horizontal, migrar a Redis.
// ─────────────────────────────────────────────────────────────
const rateBuckets = new Map();
const RATE_LIMIT = { windowMs: 60_000, max: 20 }; // 20 eventos/min/IP

setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT.windowMs;
  for (const [ip, bucket] of rateBuckets) {
    if (bucket.start < cutoff) rateBuckets.delete(ip);
  }
}, 5 * 60_000).unref(); // limpieza pasiva, no bloquea el shutdown

function rateLimit(req, res, next) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const bucket = rateBuckets.get(ip);

  if (!bucket || now - bucket.start > RATE_LIMIT.windowMs) {
    rateBuckets.set(ip, { start: now, count: 1 });
    return next();
  }
  if (++bucket.count > RATE_LIMIT.max) {
    res.setHeader('Retry-After', Math.ceil(RATE_LIMIT.windowMs / 1000));
    return res.status(429).json({ error: 'Demasiadas solicitudes' });
  }
  next();
}

// ─────────────────────────────────────────────────────────────
// 5) API — IP y eventos de cliente
// ─────────────────────────────────────────────────────────────
app.get('/api/ip', (req, res) => {
  const fwd = req.headers['x-forwarded-for'];
  let ip = req.socket.remoteAddress || req.ip;
  if (fwd) {
    const ips = fwd.split(',').map(s => s.trim());
    ip = ips.find(a => a.includes(':')) || ips[0] || ip;
  }
  res.json({ ip });
});

app.post('/api/event', rateLimit, async (req, res) => {
  try {
    const { eventName, userData, eventId } = req.body;
    if (!eventName) return res.status(400).json({ error: 'Event Name is required' });
    try {
      const builder = new ParamBuilder(['ultravelozmente.com', 'localhost']);
      builder.processRequest(
        req.headers.host, req.query || {},
        Object.assign({}, req.cookies || {}),
        req.headers.referer || null,
        req.headers['x-forwarded-for'] || null,
        req.socket.remoteAddress || null
      );
      req.paramBuilder = builder;
    } catch (e) { console.error('⚠️ ParamBuilder POST error:', e.message); }
    const result = await sendCapiEvent(eventName, req, userData, eventId);
    res.json({ success: true, meta_id: result?.id });
  } catch (error) {
    console.error('Error processing client event:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─────────────────────────────────────────────────────────────
// 5.5) API DE LEADS — /api/bookings
//
// Antes de esto, agendar una cita no avisaba a nadie: booking.js
// armaba un enlace de Google Calendar para el calendario DEL
// VISITANTE y guardaba la reserva en memoria. El lead se perdía.
//
// Orden deliberado: se persiste PRIMERO en disco y se notifica
// DESPUÉS. Si Telegram o el webhook fallan, el lead ya está a salvo
// y se puede recuperar del archivo.
//
// La respuesta al visitante nunca depende de la notificación: si el
// aviso falla, él ve su cita confirmada igual.
// ─────────────────────────────────────────────────────────────
const BOOKINGS_FILE = leads.resolveFile(process.env, __dirname);

/* Se registran los NOMBRES, nunca los valores: el log no debe
   filtrar tokens. */
if (loadedEnvKeys.length) {
  console.log('🔑 .env cargado: ' + loadedEnvKeys.join(', '));
}

const NOTIFY_CHANNELS = [
  process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID && 'Telegram',
  process.env.BOOKING_WEBHOOK_URL && 'webhook',
  process.env.RESEND_API_KEY && process.env.BOOKING_EMAIL_TO && 'email'
].filter(Boolean);

if (!NOTIFY_CHANNELS.length) {
  console.warn(
    '⚠️  Sin canales de aviso de leads. Las citas se guardan en ' +
    BOOKINGS_FILE + ' pero nadie recibe notificación. ' +
    'Configura TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID, ' +
    'BOOKING_WEBHOOK_URL o RESEND_API_KEY + BOOKING_EMAIL_TO.'
  );
} else {
  console.log('📣 Avisos de leads por: ' + NOTIFY_CHANNELS.join(', '));
}

app.post('/api/bookings', rateLimit, async (req, res) => {
  const result = leads.validateLead(req.body);

  if (!result.ok) {
    return res.status(400).json({
      error: 'Datos incompletos',
      fields: result.errors
    });
  }

  const record = result.value;

  /* 1 · Persistir. Si esto falla, sí es un error del servidor: el
     lead se estaría perdiendo y hay que enterarse. */
  try {
    leads.appendLead(record, BOOKINGS_FILE);
  } catch (err) {
    console.error('⛔ LEAD NO GUARDADO:', err.message, JSON.stringify(record));
    return res.status(500).json({ error: 'No se pudo registrar la cita' });
  }

  /* 2 · Responder ya: el visitante no espera a Telegram. */
  res.json({ success: true, stage: record.stage });

  /* 3 · Notificar en segundo plano. */
  try {
    const outcome = await leads.notifyLead(record, process.env);
    const failed = outcome.filter(item => !item.ok);

    if (failed.length) {
      console.error(
        '⚠️ Aviso de lead falló (' +
        failed.map(f => f.channel + ': ' + f.error).join('; ') +
        ') — el lead sí quedó en ' + BOOKINGS_FILE
      );
    }
  } catch (err) {
    console.error('⚠️ Error notificando lead:', err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// 6) BLOG API (Make.com) — FIX: token SOLO por env, sin fallback
//    ⚠️ ROTA el token viejo hoy: quedó público en GitHub
// ─────────────────────────────────────────────────────────────
const API_TOKEN = process.env.API_TOKEN;
if (!API_TOKEN) console.warn('⚠️  API_TOKEN no configurado: API de blog deshabilitada.');

const authenticateBlogAPI = (req, res, next) => {
  if (!API_TOKEN) return res.status(503).json({ error: 'API no disponible' });
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ') || h.split(' ')[1] !== API_TOKEN) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
};

/*
 * Consulta de leads. Protegida con API_TOKEN porque devuelve datos
 * personales (nombre y WhatsApp de menores de edad en muchos casos).
 * Uso:
 *   curl -H "Authorization: Bearer $API_TOKEN" \
 *        https://ultravelozmente.com/api/bookings?limit=20
 */
app.get('/api/bookings', authenticateBlogAPI, (req, res) => {
  const limit = Math.min(
    Math.max(parseInt(req.query.limit, 10) || 50, 1),
    500
  );

  try {
    const items = leads.readLeads(BOOKINGS_FILE, limit);

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');

    res.json({ count: items.length, items });
  } catch (err) {
    console.error('Error leyendo leads:', err.message);
    res.status(500).json({ error: 'No se pudo leer el registro' });
  }
});

app.get('/api/posts', (req, res) => {
  const p = path.join(staticPath, 'data', 'posts.json');
  if (fs.existsSync(p)) {
    try { return res.json(JSON.parse(fs.readFileSync(p, 'utf8'))); } catch (e) { /* fallthrough */ }
  }
  res.json([]);
});

app.post('/api/posts', authenticateBlogAPI, (req, res) => {
  try {
    const { title, content, category, excerpt, slug, date, author, readTime } = req.body;
    if (!title || !content || !slug) {
      return res.status(400).json({ error: 'title, content y slug son requeridos' });
    }
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    const filename = `blog-${cleanSlug}.html`;
    const postDate = date || new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    const meta = {
      title, slug: cleanSlug, filename,
      category: category || 'Educación',
      excerpt: excerpt || 'Artículo del blog educativo WorldBrain.',
      date: postDate,
      readTime: readTime || '4 min de lectura',
      author: author || 'Equipo Editorial WorldBrain',
      createdAt: new Date().toISOString()
    };
    const html = buildBlogHtml(meta, content);
    fs.writeFileSync(path.join(staticPath, filename), html);

    const dataDir = path.join(staticPath, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
    const postsPath = path.join(dataDir, 'posts.json');
    let posts = [];
    if (fs.existsSync(postsPath)) {
      try { posts = JSON.parse(fs.readFileSync(postsPath, 'utf8')); } catch (e) { posts = []; }
    }
    const i = posts.findIndex(p => p.slug === cleanSlug);
    if (i !== -1) posts[i] = meta; else posts.unshift(meta);
    fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2));
    sitemapCache = null; // invalidar: el nuevo post entra al sitemap al instante
    res.json({ success: true, url: `/blog-${cleanSlug}`, slug: cleanSlug });
  } catch (error) {
    console.error('Error al guardar el post:', error);
    res.status(500).json({ error: 'Error interno al publicar' });
  }
});

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function jsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function buildBlogHtml(m, content) {
  const url = `${BASE}/blog-${m.slug}`;
  const image = `${BASE}/images/fl-hero-brain.webp`;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: m.title,
    description: m.excerpt,
    url,
    image,
    datePublished: m.createdAt,
    dateModified: m.updatedAt || m.createdAt,
    inLanguage: 'es-MX',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url
    },
    author: {
      '@type': 'Organization',
      name: m.author || 'Equipo Editorial WorldBrain',
      url: BASE
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${BASE}/#organization`,
      name: 'WorldBrain México',
      logo: {
        '@type': 'ImageObject',
        url: `${BASE}/images/logo.svg`
      }
    }
  };

  return `<!DOCTYPE html>
<html lang="es-MX">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(m.title)} | Blog WorldBrain México</title>
<meta name="description" content="${escapeHtml(m.excerpt)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">

<link rel="canonical" href="${url}">

<meta property="og:locale" content="es_MX">
<meta property="og:type" content="article">
<meta property="og:site_name" content="WorldBrain México">
<meta property="og:title" content="${escapeHtml(m.title)}">
<meta property="og:description" content="${escapeHtml(m.excerpt)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(m.title)}">
<meta name="twitter:description" content="${escapeHtml(m.excerpt)}">
<meta name="twitter:image" content="${image}">

<meta property="article:published_time" content="${m.createdAt}">
<meta property="article:modified_time" content="${m.updatedAt || m.createdAt}">

<script type="application/ld+json">
${jsonLd(articleSchema)}
</script>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{--porcelain:#F6F4EE;--ink:#161512;--ink-60:rgba(22,21,18,.6);--klein:#2B36E8}
body{margin:0;font-family:'Geist',sans-serif;background:var(--porcelain);color:var(--ink);line-height:1.7}
.wrap{max-width:720px;margin:0 auto;padding:4rem 24px}
h1{font-family:'Instrument Serif',serif;font-weight:400;font-size:clamp(2rem,5vw,3.2rem);line-height:1.1}
.meta{font-family:monospace;font-size:.7rem;letter-spacing:.15em;text-transform:uppercase;color:var(--ink-60);margin:1rem 0 2.5rem}
article p{margin-bottom:1.2rem;color:var(--ink-60)}
article h2,article h3{font-family:'Instrument Serif',serif;font-weight:400;color:var(--ink);margin:2rem 0 .8rem}
.cta{background:var(--ink);color:var(--porcelain);border-radius:18px;padding:2rem;margin-top:3rem;text-align:center}
.cta a{display:inline-block;background:var(--klein);color:#fff;text-decoration:none;padding:.9rem 1.7rem;border-radius:999px;font-weight:500;margin-top:1rem}
nav a{color:var(--ink);text-decoration:none;font-weight:500}
</style>
</head>
<body>
<div class="wrap">
<nav><a href="/">← WorldBrain</a> · <a href="/blog-index">Blog</a></nav>
<h1>${escapeHtml(m.title)}</h1>
<p class="meta">${escapeHtml(m.category)} · ${escapeHtml(m.date)} · ${escapeHtml(m.readTime)} · ${escapeHtml(m.author)}</p>
<article>${content}</article>
<div class="cta">
<h3 style="font-family:'Instrument Serif',serif;font-weight:400;margin:0">Aprende a la velocidad de tu potencial</h3>
<p style="color:rgba(246,244,238,.7)">Agenda una clase muestra gratuita y descubre de lo que eres capaz.</p>
<a href="https://wa.me/525578107837?text=Hola,%20quiero%20agendar%20una%20clase%20muestra">Agendar clase muestra</a>
</div>
</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────
// 7) SITEMAP DINÁMICO — cacheado en memoria (TTL 1h)
// ─────────────────────────────────────────────────────────────
let sitemapCache = null, sitemapCacheAt = 0;

app.get('/sitemap.xml', (req, res) => {
  if (!sitemapCache || Date.now() - sitemapCacheAt > 36e5) {
    const PAGES = [
      { f: 'index.html', u: '/', p: '1.0', c: 'weekly' },
      { f: 'fotolectura.html', u: '/fotolectura', p: '0.9', c: 'monthly' },
      { f: 'mathekids.html', u: '/mathekids', p: '0.9', c: 'monthly' },
      { f: 'robotics.html', u: '/robotics', p: '0.9', c: 'monthly' },
      { f: 'fastkids.html', u: '/fastkids', p: '0.9', c: 'monthly' },
      { f: 'homeschool.html', u: '/homeschool', p: '0.9', c: 'monthly' },
      { f: 'admision-universitaria.html', u: '/admision-universitaria', p: '0.9', c: 'monthly' },
      { f: 'memoria-prodigiosa.html', u: '/memoria-prodigiosa', p: '0.9', c: 'monthly' },
      { f: 'comipems.html', u: '/comipems', p: '0.9', c: 'monthly' },
      { f: 'diplomado-matematicas-fisica.html', u: '/diplomado-matematicas-fisica', p: '0.8', c: 'monthly' },
      { f: 'juniormath_v2.html', u: '/juniormath_v2', p: '0.8', c: 'monthly' },
      { f: 'lectoescritura.html', u: '/lectoescritura', p: '0.8', c: 'monthly' },
      { f: 'neurocomunicacion.html', u: '/neurocomunicacion', p: '0.8', c: 'monthly' },
      { f: 'grandes-lideres.html', u: '/grandes-lideres', p: '0.8', c: 'monthly' },
      { f: 'universidad-dominical.html', u: '/universidad-dominical', p: '0.8', c: 'monthly' },
      { f: 'regularizacion-express.html', u: '/regularizacion-express', p: '0.8', c: 'monthly' },
      { f: 'ciencia-astronomia.html', u: '/ciencia-astronomia', p: '0.7', c: 'monthly' },
      { f: 'alfa-cash.html', u: '/alfa-cash', p: '0.7', c: 'monthly' },
      { f: 'redaccion-ejecutiva.html', u: '/redaccion-ejecutiva', p: '0.7', c: 'monthly' },
      { f: 'testimonios.html', u: '/testimonios', p: '0.7', c: 'monthly' },
      { f: 'blog-index.html', u: '/blog-index', p: '0.7', c: 'weekly' },
      { f: 'privacidad.html', u: '/privacidad', p: '0.3', c: 'yearly' },
      { f: 'terminos.html', u: '/terminos', p: '0.3', c: 'yearly' },
      { f: 'reembolsos.html', u: '/reembolsos', p: '0.3', c: 'yearly' }
    ];
    // Blogs: estáticos + generados por Make.com — auto-descubiertos.
    // AUDITADO: excluye backups y archivos "-old" (no deben indexarse)
    fs.readdirSync(staticPath)
      .filter(f => f.startsWith('blog-') && f.endsWith('.html')
        && f !== 'blog-index.html' && !f.includes('backup') && !f.includes('-old'))
      .forEach(f => PAGES.push({ f, u: '/' + f.slice(0, -5), p: '0.6', c: 'monthly' }));

    const rows = PAGES.map(pg => {
      let lastmod = '';
      try {
        lastmod = `\n    <lastmod>${fs.statSync(path.join(staticPath, pg.f)).mtime.toISOString().slice(0, 10)}</lastmod>`;
      } catch (e) { return null; } // archivo inexistente: fuera del sitemap
      return `  <url>\n    <loc>${BASE}${pg.u}</loc>${lastmod}\n    <changefreq>${pg.c}</changefreq>\n    <priority>${pg.p}</priority>\n  </url>`;
    }).filter(Boolean).join('\n');

    sitemapCache = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>`;
    sitemapCacheAt = Date.now();
  }
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(sitemapCache);
});

// ─────────────────────────────────────────────────────────────
// 8) HEADERS COMPARTIDOS
// ─────────────────────────────────────────────────────────────
function applyFileHeaders(res, filePath) {
  if (filePath.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');

    if (path.basename(filePath) === '404.html') {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    } else {
      res.setHeader(
        'X-Robots-Tag',
        'index, follow, max-image-preview:large'
      );
    }
  } else if (/\.(webp|jpg|jpeg|png|svg|woff2|woff|mp4)$/.test(filePath)) {
    res.setHeader(
      'Cache-Control',
      'public, max-age=31536000, immutable'
    );
  } else if (/\.(js|css)$/.test(filePath)) {
    res.setHeader(
      'Cache-Control',
      'public, max-age=86400, stale-while-revalidate=604800'
    );
  }

  if (filePath.endsWith('robots.txt')) {
    /*
     * Cinco minutos durante la estabilización SEO.
     * Después puedes volver a 86400.
     */
    res.setHeader(
      'Cache-Control',
      'public, max-age=300, must-revalidate'
    );

    res.setHeader(
      'Content-Type',
      'text/plain; charset=utf-8'
    );
  }
}

// Archivos estáticos (css, js, imágenes; el sitemap ya fue interceptado arriba)
app.use(express.static(staticPath, {
  setHeaders: applyFileHeaders,
  index: 'index.html'
}));

// ─────────────────────────────────────────────────────────────
// 9) RUTAS LIMPIAS — /fotolectura sirve fotolectura.html
// ─────────────────────────────────────────────────────────────
app.get('/404', (req, res) => {
  res.status(404);
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  const filePath = path.join(staticPath, '404.html');
  return res.sendFile(filePath);
});

app.get('/:page', (req, res, next) => {
  const page = req.params.page;
  if (page.includes('.') || page.includes('backup') || page.includes('-old')) return next();
  const filePath = path.join(staticPath, `${page}.html`);
  // path.join + validación: sin traversal posible (":page" no admite "/")
  if (fs.existsSync(filePath)) {
    applyFileHeaders(res, filePath);
    return res.sendFile(filePath);
  }
  next();
});

// ─────────────────────────────────────────────────────────────
// 10) 404 REAL — el fin del soft-404. Última línea de defensa.
// ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404);
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store');
  const nf = path.join(staticPath, '404.html');
  if (fs.existsSync(nf)) return res.sendFile(nf);
  res.type('html').send('<!DOCTYPE html><html lang="es-MX"><head><meta charset="UTF-8"><title>404</title></head><body style="font-family:sans-serif;text-align:center;padding:4rem"><h1>404</h1><p>Esta página no existe.</p><a href="/">← Volver al inicio</a></body></html>');
});

// ─────────────────────────────────────────────────────────────
// 11) STARTUP AUDIT — el server se niega a arrancar limpio si
// detecta contenido vetado. Ruido temprano > vergüenza tardía.
// En producción solo advierte (no tira el sitio por un warning);
// en desarrollo falla duro para que se arregle antes del push.
// ─────────────────────────────────────────────────────────────
(function startupAudit() {
  const BANNED = [/pravatar\.cc/, /randomuser\.me/];
  const offenders = fs.readdirSync(staticPath)
    .filter(f => f.endsWith('.html') && !f.includes('backup') && !f.includes('-old'))
    .filter(f => {
      const html = fs.readFileSync(path.join(staticPath, f), 'utf8');
      return BANNED.some(rx => rx.test(html));
    });

  if (offenders.length) {
    const msg = `⛔ AUDIT: contenido vetado (avatares falsos) en: ${offenders.join(', ')}`;
    if (process.env.NODE_ENV === 'production') {
      console.error(msg + ' — CORRIGE HOY: python3 fix_fake_testimonials.py');
    } else {
      throw new Error(msg);
    }
  } else {
    console.log('✅ AUDIT: contenido limpio.');
  }
})();

app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en puerto ${PORT} — canónica: ${BASE}`);
});
