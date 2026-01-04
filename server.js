const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Habilitar compresión
app.use(compression());

// Logger para ver qué está pidiendo el navegador
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Ruta de diagnóstico para ver carpetas en Hostinger
app.get('/debug-fs', (req, res) => {
    const rootDir = __dirname;
    const publicDir = path.join(rootDir, 'public');

    let report = `Base Dir: ${rootDir}\n`;
    report += `Public Dir: ${publicDir}\n\n`;

    try {
        report += `Files in Root:\n${fs.readdirSync(rootDir).join('\n')}\n\n`;
        if (fs.existsSync(publicDir)) {
            report += `Files in Public:\n${fs.readdirSync(publicDir).join('\n')}\n`;
        } else {
            report += `ERROR: Public directory NOT FOUND at ${publicDir}\n`;
        }
    } catch (err) {
        report += `Error reading files: ${err.message}`;
    }

    res.header('Content-Type', 'text/plain');
    res.send(report);
});

// Servir archivos estáticos con configuración robusta
const publicPath = path.resolve(__dirname, 'public');
app.use(express.static(publicPath, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
        if (filePath.match(/\.(js|css|webp|jpg|jpeg|png|svg|woff2|woff|mp4)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
}));

// Manejar rutas amigables (/fotolectura -> fotolectura.html)
app.get('/:page', (req, res, next) => {
    const page = req.params.page;

    // Ignorar si tiene extensión (ya debería haberlo manejado el static)
    if (page.includes('.')) return next();

    const filePath = path.join(publicPath, `${page}.html`);
    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    }
    next();
});

// Fallback a index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📂 Ruta de archivos: ${publicPath}`);
});
