'use strict';

/* ══════════════════════════════════════════════════════════════════
   Carga de variables desde un archivo .env — sin dependencias.

   Por qué existe: las variables se pueden configurar en el panel de
   Hostinger, pero eso depende de encontrar la sección correcta y de
   redeployar para que apliquen. Un archivo .env en la raíz de la app
   funciona igual sin importar cómo se arranque el proceso (Passenger,
   npm start, pm2 o node directo).

   Reglas:
   · Las variables YA presentes en el entorno NO se sobreescriben.
     Si el panel define una, esa gana. El .env es el respaldo.
   · Si el archivo no existe, no pasa nada: no es un error.

   El archivo .env está protegido por tres lados: server.js devuelve
   404 a cualquier ruta que empiece con "/." , está en .gitignore, y
   deploy.sh no lo incluye en el rsync (así que el .env del servidor
   sobrevive a los deploys y el local nunca lo pisa).
   ══════════════════════════════════════════════════════════════════ */

const fs = require('fs');

/**
 * Quita comillas envolventes y espacios del valor.
 * Solo desenvuelve si abre y cierra con la misma comilla.
 */
function unquote(value) {
    const trimmed = value.trim();

    const isQuoted =
        trimmed.length >= 2 &&
        (
            (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'"))
        );

    if (!isQuoted) return trimmed;

    const inner = trimmed.slice(1, -1);

    /* Solo en comillas dobles se interpretan escapes, igual que en sh */
    return trimmed.startsWith('"')
        ? inner.replace(/\\n/g, '\n').replace(/\\"/g, '"')
        : inner;
}

/**
 * Convierte el contenido de un .env en un objeto plano.
 * Ignora comentarios, líneas vacías y líneas sin "=".
 */
function parseEnv(content) {
    const out = {};

    String(content).split(/\r?\n/).forEach(rawLine => {
        const line = rawLine.trim();

        if (!line || line.startsWith('#')) return;

        /* "export FOO=bar" también es válido: la gente copia y pega */
        const withoutExport = line.startsWith('export ')
            ? line.slice(7).trim()
            : line;

        const eq = withoutExport.indexOf('=');
        if (eq <= 0) return;

        const key = withoutExport.slice(0, eq).trim();

        /* Nombre de variable válido: nada de espacios ni signos raros */
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return;

        out[key] = unquote(withoutExport.slice(eq + 1));
    });

    return out;
}

/**
 * Aplica el .env sobre process.env (o el objeto que se le pase).
 * Devuelve los nombres de las variables que sí cargó, para poder
 * registrarlas en el log sin exponer los valores.
 */
function loadEnvFile(file, target) {
    const env = target || process.env;

    if (!file || !fs.existsSync(file)) return [];

    let content;

    try {
        content = fs.readFileSync(file, 'utf8');
    } catch (err) {
        return [];
    }

    const parsed = parseEnv(content);
    const applied = [];

    Object.keys(parsed).forEach(key => {
        /* El entorno real manda: solo se rellenan los huecos. */
        if (env[key] !== undefined && env[key] !== '') return;

        env[key] = parsed[key];
        applied.push(key);
    });

    return applied;
}

module.exports = { parseEnv, unquote, loadEnvFile };
