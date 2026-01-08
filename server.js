const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Servir archivos desde la raíz del proyecto (donde está server.js)
const staticPath = __dirname;

console.log(`📂 Sirviendo archivos desde: ${staticPath}`);

// Habilitar compresión
app.use(compression());

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
