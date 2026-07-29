'use strict';

/* ══════════════════════════════════════════════════════════════════
   Carga de .env sin dependencias.

   Regla que sostiene todo lo demás: el entorno real (el panel de
   hosting) SIEMPRE gana sobre el archivo. Si esto se invirtiera, un
   .env viejo olvidado en el servidor podría sobreescribir el token
   bueno configurado en el panel y los avisos dejarían de llegar sin
   que nada falle a la vista.
   ══════════════════════════════════════════════════════════════════ */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { parseEnv, unquote, loadEnvFile } = require('../js/env-file');

function writeTmp(content) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-env-'));
    const file = path.join(dir, '.env');
    fs.writeFileSync(file, content, 'utf8');
    return file;
}

/* ── Parseo ──────────────────────────────────────────────────── */

test('parsea pares simples', () => {
    const out = parseEnv('FOO=bar\nBAZ=qux');

    assert.deepEqual(out, { FOO: 'bar', BAZ: 'qux' });
});

test('ignora comentarios y líneas vacías', () => {
    const out = parseEnv('# comentario\n\nFOO=bar\n   # otro\n');

    assert.deepEqual(out, { FOO: 'bar' });
});

test('acepta el prefijo export que la gente copia y pega', () => {
    assert.deepEqual(parseEnv('export TOKEN=abc123'), { TOKEN: 'abc123' });
});

test('conserva los dos puntos del token de Telegram', () => {
    /* El token tiene forma 12345:AAF... — si se partiera por ":" o
       se recortara, el bot dejaría de autenticar. */
    const out = parseEnv('TELEGRAM_BOT_TOKEN=1234567890:AAFejemplo-Falso_dePrueba');

    assert.equal(out.TELEGRAM_BOT_TOKEN, '1234567890:AAFejemplo-Falso_dePrueba');
});

test('acepta valores con signo igual dentro', () => {
    assert.equal(parseEnv('URL=https://x.com/?a=1&b=2').URL,
        'https://x.com/?a=1&b=2');
});

test('respeta espacios alrededor del igual', () => {
    assert.deepEqual(parseEnv('FOO = bar '), { FOO: 'bar' });
});

test('descarta nombres de variable inválidos', () => {
    const out = parseEnv('MI VARIABLE=x\n123ABC=y\nBUENA=z\n=huerfano');

    assert.deepEqual(out, { BUENA: 'z' });
});

test('ignora líneas sin igual', () => {
    assert.deepEqual(parseEnv('esto es basura\nFOO=bar'), { FOO: 'bar' });
});

test('un valor vacío se conserva como cadena vacía', () => {
    /* .env.example trae claves vacías: no deben volverse "undefined" */
    assert.deepEqual(parseEnv('API_TOKEN='), { API_TOKEN: '' });
});

/* ── Comillas ────────────────────────────────────────────────── */

test('quita comillas envolventes', () => {
    assert.equal(unquote('"hola"'), 'hola');
    assert.equal(unquote("'hola'"), 'hola');
});

test('no quita comillas desparejas', () => {
    assert.equal(unquote('"hola'), '"hola');
    assert.equal(unquote('hola"'), 'hola"');
});

test('conserva comillas internas', () => {
    assert.equal(unquote('WorldBrain <avisos@wb.com>'),
        'WorldBrain <avisos@wb.com>');
});

test('interpreta \\n solo dentro de comillas dobles', () => {
    assert.equal(unquote('"linea1\\nlinea2"'), 'linea1\nlinea2');
    assert.equal(unquote("'linea1\\nlinea2'"), 'linea1\\nlinea2');
});

/* ── Aplicación sobre el entorno ─────────────────────────────── */

test('el entorno real gana sobre el archivo', () => {
    const file = writeTmp('TELEGRAM_BOT_TOKEN=del-archivo\nOTRA=nueva');
    const env = { TELEGRAM_BOT_TOKEN: 'del-panel' };

    const applied = loadEnvFile(file, env);

    assert.equal(env.TELEGRAM_BOT_TOKEN, 'del-panel',
        'un .env olvidado no debe pisar el token del panel');
    assert.equal(env.OTRA, 'nueva', 'los huecos sí se rellenan');
    assert.deepEqual(applied, ['OTRA']);
});

test('una variable presente pero vacía sí se rellena', () => {
    const file = writeTmp('API_TOKEN=valor-real');
    const env = { API_TOKEN: '' };

    loadEnvFile(file, env);

    assert.equal(env.API_TOKEN, 'valor-real');
});

test('devuelve los nombres cargados para poder registrarlos sin valores', () => {
    const file = writeTmp('TELEGRAM_BOT_TOKEN=secreto\nTELEGRAM_CHAT_ID=123');
    const env = {};

    const applied = loadEnvFile(file, env);

    assert.deepEqual(applied.sort(), ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']);
    assert.ok(!applied.join(' ').includes('secreto'),
        'la lista trae nombres, nunca valores');
});

test('un archivo inexistente no es un error', () => {
    const env = {};

    assert.deepEqual(loadEnvFile('/ruta/que/no/existe/.env', env), []);
    assert.deepEqual(env, {});
});

test('tolera que no se pase ruta', () => {
    assert.deepEqual(loadEnvFile(null, {}), []);
});

test('carga el formato real de .env.example sin romperse', () => {
    const file = writeTmp([
        '# Comentario de cabecera',
        'NODE_ENV=production',
        'PORT=3000',
        'API_TOKEN=',
        '',
        '# ── 1. Telegram',
        'TELEGRAM_BOT_TOKEN=1234567890:AAFejemploFalsoDePrueba',
        'TELEGRAM_CHAT_ID=-1009876543210',
        'BOOKINGS_FILE=var/bookings.jsonl',
        'BOOKING_EMAIL_FROM=WorldBrain <avisos@ultravelozmente.com>'
    ].join('\n'));

    const env = {};
    loadEnvFile(file, env);

    assert.equal(env.NODE_ENV, 'production');
    assert.equal(env.TELEGRAM_BOT_TOKEN, '1234567890:AAFejemploFalsoDePrueba');
    assert.equal(env.TELEGRAM_CHAT_ID, '-1009876543210');
    assert.equal(env.BOOKINGS_FILE, 'var/bookings.jsonl');
    assert.equal(env.BOOKING_EMAIL_FROM,
        'WorldBrain <avisos@ultravelozmente.com>');
    assert.equal(env.API_TOKEN, '');
});
