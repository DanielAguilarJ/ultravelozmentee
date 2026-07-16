const express = require('express');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { ParamBuilder } = require('capi-param-builder-nodejs');
const { sendCapiEvent } = require('./js/capi');

const app = express();
const PORT = process.env.PORT || 3000;

// Servir archivos desde la raíz del proyecto (donde está server.js)
const staticPath = __dirname;

console.log(`📂 Sirviendo archivos desde: ${staticPath}`);

// Middleware para parsear JSON
app.use(express.json());

// Middleware para parsear cookies (necesario para ParamBuilder)
app.use(cookieParser());

// Habilitar compresión
app.use(compression());

// ─────────────────────────────────────────────────────────────
//  Security & SEO Headers
// ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
    // HSTS - Force HTTPS (critical for SEO: prevents duplicate HTTP/HTTPS indexing)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    // Prevent MIME-type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    // Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Permissions Policy
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

// ─────────────────────────────────────────────────────────────
//  Content Security Policy — Permitir Google, Meta y CDNs
// ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://googletagmanager.com https://www.google-analytics.com https://google-analytics.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.google.com https://connect.facebook.net https://capi-automation.s3.us-east-2.amazonaws.com https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
        "script-src-elem 'self' 'unsafe-inline' https://www.googletagmanager.com https://googletagmanager.com https://www.google-analytics.com https://google-analytics.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.google.com https://connect.facebook.net https://capi-automation.s3.us-east-2.amazonaws.com https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
        "img-src 'self' data: https: http:",
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
//  META PARAMBUILDER — Server-Side Middleware
//  Procesa _fbc, _fbp, client_ip_address en cada petición HTML
// ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
    // Solo procesar peticiones de páginas HTML (no estáticos)
    if (req.method === 'GET' && (req.path === '/' || req.path.endsWith('.html') || !req.path.includes('.'))) {
        try {
            const builder = new ParamBuilder(['ultravelozmente.com', 'localhost']);

            // Extraer query params como mapa compatible
            const params = req.query || {};

            // Procesar request — genera cookies _fbc, _fbp y extrae IP
            const cookiesToSet = builder.processRequest(
                req.headers.host,                       // host
                params,                                 // query params
                Object.assign({}, req.cookies || {}),   // cookies actuales (plain object para hasOwnProperty)
                req.headers.referer || null,             // referer (mejora precisión)
                req.headers['x-forwarded-for'] || null, // IPv6/IPv4 forwarded
                req.socket.remoteAddress || null         // IP directa
            );

            // Guardar cookies recomendadas por ParamBuilder como first-party
            if (cookiesToSet && Array.isArray(cookiesToSet)) {
                for (const cookie of cookiesToSet) {
                    res.cookie(cookie.name, cookie.value, {
                        maxAge: cookie.maxAge * 1000, // Express usa milisegundos
                        domain: cookie.domain,
                        path: '/',
                        httpOnly: false, // Permitir lectura desde JS del cliente
                        sameSite: 'Lax'
                    });
                }
            }

            // Adjuntar builder al request para uso downstream (CAPI, etc.)
            req.paramBuilder = builder;

            // Enviar evento PageView con parámetros mejorados
            sendCapiEvent('PageView', req);
        } catch (err) {
            console.error('⚠️ ParamBuilder error:', err.message);
            // Fallback: enviar PageView sin ParamBuilder
            sendCapiEvent('PageView', req);
        }
    }
    next();
});

// ─────────────────────────────────────────────────────────────
//  ENDPOINT: /api/ip — Devuelve la IP del visitante (IPv6 preferido)
//  Usado por clientParamBuilder.processAndCollectAllParams(url, getIpFn)
// ─────────────────────────────────────────────────────────────
app.get('/api/ip', (req, res) => {
    // Priorizar IPv6 de X-Forwarded-For, luego remoteAddress
    const forwardedFor = req.headers['x-forwarded-for'];
    let ip = req.socket.remoteAddress || req.ip;

    if (forwardedFor) {
        // X-Forwarded-For puede tener múltiples IPs, tomar la primera (cliente)
        const ips = forwardedFor.split(',').map(s => s.trim());
        // Preferir IPv6 si existe
        const ipv6 = ips.find(addr => addr.includes(':'));
        ip = ipv6 || ips[0] || ip;
    }

    res.json({ ip });
});

