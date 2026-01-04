const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Habilitar compresión Gzip/Brotli para mejor rendimiento
app.use(compression());

// Health Check - Para verificar si el servidor está vivo
app.get('/health', (req, res) => {
    res.status(200).send('OK - Server is running');
});

// Middleware de logging básico para debug
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Cache headers para recursos estáticos (1 año para assets, 1 día para HTML)
const oneDay = 86400000;
const oneYear = 31536000000;

// Servir archivos estáticos con cache optimizado
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: oneDay, // Default: 1 día para HTML
    setHeaders: (res, filePath) => {
        // Cache largo para assets inmutables
        if (filePath.match(/\.(js|css|webp|jpg|jpeg|png|svg|woff2|woff|mp4)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        // Cache corto para HTML (permite actualizaciones rápidas)
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
        }
    }
}));

// Manejar rutas amigables (ej: /robotics carga robotics.html si existe)
app.get('/:page', (req, res, next) => {
    const page = req.params.page;
    if (page.includes('.')) return next(); // Si tiene extensión, pasar a static

    const filePath = path.join(__dirname, 'public', `${page}.html`);
    res.sendFile(filePath, (err) => {
        if (err) next();
    });
});

// Fallback a index.html para cualquier otra ruta
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en: http://localhost:${PORT}`);
    console.log(`📁 Sirviendo archivos desde: ${path.join(__dirname, 'public')}`);
});
