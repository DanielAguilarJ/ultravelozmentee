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
