const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Determinar automáticamente dónde están los archivos estáticos
let staticPath;

// Intentar diferentes ubicaciones posibles
const possiblePaths = [
    path.join(__dirname, 'public'),           // Estructura normal: ./public
    __dirname,                                  // Archivos en la raíz
    path.join(process.cwd(), 'public'),        // CWD/public
    process.cwd()                               // CWD (raíz)
];

for (const testPath of possiblePaths) {
    if (fs.existsSync(path.join(testPath, 'index.html'))) {
        staticPath = testPath;
        console.log(`✅ Archivos encontrados en: ${testPath}`);
        break;
    }
}

if (!staticPath) {
    console.error('❌ ERROR: No se encontró index.html en ninguna ubicación conocida');
    console.error('Rutas probadas:', possiblePaths);
    staticPath = path.join(__dirname, 'public'); // Fallback
}

// Habilitar compresión
app.use(compression());

// Ruta de diagnóstico
app.get('/debug', (req, res) => {
    let info = {
        dirname: __dirname,
        cwd: process.cwd(),
        staticPath: staticPath,
        filesInStatic: []
    };

    try {
        info.filesInStatic = fs.readdirSync(staticPath);
    } catch (err) {
        info.error = err.message;
    }

    res.json(info);
});

// Servir archivos estáticos
app.use(express.static(staticPath, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
        if (filePath.match(/\.(js|css|webp|jpg|jpeg|png|svg|woff2|woff|mp4)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
}));

// Rutas amigables
app.get('/:page', (req, res, next) => {
    const page = req.params.page;
    if (page.includes('.') || page === 'debug') return next();

    const filePath = path.join(staticPath, `${page}.html`);
    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    }
    next();
});

// Fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor en puerto ${PORT}`);
    console.log(`📂 Sirviendo desde: ${staticPath}`);
});
