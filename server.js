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