// Endpoint para recibir eventos del cliente (Pixel + CAPI)
app.post('/api/event', async (req, res) => {
    try {
        const { eventName, userData, eventId } = req.body;

        if (!eventName) {
            return res.status(400).json({ error: 'Event Name is required' });
        }

        // Crear ParamBuilder para procesar PII del evento
        try {
            const builder = new ParamBuilder(['ultravelozmente.com', 'localhost']);
            builder.processRequest(
                req.headers.host,
                req.query || {},
                Object.assign({}, req.cookies || {}),
                req.headers.referer || null,
                req.headers['x-forwarded-for'] || null,
                req.socket.remoteAddress || null
            );
            req.paramBuilder = builder;
        } catch (e) {
            console.error('⚠️ ParamBuilder POST error:', e.message);
        }

        // Enviar evento a Meta CAPI con event_id para deduplicación
        const result = await sendCapiEvent(eventName, req, userData, eventId);
        res.json({ success: true, meta_id: result?.id });
    } catch (error) {
        console.error('Error processing client event:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ─────────────────────────────────────────────────────────────
//  AUTOMATION BLOG API (Make.com Integration)
// ─────────────────────────────────────────────────────────────
const API_TOKEN = process.env.API_TOKEN || 'uv-make-automation-psy-2026';

// Middleware para autenticar peticiones de Make.com
const authenticateBlogAPI = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Falta token de autenticacion (Bearer Token)' });
    }
    const token = authHeader.split(' ')[1];
    if (token !== API_TOKEN) {
        return res.status(403).json({ error: 'Token de autenticacion invalido' });
    }
    next();
};

// Obtener listado de posts dinamicos creados por la automatización
app.get('/api/posts', (req, res) => {
    const postsJsonPath = path.join(staticPath, 'data', 'posts.json');
    if (fs.existsSync(postsJsonPath)) {
        try {
            const posts = JSON.parse(fs.readFileSync(postsJsonPath, 'utf8'));
            return res.json(posts);
        } catch (e) {
            return res.json([]);
        }
    }
    res.json([]);
});

// Crear y publicar un post bilingüe desde Make.com
app.post('/api/posts', authenticateBlogAPI, (req, res) => {
    try {
        const { title, content, category, excerpt, slug, date, author, readTime } = req.body;
        if (!title || !content || !slug) {
            return res.status(400).json({ error: 'title, content y slug son requeridos' });
        }

        // Limpiar slug para evitar nombres de archivo inválidos
        const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '');
        const filename = `blog-${cleanSlug}.html`;
        const filePath = path.join(staticPath, filename);

        const postDate = date || new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
        const postCategory = category || 'Psicoterapia';
        const postExcerpt = excerpt || 'Articulo de psicoterapia en modo terapeuta.';
        const postAuthor = author || 'Terapeuta Turbo';
        const postReadTime = readTime || '4 min de lectura';

        // Estructura HTML del nuevo post basado en la estética premium de la web
        const html = `<!DOCTYPE html>
<html lang="es-MX">
<head>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=AW-10846614576"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', 'AW-10846614576');
    </script>
    <!-- Google Tag Manager -->
    <script>(function (w, d, s, l, i) {
            w[l] = w[l] || []; w[l].push({
                'gtm.start':
                    new Date().getTime(), event: 'gtm.js'
            }); var f = d.getElementsByTagName(s)[0],
                j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : ''; j.async = true; j.src =
                    'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f);
        })(window, document, 'script', 'dataLayer', 'GTM-MWMFXQS7');</script>
    <!-- End Google Tag Manager -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | Blog WorldBrain</title>
    <meta name="description" content="${postExcerpt}">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
    <link rel="canonical" href="https://ultravelozmente.com/${filename}">
    
    <!-- Open Graph -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${postExcerpt}">
    <meta property="og:url" content="https://ultravelozmente.com/${filename}">
    <meta property="og:site_name" content="WorldBrain Mexico">
    <meta property="og:locale" content="es_MX">
    <meta property="article:published_time" content="${new Date().toISOString().split('T')[0]}">
    <meta property="article:section" content="${postCategory}">

    <!-- Theme: FOUC Prevention -->
    <script>
        (function() {
            var theme = localStorage.getItem('theme');
            if (theme === 'light' || (!theme && window.matchMedia('(prefers-color-scheme: light)').matches)) {
                document.documentElement.classList.add('light-mode');
            }
        })();
    </script>

    <link rel="stylesheet" href="css/styles.min.css">
    <link rel="stylesheet" href="css/blog.min.css">
    <link rel="stylesheet" href="css/marketing-toolkit.min.css">
    <link rel="stylesheet" href="css/footer-modern.min.css">
    <link rel="stylesheet" href="css/navbar-unified.min.css">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&family=Georgia&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">
</head>
<body>
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MWMFXQS7" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <a href="#main-content" class="nav-skip-link">Saltar al contenido</a>

    <!-- Unified Pill Navbar -->
    <nav class="nav-pill" role="navigation" aria-label="Navegaci&oacute;n principal">
        <a href="index.html" class="nav-pill-logo">World<span>Brain</span></a>
        <div class="nav-pill-links">
            <a href="index.html" class="nav-pill-link">Inicio</a>
            <a href="testimonios.html" class="nav-pill-link">Testimonios</a>
            <a href="blog-index.html" class="nav-pill-link active">Blog</a>
            <a href="https://wa.me/5215578107837?text=Hola,%20quiero%20agendar%20una%20clase%20muestra" class="btn-nav-whatsapp">
                <i class="fab fa-whatsapp"></i> Agendar Clase Muestra
            </a>
            <button id="themeToggle" class="theme-toggle-btn" aria-label="Cambiar tema">
                <i class="fas fa-moon"></i>
            </button>
        </div>
    </nav>

    <main id="main-content" style="padding-top: 100px;">
        <header class="blog-post-hero">
            <div class="container blog-post-header">
                <span class="badge" data-aos="fade-down" style="margin-bottom: 1.5rem;">
                    <i class="fas fa-brain"></i> ${postCategory}
                </span>
                <h1 class="blog-post-title" data-aos="fade-up">${title}</h1>
                <div class="blog-post-meta" data-aos="fade-up" data-aos-delay="100">
                    <span><i class="far fa-calendar"></i> ${postDate}</span>
                    <span><i class="far fa-clock"></i> ${postReadTime}</span>
                    <span><i class="far fa-user"></i> ${postAuthor}</span>
                </div>
            </div>
        </header>

        <article class="blog-content">
            ${content}

            <!-- CTA Box Warning & Referral requested by User -->
            <div class="blog-cta-box" data-aos="fade-up" style="border-left: 5px solid #2563eb; background: rgba(37, 99, 235, 0.05); padding: 2.5rem; border-radius: 12px; margin: 4rem 0; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                <h3 style="color: #2563eb; margin-top: 0; font-size: 1.5rem; font-family: 'Space Grotesk', sans-serif;"><i class="fas fa-info-circle"></i> Aspecto Preponderante</h3>
                <p style="font-size: 1.15rem; line-height: 1.7; color: var(--text-color); margin-bottom: 1.5rem;">
                    <strong>Habla con tu especialista sobre la educación de tus hijos.</strong> En WorldBrain te daremos retroalimentación directa y personalizada para guiar su potencial cognitivo y emocional de la mejor manera.
                </p>
                <p style="font-size: 1.1rem; line-height: 1.6; color: var(--text-color); margin-bottom: 1.5rem;">
                    Agenda o consulta de inmediato mediante nuestra plataforma interactiva de entrevistas para hablar con un especialista en modo turbo.
                </p>
                <a href="https://reclusive.app" target="_blank" rel="noopener noreferrer" class="btn-primary" style="display: inline-flex; align-items: center; justify-content: center; font-size: 1.1rem; padding: 1rem 2rem; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; gap: 10px; border: none; transition: background 0.2s;">
                    Hablar con Especialista (Modo Turbo) <i class="fas fa-arrow-right"></i>
                </a>
            </div>

            <div class="blog-author">
                <img src="https://randomuser.me/api/portraits/women/68.jpg" alt="Editorial Team" class="blog-author-img">
                <div class="blog-author-info">
                    <h4>${postAuthor}</h4>
                    <p>Colaboradora Editorial. Analizando las mejores prácticas mundiales de psicoterapia, relaciones y sanación emocional.</p>
                </div>
            </div>
        </article>
    </main>

    <!-- Footer Unificado WorldBrain -->
    <footer class="footer-modern" role="contentinfo">
        <div class="footer-content-wrapper">
            <div class="footer-cta-card">
                <div class="cta-content">
                    <h2>Aprende a la velocidad de tu potencial</h2>
                    <p>Agenda una clase muestra gratuita y descubre de lo que eres capaz.</p>
                    <a href="https://wa.me/5215578107837?text=Hola,%20quiero%20agendar%20una%20clase%20muestra" class="btn-cta-footer">
                        <i class="fab fa-whatsapp"></i> Agendar Clase Muestra
                    </a>
                </div>
            </div>
            <div class="footer-bottom-bar">
                <p class="footer-legal-text">CWBMX, S.C. | RFC: CWB170626UH4 | Domicilio: Av. 1 de Mayo, Mz-C24B, Loc 282-283, Col. Centro Urbano, Cuautitl&aacute;n Izcalli, Edo. de M&eacute;x., C.P. 54700.</p>
                <p class="footer-copyright">&copy; 2026 WorldBrain M&eacute;xico. Todos los derechos reservados.</p>
                <div class="footer-legal-links">
                    <a href="terminos.html">T&eacute;rminos y Condiciones</a>
                    <a href="privacidad.html">Aviso de Privacidad</a>
                    <a href="reembolsos.html">Pol&iacute;ticas de Devoluci&oacute;n</a>
                </div>
            </div>
        </div>
    </footer>

    <!-- AOS Animation Library -->
    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script>
        AOS.init({ duration: 800, once: true, offset: 100 });
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', function () {
                document.documentElement.classList.toggle('light-mode');
                var isLight = document.documentElement.classList.contains('light-mode');
                localStorage.setItem('theme', isLight ? 'light' : 'dark');
            });
        }
    </script>
</body>
</html>`;

        fs.writeFileSync(filePath, html);

        // 2. Guardar metadatos en posts.json para cargar dinámicamente en el index del blog
        const dataDir = path.join(staticPath, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
        }
        const postsJsonPath = path.join(dataDir, 'posts.json');
        let posts = [];
        if (fs.existsSync(postsJsonPath)) {
            try {
                posts = JSON.parse(fs.readFileSync(postsJsonPath, 'utf8'));
            } catch (e) {
                posts = [];
            }
        }

        // Evitar duplicados de slug en el JSON
        const existingIndex = posts.findIndex(p => p.slug === cleanSlug);
        const postMeta = {
            title,
            slug: cleanSlug,
            filename,
            category: postCategory,
            excerpt: postExcerpt,
            date: postDate,
            readTime: postReadTime,
            author: postAuthor,
            createdAt: new Date().toISOString()
        };

        if (existingIndex !== -1) {
            posts[existingIndex] = postMeta;
        } else {
            posts.unshift(postMeta); // Agregar al inicio para mostrar los más nuevos primero
        }

        fs.writeFileSync(postsJsonPath, JSON.stringify(posts, null, 2));

        res.json({ 
            success: true, 
            url: `/${filename}`, 
            slug: cleanSlug,
            message: 'Artículo publicado con éxito en tu API propia' 
        });
    } catch (error) {
        console.error('Error al guardar el post:', error);
        res.status(500).json({ error: 'Error interno del servidor al publicar' });
    }
});


// 301 Redirects for legacy URLs
app.use((req, res, next) => {
    const redirects = {
        '/curso-de-desarrollo-humanista': '/neurocomunicacion.html',
        '/curso-de-desarrollo-humanista/': '/neurocomunicacion.html',
        '/curso-de-verano-2026': '/index.html',
        '/curso-de-verano-2026/': '/index.html',
        '/curso-de-neurocomunicacion': '/neurocomunicacion.html',
        '/curso-de-neurocomunicacion/': '/neurocomunicacion.html',
        '/expansion-de-vocabulario': '/lectoescritura.html',
        '/expansion-de-vocabulario/': '/lectoescritura.html',
        '/desarrollo-humanista': '/neurocomunicacion.html',
        '/desarrollo-humanista/': '/neurocomunicacion.html',
        '/curso-neuro-comunicacion-2026': '/neurocomunicacion.html',
        '/curso-neuro-comunicacion-2026/': '/neurocomunicacion.html',
        '/fastkids': '/fastkids.html',
        '/fastkids/': '/fastkids.html',
        '/mathekids': '/mathekids.html',
        '/mathekids/': '/mathekids.html',
        '/lectoescritura': '/lectoescritura.html',
        '/lectoescritura/': '/lectoescritura.html',
        '/robotics-code-robotica-para-mentes-brillantes': '/robotics.html',
        '/robotics-code-robotica-para-mentes-brillantes/': '/robotics.html',
        '/fotolectura-lectura-rapida': '/fotolectura.html',
        '/fotolectura-lectura-rapida/': '/fotolectura.html',
        '/cursos': '/index.html',
        '/cursos/': '/index.html',
        '/courses/marketing-2023-complete-guide-to-social-growth': '/index.html',
        '/courses/marketing-2023-complete-guide-to-social-growth/': '/index.html'
    };

    const target = redirects[req.path];
    if (target) {
        return res.redirect(301, target);
    }
    next();
});

// Servir archivos estáticos desde la raíz
app.use(express.static(staticPath, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
        if (filePath.match(/\.(js|css|webp|jpg|jpeg|png|svg|woff2|woff|mp4)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        // SEO: Proper cache for sitemap and robots
        if (filePath.endsWith('sitemap.xml')) {
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        }
        if (filePath.endsWith('robots.txt')) {
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        }
        // SEO: X-Robots-Tag header for all HTML pages
        if (filePath.endsWith('.html')) {
            res.setHeader('X-Robots-Tag', 'index, follow, max-image-preview:large');
        }
    }
}));

// Rutas amigables (ej: /robotics carga robotics.html)
app.get('/:page', (req, res, next) => {
    const page = req.params.page;
    if (page.includes('.')) return next();

    const filePath = path.join(staticPath, `${page}.html`);
    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    }
    next();
});

// Fallback a index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en puerto ${PORT}`);
});
